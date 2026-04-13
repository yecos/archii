import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai-assistant
 * ArchiFlow AI Intelligence endpoint.
 * Returns context-aware responses based on user query.
 * Falls back to generic helpful responses.
 */

const RESPONSES: Record<string, string> = {
  proyectos: "Para ver un análisis detallado de tus proyectos, usa los datos disponibles en tu panel. ArchiFlow AI analiza automáticamente el estado, presupuesto y progreso de cada proyecto.",
  tareas: "Revisa la sección de Tareas para ver las pendientes y vencidas. El Dashboard muestra un resumen con las tareas que requieren atención inmediata.",
  presupuesto: "El Dashboard Premium incluye un análisis financiero completo con ejecución presupuestal, gastos por categoría y balance facturado vs gastado.",
  equipo: "La sección de Productividad del Equipo en el Dashboard muestra el rendimiento de cada miembro con métricas de efectividad y tiempo invertido.",
  recomendaciones: "Usa el Dashboard Premium para obtener recomendaciones automáticas basadas en tus datos: tareas vencidas, presupuesto ejecutado y distribución del equipo.",
};

export async function POST(request: NextRequest) {
  try {
    const { messages, query } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje", isPlaceholder: true },
        { status: 400 }
      );
    }

    const lastQuery = query || messages[messages.length - 1]?.content || "";
    const lowerQuery = lastQuery.toLowerCase();

    // Find matching response
    let matchedResponse: string | null = null;
    for (const [key, response] of Object.entries(RESPONSES)) {
      if (lowerQuery.includes(key)) {
        matchedResponse = response;
        break;
      }
    }

    if (matchedResponse) {
      return NextResponse.json({ message: matchedResponse, isPlaceholder: false });
    }

    // Generic response — client-side AI handles the data analysis
    return NextResponse.json({
      message: "",
      isPlaceholder: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI] Error:", message);
    return NextResponse.json({ error: message, isPlaceholder: true }, { status: 500 });
  }
}
