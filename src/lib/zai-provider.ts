/**
 * zai-provider.ts
 * Integración de z-ai-web-dev-sdk como proveedor de IA para ArchiFlow.
 *
 * IMPORTANTE: z-ai-web-dev-sdk usa una URL interna que SOLO funciona dentro
 * del entorno de Z.ai. NO es accesible desde Vercel ni otros servidores externos.
 *
 * Para activar ZAI en producción, debes configurar ZAI_BASE_URL con una URL
 * accesible públicamente. Sin esa variable, ZAI se desactiva automáticamente.
 *
 * Variables de entorno:
 *   ZAI_BASE_URL — URL base pública (obligatoria para usar ZAI fuera de Z.ai)
 *   ZAI_MODEL    — Modelo a usar (por defecto "default")
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

let zaiClient: ReturnType<typeof createOpenAICompatible> | null = null;

/**
 * Crea (o reutiliza) el cliente ZAI compatible con Vercel AI SDK.
 * Devuelve null si no hay ZAI_BASE_URL configurada (no usable desde Vercel).
 */
export function getZAIProvider() {
  // Solo activar ZAI si se configuró explícitamente una URL externa.
  // La IP interna 172.25.x.x solo funciona dentro del entorno Z.ai.
  const baseURL = process.env.ZAI_BASE_URL;
  if (!baseURL) {
    return null;
  }

  if (zaiClient) return zaiClient;

  try {
    zaiClient = createOpenAICompatible({
      name: 'zai',
      apiKey: 'Z.ai',
      baseURL,
    });

    const model = process.env.ZAI_MODEL || 'default';
    console.log(`[ZAI] Provider inicializado (baseURL=${baseURL}, model=${model})`);
    return zaiClient;
  } catch (err: unknown) {
    console.warn('[ZAI] No se pudo inicializar z-ai-web-dev-sdk:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Retorna el nombre del modelo ZAI a usar.
 */
export function getZAIModelName(): string {
  return process.env.ZAI_MODEL || 'default';
}
