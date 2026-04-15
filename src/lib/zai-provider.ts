/**
 * zai-provider.ts
 * Integración de z-ai-web-dev-sdk como proveedor de IA para ArchiFlow.
 *
 * z-ai-web-dev-sdk expone una API compatible con OpenAI en:
 *   baseURL = http://172.25.136.193:8080/v1
 *   apiKey  = "Z.ai"
 *
 * Se usa createOpenAICompatible del Vercel AI SDK para que funcione
 * transparentemente con streamText(), tools, y todo el ecosistema AI SDK.
 *
 * Variables de entorno (opcionales):
 *   ZAI_BASE_URL — URL base (por defecto la del SDK)
 *   ZAI_MODEL    — Modelo a usar (por defecto "default")
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

let zaiClient: ReturnType<typeof createOpenAICompatible> | null = null;

/**
 * Crea (o reutiliza) el cliente ZAI compatible con Vercel AI SDK.
 * Devuelve null si falla la inicialización (sin romper la app).
 */
export function getZAIProvider() {
  if (zaiClient) return zaiClient;

  try {
    // Importar z-ai-web-dev-sdk dinámicamente para no fallar si no está disponible
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ZAI = require('z-ai-web-dev-sdk').default;

    // create() es async, pero necesitamos config síncrono para el provider.
    // El SDK expone la config directamente. Como create() inicializa internamente,
    // usamos los valores conocidos del entorno interno.
    const baseURL = process.env.ZAI_BASE_URL || 'http://172.25.136.193:8080/v1';
    const model = process.env.ZAI_MODEL || 'default';

    zaiClient = createOpenAICompatible({
      name: 'zai',
      apiKey: 'Z.ai',
      baseURL,
    });

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
