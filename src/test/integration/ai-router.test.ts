import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to declare mock variables that are available in vi.mock factories
const { mockModelFn, mockCreateOpenAICompatible } = vi.hoisted(() => {
  const mockModelFn = vi.fn(() => 'mock-model-instance');
  const mockCreateOpenAICompatible = vi.fn(() => mockModelFn);
  return { mockModelFn, mockCreateOpenAICompatible };
});

// Mock the AI SDK dependency
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: mockCreateOpenAICompatible,
}));

describe('AI Router', () => {
  const originalEnv = process.env;

  // Dynamically import the module to get fresh state per describe block
  let routeAIRequest: typeof import('@/lib/ai-router').routeAIRequest;
  let getProviderStats: typeof import('@/lib/ai-router').getProviderStats;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset process.env for each test
    process.env = { ...originalEnv };
    // Re-import module to reset module-level state (providerStats map, client caches)
    vi.resetModules();
    // Re-apply the mock after module reset
    const mod = await import('@/lib/ai-router');
    routeAIRequest = mod.routeAIRequest;
    getProviderStats = mod.getProviderStats;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getProviderStats', () => {
    it('returns empty array when no providers have been initialized', () => {
      const stats = getProviderStats();
      expect(Array.isArray(stats)).toBe(true);
      // Fresh module import means empty stats
      expect(stats).toHaveLength(0);
    });

    it('returns provider data after a routeAIRequest call initializes a provider', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      await routeAIRequest({
        taskType: 'chat',
        messages: [{ role: 'user', content: 'hello' }],
      });

      const stats = getProviderStats();
      expect(stats.length).toBeGreaterThan(0);

      const groqStat = stats.find(s => s.name.includes('llama'));
      expect(groqStat).toBeDefined();
      expect(groqStat!.available).toBe(true);
      expect(groqStat!.rpm).toBeGreaterThan(0);
      expect(groqStat!.rpd).toBeGreaterThan(0);
      expect(typeof groqStat!.rpmCount).toBe('number');
      expect(typeof groqStat!.rpdCount).toBe('number');
    });
  });

  describe('routeAIRequest', () => {
    it('throws error when no API keys are configured (all providers unavailable)', async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(
        routeAIRequest({
          taskType: 'chat',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      ).rejects.toThrow(/Todos los proveedores de IA están en límite de tasa/);
    });

    it('routes to Groq when GROQ_API_KEY is set', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const result = await routeAIRequest({
        taskType: 'chat',
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result.provider).toBe('Groq');
      expect(result.modelName).toBe('llama-3.1-8b-instant');
      expect(mockCreateOpenAICompatible).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'groq',
          apiKey: 'test-groq-key',
          baseURL: 'https://api.groq.com/openai/v1',
        }),
      );
    });

    it('uses 70B model for analysis tasks (needs reasoning)', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const result = await routeAIRequest({
        taskType: 'analysis',
        messages: [{ role: 'user', content: 'analyze this' }],
      });

      expect(result.provider).toBe('Groq');
      expect(result.modelName).toBe('llama-3.1-70b-versatile');
    });

    it('uses 70B model for task_update tasks', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const result = await routeAIRequest({
        taskType: 'task_update',
        messages: [{ role: 'user', content: 'update task' }],
      });

      expect(result.modelName).toBe('llama-3.1-70b-versatile');
    });

    it('uses 70B model for expense_create tasks', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const result = await routeAIRequest({
        taskType: 'expense_create',
        messages: [{ role: 'user', content: 'create expense' }],
      });

      expect(result.modelName).toBe('llama-3.1-70b-versatile');
    });

    it('falls back to OpenAI-compatible when Groq key is missing', async () => {
      delete process.env.GROQ_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const result = await routeAIRequest({
        taskType: 'chat',
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result.provider).toBe('OpenAI-compatible');
      expect(result.modelName).toBe('gpt-4o-mini');
      expect(mockCreateOpenAICompatible).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'openai-fallback',
          apiKey: 'test-openai-key',
        }),
      );
    });

    it('respects AI_MODEL env var for OpenAI-compatible fallback', async () => {
      delete process.env.GROQ_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.AI_MODEL = 'gpt-4o';
      process.env.OPENAI_BASE_URL = 'https://custom.openai.com/v1';

      const result = await routeAIRequest({
        taskType: 'chat',
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result.provider).toBe('OpenAI-compatible');
      expect(result.modelName).toBe('gpt-4o');
      expect(mockCreateOpenAICompatible).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.openai.com/v1',
        }),
      );
    });

    it('increments provider usage counters', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      // First call
      await routeAIRequest({ taskType: 'chat', messages: [{ role: 'user', content: '1' }] });

      const stats1 = getProviderStats();
      const chatStat1 = stats1.find(s => s.name === 'llama-3.1-8b-instant');
      expect(chatStat1).toBeDefined();
      const countAfterFirst = chatStat1!.rpmCount;

      // Second call
      await routeAIRequest({ taskType: 'chat', messages: [{ role: 'user', content: '2' }] });

      const stats2 = getProviderStats();
      const chatStat2 = stats2.find(s => s.name === 'llama-3.1-8b-instant');
      expect(chatStat2!.rpmCount).toBe(countAfterFirst + 1);
    });

    it('accepts all task types without throwing', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const taskTypes: Array<{ taskType: string; msg: string }> = [
        { taskType: 'chat', msg: 'test' },
        { taskType: 'task_create', msg: 'test' },
        { taskType: 'task_update', msg: 'test' },
        { taskType: 'expense_create', msg: 'test' },
        { taskType: 'query', msg: 'test' },
        { taskType: 'analysis', msg: 'test' },
        { taskType: 'vision', msg: 'test' },
      ];

      for (const { taskType, msg } of taskTypes) {
        const result = await routeAIRequest({
          taskType: taskType as any,
          messages: [{ role: 'user', content: msg }],
        });
        expect(result).toBeDefined();
        expect(result.provider).toBeTruthy();
        expect(result.modelName).toBeTruthy();
      }
    });
  });
});
