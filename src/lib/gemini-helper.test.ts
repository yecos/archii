import { afterEach, expect, it, vi } from 'vitest';
import { chatCompletionWithTools, type OpenAITool } from './gemini-helper';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('returns named tool results together and preserves the model signature on follow-up', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({
      models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }],
    }))
    .mockResolvedValueOnce(Response.json({
      candidates: [{ content: { parts: [
        { functionCall: { name: 'get_projects', args: {} }, thoughtSignature: 'signed-part' },
        { functionCall: { name: 'get_projects', args: { status: 'Abierto' } } },
      ] } }],
    }))
    .mockResolvedValueOnce(Response.json({
      candidates: [{ content: { parts: [{ text: 'Resultado de prueba' }] } }],
    }));
  vi.stubGlobal('fetch', fetchMock);
  const tools: OpenAITool[] = [{
    type: 'function',
    function: { name: 'get_projects', description: 'List projects', parameters: { type: 'object' } },
  }];
  const query = { role: 'user' as const, content: 'Resume mis proyectos QA' };
  const initial = await chatCompletionWithTools([query], tools);
  const calls = initial.choices[0].message.tool_calls!;
  const result = await chatCompletionWithTools([
    query,
    { role: 'assistant', content: '', tool_calls: calls },
    ...calls.map(call => ({
      role: 'tool' as const,
      tool_call_id: call.id,
      name: call.function.name,
      content: 'Datos QA',
    })),
  ], tools, { toolMode: 'NONE' });

  const request = JSON.parse(fetchMock.mock.calls[2][1].body);
  expect(request.contents[1].parts[0].thoughtSignature).toBe('signed-part');
  expect(request.contents[2].parts.map(
    (part: { functionResponse: { name: string } }) => part.functionResponse.name,
  )).toEqual(['get_projects', 'get_projects']);
  expect(request.toolConfig.functionCallingConfig.mode).toBe('NONE');
  expect(result.choices[0].message.content).toBe('Resultado de prueba');
});
