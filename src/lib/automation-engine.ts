import { getFirebase } from './firebase-service';

/**
 * automation-engine.ts
 * Rule-based workflow automation engine for Archiflow.
 * Evaluates triggers, checks conditions, and executes actions.
 */

/* ===== TYPES ===== */

export type TriggerType =
  | 'task_status_change'
  | 'budget_threshold'
  | 'task_overdue'
  | 'phase_change'
  | 'new_expense';

export type ActionType =
  | 'notify_user'
  | 'change_status'
  | 'create_task'
  | 'send_whatsapp'
  | 'add_tag';

export interface TriggerCondition {
  /** For task_status_change: the target status (e.g. 'Completado') */
  status?: string;
  /** For budget_threshold: percentage number (0–100) */
  threshold?: number;
  /** For task_overdue: number of days overdue */
  days?: number;
  /** For phase_change: the target phase status */
  phaseStatus?: string;
  /** For new_expense: minimum amount threshold */
  minAmount?: number;
}

export interface Trigger {
  type: TriggerType;
  conditions: TriggerCondition;
}

export interface ActionParams {
  /** For notify_user: target role or userId ('assignees', 'admin', 'director', etc.) */
  target?: string;
  /** For notify_user: custom message template */
  message?: string;
  /** For change_status: new status value */
  newStatus?: string;
  /** For change_status: new priority value */
  newPriority?: string;
  /** For create_task: task title template */
  taskTitle?: string;
  /** For create_task: task description template */
  taskDesc?: string;
  /** For create_task: project ID */
  projectId?: string;
  /** For send_whatsapp: phone number or role */
  phone?: string;
  /** For send_whatsapp: message template */
  whatsappMessage?: string;
  /** For add_tag: tag value to add */
  tag?: string;
}

export interface Action {
  type: ActionType;
  params: ActionParams;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: Trigger;
  action: Action;
  createdAt: string;
  lastTriggeredAt?: string;
}

/* ===== EVALUATION CONTEXT ===== */

export interface EvaluationContext {
  /** The event trigger type that happened */
  eventType: TriggerType;
  /** Task data (for task-related triggers) */
  task?: { id: string; status: string; priority: string; dueDate: string; assigneeId: string; assigneeIds?: string[]; projectId: string; title: string; phase?: string };
  /** Previous task data (for change detection) */
  previousStatus?: string;
  /** Project data (for budget/phase triggers) */
  project?: { id: string; budget: number; status: string; phase?: string; name: string };
  /** Expense data (for new_expense trigger) */
  expense?: { id: string; amount: number; projectId: string; concept: string; category: string };
  /** Computed budget usage percentage */
  budgetUsage?: number;
  /** All tasks in a project (for phase completion checks) */
  projectTasks?: { id: string; status: string; phase?: string }[];
  /** User info (for targeting notifications) */
  currentUser?: { uid: string; displayName: string; role?: string };
  /** Team users (for targeting by role) */
  teamUsers?: { id: string; data: { name: string; email: string; role?: string } }[];
}

/* ===== EXECUTION LOG ===== */

export interface ExecutionLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  result: 'triggered' | 'skipped' | 'error';
  reason: string;
  context: string;
}

/* ===== TRIGGER LABELS & HELPERS ===== */

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  task_status_change: 'Cambio de estado de tarea',
  budget_threshold: 'Umbral de presupuesto',
  task_overdue: 'Tarea vencida',
  phase_change: 'Cambio de fase',
  new_expense: 'Nuevo gasto',
};

export const TRIGGER_ICONS: Record<TriggerType, string> = {
  task_status_change: '🔄',
  budget_threshold: '💰',
  task_overdue: '⏰',
  phase_change: '📁',
  new_expense: '🧾',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  notify_user: 'Notificar usuario',
  change_status: 'Cambiar estado',
  create_task: 'Crear tarea',
  send_whatsapp: 'Enviar WhatsApp',
  add_tag: 'Agregar etiqueta',
};

export const ACTION_ICONS: Record<ActionType, string> = {
  notify_user: '🔔',
  change_status: '✏️',
  create_task: '➕',
  send_whatsapp: '📱',
  add_tag: '🏷️',
};

/* ===== CONDITION SUMMARY ===== */

export function getTriggerSummary(trigger: Trigger): string {
  const { type, conditions } = trigger;
  switch (type) {
    case 'task_status_change':
      return `Estado → ${conditions.status || 'cualquiera'}`;
    case 'budget_threshold':
      return `Presupuesto ≥ ${conditions.threshold ?? 90}%`;
    case 'task_overdue':
      return `Vencida ≥ ${conditions.days ?? 3} días`;
    case 'phase_change':
      return `Fase → ${conditions.phaseStatus || 'completada'}`;
    case 'new_expense':
      return `Monto > $${(conditions.minAmount ?? 0).toLocaleString('es-CO')}`;
    default:
      return type;
  }
}

export function getActionSummary(action: Action): string {
  const { type, params } = action;
  switch (type) {
    case 'notify_user':
      return `Notificar a ${params.target || 'usuario'}`;
    case 'change_status':
      return `Estado → ${params.newStatus || params.newPriority || 'nuevo valor'}`;
    case 'create_task':
      return `Crear: "${params.taskTitle || 'tarea'}"`;
    case 'send_whatsapp':
      return `WhatsApp a ${params.phone || 'contacto'}`;
    case 'add_tag':
      return `Etiqueta: ${params.tag || 'nueva'}`;
    default:
      return type;
  }
}

/* ===== CORE FUNCTIONS ===== */

/**
 * Evaluate whether a rule's trigger conditions are met given the current context.
 */
export function evaluateRule(rule: AutomationRule, context: EvaluationContext): boolean {
  if (!rule.enabled) return false;

  const { trigger } = rule;

  // First check: trigger type must match event type
  if (trigger.type !== context.eventType) return false;

  switch (trigger.type) {
    case 'task_status_change': {
      const target = trigger.conditions.status;
      if (!target) return true; // No specific status = any change triggers
      return context.task?.status === target;
    }

    case 'budget_threshold': {
      const threshold = trigger.conditions.threshold ?? 90;
      return (context.budgetUsage ?? 0) >= threshold;
    }

    case 'task_overdue': {
      const days = trigger.conditions.days ?? 3;
      if (!context.task?.dueDate) return false;
      const dueDate = new Date(context.task.dueDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= days && context.task.status !== 'Completado';
    }

    case 'phase_change': {
      const targetStatus = trigger.conditions.phaseStatus;
      if (!context.projectTasks || !targetStatus) return false;
      // Check if ALL tasks in the project are in the target status
      if (context.projectTasks.length === 0) return false;
      return context.projectTasks.every(t => t.status === targetStatus);
    }

    case 'new_expense': {
      const minAmount = trigger.conditions.minAmount ?? 0;
      return (context.expense?.amount ?? 0) > minAmount;
    }

    default:
      return false;
  }
}

/**
 * Execute the action associated with a triggered rule.
 * Uses callback functions injected via context extras.
 */
export async function executeRule(
  rule: AutomationRule,
  context: EvaluationContext,
  callbacks: {
    sendNotif?: (title: string, body: string, icon?: string) => void;
    changeTaskStatus?: (taskId: string, newStatus: string) => Promise<void>;
    showToast?: (message: string, type?: string) => void;
    saveTask?: (data: Record<string, any>) => Promise<void>;
  } = {},
): Promise<void> {
  const { action } = rule;

  switch (action.type) {
    case 'notify_user': {
      const target = action.params.target || 'admin';
      const message = action.params.message || `Regla automática: ${rule.name}`;

      let title = `🤖 ${rule.name}`;
      let body = message;

      if (context.task) {
        body = `${message}\nTarea: ${context.task.title}`;
      }
      if (context.project) {
        body += `\nProyecto: ${context.project.name}`;
      }
      if (context.expense) {
        body = `${message}\nGasto: ${context.expense.concept} — $${context.expense.amount.toLocaleString('es-CO')}`;
      }

      // Only send if current user matches target
      const userRole = context.currentUser?.role || '';
      const shouldSend =
        target === 'all' ||
        (target === 'admin' && ['Admin', 'Director'].includes(userRole)) ||
        (target === 'director' && userRole === 'Director') ||
        (target === 'assignees' && (context.task?.assigneeId === context.currentUser?.uid || context.task?.assigneeIds?.includes(context.currentUser?.uid || '')));

      if (shouldSend) {
        callbacks.sendNotif?.(title, body, ACTION_ICONS[action.type]);
      }
      break;
    }

    case 'change_status': {
      if (!context.task?.id) break;
      const newStatus = action.params.newStatus;
      const newPriority = action.params.newPriority;

      if (newPriority && newPriority !== context.task.priority) {
        // Change priority via update
        try {
          const fb = getFirebase();
          if (fb?.firestore) {
            await fb.firestore().collection('tasks').doc(context.task.id).update({
              priority: newPriority,
              updatedAt: fb.firestore.FieldValue.serverTimestamp(),
            });
            callbacks.showToast?.(`⚡ Prioridad cambiada a "${newPriority}" por regla automática`);
          }
        } catch (err) {
          console.warn('[AutomationEngine] change_status error:', err);
        }
      } else if (newStatus && newStatus !== context.task.status) {
        callbacks.changeTaskStatus?.(context.task.id, newStatus);
        callbacks.showToast?.(`⚡ Estado cambiado a "${newStatus}" por regla automática`);
      }
      break;
    }

    case 'create_task': {
      try {
        const fb = getFirebase();
        if (!fb?.firestore) break;
        const db = fb.firestore();
        const taskData = {
          title: action.params.taskTitle || `Auto: ${rule.name}`,
          projectId: action.params.projectId || context.task?.projectId || context.expense?.projectId || '',
          assigneeId: context.currentUser?.uid || '',
          priority: 'Media' as string,
          status: 'Por hacer' as string,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: action.params.taskDesc || `Creada automáticamente por la regla: ${rule.name}`,
          createdAt: fb.firestore.FieldValue.serverTimestamp(),
          createdBy: context.currentUser?.uid,
        };
        await db.collection('tasks').add(taskData);
        callbacks.showToast?.(`➕ Tarea creada automáticamente por regla`);
      } catch (err) {
        console.warn('[AutomationEngine] create_task error:', err);
      }
      break;
    }

    case 'send_whatsapp': {
      // Trigger WhatsApp notification via API
      try {
        const phone = action.params.phone || '';
        const msg = action.params.whatsappMessage || `Regla automática: ${rule.name}`;
        if (phone) {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message: msg }),
          });
          callbacks.showToast?.(`📱 WhatsApp enviado por regla automática`);
        }
      } catch (err) {
        console.warn('[AutomationEngine] send_whatsapp error:', err);
      }
      break;
    }

    case 'add_tag': {
      // Add a tag to the task via Firestore update
      if (!context.task?.id) break;
      try {
        const fb = getFirebase();
        if (fb?.firestore) {
          const tag = action.params.tag || 'auto';
          const existing = context.task as Record<string, unknown>;
          const tags: string[] = Array.isArray(existing.tags) ? existing.tags as string[] : [];
          if (!tags.includes(tag)) {
            await fb.firestore().collection('tasks').doc(context.task.id).update({
              tags: [...tags, tag],
              updatedAt: fb.firestore.FieldValue.serverTimestamp(),
            });
            callbacks.showToast?.(`🏷️ Etiqueta "${tag}" agregada por regla automática`);
          }
        }
      } catch (err) {
        console.warn('[AutomationEngine] add_tag error:', err);
      }
      break;
    }
  }
}

/* ===== DEFAULT RULES ===== */

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'default-notify-complete',
    name: 'Notificar al completar tarea',
    description: 'Envía una notificación cuando una tarea cambia a estado Completado',
    enabled: true,
    trigger: { type: 'task_status_change', conditions: { status: 'Completado' } },
    action: { type: 'notify_user', params: { target: 'assignees', message: '✅ Tarea completada' } },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-budget-alert-90',
    name: 'Alerta presupuesto > 90%',
    description: 'Notifica al administrador cuando el presupuesto del proyecto supera el 90%',
    enabled: true,
    trigger: { type: 'budget_threshold', conditions: { threshold: 90 } },
    action: { type: 'notify_user', params: { target: 'admin', message: '🚨 El presupuesto ha superado el 90%. Revisa los gastos del proyecto.' } },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-overdue-urgent',
    name: 'Mover tarea vencida',
    description: 'Cambia la prioridad a Urgente cuando una tarea lleva más de 3 días vencida',
    enabled: true,
    trigger: { type: 'task_overdue', conditions: { days: 3 } },
    action: { type: 'change_status', params: { newPriority: 'Urgente' } },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-phase-complete',
    name: 'Marcar fase completada',
    description: 'Detecta cuando todas las tareas de una fase están completadas',
    enabled: true,
    trigger: { type: 'phase_change', conditions: { phaseStatus: 'Completado' } },
    action: { type: 'notify_user', params: { target: 'admin', message: '🎉 Todas las tareas de la fase están completadas' } },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-expense-500k',
    name: 'Notificar nuevo gasto > $500K',
    description: 'Envía una alerta al director cuando se registra un gasto mayor a $500,000',
    enabled: true,
    trigger: { type: 'new_expense', conditions: { minAmount: 500000 } },
    action: { type: 'notify_user', params: { target: 'director', message: '💰 Se ha registrado un gasto elevado que requiere revisión.' } },
    createdAt: new Date().toISOString(),
  },
];

/* ===== HELPERS ===== */

/** Generate a unique ID for a new rule */
export function generateRuleId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a blank rule template for the form */
export function createBlankRule(): Omit<AutomationRule, 'id' | 'createdAt'> {
  return {
    name: '',
    description: '',
    enabled: true,
    trigger: { type: 'task_status_change', conditions: {} },
    action: { type: 'notify_user', params: { target: 'assignees' } },
  };
}
