import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * POST /api/whatsapp/send
 * Envia notificaciones de ArchiFlow a WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Se requiere un mensaje" }, { status: 400 });
    }

    const db = getAdminDb();
    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    if (type === "user" && userId) {
      const snap = await db
        .collection("whatsappLinks")
        .where("userId", "==", userId)
        .where("active", "==", true)
        .limit(1)
        .get();

      if (snap.empty) {
        return NextResponse.json({ success: true, sent: 0, message: "El usuario no tiene WhatsApp vinculado" });
      }

      for (const doc of snap.docs) {
        const link = doc.data();
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) sentCount++;
        else { errorCount++; errors.push(result.error || "Error"); }
      }
    } else if (type === "broadcast") {
      const snap = await db
        .collection("whatsappLinks")
        .where("active", "==", true)
        .get();

      if (snap.empty) {
        return NextResponse.json({ success: true, sent: 0, message: "No hay usuarios con WhatsApp vinculado" });
      }

      for (const doc of snap.docs) {
        const link = doc.data();
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) sentCount++;
        else { errorCount++; errors.push(`${link.userName}: ${result.error || "Error"}`); }
      }
    } else {
      return NextResponse.json({ error: "Se requiere type ('user' o 'broadcast') y userId (si type=user)" }, { status: 400 });
    }

    return NextResponse.json({ success: sentCount > 0, sent: sentCount, errors: errorCount, errorDetails: errors });
  } catch (error: any) {
    console.error("[ArchiFlow WhatsApp] Error en send:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
