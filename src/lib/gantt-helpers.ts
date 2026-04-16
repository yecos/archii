/**
 * gantt-helpers.ts
 * Utilidades puras para el diagrama de Gantt en la pantalla Admin.
 * Extraídas de FirestoreContext para reducir su tamaño.
 */

import type { Task, Project } from '@/lib/types';

export const GANTT_DAYS = 14;
export const GANTT_DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

export const GANTT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'Por hacer': { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  'En progreso': { label: 'En Progreso', color: '#3b82f6', bg: '#eff6ff' },
  'Revision': { label: 'Revisión', color: '#8b5cf6', bg: '#f5f3ff' },
  'Completado': { label: 'Completado', color: '#10b981', bg: '#ecfdf5' },
};

export const GANTT_PRIO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  'Baja': { label: 'Baja', bg: '#f1f5f9', color: '#475569' },
  'Media': { label: 'Media', bg: '#e0f2fe', color: '#0369a1' },
  'Alta': { label: 'Alta', bg: '#ffedd5', color: '#c2410c' },
};

export function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function getGanttDays(weekOffset: number): Date[] {
  const base = getMonday(new Date());
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + weekOffset * 7);
  const days: Date[] = [];
  for (let i = 0; i < GANTT_DAYS; i++) {
    const day = new Date(base);
    day.setDate(day.getDate() + i);
    days.push(day);
  }
  return days;
}

export function getTaskBar(task: Task, days: Date[]): { left: number; width: number } | null {
  if (!task.data?.dueDate) return null;
  const tStart = new Date(task.data.startDate || task.data.dueDate);
  const tEnd = new Date(task.data.dueDate);
  const rangeStart = days[0];
  const rangeEnd = new Date(days[days.length - 1]);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  const DAY_MS = 86400000;
  const rangeSpan = (Number(rangeEnd) - Number(rangeStart)) / DAY_MS;
  if (rangeSpan <= 0) return null;
  const leftPct = Math.max(0, (Number(tStart) - Number(rangeStart)) / DAY_MS / rangeSpan) * 100;
  const widthPct = Math.max(2, ((Number(tEnd) - Number(tStart)) / DAY_MS + 1) / rangeSpan) * 100;
  return { left: leftPct, width: Math.min(widthPct, 100 - leftPct) };
}

export function buildGanttRows(memberTasks: Task[]): Task[][] {
  const rows: Task[][] = [];
  memberTasks.forEach((t: Task) => {
    if (!t.data?.dueDate) return;
    let placed = false;
    for (const row of rows) {
      const overlaps = row.some((r: Task) => {
        if (!r.data?.dueDate || !t.data?.dueDate) return false;
        return new Date(r.data.startDate || r.data.dueDate) <= new Date(t.data.dueDate) &&
               new Date(t.data.startDate || t.data.dueDate) <= new Date(r.data.dueDate);
      });
      if (!overlaps) { row.push(t); placed = true; break; }
    }
    if (!placed) rows.push([t]);
  });
  return rows;
}

export function findOverlaps(memberTasks: Task[]): Set<string> {
  const overlapIds = new Set<string>();
  for (let i = 0; i < memberTasks.length; i++) {
    for (let j = i + 1; j < memberTasks.length; j++) {
      const a = memberTasks[i], b = memberTasks[j];
      if (!a.data?.dueDate || !b.data?.dueDate) continue;
      if (new Date(a.data.startDate || a.data.dueDate) <= new Date(b.data.dueDate) &&
          new Date(b.data.startDate || b.data.dueDate) <= new Date(a.data.dueDate)) {
        overlapIds.add(a.id);
        overlapIds.add(b.id);
      }
    }
  }
  return overlapIds;
}

export function getProjectColor(projId: string, projects: Project[]): string {
  const colors = ['#3b82f6','#8b5cf6','#f43f5e','#10b981','#f59e0b','#06b6d4','#ec4899','#84cc16','#6366f1','#f97316'];
  const idx = projects.findIndex(p => p.id === projId);
  return colors[Math.abs(idx) % colors.length];
}

export function getProjectColorLight(projId: string, projects: Project[]): string {
  const map: Record<string, string> = {
    '#3b82f6':'#dbeafe','#8b5cf6':'#ede9fe','#f43f5e':'#ffe4e6','#10b981':'#d1fae5',
    '#f59e0b':'#fef3c7','#06b6d4':'#cffafe','#ec4899':'#fce7f3','#84cc16':'#ecfccb',
    '#6366f1':'#e0e7ff','#f97316':'#ffedd5',
  };
  return map[getProjectColor(projId, projects)] || '#f5f5f4';
}

export function calcGanttDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
}

export function calcGanttOffset(phaseStart: string, timelineStart: string): number {
  if (!phaseStart || !timelineStart) return 0;
  return Math.max(0, Math.ceil((new Date(phaseStart).getTime() - new Date(timelineStart).getTime()) / (1000 * 60 * 60 * 24)));
}
