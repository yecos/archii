/**
 * /api/ai-agent — AI Agent endpoint with streaming + function calling.
 * Fase 2: Tools consolidadas desde ai-tools.ts, soporta Mistral + 4 proveedores.
 * Fase 4: Auto-enriches project context from Firestore when projectId is provided.
 * Fase 5: fullStream con tool calls visibles para el cliente + soporte de imágenes.
 */

import { streamText, stepCountIs } from 'ai';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { routeAIRequest } from '@/lib/ai-router';
import { createAgentTools, AGENT_SYSTEM_PROMPT } from '@/lib/ai-tools';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

/**
 * Build rich project context by fetching live data from Firestore.
 * This gives the AI up-to-date info about tasks, budget, and progress.
 */
async function buildRichProjectContext(projectId: string, userId: string): Promise<string> {
  try {
    const db = getAdminDb();

    // Fetch project doc
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return '';

    const p = projectDoc.data();
    const projectInfo = [
      `Proyecto: ${p?.name || 'Sin nombre'}`,
      `Descripcion: ${p?.description || 'Sin descripcion'}`,
      `Cliente: ${p?.client || 'No definido'}`,
      `Ubicacion: ${p?.location || 'No definida'}`,
      `Estado: ${p?.status || 'N/A'}`,
      `Fase actual: ${p?.phase || 'N/A'}`,
      `Presupuesto: $${(Number(p?.budget) || 0).toLocaleString('es-CO')} COP`,
      `Progreso: ${p?.progress || 0}%`,
      `ID: ${projectId}`,
    ].join('\n');

    // Quick task summary
    const tasksSnap = await db.collection('tasks')
      .where('projectId', '==', projectId)
      .limit(20)
      .get();

    if (!tasksSnap.empty) {
      const allTasks = tasksSnap.docs.map(d => d.data());
      const pending = allTasks.filter(t => t.status === 'Pendiente').length;
      const inProg = allTasks.filter(t => t.status === 'En progreso').length;
      const completed = allTasks.filter(t => t.status === 'Completado').length;
      const overdue = allTasks.filter(t => {
        if (!t.dueDate || t.status === 'Completado') return false;
        return new Date(t.dueDate) < new Date();
      }).length;

      // Get upcoming deadlines
      const upcoming = allTasks
        .filter(t => t.dueDate && t.status !== 'Completado')
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5)
        .map(t => `- "${t.title}" [${t.status}] Vence: ${t.dueDate}`)
        .join('\n');

      return `${projectInfo}\n\nRESUMEN DE TAREAS:\nTotal: ${allTasks.length} | Pendientes: ${pending} | En progreso: ${inProg} | Completadas: ${completed} | Vencidas: ${overdue}${upcoming ? '\n\nProximas a vencer:\n' + upcoming : ''}`;
    }

    return projectInfo;
  } catch (err) {
    console.warn('[Agent] Error building project context:', err instanceof Error ? err.message : err);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const rateResult = checkRateLimit(request, { maxRequests: 20, windowSeconds: 60 });
    if (!rateResult.success) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const {
      messages,
      projectContext: clientContext,
      projectId,
    } = body as {
      messages: Array<{ role: string; content: string; images?: string[] }>;
      projectContext?: string;
      projectId?: string;
    };

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'Se requieren mensajes' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let sysPrompt = AGENT_SYSTEM_PROMPT;

    // Build context: use projectId to fetch live data, or fall back to client-provided context
    if (projectId) {
      const richContext = await buildRichProjectContext(projectId, user.uid);
      if (richContext) {
        sysPrompt += `\n\nCONTEXTO DEL PROYECTO ACTUAL (datos en tiempo real):\n${richContext}`;
      } else if (clientContext) {
        sysPrompt += `\n\nCONTEXTO DEL PROYECTO ACTUAL:\n${clientContext}`;
      }
    } else if (clientContext) {
      sysPrompt += `\n\nCONTEXTO DEL PROYECTO ACTUAL:\n${clientContext}`;
    }

    // Add date context
    const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    sysPrompt += `\n\nFecha actual: ${today}`;

    // Check if any message has images — use vision task type
    const hasImages = messages.some(m => m.images && m.images.length > 0);

    const { model, provider, modelName } = await routeAIRequest({
      taskType: hasImages ? 'vision' : 'chat',
      messages,
      userId: user.uid,
    });
    console.log(`[ArchiFlow Agent] ${provider} (${modelName}) user=${user.uid} project=${projectId || 'none'} images=${hasImages}`);

    // Tools consolidadas con userId inyectado
    const tools = createAgentTools(user.uid);

    // Convert messages for AI SDK — support multi-content with images
    const aiMessages = messages.map(m => {
      // If message has images and is from user, use multi-content format
      if (m.images && m.images.length > 0 && m.role === 'user') {
        const contentParts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
          { type: 'text', text: m.content || 'Describe esta imagen' },
        ];
        for (const img of m.images) {
          contentParts.push({ type: 'image' as const, image: img });
        }
        return {
          role: 'user' as const,
          content: contentParts,
        };
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    });

    const result = streamText({
      model,
      system: sysPrompt,
      messages: aiMessages,
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish({ text, toolCalls, toolResults }) {
        if (toolCalls?.length) {
          console.log(`[ArchiFlow Agent] Tools: ${toolCalls.map(tc => tc.toolName).join(', ')}`);
        }
        if (text) console.log(`[ArchiFlow Agent] Step text: ${text.slice(0, 200)}`);
      },
    });

    // Use fullStream to send both text and tool call events to the client
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const part of result.fullStream as any) {
            const partType = part.type;

            if (partType === 'text-delta') {
              // Text chunk — accumulate in client
              controller.enqueue(
                encoder.encode(JSON.stringify({ t: 'text', c: part.text || '' }) + '\n')
              );
            } else if (partType === 'tool-call') {
              // Tool being called — show in UI as "running"
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  t: 'tc',
                  id: part.toolCallId || '',
                  n: part.toolName || '',
                  a: part.input || part.args || {},
                }) + '\n')
              );
            } else if (partType === 'tool-result') {
              // Tool finished — show in UI with result
              const output = part.output ?? part.result ?? '';
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  t: 'tr',
                  id: part.toolCallId || '',
                  n: part.toolName || '',
                  r: typeof output === 'string' ? output : JSON.stringify(output),
                  e: part.isError ? true : undefined,
                }) + '\n')
              );
            } else if (partType === 'tool-error') {
              // Tool error
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  t: 'tr',
                  id: part.toolCallId || '',
                  n: part.toolName || '',
                  r: part.error ? String(part.error) : 'Error en herramienta',
                  e: true,
                }) + '\n')
              );
            } else if (partType === 'error') {
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  t: 'err',
                  m: part.error ? String(part.error) : 'Error desconocido',
                }) + '\n')
              );
            }
            // Ignore other parts: start, finish, finish-step, start-step, etc.
          }
          controller.enqueue(encoder.encode(JSON.stringify({ t: 'done' }) + '\n'));
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Error en stream';
          console.error('[Agent] Stream error:', errMsg);
          controller.enqueue(
            encoder.encode(JSON.stringify({ t: 'err', m: errMsg }) + '\n')
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ArchiFlow Agent] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
