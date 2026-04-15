/**
 * /api/ai-test — TEMPORAL: endpoint de prueba para verificar API keys.
 * Solo devuelve si las keys están configuradas (sin revelar el valor).
 * ELIMINAR después de diagnosticar.
 */

import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST() {
  try {
    const results: Record<string, { ok: boolean; error?: string }> = {};

    // Test 1: Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      results.groq = { ok: false, error: 'GROQ_API_KEY no configurada' };
    } else {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'Responde OK' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          results.groq = { ok: true };
        } else {
          const err = await res.text();
          results.groq = { ok: false, error: `HTTP ${res.status}: ${err.substring(0, 200)}` };
        }
      } catch (e) {
        results.groq = { ok: false, error: e instanceof Error ? e.message : 'Timeout' };
      }
    }

    // Test 2: Mistral
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) {
      results.mistral = { ok: false, error: 'MISTRAL_API_KEY no configurada' };
    } else {
      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: 'Responde OK' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          results.mistral = { ok: true };
        } else {
          const err = await res.text();
          results.mistral = { ok: false, error: `HTTP ${res.status}: ${err.substring(0, 200)}` };
        }
      } catch (e) {
        results.mistral = { ok: false, error: e instanceof Error ? e.message : 'Timeout' };
      }
    }

    // Test 3: OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      results.openai = { ok: false, error: 'OPENAI_API_KEY no configurada' };
    } else {
      try {
        const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const model = process.env.AI_MODEL || 'gpt-4o-mini';
        const res = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Responde OK' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          results.openai = { ok: true };
        } else {
          const err = await res.text();
          results.openai = { ok: false, error: `HTTP ${res.status}: ${err.substring(0, 200)}` };
        }
      } catch (e) {
        results.openai = { ok: false, error: e instanceof Error ? e.message : 'Timeout' };
      }
    }

    const anyWorking = Object.values(results).some(r => r.ok);

    return NextResponse.json({
      ok: anyWorking,
      results,
      summary: anyWorking
        ? `IA funciona. Proveedores OK: ${Object.entries(results).filter(([, v]) => v.ok).map(([k]) => k).join(', ')}`
        : 'NINGÚN proveedor funciona. Revisa las API keys en Vercel.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
