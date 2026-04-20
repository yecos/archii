/**
 * Gemini Helper — OpenAI-compatible wrapper for Google Gemini API.
 *
 * Exposes `chatCompletion()` and `chatCompletionWithTools()` that accept
 * OpenAI-style messages/tools and return OpenAI-style responses, so the
 * existing route handlers need minimal changes.
 *
 * Requires: GEMINI_API_KEY environment variable (set in Vercel dashboard).
 * Model: gemini-2.0-flash (free tier, supports function calling).
 */

// ── Types (OpenAI-compatible subset used by routes) ──────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface CompletionOptions {
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: "stop" | "tool_calls";
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala como variable de entorno en Vercel."
    );
  }
  return key;
}

const MODEL = "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ── Message / Tool conversion (OpenAI → Gemini) ─────────────────────

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: {
    name: string;
    response: { content: string };
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

function convertMessages(
  messages: ChatMessage[]
): { systemInstruction: { parts: GeminiPart[] }; contents: GeminiContent[] } {
  const systemParts: GeminiPart[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push({ text: msg.content });
      continue;
    }

    if (msg.role === "tool") {
      // tool message → Gemini functionResponse (sent as user role)
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.name || msg.tool_call_id || "unknown",
              response: { content: msg.content },
            },
          },
        ],
      });
      continue;
    }

    const geminiRole = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
      // Assistant message with tool calls → parts with functionCall entries
      const parts: GeminiPart[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }
        parts.push({
          functionCall: {
            name: tc.function.name,
            args,
          },
        });
      }
      contents.push({ role: geminiRole, parts });
      continue;
    }

    contents.push({
      role: geminiRole,
      parts: [{ text: msg.content }],
    });
  }

  return {
    systemInstruction: systemParts.length > 0 ? { parts: systemParts } : undefined as any,
    contents,
  };
}

function convertTools(
  tools?: OpenAITool[]
): { functionDeclarations: any[] }[] | undefined {
  if (!tools || tools.length === 0) return undefined;

  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

// ── Response conversion (Gemini → OpenAI) ────────────────────────────

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }[];
  error?: { message: string; code: number };
}

function convertResponse(geminiRes: GeminiResponse): OpenAIResponse {
  // Handle API-level errors
  if (geminiRes.error) {
    throw new Error(
      `Gemini API error ${geminiRes.error.code}: ${geminiRes.error.message}`
    );
  }

  const candidate = geminiRes.candidates?.[0];
  if (!candidate || !candidate.content?.parts) {
    throw new Error("Gemini: No se recibió respuesta del modelo.");
  }

  const parts = candidate.content.parts;
  const textParts = parts.filter((p) => p.text);
  const functionCallParts = parts.filter((p) => p.functionCall);

  // If there are function calls, return tool_calls format
  if (functionCallParts.length > 0) {
    const tool_calls: ToolCall[] = functionCallParts.map((p, i) => ({
      id: `call_${Date.now()}_${i}`,
      type: "function" as const,
      function: {
        name: p.functionCall!.name,
        arguments: JSON.stringify(p.functionCall!.args),
      },
    }));

    return {
      choices: [
        {
          message: {
            content: textParts.length > 0 ? textParts.map((p) => p.text!).join("") : null,
            tool_calls,
          },
          finish_reason: "tool_calls",
        },
      ],
    };
  }

  // Simple text response
  return {
    choices: [
      {
        message: {
          content: textParts.map((p) => p.text!).join(""),
        },
        finish_reason: "stop",
      },
    ],
  };
}

// ── Core API call ────────────────────────────────────────────────────

async function callGemini(body: Record<string, unknown>): Promise<GeminiResponse> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Gemini API HTTP ${res.status}: ${text.slice(0, 300)}`
    );
  }

  return res.json();
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Simple chat completion (no tools / function calling).
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions
): Promise<OpenAIResponse> {
  const { systemInstruction, contents } = convertMessages(messages);

  const geminiRes = await callGemini({
    systemInstruction,
    contents,
    generationConfig: {
      maxOutputTokens: options?.max_tokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    },
  });

  return convertResponse(geminiRes);
}

/**
 * Chat completion with tool / function calling support.
 */
export async function chatCompletionWithTools(
  messages: ChatMessage[],
  tools?: OpenAITool[],
  options?: CompletionOptions
): Promise<OpenAIResponse> {
  const { systemInstruction, contents } = convertMessages(messages);
  const geminiTools = convertTools(tools);

  const geminiRes = await callGemini({
    systemInstruction,
    contents,
    tools: geminiTools,
    toolConfig: {
      functionCallingConfig: {
        mode: "AUTO",
      },
    },
    generationConfig: {
      maxOutputTokens: options?.max_tokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    },
  });

  return convertResponse(geminiRes);
}
