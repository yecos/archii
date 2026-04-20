import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/ai-agent
 *
 * Super IA Agent para ArchiFlow.
 * Usa z-ai-web-dev-sdk (GLM) con function calling para ejecutar acciones reales en la app:
 * - Crear/editar tareas, proyectos, gastos, proveedores, reuniones
 * - Consultar datos del proyecto, equipo, presupuesto
 * - Gestionar fases de obra, aprobaciones, inventario
 *
 * Powered by GLM (z-ai-web-dev-sdk) — Sin API keys externas necesarias
 */

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_projects",
      description: "Obtener la lista de proyectos del usuario. Retorna nombre, estado, cliente, ubicación, presupuesto y progreso de cada proyecto.",
      parameters: {
        type: "object",
        properties: {
          status_filter: {
            type: "string",
            description: "Filtrar por estado (Concepto, Diseño, Ejecución, Entregado, Pausado). Opcional.",
            enum: ["Concepto", "Diseño", "Ejecución", "Entregado", "Pausado"],
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_project_detail",
      description: "Obtener detalles completos de un proyecto específico incluyendo tareas, gastos, fases y equipo asignado.",
      parameters: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Nombre del proyecto a consultar (búsqueda parcial, no necesita coincidencia exacta).",
          },
          project_id: {
            type: "string",
            description: "ID del proyecto (si se conoce). Opcional si se proporciona project_name.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_task",
      description: "Crear una nueva tarea en un proyecto. La IA debe inferir los parámetros del contexto de la conversación.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la tarea" },
          project_name: { type: "string", description: "Nombre del proyecto al que pertenece" },
          project_id: { type: "string", description: "ID del proyecto (opcional si se conoce el nombre)" },
          priority: {
            type: "string",
            description: "Prioridad de la tarea",
            enum: ["Alta", "Media", "Baja"],
          },
          status: {
            type: "string",
            description: "Estado inicial",
            enum: ["Por hacer", "En progreso", "Completado", "Pendiente"],
          },
          due_date: {
            type: "string",
            description: "Fecha límite en formato YYYY-MM-DD. Opcional.",
          },
          assignee_name: {
            type: "string",
            description: "Nombre de la persona asignada (si se conoce del equipo). Opcional.",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_project",
      description: "Crear un nuevo proyecto de construcción/arquitectura.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del proyecto" },
          client: { type: "string", description: "Nombre del cliente" },
          location: { type: "string", description: "Ubicación del proyecto" },
          budget: { type: "number", description: "Presupuesto estimado en COP" },
          description: { type: "string", description: "Descripción del proyecto" },
          start_date: { type: "string", description: "Fecha de inicio en YYYY-MM-DD" },
          end_date: { type: "string", description: "Fecha de entrega estimada en YYYY-MM-DD" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_expense",
      description: "Registrar un nuevo gasto en un proyecto.",
      parameters: {
        type: "object",
        properties: {
          concept: { type: "string", description: "Concepto o descripción del gasto" },
          project_name: { type: "string", description: "Nombre del proyecto" },
          project_id: { type: "string", description: "ID del proyecto" },
          category: {
            type: "string",
            description: "Categoría del gasto",
            enum: [
              "Materiales",
              "Mano de obra",
              "Equipos",
              "Transporte",
              "Permisos",
              "Diseño",
              "Consultoría",
              "Administración",
              "Imprevistos",
              "Otro",
            ],
          },
          amount: { type: "number", description: "Monto del gasto en COP" },
          date: { type: "string", description: "Fecha del gasto en YYYY-MM-DD" },
        },
        required: ["concept", "amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_budget_summary",
      description: "Obtener resumen del presupuesto de un proyecto: total de gastos por categoría y presupuesto vs gastado.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nombre del proyecto" },
          project_id: { type: "string", description: "ID del proyecto" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_supplier",
      description: "Registrar un nuevo proveedor en el sistema.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del proveedor o empresa" },
          category: {
            type: "string",
            description: "Categoría del proveedor",
            enum: [
              "Materiales",
              "Maquinaria",
              "Transporte",
              "Servicios",
              "Insumos",
              "Herramientas",
              "Seguridad",
              "Otro",
            ],
          },
          phone: { type: "string", description: "Teléfono de contacto" },
          email: { type: "string", description: "Correo electrónico" },
          address: { type: "string", description: "Dirección" },
          notes: { type: "string", description: "Notas adicionales" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_meeting",
      description: "Programar una nueva reunión.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la reunión" },
          project_name: { type: "string", description: "Proyecto relacionado (opcional)" },
          project_id: { type: "string", description: "ID del proyecto (opcional)" },
          date: { type: "string", description: "Fecha en YYYY-MM-DD" },
          time: { type: "string", description: "Hora en formato HH:MM" },
          duration: { type: "string", description: "Duración estimada (ej: 1 hora, 30 min)" },
          location: { type: "string", description: "Lugar de la reunión" },
          description: { type: "string", description: "Agenda o descripción" },
        },
        required: ["title", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_tasks",
      description: "Obtener lista de tareas, opcionalmente filtradas por proyecto o estado.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Filtrar por nombre de proyecto" },
          project_id: { type: "string", description: "Filtrar por ID de proyecto" },
          status_filter: {
            type: "string",
            description: "Filtrar por estado",
            enum: ["Por hacer", "En progreso", "Completado", "Pendiente"],
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_team_members",
      description: "Obtener la lista de miembros del equipo con sus roles.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_task_status",
      description: "Cambiar el estado de una tarea existente.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título de la tarea (búsqueda parcial)" },
          task_id: { type: "string", description: "ID de la tarea (si se conoce)" },
          new_status: {
            type: "string",
            description: "Nuevo estado",
            enum: ["Por hacer", "En progreso", "Completado"],
          },
        },
        required: ["new_status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_expenses",
      description: "Obtener lista de gastos, opcionalmente filtrados por proyecto o categoría.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Filtrar por nombre de proyecto" },
          project_id: { type: "string", description: "Filtrar por ID de proyecto" },
          category: {
            type: "string",
            description: "Filtrar por categoría",
            enum: [
              "Materiales",
              "Mano de obra",
              "Equipos",
              "Transporte",
              "Permisos",
              "Diseño",
              "Consultoría",
              "Administración",
              "Imprevistos",
              "Otro",
            ],
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_rfis",
      description: "Obtener lista de RFIs (Request for Information), opcionalmente filtrados por proyecto o estado.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Filtrar por nombre de proyecto" },
          project_id: { type: "string", description: "Filtrar por ID de proyecto" },
          status_filter: {
            type: "string",
            description: "Filtrar por estado",
            enum: ["Abierto", "En revisión", "Respondido", "Cerrado"],
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_rfi",
      description: "Crear un nuevo RFI (Request for Information) en un proyecto.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Asunto del RFI" },
          question: { type: "string", description: "Pregunta o consulta detallada" },
          project_name: { type: "string", description: "Nombre del proyecto" },
          project_id: { type: "string", description: "ID del proyecto" },
          priority: {
            type: "string",
            description: "Prioridad",
            enum: ["Alta", "Media", "Baja"],
          },
          assignee_name: { type: "string", description: "Nombre de la persona asignada" },
          due_date: { type: "string", description: "Fecha límite en YYYY-MM-DD" },
        },
        required: ["subject", "question"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_submittals",
      description: "Obtener lista de submittals (entregables), opcionalmente filtrados por proyecto o estado.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Filtrar por nombre de proyecto" },
          project_id: { type: "string", description: "Filtrar por ID de proyecto" },
          status_filter: {
            type: "string",
            description: "Filtrar por estado",
            enum: ["Borrador", "En revisión", "Aprobado", "Rechazado", "Devuelto"],
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_punch_items",
      description: "Obtener lista de items de punch list (verificación de obra), opcionalmente filtrados por proyecto o ubicación.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Filtrar por nombre de proyecto" },
          project_id: { type: "string", description: "Filtrar por ID de proyecto" },
          status_filter: {
            type: "string",
            description: "Filtrar por estado",
            enum: ["Pendiente", "En progreso", "Completado"],
          },
          location: {
            type: "string",
            description: "Filtrar por ubicación",
            enum: ["Fachada", "Interior", "Estructura", "Instalaciones", "Acabados", "Terraza", "Zonas comunes", "Otro"],
          },
        },
        required: [],
      },
    },
  },
];

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres ArchiFlow AI Agent, un asistente inteligente SUPERIOR especializado en gestión de proyectos de construcción, arquitectura e interiorismo. Puedes REALIZAR ACCIONES directamente en la aplicación.

CAPACIDADES:
- CREAR y EDITAR tareas, proyectos, gastos, proveedores, reuniones, RFIs
- CONSULTAR datos de proyectos, equipo, presupuestos, inventario, RFIs, Submittals, Punch List
- ANALIZAR presupuestos y dar recomendaciones
- PLANIFICAR cronogramas y fases de obra
- OPTIMIZAR recursos y dar consejos profesionales

REGLAS IMPORTANTES:
1. Siempre respondes en ESPAÑOL
2. Cuando el usuario pida crear algo, USA LAS FUNCIONES disponibles (no solo lo describas)
3. Si no estás seguro de un parámetro, PREGUNTA antes de ejecutar
4. Si el usuario dice "crea una tarea para revisar planos", infiere los parámetros y crea la tarea
5. Siempre confirma QUÉ acción realizaste y los detalles
6. Para montos en COP, usa el formato $XXX.XXX.XXX (pesos colombianos)
7. Sé proactivo: si ves una oportunidad de ayudar, ofrécela
8. No inventes datos que no existan — consulta primero si es necesario
9. Cuando crees algo, describe qué creaste con emoji (✅ 📋 💰 🤝 📅)

ESTRUCTURA DE RESPUESTA:
- Primero ejecuta las acciones necesarias
- Luego explica qué hiciste de forma clara y concisa
- Si fue una consulta, presenta los datos de forma organizada

TONO: Profesional pero cercano. Eres como un asistente de proyecto experto que puede hacer cosas por el usuario.`;

// ─── TOOL EXECUTION ENGINE ──────────────────────────────────────────

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ExecutedAction {
  type: string;
  label: string;
  icon: string;
  details: string;
  success: boolean;
  error?: string;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function findProjectByName(projects: any[], name: string): any | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    projects.find((p: any) => p.data?.name?.toLowerCase() === lower) ||
    projects.find((p: any) => p.data?.name?.toLowerCase().includes(lower))
  );
}

function findTaskByTitle(tasks: any[], title: string): any | null {
  if (!title) return null;
  const lower = title.toLowerCase();
  return (
    tasks.find((t: any) => t.data?.title?.toLowerCase() === lower) ||
    tasks.find((t: any) => t.data?.title?.toLowerCase().includes(lower))
  );
}

async function executeToolCall(
  name: string,
  args: Record<string, any>,
  db: any,
  userUid: string,
  actions: ExecutedAction[],
  tenantId: string
): Promise<string> {
  const FieldValue = getAdminFieldValue();
  const ts = FieldValue.serverTimestamp();

  try {
    switch (name) {
      // ── READ OPERATIONS ──
      case "get_projects": {
        let query = db.collection("projects").where("tenantId", "==", tenantId).orderBy("createdAt", "desc");
        const snap = await query.limit(20).get();
        const projects = snap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        const filter = args.status_filter;
        const filtered = filter
          ? projects.filter((p: any) => p.data?.status === filter)
          : projects;

        if (filtered.length === 0) {
          return filter
            ? `No se encontraron proyectos con estado "${filter}".`
            : "No hay proyectos creados aún.";
        }

        const lines = filtered.map(
          (p: any) =>
            `- **${p.data.name}**: ${p.data.status || "Sin estado"} | Cliente: ${p.data.client || "N/A"} | ${p.data.location || ""} | Presupuesto: ${formatCOP(p.data.budget || 0)} | Progreso: ${p.data.progress || 0}% [ID: ${p.id}]`
        );
        return `Proyectos encontrados (${filtered.length}):\n${lines.join("\n")}`;
      }

      case "get_project_detail": {
        const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).orderBy("createdAt", "desc").limit(20).get();
        const allProjects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        const project = args.project_id
          ? allProjects.find((p: any) => p.id === args.project_id)
          : args.project_name
          ? findProjectByName(allProjects, args.project_name)
          : null;

        if (!project) {
          return args.project_name
            ? `No encontré un proyecto llamado "${args.project_name}". Proyectos disponibles: ${allProjects.map((p: any) => p.data.name).join(", ") || "ninguno"}`
            : "No se especificó ningún proyecto. Por favor indica cuál proyecto quieres consultar.";
        }

        // Get tasks
        const tasksSnap = await db
          .collection("tasks")
          .where("tenantId", "==", tenantId)
          .where("projectId", "==", project.id)
          .limit(50)
          .get();
        const tasks = tasksSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        // Get expenses
        const expSnap = await db
          .collection("expenses")
          .where("tenantId", "==", tenantId)
          .where("projectId", "==", project.id)
          .limit(50)
          .get();
        const expenses = expSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        // Get phases
        const phasesSnap = await db
          .collection("projects")
          .doc(project.id)
          .collection("workPhases")
          .orderBy("order", "asc")
          .get();
        const phases = phasesSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.data.amount || 0), 0);
        const taskByStatus: Record<string, number> = {};
        tasks.forEach((t: any) => {
          const s = t.data.status || "Sin estado";
          taskByStatus[s] = (taskByStatus[s] || 0) + 1;
        });

        let detail = `## ${project.data.name}\n`;
        detail += `**Estado:** ${project.data.status} | **Progreso:** ${project.data.progress || 0}%\n`;
        detail += `**Cliente:** ${project.data.client || "N/A"} | **Ubicación:** ${project.data.location || "N/A"}\n`;
        detail += `**Presupuesto:** ${formatCOP(project.data.budget || 0)} | **Gastado:** ${formatCOP(totalExpenses)}\n`;
        if (project.data.description) detail += `**Descripción:** ${project.data.description}\n`;

        if (phases.length > 0) {
          detail += `\n### Fases de obra:\n`;
          phases.forEach((ph: any) => {
            detail += `- ${ph.data.name}: ${ph.data.status} ${ph.data.startDate ? `(${ph.data.startDate} → ${ph.data.endDate || "?"})` : ""}\n`;
          });
        }

        detail += `\n### Resumen de tareas (${tasks.length} total):\n`;
        Object.entries(taskByStatus).forEach(([status, count]) => {
          detail += `- ${status}: ${count}\n`;
        });

        if (expenses.length > 0) {
          detail += `\n### Últimos gastos:\n`;
          expenses.slice(0, 5).forEach((e: any) => {
            detail += `- ${e.data.concept}: ${formatCOP(e.data.amount)} (${e.data.category || "Otro"})\n`;
          });
        }

        detail += `\n[ID del proyecto: ${project.id}]`;
        return detail;
      }

      case "get_tasks": {
        let query = db.collection("tasks").where("tenantId", "==", tenantId).orderBy("createdAt", "desc");
        const snap = await query.limit(50).get();
        const allTasks = snap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        // Filter by project
        let filtered = allTasks;
        if (args.project_id) {
          filtered = allTasks.filter((t: any) => t.data.projectId === args.project_id);
        } else if (args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) filtered = allTasks.filter((t: any) => t.data.projectId === proj.id);
          else return `No encontré el proyecto "${args.project_name}".`;
        }

        // Filter by status
        if (args.status_filter) {
          filtered = filtered.filter((t: any) => t.data.status === args.status_filter);
        }

        if (filtered.length === 0) return "No se encontraron tareas con esos filtros.";

        const lines = filtered.map(
          (t: any) =>
            `- **${t.data.title}**: ${t.data.status || "Sin estado"} | Prioridad: ${t.data.priority || "N/A"} | Proyecto: ${t.data.projectId || "N/A"} | Fecha: ${t.data.dueDate || "N/A"} [ID: ${t.id}]`
        );
        return `Tareas encontradas (${filtered.length}):\n${lines.join("\n")}`;
      }

      case "get_team_members": {
        // Get tenant members
        const tenantSnap = await db.collection("tenants").doc(tenantId).get();
        const tenantData = tenantSnap.exists ? tenantSnap.data() : null;
        const memberIds: string[] = tenantData?.members || [];
        const snap = await db.collection("users").get();
        const members = snap.docs.map((d: any) => ({ id: d.id, data: d.data() })).filter((m: any) => memberIds.includes(m.id));
        if (members.length === 0) return "No hay miembros en este espacio de trabajo.";

        const lines = members.map(
          (m: any) =>
            `- **${m.data.name || "Sin nombre"}** (${m.data.role || "Miembro"}) — ${m.data.email || "Sin email"} [ID: ${m.id}]`
        );
        return `Equipo (${members.length} miembros):\n${lines.join("\n")}`;
      }

      case "get_budget_summary": {
        const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
        const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        const project = args.project_id
          ? projects.find((p: any) => p.id === args.project_id)
          : args.project_name
          ? findProjectByName(projects, args.project_name)
          : null;

        if (!project) {
          return "No se encontró el proyecto. Especifica cuál proyecto quieres consultar.";
        }

        const expSnap = await db.collection("expenses").where("tenantId", "==", tenantId).where("projectId", "==", project.id).limit(100).get();
        const expenses = expSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        const byCategory: Record<string, number> = {};
        let total = 0;
        expenses.forEach((e: any) => {
          const cat = e.data.category || "Otro";
          byCategory[cat] = (byCategory[cat] || 0) + (e.data.amount || 0);
          total += e.data.amount || 0;
        });

        const budget = project.data.budget || 0;
        const pct = budget > 0 ? ((total / budget) * 100).toFixed(1) : "N/A";

        let summary = `## Resumen de presupuesto: ${project.data.name}\n`;
        summary += `**Presupuesto:** ${formatCOP(budget)}\n**Gastado:** ${formatCOP(total)}\n**Porcentaje ejecutado:** ${pct}%\n`;

        if (budget > 0 && total > budget) {
          summary += `\n⚠️ **ALERTA:** El gasto SUPERA el presupuesto en ${formatCOP(total - budget)}.\n`;
        }

        if (Object.keys(byCategory).length > 0) {
          summary += `\n### Gastos por categoría:\n`;
          Object.entries(byCategory)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .forEach(([cat, amount]) => {
              const catPct = total > 0 ? (((amount as number) / total) * 100).toFixed(1) : "0";
              summary += `- **${cat}**: ${formatCOP(amount as number)} (${catPct}%)\n`;
            });
        }

        return summary;
      }

      case "get_expenses": {
        const expSnap = await db.collection("expenses").where("tenantId", "==", tenantId).orderBy("createdAt", "desc").limit(50).get();
        let allExpenses = expSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        if (args.project_id) {
          allExpenses = allExpenses.filter((e: any) => e.data.projectId === args.project_id);
        } else if (args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) allExpenses = allExpenses.filter((e: any) => e.data.projectId === proj.id);
          else return `No encontré el proyecto "${args.project_name}".`;
        }

        if (args.category) {
          allExpenses = allExpenses.filter((e: any) => e.data.category === args.category);
        }

        if (allExpenses.length === 0) return "No se encontraron gastos con esos filtros.";

        const lines = allExpenses.map(
          (e: any) =>
            `- **${e.data.concept}**: ${formatCOP(e.data.amount)} | ${e.data.category || "Otro"} | ${e.data.date || "Sin fecha"} [ID: ${e.id}]`
        );
        return `Gastos encontrados (${allExpenses.length}):\n${lines.join("\n")}`;
      }

      // ── WRITE OPERATIONS ──
      case "create_task": {
        // Resolve project
        let projectId = args.project_id;
        if (!projectId && args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) projectId = proj.id;
        }

        // Resolve assignee
        let assigneeId: string | undefined;
        if (args.assignee_name) {
          const usersSnap = await db.collection("users").limit(50).get();
          const users = usersSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const lower = args.assignee_name.toLowerCase();
          const found = users.find(
            (u: any) =>
              u.data?.name?.toLowerCase().includes(lower) ||
              u.data?.email?.toLowerCase().includes(lower)
          );
          if (found) assigneeId = found.id;
        }

        const docRef = await db.collection("tasks").add({
          title: args.title,
          projectId: projectId || "",
          assigneeId: assigneeId || "",
          priority: args.priority || "Media",
          status: args.status || "Por hacer",
          dueDate: args.due_date || "",
          tenantId,
          createdAt: ts,
          createdBy: userUid,
        });

        actions.push({
          type: "task_created",
          label: `Tarea creada`,
          icon: "✅",
          details: args.title,
          success: true,
        });

        return `Tarea "${args.title}" creada exitosamente [ID: ${docRef.id}]. Proyecto: ${projectId || "Sin asignar"}, Prioridad: ${args.priority || "Media"}, Estado: ${args.status || "Por hacer"}`;
      }

      case "create_project": {
        const docRef = await db.collection("projects").add({
          name: args.name,
          status: "Concepto",
          client: args.client || "",
          location: args.location || "",
          budget: args.budget || 0,
          description: args.description || "",
          startDate: args.start_date || "",
          endDate: args.end_date || "",
          progress: 0,
          tenantId,
          createdAt: ts,
          createdBy: userUid,
          updatedAt: ts,
        });

        // Create default phases
        const defaultPhases = [
          "Concepto",
          "Diseño",
          "Planeación",
          "Pre-construcción",
          "Construcción",
          "Entrega",
        ];
        const batch = db.batch();
        defaultPhases.forEach((phaseName, i) => {
          const ref = db.collection("projects").doc(docRef.id).collection("workPhases").doc();
          batch.set(ref, {
            name: phaseName,
            description: "",
            status: "Pendiente",
            order: i,
            startDate: "",
            endDate: "",
            createdAt: ts,
          });
        });
        await batch.commit();

        actions.push({
          type: "project_created",
          label: `Proyecto creado`,
          icon: "🏗️",
          details: args.name,
          success: true,
        });

        return `Proyecto "${args.name}" creado exitosamente [ID: ${docRef.id}]. Cliente: ${args.client || "N/A"}, Ubicación: ${args.location || "N/A"}, Presupuesto: ${formatCOP(args.budget || 0)}. Fases iniciales creadas automáticamente.`;
      }

      case "create_expense": {
        let projectId = args.project_id;
        if (!projectId && args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) projectId = proj.id;
        }

        const docRef = await db.collection("expenses").add({
          concept: args.concept,
          projectId: projectId || "",
          category: args.category || "Otro",
          amount: args.amount || 0,
          date: args.date || new Date().toISOString().split("T")[0],
          tenantId,
          createdAt: ts,
          createdBy: userUid,
        });

        actions.push({
          type: "expense_created",
          label: `Gasto registrado`,
          icon: "💰",
          details: `${args.concept}: ${formatCOP(args.amount || 0)}`,
          success: true,
        });

        return `Gasto "${args.concept}" registrado exitosamente [ID: ${docRef.id}]. Monto: ${formatCOP(args.amount || 0)}, Categoría: ${args.category || "Otro"}, Proyecto: ${projectId || "Sin asignar"}`;
      }

      case "create_supplier": {
        const docRef = await db.collection("suppliers").add({
          name: args.name,
          category: args.category || "Otro",
          phone: args.phone || "",
          email: args.email || "",
          address: args.address || "",
          website: "",
          notes: args.notes || "",
          rating: 0,
          tenantId,
          createdAt: ts,
          createdBy: userUid,
        });

        actions.push({
          type: "supplier_created",
          label: `Proveedor registrado`,
          icon: "🤝",
          details: args.name,
          success: true,
        });

        return `Proveedor "${args.name}" registrado exitosamente [ID: ${docRef.id}]. Categoría: ${args.category || "Otro"}, Teléfono: ${args.phone || "N/A"}, Email: ${args.email || "N/A"}`;
      }

      case "create_meeting": {
        let projectId = args.project_id;
        if (!projectId && args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) projectId = proj.id;
        }

        const docRef = await db.collection("meetings").add({
          title: args.title,
          projectId: projectId || "",
          date: args.date || "",
          time: args.time || "",
          duration: args.duration || "",
          location: args.location || "",
          description: args.description || "",
          attendees: [],
          tenantId,
          createdBy: userUid,
          createdAt: ts,
        });

        actions.push({
          type: "meeting_created",
          label: `Reunión programada`,
          icon: "📅",
          details: `${args.title} — ${args.date} ${args.time}`,
          success: true,
        });

        return `Reunión "${args.title}" programada exitosamente [ID: ${docRef.id}]. Fecha: ${args.date} ${args.time}, Duración: ${args.duration || "N/A"}, Lugar: ${args.location || "N/A"}`;
      }

      case "update_task_status": {
        const tasksSnap = await db.collection("tasks").where("tenantId", "==", tenantId).limit(100).get();
        const allTasks = tasksSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        let task: any = null;
        if (args.task_id) {
          task = allTasks.find((t: any) => t.id === args.task_id);
        } else if (args.task_title) {
          task = findTaskByTitle(allTasks, args.task_title);
        }

        if (!task) {
          const error = `No encontré la tarea "${args.task_title || args.task_id}". Busca por título o ID exacto.`;
          actions.push({
            type: "task_update_failed",
            label: `Error al actualizar tarea`,
            icon: "❌",
            details: error,
            success: false,
            error,
          });
          return error;
        }

        await db.collection("tasks").doc(task.id).update({
          status: args.new_status,
          updatedAt: ts,
        });

        actions.push({
          type: "task_updated",
          label: `Tarea actualizada`,
          icon: "🔄",
          details: `"${task.data.title}" → ${args.new_status}`,
          success: true,
        });

        return `Tarea "${task.data.title}" actualizada a estado "${args.new_status}" exitosamente.`;
      }

      case "get_rfis": {
        const rfiSnap = await db.collection("rfis").where("tenantId", "==", tenantId).orderBy("createdAt", "desc").limit(50).get();
        let allRFIs = rfiSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        if (args.project_id) {
          allRFIs = allRFIs.filter((r: any) => r.data.projectId === args.project_id);
        } else if (args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) allRFIs = allRFIs.filter((r: any) => r.data.projectId === proj.id);
        }
        if (args.status_filter) allRFIs = allRFIs.filter((r: any) => r.data.status === args.status_filter);
        if (allRFIs.length === 0) return "No se encontraron RFIs con esos filtros.";
        const lines = allRFIs.map((r: any) => `- **${r.data.number}** ${r.data.subject}: ${r.data.status} | Prioridad: ${r.data.priority || "N/A"} | Proyecto: ${r.data.projectId || "N/A"}${r.data.dueDate ? ` | Vence: ${r.data.dueDate}` : ""}`);
        return `RFIs encontrados (${allRFIs.length}):\n${lines.join("\n")}`;
      }

      case "create_rfi": {
        let projectId = args.project_id;
        if (!projectId && args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) projectId = proj.id;
        }
        let assigneeId: string | undefined;
        if (args.assignee_name) {
          const usersSnap = await db.collection("users").limit(50).get();
          const users = usersSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const lower = args.assignee_name.toLowerCase();
          const found = users.find((u: any) => u.data?.name?.toLowerCase().includes(lower) || u.data?.email?.toLowerCase().includes(lower));
          if (found) assigneeId = found.id;
        }
        const countSnap = await db.collection("rfis").where("tenantId", "==", tenantId).get();
        const number = `RFI-${String(countSnap.size + 1).padStart(3, "0")}`;
        const docRef = await db.collection("rfis").add({
          number, subject: args.subject, question: args.question, response: "",
          projectId: projectId || "", assignedTo: assigneeId || "",
          priority: args.priority || "Media", status: "Abierto", dueDate: args.due_date || "",
          tenantId, createdAt: ts, createdBy: userUid,
        });
        actions.push({ type: "rfi_created", label: "RFI creado", icon: "❓", details: `${number}: ${args.subject}`, success: true });
        return `RFI "${number}" creado exitosamente [ID: ${docRef.id}]. Asunto: ${args.subject}, Prioridad: ${args.priority || "Media"}, Proyecto: ${projectId || "Sin asignar"}`;
      }

      case "get_submittals": {
        const subSnap = await db.collection("submittals").where("tenantId", "==", tenantId).orderBy("createdAt", "desc").limit(50).get();
        let allSubs = subSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        if (args.project_id) {
          allSubs = allSubs.filter((s: any) => s.data.projectId === args.project_id);
        } else if (args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) allSubs = allSubs.filter((s: any) => s.data.projectId === proj.id);
        }
        if (args.status_filter) allSubs = allSubs.filter((s: any) => s.data.status === args.status_filter);
        if (allSubs.length === 0) return "No se encontraron submittals con esos filtros.";
        const lines = allSubs.map((s: any) => `- **${s.data.number}** ${s.data.title}: ${s.data.status}${s.data.specification ? ` | Spec: ${s.data.specification}` : ""}${s.data.dueDate ? ` | Vence: ${s.data.dueDate}` : ""}`);
        return `Submittals encontrados (${allSubs.length}):\n${lines.join("\n")}`;
      }

      case "get_punch_items": {
        const punchSnap = await db.collection("punchItems").where("tenantId", "==", tenantId).orderBy("createdAt", "desc").limit(50).get();
        let allPunch = punchSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        if (args.project_id) {
          allPunch = allPunch.filter((p: any) => p.data.projectId === args.project_id);
        } else if (args.project_name) {
          const projSnap = await db.collection("projects").where("tenantId", "==", tenantId).limit(20).get();
          const projects = projSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
          const proj = findProjectByName(projects, args.project_name);
          if (proj) allPunch = allPunch.filter((p: any) => p.data.projectId === proj.id);
        }
        if (args.status_filter) allPunch = allPunch.filter((p: any) => p.data.status === args.status_filter);
        if (args.location) allPunch = allPunch.filter((p: any) => p.data.location === args.location);
        if (allPunch.length === 0) return "No se encontraron items de punch list con esos filtros.";
        const lines = allPunch.map((p: any) => `- **${p.data.title}**: ${p.data.status} | ${p.data.priority || "Media"} | ${p.data.location || "Otro"}${p.data.dueDate ? ` | Vence: ${p.data.dueDate}` : ""}`);
        return `Items de Punch List (${allPunch.length}):\n${lines.join("\n")}`;
      }

      default:
        return `Función "${name}" no reconocida.`;
    }
  } catch (error: any) {
    const errMsg = error?.message || "Error desconocido";
    actions.push({
      type: "error",
      label: `Error en ${name}`,
      icon: "❌",
      details: errMsg,
      success: false,
      error: errMsg,
    });
    return `Error ejecutando ${name}: ${errMsg}`;
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  try {
    var user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const { messages, projectContext, tenantId } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Se requiere el ID del espacio de trabajo (tenantId)" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const actions: ExecutedAction[] = [];

    // Initialize z-ai-web-dev-sdk (GLM)
    const zai = await ZAI.create();

    // Build messages
    const apiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (projectContext) {
      apiMessages.push({
        role: "system",
        content: `Contexto actual del usuario:\n${projectContext}`,
      });
    }

    // Add conversation history
    const recentMessages = messages.slice(-20);
    for (const msg of recentMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // First call: with tools (using z-ai-web-dev-sdk)
    let data;
    try {
      data = await zai.chat.completions.create({
        messages: apiMessages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 2048,
        temperature: 0.7,
      });
    } catch (error: any) {
      console.error("[AI Agent] SDK error:", error?.message);
      return NextResponse.json({
        error: "Error en la API de IA",
        message: `⚠️ Error de la IA. Intenta de nuevo.`,
      });
    }
    const choice = data.choices?.[0];

    if (!choice) {
      return NextResponse.json({
        error: "Sin respuesta",
        message: "⚠️ La IA no generó una respuesta. Intenta de nuevo.",
      });
    }

    const finishReason = choice.finish_reason;
    const assistantMessage = choice.message;

    // If the model wants to call tools, execute them
    if (finishReason === "tool_calls" && assistantMessage.tool_calls) {
      // Add assistant message with tool calls to history
      apiMessages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls as ToolCall[]) {
        const funcName = toolCall.function.name;
        let funcArgs: Record<string, any>;
        try {
          funcArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          funcArgs = {};
        }

        console.log(`[AI Agent] Executing tool: ${funcName}`, funcArgs);

        const result = await executeToolCall(funcName, funcArgs, db, user.uid, actions, tenantId);

        // Add tool result to conversation
        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Second call: get final response with tool results (using z-ai-web-dev-sdk)
      try {
        const followUpData = await zai.chat.completions.create({
          messages: apiMessages,
          max_tokens: 2048,
          temperature: 0.7,
        });

        const finalMessage = followUpData.choices?.[0]?.message?.content;

        return NextResponse.json({
          message: finalMessage || "Acciones ejecutadas correctamente.",
          actions: actions.length > 0 ? actions : undefined,
        });
      } catch (error: any) {
        console.error("[AI Agent] Follow-up error:", error?.message);
        return NextResponse.json({
          message: "Acciones ejecutadas correctamente.",
          actions: actions.length > 0 ? actions : undefined,
        });
      }
    }

    // No tool calls — just return the text response
    return NextResponse.json({
      message: assistantMessage.content || "No pude generar una respuesta.",
      actions: actions.length > 0 ? actions : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[AI Agent] Error:", message);
    return NextResponse.json(
      {
        error: "Error de conexión",
        message: "⚠️ Error de conexión con la IA. Intenta de nuevo.",
      },
      { status: 500 }
    );
  }
}
