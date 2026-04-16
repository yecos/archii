/**
 * ai-router.ts
 * Router de IA multi-proveedor para ArchiFlow — Fase 2.
 * Enruta solicitudes al proveedor óptimo según tipo de tarea,
 * límites de tasa y disponibilidad.
 *
 * Proveedores (en orden de prioridad):
 *   1. Groq (Llama 3.1 8B) — Alto volumen, 14,400 req/día (gratuito)
 *   2. Mistral (Mistral Small) — Calidad crítica, 50 RPM
 *   3. Groq (Llama 3.1 70B) — Mejor razonamiento, 30 RPM
 *   4. OpenAI-compatible (fallback) — Configurable via env
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getZAIProvider, getZAIModelName } from '@/lib/zai-provider';

/* ===== ZAI Provider (Prioridad 0 — siempre disponible) ===== */
function getZAIModel() {
  const zai = getZAIProvider();
  if (!zai) return null;
  const modelName = getZAIModelName();
  return { model: zai(modelName), provider: 'ZAI', modelName };
}

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
let mistralClient: ReturnType<typeof createOpenAICompatible> | null = null;
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

function getMistralClientInstance() {
  if (!mistralClient) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) return null;
    mistralClient = createOpenAICompatible({
      name: 'mistral',
      apiKey,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }
  return mistralClient;
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

export interface AIModelResult {
  model: OpenAIModel;
  provider: string;
  modelName: string;
}

/**
 * Returns all available providers in priority order for fallback support.
 * Used when a provider fails and we need to try the next one.
 */
function getAllAvailableModels(options: AIRequestOptions): AIModelResult[] {
  const { taskType } = options;
  const needsReasoning = ['analysis', 'task_update', 'expense_create'].includes(taskType);
  const results: AIModelResult[] = [];

  // Priority 0: ZAI (always available — internal provider)
  const zaiAttempt = getZAIModel();
  if (zaiAttempt) results.push(zaiAttempt);

  // Priority 1: Groq 8B (primary — free, high volume)
  const groq = getGroqClientInstance();
  if (groq) {
    if (!needsReasoning) {
      const modelName = 'llama-3.1-8b-instant';
      const stat = initProvider(modelName, 30, 14400);
      if (canUseProvider(stat)) results.push({ model: groq(modelName), provider: 'Groq', modelName });
    }

    // Priority 2: Mistral (quality critical)
    const mistral = getMistralClientInstance();
    if (mistral) {
      const modelName = 'mistral-small-latest';
      const stat = initProvider(modelName, 50, 5000);
      if (canUseProvider(stat)) results.push({ model: mistral(modelName), provider: 'Mistral', modelName });
    }

    // Priority 3: Groq 70B (reasoning fallback)
    const modelName70b = 'llama-3.1-70b-versatile';
    const stat70b = initProvider(modelName70b, 30, 1440);
    if (canUseProvider(stat70b)) results.push({ model: groq(modelName70b), provider: 'Groq 70B', modelName: modelName70b });

    // Priority 4: Groq 8B fallback
    if (needsReasoning) {
      const stat8b = initProvider('llama-3.1-8b-instant', 30, 14400);
      if (canUseProvider(stat8b)) results.push({ model: groq('llama-3.1-8b-instant'), provider: 'Groq (fallback)', modelName: 'llama-3.1-8b-instant' });
    }
  } else {
    // No Groq — try Mistral directly
    const mistral = getMistralClientInstance();
    if (mistral) {
      const modelName = 'mistral-small-latest';
      const stat = initProvider(modelName, 50, 5000);
      if (canUseProvider(stat)) results.push({ model: mistral(modelName), provider: 'Mistral', modelName });
    }
  }

  // Priority 5: OpenAI-compatible fallback
  const openai = getOpenAIClientInstance();
  if (openai) {
    const modelName = process.env.AI_MODEL || 'gpt-4o-mini';
    const stat = initProvider(`openai-${modelName}`, 60, 10000);
    if (canUseProvider(stat)) results.push({ model: openai(modelName), provider: 'OpenAI-compatible', modelName });
  }

  return results;
}

/**
 * Routes a request to the best available AI provider.
 * If excludeProviders is set, skips those providers (used for fallback).
 */
export async function routeAIRequest(options: AIRequestOptions, excludeProviders?: string[]): Promise<AIModelResult> {
  const available = getAllAvailableModels(options);
  const filtered = excludeProviders
    ? available.filter(r => !excludeProviders.includes(r.provider))
    : available;

  if (filtered.length === 0 && available.length === 0) {
    const hasAnyKey = !!process.env.GROQ_API_KEY || !!process.env.MISTRAL_API_KEY || !!process.env.OPENAI_API_KEY;
    if (!hasAnyKey) {
      throw new Error('No hay API keys de IA configuradas. Agrega GROQ_API_KEY, MISTRAL_API_KEY u OPENAI_API_KEY en las variables de entorno (Vercel → Settings → Environment Variables).');
    }
    throw new Error('Todos los proveedores de IA están en límite de tasa o fueron excluidos. Intenta en unos segundos.');
  }

  if (filtered.length === 0) {
    throw new Error('Todos los proveedores de IA disponibles fallaron. Intenta de nuevo.');
  }

  // Pick the first available provider
  const chosen = filtered[0];
  // Mark the provider as used (only for the first one to avoid double-counting)
  const stat = providerStats.get(chosen.modelName);
  if (stat) markUsed(stat);

  console.log(`[AI Router] Using ${chosen.provider} (${chosen.modelName})`);
  return chosen;
}

/**
 * Returns all available models (for manual fallback loops in callers).
 */
export function getFallbackProviders(options: AIRequestOptions): AIModelResult[] {
  return getAllAvailableModels(options);
}

/* ===== Get Provider Stats (for admin/debug) ===== */
export function getProviderStats(): Array<{
    name: string; rpm: number; rpd: number;
    rpmCount: number; rpdCount: number; available: boolean;
  }> {
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
