/**
 * whatsapp-ai.ts
 * Bridge entre WhatsApp y el AI Agent de ArchiFlow.
 * Permite conversar naturalmente por WhatsApp y usar las mismas
 * herramientas que el chat web (crear tareas, proyectos, consultar datos).
 *
 * Flujo:
 *   WhatsApp → webhook → aiReply() → AI Agent (generateText + tools) → WhatsApp
 *
 * Historial: Se guardan los últimos mensajes en Firestore para contexto conversacional.
 */

import { generateText, stepCountIs } from 'ai';
import { routeAIRequest } from '@/lib/ai-router';
import { createAgentTools } from '@/lib/ai-tools';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import type { WhatsAppLinkedUser } from '@/lib/types';
import type { Firestore } from 'firebase-admin/firestore';

/* ===== Constants ===== */
const MAX_HISTORY_MESSAGES = 10;
const MAX_WHATSAPP_CHARS = 4090;
const WHATSAPP_HISTORY_COLLECTION = 'whatsappHistory';

/* ===== WhatsApp-specific System Prompt ===== */
const WHATSAPP_SYSTEM_PROMPT = `Eres ArchiFlow AI, el asistente inteligente de ArchiFlow — una plataforma de gestión de proyectos de construcción y arquitectura. El usuario te está hablando por WhatsApp.

Reglas IMPORTANTES:
1. SIEMPRE respondes en español.
2. Formato: usa emojis, negritas con *asteriscos* y texto simple. NO uses markdown, listas numeradas con guiones, ni formato complejo.
3. Sé conciso — WhatsApp tiene límite de 4096 caracteres.
4. Cuando crees o modifiques algo, confirma con un resumen corto.
5. Usa formato de moneda colombiana (COP) cuando menciones montos.
6. Si el usuario pregunta algo que no requiere herramientas (saludos, chiste, etc.), responde naturalmente.
7. Para datos que necesites buscar, usa las herramientas disponibles.
8. No inventes datos — usa las herramientas para consultar información real.`;

/* ===== Types ===== */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/* ===== History Management ===== */

/** Load recent conversation history from Firestore */
async function loadHistory(phone: string, db: Firestore): Promise<ChatMessage[]> {
  try {
    // Try to find existing conversation document
    const snap = await db
      .collection(WHATSAPP_HISTORY_COLLECTION)
      .doc(phone.replace('+', ''))
      .get();

    if (!snap.exists) return [];

    const data = snap.data();
    const history: ChatMessage[] = data?.messages || [];

    // Return only recent messages
    return history.slice(-MAX_HISTORY_MESSAGES);
  } catch (err) {
    console.warn('[WhatsApp AI] Error loading history:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Save a message to conversation history in Firestore */
async function saveToHistory(phone: string, role: 'user' | 'assistant', content: string, db: Firestore): Promise<void> {
  try {
    const docId = phone.replace('+', '');
    const FV = getAdminFieldValue();
    const msg: ChatMessage = { role, content: content.substring(0, 500), timestamp: Date.now() };

    const docRef = db.collection(WHATSAPP_HISTORY_COLLECTION).doc(docId);
    const doc = await docRef.get();

    if (doc.exists) {
      const existing = doc.data()?.messages || [];
      // Keep only last 20 messages to avoid bloat
      const updated = [...existing, msg].slice(-20);
      await docRef.update({ messages: updated, updatedAt: FV.serverTimestamp() });
    } else {
      await docRef.set({
        messages: [msg],
        createdAt: FV.serverTimestamp(),
        updatedAt: FV.serverTimestamp(),
      });
    }
  } catch (err) {
    // History save failure should not block the reply
    console.warn('[WhatsApp AI] Error saving history:', err instanceof Error ? err.message : err);
  }
}

/* ===== Format AI Response for WhatsApp ===== */
function formatForWhatsApp(text: string): string {
  let formatted = text;

  // Remove markdown headers (# ## ###)
  formatted = formatted.replace(/^#{1,3}\s+/gm, '');

  // Remove code blocks (```...```)
  formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').trim();
  });

  // Remove inline code
  formatted = formatted.replace(/`([^`]+)`/g, '$1');

  // Remove bold markdown but keep the text (WhatsApp uses * for bold)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // Remove italic markdown but keep the text
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '*$1*');

  // Remove strikethrough
  formatted = formatted.replace(/~~([^~]+)~~/g, '$1');

  // Remove links, keep text
  formatted = formatted.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Clean up extra whitespace
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.trim();

  // Truncate to WhatsApp limit
  if (formatted.length > MAX_WHATSAPP_CHARS) {
    formatted = formatted.substring(0, MAX_WHATSAPP_CHARS - 50) + '\n\n...(mensaje truncado)';
  }

  return formatted;
}

/* ===== Main AI Reply Function ===== */

/**
 * Process a WhatsApp message through the AI Agent.
 * Returns the text response to send back via WhatsApp.
 */
export async function aiReply(
  userMessage: string,
  link: WhatsAppLinkedUser,
  db: Firestore,
): Promise<string> {
  const phone = link.whatsappPhone || 'unknown';
  const userId = link.userId;

  try {
    // 1. Load conversation history
    const history = await loadHistory(phone, db);

    // 2. Build messages array for AI
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // 3. Add date context to system prompt
    const today = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const systemPrompt = WHATSAPP_SYSTEM_PROMPT + `\n\nFecha actual: ${today}`;
    if (link.userName) {
      // Include user name for personalized responses
      // Note: don't add to system prompt directly to avoid re-creating it
    }

    // 4. Get AI model via router
    const { model, provider, modelName } = await routeAIRequest({
      taskType: 'chat',
      messages,
      userId,
    });
    console.log(`[WhatsApp AI] Using ${provider} (${modelName}) for user ${userId} (${link.userName})`);

    // 5. Create tools with user context
    const tools = createAgentTools(userId);

    // 6. Call AI with tools
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 5,
      maxOutputTokens: 1500,
      temperature: 0.7,
      onStepFinish({ text, toolCalls }) {
        if (toolCalls?.length) {
          console.log(`[WhatsApp AI] Tools used: ${toolCalls.map(tc => tc.toolName).join(', ')}`);
        }
      },
    });

    // 7. Get the response text
    let responseText = result.text || 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';

    // 8. Format for WhatsApp
    responseText = formatForWhatsApp(responseText);

    // 9. Save both user message and AI response to history (fire-and-forget)
    saveToHistory(phone, 'user', userMessage, db).catch(() => {});
    saveToHistory(phone, 'assistant', responseText, db).catch(() => {});

    return responseText;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[WhatsApp AI] Error: ${msg}`);

    // Save user message to history even on failure
    saveToHistory(phone, 'user', userMessage, db).catch(() => {});

    // Check if it's a provider error
    if (msg.includes('PERMISSION_DENIED') || msg.includes('No hay API keys')) {
      return 'La IA no está disponible en este momento. Los proveedores de IA no responden. Intenta en unos minutos.';
    }

    if (msg.includes('límite de tasa') || msg.includes('rate limit')) {
      return 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.';
    }

    return `Error al procesar tu mensaje. Intenta de nuevo.\n\nSi el problema persiste, escribe *ayuda* para usar los comandos clásicos.`;
  }
}
