import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/ai-assistant
 *
 * Asistente IA real para ArchiFlow.
 * Usa OpenAI-compatible API (OpenAI, Gemini, DeepSeek, Ollama, etc.)
 *
 * Variables de entorno requeridas en Vercel:
 *   OPENAI_API_KEY          — Tu API key (obligatoria)
 *   OPENAI_BASE_URL         — (opcional) URL base, por defecto https://api.openai.com/v1
 *   AI_MODEL                — (opcional) Modelo a usar, por defecto gpt-4o-mini
 *
 * Ejemplos de configuración:
 *   OpenAI:    OPENAI_API_KEY=sk-...     OPENAI_BASE_URL=https://api.openai.com/v1           AI_MODEL=gpt-4o-mini
 *   Gemini:    OPENAI_API_KEY=...         OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai  AI_MODEL=gemini-2.0-flash
 *   DeepSeek:  OPENAI_API_KEY=...         OPENAI_BASE_URL=https://api.deepseek.com/v1         AI_MODEL=deepseek-chat
 */

const SYSTEM_PROMPT = `Eres ArchiFlow AI, un asistente inteligente especializado en gestión de proyectos de construcción, arquitectura e interiorismo. Tu tono es profesional pero cercano, y siempre respondes en español.

Conocimientos principales:
- Planificación y cronogramas de obra
- Gestión de presupuestos y costos de construcción
- Fases de construcción (concepto, diseño, ejecución, entregas)
- Coordinación de equipos de trabajo
- Normativas y permisos de construcción en Colombia
- Materiales de construcción y especificaciones técnicas
- Supervisión de obra y control de calidad
- Salud y seguridad en el trabajo (SST)
- Gestión de inventarios y proveedores

Siempre que sea posible, estructura tus respuestas con:
- Puntos claros y numerados
- Ejemplos prácticos cuando sea relevante
- Recomendaciones accionables

Si el usuario te pregunta sobre su proyecto (por el contexto proporcionado), usa esa información para dar respuestas personalizadas.`;

export async function POST(request: NextRequest) {
  try {
    // Auth check — prevent unauthorized AI usage
    let user;
    try {
      user = await requireAuth(request);
    } catch (authError) {
      return authError as NextResponse;
    }

    // Rate limit: 15 requests per minute per user
    const rateLimit = checkRateLimit(request, { maxRequests: 15, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo en un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    const { messages, projectContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    // Si no hay API key configurada, dar instrucciones claras
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API key no configurada",
          message: `⚠️ IA no configurada todavía\n\nPara activar ArchiFlow AI necesitas agregar tu API key en Vercel:\n\n1. Ve a vercel.com → tu proyecto → Settings → Environment Variables\n2. Agrega:\n   • OPENAI_API_KEY = tu clave API\n3. Opcional:\n   • AI_MODEL = gpt-4o-mini (OpenAI)\n   • AI_MODEL = gemini-2.0-flash (Gemini)\n   • OPENAI_BASE_URL = URL del proveedor\n\nProveedores compatibles:\n• OpenAI (gpt-4o-mini) — desde $0.15/1M tokens\n• Google Gemini (gemini-2.0-flash) — gratis hasta 15 peticiones/min\n• DeepSeek (deepseek-chat) — muy económico`,
          setupRequired: true,
          help: "Configura OPENAI_API_KEY en las variables de entorno de Vercel."
        },
        { status: 200 }
      );
    }

    // Construir mensajes para la API
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Agregar contexto del proyecto si existe
    if (projectContext) {
      apiMessages.push({
        role: "system",
        content: `Contexto actual del proyecto del usuario:\n${projectContext}\n\nUsa esta información para personalizar tus respuestas cuando sea relevante.`
      });
    }

    // Agregar historial de conversación (limitar a los últimos 20 mensajes)
    const recentMessages = messages.slice(-20);
    for (const msg of recentMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Llamar a la API de OpenAI (o compatible)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[ArchiFlow AI] API error:", response.status, errorData);

      if (response.status === 401) {
        return NextResponse.json({
          error: "API key inválida",
          message: "⚠️ La API key no es válida. Verifica que OPENAI_API_KEY esté correcta en Vercel.",
        });
      }

      if (response.status === 429) {
        return NextResponse.json({
          error: "Límite de peticiones alcanzado",
          message: "⚠️ Se alcanzó el límite de peticiones de la API. Intenta de nuevo en unos segundos.",
        });
      }

      return NextResponse.json({
        error: "Error en la API",
        message: `⚠️ Error de la API de IA (${response.status}). Verifica la configuración.`,
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    return NextResponse.json({ message: aiMessage }, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error en asistente:", message);
    return NextResponse.json(
      { error: "Error de conexión", message: "⚠️ Error de conexión con la IA. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
