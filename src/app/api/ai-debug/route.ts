/**
 * /api/ai-debug — Endpoint de diagnóstico para la IA.
 * Verifica si las API keys están configuradas y si Firebase Admin funciona.
 * Solo accesible para usuarios autenticados (no expone las keys).
 */

import { requireAuth } from '@/lib/api-auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const checks: Array<{ name: string; ok: boolean; message: string }> = [];

    // 1. Check AI API keys (without revealing them)
    const groqKey = process.env.GROQ_API_KEY;
    checks.push({
      name: 'GROQ_API_KEY',
      ok: !!groqKey && groqKey.length > 10,
      message: groqKey ? `Configurada (${groqKey.slice(0, 6)}...${groqKey.slice(-4)})` : 'NO configurada',
    });

    const mistralKey = process.env.MISTRAL_API_KEY;
    checks.push({
      name: 'MISTRAL_API_KEY',
      ok: !!mistralKey && mistralKey.length > 10,
      message: mistralKey ? `Configurada (${mistralKey.slice(0, 6)}...${mistralKey.slice(-4)})` : 'NO configurada',
    });

    const openaiKey = process.env.OPENAI_API_KEY;
    checks.push({
      name: 'OPENAI_API_KEY',
      ok: !!openaiKey && openaiKey.length > 10,
      message: openaiKey ? `Configurada (${openaiKey.slice(0, 6)}...${openaiKey.slice(-4)})` : 'NO configurada',
    });

    // 2. Check Firebase Admin
    const adminCreds = process.env.FIREBASE_ADMIN_CREDENTIALS;
    checks.push({
      name: 'FIREBASE_ADMIN_CREDENTIALS',
      ok: !!adminCreds,
      message: adminCreds ? 'Configuradas' : 'NO configuradas (usando ADC)',
    });

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    checks.push({
      name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ok: !!projectId,
      message: projectId || 'NO configurado',
    });

    // 3. Summary
    const keysOk = checks.filter(c => ['GROQ_API_KEY', 'MISTRAL_API_KEY', 'OPENAI_API_KEY'].includes(c.name) && c.ok).length;
    const anyKey = keysOk > 0;

    return new Response(JSON.stringify({
      ok: anyKey,
      user: { uid: user.uid, email: user.email },
      keysConfigured: keysOk,
      checks,
      summary: anyKey
        ? `${keysOk} API key(s) configurada(s). La IA debería funcionar.`
        : 'NINGUNA API key configurada. La IA no funcionará hasta que agregues al menos una en Vercel → Settings → Environment Variables.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      summary: `Error de autenticación: ${message}. Asegúrate de estar logueado.`,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
