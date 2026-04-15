/**
 * /api/ai-agent — AI Agent endpoint with streaming + function calling.
 * Fase 2: Tools consolidadas desde ai-tools.ts, soporta Mistral + 4 proveedores.
 */

import { streamText, stepCountIs } from 'ai';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { routeAIRequest } from '@/lib/ai-router';
import { createAgentTools, AGENT_SYSTEM_PROMPT } from '@/lib/ai-tools';
import { NextRequest } from 'next/server';

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

    // Tools consolidadas con userId inyectado
    const tools = createAgentTools(user.uid);

    const result = streamText({
      model,
      system: sysPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish({ text, toolCalls, toolResults }) {
        if (toolCalls?.length) {
          console.log(`[ArchiFlow Agent] Tools: ${toolCalls.map(tc => tc.toolName).join(', ')}`);
        }
        if (text) console.log(`[ArchiFlow Agent] Step text: ${text.slice(0, 200)}`);
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
