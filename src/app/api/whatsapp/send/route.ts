import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/api-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getTenantIdForUser } from "@/lib/tenant-server";

/**
 * POST /api/whatsapp/send
 * Envia notificaciones de ArchiFlow a WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only: broadcast and direct send require admin privileges
    const authResponse = await requireAdmin(request);

    // Multi-tenant: get tenantId for data isolation
    const tenantId = await getTenantIdForUser(authResponse.uid);

    // Rate limit: 5 sends per minute
    const rateLimit = checkRateLimit(request, { maxRequests: 5, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Demasiados envíos. Intenta de nuevo en un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

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
        // Multi-tenant: only send to users in the same tenant
        if (tenantId) {
          const linkTenantId = await getTenantIdForUser(link.userId);
          if (linkTenantId !== tenantId) continue;
        }
        const result = await sendWhatsAppMessage(link.whatsappPhone, message);
        if (result.success) sentCount++;
        else { errorCount++; errors.push(`${link.userName}: ${result.error || "Error"}`); }
      }
    } else {
      return NextResponse.json({ error: "Se requiere type ('user' o 'broadcast') y userId (si type=user)" }, { status: 400 });
    }

    return NextResponse.json({ success: sentCount > 0, sent: sentCount, errors: errorCount, errorDetails: errors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[ArchiFlow WhatsApp] Error en send:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
