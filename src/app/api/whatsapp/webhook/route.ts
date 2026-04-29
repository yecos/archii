import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import {
  verifyWebhook,
  parseWebhookPayload,
  sendWhatsAppMessage,
  sendWhatsAppButtons,
} from "@/lib/whatsapp-service";
import {
  getWelcomeMessage,
  getLinkedSuccess,
  processCommand,
} from "@/lib/whatsapp-commands";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ─── GET: Verificacion del webhook (Meta envia esto al configurar) ───
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode") || "";
  const token = request.nextUrl.searchParams.get("hub.verify_token") || "";
  const challenge = request.nextUrl.searchParams.get("hub.challenge") || "";

  const result = verifyWebhook(mode, token, challenge);

  if (result.verified) {
    return new NextResponse(result.body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.error("[Archii WhatsApp] Verificacion fallida:", { mode, tokenValid: mode === 'subscribe' });
  return NextResponse.json({ error: "Verificacion fallida" }, { status: 403 });
}

// ─── POST: Mensajes entrantes de WhatsApp ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parsear el mensaje de Meta
    const message = parseWebhookPayload(body);

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    // Verificar configuracion de WhatsApp
    const config = {
      token: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    };

    if (!config.token || !config.phoneId || !config.verifyToken) {
      console.error("[Archii WhatsApp] No configurado - faltan variables de entorno:", {
        hasToken: !!config.token,
        hasPhoneId: !!config.phoneId,
        hasVerifyToken: !!config.verifyToken,
      });
      return NextResponse.json({ ok: true });
    }

    // Enviar respuesta de manera segura con fallback
    await safeReply(message);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Archii WhatsApp] Error en webhook POST:", error.message, error.stack);
    return NextResponse.json({ ok: true }); // Siempre 200 para Meta
  }
}

// ─── Safe reply con fallback a texto plano ───
async function safeReply(message: any) {
  try {
    const db = getAdminDb();

    // Buscar si el usuario esta vinculado
    let reply: { text: string; buttons?: { id: string; title: string }[] };

    const linkSnap = await db
      .collection("whatsappLinks")
      .where("whatsappPhone", "==", message.from)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (linkSnap.empty) {
      reply = await handleLinkingFlow(message, db);
    } else {
      const linkData = { id: linkSnap.docs[0].id, ...linkSnap.docs[0].data() };
      reply = await processCommand(message.body, linkData, db);
    }

    // Intentar enviar botones primero, si hay
    if (reply.buttons && reply.buttons.length > 0) {
      const btnResult = await sendWhatsAppButtons(message.from, reply.text, reply.buttons);
      if (btnResult.success) {
        return;
      }
      // Si botones fallan, hacer fallback a texto plano
      console.warn("[Archii WhatsApp] Botones fallaron, haciendo fallback a texto. Error:", btnResult.error);
    }

    // Enviar como texto plano
    const textResult = await sendWhatsAppMessage(message.from, reply.text);
    if (textResult.success) {
      // success
    } else {
      console.error("[Archii WhatsApp] FALLO envio de texto a:", message.from, "Error:", textResult.error);
    }
  } catch (error: any) {
    console.error("[Archii WhatsApp] Error en safeReply:", error.message, error.stack);
  }
}

// ─── Manejo del flujo de vinculacion con OTP ───
async function handleLinkingFlow(message: any, db: any): Promise<{ text: string; buttons?: { id: string; title: string }[] }> {
  const msg = message.body.toLowerCase().trim();
  const phone = message.from;

  // Primer contacto o boton de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    return getWelcomeMessage();
  }

  // Check if there's a pending OTP for this phone number
  const pendingOtpSnap = await db
    .collection("whatsappOtp")
    .where("whatsappPhone", "==", phone)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  // If user sent a 6-digit code, verify it
  if (/^\d{6}$/.test(msg) && !pendingOtpSnap.empty) {
    const otpDoc = pendingOtpSnap.docs[0];
    const otpData = otpDoc.data();
    const now = Date.now();
    const otpAge = now - (otpData.createdAt?._seconds ? otpData.createdAt._seconds * 1000 : 0);

    // OTP expires after 10 minutes
    if (otpAge > 10 * 60 * 1000) {
      await otpDoc.ref.update({ status: "expired" });
      return { text: "El codigo ha expirado. Envía tu email de Archii para recibir un nuevo codigo." };
    }

    if (msg === otpData.code) {
      // OTP correct — proceed with linking
      await otpDoc.ref.update({ status: "verified" });

      const userId = otpData.userId;
      const email = otpData.userEmail;
      const userName = otpData.userName || email.split("@")[0];
      const userTenantId = otpData.tenantId;

      // Check if already linked to another phone
      const existingLink = await db
        .collection("whatsappLinks")
        .where("userId", "==", userId)
        .where("active", "==", true)
        .limit(1)
        .get();

      if (!existingLink.empty) {
        const existingPhone = existingLink.docs[0].data().whatsappPhone;
        if (existingPhone === phone) {
          return { text: "Este numero ya esta vinculado a tu cuenta. Escribe *menu* para ver las opciones." };
        }
        return { text: `El email ${email} ya esta vinculado a otro numero de WhatsApp.` };
      }

      // Create the link
      try {
        await db.collection('whatsappLinks').add({
          whatsappPhone: phone,
          userId: userId,
          userEmail: email,
          userName: userName,
          tenantId: userTenantId,
          active: true,
          linkedAt: FieldValue.serverTimestamp(),
        });
        return getLinkedSuccess(userName);
      } catch (err: any) {
        console.error("[Archii WhatsApp] Error vinculando:", err.message);
        return { text: "Error al vincular la cuenta. Intenta de nuevo." };
      }
    } else {
      return {
        text: "Codigo incorrecto. Intenta de nuevo o envia tu email para generar un nuevo codigo."
      };
    }
  }

  // Parece un email (contiene @) → iniciar flujo OTP
  if (msg.includes("@")) {
    const email = msg.replace(/[^a-zA-Z0-9@._+\-]/g, "").toLowerCase();

    // Verificar que el email existe en Firestore
    const userSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnap.empty) {
      return {
        text: `No encontramos una cuenta con el email ${email}\n\nVerifica que este registrado en Archii o intenta con otro email.`
      };
    }

    const userData = userSnap.docs[0].data();
    const userName = userData.name || userData.displayName || email.split("@")[0];

    // SECURITY: Verify the user belongs to at least one tenant before linking
    let userTenantId = userData.defaultTenantId || '';

    if (!userTenantId) {
      const tenantMemberSnap = await db
        .collection("tenants")
        .where("members", "array-contains", userSnap.docs[0].id)
        .limit(1)
        .get();
      if (tenantMemberSnap.empty) {
        return {
          text: `La cuenta ${email} no esta activa en ningun equipo de Archii.\n\nPide al administrador de tu equipo que te agregue como miembro.`
        };
      }
      userTenantId = tenantMemberSnap.docs[0].id;
    }

    // Check if this phone is already linked
    const existingPhoneLink = await db
      .collection("whatsappLinks")
      .where("whatsappPhone", "==", phone)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!existingPhoneLink.empty) {
      return { text: "Este numero de WhatsApp ya esta vinculado a una cuenta." };
    }

    // Generate 6-digit OTP code (cryptographically secure)
    const otpCode = String(randomInt(100000, 1000000));

    // Expire any previous pending OTPs for this phone
    if (!pendingOtpSnap.empty) {
      for (const doc of pendingOtpSnap.docs) {
        await doc.ref.update({ status: "expired" });
      }
    }

    // Store the OTP
    await db.collection("whatsappOtp").add({
      whatsappPhone: phone,
      userId: userSnap.docs[0].id,
      userEmail: email,
      userName: userName,
      tenantId: userTenantId,
      code: otpCode,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    // NOTE: In production, this code should be sent via email (Resend API).
    // For now, we send it via WhatsApp as a transitional measure.
    return {
      text: `🔐 *Verificacion de seguridad*\n\nTu codigo de vinculacion es: *${otpCode}*\n\nEste codigo expira en 10 minutos.\nResponde con el codigo de 6 digitos para completar la vinculacion.`
    };
  }

  // Mensaje no reconocido sin vinculacion
  return getWelcomeMessage();
}
