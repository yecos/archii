import ZAI from "z-ai-web-dev-sdk";

interface ZAIConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  token?: string;
  userId?: string;
}

let _zaiInstance: InstanceType<typeof ZAI> | null = null;

/**
 * Initialize z-ai-web-dev-sdk using environment variables.
 * Falls back to ZAI.create() for local development (reads /etc/.z-ai-config).
 *
 * Required env vars on Vercel:
 *   Z_AI_BASE_URL  — API base URL
 *   Z_AI_API_KEY   — API key
 *
 * Optional env vars:
 *   Z_AI_CHAT_ID   — Chat ID
 *   Z_AI_TOKEN     — Auth token
 *   Z_AI_USER_ID   — User ID
 */
export async function getZAI(): Promise<InstanceType<typeof ZAI>> {
  if (_zaiInstance) return _zaiInstance;

  // Try environment variables first (works on Vercel)
  const envConfig: Partial<ZAIConfig> = {};
  if (process.env.Z_AI_BASE_URL) envConfig.baseUrl = process.env.Z_AI_BASE_URL;
  if (process.env.Z_AI_API_KEY) envConfig.apiKey = process.env.Z_AI_API_KEY;
  if (process.env.Z_AI_CHAT_ID) envConfig.chatId = process.env.Z_AI_CHAT_ID;
  if (process.env.Z_AI_TOKEN) envConfig.token = process.env.Z_AI_TOKEN;
  if (process.env.Z_AI_USER_ID) envConfig.userId = process.env.Z_AI_USER_ID;

  if (envConfig.baseUrl && envConfig.apiKey) {
    _zaiInstance = new ZAI(envConfig as ZAIConfig);
    return _zaiInstance;
  }

  // Fallback: use SDK's create() (reads /etc/.z-ai-config for local dev)
  try {
    _zaiInstance = await ZAI.create();
    return _zaiInstance;
  } catch {
    throw new Error(
      "z-ai-web-dev-sdk: No se encontró configuración. " +
      "Configura Z_AI_BASE_URL y Z_AI_API_KEY como variables de entorno."
    );
  }
}
