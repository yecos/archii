import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { requireAuth, AuthError } from "@/lib/api-auth";

/**
 * POST /api/whatsapp/notify
 * Endpoint server-side para enviar notificaciones de WhatsApp.
 * Requiere autenticacion para TODAS las rutas (broadcast y individual).
 *
 * Body: { userId: string, message: string }
 * Body: { broadcast: true, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticacion OBLIGATORIA para todas las rutas
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, message, broadcast } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();

    if (broadcast) {
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
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow Notify] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
