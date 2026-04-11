/**
 * ArchiFlow — WhatsApp Notifications
 * Funciones para enviar notificaciones automáticas a WhatsApp
 * cuando ocurren eventos en ArchiFlow (tareas, gastos, aprobaciones, etc.)
 *
 * Uso desde page.tsx:
 *   import { notifyWhatsApp } from '@/lib/whatsapp-notifications';
 *   await notifyWhatsApp.taskAssigned(userId, taskTitle, projectName);
 */

import { sendWhatsAppMessage } from './whatsapp-service';
import { getLinksByUserId, getAllActiveLinks } from './whatsapp-service';
import { fmtCOP, fmtDate } from './helpers';

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN BASE: Enviar notificación a un usuario por userId
// ═══════════════════════════════════════════════════════════════

async function sendToUser(userId: string, message: string): Promise<void> {
  try {
    const links = await getLinksByUserId(userId);
    for (const link of links) {
      await sendWhatsAppMessage(link.whatsappPhone, message);
    }
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp Notify] Error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN BASE: Broadcast a todos los vinculados
// ═══════════════════════════════════════════════════════════════

async function sendBroadcast(message: string): Promise<void> {
  try {
    const links = await getAllActiveLinks();
    for (const link of links) {
      await sendWhatsAppMessage(link.whatsappPhone, message);
    }
  } catch (err: any) {
    console.error('[ArchiFlow WhatsApp Notify] Error broadcast:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICACIONES ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════

export const notifyWhatsApp = {

  // ─── TAREA ASIGNADA ───
  async taskAssigned(
    userId: string,
    taskTitle: string,
    projectName: string,
    priority?: string,
    dueDate?: string
  ) {
    const prio = priority === 'Alta' ? '🔴' : priority === 'Media' ? '🟡' : '🟢';
    const due = dueDate ? `\n📅 Vence: ${fmtDate(dueDate)}` : '';
    await sendToUser(userId,
      `📋 *Nueva tarea asignada*\n\n${prio} *${taskTitle}*\n📁 Proyecto: ${projectName}${due}\n\n_Abre ArchiFlow para más detalles._`
    );
  },

  // ─── TAREA ACTUALIZADA ───
  async taskUpdated(
    userId: string,
    taskTitle: string,
    newStatus: string
  ) {
    const emoji = newStatus === 'Completado' ? '✅' : newStatus === 'En progreso' ? '🔄' : newStatus === 'En revisión' ? '👀' : '📌';
    await sendToUser(userId,
      `${emoji} *Tarea actualizada*\n\n*${taskTitle}*\nEstado: ${newStatus}`
    );
  },

  // ─── TAREA PRÓXIMA A VENCER ───
  async taskDueSoon(
    userId: string,
    taskTitle: string,
    projectName: string,
    daysLeft: number
  ) {
    const urgent = daysLeft <= 1 ? '🔴 ¡URGENTE!' : daysLeft <= 3 ? '🟡 Próximo a vencer' : '📅 Recordatorio';
    await sendToUser(userId,
      `${urgent}\n\n📋 *${taskTitle}*\n📁 ${projectName}\n⏰ ${daysLeft === 0 ? 'Vence HOY' : daysLeft === 1 ? 'Vence MAÑANA' : `Vence en ${daysLeft} días`}\n\n_Abre ArchiFlow para más detalles._`
    );
  },

  // ─── GASTO NUEVO ───
  async expenseCreated(
    userId: string,
    concept: string,
    amount: number,
    projectName: string,
    category?: string
  ) {
    await sendToUser(userId,
      `💰 *Nuevo gasto registrado*\n\n*${concept}*\n💵 ${fmtCOP(amount)}\n📁 ${projectName}${category ? `\n🏷️ ${category}` : ''}\n\n_Abre ArchiFlow para ver detalles._`
    );
  },

  // ─── PRESUPUESTO ALERTA (>80% usado) ───
  async budgetAlert(
    userId: string,
    projectName: string,
    spent: number,
    budget: number,
    percentage: number
  ) {
    const emoji = percentage >= 100 ? '🔴' : percentage >= 90 ? '🟠' : '🟡';
    await sendToUser(userId,
      `${emoji} *Alerta de presupuesto*\n\n📁 *${projectName}*\n💵 Gastado: ${fmtCOP(spent)} de ${fmtCOP(budget)} (${percentage}%)\n_${percentage >= 100 ? '¡Presupuesto agotado!' : 'Revisa los gastos del proyecto.'}_\n\n_Abre ArchiFlow para más detalles._`
    );
  },

  // ─── APROBACIÓN PENDIENTE ───
  async approvalPending(
    userId: string,
    title: string,
    projectName: string,
    requestedBy: string
  ) {
    await sendToUser(userId,
      `👀 *Nueva aprobación pendiente*\n\n*${title}*\n📁 ${projectName}\n👤 Solicitada por: ${requestedBy}\n\n_Abre ArchiFlow para revisar y aprobar._`
    );
  },

  // ─── APROBACIÓN RESUELTA ───
  async approvalResolved(
    userId: string,
    title: string,
    status: string,
    resolvedBy?: string
  ) {
    const emoji = status === 'Aprobado' ? '✅' : '❌';
    await sendToUser(userId,
      `${emoji} *Aprobación ${status}*\n\n*${title}*${resolvedBy ? `\n👤 ${resolvedBy}` : ''}\n\n_Abre ArchiFlow para más detalles._`
    );
  },

  // ─── PROYECTO ACTUALIZADO ───
  async projectUpdated(
    userId: string,
    projectName: string,
    update: string
  ) {
    await sendToUser(userId,
      `📊 *Actualización de proyecto*\n\n📁 *${projectName}*\n${update}\n\n_Abre ArchiFlow para más detalles._`
    );
  },

  // ─── RESUMEN SEMANAL (broadcast) ───
  async weeklySummary(data: {
    totalProjects: number;
    completedTasks: number;
    newExpenses: number;
    totalSpent: number;
    pendingApprovals: number;
  }) {
    await sendBroadcast(
      `📊 *Resumen semanal ArchiFlow*\n\n` +
      `📁 Proyectos activos: ${data.totalProjects}\n` +
      `✅ Tareas completadas: ${data.completedTasks}\n` +
      `💰 Gastos nuevos: ${data.newExpenses} (${fmtCOP(data.totalSpent)})\n` +
      `👀 Aprobaciones pendientes: ${data.pendingApprovals}\n\n` +
      `_Abre ArchiFlow para ver detalles._`
    );
  },

  // ─── MENSAJE PERSONALIZADO ───
  async custom(userId: string, message: string) {
    await sendToUser(userId, message);
  },

  // ─── BROADCAST PERSONALIZADO ───
  async customBroadcast(message: string) {
    await sendBroadcast(message);
  },
};
