/**
 * ArchiFlow — WhatsApp Commands
 * Parsea comandos del usuario y genera respuestas con datos de Firestore.
 */

import { getFirebase } from './firebase-service';
import { fmtCOP, fmtDate } from './helpers';
import type { WhatsAppLink } from './whatsapp-service';

interface CommandResult {
  text: string;
  buttons?: { id: string; title: string }[];
}

// ─── MAIN MENU ───
export function getMainMenu(): CommandResult {
  return {
    text: `*ArchiFlow Bot* 🏗️\n\nElige una opción:\n\n1. 📋 Mis tareas pendientes\n2. 📊 Estado de proyectos\n3. 💰 Presupuesto\n4. 👥 Equipo\n5. 📅 Próximos vencimientos\n6. 🤖 Consultar IA`,
    buttons: [
      { id: 'cmd_tareas', title: '📋 Mis tareas' },
      { id: 'cmd_proyectos', title: '📊 Proyectos' },
      { id: 'cmd_presupuesto', title: '💰 Presupuesto' },
    ],
  };
}

// ─── COMMAND ROUTER ───
export async function processCommand(
  rawMessage: string,
  link: WhatsAppLink
): Promise<CommandResult> {
  const msg = rawMessage.toLowerCase().trim();

  // Match por texto o por botón presionado
  if (msg === 'cmd_tareas' || msg.includes('tarea') || msg.includes('1')) {
    return await cmdMisTareas(link);
  }
  if (msg === 'cmd_proyectos' || msg.includes('proyecto') || msg.includes('2')) {
    return await cmdProyectos(link);
  }
  if (msg === 'cmd_presupuesto' || msg.includes('presupuesto') || msg.includes('3') || msg.includes('gasto')) {
    return await cmdPresupuesto(link);
  }
  if (msg === 'cmd_equipo' || msg.includes('equipo') || msg.includes('4')) {
    return await cmdEquipo(link);
  }
  if (msg === 'cmd_vencimientos' || msg.includes('vencimiento') || msg.includes('5') || msg.includes('fecha')) {
    return await cmdVencimientos(link);
  }
  if (msg === 'cmd_ia' || msg.includes('consultar') || msg.includes('6') || msg.includes('ia')) {
    return { text: '🤖 *Consultar IA*\n\nEscribe tu pregunta y la enviaré a ArchiFlow AI.\n\nEjemplo: "¿Cómo optimizar el presupuesto de mi proyecto?"' };
  }
  if (msg.includes('menu') || msg.includes('inicio') || msg === '0') {
    return getMainMenu();
  }
  if (msg === 'ayuda' || msg.includes('help')) {
    return {
      text: `*Comandos disponibles:*\n\n• *tareas* — Ver mis tareas pendientes\n• *proyectos* — Estado de proyectos\n• *presupuesto* — Resumen de gastos\n• *equipo* — Ver equipo\n• *vencimientos* — Próximas fechas\n• *ia* + pregunta — Consultar asistente IA\n• *menu* — Volver al menú principal`,
    };
  }
  if (msg.includes('desvincular') || msg.includes('desconectar')) {
    return { text: '🔒 Para desvincular tu WhatsApp, ve a ArchiFlow → Perfil → Configuración → WhatsApp.' };
  }

  // Si no es un comando, podría ser una pregunta para la IA
  return {
    text: `🤖 *ArchiFlow AI dice:*\n\nNo entendí ese comando. Escribe *menu* para ver las opciones disponibles.\n\nO escribe tu pregunta para consultar la IA.\n\nEjemplo: "¿Cómo organizar fases de obra?"`,
  };
}

// ─── COMANDO: Mis tareas pendientes ───
async function cmdMisTareas(link: WhatsAppLink): Promise<CommandResult> {
  try {
    const db = getFirebase().firestore();

    // Buscar tareas donde el usuario es asignado
    const snap = await db
      .collection('tasks')
      .where('assigneeId', '==', link.userId)
      .where('status', 'in', ['Pendiente', 'En progreso', 'En revisión'])
      .orderBy('dueDate', 'asc')
      .limit(10)
      .get();

    if (snap.empty) {
      return { text: '✅ ¡No tienes tareas pendientes! Todo al día.' };
    }

    const tasks = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = `📋 *Tus tareas pendientes (${tasks.length})*\n\n`;

    tasks.forEach((t: any, i: number) => {
      const prio = t.priority === 'Alta' ? '🔴' : t.priority === 'Media' ? '🟡' : '🟢';
      const status = t.status === 'En progreso' ? '🔄' : t.status === 'En revisión' ? '👀' : '⬜';
      const due = t.dueDate ? ` — Vence: ${fmtDate(t.dueDate)}` : '';
      text += `${i + 1}. ${prio} ${status} *${t.title}*${due}\n`;
    });

    text += '\n_Escribe "menu" para volver al menú principal_';

    return { text };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd tareas:', err.message);
    return { text: '❌ Error al obtener tus tareas. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Estado de proyectos ───
async function cmdProyectos(link: WhatsAppLink): Promise<CommandResult> {
  try {
    const db = getFirebase().firestore();

    const snap = await db
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .limit(10)
      .get();

    if (snap.empty) {
      return { text: '📭 No hay proyectos registrados aún.' };
    }

    const projects = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = `📊 *Proyectos (${projects.length})*\n\n`;

    projects.forEach((p: any, i: number) => {
      const status = p.status === 'En progreso' ? '🔄' : p.status === 'Completado' ? '✅' : p.status === 'Pausado' ? '⏸️' : '📌';
      const progress = p.progress !== undefined ? `${p.progress}%` : 'N/A';
      const budget = p.budget ? ` — ${fmtCOP(p.budget)}` : '';
      text += `${i + 1}. ${status} *${p.name}* [${progress}]${budget}\n`;
    });

    text += '\n_Escribe "menu" para volver_';

    return { text };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd proyectos:', err.message);
    return { text: '❌ Error al obtener proyectos. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Presupuesto ───
async function cmdPresupuesto(link: WhatsAppLink): Promise<CommandResult> {
  try {
    const db = getFirebase().firestore();

    const projectsSnap = await db
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .limit(5)
      .get();

    if (projectsSnap.empty) {
      return { text: '📭 No hay proyectos con presupuesto.' };
    }

    const projects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = '💰 *Resumen de presupuestos*\n\n';

    for (const p of projects) {
      const budget = Number(p.budget) || 0;

      // Sumar gastos del proyecto
      const expensesSnap = await db
        .collection('expenses')
        .where('projectId', '==', p.id)
        .get();

      const spent = expensesSnap.docs.reduce((sum: number, d: any) => {
        return sum + (Number(d.data().amount) || 0);
      }, 0);

      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      const bar = pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢';

      text += `*${p.name}*\n`;
      text += `  Presupuesto: ${fmtCOP(budget)}\n`;
      text += `  Gastado: ${fmtCOP(spent)} (${pct}%)\n`;
      text += `  Disponible: ${fmtCOP(budget - spent)} ${bar}\n\n`;
    }

    text += '_Escribe "menu" para volver_';

    return { text };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd presupuesto:', err.message);
    return { text: '❌ Error al obtener presupuesto. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Equipo ───
async function cmdEquipo(link: WhatsAppLink): Promise<CommandResult> {
  try {
    const db = getFirebase().firestore();

    const snap = await db
      .collection('team')
      .orderBy('name', 'asc')
      .limit(20)
      .get();

    if (snap.empty) {
      return { text: '👥 No hay miembros en el equipo.' };
    }

    const members = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = `👥 *Equipo (${members.length})*\n\n`;

    members.forEach((m: any, i: number) => {
      const role = m.role || 'Miembro';
      const status = m.active === false ? ' ❌' : '';
      text += `${i + 1}. *${m.name}* — ${role}${status}\n`;
    });

    text += '\n_Escribe "menu" para volver_';

    return { text };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd equipo:', err.message);
    return { text: '❌ Error al obtener equipo. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Próximos vencimientos ───
async function cmdVencimientos(link: WhatsAppLink): Promise<CommandResult> {
  try {
    const db = getFirebase().firestore();

    // Tareas con fecha límite futura, ordenadas por fecha
    const now = new Date().toISOString().split('T')[0];

    const snap = await db
      .collection('tasks')
      .where('status', 'in', ['Pendiente', 'En progreso'])
      .orderBy('dueDate', 'asc')
      .limit(10)
      .get();

    if (snap.empty) {
      return { text: '📅 No hay tareas con fecha límite próxima.' };
    }

    const tasks = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((t: any) => t.dueDate && t.dueDate >= now);

    if (tasks.length === 0) {
      return { text: '📅 No hay tareas con fecha límite próxima.' };
    }

    let text = `📅 *Próximos vencimientos (${tasks.length})*\n\n`;

    tasks.forEach((t: any, i: number) => {
      const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const urgent = daysLeft <= 1 ? '🔴 URGENTE' : daysLeft <= 3 ? '🟡 Pronto' : '🟢';
      const assignee = t.assigneeId ? ` → Asignado` : '';
      text += `${i + 1}. ${urgent} *${t.title}*\n   Vence: ${fmtDate(t.dueDate)} (${daysLeft} días)${assignee}\n\n`;
    });

    text += '_Escribe "menu" para volver_';

    return { text };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd vencimientos:', err.message);
    return { text: '❌ Error al obtener vencimientos. Intenta de nuevo.' };
  }
}

// ─── LINKING FLOW (nuevo usuario sin vínculo) ───

export interface LinkingState {
  step: 'start' | 'waiting_email' | 'waiting_code' | 'linked';
  email?: string;
  code?: string;
  attempts?: number;
}

const LINKING_CODES = new Map<string, { email: string; code: string; expires: number }>();

/**
 * Genera código de 6 dígitos para vincular
 */
export function generateLinkCode(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  LINKING_CODES.set(email, {
    email,
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutos
  });
  return code;
}

/**
 * Verifica el código de vinculación
 */
export function verifyLinkCode(email: string, code: string): boolean {
  const entry = LINKING_CODES.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    LINKING_CODES.delete(email);
    return false;
  }
  return entry.code === code;
}

/**
 * Obtiene el primer mensaje para un usuario no vinculado
 */
export function getWelcomeMessage(): CommandResult {
  return {
    text: `👋 ¡Bienvenido a *ArchiFlow Bot*!\n\nPara usar el bot necesitas vincular tu cuenta de ArchiFlow.\n\n*Paso 1:* Escribe tu email registrado en ArchiFlow.\n\nEjemplo: juan@email.com`,
    buttons: [
      { id: 'link_start', title: '✅ Vincular cuenta' },
    ],
  };
}

/**
 * Mensaje cuando el usuario envía su email
 */
export function getEmailConfirmation(email: string): CommandResult {
  return {
    text: `📧 Recibido: *${email}*\n\nTe enviamos un código de 6 dígitos. Revisa tu email o el chat de ArchiFlow.\n\nResponde con el código para completar la vinculación.`,
  };
}

/**
 * Mensaje de vinculación exitosa
 */
export function getLinkedSuccess(name: string): CommandResult {
  return {
    text: `✅ ¡Cuenta vinculada exitosamente!\n\nBienvenido, *${name}*.\n\nEscribe *menu* para ver las opciones disponibles.`,
    buttons: [
      { id: 'cmd_tareas', title: '📋 Mis tareas' },
      { id: 'cmd_proyectos', title: '📊 Proyectos' },
    ],
  };
}
