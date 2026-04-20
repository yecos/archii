import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/ai-assistant
 *
 * Asistente IA real para ArchiFlow.
 * Usa z-ai-web-dev-sdk (GLM) — Sin API keys externas necesarias.
 *
 * Powered by GLM (z-ai-web-dev-sdk)
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
    // Autenticacion obligatoria
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const { messages, projectContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    // Initialize z-ai-web-dev-sdk (GLM)
    const zai = await ZAI.create();

    // Construir mensajes para la API
    const apiMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
    ];

    // Agregar contexto del proyecto si existe
    if (projectContext) {
      apiMessages.push({
        role: "system" as const,
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

    // Llamar a la API de GLM via z-ai-web-dev-sdk
    const data = await zai.chat.completions.create({
      messages: apiMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiMessage = data.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    return NextResponse.json({ message: aiMessage });
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
