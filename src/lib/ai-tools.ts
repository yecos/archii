/**
 * ai-tools.ts
 * Herramientas del Agente IA para ArchiFlow — Nivel 1 (Groq 8B).
 * Function definitions para que el LLM ejecute acciones sobre Firestore.
 */

import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { z } from 'zod';

const FieldValue = getAdminFieldValue();

/* ===== Helper ===== */
async function writeFirestore(
  collection: string,
  docId: string | null,
  data: Record<string, unknown>,
) {
  const db = getAdminDb();
  if (docId) {
    await db.collection(collection).doc(docId).update(data);
    return { id: docId, action: 'updated' as const };
  } else {
    const ref = await db.collection(collection).add(data);
    return { id: ref.id, action: 'created' as const };
  }
}

/* ===== Tool Definitions ===== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const taskCreateTool: any = {
  description: 'Crea una nueva tarea en un proyecto existente. Úsala cuando el usuario quiere agregar una tarea, pendiente o actividad.',
  parameters: z.object({
    projectId: z.string().describe('ID del proyecto donde crear la tarea'),
    title: z.string().describe('Título de la tarea'),
    description: z.string().optional().describe('Descripción detallada'),
    priority: z.enum(['Alta', 'Media', 'Baja']).default('Media').describe('Prioridad'),
    dueDate: z.string().optional().describe('Fecha límite YYYY-MM-DD'),
    assigneeId: z.string().optional().describe('ID del usuario asignado'),
    phase: z.string().optional().describe('Fase del proyecto'),
  }),
  execute: async (params: z.infer<typeof taskCreateTool.parameters>, userId: string) => {
    try {
      const data = {
        title: params.title,
        description: params.description || '',
        priority: params.priority,
        status: 'Pendiente',
        dueDate: params.dueDate || '',
        assignees: params.assigneeId ? [params.assigneeId] : [],
        phase: params.phase || '',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userId,
        updatedAt: FieldValue.serverTimestamp(),
        projectId: params.projectId,
      };
      const result = await writeFirestore('tasks', null, data);
      return { success: true, ...result, message: `Tarea "${params.title}" creada` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error creando tarea: ${msg}` };
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const taskStatusChangeTool: any = {
  description: 'Cambia el estado de una tarea existente. Úsala cuando el usuario quiere avanzar, completar o retroceder una tarea.',
  parameters: z.object({
    taskId: z.string().describe('ID de la tarea'),
    newStatus: z.enum(['Pendiente', 'En progreso', 'En revisión', 'Completado']).describe('Nuevo estado'),
  }),
  execute: async (params: z.infer<typeof taskStatusChangeTool.parameters>, userId: string) => {
    try {
      const result = await writeFirestore('tasks', params.taskId, {
        status: params.newStatus,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: userId,
      });
      return { success: true, ...result, message: `Tarea cambiada a "${params.newStatus}"` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error cambiando estado: ${msg}` };
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const expenseCreateTool: any = {
  description: 'Registra un nuevo gasto en un proyecto. Úsala cuando el usuario menciona un gasto, compra o pago.',
  parameters: z.object({
    projectId: z.string().describe('ID del proyecto'),
    concept: z.string().describe('Concepto del gasto'),
    amount: z.number().describe('Monto en COP'),
    category: z.string().optional().describe('Categoría (Materiales, Mano de obra, Transporte, Otro)'),
    date: z.string().optional().describe('Fecha YYYY-MM-DD'),
    supplier: z.string().optional().describe('Proveedor'),
  }),
  execute: async (params: z.infer<typeof expenseCreateTool.parameters>, userId: string) => {
    try {
      const data = {
        concept: params.concept,
        amount: params.amount,
        category: params.category || 'Otro',
        date: params.date || new Date().toISOString().split('T')[0],
        supplier: params.supplier || '',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userId,
        projectId: params.projectId,
      };
      const result = await writeFirestore('expenses', null, data);
      return { success: true, ...result, message: `Gasto "$${params.amount.toLocaleString('es-CO')}" registrado` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error registrando gasto: ${msg}` };
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryProjectStatusTool: any = {
  description: 'Consulta el estado actual de un proyecto. Úsala para responder preguntas sobre el estado de un proyecto.',
  parameters: z.object({
    projectId: z.string().describe('ID del proyecto'),
  }),
  execute: async (params: z.infer<typeof queryProjectStatusTool.parameters>) => {
    try {
      const db = getAdminDb();
      const projectDoc = await db.collection('projects').doc(params.projectId).get();
      if (!projectDoc.exists) return { success: false, message: 'Proyecto no encontrado' };
      const proj = projectDoc.data();
      if (!proj) return { success: false, message: 'Datos de proyecto vacíos' };

      const tasksSnap = await db.collection('tasks').where('projectId', '==', params.projectId).get();
      const tasks = tasksSnap.docs.map(d => d.data());
      const pending = tasks.filter(t => t.status === 'Pendiente').length;
      const inProgress = tasks.filter(t => t.status === 'En progreso').length;
      const completed = tasks.filter(t => t.status === 'Completado').length;

      const expSnap = await db.collection('expenses').where('projectId', '==', params.projectId).get();
      const totalSpent = expSnap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);

      return {
        success: true,
        project: {
          name: proj.name || 'Sin nombre',
          status: proj.status || 'Activo',
          progress: proj.progress || 0,
          budget: proj.budget || 0,
        },
        tasks: { total: tasks.length, pending, inProgress, completed },
        message: `"${proj.name || 'Sin nombre'}": ${tasks.length} tareas (${pending} pend, ${inProgress} prog, ${completed} comp), $${totalSpent.toLocaleString('es-CO')} gastados`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error consultando: ${msg}` };
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryTaskListTool: any = {
  description: 'Lista las tareas de un proyecto o usuario. Úsala para "¿qué tareas hay?" o "muéstrame las tareas".',
  parameters: z.object({
    projectId: z.string().optional().describe('ID del proyecto'),
    userId: z.string().optional().describe('ID del usuario'),
    status: z.string().optional().describe('Filtrar por estado'),
  }),
  execute: async (params: z.infer<typeof queryTaskListTool.parameters>) => {
    try {
      const db = getAdminDb();
      let snap;
      if (params.projectId) {
        snap = await db.collection('tasks').where('projectId', '==', params.projectId).limit(15).get();
      } else if (params.userId) {
        snap = await db.collection('tasks').where('assignees', 'array-contains', params.userId).limit(15).get();
      } else {
        snap = await db.collection('tasks').orderBy('createdAt', 'desc').limit(15).get();
      }

      let tasks = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));

      if (params.status) {
        tasks = tasks.filter((t: Record<string, any>) => t.status === params.status);
      }

      if (tasks.length === 0) return { success: true, tasks: [], message: 'No se encontraron tareas' };

      const summary = tasks.slice(0, 10).map((t: Record<string, any>) =>
        `- "${t.title}" [${t.status}] ${t.priority}${t.dueDate ? ` Vence: ${t.dueDate}` : ''}`
      ).join('\n');

      return {
        success: true,
        count: tasks.length,
        message: `${tasks.length} tareas:\n${summary}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error listando: ${msg}` };
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryUpcomingDeadlinesTool: any = {
  description: 'Muestra tareas con fecha límite próxima. Úsala cuando el usuario pregunta por vencimientos o plazos.',
  parameters: z.object({
    projectId: z.string().optional().describe('Filtrar por proyecto'),
    days: z.number().default(7).describe('Días futuros a considerar'),
  }),
  execute: async (params: z.infer<typeof queryUpcomingDeadlinesTool.parameters>) => {
    try {
      const db = getAdminDb();
      const snap = await db.collection('tasks').orderBy('dueDate', 'asc').limit(50).get();

      const now = new Date();
      const futureStr = new Date(now.getTime() + params.days * 86400000).toISOString().split('T')[0];

      let tasks = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }))
        .filter((t: Record<string, any>) => t.dueDate && t.dueDate <= futureStr && t.dueDate >= now.toISOString().split('T')[0] && t.status !== 'Completado');

      if (params.projectId) {
        tasks = tasks.filter((t: Record<string, any>) => t.projectId === params.projectId);
      }

      if (tasks.length === 0) return { success: true, count: 0, message: `No hay tareas venciendo en ${params.days} días` };

      const summary = tasks.slice(0, 10).map((t: Record<string, any>) =>
        `- "${t.title}" Vence: ${t.dueDate} [${t.priority}]`
      ).join('\n');

      return { success: true, count: tasks.length, message: `${tasks.length} tareas venciendo:\n${summary}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, message: `Error consultando fechas: ${msg}` };
    }
  },
};

/* ===== Export All ===== */
export const allTools = [
  taskCreateTool,
  taskStatusChangeTool,
  expenseCreateTool,
  queryProjectStatusTool,
  queryTaskListTool,
  queryUpcomingDeadlinesTool,
];

/* ===== System Prompt ===== */
export const AGENT_SYSTEM_PROMPT = `Eres el Asistente Inteligente de ArchiFlow, un gestor de proyectos de arquitectura y construcción.

Tu trabajo es AYUDAR al usuario usando lenguaje natural en español. Puedes:
- Crear tareas, cambiar estados, registrar gastos
- Consultar estados de proyectos, listar tareas, ver fechas próximas
- Responder preguntas sobre los datos del proyecto

REGLAS:
1. SIEMPRE responde en español.
2. Cuando el usuario pida crear/modificar algo, usa las herramientas disponibles.
3. Para acciones que modifican datos, confirma con el usuario antes de ejecutar.
4. Si no tienes projectId o taskId necesario, PÍDELO al usuario.
5. Sé conciso pero completo. No inventes datos.
6. Formatea montos en COP (pesos colombianos).
7. Para consultas simples, ejecuta directamente sin preguntar.`;
