/**
 * whatsapp-ai.ts
 * Bridge entre WhatsApp y el AI Agent de ArchiFlow.
 * Permite conversar naturalmente por WhatsApp y usar las mismas
 * herramientas que el chat web (crear tareas, proyectos, consultar datos).
 *
 * Soporta:
 *   - Mensajes directos (DM) — conversación 1:1 con historial
 *   - Grupos de WhatsApp — responde solo cuando se menciona "Archiflow"
 *   - Contexto automático — carga proyectos del usuario para respuestas personalizadas
 *   - Typing indicator — muestra "escribiendo..." mientras procesa
 *
 * Flujo:
 *   WhatsApp → webhook → sendTypingIndicator → aiReply() → AI Agent → WhatsApp
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

/* ===== WhatsApp System Prompt — Super enhanced ===== */
const WHATSAPP_SYSTEM_PROMPT = `Eres *ArchiFlow AI*, el asistente inteligente de ArchiFlow — la plataforma de gestión de proyectos de construcción y arquitectura. El usuario te habla por WhatsApp.

CAPACIDADES — Puedes hacer TODO esto directamente:

📊 CONSULTAS (pregunta lo que quieras):
• "¿Cómo va el proyecto X?" — Estado, progreso, tareas, presupuesto
• "¿Qué tareas tengo pendientes?" — Lista filtrada
• "Resumen de gastos del proyecto X" — Desglose por categoría
• "¿Cuánto presupuesto queda?" — Presupuesto vs gastado
• "¿Qué hay en inventario?" — Stock de materiales
• "¿Qué facturas están pendientes?" — Estado de facturación
• "¿Hay cotizaciones por aprobar?" — Pipeline comercial
• "Tareas que vencen esta semana" — Fechas próximas

✏️ CREAR COSAS (pide lo que necesites):
• "Crea una tarea 'Revisar planos' en el proyecto X, prioridad alta"
• "Registra un gasto de $500.000 en materiales para proyecto X"
• "Programa una reunión mañana a las 10am con el cliente"
• "Genera una cotización para el proyecto X"
• "Crea una factura para el proyecto X"

📋 GESTIÓN:
• "Avanza la tarea X a 'En progreso'"
• "¿Qué debo reordenar del inventario?"
• "Estima el costo de remodelar una cocina de 15m²"

Reglas IMPORTANTES:
1. SIEMPRE respondes en español.
2. Formato: emojis, negritas con *asteriscos*, texto simple. SIN markdown complejo, tablas, ni código.
3. Sé conciso — WhatsApp tiene límite de 4096 chars. Máximo 3-4 líneas por punto.
4. Al crear algo, confirma con un resumen corto.
5. Moneda colombiana: COP $XX.XXX.
6. Si preguntan algo general (saludos, chiste), responde naturalmente SIN herramientas.
7. Para datos reales, USA SIEMPRE las herramientas. NUNCA inventes datos.
8. Si una herramienta falla, explica simple y sugiere alternativa.
9. Usa emojis como bullets: 📌, ✅, 🔴, 🟢, 📊, 💰, 📋, 🔧
10. Sé PROACTIVO: si preguntan "cómo va X", consulta datos reales y resume.
11. Si el usuario menciona un proyecto por nombre, búscalo en la lista de PROYECTOS DISPONIBLES que se te proporciona abajo. Usa el ID correcto.`;

const GROUP_SYSTEM_PROMPT = `REGLAS PARA GRUPOS:
1. MÁXIMO 3-4 líneas. En grupo las respuestas largas molestan.
2. SIN saludos. Ve directo al punto.
3. Prefijo: "ArchiFlow:" al inicio.
4. Si preguntan algo privado, sugiere escribir por privado.
5. Mismas herramientas disponibles.`;

/* ===== Types ===== */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Project summary for context injection */
interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget: number;
}

/** Options for aiReply */
export interface AiReplyOptions {
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
  senderName?: string;
}

/* ===== History Management ===== */

function getHistoryKey(phone: string, options?: AiReplyOptions): string {
  const cleanPhone = phone.replace('+', '');
  if (options?.isGroup && options?.groupId) {
    return `group_${options.groupId}_${cleanPhone}`;
  }
  return cleanPhone;
}

async function loadHistory(key: string, db: Firestore): Promise<ChatMessage[]> {
  try {
    const snap = await db.collection(WHATSAPP_HISTORY_COLLECTION).doc(key).get();
    if (!snap.exists) return [];
    const data = snap.data();
    return (data?.messages || []).slice(-MAX_HISTORY_MESSAGES);
  } catch (err) {
    console.warn('[WhatsApp AI] Error loading history:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function saveToHistory(key: string, role: 'user' | 'assistant', content: string, db: Firestore): Promise<void> {
  try {
    const FV = getAdminFieldValue();
    const msg: ChatMessage = { role, content: content.substring(0, 500), timestamp: Date.now() };
    const docRef = db.collection(WHATSAPP_HISTORY_COLLECTION).doc(key);
    const doc = await docRef.get();
    if (doc.exists) {
      const existing = doc.data()?.messages || [];
      await docRef.update({ messages: [...existing, msg].slice(-20), updatedAt: FV.serverTimestamp() });
    } else {
      await docRef.set({ messages: [msg], createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp() });
    }
  } catch (err) {
    console.warn('[WhatsApp AI] Error saving history:', err instanceof Error ? err.message : err);
  }
}

/* ===== Context Loader — Fetch user's projects for smart responses ===== */

async function loadUserProjectContext(userId: string, db: Firestore): Promise<string> {
  try {
    // Get all projects where user is a team member
    const projectsSnap = await db.collection('projects').orderBy('createdAt', 'desc').limit(20).get();
    const projects: ProjectSummary[] = projectsSnap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Sin nombre',
          status: data.status || 'Activo',
          progress: Number(data.progress) || 0,
          budget: Number(data.budget) || 0,
        };
      });

    if (projects.length === 0) return '\n\nNo hay proyectos registrados aún.';

    const projectList = projects
      .map((p, i) => {
        const statusEmoji = p.status === 'Completado' ? '✅' : p.status === 'Pausado' ? '⏸️' : p.status === 'Cancelado' ? '❌' : '🟢';
        const budgetStr = p.budget > 0 ? ` — $${p.budget.toLocaleString('es-CO')}` : '';
        return `  ${i + 1}. ${statusEmoji} "${p.name}" [ID: ${p.id}]${budgetStr} (${p.progress}%)`;
      })
      .join('\n');

    const activeCount = projects.filter(p => p.status !== 'Completado' && p.status !== 'Cancelado').length;
    return `\n\nPROYECTOS DISPONIBLES DEL USUARIO (${activeCount} activos de ${projects.length} total):\n${projectList}\n\nREGLA: Cuando el usuario mencione un proyecto por nombre, usa el ID correspondiente de esta lista.`;
  } catch (err) {
    console.warn('[WhatsApp AI] Error loading project context:', err instanceof Error ? err.message : err);
    return '';
  }
}

/* ===== Format AI Response for WhatsApp ===== */
function formatForWhatsApp(text: string): string {
  let formatted = text;

  // Remove markdown headers
  formatted = formatted.replace(/^#{1,3}\s+/gm, '');
  // Remove code blocks but keep content
  formatted = formatted.replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim());
  // Remove inline code
  formatted = formatted.replace(/`([^`]+)`/g, '$1');
  // Keep bold as WhatsApp bold (*text*)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  // Clean italic
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

    // 2. Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // 3. Build context-aware system prompt
    const today = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    let systemPrompt = WHATSAPP_SYSTEM_PROMPT;

    // Add user context
    if (link.userName) {
      systemPrompt += `\n\nEl usuario se llama *${link.userName}*.`;
    }

    // Add group context
    if (options?.isGroup) {
      systemPrompt += '\n\n' + GROUP_SYSTEM_PROMPT;
      if (options.senderName) {
        systemPrompt += `\nLa persona que te mencionó es ${options.senderName}.`;
      }
      if (options.groupName) {
        systemPrompt += `\nGrupo: "${options.groupName}".`;
      }
    }

    systemPrompt += `\n\nFecha actual: ${today}`;

    // 4. Load user's project context (auto-inject into system prompt)
    const projectContext = await loadUserProjectContext(userId, db);
    systemPrompt += projectContext;

    // 5. Get AI model via router
    const { model, provider, modelName } = await routeAIRequest({
      taskType: 'chat',
      messages,
      userId,
    });
    console.log(`[WhatsApp AI] ${provider} (${modelName}) → ${link.userName}${options?.isGroup ? ` [${options.groupName}]` : ''}`);

    // 6. Create tools with user context
    const tools = createAgentTools(userId);

    // 7. Call AI with tools
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: options?.isGroup ? 800 : 1500,
      temperature: 0.7,
      onStepFinish({ toolCalls }) {
        if (toolCalls?.length) {
          console.log(`[WhatsApp AI] Tools: ${toolCalls.map((tc) => tc.toolName).join(', ')}`);
        }
      },
    });

    // 8. Format for WhatsApp
    let responseText = result.text || 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';
    responseText = formatForWhatsApp(responseText);

    // 9. Save to history (fire-and-forget)
    saveToHistory(historyKey, 'user', userMessage, db).catch(() => {});
    saveToHistory(historyKey, 'assistant', responseText, db).catch(() => {});

    return responseText;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[WhatsApp AI] Error: ${msg}`);

    saveToHistory(historyKey, 'user', userMessage, db).catch(() => {});

    if (msg.includes('PERMISSION_DENIED') || msg.includes('No hay API keys')) {
      return '⚠️ La IA no está disponible en este momento. Los proveedores no responden. Intenta en unos minutos.';
    }
    if (msg.includes('límite de tasa') || msg.includes('rate limit')) {
      return '⏳ Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.';
    }

    return `Error al procesar tu mensaje. Intenta de nuevo.\n\nEscribe *menu* para ver las opciones disponibles.`;
  }
}
