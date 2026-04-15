// @ts-nocheck - Vercel AI SDK v6 tool() types incompatible with strict TS
/**
 * ai-tools.ts
 * Herramientas del Agente IA para ArchiFlow — Nivel 1 + Nivel 2 (Fase 2).
 * Usa Vercel AI SDK tool() wrapper. Consolidadas desde route.ts.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';

const FV = getAdminFieldValue();

/* ===== Factory: crea todas las tools con userId inyectado ===== */
export function createAgentTools(userId: string) {
  const db = getAdminDb();

  return {
    /* ----- NIVEL 1: Escritura ----- */
    createTask: tool({
      description: 'Crea una nueva tarea en un proyecto existente. Úsala cuando el usuario quiere agregar una tarea, pendiente o actividad.',
      parameters: z.object({
        projectId: z.string().describe('ID del proyecto'),
        title: z.string().describe('Título de la tarea'),
        description: z.string().optional().describe('Descripción detallada'),
        priority: z.enum(['Alta', 'Media', 'Baja']).default('Media').describe('Prioridad'),
        dueDate: z.string().optional().describe('Fecha límite YYYY-MM-DD'),
        assigneeId: z.string().optional().describe('ID del usuario asignado'),
        phase: z.string().optional().describe('Fase del proyecto'),
      }),
      execute: async (args) => {
        try {
          const { projectId, title, description, priority, dueDate, assigneeId, phase } = args as {
            projectId: string; title: string; description?: string; priority?: string;
            dueDate?: string; assigneeId?: string; phase?: string;
          };
          const ref = await db.collection('tasks').add({
            title, description: description || '', priority: priority || 'Media',
            status: 'Pendiente', dueDate: dueDate || '',
            assignees: assigneeId ? [assigneeId] : [],
            phase: phase || '',
            createdAt: FV.serverTimestamp(), createdBy: userId,
            updatedAt: FV.serverTimestamp(), projectId,
          });
          return { success: true, id: ref.id, action: 'created', message: `Tarea "${title}" creada` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error creando tarea: ${msg}` };
        }
      },
    }),

    changeTaskStatus: tool({
      description: 'Cambia el estado de una tarea existente. Úsala cuando el usuario quiere avanzar, completar o retroceder una tarea.',
      parameters: z.object({
        taskId: z.string().describe('ID de la tarea'),
        newStatus: z.enum(['Pendiente', 'En progreso', 'En revisión', 'Completado']).describe('Nuevo estado'),
      }),
      execute: async (args) => {
        try {
          const { taskId, newStatus } = args as { taskId: string; newStatus: string };
          await db.collection('tasks').doc(taskId).update({ status: newStatus, updatedAt: FV.serverTimestamp(), updatedBy: userId });
          return { success: true, message: `Tarea → ${newStatus}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error cambiando estado: ${msg}` };
        }
      },
    }),

    createExpense: tool({
      description: 'Registra un nuevo gasto en un proyecto. Úsala cuando el usuario menciona un gasto, compra o pago.',
      parameters: z.object({
        projectId: z.string().describe('ID del proyecto'),
        concept: z.string().describe('Concepto del gasto'),
        amount: z.number().describe('Monto en COP'),
        category: z.string().optional().describe('Categoría (Materiales, Mano de obra, Transporte, Otro)'),
        date: z.string().optional().describe('Fecha YYYY-MM-DD'),
        supplier: z.string().optional().describe('Proveedor'),
      }),
      execute: async (args) => {
        try {
          const { projectId, concept, amount, category, date, supplier } = args as {
            projectId: string; concept: string; amount: number; category?: string;
            date?: string; supplier?: string;
          };
          await db.collection('expenses').add({
            concept, amount, category: category || 'Otro',
            date: date || new Date().toISOString().split('T')[0],
            supplier: supplier || '',
            createdAt: FV.serverTimestamp(), createdBy: userId, projectId,
          });
          return { success: true, message: `Gasto $${amount.toLocaleString('es-CO')} registrado` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error registrando gasto: ${msg}` };
        }
      },
    }),

    /* ----- NIVEL 2: Escritura avanzada ----- */
    updateTask: tool({
      description: 'Actualiza campos de una tarea existente (título, descripción, prioridad, fecha límite). Úsala para editar tareas.',
      parameters: z.object({
        taskId: z.string().describe('ID de la tarea'),
        title: z.string().optional().describe('Nuevo título'),
        description: z.string().optional().describe('Nueva descripción'),
        priority: z.enum(['Alta', 'Media', 'Baja']).optional().describe('Nueva prioridad'),
        dueDate: z.string().optional().describe('Nueva fecha límite YYYY-MM-DD'),
      }),
      execute: async (args) => {
        try {
          const { taskId, ...fields } = args as { taskId: string; title?: string; description?: string; priority?: string; dueDate?: string };
          const updateData: Record<string, unknown> = { updatedAt: FV.serverTimestamp(), updatedBy: userId };
          if (fields.title !== undefined) updateData.title = fields.title;
          if (fields.description !== undefined) updateData.description = fields.description;
          if (fields.priority !== undefined) updateData.priority = fields.priority;
          if (fields.dueDate !== undefined) updateData.dueDate = fields.dueDate;
          await db.collection('tasks').doc(taskId).update(updateData);
          const changed = Object.keys(fields).filter(k => fields[k as keyof typeof fields] !== undefined).join(', ');
          return { success: true, message: `Tarea actualizada (${changed})` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error actualizando tarea: ${msg}` };
        }
      },
    }),

    deleteTask: tool({
      description: 'Elimina una tarea existente. Úsala SOLO si el usuario lo pide explícitamente.',
      parameters: z.object({
        taskId: z.string().describe('ID de la tarea a eliminar'),
      }),
      execute: async (args) => {
        try {
          const { taskId } = args as { taskId: string };
          await db.collection('tasks').doc(taskId).delete();
          return { success: true, message: 'Tarea eliminada' };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error eliminando tarea: ${msg}` };
        }
      },
    }),

    /* ----- NIVEL 1: Lectura ----- */
    queryProject: tool({
      description: 'Consulta el estado actual de un proyecto. Úsala para responder preguntas sobre el estado de un proyecto.',
      parameters: z.object({ projectId: z.string().describe('ID del proyecto') }),
      execute: async (args) => {
        try {
          const { projectId } = args as { projectId: string };
          const doc = await db.collection('projects').doc(projectId).get();
          if (!doc.exists) return { success: false, message: 'Proyecto no encontrado' };
          const p = doc.data();
          const ts = await db.collection('tasks').where('projectId', '==', projectId).get();
          const tasks = ts.docs.map(d => d.data());
          const pending = tasks.filter((t: Record<string, unknown>) => t.status === 'Pendiente').length;
          const inProgress = tasks.filter((t: Record<string, unknown>) => t.status === 'En progreso').length;
          const completed = tasks.filter((t: Record<string, unknown>) => t.status === 'Completado').length;
          const es = await db.collection('expenses').where('projectId', '==', projectId).get();
          const totalSpent = es.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
          return {
            success: true,
            project: { name: p?.name || 'Sin nombre', status: p?.status || 'Activo', progress: p?.progress || 0, budget: p?.budget || 0 },
            tasks: { total: tasks.length, pending, inProgress, completed },
            totalSpent,
            message: `"${p?.name || 'Sin nombre'}": ${tasks.length} tareas (${pending} pend, ${inProgress} prog, ${completed} comp), $${totalSpent.toLocaleString('es-CO')} gastados de $${((p?.budget || 0)).toLocaleString('es-CO')}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando: ${msg}` };
        }
      },
    }),

    queryTasks: tool({
      description: 'Lista las tareas de un proyecto o usuario. Úsala para "¿qué tareas hay?" o "muéstrame las tareas".',
      parameters: z.object({
        projectId: z.string().optional().describe('ID del proyecto'),
        userId: z.string().optional().describe('ID del usuario asignado'),
        status: z.string().optional().describe('Filtrar por estado'),
      }),
      execute: async (args) => {
        try {
          const { projectId, userId, status } = args as { projectId?: string; userId?: string; status?: string };
          let snap;
          if (projectId) snap = await db.collection('tasks').where('projectId', '==', projectId).limit(15).get();
          else if (userId) snap = await db.collection('tasks').where('assignees', 'array-contains', userId).limit(15).get();
          else snap = await db.collection('tasks').orderBy('createdAt', 'desc').limit(15).get();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          if (status) tasks = tasks.filter((t: Record<string, unknown>) => t.status === status);
          if (tasks.length === 0) return { success: true, tasks: [], message: 'No se encontraron tareas' };
          const summary = tasks.slice(0, 10).map((t: Record<string, unknown>) =>
            `- "${t.title}" [${t.status}] ${t.priority}${t.dueDate ? ` Vence: ${t.dueDate}` : ''}`
          ).join('\n');
          return { success: true, count: tasks.length, message: `${tasks.length} tareas:\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error listando: ${msg}` };
        }
      },
    }),

    queryDeadlines: tool({
      description: 'Muestra tareas con fecha límite próxima. Úsala cuando el usuario pregunta por vencimientos o plazos.',
      parameters: z.object({
        projectId: z.string().optional().describe('Filtrar por proyecto'),
        days: z.number().default(7).describe('Días futuros a considerar'),
      }),
      execute: async (args) => {
        try {
          const { projectId, days } = args as { projectId?: string; days?: number };
          const snap = await db.collection('tasks').orderBy('dueDate', 'asc').limit(50).get();
          const now = new Date().toISOString().split('T')[0];
          const future = new Date(Date.now() + (days || 7) * 86400000).toISOString().split('T')[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))
            .filter((t: Record<string, unknown>) => t.dueDate && t.dueDate <= future && t.dueDate >= now && t.status !== 'Completado');
          if (projectId) tasks = tasks.filter((t: Record<string, unknown>) => t.projectId === projectId);
          if (tasks.length === 0) return { success: true, count: 0, message: `No hay tareas venciendo en ${days || 7} días` };
          const summary = tasks.slice(0, 10).map((t: Record<string, unknown>) =>
            `- "${t.title}" Vence: ${t.dueDate} [${t.priority}]`
          ).join('\n');
          return { success: true, count: tasks.length, message: `${tasks.length} tareas venciendo:\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando fechas: ${msg}` };
        }
      },
    }),

    /* ----- NIVEL 2: Lectura avanzada ----- */
    queryExpenses: tool({
      description: 'Lista los gastos de un proyecto. Úsala para "¿cuánto se ha gastado?" o "muéstrame los gastos".',
      parameters: z.object({
        projectId: z.string().describe('ID del proyecto'),
        category: z.string().optional().describe('Filtrar por categoría'),
        limit: z.number().default(10).describe('Máximo de registros a mostrar'),
      }),
      execute: async (args) => {
        try {
          const { projectId, category, limit } = args as { projectId: string; category?: string; limit?: number };
          const snap = await db.collection('expenses').where('projectId', '==', projectId).orderBy('createdAt', 'desc').limit(limit || 10).get();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let expenses = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          if (category) expenses = expenses.filter((e: Record<string, unknown>) => e.category === category);
          const total = expenses.reduce((s: number, e: Record<string, unknown>) => s + (Number(e.amount) || 0), 0);
          if (expenses.length === 0) return { success: true, total: 0, message: 'Sin gastos registrados' };
          const summary = expenses.slice(0, 8).map((e: Record<string, unknown>) =>
            `- ${e.concept}: $${(Number(e.amount) || 0).toLocaleString('es-CO')} [${e.category || 'Otro'}] ${e.date || ''}`
          ).join('\n');
          return { success: true, count: expenses.length, total, message: `${expenses.length} gastos (total $${total.toLocaleString('es-CO')}):\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando gastos: ${msg}` };
        }
      },
    }),

    queryBudget: tool({
      description: 'Muestra el presupuesto vs gastos de un proyecto. Úsala para "¿cuánto presupuesto queda?" o "resumen financiero".',
      parameters: z.object({
        projectId: z.string().describe('ID del proyecto'),
      }),
      execute: async (args) => {
        try {
          const { projectId } = args as { projectId: string };
          const doc = await db.collection('projects').doc(projectId).get();
          if (!doc.exists) return { success: false, message: 'Proyecto no encontrado' };
          const p = doc.data();
          const budget = Number(p?.budget) || 0;
          const es = await db.collection('expenses').where('projectId', '==', projectId).get();
          const totalSpent = es.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
          const remaining = budget - totalSpent;
          const pct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
          // Group by category
          const byCat: Record<string, number> = {};
          es.docs.forEach(d => {
            const e = d.data();
            const cat = e.category || 'Otro';
            byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
          });
          const catSummary = Object.entries(byCat)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => `  ${cat}: $${amt.toLocaleString('es-CO')}`)
            .join('\n');
          const statusEmoji = pct >= 100 ? '🔴' : pct >= 80 ? '🟠' : pct >= 50 ? '🟡' : '🟢';
          return {
            success: true,
            budget, totalSpent, remaining, pct,
            message: `${statusEmoji} "${p?.name}":\n  Presupuesto: $${budget.toLocaleString('es-CO')}\n  Gastado: $${totalSpent.toLocaleString('es-CO')} (${pct}%)\n  Restante: $${remaining.toLocaleString('es-CO')}\n\nDesglose:\n${catSummary || '  Sin gastos'}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando presupuesto: ${msg}` };
        }
      },
    }),
  };
}

/* ===== System Prompt (actualizado Fase 2) ===== */
export const AGENT_SYSTEM_PROMPT = `Eres el Asistente Inteligente de ArchiFlow, un gestor de proyectos de arquitectura y construcción.

Tu trabajo es AYUDAR al usuario usando lenguaje natural en español. Puedes:
- Crear, actualizar, cambiar estado y eliminar tareas
- Registrar gastos y consultar presupuesto
- Consultar estados de proyectos, listar tareas, ver fechas próximas
- Responder preguntas sobre los datos del proyecto

REGLAS:
1. SIEMPRE responde en español.
2. Cuando el usuario pida crear/modificar algo, usa las herramientas disponibles.
3. Para acciones que modifican datos (crear, actualizar, eliminar), confirma con el usuario antes de ejecutar.
4. Si no tienes projectId o taskId necesario, PÍDELO al usuario.
5. Sé conciso pero completo. No inventes datos.
6. Formatea montos en COP (pesos colombianos) con símbolo $.
7. Para consultas simples, ejecuta directamente sin preguntar.
8. Para eliminar tareas, SIEMPRE pide confirmación explícita del usuario antes de ejecutar.`;
