import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai-suggestions
 * AI Suggestions endpoint for ArchiFlow.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!body.context || !type) {
      return NextResponse.json(
        { error: "Se requiere contexto y tipo de sugerencia" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      suggestions: [],
      type,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error en sugerencias:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}