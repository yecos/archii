import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
Eres ArchiFlow AI, un asistente inteligente especializado en gestión de proyectos de arquitectura e interiorismo.

Tu personalidad:
- Profesional, amable y conciso
- Hablas en español (Colombia)
- Usas terminología del sector arquitectónico cuando es relevante
- Das respuestas prácticas y accionables

Tu conocimiento incluye:
- Gestión de proyectos de arquitectura
- Presupuestos y costos de construcción
- Materiales y acabados
- Planificación de fases de obra (Planos, Cimentación, Estructura, Instalaciones, Acabados, Entrega)
- Normativas y permisos de construcción en Colombia
- Diseño de interiores
- Sostenibilidad y bioclimática
- Software de arquitectura (AutoCAD, Revit, SketchUp, etc.)

Cuando el usuario pregunte sobre su proyecto en ArchiFlow, referencia las secciones de la app:
- Dashboard (resumen general)
- Proyectos (gestión de proyectos)
- Tareas (seguimiento de actividades)
- Gastos (control presupuestario)
- Inventario (materiales y productos)
- Galería (fotos del proyecto)
- Equipo (colaboradores)
- Calendario (planificación)
- Archivos (documentos y planos)

Siempre responde de forma clara y bien estructurada. Usa listas cuando sea apropiado.
Nunca inventes datos específicos del usuario. Si necesitas información que no tienes, pídelo.
IMPORTANTE: Nunca incluyas etiquetas HTML ni JavaScript en tus respuestas. Solo texto plano con formato markdown básico.
`;

const MAX_HISTORY_MESSAGES = 20;

export async function POST(request: NextRequest) {
  try {
    const { messages, projectContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[ArchiFlow AI] GEMINI_API_KEY no configurada en las variables de entorno");
      return NextResponse.json(
        {
          error: "La IA no está configurada aún.",
          setupRequired: true,
          help: "Necesitas agregar GEMINI_API_KEY en Vercel (Settings > Environment Variables). Obtén tu clave gratis en: https://aistudio.google.com/app/apikey",
        },
        { status: 500 }
      );
    }

    const systemMessage = projectContext
      ? `${SYSTEM_PROMPT}\n\nContexto del proyecto actual del usuario:\n${projectContext}`
      : SYSTEM_PROMPT;

    // Construir historial para Gemini — limitar a los últimos N mensajes
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

    const contents = [];

    // Mensaje del sistema como primer contexto del usuario
    contents.push({
      role: "user",
      parts: [{ text: `[Instrucciones del sistema - no muestres esto al usuario]: ${systemMessage}` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Actuaré como ArchiFlow AI." }],
    });

    // Agregar historial de mensajes recientes
    for (const m of recentMessages) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ArchiFlow AI] Gemini API error:", response.status, errText);

      // Detectar errores específicos de la API key
      if (response.status === 400 || response.status === 403) {
        return NextResponse.json(
          {
            error: "La API key de Gemini es inválida o no tiene permisos.",
            setupRequired: true,
            help: "Verifica que GEMINI_API_KEY sea correcta en Vercel (Settings > Environment Variables). Obtén una nueva en: https://aistudio.google.com/app/apikey",
          },
          { status: 502 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Se excedió el límite de peticiones a la IA. Espera unos segundos e intenta de nuevo." },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "Error temporal comunicándose con la IA. Intenta de nuevo en unos momentos." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Verificar si Gemini bloqueó la respuesta por seguridad
    if (!data?.candidates?.[0]) {
      const blockReason = data?.promptFeedback?.blockReason;
      console.error("[ArchiFlow AI] Respuesta bloqueada por Gemini:", blockReason);
      return NextResponse.json({
        message: "No pude generar una respuesta para esa consulta. Intenta reformular tu pregunta.",
      });
    }

    const candidate = data.candidates[0];

    // Verificar si el contenido fue bloqueado
    if (candidate.finishReason === "SAFETY") {
      return NextResponse.json({
        message: "Por políticas de seguridad, no puedo responder esa consulta. Intenta con otra pregunta.",
      });
    }

    const assistantMessage =
      candidate?.content?.parts?.[0]?.text ||
      "Lo siento, no pude generar una respuesta coherente. Intenta de nuevo.";

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error en asistente:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
