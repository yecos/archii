import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { getLinksByUserId, getAllActiveLinks } from "@/lib/whatsapp-service";

/**
 * POST /api/whatsapp/send
 * Envía notificaciones de ArchiFlow a WhatsApp.
 *
 * Body:
 *   - type: 'user' | 'broadcast'
 *   - userId: string (obligatorio si type=user)
 *   - message: string (contenido del mensaje)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Se requiere un mensaje" },
        { status: 400 }
      );
    }

    const config = {
      token: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    };

    if (!config.token || !config.phoneId) {
      return NextResponse.json(
        { error: "WhatsApp no configurado. Agrega WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en Vercel." },
        { status: 500 }
      );
    }

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    if (type === "user" && userId) {
      // Enviar a un usuario específico
      const links = await getLinksByUserId(userId);

      if (links.length === 0) {
        return NextResponse.json({
          success: true,
          sent: 0,
          message: "El usuario no tiene WhatsApp vinculado",
        });
      }

      for (const link of links) {
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) {
          sentCount++;
        } else {
          errorCount++;
          errors.push(result.error || "Error desconocido");
        }
      }
    } else if (type === "broadcast") {
      // Enviar a todos los usuarios vinculados
      const links = await getAllActiveLinks();

      if (links.length === 0) {
        return NextResponse.json({
          success: true,
          sent: 0,
          message: "No hay usuarios con WhatsApp vinculado",
        });
      }

      for (const link of links) {
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) {
          sentCount++;
        } else {
          errorCount++;
          errors.push(`${link.userName}: ${result.error || "Error"}`);
        }
      }
    } else {
      return NextResponse.json(
        { error: "Se requiere type ('user' o 'broadcast') y userId (si type=user)" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: sentCount > 0,
      sent: sentCount,
      errors: errorCount,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error("[ArchiFlow WhatsApp] Error en send:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
