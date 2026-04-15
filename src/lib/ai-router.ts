/**
 * ai-router.ts
 * Router de IA multi-proveedor para ArchiFlow.
 * Enruta solicitudes al proveedor óptimo según tipo de tarea,
 * límites de tasa y disponibilidad.
 *
 * Proveedores:
 *   - Groq (Llama 3.1 8B) — Alto volumen, 14,400 req/día
 *   - Groq (Llama 3.1 70B) — Mejor razonamiento, 30 RPM
 *   - OpenAI-compatible (fallback) — Configurable via env
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/* ===== Provider Config ===== */
interface ProviderStatus {
  name: string;
  rpm: number;
  rpd: number;
  rpmCount: number;
  rpdCount: number;
  rpmReset: number;
  rpdReset: number;
  available: boolean;
}

/* ===== Rate Tracking State ===== */
const providerStats: Map<string, ProviderStatus> = new Map();

function initProvider(name: string, rpm: number, rpd: number) {
  if (!providerStats.has(name)) {
    providerStats.set(name, {
      name, rpm, rpd,
      rpmCount: 0, rpdCount: 0,
      rpmReset: Date.now() + 60000,
      rpdReset: Date.now() + 86400000,
      available: true,
    });
  }
  return providerStats.get(name)!;
}

function resetCounters(p: ProviderStatus) {
  const now = Date.now();
  if (now >= p.rpmReset) { p.rpmCount = 0; p.rpmReset = now + 60000; }
  if (now >= p.rpdReset) { p.rpdCount = 0; p.rpdReset = now + 86400000; }
}

function canUseProvider(p: ProviderStatus): boolean {
  if (!p.available) return false;
  resetCounters(p);
  return p.rpmCount < Math.floor(p.rpm * 0.8) && p.rpdCount < Math.floor(p.rpd * 0.8);
}

function markUsed(p: ProviderStatus) {
  p.rpmCount++;
  p.rpdCount++;
}

/* ===== Provider Client Instances ===== */
let groqClient: ReturnType<typeof createOpenAICompatible> | null = null;
let openaiClient: ReturnType<typeof createOpenAICompatible> | null = null;

function getGroqClientInstance() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;
    groqClient = createOpenAICompatible({
      name: 'groq',
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groqClient;
}

function getOpenAIClientInstance() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    openaiClient = createOpenAICompatible({
      name: 'openai-fallback',
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }
  return openaiClient;
}

/* ===== Request Types ===== */
export type AITaskType =
  | 'chat'
  | 'task_create'
  | 'task_update'
  | 'expense_create'
  | 'query'
  | 'analysis'
  | 'vision';

export interface AIRequestOptions {
  taskType: AITaskType;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  tools?: unknown[];
  maxTokens?: number;
  temperature?: number;
  userId?: string;
}

/* ===== Route Function ===== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAIModel = any;

export async function routeAIRequest(options: AIRequestOptions): Promise<{
  model: OpenAIModel,
  provider: string;
  modelName: string;
}> {
  const { taskType, tools } = options;
  const maxTokens = options.maxTokens || 1024;
  const temperature = options.temperature ?? 0.7;
  const needsReasoning = ['analysis', 'task_update', 'expense_create'].includes(taskType);
  const needsTools = !!tools && tools.length > 0;

  // Attempt 1: Groq (primary)
  const groq = getGroqClientInstance();
  if (groq) {
    const modelName = needsReasoning ? 'llama-3.1-70b-versatile' : 'llama-3.1-8b-instant';
    const rpd = needsReasoning ? 1440 : 14400;
    const stat = initProvider(modelName, 30, rpd);

    if (canUseProvider(stat)) {
      markUsed(stat);
      return {
        model: groq(modelName),
        provider: 'Groq',
        modelName,
      };
    }

    // Fallback to other Groq model
    const fallbackModel = needsReasoning ? 'llama-3.1-8b-instant' : 'llama-3.1-70b-versatile';
    const fallbackRpd = needsReasoning ? 14400 : 1440;
    const fallbackStat = initProvider(fallbackModel, 30, fallbackRpd);

    if (canUseProvider(fallbackStat)) {
      markUsed(fallbackStat);
      return {
        model: groq(fallbackModel),
        provider: 'Groq (fallback)',
        modelName: fallbackModel,
      };
    }
  }

  // Attempt 2: OpenAI-compatible fallback
  const openai = getOpenAIClientInstance();
  if (openai) {
    const modelName = process.env.AI_MODEL || 'gpt-4o-mini';
    const stat = initProvider(`openai-${modelName}`, 60, 10000);

    if (canUseProvider(stat)) {
      markUsed(stat);
      return {
        model: openai(modelName),
        provider: 'OpenAI-compatible',
        modelName,
      };
    }
  }

  throw new Error('Todos los proveedores de IA están en límite de tasa. Intenta en unos segundos.');
}

/* ===== Get Provider Stats (for admin/debug) ===== */
export function getProviderStats() {
  const stats: Array<{
    name: string; rpm: number; rpd: number;
    rpmCount: number; rpdCount: number; available: boolean;
  }> = [];
  for (const [, p] of providerStats.entries()) {
    resetCounters(p);
    stats.push({
      name: p.name,
      rpm: p.rpm,
      rpd: p.rpd,
      rpmCount: p.rpmCount,
      rpdCount: p.rpdCount,
      available: p.available,
    });
  }
  return stats;
}
