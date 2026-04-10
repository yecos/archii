import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

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

    const prompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.general;
    const dataContext = currentData
      ? `\n\nDatos actuales relevantes:\n${currentData}`
      : "";

    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Contexto del proyecto: ${context}${dataContext}\n\nGenera entre 3 y 5 sugerencias prácticas y específicas.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1024,
    });

    const rawContent =
      completion.choices?.[0]?.message?.content || "";

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
    } catch {
      suggestions = {
        suggestions: [{ text: rawContent, category: "general" }],
      };
    }

    return NextResponse.json({
      suggestions: suggestions.suggestions || [],
      type,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("AI Suggestions error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
