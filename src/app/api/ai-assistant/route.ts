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
`;

async function callGemini(messages: { role: string; content: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const geminiMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude generar una respuesta.";
}

export async function POST(request: NextRequest) {
  try {
    const { messages, projectContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    const systemMessage = projectContext
      ? `${SYSTEM_PROMPT}\n\nContexto del proyecto actual del usuario:\n${projectContext}`
      : SYSTEM_PROMPT;

    const allMessages = [
      { role: "system", content: systemMessage },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const assistantMessage = await callGemini(allMessages);

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("AI Assistant error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
