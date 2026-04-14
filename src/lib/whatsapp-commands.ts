/**
 * ArchiFlow — WhatsApp Commands v2.0
 * Parsea comandos del usuario y genera respuestas con datos de Firestore.
 * Soporta comandos enriquecidos: resumen, estado, gastos, tareas, equipo, ayuda.
 */

import { fmtCOP, fmtDate } from './helpers';

// ─── Types ───

interface CommandResult {
  text: string;
  buttons?: { id: string; title: string }[];
}

// ─── Internal helpers ───

/** Trunca un mensaje al limite de caracteres de WhatsApp (4096). */
function truncateMessage(text: string, maxChars = 4090): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 40) + '\n\n_... (mensaje truncado por limite de caracteres)_';
}

/** Formato COP completo con separadores de miles (sin abreviacion). */
function fmtCOPFull(n: number): string {
  if (!n || n === 0) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

/** Busca un proyecto por nombre con coincidencia difusa (case-insensitive substring). */
async function findProjectByName(query: string, db: any): Promise<any | null> {
  if (!query) return null;

  const snap = await db.collection('projects').limit(100).get();
  if (snap.empty) return null;

  const projects = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  // 1. Coincidencia exacta (case-insensitive)
  const exact = projects.find((p: any) => p.name?.toLowerCase() === query.toLowerCase());
  if (exact) return exact;

  // 2. El query es substring del nombre del proyecto
  const substr = projects.find((p: any) =>
    p.name?.toLowerCase().includes(query.toLowerCase())
  );
  if (substr) return substr;

  // 3. El nombre del proyecto es substring del query
  const reverse = projects.find((p: any) =>
    query.toLowerCase().includes(p.name?.toLowerCase())
  );
  if (reverse) return reverse;

  // 4. Palabras individuales del query
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryWords.length > 0) {
    const wordMatch = projects.find((p: any) =>
      queryWords.some((w: string) => p.name?.toLowerCase().includes(w) && w.length >= 3)
    );
    if (wordMatch) return wordMatch;
  }

  return null;
}

/** Carga un mapa de userId → nombre de todos los usuarios. */
async function loadUserNames(db: any): Promise<Record<string, string>> {
  try {
    const snap = await db.collection('users').limit(200).get();
    const map: Record<string, string> = {};
    snap.docs.forEach((d: any) => {
      const data = d.data();
      map[d.id] = data.name || data.displayName || 'Desconocido';
    });
    return map;
  } catch {
    return {};
  }
}

/** Obtiene el nombre de un usuario por ID. */
async function getUserName(userId: string, db: any, cache?: Record<string, string>): Promise<string> {
  if (!userId) return 'Sin asignar';
  if (cache && cache[userId]) return cache[userId];
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) return 'Desconocido';
    const data = snap.data();
    return data.name || data.displayName || 'Desconocido';
  } catch {
    return 'Desconocido';
  }
}

/** Estatus emoji para proyectos. */
function projectStatusEmoji(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('completado') || s === 'entrega') return '✅';
  if (s.includes('pausado')) return '⏸️';
  if (s.includes('cancelado')) return '❌';
  if (s.includes('ejecución') || s.includes('ejecucion') || s.includes('proyecto')) return '🔄';
  if (s.includes('concepto') || s.includes('anteproyecto')) return '📐';
  return '📌';
}

/** Prioridad emoji para tareas. */
function priorityEmoji(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'urgente') return '🔴';
  if (p === 'alta') return '🟠';
  if (p === 'media') return '🟡';
  return '🟢';
}

// ─── MAIN MENU ───

export function getMainMenu(): CommandResult {
  return {
    text: `*ArchiFlow Bot v2.0*\n\nElige una opcion:\n\n1. Mis tareas pendientes\n2. Estado de proyectos\n3. Presupuesto\n4. Equipo\n5. Proximos vencimientos\n\n_O tambien escribe un comando:\nresumen, estado, gastos, tareas, equipo, ayuda_`,
    buttons: [
      { id: 'cmd_tareas', title: 'Mis tareas' },
      { id: 'cmd_proyectos', title: 'Proyectos' },
      { id: 'cmd_presupuesto', title: 'Presupuesto' },
    ],
  };
}

// ─── COMMAND ROUTER ───

export async function processCommand(
  rawMessage: string,
  link: any,
  db: any
): Promise<CommandResult> {
  const msg = rawMessage.toLowerCase().trim();

  // Extraer primera palabra y argumentos
  const parts = msg.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1).join(' ').trim();

  // ── Comandos enriquecidos (prioridad alta) ──

  // resumen / dashboard — Resumen diario
  if (cmd === 'resumen' || cmd === 'dashboard') {
    return await cmdResumen(db);
  }

  // estado [proyecto] — Estado de proyecto(s)
  if (cmd === 'estado') {
    return await cmdEstado(args, db);
  }

  // gastos [proyecto] — Reporte de gastos
  if (cmd === 'gastos') {
    return await cmdGastos(args, db);
  }

  // tareas [proyecto] — Resumen de tareas
  if (cmd === 'tareas') {
    return await cmdTareas(args, db);
  }

  // equipo — Vista del equipo
  if (cmd === 'equipo') {
    return await cmdEquipo(db);
  }

  // ayuda / help — Lista de comandos
  if (cmd === 'ayuda' || cmd === 'help') {
    return cmdAyuda();
  }

  // ── Comandos legacy / botones ──

  if (msg === 'cmd_tareas' || msg === '1') {
    return await cmdMisTareas(link, db);
  }
  if (msg === 'cmd_proyectos' || msg === '2') {
    return await cmdProyectos(db);
  }
  if (msg === 'cmd_presupuesto' || msg === '3') {
    return await cmdPresupuesto(db);
  }
  if (msg === 'cmd_equipo' || msg === '4') {
    return await cmdEquipo(db);
  }
  if (msg === 'cmd_vencimientos' || msg === '5') {
    return await cmdVencimientos(db);
  }
  if (msg.includes('menu') || msg.includes('inicio') || msg === '0') {
    return getMainMenu();
  }

  // ── Fallback para frases comunes ──
  if (msg.includes('mis tarea')) {
    return await cmdMisTareas(link, db);
  }
  if (msg.includes('ver proyecto') && !msg.includes('estado')) {
    return await cmdProyectos(db);
  }
  if (msg.includes('presupuesto')) {
    return await cmdPresupuesto(db);
  }
  if (msg.includes('vencimiento') || msg.includes('fecha limite')) {
    return await cmdVencimientos(db);
  }

  return {
    text: `No entendi ese comando.\n\nEscribe *ayuda* para ver todos los comandos disponibles.`,
  };
}

// ═══════════════════════════════════════════════════════════
//  NUEVOS COMANDOS ENRIQUECIDOS
// ═══════════════════════════════════════════════════════════

// ─── COMANDO: Resumen diario ───
async function cmdResumen(db: any): Promise<CommandResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userNames = await loadUserNames(db);

    // ── Proyectos activos ──
    const projectsSnap = await db.collection('projects').limit(100).get();
    const allProjects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const activeProjects = allProjects.filter(
      (p: any) => p.status !== 'Completado' && p.status !== 'Cancelado'
    );

    // ── Todas las tareas ──
    const tasksSnap = await db.collection('tasks').limit(500).get();
    const allTasks = tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const activeStatuses = ['Pendiente', 'En progreso', 'En revisión', 'Por hacer'];
    const activeTasks = allTasks.filter((t: any) => activeStatuses.includes(t.status));

    // Tareas vencidas (dueDate < hoy, no completadas)
    const overdueTasks = activeTasks.filter((t: any) => t.dueDate && t.dueDate < today);

    // Tareas para hoy
    const dueTodayTasks = activeTasks.filter((t: any) => t.dueDate === today);

    // Tareas de alta prioridad
    const highPriorityTasks = activeTasks.filter(
      (t: any) => t.priority === 'Alta' || t.priority === 'Urgente'
    );

    // ── Gastos de hoy ──
    const expensesSnap = await db.collection('expenses').limit(200).get();
    const allExpenses = expensesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const todayExpenses = allExpenses.filter((e: any) => e.date === today);
    const todaySpent = todayExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    // ── Gastos del mes ──
    const monthStart = today.substring(0, 7) + '-01';
    const monthExpenses = allExpenses.filter(
      (e: any) => e.date && e.date >= monthStart && e.date <= today
    );
    const monthSpent = monthExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    // ── Construir mensaje ──
    let text = `📊 *RESUMEN DIARIO ARCHIFLOW*\n`;
    text += `📅 ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📁 *Proyectos activos: ${activeProjects.length}*\n`;
    const completedToday = allTasks.filter(
      (t: any) => t.status === 'Completado' && t.completedAt
    );
    text += `✅ Tareas completadas hoy: ${completedToday.length}\n\n`;

    text += `📋 *Tareas pendientes: ${activeTasks.length}*\n`;
    text += `  📌 Vencen hoy: ${dueTodayTasks.length}\n`;
    text += `  🔴 Vencidas: ${overdueTasks.length}\n`;
    text += `  🟠 Alta/Urgente: ${highPriorityTasks.length}\n\n`;

    text += `💰 *Gastos de hoy: ${fmtCOPFull(todaySpent)}*\n`;
    text += `  📊 Total del mes: ${fmtCOPFull(monthSpent)}\n\n`;

    // ── Tareas vencidas (top 5) ──
    if (overdueTasks.length > 0) {
      text += `🔴 *TAREAS VENCIDAS (${overdueTasks.length})*\n`;
      const topOverdue = overdueTasks
        .sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5);
      topOverdue.forEach((t: any, i: number) => {
        const assignee = userNames[t.assigneeId] || 'Sin asignar';
        text += `  ${i + 1}. ${priorityEmoji(t.priority)} *${t.title}*\n`;
        text += `     👤 ${assignee} — Vencio: ${fmtDate(t.dueDate)}\n`;
      });
      text += '\n';
    }

    // ── Tareas de hoy ──
    if (dueTodayTasks.length > 0) {
      text += `📌 *TAREAS PARA HOY (${dueTodayTasks.length})*\n`;
      const topToday = dueTodayTasks.slice(0, 5);
      topToday.forEach((t: any, i: number) => {
        const assignee = userNames[t.assigneeId] || 'Sin asignar';
        text += `  ${i + 1}. ${priorityEmoji(t.priority)} *${t.title}*\n`;
        text += `     👤 ${assignee}\n`;
      });
      text += '\n';
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Escribe *ayuda* para ver todos los comandos`;

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd resumen:', err.message);
    return { text: 'Error al generar el resumen. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Estado de proyecto(s) ───
async function cmdEstado(projectQuery: string, db: any): Promise<CommandResult> {
  try {
    const today = new Date().toISOString().split('T')[0];

    if (!projectQuery) {
      // Listar todos los proyectos
      const snap = await db.collection('projects').orderBy('updatedAt', 'desc').limit(20).get();

      if (snap.empty) {
        return { text: 'No hay proyectos registrados aun.' };
      }

      const projects = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      let text = `📁 *ESTADO DE PROYECTOS (${projects.length})*\n\n`;

      projects.forEach((p: any, i: number) => {
        const emoji = projectStatusEmoji(p.status);
        const progress = p.progress !== undefined ? `${p.progress}%` : 'N/A';
        const budget = p.budget ? ` — ${fmtCOP(p.budget)}` : '';
        const phase = p.phase ? `\n     Fase: ${p.phase}` : '';

        text += `${i + 1}. ${emoji} *${p.name}*\n`;
        text += `     Estado: ${p.status} [${progress}]${budget}${phase}\n\n`;
      });

      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Escribe *estado nombre* para ver detalle de un proyecto`;

      return { text: truncateMessage(text) };
    }

    // Buscar proyecto por nombre
    const project = await findProjectByName(projectQuery, db);

    if (!project) {
      return {
        text: `No encontre un proyecto llamado "${projectQuery}".\n\nEscribe *estado* para ver la lista de todos los proyectos.`,
      };
    }

    // Detalle del proyecto
    let text = `📁 *${project.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `${projectStatusEmoji(project.status)} *Estado:* ${project.status}\n`;

    if (project.phase) {
      text += `🏗️ *Fase:* ${project.phase}\n`;
    }

    if (project.progress !== undefined) {
      const pBar = project.progress >= 75 ? '🟢' : project.progress >= 50 ? '🟡' : project.progress >= 25 ? '🟠' : '🔴';
      text += `📊 *Progreso:* ${project.progress}% ${pBar}\n`;
    }

    if (project.client) {
      text += `🤝 *Cliente:* ${project.client}\n`;
    }

    if (project.location) {
      text += `📍 *Ubicacion:* ${project.location}\n`;
    }

    if (project.startDate || project.endDate) {
      text += `📅 *Periodo:* ${project.startDate ? fmtDate(project.startDate) : '?'} → ${project.endDate ? fmtDate(project.endDate) : '?'}\n`;
    }

    // Presupuesto vs gastado
    const budget = Number(project.budget) || 0;
    if (budget > 0) {
      const expensesSnap = await db.collection('expenses').where('projectId', '==', project.id).get();
      const spent = expensesSnap.docs.reduce((sum: number, d: any) => sum + (Number(d.data().amount) || 0), 0);
      const pct = Math.round((spent / budget) * 100);
      const bar = pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢';
      const remaining = budget - spent;

      text += `\n💰 *PRESUPUESTO*\n`;
      text += `  Presupuesto: ${fmtCOPFull(budget)}\n`;
      text += `  Gastado: ${fmtCOPFull(spent)} (${pct}%) ${bar}\n`;
      text += `  Disponible: ${fmtCOPFull(remaining)}\n`;
    }

    // Tareas del proyecto
    const tasksSnap = await db.collection('tasks').where('projectId', '==', project.id).limit(50).get();
    if (!tasksSnap.empty) {
      const tasks = tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const completed = tasks.filter((t: any) => t.status === 'Completado').length;
      const inProgress = tasks.filter((t: any) => t.status === 'En progreso').length;
      const pending = tasks.filter((t: any) => t.status === 'Pendiente' || t.status === 'Por hacer').length;
      const overdue = tasks.filter(
        (t: any) => t.dueDate && t.dueDate < today && t.status !== 'Completado'
      ).length;

      text += `\n📋 *TAREAS DEL PROYECTO*\n`;
      text += `  ✅ Completadas: ${completed}\n`;
      text += `  🔄 En progreso: ${inProgress}\n`;
      text += `  ⬜ Pendientes: ${pending}\n`;
      if (overdue > 0) {
        text += `  🔴 Vencidas: ${overdue}\n`;
      }
      text += `  📊 Total: ${tasks.length}\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Escribe *menu* para volver al menu principal`;

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd estado:', err.message);
    return { text: 'Error al consultar el estado. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Reporte de gastos ───
async function cmdGastos(projectQuery: string, db: any): Promise<CommandResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    if (!projectQuery) {
      // Gastos totales del mes por categoria
      const expensesSnap = await db.collection('expenses').limit(500).get();
      const allExpenses = expensesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const monthExpenses = allExpenses.filter(
        (e: any) => e.date && e.date >= monthStart && e.date <= today
      );

      if (monthExpenses.length === 0) {
        return { text: 'No hay gastos registrados este mes.' };
      }

      // Agrupar por categoria
      const byCategory: Record<string, { total: number; count: number }> = {};
      let totalMonth = 0;

      monthExpenses.forEach((e: any) => {
        const cat = e.category || 'Sin categoria';
        if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
        byCategory[cat].total += Number(e.amount) || 0;
        byCategory[cat].count += 1;
        totalMonth += Number(e.amount) || 0;
      });

      // Ordenar por total descendente
      const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);

      let text = `💰 *REPORTE DE GASTOS DEL MES*\n`;
      text += `📅 ${new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      text += `📊 *Total del mes: ${fmtCOPFull(totalMonth)}*\n`;
      text += `🧾 Transacciones: ${monthExpenses.length}\n\n`;

      text += `*POR CATEGORIA:*\n\n`;
      sorted.forEach(([cat, data]) => {
        const pct = totalMonth > 0 ? Math.round((data.total / totalMonth) * 100) : 0;
        const bar = pct >= 40 ? '████' : pct >= 20 ? '███░' : pct >= 10 ? '██░░' : '█░░░';
        text += `  ${cat}\n`;
        text += `  ${bar} ${fmtCOPFull(data.total)} (${pct}%) — ${data.count} gastos\n\n`;
      });

      // Gastos de hoy
      const todayExpenses = allExpenses.filter((e: any) => e.date === today);
      const todayTotal = todayExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      if (todayTotal > 0) {
        text += `📌 *Gastos de hoy: ${fmtCOPFull(todayTotal)}* (${todayExpenses.length} transacciones)\n\n`;
      }

      // Top 3 gastos del mes
      const topExpenses = [...monthExpenses].sort((a: any, b: any) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 3);
      text += `🔥 *Top 3 gastos:*\n`;
      topExpenses.forEach((e: any, i: number) => {
        text += `  ${i + 1}. ${fmtCOPFull(Number(e.amount) || 0)} — ${e.concept || 'Sin concepto'}\n`;
      });

      text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Escribe *gastos nombre_proyecto* para ver gastos de un proyecto especifico`;

      return { text: truncateMessage(text) };
    }

    // Gastos de un proyecto especifico
    const project = await findProjectByName(projectQuery, db);

    if (!project) {
      return {
        text: `No encontre un proyecto llamado "${projectQuery}".\n\nEscribe *gastos* para ver el resumen mensual general.`,
      };
    }

    const expensesSnap = await db
      .collection('expenses')
      .where('projectId', '==', project.id)
      .limit(200)
      .get();

    if (expensesSnap.empty) {
      return { text: `No hay gastos registrados para *${project.name}*.` };
    }

    const expenses = expensesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Agrupar por categoria
    const byCategory: Record<string, { total: number; count: number }> = {};
    let totalAll = 0;

    expenses.forEach((e: any) => {
      const cat = e.category || 'Sin categoria';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += Number(e.amount) || 0;
      byCategory[cat].count += 1;
      totalAll += Number(e.amount) || 0;
    });

    const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);

    let text = `💰 *GASTOS: ${project.name.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📊 *Total: ${fmtCOPFull(totalAll)}*\n`;
    text += `🧾 Transacciones: ${expenses.length}\n\n`;

    // Presupuesto si existe
    const budget = Number(project.budget) || 0;
    if (budget > 0) {
      const pct = Math.round((totalAll / budget) * 100);
      const bar = pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢';
      text += `💳 Presupuesto: ${fmtCOPFull(budget)}\n`;
      text += `   Utilizado: ${pct}% ${bar}\n`;
      text += `   Disponible: ${fmtCOPFull(budget - totalAll)}\n\n`;
    }

    text += `*POR CATEGORIA:*\n\n`;
    sorted.forEach(([cat, data]) => {
      const pct = totalAll > 0 ? Math.round((data.total / totalAll) * 100) : 0;
      const bar = pct >= 40 ? '████' : pct >= 20 ? '███░' : pct >= 10 ? '██░░' : '█░░░';
      text += `  ${cat}\n`;
      text += `  ${bar} ${fmtCOPFull(data.total)} (${pct}%) — ${data.count} gastos\n\n`;
    });

    // Gastos del mes para este proyecto
    const monthExpenses = expenses.filter(
      (e: any) => e.date && e.date >= monthStart && e.date <= today
    );
    const monthTotal = monthExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    if (monthTotal > 0) {
      text += `📌 *Este mes: ${fmtCOPFull(monthTotal)}* (${monthExpenses.length} gastos)\n\n`;
    }

    // Ultimos 5 gastos
    const recentExpenses = [...expenses]
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);

    text += `🕐 *Ultimos gastos:*\n`;
    recentExpenses.forEach((e: any, i: number) => {
      const date = e.date ? fmtDate(e.date) : '—';
      text += `  ${i + 1}. ${fmtCOPFull(Number(e.amount) || 0)} — ${e.concept || 'Sin concepto'} (${date})\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Escribe *menu* para volver al menu principal`;

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd gastos:', err.message);
    return { text: 'Error al consultar gastos. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Resumen de tareas ───
async function cmdTareas(projectQuery: string, db: any): Promise<CommandResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userNames = await loadUserNames(db);

    if (!projectQuery) {
      // Listar todas las tareas vencidas + alta prioridad
      const snap = await db.collection('tasks').limit(200).get();

      if (snap.empty) {
        return { text: 'No hay tareas registradas.' };
      }

      const allTasks = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const activeStatuses = ['Pendiente', 'En progreso', 'En revisión', 'Por hacer'];
      const activeTasks = allTasks.filter((t: any) => activeStatuses.includes(t.status));

      // Tareas vencidas
      const overdueTasks = activeTasks
        .filter((t: any) => t.dueDate && t.dueDate < today)
        .sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''));

      // Alta prioridad (no vencidas ya listadas)
      const overdueIds = new Set(overdueTasks.map((t: any) => t.id));
      const highPriorityTasks = activeTasks
        .filter(
          (t: any) =>
            (t.priority === 'Alta' || t.priority === 'Urgente') &&
            !overdueIds.has(t.id)
        )
        .sort((a: any, b: any) => {
          const pOrder: Record<string, number> = { Urgente: 0, Alta: 1 };
          return ((pOrder as any)[a.priority] ?? 2) - ((pOrder as any)[b.priority] ?? 2);
        });

      if (overdueTasks.length === 0 && highPriorityTasks.length === 0) {
        return {
          text: `No hay tareas vencidas ni de alta prioridad.\n\nTodo al dia por ahora.`,
        };
      }

      let text = `📋 *RESUMEN DE TAREAS CRITICAS*\n\n`;

      // Vencidas
      if (overdueTasks.length > 0) {
        text += `🔴 *VENCIDAS (${overdueTasks.length})*\n`;
        overdueTasks.slice(0, 10).forEach((t: any, i: number) => {
          const assignee = userNames[t.assigneeId] || 'Sin asignar';
          const daysAgo = Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          text += `  ${i + 1}. ${priorityEmoji(t.priority)} *${t.title}*\n`;
          text += `     👤 ${assignee} — Vencio hace ${daysAgo} dia(s)\n\n`;
        });
      }

      // Alta prioridad
      if (highPriorityTasks.length > 0) {
        text += `\n🟠 *ALTA PRIORIDAD (${highPriorityTasks.length})*\n`;
        highPriorityTasks.slice(0, 10).forEach((t: any, i: number) => {
          const assignee = userNames[t.assigneeId] || 'Sin asignar';
          const due = t.dueDate ? ` — Vence: ${fmtDate(t.dueDate)}` : '';
          text += `  ${i + 1}. ${priorityEmoji(t.priority)} *${t.title}*\n`;
          text += `     👤 ${assignee}${due}\n\n`;
        });
      }

      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Escribe *tareas nombre_proyecto* para ver tareas de un proyecto`;
      text += `\nEscribe *menu* para volver al menu principal`;

      return { text: truncateMessage(text) };
    }

    // Tareas de un proyecto especifico
    const project = await findProjectByName(projectQuery, db);

    if (!project) {
      return {
        text: `No encontre un proyecto llamado "${projectQuery}".\n\nEscribe *tareas* para ver las tareas criticas generales.`,
      };
    }

    const snap = await db.collection('tasks').where('projectId', '==', project.id).limit(100).get();

    if (snap.empty) {
      return { text: `No hay tareas registradas para *${project.name}*.` };
    }

    const tasks = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const activeStatuses = ['Pendiente', 'En progreso', 'En revisión', 'Por hacer'];
    const pendingTasks = tasks
      .filter((t: any) => activeStatuses.includes(t.status))
      .sort((a: any, b: any) => {
        const pOrder: Record<string, number> = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
        const pDiff = (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
        if (pDiff !== 0) return pDiff;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

    if (pendingTasks.length === 0) {
      return { text: `Todas las tareas de *${project.name}* estan completadas.` };
    }

    const completedTasks = tasks.filter((t: any) => t.status === 'Completado').length;

    let text = `📋 *TAREAS: ${project.name.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✅ Completadas: ${completedTasks} | ⬜ Pendientes: ${pendingTasks.length}\n\n`;

    pendingTasks.forEach((t: any, i: number) => {
      const assignee = userNames[t.assigneeId] || 'Sin asignar';
      const due = t.dueDate ? ` — ${fmtDate(t.dueDate)}` : '';
      const isOverdue = t.dueDate && t.dueDate < today;
      const overdueTag = isOverdue ? ' ⚠️VENCIDA' : '';

      text += `${i + 1}. ${priorityEmoji(t.priority)} *${t.title}*${overdueTag}\n`;
      text += `   👤 ${assignee} — ${t.status}${due}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Escribe *menu* para volver al menu principal`;

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd tareas:', err.message);
    return { text: 'Error al consultar tareas. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Equipo (mejorado con conteo de tareas) ───
async function cmdEquipo(db: any): Promise<CommandResult> {
  try {
    // Cargar miembros del equipo
    const usersSnap = await db.collection('users').limit(100).get();
    if (usersSnap.empty) {
      return { text: 'No hay miembros en el equipo.' };
    }

    const members = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Cargar tareas para conteo
    const tasksSnap = await db.collection('tasks').limit(500).get();
    const activeStatuses = ['Pendiente', 'En progreso', 'En revisión', 'Por hacer'];

    // Contar tareas activas por miembro
    const taskCounts: Record<string, { total: number; overdue: number }> = {};
    const today = new Date().toISOString().split('T')[0];

    tasksSnap.docs.forEach((d: any) => {
      const t = d.data();
      const assigneeId = d.data().assigneeId || d.ref?.id;
      if (!assigneeId) return;
      if (!activeStatuses.includes(t.status)) return;

      if (!taskCounts[assigneeId]) taskCounts[assigneeId] = { total: 0, overdue: 0 };
      taskCounts[assigneeId].total += 1;
      if (t.dueDate && t.dueDate < today) {
        taskCounts[assigneeId].overdue += 1;
      }
    });

    // Ordenar: activos primero, luego por cantidad de tareas
    const activeMembers = members
      .filter((m: any) => m.active !== false)
      .sort((a: any, b: any) => {
        const aCount = taskCounts[a.id]?.total || 0;
        const bCount = taskCounts[b.id]?.total || 0;
        return bCount - aCount;
      });

    const inactiveMembers = members.filter((m: any) => m.active === false);

    let text = `👥 *EQUIPO DE TRABAJO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🟢 *Activos (${activeMembers.length})*\n\n`;
    activeMembers.forEach((m: any, i: number) => {
      const role = m.role || 'Miembro';
      const tasks = taskCounts[m.id];
      const taskStr = tasks ? `${tasks.total} tareas` : 'Sin tareas';
      const overdueStr = tasks && tasks.overdue > 0 ? ` (${tasks.overdue} vencidas)` : '';
      const name = m.name || m.displayName || 'Sin nombre';

      text += `${i + 1}. *${name}*\n`;
      text += `   🏷️ ${role} — 📋 ${taskStr}${overdueStr}\n\n`;
    });

    if (inactiveMembers.length > 0) {
      text += `❌ *Inactivos (${inactiveMembers.length})*\n\n`;
      inactiveMembers.slice(0, 5).forEach((m: any, i: number) => {
        const role = m.role || 'Miembro';
        const name = m.name || m.displayName || 'Sin nombre';
        text += `${i + 1}. *${name}* — ${role}\n`;
      });
    }

    // Total equipo
    const totalTasks = Object.values(taskCounts).reduce((s, c) => s + c.total, 0);
    const totalOverdue = Object.values(taskCounts).reduce((s, c) => s + c.overdue, 0);
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 Total tareas activas: ${totalTasks}`;
    if (totalOverdue > 0) text += ` (${totalOverdue} vencidas)`;

    text += `\nEscribe *menu* para volver al menu principal`;

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd equipo:', err.message);
    return { text: 'Error al consultar el equipo. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Ayuda ───
function cmdAyuda(): CommandResult {
  const text = truncateMessage(
    `🤖 *COMANDOS ARCHIFLOW BOT v2.0*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 *resumen* (o *dashboard*)\n` +
    `   Resumen diario del sistema: proyectos activos, tareas pendientes, gastos del dia.\n\n` +
    `📁 *estado* [nombre_proyecto]\n` +
    `   Estado detallado de un proyecto: progreso, presupuesto, tareas.\n` +
    `   Sin nombre: lista todos los proyectos.\n\n` +
    `💰 *gastos* [nombre_proyecto]\n` +
    `   Reporte de gastos por categoria.\n` +
    `   Sin nombre: gastos totales del mes.\n\n` +
    `📋 *tareas* [nombre_proyecto]\n` +
    `   Resumen de tareas pendientes.\n` +
    `   Sin nombre: tareas vencidas y de alta prioridad.\n\n` +
    `👥 *equipo*\n` +
    `   Vista del equipo con roles y tareas activas.\n\n` +
    `🆘 *ayuda* (o *help*)\n` +
    `   Muestra esta lista de comandos.\n\n` +
    `🏠 *menu*\n` +
    `   Vuelve al menu principal.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `_Los nombres de proyecto aceptan coincidencia parcial (no necesitas escribir el nombre completo)._\n\n` +
    `_Ejemplo: gastos casa blanca_`
  );
  return { text };
}

// ═══════════════════════════════════════════════════════════
//  COMANDOS LEGACY (se mantienen para compatibilidad)
// ═══════════════════════════════════════════════════════════

// ─── COMANDO: Mis tareas pendientes ───
async function cmdMisTareas(link: any, db: any): Promise<CommandResult> {
  try {
    const snap = await db
      .collection('tasks')
      .where('assigneeId', '==', link.userId)
      .limit(50)
      .get();

    if (snap.empty) {
      return { text: 'No tienes tareas asignadas.' };
    }

    const activeStatuses = ['Pendiente', 'En progreso', 'En revisión', 'Por hacer'];
    const tasks = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((t: any) => activeStatuses.includes(t.status))
      .sort((a: any, b: any) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 10);

    if (tasks.length === 0) {
      return { text: 'No tienes tareas pendientes. Todo al dia.' };
    }

    let text = `*Tus tareas pendientes (${tasks.length})*\n\n`;

    tasks.forEach((t: any, i: number) => {
      const prio = priorityEmoji(t.priority);
      const status = t.status === 'En progreso' ? '🔄' : t.status === 'En revisión' ? '👀' : '⬜';
      const due = t.dueDate ? ` — Vence: ${fmtDate(t.dueDate)}` : '';
      text += `${i + 1}. ${prio} ${status} *${t.title}*${due}\n`;
    });

    text += '\nEscribe *tareas* para ver tareas criticas o *menu* para volver al menu principal';

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd tareas:', err.message);
    return { text: 'Error al obtener tus tareas. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Estado de proyectos ───
async function cmdProyectos(db: any): Promise<CommandResult> {
  try {
    const snap = await db
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .limit(10)
      .get();

    if (snap.empty) {
      return { text: 'No hay proyectos registrados aun.' };
    }

    const projects = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = `*Proyectos (${projects.length})*\n\n`;

    projects.forEach((p: any, i: number) => {
      const emoji = projectStatusEmoji(p.status);
      const progress = p.progress !== undefined ? `${p.progress}%` : 'N/A';
      const budget = p.budget ? ` — ${fmtCOP(p.budget)}` : '';
      text += `${i + 1}. ${emoji} *${p.name}* [${progress}]${budget}\n`;
    });

    text += '\nEscribe *estado nombre* para ver el detalle de un proyecto';

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd proyectos:', err.message);
    return { text: 'Error al obtener proyectos. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Presupuesto ───
async function cmdPresupuesto(db: any): Promise<CommandResult> {
  try {
    const projectsSnap = await db
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .limit(5)
      .get();

    if (projectsSnap.empty) {
      return { text: 'No hay proyectos con presupuesto.' };
    }

    const projects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let text = '*Resumen de presupuestos*\n\n';

    for (const p of projects) {
      const budget = Number(p.budget) || 0;

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

    text += 'Escribe *gastos* para un reporte detallado o *menu* para volver';

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd presupuesto:', err.message);
    return { text: 'Error al obtener presupuesto. Intenta de nuevo.' };
  }
}

// ─── COMANDO: Proximos vencimientos ───
async function cmdVencimientos(db: any): Promise<CommandResult> {
  try {
    const now = new Date().toISOString().split('T')[0];

    const snap = await db
      .collection('tasks')
      .where('status', 'in', ['Pendiente', 'En progreso', 'Por hacer'])
      .orderBy('dueDate', 'asc')
      .limit(10)
      .get();

    if (snap.empty) {
      return { text: 'No hay tareas con fecha limite proxima.' };
    }

    const tasks = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((t: any) => t.dueDate && t.dueDate >= now);

    if (tasks.length === 0) {
      return { text: 'No hay tareas con fecha limite proxima.' };
    }

    let text = `*Proximos vencimientos (${tasks.length})*\n\n`;

    tasks.forEach((t: any, i: number) => {
      const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const urgent = daysLeft <= 1 ? '🔴 URGENTE' : daysLeft <= 3 ? '🟡 Pronto' : '📅';
      text += `${i + 1}. ${urgent} *${t.title}*\n   Vence: ${fmtDate(t.dueDate)} (${daysLeft} dias)\n\n`;
    });

    text += 'Escribe *menu* para volver';

    return { text: truncateMessage(text) };
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp] Error cmd vencimientos:', err.message);
    return { text: 'Error al obtener vencimientos. Intenta de nuevo.' };
  }
}

// ─── LINKING FLOW ───

const LINKING_CODES = new Map<string, { email: string; code: string; expires: number }>();

export function generateLinkCode(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  LINKING_CODES.set(email, { email, code, expires: Date.now() + 5 * 60 * 1000 });
  return code;
}

export function verifyLinkCode(email: string, code: string): boolean {
  const entry = LINKING_CODES.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    LINKING_CODES.delete(email);
    return false;
  }
  return entry.code === code;
}

export function getWelcomeMessage(): CommandResult {
  return {
    text: `Bienvenido a *ArchiFlow Bot v2.0*!\n\nPara usar el bot necesitas vincular tu cuenta de ArchiFlow.\n\n*Paso 1:* Escribe tu email registrado en ArchiFlow.\n\nEjemplo: juan@email.com`,
    buttons: [{ id: 'link_start', title: 'Vincular cuenta' }],
  };
}

export function getLinkedSuccess(name: string): CommandResult {
  return {
    text: `Cuenta vinculada exitosamente!\n\nBienvenido, *${name}*.\n\nEscribe *ayuda* para ver todos los comandos disponibles.`,
    buttons: [
      { id: 'cmd_tareas', title: 'Mis tareas' },
      { id: 'cmd_proyectos', title: 'Proyectos' },
    ],
  };
}
