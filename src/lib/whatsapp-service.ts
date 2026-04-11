/**
 * ArchiFlow — WhatsApp Service
 * Conexión con Meta Cloud API para enviar/recibir mensajes de WhatsApp.
 *
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ─── Environment Variables ( obligatorias en Vercel ) ───
function getConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!token || !phoneId || !verifyToken) {
    console.error('[ArchiFlow WhatsApp] Variables de entorno faltantes:', {
      hasToken: !!token,
      hasPhoneId: !!phoneId,
      hasVerifyToken: !!verifyToken,
    });
    return null;
  }

  return { token, phoneId, verifyToken };
}

// ─── Send text message ───
export async function sendWhatsAppMessage(to: string, text: string): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) return { success: false, error: 'WhatsApp no configurado. Agrega variables en Vercel.' };

  try {
    // Asegurar que el número tiene formato internacional sin +
    const phone = to.replace(/[^0-9]/g, '');

    const response = await fetch(`${BASE_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: text,
          preview_url: false,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ArchiFlow WhatsApp] Error enviando mensaje:', response.status, err);
      return { success: false, error: `Error ${response.status} enviando mensaje` };
    }

    const data = await response.json();
    console.log('[ArchiFlow WhatsApp] Mensaje enviado:', data.messages?.[0]?.id);
    return { success: true };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error de conexión:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send interactive buttons ───
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) return { success: false, error: 'WhatsApp no configurado.' };

  try {
    const phone = to.replace(/[^0-9]/g, '');

    const response = await fetch(`${BASE_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ArchiFlow WhatsApp] Error enviando botones:', response.status, err);
      return { success: false, error: `Error ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error conexión botones:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send list message (menu principal) ───
export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) return { success: false, error: 'WhatsApp no configurado.' };

  try {
    const phone = to.replace(/[^0-9]/g, '');

    const response = await fetch(`${BASE_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: bodyText },
          action: {
            button: buttonText,
            sections: sections.slice(0, 10),
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ArchiFlow WhatsApp] Error enviando lista:', response.status, err);
      return { success: false, error: `Error ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error conexión lista:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Verify webhook (GET) ───
export function verifyWebhook(mode: string, token: string, challenge: string): { verified: boolean; body?: string } {
  const config = getConfig();
  if (!config) return { verified: false };

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('[ArchiFlow WhatsApp] Webhook verificado');
    return { verified: true, body: challenge };
  }

  return { verified: false };
}

// ─── Parse incoming webhook (POST) ───
export interface WhatsAppMessage {
  from: string;       // número del usuario (sin +)
  name: string;       // nombre del usuario en WhatsApp
  body: string;       // texto del mensaje
  messageId: string;  // ID del mensaje
  timestamp: string;  // timestamp de Meta
  type: 'text' | 'interactive' | 'unknown';
  buttonId?: string;  // ID del botón presionado
}

export function parseWebhookPayload(body: any): WhatsAppMessage | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return null;

    // Ignorar statuses (confirmaciones de entrega)
    if (value?.statuses) return null;

    const from = message.from || '';
    const name = value?.contacts?.[0]?.profile?.name || 'Usuario';
    const messageId = message.id || '';
    const timestamp = message.timestamp || '';

    let msgBody = '';
    let msgType: WhatsAppMessage['type'] = 'unknown';
    let buttonId: string | undefined;

    if (message.type === 'text' && message.text?.body) {
      msgBody = message.text.body.trim();
      msgType = 'text';
    } else if (message.type === 'interactive') {
      const interactive = message.interactive;
      if (interactive.type === 'button_reply') {
        msgBody = interactive.button_reply?.title || interactive.button_reply?.id || '';
        buttonId = interactive.button_reply?.id;
        msgType = 'interactive';
      } else if (interactive.type === 'list_reply') {
        msgBody = interactive.list_reply?.title || interactive.list_reply?.id || '';
        buttonId = interactive.list_reply?.id;
        msgType = 'interactive';
      }
    }

    if (!msgBody) return null;

    return { from, name, body: msgBody, messageId, timestamp, type: msgType, buttonId };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error parseando webhook:', err.message);
    return null;
  }
}

// ─── Firestore: vincular WhatsApp ↔ ArchiFlow ───

export interface WhatsAppLink {
  whatsappPhone: string;
  userId: string;
  userEmail: string;
  userName: string;
  linkedAt: any; // Firestore Timestamp
  active: boolean;
}

/**
 * Busca un vínculo activo por número de WhatsApp
 */
export async function getLinkedUser(whatsappPhone: string): Promise<WhatsAppLink | null> {
  try {
    const { getFirebase } = await import('./firebase-service');
    const db = getFirebase().firestore();

    const snap = await db
      .collection('whatsappLinks')
      .where('whatsappPhone', '==', whatsappPhone)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as any;
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error buscando vínculo:', err.message);
    return null;
  }
}

/**
 * Crea un vínculo WhatsApp → cuenta ArchiFlow
 */
export async function createWhatsAppLink(data: Omit<WhatsAppLink, 'linkedAt'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { getFirebase } = await import('./firebase-service');
    const db = getFirebase().firestore();
    const FieldValue = getFirebase().firestore.FieldValue;

    await db.collection('whatsappLinks').add({
      ...data,
      linkedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error creando vínculo:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene todos los vínculos activos (para enviar notificaciones masivas)
 */
export async function getAllActiveLinks(): Promise<WhatsAppLink[]> {
  try {
    const { getFirebase } = await import('./firebase-service');
    const db = getFirebase().firestore();

    const snap = await db
      .collection('whatsappLinks')
      .where('active', '==', true)
      .get();

    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error obteniendo vínculos:', err.message);
    return [];
  }
}

/**
 * Busca vínculos activos por userId (para enviar notificación a un usuario específico)
 */
export async function getLinksByUserId(userId: string): Promise<WhatsAppLink[]> {
  try {
    const { getFirebase } = await import('./firebase-service');
    const db = getFirebase().firestore();

    const snap = await db
      .collection('whatsappLinks')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .get();

    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error buscando por userId:', err.message);
    return [];
  }
}
