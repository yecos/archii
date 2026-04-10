import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
Eres ArchiFlow AI, un asistente inteligente especializado en gestión de proyectos de arquitectura e interiorismo.
- Profesional, amable y conciso
- Hablas en español (Colombia)
- Das respuestas prácticas y accionables
- Experto en presupuestos, materiales, fases de obra, normativas de Colombia
`;

export async function POST(request: NextRequest) {
  try {
    const { messages, projectContext } = await request.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un mensaje" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Configura GEMINI_API_KEY en .env.local" }, { status: 500 });
    }

    const systemMessage = projectContext ? `${SYSTEM_PROMPT}\n\nContexto del proyecto:\n${projectContext}` : SYSTEM_PROMPT;

    const contents = [
      { role: "user", parts: [{ text: `[Sistema]: ${systemMessage}` }] },
      { role: "model", parts: [{ text: "Entendido." }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "Error con la IA" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      message: data?.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar respuesta.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno";
    console.error("AI error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}