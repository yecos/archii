import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  parseWebhookPayload,
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  markAsRead,
  sendTypingIndicator,
} from "@/lib/whatsapp-service";
import {
  getWelcomeMessage,
  getLinkedSuccess,
  processCommand,
} from "@/lib/whatsapp-commands";
import { aiReply } from "@/lib/whatsapp-ai";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getTenantIdForUser } from "@/lib/tenant-server";
import type { WhatsAppLinkedUser } from "@/lib/types";
import type { WhatsAppMessage } from "@/lib/whatsapp-service";
import type { Firestore } from "firebase-admin/firestore";

// Bot mention keywords (triggers bot response in groups)
const BOT_MENTIONS = ['archiflow', 'archi', 'bot', 'ayuda', '@archiflow'];

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

    // Log group messages for debugging
    if (message.isGroup) {
      console.log(`[WhatsApp Group] "${message.name}" in "${message.groupName}": ${message.body.substring(0, 80)}`);
    }

    // ── Group message handling ──
    if (message.isGroup) {
      await handleGroupMessage(message);
      return NextResponse.json({ ok: true });
    }

    // ── Direct message handling ──
    // Marcar como leido
    markAsRead(message.messageId).catch(() => {});

    // Enviar typing indicator mientras procesa
    sendTypingIndicator(message.from).catch(() => {});

    // Enviar respuesta de manera segura con fallback
    await safeReply(message);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[ArchiFlow WhatsApp] Error en webhook POST:", msg);
    return NextResponse.json({ ok: true }); // Siempre 200 para Meta
  }
}

// ─── Group Message Handler ───
// In groups, the bot only responds when mentioned or when a command is detected.
// The sender must be a linked user to get AI responses.
async function handleGroupMessage(message: WhatsAppMessage) {
  try {
    const body = message.body.toLowerCase().trim();

    // Check if the message mentions the bot
    const mentionsBot = BOT_MENTIONS.some(m => body.includes(m));

    // Check if it's a direct command
    const isCommand = ['resumen', 'estado', 'gastos', 'tareas', 'equipo', 'ayuda', 'help', 'menu'].some(cmd => body.startsWith(cmd));

    if (!mentionsBot && !isCommand) {
      // Not for us — ignore silently
      return;
    }

    // Look up the sender's linked account
    const db = getAdminDb();
    const linkSnap = await db
      .collection("whatsappLinks")
      .where("whatsappPhone", "==", message.from)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (linkSnap.empty) {
      // Sender not linked — respond with link instructions
      const replyTo = message.groupId || message.from;
      await sendWhatsAppMessage(replyTo,
        `Hola ${message.name}! Para usar ArchiFlow en este grupo necesitas vincular tu cuenta.\n\n` +
        `Escribe *ayuda* para ver como hacerlo.`
      );
      return;
    }

    const linkData = { id: linkSnap.docs[0].id, ...linkSnap.docs[0].data() } as WhatsAppLinkedUser;

    // Multi-tenant: verify linked user has a tenant
    const tenantId = await getTenantIdForUser(linkData.userId);
    if (!tenantId) {
      const replyTo = message.groupId || message.from;
      await sendWhatsAppMessage(replyTo,
        `Hola ${message.name}! Tu cuenta no esta configurada en una organizacion. Contacta al administrador.`
      );
      return;
    }

    // Strip the bot mention from the message for cleaner AI processing
    let cleanMessage = message.body;
    for (const mention of BOT_MENTIONS) {
      cleanMessage = cleanMessage.replace(new RegExp(`@?${mention}`, 'gi'), '').trim();
    }
    // If the remaining message is empty (was just a mention), provide help
    if (!cleanMessage || cleanMessage.length < 2) {
      cleanMessage = 'resumen';
    }

    // Use AI Agent for group messages
    const replyTo = message.groupId || message.from;
    // Send typing indicator for group messages too
    sendTypingIndicator(replyTo).catch(() => {});
    try {
      const aiText = await aiReply(cleanMessage, linkData, db, {
        isGroup: true,
        groupName: message.groupName,
        senderName: message.name,
      });

      // Prefix with @mention in group context
      const groupReply = message.name ? `@${message.name}\n\n${aiText}` : aiText;
      const textResult = await sendWhatsAppMessage(replyTo, groupReply);
      if (!textResult.success) {
        console.error("[WhatsApp Group] Error sending reply:", textResult.error);
      }
    } catch (aiErr) {
      console.warn('[WhatsApp Group] AI failed, falling back to commands:', aiErr instanceof Error ? aiErr.message : aiErr);
      try {
        const cmdResult = await processCommand(cleanMessage, linkData, db);
        const groupReply = message.name ? `@${message.name}\n\n${cmdResult.text}` : cmdResult.text;
        await sendWhatsAppMessage(replyTo, groupReply);
      } catch (cmdErr) {
        console.error('[WhatsApp Group] Command fallback also failed:', cmdErr instanceof Error ? cmdErr.message : cmdErr);
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[WhatsApp Group] Error:", msg);
  }
}

// ─── Safe reply con fallback a texto plano ───
async function safeReply(message: WhatsAppMessage) {
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
      const linkData = { id: linkSnap.docs[0].id, ...linkSnap.docs[0].data() } as WhatsAppLinkedUser;

      // Multi-tenant: verify linked user has a tenant
      const tenantId = await getTenantIdForUser(linkData.userId);
      if (!tenantId) {
        reply = { text: 'Tu cuenta no esta configurada en una organizacion. Contacta al administrador.' };
      } else {
        // Use AI Agent for natural conversation — fallback to classic commands on failure
        try {
          const aiText = await aiReply(message.body, linkData, db);
          reply = { text: aiText };
        } catch (aiErr) {
          console.warn('[WhatsApp] AI failed, falling back to commands:', aiErr instanceof Error ? aiErr.message : aiErr);
          reply = await processCommand(message.body, linkData, db);
        }
      }
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
    if (!textResult.success) {
      console.error("[ArchiFlow WhatsApp] FALLO envio de texto a:", message.from, "Error:", textResult.error);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[ArchiFlow WhatsApp] Error en safeReply:", msg);
  }
}

// ─── Manejo del flujo de vinculacion ───
async function handleLinkingFlow(message: WhatsAppMessage, db: Firestore): Promise<{ text: string; buttons?: { id: string; title: string }[] }> {
  const msg = message.body.toLowerCase().trim();

  // Primer contacto o boton de vincular
  if (msg === 'hola' || msg === 'hi' || msg === 'link_start' || msg === '1') {
    return getWelcomeMessage();
  }

  // Parece un email (contiene @) → vincular directamente
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
    const userName = userData.name || userData.displayName || email.split("@")[0];

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
        active: true,
        linkedAt: FieldValue.serverTimestamp(),
      });

      return getLinkedSuccess(userName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      console.error("[ArchiFlow WhatsApp] Error vinculando:", msg);
      return { text: "Error al vincular la cuenta. Intenta de nuevo." };
    }
  }

  // Mensaje no reconocido sin vinculacion
  return getWelcomeMessage();
}
