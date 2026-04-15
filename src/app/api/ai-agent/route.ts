// @ts-nocheck - Vercel AI SDK v6 tool() types incompatible with strict TS
/**
 * /api/ai-agent — AI Agent endpoint with streaming + function calling.
 * Uses Vercel AI SDK v6 with multi-provider routing (Groq primary, OpenAI fallback).
 */

import { streamText, tool } from 'ai';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { routeAIRequest } from '@/lib/ai-router';
import { AGENT_SYSTEM_PROMPT } from '@/lib/ai-tools';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

const FV = getAdminFieldValue();

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const rateResult = checkRateLimit(request, { maxRequests: 20, windowSeconds: 60 });
    if (!rateResult.success) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { messages, projectContext } = body as { messages: Array<{ role: string; content: string }>; projectContext?: string };

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'Se requieren mensajes' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let sysPrompt = AGENT_SYSTEM_PROMPT;
    if (projectContext) sysPrompt += `\n\nCONTEXTO DEL PROYECTO ACTUAL:\n${projectContext}`;

    const { model, provider, modelName } = await routeAIRequest({ taskType: 'chat', messages, userId: user.uid });
    console.log(`[ArchiFlow Agent] ${provider} (${modelName}) user=${user.uid}`);

    const result = streamText({
      model,
      system: sysPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      tools: {
        createTask: tool({
          description: 'Crea una nueva tarea en un proyecto.',
          parameters: z.object({ projectId: z.string(), title: z.string(), description: z.string().optional(), priority: z.enum(['Alta', 'Media', 'Baja']).default('Media'), dueDate: z.string().optional() }),
          execute: async (args) => {
            const db = getAdminDb();
            const { projectId, title, description, priority, dueDate } = args as { projectId: string; title: string; description?: string; priority?: string; dueDate?: string };
            await db.collection('tasks').add({ title, description: description || '', priority: priority || 'Media', status: 'Pendiente', dueDate: dueDate || '', assignees: [], createdAt: FV.serverTimestamp(), createdBy: user.uid, updatedAt: FV.serverTimestamp(), projectId });
            return { message: `Tarea "${title}" creada` };
          },
        }),
        changeTaskStatus: tool({
          description: 'Cambia el estado de una tarea.',
          parameters: z.object({ taskId: z.string(), newStatus: z.enum(['Pendiente', 'En progreso', 'En revisión', 'Completado']) }),
          execute: async (args) => {
            const { taskId, newStatus } = args as { taskId: string; newStatus: string };
            const db = getAdminDb();
            await db.collection('tasks').doc(taskId).update({ status: newStatus, updatedAt: FV.serverTimestamp(), updatedBy: user.uid });
            return { message: `Tarea → ${newStatus}` };
          },
        }),
        createExpense: tool({
          description: 'Registra un gasto en un proyecto.',
          parameters: z.object({ projectId: z.string(), concept: z.string(), amount: z.number(), category: z.string().optional() }),
          execute: async (args) => {
            const { projectId, concept, amount, category } = args as { projectId: string; concept: string; amount: number; category?: string };
            const db = getAdminDb();
            await db.collection('expenses').add({ concept, amount, category: category || 'Otro', date: new Date().toISOString().split('T')[0], createdAt: FV.serverTimestamp(), createdBy: user.uid, projectId });
            return { message: `Gasto $${amount.toLocaleString('es-CO')} registrado` };
          },
        }),
        queryProject: tool({
          description: 'Consulta el estado de un proyecto.',
          parameters: z.object({ projectId: z.string() }),
          execute: async (args) => {
            const { projectId } = args as { projectId: string };
            const db = getAdminDb();
            const doc = await db.collection('projects').doc(projectId).get();
            if (!doc.exists) return { message: 'Proyecto no encontrado' };
            const p = doc.data();
            const ts = await db.collection('tasks').where('projectId', '==', projectId).get();
            const tasks = ts.docs.map(d => d.data());
            const comp = tasks.filter((t: Record<string, unknown>) => t.status === 'Completado').length;
            return { message: `"${p?.name || 'Sin nombre'}": ${tasks.length} tareas (${comp} completadas), progreso ${p?.progress || 0}%` };
          },
        }),
        queryTasks: tool({
          description: 'Lista tareas de un proyecto.',
          parameters: z.object({ projectId: z.string().optional(), status: z.string().optional() }),
          execute: async (args) => {
            const { projectId, status } = args as { projectId?: string; status?: string };
            const db = getAdminDb();
            const snap = projectId ? await db.collection('tasks').where('projectId', '==', projectId).limit(15).get() : await db.collection('tasks').orderBy('createdAt', 'desc').limit(15).get();
            const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const filtered = status ? tasks.filter((t: Record<string, unknown>) => t.status === status) : tasks;
            const summary = filtered.slice(0, 8).map((t: Record<string, unknown>) => `- "${t.title}" [${t.status}]`).join('\n');
            return { message: filtered.length > 0 ? `${filtered.length} tareas:\n${summary}` : 'Sin tareas' };
          },
        }),
        queryDeadlines: tool({
          description: 'Muestra tareas con fecha límite próxima (7 días).',
          parameters: z.object({ projectId: z.string().optional() }),
          execute: async (args) => {
            const { projectId } = args as { projectId?: string };
            const db = getAdminDb();
            const snap = await db.collection('tasks').orderBy('dueDate', 'asc').limit(50).get();
            const now = new Date().toISOString().split('T')[0];
            const future = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: Record<string, unknown>) => t.dueDate && t.dueDate <= future && t.dueDate >= now && t.status !== 'Completado');
            if (projectId) tasks = tasks.filter((t: Record<string, unknown>) => t.projectId === projectId);
            const summary = tasks.slice(0, 8).map((t: Record<string, unknown>) => `- "${t.title}" Vence: ${t.dueDate}`).join('\n');
            return { message: tasks.length > 0 ? `${tasks.length} venciendo:\n${summary}` : 'Sin tareas próximas' };
          },
        }),
      },
    });

    return result.toTextStreamResponse();

  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ArchiFlow Agent] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
