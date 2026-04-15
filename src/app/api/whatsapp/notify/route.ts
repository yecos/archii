import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/whatsapp/notify
 * Endpoint server-side para enviar notificaciones de WhatsApp.
 * Se llama desde el cliente (whatsapp-notifications.ts) via fetch.
 *
 * Body: { userId: string, message: string }
 *   - Busca en Firestore si el userId tiene un WhatsApp vinculado y envía el mensaje.
 *
 * Body: { broadcast: true, message: string }
 *   - Envía el mensaje a TODOS los usuarios con WhatsApp vinculado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message, broadcast } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    // Authentication required for ALL requests (broadcast AND single-user)
    // Previously single-user notify skipped auth — security fix: BUG-20260416-001
    await requireAuth(request);

    // Dinámicamente importar firebase-admin (solo server-side)
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();

    if (broadcast) {
      // Enviar a todos los vinculados
      const snap = await db
        .collection("whatsappLinks")
        .where("active", "==", true)
        .get();

      let sent = 0;
      for (const doc of snap.docs) {
        const link = doc.data();
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) sent++;
      }

      return NextResponse.json({ ok: true, sent, total: snap.size });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    // Buscar WhatsApp vinculado al userId
    const snap = await db
      .collection("whatsappLinks")
      .where("userId", "==", userId)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no_link" });
    }

    const link = snap.docs[0].data();
    const result = await sendWhatsAppMessage(link.whatsappPhone, message);

    return NextResponse.json({
      ok: true,
      sent: result.success ? 1 : 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[ArchiFlow Notify] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
