import { NextRequest, NextResponse } from "next/server";

interface SuggestionRequest {
  context: string;
  type: "task" | "expense" | "project" | "schedule" | "general";
  currentData?: string;
}

const TYPE_PROMPTS: Record<string, string> = {
  task: `Eres un experto en gestión de proyectos de arquitectura. Sugiere tareas relevantes basándote en el contexto proporcionado.
Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{"suggestions": [{"title": "título", "priority": "Alta|Media|Baja", "reason": "breve justificación"}]}`,

  expense: `Eres un experto en presupuestos de construcción y arquitectura. Sugiere gastos probables basándote en el contexto.
Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{"suggestions": [{"concept": "concepto", "category": "Materiales|Mano de obra|Mobiliario|Acabados|Imprevistos", "estimatedAmount": 0, "reason": "justificación breve"}]}`,

  project: `Eres un consultor de proyectos de arquitectura. Sugiere mejoras o acciones para el proyecto.
Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{"suggestions": [{"action": "acción sugerida", "impact": "Alto|Medio|Bajo", "description": "descripción breve"}]}`,

  schedule: `Eres un planificador de obras. Sugiere cronogramas o hitos basándote en el contexto.
Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{"suggestions": [{"milestone": "hito", "suggestedDate": "fecha sugerida en formato ISO", "dependencies": "dependencias"}]}`,

  general: `Eres un asistente de proyectos de arquitectura. Sugiere recomendaciones útiles.
Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{"suggestions": [{"text": "recomendación", "category": "categoría"}]}`,
};

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionRequest = await request.json();
    const { context, type, currentData } = body;

    if (!context || !type) {
      return NextResponse.json(
        { error: "Se requiere contexto y tipo de sugerencia" },
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

    const prompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.general;
    const dataContext = currentData
      ? `\n\nDatos actuales relevantes:\n${currentData}`
      : "";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `[Instrucciones]: ${prompt}\n\nContexto del proyecto: ${context}${dataContext}\n\nGenera entre 3 y 5 sugerencias prácticas y específicas. Responde SOLO con el JSON, sin texto adicional.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ArchiFlow AI] Gemini API error (suggestions):", response.status, errText);

      if (response.status === 400 || response.status === 403) {
        return NextResponse.json(
          {
            error: "La API key de Gemini es inválida o no tiene permisos.",
            setupRequired: true,
            help: "Verifica que GEMINI_API_KEY sea correcta en Vercel (Settings > Environment Variables).",
          },
          { status: 502 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Se excedió el límite de peticiones. Espera unos segundos e intenta de nuevo." },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "Error temporal comunicándose con la IA. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data?.candidates?.[0]) {
      console.error("[ArchiFlow AI] Respuesta de sugerencias bloqueada:", data?.promptFeedback?.blockReason);
      return NextResponse.json({
        suggestions: [{ text: "No pude generar sugerencias para esa consulta. Intenta de nuevo." }],
        type,
      });
    }

    const rawContent =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extraer JSON de la respuesta
    let suggestions;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = {
          suggestions: [{ text: rawContent, category: "general" }],
        };
      }
    } catch (parseErr) {
      console.error("[ArchiFlow AI] Error parseando JSON de sugerencias:", parseErr);
      suggestions = {
        suggestions: [{ text: rawContent || "No se pudieron procesar las sugerencias.", category: "general" }],
      };
    }

    return NextResponse.json({
      suggestions: suggestions.suggestions || [],
      type,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error en sugerencias:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
