import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";

/**
 * POST /api/ai-suggestions
 * AI Suggestions endpoint for ArchiFlow.
 * Placeholder — returns empty suggestions.
 * The actual AI integration runs client-side via the floating AI assistant.
 */

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type } = body;

    if (!body.context || !type) {
      return NextResponse.json(
        { error: "Se requiere contexto y tipo de sugerencia" },
        { status: 400 }
      );
    }

    // Placeholder — return empty suggestions
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
