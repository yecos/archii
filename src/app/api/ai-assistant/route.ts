import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

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

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
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

    const zai = await getZAI();

    const systemMessage = projectContext
      ? `${SYSTEM_PROMPT}\n\nContexto del proyecto actual del usuario:\n${projectContext}`
      : SYSTEM_PROMPT;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const assistantMessage =
      completion.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({
      message: assistantMessage,
      usage: completion.usage || null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("AI Assistant error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
