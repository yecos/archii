/**
 * budget-alerts.ts
 * Budget Alert System — monitors project spending against thresholds
 * and fires notifications when 80%, 90%, or 100% is crossed.
 *
 * Uses localStorage to avoid duplicate alerts per threshold per project.
 */

import type { Project, Expense } from '@/lib/types';

/* ===== CONFIGURABLE THRESHOLDS ===== */
export const BUDGET_THRESHOLDS = [
  { pct: 80, label: '80%', color: '#f59e0b', emoji: '⚠️', severity: 'warning' as const },
  { pct: 90, label: '90%', color: '#f97316', emoji: '🔶', severity: 'danger' as const },
  { pct: 100, label: '100%', color: '#ef4444', emoji: '🚨', severity: 'critical' as const },
] as const;

export type BudgetAlertSeverity = typeof BUDGET_THRESHOLDS[number]['severity'];

const LS_KEY = 'archiflow-budget-alerts';

/* ===== TYPES ===== */
export interface BudgetAlert {
  projectId: string;
  projectName: string;
  threshold: number;     // 80, 90, or 100
  label: string;         // '80%', '90%', '100%'
  severity: BudgetAlertSeverity;
  emoji: string;
  spent: number;
  budget: number;
  percentage: number;    // actual percentage (may be > 100)
  timestamp: number;
}

export interface BudgetProjectStatus {
  projectId: string;
  projectName: string;
  budget: number;
  spent: number;
  percentage: number;
  highestThreshold?: BudgetAlert;
}

/* ===== HELPERS ===== */

/** Get the color class for a budget percentage (CSS var / Tailwind) */
export function getBudgetColorClass(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 90) return 'bg-orange-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

/** Get the text color class for a budget percentage */
export function getBudgetTextColorClass(pct: number): string {
  if (pct >= 100) return 'text-red-400';
  if (pct >= 90) return 'text-orange-400';
  if (pct >= 80) return 'text-amber-400';
  return 'text-emerald-400';
}

/** Get the border color class for a budget percentage */
export function getBudgetBorderColorClass(pct: number): string {
  if (pct >= 100) return 'border-red-500/30';
  if (pct >= 90) return 'border-orange-500/30';
  if (pct >= 80) return 'border-amber-500/30';
  return 'border-emerald-500/30';
}

/** Get background tint class */
export function getBudgetBgClass(pct: number): string {
  if (pct >= 100) return 'bg-red-500/10';
  if (pct >= 90) return 'bg-orange-500/10';
  if (pct >= 80) return 'bg-amber-500/10';
  return 'bg-emerald-500/10';
}

/** Get the raw color string for a budget percentage */
export function getBudgetColor(pct: number): string {
  if (pct >= 100) return '#ef4444';
  if (pct >= 90) return '#f97316';
  if (pct >= 80) return '#f59e0b';
  return '#10b981';
}

/* ===== LOCALSTORAGE MANAGEMENT ===== */

interface AlertRecord {
  [projectThresholdKey: string]: number; // timestamp of last alert
}

function getAlertedThresholds(): AlertRecord {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markThresholdAlerted(projectId: string, threshold: number): void {
  try {
    const record = getAlertedThresholds();
    record[`${projectId}:${threshold}`] = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('[ArchiFlow] Budget alert localStorage error:', err);
  }
}

function hasThresholdBeenAlerted(projectId: string, threshold: number): boolean {
  const record = getAlertedThresholds();
  return !!record[`${projectId}:${threshold}`];
}

/**
 * Reset alerts for a project (e.g., when budget is increased).
 * This allows thresholds to re-trigger after the budget change.
 */
export function resetProjectAlerts(projectId: string): void {
  try {
    const record = getAlertedThresholds();
    Object.keys(record).forEach(key => {
      if (key.startsWith(`${projectId}:`)) {
        delete record[key];
      }
    });
    localStorage.setItem(LS_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('[ArchiFlow] Budget alert reset error:', err);
  }
}

/* ===== CORE ALERT CHECKER ===== */

/**
 * Calculates project budget statuses and detects new threshold crossings.
 * Returns both the current status of all projects AND any new alerts that should fire.
 *
 * @param projects - Array of Project objects
 * @param expenses - Array of Expense objects
 * @returns { statuses, newAlerts }
 */
export function checkBudgetAlerts(
  projects: Project[],
  expenses: Expense[],
): { statuses: BudgetProjectStatus[]; newAlerts: BudgetAlert[] } {
  const statuses: BudgetProjectStatus[] = [];
  const newAlerts: BudgetAlert[] = [];

  // Pre-compute expense totals per project
  const spentByProject: Record<string, number> = {};
  expenses.forEach((e: Expense) => {
    const pid = e.data.projectId;
    if (pid) {
      spentByProject[pid] = (spentByProject[pid] || 0) + (Number(e.data.amount) || 0);
    }
  });

  for (const project of projects) {
    const budget = Number(project.data.budget) || 0;
    if (budget <= 0) continue; // Skip projects without a budget

    const spent = spentByProject[project.id] || 0;
    const percentage = (spent / budget) * 100;

    const status: BudgetProjectStatus = {
      projectId: project.id,
      projectName: project.data.name,
      budget,
      spent,
      percentage,
    };

    // Check each threshold from highest to lowest
    for (const threshold of [...BUDGET_THRESHOLDS].reverse()) {
      if (percentage >= threshold.pct) {
        const alert: BudgetAlert = {
          projectId: project.id,
          projectName: project.data.name,
          threshold: threshold.pct,
          label: threshold.label,
          severity: threshold.severity,
          emoji: threshold.emoji,
          spent,
          budget,
          percentage,
          timestamp: Date.now(),
        };
        status.highestThreshold = alert;

        // Only fire a new notification if this threshold hasn't been alerted yet
        if (!hasThresholdBeenAlerted(project.id, threshold.pct)) {
          markThresholdAlerted(project.id, threshold.pct);
          newAlerts.push(alert);
        }
        break; // Only care about the highest crossed threshold for status display
      }
    }

    statuses.push(status);
  }

  // Sort newAlerts by severity (critical first)
  newAlerts.sort((a, b) => b.threshold - a.threshold);

  return { statuses, newAlerts };
}

/**
 * Get all currently active budget alerts (for dashboard display).
 * An "active" alert means a project has crossed a threshold,
 * regardless of whether a notification was already sent.
 */
export function getActiveAlerts(projects: Project[], expenses: Expense[]): BudgetAlert[] {
  const { statuses } = checkBudgetAlerts(projects, expenses);
  const alerts: BudgetAlert[] = [];
  for (const status of statuses) {
    if (status.highestThreshold) {
      alerts.push(status.highestThreshold);
    }
  }
  // Sort: critical first
  alerts.sort((a, b) => b.threshold - a.threshold);
  return alerts;
}

/**
 * Format a budget alert for notification display.
 */
export function formatBudgetAlertMessage(alert: BudgetAlert): { title: string; body: string } {
  const pctStr = Math.round(alert.percentage).toString();
  return {
    title: `${alert.emoji} Presupuesto ${alert.severity === 'critical' ? 'excedido' : 'cercano al límite'} — ${alert.projectName}`,
    body: `Gastado: ${formatNumber(alert.spent)} de ${formatNumber(alert.budget)} (${pctStr}% del presupuesto)`,
  };
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
