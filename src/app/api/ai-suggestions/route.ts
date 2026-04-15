import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { routeAIRequest } from "@/lib/ai-router";

/**
 * POST /api/ai-suggestions
 *
 * Genera sugerencias inteligentes para proyectos de construcción/arquitectura.
 *
 * Tipos de sugerencias:
 *   - "tasks":       Sugerir tareas para un proyecto basado en su nombre/descripción
 *   - "budget":      Analizar si un proyecto podría exceder el presupuesto
 *   - "expenses":    Sugerir categorías de gastos o señalar gastos inusuales
 *   - "schedule":    Sugerir optimizaciones de cronograma para tareas vencidas
 *   - "overview":    Análisis general del dashboard (usa todos los proyectos activos)
 */

const SYSTEM_PROMPT = `Eres ArchiFlow AI, un asistente inteligente especializado en gestión de proyectos de construcción, arquitectura e interiorismo. Tu tono es profesional pero cercano, y SIEMPRE respondes en español.

Tu tarea es generar sugerencias accionables y concisas para el usuario basándote en los datos de sus proyectos.

FORMATO DE RESPUESTA (IMPORTANTE — devuelve SOLO un JSON válido, sin texto adicional ni markdown):
Responde SIEMPRE con un array JSON de objetos. Cada objeto debe tener esta estructura exacta:
{
  "suggestions": [
    {
      "id": "sug-1",
      "title": "Título corto de la sugerencia",
      "description": "Descripción detallada de 1-3 oraciones",
      "actionType": "task | budget | expense | schedule | navigate | info",
      "actionLabel": "Texto del botón de acción (ej: 'Ver tareas', 'Ir al presupuesto')",
      "priority": "alta | media | baja",
      "projectId": "id-del-proyecto (o null si es general)"
    }
  ]
}

Reglas:
- Genera entre 3 y 6 sugerencias relevantes.
- Prioriza sugerencias urgentes (presupuestos al límite, tareas vencidas).
- Sé específico: menciona nombres de proyectos, montos, fechas reales.
- Cada sugerencia debe ser accionable (no genérica).
- Usa formatos de moneda colombiana (COP) cuando menciones montos.
- Para "actionType": usa "navigate" para sugerir ir a otra pantalla, "info" para solo informativa.`;

type SuggestionType = "tasks" | "budget" | "expenses" | "schedule" | "overview";

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  actionType: string;
  actionLabel?: string;
  priority: "alta" | "media" | "baja";
  projectId?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = Record<string, any>;

async function callAI(userPrompt: string, userId: string): Promise<AISuggestion[]> {
  try {
    // Usar el router multi-proveedor (Groq, Mistral, OpenAI)
    const { model, provider } = await routeAIRequest({
      taskType: 'analysis',
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.6,
      userId,
    });

    console.log(`[AI Suggestions] Usando ${provider}`);

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxOutputTokens: 1500,
      temperature: 0.6,
    });

    // Parsear JSON de la respuesta
    try {
      const jsonStr = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const parsed = JSON.parse(jsonStr);
      return parsed.suggestions || parsed || [];
    } catch {
      console.warn("[AI Suggestions] No se pudo parsear JSON:", text.substring(0, 200));
      return [
        {
          id: "fallback-1",
          title: "Revisa tus proyectos",
          description: "La IA no pudo generar sugerencias específicas. Revisa tus proyectos y tareas manualmente.",
          actionType: "navigate",
          actionLabel: "Ir a Proyectos",
          priority: "media",
          projectId: null,
        },
      ];
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[AI Suggestions] Error con proveedor:', msg);
    throw new Error(`PROVIDER_ERROR: ${msg}`);
  }
}

function buildTasksPrompt(projectData: Record<string, unknown>): string {
  return `Genera sugerencias de TAREAS para el siguiente proyecto. Basa las sugerencias en el tipo de proyecto, su estado actual y las tareas que ya existen.

Datos del proyecto:
${JSON.stringify(projectData, null, 2)}

Genera sugerencias de tareas que faltarían, priorizando las más urgentes o que agregarían más valor al proyecto.`;
}

function buildBudgetPrompt(projectData: Record<string, unknown>): string {
  return `Analiza el PRESUPUESTO del siguiente proyecto. Identifica riesgos de sobrecosto y genera recomendaciones.

Datos del proyecto:
${JSON.stringify(projectData, null, 2)}

Genera sugerencias para optimizar el presupuesto, identificar gastos innecesarios o riesgos de sobrecosto.`;
}

function buildExpensesPrompt(expensesData: Record<string, unknown>): string {
  return `Analiza los GASTOS del siguiente proyecto. Identifica patrones inusuales, categorías con gasto excesivo y oportunidades de ahorro.

Datos de gastos:
${JSON.stringify(expensesData, null, 2)}

Genera sugerencias sobre categorías de gasto, gastos inusuales y optimizaciones.`;
}

function buildSchedulePrompt(scheduleData: Record<string, unknown>): string {
  return `Analiza el CRONOGRAMA del siguiente proyecto. Identifica tareas vencidas, cuellos de botella y optimizaciones posibles.

Datos del cronograma:
${JSON.stringify(scheduleData, null, 2)}

Genera sugerencias para optimizar el cronograma, resolver tareas vencidas y mejorar la planificación.`;
}

function buildOverviewPrompt(allData: Record<string, unknown>): string {
  return `Genera un análisis GENERAL del dashboard del usuario. Considera todos los proyectos, tareas, gastos y métricas.

Datos del dashboard:
${JSON.stringify(allData, null, 2)}

Genera las sugerencias más importantes y prioritarias que el usuario debería considerar ahora mismo. Incluye alertas de presupuesto, tareas vencidas y oportunidades de mejora.`;
}

/** Helper: map Firestore snapshot docs to typed array */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapDocs(snap: any): DocData[] {
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    let user;
    try {
      user = await requireAuth(request);
    } catch (authError) {
      return authError as NextResponse;
    }

    // Rate limit: 10 requests per minute
    const rateLimit = checkRateLimit(request, { maxRequests: 10, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones de IA.", suggestions: [], type: "overview" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    const body = await request.json();
    const { type, projectId, context } = body;

    const validTypes: SuggestionType[] = ["tasks", "budget", "expenses", "schedule", "overview"];
    if (!type || !validTypes.includes(type as SuggestionType)) {
      return NextResponse.json(
        { error: `Tipo inválido. Debe ser uno de: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const uid = user.uid;

    // Fetch relevant data based on type
    let prompt = "";

    if (type === "overview") {
      // Fetch all projects, tasks, and expenses for overview
      const [projectsSnap, tasksSnap, expensesSnap] = await Promise.all([
        db.collection("projects").where("createdBy", "==", uid).limit(10).get(),
        db.collection("tasks").limit(50).get(),
        db.collection("expenses").limit(50).get(),
      ]);

      const projects: DocData[] = snapDocs(projectsSnap);
      const tasks: DocData[] = snapDocs(tasksSnap);
      const expenses: DocData[] = snapDocs(expensesSnap);

      prompt = buildOverviewPrompt({
        projects,
        tasksCount: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "Completado").length,
        overdueTasks: tasks.filter((t) => {
          if (t.status === "Completado" || !t.dueDate) return false;
          return new Date(t.dueDate) < new Date();
        }).length,
        expenses,
        totalExpenses: expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        projectCount: projects.length,
        activeProjects: projects.filter((p) => p.status === "Ejecucion" || p.status === "En ejecución").length,
      });

    } else if (type === "tasks" && projectId) {
      // Fetch specific project data for task suggestions
      const [projectSnap, tasksSnap] = await Promise.all([
        db.collection("projects").doc(projectId).get(),
        db.collection("tasks").where("projectId", "==", projectId).limit(30).get(),
      ]);

      if (!projectSnap.exists) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const project: DocData = { id: projectSnap.id, ...projectSnap.data() };
      const tasks: DocData[] = snapDocs(tasksSnap);

      prompt = buildTasksPrompt({
        project,
        existingTasks: tasks,
        completedCount: tasks.filter((t) => t.status === "Completado").length,
        pendingTasks: tasks.filter((t) => t.status !== "Completado"),
      });

    } else if (type === "budget" && projectId) {
      // Fetch project budget data
      const [projectSnap, expensesSnap] = await Promise.all([
        db.collection("projects").doc(projectId).get(),
        db.collection("expenses").where("projectId", "==", projectId).limit(50).get(),
      ]);

      if (!projectSnap.exists) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const project: DocData = { id: projectSnap.id, ...projectSnap.data() };
      const expenses: DocData[] = snapDocs(expensesSnap);
      const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const projectBudget = Number(project.budget) || 0;

      prompt = buildBudgetPrompt({
        project,
        budget: projectBudget,
        totalSpent,
        budgetPercentage: projectBudget ? Math.round((totalSpent / projectBudget) * 100) : 0,
        expenses,
        expensesByCategory: expenses.reduce((acc: Record<string, number>, e) => {
          const cat = e.category || "Otro";
          acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
          return acc;
        }, {} as Record<string, number>),
      });

    } else if (type === "expenses" && projectId) {
      // Fetch expenses for analysis
      const [projectSnap, expensesSnap] = await Promise.all([
        db.collection("projects").doc(projectId).get(),
        db.collection("expenses").where("projectId", "==", projectId).limit(50).get(),
      ]);

      if (!projectSnap.exists) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const project: DocData = { id: projectSnap.id, ...projectSnap.data() };
      const expenses: DocData[] = snapDocs(expensesSnap);
      const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // Sort by amount to find unusual expenses
      const sortedExpenses = [...expenses].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
      const avgExpense = expenses.length > 0 ? totalSpent / expenses.length : 0;

      prompt = buildExpensesPrompt({
        project,
        expenses,
        totalExpenses: totalSpent,
        averageExpense: avgExpense,
        topExpenses: sortedExpenses.slice(0, 5),
        unusualExpenses: sortedExpenses.filter((e) => Number(e.amount) > avgExpense * 2),
        expensesByCategory: expenses.reduce((acc: Record<string, number>, e) => {
          const cat = e.category || "Otro";
          acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
          return acc;
        }, {} as Record<string, number>),
      });

    } else if (type === "schedule" && projectId) {
      // Fetch schedule data for project
      const [projectSnap, tasksSnap] = await Promise.all([
        db.collection("projects").doc(projectId).get(),
        db.collection("tasks").where("projectId", "==", projectId).limit(50).get(),
      ]);

      if (!projectSnap.exists) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const project: DocData = { id: projectSnap.id, ...projectSnap.data() };
      const tasks: DocData[] = snapDocs(tasksSnap);
      const now = new Date();

      const overdueTasks = tasks.filter((t) => {
        if (t.status === "Completado" || !t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });

      const upcomingTasks = tasks.filter((t) => {
        if (t.status === "Completado" || !t.dueDate) return false;
        const due = new Date(t.dueDate);
        const diff = due.getTime() - now.getTime();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
      });

      const inProgressTasks = tasks.filter((t) => t.status === "En progreso");

      prompt = buildSchedulePrompt({
        project,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "Completado").length,
        overdueTasks,
        overdueCount: overdueTasks.length,
        upcomingTasks,
        upcomingCount: upcomingTasks.length,
        inProgressTasks,
        inProgressCount: inProgressTasks.length,
        tasksByPriority: {
          alta: tasks.filter((t) => t.priority === "Alta" || t.priority === "Urgente").length,
          media: tasks.filter((t) => t.priority === "Media").length,
          baja: tasks.filter((t) => t.priority === "Baja").length,
        },
      });

    } else {
      // Generic type without projectId — use context if provided, or do overview
      if (context) {
        prompt = `${type === "tasks" ? "Genera sugerencias de tareas" : type === "budget" ? "Genera sugerencias de presupuesto" : type === "expenses" ? "Genera sugerencias de gastos" : type === "schedule" ? "Genera sugerencias de cronograma" : "Genera sugerencias"} basándote en el siguiente contexto:\n\n${context}`;
      } else {
        // Fallback to overview
        const projectsSnap = await db.collection("projects").where("createdBy", "==", uid).limit(5).get();
        const projects: DocData[] = snapDocs(projectsSnap);
        prompt = buildOverviewPrompt({
          projects,
          projectCount: projects.length,
          userNote: "El usuario no proporcionó proyecto específico. Genera sugerencias generales.",
        });
      }
    }

    // Call AI via router multi-proveedor
    const suggestions = await callAI(prompt, uid);

    // Add fallback suggestions if AI returned empty
    const enrichedSuggestions = suggestions.length > 0
      ? suggestions.map((s, i) => ({
          ...s,
          id: s.id || `sug-${Date.now()}-${i}`,
          priority: s.priority || "media",
          actionType: s.actionType || "info",
        }))
      : [
          {
            id: "default-1",
            title: "Revisa tus proyectos activos",
            description: "No se encontraron sugerencias específicas. Revisa tus proyectos para identificar áreas de mejora.",
            actionType: "navigate" as const,
            actionLabel: "Ir a Proyectos",
            priority: "media" as const,
            projectId: null,
          },
        ];

    return NextResponse.json({
      suggestions: enrichedSuggestions,
      type,
      projectId: projectId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI Suggestions] Error:", message);

    if (message === "API_KEY_NOT_CONFIGURED" || message.startsWith("PROVIDER_ERROR")) {
      const detail = message.startsWith("PROVIDER_ERROR") ? message.replace("PROVIDER_ERROR: ", "") : message;
      return NextResponse.json(
        {
          error: "IA no disponible",
          message: `No se pudo conectar con los proveedores de IA. ${detail}`,
          suggestions: [],
          type: "overview",
        },
        { status: 200 }
      );
    }

    if (message.startsWith("API_ERROR_")) {
      const code = message.replace("API_ERROR_", "");
      return NextResponse.json(
        {
          error: "Error de API",
          message: `Error de la API de IA (${code}). Intenta de nuevo.`,
          suggestions: [],
          type: "overview",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
