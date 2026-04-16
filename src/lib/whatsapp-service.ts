/**
 * ArchiFlow — WhatsApp Service
 * Conexion con Meta Cloud API para enviar/recibir mensajes de WhatsApp.
 * Este modulo es PURO (no importa firebase-admin) para evitar problemas
 * de bundling con Turbopack.
 *
 * Las operaciones de Firestore se hacen directamente en los API routes
 * (/api/whatsapp/webhook, /api/whatsapp/notify) via dynamic import.
 */

import type { FirestoreTimestamp } from '@/lib/types';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v25.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ─── Environment Variables ───
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
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[ArchiFlow WhatsApp] Error de conexion:', msg);
    return { success: false, error: msg };
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[ArchiFlow WhatsApp] Error conexion botones:', msg);
    return { success: false, error: msg };
  }
}

// ─── Verify webhook (GET) ───
export function verifyWebhook(mode: string, token: string, challenge: string): { verified: boolean; body?: string } {
  // Primary: match against configured verify token
  const config = getConfig();
  if (mode === 'subscribe' && config && token === config.verifyToken) {
    return { verified: true, body: challenge };
  }

  // Fallback: if no config or token mismatch, accept common defaults for initial setup
  if (mode === 'subscribe' && (token === 'archiflow2026' || token === 'archiflow' || token === 'archiflow_test')) {
    return { verified: true, body: challenge };
  }

  return { verified: false };
}

// ─── Send typing indicator (shows "typing..." in WhatsApp) ───
export async function sendTypingIndicator(to: string): Promise<void> {
  const config = getConfig();
  if (!config) return;
  try {
    await fetch(`${BASE_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        type: 'reaction',
        reaction: { message_id: '0', emoji: '⏳' },
      }),
    });
  } catch {
    // Typing indicator is nice-to-have, never block on failure
  }
}

// ─── Mark message as read ───
export async function markAsRead(messageId: string): Promise<void> {
  const config = getConfig();
  if (!config) return;
  try {
    await fetch(`${BASE_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch {
    // Read receipt is nice-to-have, never block on failure
  }
}

// ─── Parse incoming webhook (POST) ───
export interface WhatsAppMessage {
  from: string;           // Sender phone (individual in both DM and groups)
  name: string;           // Sender name
  body: string;           // Message text
  messageId: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'unknown';
  buttonId?: string;
  isGroup?: boolean;      // true if message is from a group
  groupId?: string;       // WhatsApp group ID
  groupName?: string;     // Group name
  contextId?: string;     // Message ID being replied to (if any)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWebhookPayload(body: Record<string, any>): WhatsAppMessage | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return null;
    if (value?.statuses) return null;

    const from = message.from || '';
    const name = value?.contacts?.[0]?.profile?.name || value?.contacts?.[0]?.wa_id || 'Usuario';
    const messageId = message.id || '';
    const timestamp = message.timestamp || '';

    // Group detection: in WhatsApp Cloud API, group messages have context.group_id
    // or the 'from' is a group ID (starts with specific patterns)
    const context = message.context;
    const groupId = context?.group_id || null;
    const groupName = context?.group_name || null;
    const isGroup = !!groupId;
    const contextId = context?.id || null;

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

    return { from, name, body: msgBody, messageId, timestamp, type: msgType, buttonId, isGroup, groupId: groupId || undefined, groupName: groupName || undefined, contextId: contextId || undefined };
  } catch (err: unknown) {
    console.error('[ArchiFlow WhatsApp] Error parseando webhook:', err);
    return null;
  }
}

// ─── Firestore link interface (usado en API routes) ───
export interface WhatsAppLink {
  id?: string;
  whatsappPhone: string;
  userId: string;
  userEmail: string;
  userName: string;
  linkedAt: FirestoreTimestamp | null;
  active: boolean;
}
