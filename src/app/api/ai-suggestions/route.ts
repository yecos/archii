import { NextRequest, NextResponse } from "next/server";

const TYPE_PROMPTS: Record<string, string> = {
  task: `Eres experto en proyectos de arquitectura. Sugiere tareas. Devuelve SOLO JSON: {"suggestions":[{"title":"título","priority":"Alta|Media|Baja","reason":"justificación"}]}`,
  expense: `Eres experto en presupuestos de construcción. Sugiere gastos. Devuelve SOLO JSON: {"suggestions":[{"concept":"concepto","category":"Materiales|Mano de obra|Mobiliario|Acabados|Imprevistos","estimatedAmount":0,"reason":"justificación"}]}`,
  schedule: `Eres planificador de obras. Sugiere cronograma. Devuelve SOLO JSON: {"suggestions":[{"milestone":"hito","suggestedDate":"fecha ISO","dependencies":"deps"}]}`,
  project: `Eres consultor de arquitectura. Sugiere mejoras. Devuelve SOLO JSON: {"suggestions":[{"action":"acción","impact":"Alto|Medio|Bajo","description":"desc"}]}`,
  general: `Eres asistente de proyectos. Sugiere recomendaciones. Devuelve SOLO JSON: {"suggestions":[{"text":"recomendación","category":"categoría"}]}`,
};

export async function POST(request: NextRequest) {
  try {
    const { context, type, currentData } = await request.json();
    if (!context || !type) return NextResponse.json({ error: "Se requiere contexto y tipo" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Configura GEMINI_API_KEY en .env.local" }, { status: 500 });

    const prompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.general;
    const dataCtx = currentData ? `\n\nDatos actuales:\n${currentData}` : "";

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${prompt}\n\nContexto: ${context}${dataCtx}\n\nGenera 3-5 sugerencias. SOLO JSON.` }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "Error con la IA" }, { status: 502 });

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let suggestions;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      suggestions = m ? JSON.parse(m[0]) : { suggestions: [{ text: raw, category: "general" }] };
    } catch { suggestions = { suggestions: [{ text: raw, category: "general" }] }; }

    return NextResponse.json({ suggestions: suggestions.suggestions || [], type });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}