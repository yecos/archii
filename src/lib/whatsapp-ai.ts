/**
 * whatsapp-ai.ts
 * Bridge entre WhatsApp y el AI Agent de ArchiFlow.
 * Permite conversar naturalmente por WhatsApp y usar las mismas
 * herramientas que el chat web (crear tareas, proyectos, consultar datos).
 *
 * Soporta:
 *   - Mensajes directos (DM) — conversación 1:1 con historial
 *   - Grupos de WhatsApp — responde solo cuando se menciona "Archiflow"
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

Tienes acceso a herramientas que te permiten:
- Consultar proyectos, tareas, gastos, presupuestos, inventario, facturas, cotizaciones y reuniones
- Crear nuevas tareas, gastos, facturas, cotizaciones y reuniones
- Actualizar el estado de tareas
- Generar reportes de proyectos

Reglas IMPORTANTES:
1. SIEMPRE respondes en español.
2. Formato: usa emojis, negritas con *asteriscos* y texto simple. NO uses markdown complejo, ni listas numeradas con guiones, ni tablas.
3. Sé conciso — WhatsApp tiene límite de 4096 caracteres. Prefiere respuestas cortas y directas.
4. Cuando crees o modifiques algo, confirma con un resumen corto de lo que hiciste.
5. Usa formato de moneda colombiana (COP $XX.XXX) cuando menciones montos.
6. Si el usuario pregunta algo general (saludos, chiste, clima), responde naturalmente SIN usar herramientas.
7. Para datos que necesites buscar, usa SIEMPRE las herramientas. NUNCA inventes datos.
8. Si una herramienta falla, explica el error de forma simple y sugiere una alternativa.
9. Cuando listes información, usa emojis como bullets: 📌, ✅, 🔴, 🟢, 📊, 💰, etc.
10. Sé proactivo: si el usuario pregunta "cómo va X", consulta los datos reales y da un resumen.`;

/* ===== Group System Prompt ===== */
const GROUP_SYSTEM_PROMPT = `Eres ArchiFlow AI, el asistente inteligente de ArchiFlow en un grupo de WhatsApp. Alguien te mencionó en el grupo.

REGLAS ESPECIALES PARA GRUPOS:
1. Responde de forma CONCISA — en grupos las respuestas largas molestan. Máximo 3-4 líneas por punto.
2. NO uses saludos largos. Ve directo al punto.
3. Si te preguntan algo privado (ej: "cuánto gané"), sugiere que te escriban por privado.
4. Identifícate al inicio si la pregunta es ambigua: "ArchiFlow: ..."
5. Las mismas herramientas de consulta y creación están disponibles.`;

/* ===== Types ===== */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Options for aiReply */
export interface AiReplyOptions {
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
  senderName?: string;
}

/* ===== History Management ===== */

/** Get a unique history key based on phone and optional group context */
function getHistoryKey(phone: string, options?: AiReplyOptions): string {
  const cleanPhone = phone.replace('+', '');
  if (options?.isGroup && options?.groupId) {
    // Separate history per group to keep contexts clean
    return `group_${options.groupId}_${cleanPhone}`;
  }
  return cleanPhone;
}

/** Load recent conversation history from Firestore */
async function loadHistory(key: string, db: Firestore): Promise<ChatMessage[]> {
  try {
    const snap = await db
      .collection(WHATSAPP_HISTORY_COLLECTION)
      .doc(key)
      .get();

    if (!snap.exists) return [];

    const data = snap.data();
    const history: ChatMessage[] = data?.messages || [];

    return history.slice(-MAX_HISTORY_MESSAGES);
  } catch (err) {
    console.warn('[WhatsApp AI] Error loading history:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Save a message to conversation history in Firestore */
async function saveToHistory(key: string, role: 'user' | 'assistant', content: string, db: Firestore): Promise<void> {
  try {
    const FV = getAdminFieldValue();
    const msg: ChatMessage = { role, content: content.substring(0, 500), timestamp: Date.now() };

    const docRef = db.collection(WHATSAPP_HISTORY_COLLECTION).doc(key);
    const doc = await docRef.get();

    if (doc.exists) {
      const existing = doc.data()?.messages || [];
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
  options?: AiReplyOptions,
): Promise<string> {
  const phone = link.whatsappPhone || 'unknown';
  const userId = link.userId;
  const historyKey = getHistoryKey(phone, options);

  try {
    // 1. Load conversation history
    const history = await loadHistory(historyKey, db);

    // 2. Build messages array for AI
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // 3. Build context-aware system prompt
    const today = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    let systemPrompt = WHATSAPP_SYSTEM_PROMPT;

    // Add user context for personalized responses
    if (link.userName) {
      systemPrompt += `\n\nEl usuario se llama ${link.userName}. Puedes usar su nombre para personalizar las respuestas.`;
    }

    // Add group context
    if (options?.isGroup) {
      systemPrompt += '\n\n' + GROUP_SYSTEM_PROMPT;
      if (options.senderName) {
        systemPrompt += `\n\nLa persona que te mencionó es ${options.senderName}.`;
      }
      if (options.groupName) {
        systemPrompt += `\nEstás en el grupo "${options.groupName}".`;
      }
    }

    systemPrompt += `\n\nFecha actual: ${today}`;

    // 4. Get AI model via router
    const { model, provider, modelName } = await routeAIRequest({
      taskType: 'chat',
      messages,
      userId,
    });
    console.log(`[WhatsApp AI] Using ${provider} (${modelName}) for user ${userId} (${link.userName})${options?.isGroup ? ` in group ${options.groupName}` : ''}`);

    // 5. Create tools with user context
    const tools = createAgentTools(userId);

    // 6. Call AI with tools
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: options?.isGroup ? 1000 : 1500,  // Shorter responses in groups
      temperature: 0.7,
      onStepFinish({ toolCalls }: { toolCalls?: any[] }) {
        if (toolCalls?.length) {
          console.log(`[WhatsApp AI] Tools used: ${toolCalls.map((tc: any) => tc.toolName).join(', ')}`);
        }
      },
    });

    // 7. Get the response text
    let responseText = result.text || 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';

    // 8. Format for WhatsApp
    responseText = formatForWhatsApp(responseText);

    // 9. Save both user message and AI response to history (fire-and-forget)
    saveToHistory(historyKey, 'user', userMessage, db).catch(() => {});
    saveToHistory(historyKey, 'assistant', responseText, db).catch(() => {});

    return responseText;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[WhatsApp AI] Error: ${msg}`);

    // Save user message to history even on failure
    saveToHistory(historyKey, 'user', userMessage, db).catch(() => {});

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
