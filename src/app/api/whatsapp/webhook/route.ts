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

  console.log("[ArchiFlow WhatsApp] GET recibido:", { mode, token: token ? '***' : 'MISSING', challenge: challenge ? 'present' : 'MISSING' });

  const result = verifyWebhook(mode, token, challenge);

  if (result.verified) {
    console.log("[ArchiFlow WhatsApp] Webhook verificado OK");
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

    console.log("[ArchiFlow WhatsApp] POST recibido - Raw body keys:", Object.keys(body || {}));

    // Parsear el mensaje de Meta
    const message = parseWebhookPayload(body);

    if (!message) {
      console.log("[ArchiFlow WhatsApp] No se extrajo mensaje (puede ser status update). Body sample:", JSON.stringify(body).substring(0, 300));
      return NextResponse.json({ ok: true });
    }

    console.log("[ArchiFlow WhatsApp] Mensaje recibido:", {
      from: message.from,
      name: message.name,
      body: message.body?.substring(0, 50),
      type: message.type,
      buttonId: message.buttonId,
    });

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
        console.log("[ArchiFlow WhatsApp] Botones enviados OK a:", message.from);
        return;
      }
      // Si botones fallan, hacer fallback a texto plano
      console.warn("[ArchiFlow WhatsApp] Botones fallaron, haciendo fallback a texto. Error:", btnResult.error);
    }

    // Enviar como texto plano
    const textResult = await sendWhatsAppMessage(message.from, reply.text);
    if (textResult.success) {
      console.log("[ArchiFlow WhatsApp] Texto enviado OK a:", message.from);
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

  console.log("[ArchiFlow WhatsApp] handleLinkingFlow msg:", msg, "from:", message.from);

  // Primer contacto o boton de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    return getWelcomeMessage();
  }

  // Parece un email (contiene @)
  if (msg.includes("@")) {
    const email = msg.replace(/[^a-zA-Z0-9@._-]/g, "").toLowerCase();

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

    // Generar codigo y guardarlo en Firestore (no en memoria — serverless no persiste)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar estado temporal en Firestore INCLUYENDO el codigo
    await db.collection("whatsappPending").doc(message.from).set({
      email,
      userId: userSnap.docs[0].id,
      userName: userData.name || userData.displayName || email.split("@")[0],
      createdAt: FieldValue.serverTimestamp(),
      step: "waiting_code",
      code: code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
    });

    // Enviar codigo por WhatsApp
    const sendResult = await sendWhatsAppMessage(
      message.from,
      `Tu codigo de verificacion:\n\n*${code}*\n\nEste codigo expira en 5 minutos.\n\nResponde con el codigo para completar la vinculacion.`
    );

    if (!sendResult.success) {
      console.error("[ArchiFlow WhatsApp] Error enviando codigo:", sendResult.error);
      return { text: 'Error al enviar el codigo. Intenta de nuevo en unos minutos.' };
    }

    return {
      text: `Email encontrado: ${email}\n\nRevisa tu WhatsApp, te enviamos un codigo de verificacion.`
    };
  }

  // Parece un codigo de 6 digitos
  if (/^\d{6}$/.test(msg)) {
    const pendingSnap = await db.collection("whatsappPending").doc(message.from).get();

    if (!pendingSnap.exists) {
      return { text: "No hay una vinculacion en curso. Escribe tu email para comenzar." };
    }

    const pending = pendingSnap.data();

    if (pending.step !== "waiting_code") {
      return { text: "Escribe tu email para comenzar la vinculacion." };
    }

    // Verificar codigo desde Firestore (no de memoria — serverless)
    const codeMatch = pending.code === msg;
    const notExpired = pending.expiresAt && Date.now() < pending.expiresAt;

    if (codeMatch && notExpired) {
      // Crear vinculo directamente en Firestore
      await db.collection('whatsappLinks').add({
        whatsappPhone: message.from,
        userId: pending.userId,
        userEmail: pending.email,
        userName: pending.userName,
        active: true,
        linkedAt: FieldValue.serverTimestamp(),
      });

      await db.collection("whatsappPending").doc(message.from).delete();
      return getLinkedSuccess(pending.userName);
    } else {
      await db.collection("whatsappPending").doc(message.from).delete();
      const reason = !notExpired ? 'Codigo expirado.' : 'Codigo incorrecto.';
      return {
        text: `${reason} Escribe tu email de nuevo para recibir un nuevo codigo.`
      };
    }
  }

  // Mensaje no reconocido sin vinculacion
  return getWelcomeMessage();
}
