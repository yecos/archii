import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai-assistant
 * AI Assistant endpoint for ArchiFlow.
 * This is a placeholder that returns the user's last message back
 * with a helpful note. The actual AI integration runs client-side
 * via the floating AI assistant component.
 */

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // Placeholder response — the actual AI runs client-side
    return NextResponse.json({
      message: `Gracias por tu mensaje. El asistente IA se encuentra disponible desde el panel flotante de la aplicación. Tu consulta: "${lastMessage.slice(0, 80)}${lastMessage.length > 80 ? '...' : ''}"`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error en asistente:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
