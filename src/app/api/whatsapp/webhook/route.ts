import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  parseWebhookPayload,
  sendWhatsAppMessage,
  getLinkedUser,
  createWhatsAppLink,
} from "@/lib/whatsapp-service";
import {
  getWelcomeMessage,
  getEmailConfirmation,
  generateLinkCode,
  verifyLinkCode,
  getLinkedSuccess,
  processCommand,
  getMainMenu,
} from "@/lib/whatsapp-commands";
import { getFirebase } from "@/lib/firebase-service";

// ─── GET: Verificación del webhook (Meta envía esto al configurar) ───
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

  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

// ─── POST: Mensajes entrantes de WhatsApp ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parsear el mensaje de Meta
    const message = parseWebhookPayload(body);

    if (!message) {
      // Es un status de entrega o algo que no procesamos
      return NextResponse.json({ ok: true });
    }

    console.log("[ArchiFlow WhatsApp] Mensaje recibido:", {
      from: message.from,
      name: message.name,
      body: message.body?.substring(0, 50),
      type: message.type,
    });

    // Verificar configuración de WhatsApp
    const config = {
      token: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    };

    if (!config.token || !config.phoneId || !config.verifyToken) {
      console.error("[ArchiFlow WhatsApp] No configurado");
      return NextResponse.json({ ok: true });
    }

    // ─── Buscar si el usuario está vinculado ───
    const link = await getLinkedUser(message.from);

    if (!link) {
      // ─── FLUJO DE VINCULACIÓN ───
      await handleLinkingFlow(message);
    } else {
      // ─── USUARIO VINCULADO: procesar comando ───
      await handleLinkedUser(message, link);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[ArchiFlow WhatsApp] Error en webhook:", error.message);
    return NextResponse.json({ ok: true }); // Siempre 200 para Meta
  }
}

// ─── Manejo del flujo de vinculación ───
async function handleLinkingFlow(message: any) {
  const msg = message.body.toLowerCase().trim();

  // Primer contacto o botón de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    const response = getWelcomeMessage();
    if (response.buttons) {
      const { sendWhatsAppButtons } = await import("@/lib/whatsapp-service");
      await sendWhatsAppButtons(message.from, response.text, response.buttons);
    } else {
      await sendWhatsAppMessage(message.from, response.text);
    }
    return;
  }

  // Parece un email (contiene @)
  if (msg.includes("@")) {
    const email = msg.replace(/[^a-zA-Z0-9@._-]/g, "").toLowerCase();

    // Verificar que el email existe en Firebase Auth o Firestore
    const db = getFirebase().firestore();
    const userSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnap.empty) {
      await sendWhatsAppMessage(
        message.from,
        `❌ No encontramos una cuenta con el email *${email}*\n\nVerifica que esté registrado en ArchiFlow o intenta con otro email.`
      );
      return;
    }

    const userData = userSnap.docs[0].data();

    // Generar código
    const code = generateLinkCode(email);

    // Enviar el código por WhatsApp (en producción, también se enviaría por email)
    await sendWhatsAppMessage(
      message.from,
      `🔐 *Tu código de verificación:*\n\n*${code}*\n\nEste código expira en 5 minutos.\n\nResponde con el código para completar la vinculación.`
    );

    // Guardar estado temporal en Firestore para persistencia
    await db.collection("whatsappPending").doc(message.from).set({
      email,
      userId: userSnap.docs[0].id,
      userName: userData.name || userData.displayName || email.split("@")[0],
      createdAt: getFirebase().firestore.FieldValue.serverTimestamp(),
      step: "waiting_code",
    });

    return;
  }

  // Parece un código de 6 dígitos
  if (/^\d{6}$/.test(msg)) {
    const db = getFirebase().firestore();
    const pendingSnap = await db.collection("whatsappPending").doc(message.from).get();

    if (!pendingSnap.exists) {
      await sendWhatsAppMessage(
        message.from,
        "❌ No hay una vinculación en curso. Escribe tu email para comenzar."
      );
      return;
    }

    const pending = pendingSnap.data();

    if (pending.step !== "waiting_code") {
      await sendWhatsAppMessage(message.from, "Escribe tu email para comenzar la vinculación.");
      return;
    }

    // Verificar código
    if (verifyLinkCode(pending.email, msg)) {
      // Vincular
      const result = await createWhatsAppLink({
        whatsappPhone: message.from,
        userId: pending.userId,
        userEmail: pending.email,
        userName: pending.userName,
        active: true,
      });

      if (result.success) {
        // Limpiar pendiente
        await db.collection("whatsappPending").doc(message.from).delete();

        const response = getLinkedSuccess(pending.userName);
        if (response.buttons) {
          const { sendWhatsAppButtons } = await import("@/lib/whatsapp-service");
          await sendWhatsAppButtons(message.from, response.text, response.buttons);
        } else {
          await sendWhatsAppMessage(message.from, response.text);
        }
      } else {
        await sendWhatsAppMessage(message.from, "❌ Error al vincular. Intenta de nuevo.");
      }
    } else {
      await sendWhatsAppMessage(
        message.from,
        "❌ Código incorrecto o expirado. Escribe tu email de nuevo para recibir un nuevo código."
      );
      // Limpiar pendiente
      await db.collection("whatsappPending").doc(message.from).delete();
    }

    return;
  }

  // Mensaje no reconocido sin vinculación
  const response = getWelcomeMessage();
  if (response.buttons) {
    const { sendWhatsAppButtons } = await import("@/lib/whatsapp-service");
    await sendWhatsAppButtons(message.from, response.text, response.buttons);
  } else {
    await sendWhatsAppMessage(message.from, response.text);
  }
}

// ─── Manejo de usuario ya vinculado ───
async function handleLinkedUser(message: any, link: any) {
  const result = await processCommand(message.body, link);

  if (result.buttons) {
    const { sendWhatsAppButtons } = await import("@/lib/whatsapp-service");
    await sendWhatsAppButtons(message.from, result.text, result.buttons);
  } else {
    await sendWhatsAppMessage(message.from, result.text);
  }
}
