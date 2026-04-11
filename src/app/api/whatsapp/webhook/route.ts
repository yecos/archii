import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  parseWebhookPayload,
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  createWhatsAppLink,
} from "@/lib/whatsapp-service";
import {
  getWelcomeMessage,
  generateLinkCode,
  verifyLinkCode,
  getLinkedSuccess,
  processCommand,
} from "@/lib/whatsapp-commands";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
      console.error("[ArchiFlow WhatsApp] No configurado - faltan variables de entorno");
      return NextResponse.json({ ok: true });
    }

    // Buscar si el usuario está vinculado
    const db = getAdminDb();
    const linkSnap = await db
      .collection("whatsappLinks")
      .where("whatsappPhone", "==", message.from)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (linkSnap.empty) {
      // FLUJO DE VINCULACIÓN
      await handleLinkingFlow(message, db);
    } else {
      // USUARIO VINCULADO: procesar comando
      const linkData = { id: linkSnap.docs[0].id, ...linkSnap.docs[0].data() };
      await handleLinkedUser(message, linkData, db);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[ArchiFlow WhatsApp] Error en webhook POST:", error.message, error.stack);
    return NextResponse.json({ ok: true }); // Siempre 200 para Meta
  }
}

// ─── Manejo del flujo de vinculación ───
async function handleLinkingFlow(message: any, db: any) {
  const msg = message.body.toLowerCase().trim();

  // Primer contacto o botón de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    const response = getWelcomeMessage();
    if (response.buttons) {
      await sendWhatsAppButtons(message.from, response.text, response.buttons);
    } else {
      await sendWhatsAppMessage(message.from, response.text);
    }
    return;
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
      await sendWhatsAppMessage(
        message.from,
        `No encontramos una cuenta con el email ${email}\n\nVerifica que este registrado en ArchiFlow o intenta con otro email.`
      );
      return;
    }

    const userData = userSnap.docs[0].data();

    // Generar código
    const code = generateLinkCode(email);

    // Enviar código por WhatsApp
    await sendWhatsAppMessage(
      message.from,
      `Tu codigo de verificacion:\n\n*${code}*\n\nEste codigo expira en 5 minutos.\n\nResponde con el codigo para completar la vinculacion.`
    );

    // Guardar estado temporal en Firestore
    await db.collection("whatsappPending").doc(message.from).set({
      email,
      userId: userSnap.docs[0].id,
      userName: userData.name || userData.displayName || email.split("@")[0],
      createdAt: FieldValue.serverTimestamp(),
      step: "waiting_code",
    });

    return;
  }

  // Parece un código de 6 dígitos
  if (/^\d{6}$/.test(msg)) {
    const pendingSnap = await db.collection("whatsappPending").doc(message.from).get();

    if (!pendingSnap.exists) {
      await sendWhatsAppMessage(
        message.from,
        "No hay una vinculacion en curso. Escribe tu email para comenzar."
      );
      return;
    }

    const pending = pendingSnap.data();

    if (pending.step !== "waiting_code") {
      await sendWhatsAppMessage(message.from, "Escribe tu email para comenzar la vinculacion.");
      return;
    }

    // Verificar código
    if (verifyLinkCode(pending.email, msg)) {
      const result = await createWhatsAppLink({
        whatsappPhone: message.from,
        userId: pending.userId,
        userEmail: pending.email,
        userName: pending.userName,
        active: true,
      });

      if (result.success) {
        await db.collection("whatsappPending").doc(message.from).delete();

        const response = getLinkedSuccess(pending.userName);
        if (response.buttons) {
          await sendWhatsAppButtons(message.from, response.text, response.buttons);
        } else {
          await sendWhatsAppMessage(message.from, response.text);
        }
      } else {
        await sendWhatsAppMessage(message.from, "Error al vincular. Intenta de nuevo.");
      }
    } else {
      await sendWhatsAppMessage(
        message.from,
        "Codigo incorrecto o expirado. Escribe tu email de nuevo para recibir un nuevo codigo."
      );
      await db.collection("whatsappPending").doc(message.from).delete();
    }

    return;
  }

  // Mensaje no reconocido sin vinculación
  const response = getWelcomeMessage();
  if (response.buttons) {
    await sendWhatsAppButtons(message.from, response.text, response.buttons);
  } else {
    await sendWhatsAppMessage(message.from, response.text);
  }
}

// ─── Manejo de usuario ya vinculado ───
async function handleLinkedUser(message: any, link: any, db: any) {
  const result = await processCommand(message.body, link, db);

  if (result.buttons) {
    await sendWhatsAppButtons(message.from, result.text, result.buttons);
  } else {
    await sendWhatsAppMessage(message.from, result.text);
  }
}
