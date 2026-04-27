import { NextRequest, NextResponse } from "next/server";
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

  console.error("[ArchiFlow WhatsApp] Verificacion fallida:", { mode, tokenValid: mode === 'subscribe' });
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
      console.error("[ArchiFlow WhatsApp] No configurado - faltan variables de entorno:", {
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
    console.error("[ArchiFlow WhatsApp] Error en webhook POST:", error.message, error.stack);
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
      console.warn("[ArchiFlow WhatsApp] Botones fallaron, haciendo fallback a texto. Error:", btnResult.error);
    }

    // Enviar como texto plano
    const textResult = await sendWhatsAppMessage(message.from, reply.text);
    if (textResult.success) {
      // success
    } else {
      console.error("[ArchiFlow WhatsApp] FALLO envio de texto a:", message.from, "Error:", textResult.error);
    }
  } catch (error: any) {
    console.error("[ArchiFlow WhatsApp] Error en safeReply:", error.message, error.stack);
  }
}

// ─── Manejo del flujo de vinculacion ───
async function handleLinkingFlow(message: any, db: any): Promise<{ text: string; buttons?: { id: string; title: string }[] }> {
  const msg = message.body.toLowerCase().trim();



  // Primer contacto o boton de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    return getWelcomeMessage();
  }

  // Parece un email (contiene @) → vincular directamente
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
        text: `No encontramos una cuenta con el email ${email}\n\nVerifica que este registrado en ArchiFlow o intenta con otro email.`
      };
    }

    const userData = userSnap.docs[0].data();
    const userName = userData.name || userData.displayName || email.split("@")[0];

    // SECURITY: Verify the user belongs to at least one tenant before linking
    // This prevents account takeover by linking WhatsApp to orphan accounts
    let userTenantId = userData.defaultTenantId || '';

    // If no defaultTenantId, check tenants where this user is a member
    if (!userTenantId) {
      const tenantMemberSnap = await db
        .collection("tenants")
        .where("members", "array-contains", userSnap.docs[0].id)
        .limit(1)
        .get();
      if (tenantMemberSnap.empty) {
        return {
          text: `La cuenta ${email} no esta activa en ningun equipo de ArchiFlow.\n\nPide al administrador de tu equipo que te agregue como miembro.`
        };
      }
      userTenantId = tenantMemberSnap.docs[0].id;
    }

    // Verificar si ya esta vinculado a OTRO numero
    const existingLink = await db
      .collection("whatsappLinks")
      .where("userId", "==", userSnap.docs[0].id)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!existingLink.empty) {
      const existingPhone = existingLink.docs[0].data().whatsappPhone;
      if (existingPhone === message.from) {
        return {
          text: `Este numero ya esta vinculado a tu cuenta. Escribe *menu* para ver las opciones.`
        };
      }
      return {
        text: `El email ${email} ya esta vinculado a otro numero de WhatsApp.`
      };
    }

    // Verificar si este numero ya esta vinculado a otra cuenta
    const existingPhoneLink = await db
      .collection("whatsappLinks")
      .where("whatsappPhone", "==", message.from)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!existingPhoneLink.empty) {
      return {
        text: `Este numero de WhatsApp ya esta vinculado a una cuenta.`
      };
    }

    // Vincular directamente
    try {
      await db.collection('whatsappLinks').add({
        whatsappPhone: message.from,
        userId: userSnap.docs[0].id,
        userEmail: email,
        userName: userName,
        tenantId: userTenantId,
        active: true,
        linkedAt: FieldValue.serverTimestamp(),
      });


      return getLinkedSuccess(userName);
    } catch (err: any) {
      console.error("[ArchiFlow WhatsApp] Error vinculando:", err.message);
      return { text: "Error al vincular la cuenta. Intenta de nuevo." };
    }
  }

  // Mensaje no reconocido sin vinculacion
  return getWelcomeMessage();
}
