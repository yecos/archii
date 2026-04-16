/**
 * gantt-helpers.ts
 * Utilidades puras para el diagrama de Gantt interactivo.
 * Incluye: timeline, barras, dependencias, ruta crítica, fases, hitos, zoom.
 */

import type { Task, Project } from '@/lib/types';

/* ===== CONSTANTS ===== */

export const GANTT_DAYS = 14;
export const GANTT_DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
export const GANTT_MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const GANTT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'Por hacer': { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  'En progreso': { label: 'En Progreso', color: '#3b82f6', bg: '#eff6ff' },
  'En revisión': { label: 'Revisión', color: '#8b5cf6', bg: '#f5f3ff' },
  'Revision': { label: 'Revisión', color: '#8b5cf6', bg: '#f5f3ff' },
  'Completado': { label: 'Completado', color: '#10b981', bg: '#ecfdf5' },
};

export const GANTT_PRIO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  'Baja': { label: 'Baja', bg: '#f1f5f9', color: '#475569' },
  'Media': { label: 'Media', bg: '#e0f2fe', color: '#0369a1' },
  'Alta': { label: 'Alta', bg: '#ffedd5', color: '#c2410c' },
  'Urgente': { label: 'Urgente', bg: '#fef2f2', color: '#dc2626' },
};

export type GanttZoom = 'day' | 'week' | 'month';

export const GANTT_ZOOM_DAYS: Record<GanttZoom, number> = {
  day: 30,
  week: 56,
  month: 180,
};

export const PHASE_COLORS: Record<string, string> = {
  'Planos': '#3b82f6',
  'Cimentación': '#8b5cf6',
  'Estructura': '#f43f5e',
  'Instalaciones': '#06b6d4',
  'Acabados': '#10b981',
  'Entrega': '#f59e0b',
};

export const DEFAULT_PHASE_COLORS = ['#3b82f6','#8b5cf6','#f43f5e','#06b6d4','#10b981','#f59e0b','#ec4899','#84cc16','#6366f1','#f97316'];

/* ===== DATE HELPERS ===== */

const DAY_MS = 86400000;

export function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function getFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((Number(b) - Number(a)) / DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ===== TIMELINE GENERATION ===== */

/** Original 2-week view (backward compat) */
export function getGanttDays(weekOffset: number): Date[] {
  const base = getMonday(new Date());
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + weekOffset * 7);
  const days: Date[] = [];
  for (let i = 0; i < GANTT_DAYS; i++) {
    days.push(addDays(base, i));
  }
  return days;
}

/** Zoom-aware timeline generation */
export function getTimelineDays(zoom: GanttZoom, offset: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const numDays = GANTT_ZOOM_DAYS[zoom];
  let base: Date;
  if (zoom === 'month') {
    base = getFirstOfMonth(today);
  } else {
    base = getMonday(today);
  }
  base = addDays(base, offset);
  const days: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    days.push(addDays(base, i));
  }
  return days;
}

/** Full project timeline (for mini-map) — from earliest task start to latest task end, with padding */
export function getFullProjectRange(tasks: Task[]): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let minDate = addDays(today, -7);
  let maxDate = addDays(today, 30);

  for (const t of tasks) {
    const s = parseDate(t.data.startDate || t.data.dueDate);
    const e = parseDate(t.data.dueDate);
    if (s && s < minDate) minDate = addDays(s, -3);
    if (e && e > maxDate) maxDate = addDays(e, 7);
  }

  return { start: minDate, end: maxDate };
}

/* ===== TASK BAR CALCULATION ===== */

export function getTaskBar(
  task: Task,
  days: Date[],
): { left: number; width: number; leftPx?: number; widthPx?: number; colWidth?: number } | null {
  if (!task.data?.dueDate) return null;
  const tStart = parseDate(task.data.startDate || task.data.dueDate);
  const tEnd = parseDate(task.data.dueDate);
  if (!tStart || !tEnd || days.length === 0) return null;

  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);
  const rangeSpan = daysBetween(rangeStart, rangeEnd);
  if (rangeSpan <= 0) return null;

  const leftPct = Math.max(0, daysBetween(rangeStart, tStart) / rangeSpan) * 100;
  const widthPct = Math.max(1.5, (daysBetween(tStart, tEnd) + 1) / rangeSpan) * 100;
  return { left: leftPct, width: Math.min(widthPct, 100 - leftPct) };
}

/** Pixel-based bar calculation for precise dragging */
export function getTaskBarPx(
  task: Task,
  days: Date[],
  colWidth: number,
): { left: number; width: number; dayStart: number; dayEnd: number; rangeStart: Date } | null {
  if (!task.data?.dueDate) return null;
  const tStart = parseDate(task.data.startDate || task.data.dueDate);
  const tEnd = parseDate(task.data.dueDate);
  if (!tStart || !tEnd || days.length === 0) return null;

  const rangeStart = days[0];
  const dayOffsetStart = daysBetween(rangeStart, tStart);
  const dayOffsetEnd = daysBetween(rangeStart, tEnd);
  const left = dayOffsetStart * colWidth;
  const width = Math.max(colWidth * 0.5, (dayOffsetEnd - dayOffsetStart + 1) * colWidth);

  return { left, width, dayStart: dayOffsetStart, dayEnd: dayOffsetEnd, rangeStart };
}

/* ===== BUILD GANTT ROWS (overlap-free layout) ===== */

export function buildGanttRows(memberTasks: Task[]): Task[][] {
  const rows: Task[][] = [];
  const sorted = [...memberTasks].sort((a, b) => {
    const as = parseDate(a.data.startDate || a.data.dueDate);
    const bs = parseDate(b.data.startDate || b.data.dueDate);
    if (!as && !bs) return 0;
    if (!as) return 1;
    if (!bs) return -1;
    return Number(as) - Number(bs);
  });

  for (const t of sorted) {
    if (!t.data?.dueDate) continue;
    let placed = false;
    for (const row of rows) {
      const overlaps = row.some((r: Task) => {
        if (!r.data?.dueDate) return false;
        const as = parseDate(t.data.startDate || t.data.dueDate)!;
        const ae = parseDate(t.data.dueDate)!;
        const bs = parseDate(r.data.startDate || r.data.dueDate)!;
        const be = parseDate(r.data.dueDate)!;
        return as <= be && bs <= ae;
      });
      if (!overlaps) { row.push(t); placed = true; break; }
    }
    if (!placed) rows.push([t]);
  }
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

/* ===== PROJECT COLORS ===== */

const PROJECT_COLORS = ['#3b82f6','#8b5cf6','#f43f5e','#10b981','#f59e0b','#06b6d4','#ec4899','#84cc16','#6366f1','#f97316'];

export function getProjectColor(projId: string, projects: Project[]): string {
  const idx = projects.findIndex(p => p.id === projId);
  return PROJECT_COLORS[Math.abs(idx) % PROJECT_COLORS.length];
}

const PROJECT_COLOR_LIGHT: Record<string, string> = {
  '#3b82f6':'#dbeafe','#8b5cf6':'#ede9fe','#f43f5e':'#ffe4e6','#10b981':'#d1fae5',
  '#f59e0b':'#fef3c7','#06b6d4':'#cffafe','#ec4899':'#fce7f3','#84cc16':'#ecfccb',
  '#6366f1':'#e0e7ff','#f97316':'#ffedd5',
};

export function getProjectColorLight(projId: string, projects: Project[]): string {
  return PROJECT_COLOR_LIGHT[getProjectColor(projId, projects)] || '#f5f5f4';
}

/* ===== DEPENDENCY HELPERS ===== */

export function getTaskDependencies(task: Task): string[] {
  // The dependencies field is stored directly in task data
  const deps = (task.data as Record<string, unknown>).dependencies;
  if (Array.isArray(deps)) return deps.filter((d: unknown) => typeof d === 'string');
  return [];
}

export function getTasksDependingOn(tasks: Task[], taskId: string): string[] {
  return tasks
    .filter(t => getTaskDependencies(t).includes(taskId))
    .map(t => t.id);
}

/* ===== CRITICAL PATH ===== */

interface CPNode {
  id: string;
  duration: number; // days
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  deps: string[];
}

/**
 * Calculate critical path using forward/backward pass.
 * Returns Set of task IDs on the critical path.
 */
export function calculateCriticalPath(tasks: Task[]): Set<string> {
  const withDates = tasks.filter(t => {
    const s = parseDate(t.data.startDate || t.data.dueDate);
    const e = parseDate(t.data.dueDate);
    return !!s && !!e;
  });

  if (withDates.length === 0) return new Set();

  const idSet = new Set(withDates.map(t => t.id));
  const nodes = new Map<string, CPNode>();

  for (const t of withDates) {
    const s = parseDate(t.data.startDate || t.data.dueDate)!;
    const e = parseDate(t.data.dueDate)!;
    const deps = getTaskDependencies(t).filter(d => idSet.has(d));
    nodes.set(t.id, {
      id: t.id,
      duration: Math.max(1, daysBetween(s, e)),
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      deps,
    });
  }

  // Topological sort
  const inDegree = new Map<string, number>();
  for (const [id, node] of nodes) {
    inDegree.set(id, node.deps.length);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const topo: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topo.push(id);
    for (const [nid, node] of nodes) {
      if (node.deps.includes(id)) {
        const newDeg = (inDegree.get(nid) || 1) - 1;
        inDegree.set(nid, newDeg);
        if (newDeg === 0) queue.push(nid);
      }
    }
  }

  // Forward pass
  for (const id of topo) {
    const node = nodes.get(id)!;
    if (node.deps.length === 0) {
      node.earliestStart = 0;
    } else {
      node.earliestStart = Math.max(...node.deps.map(d => nodes.get(d)?.earliestFinish || 0));
    }
    node.earliestFinish = node.earliestStart + node.duration;
  }

  // Project end = max earliestFinish
  const projectEnd = Math.max(...Array.from(nodes.values()).map(n => n.earliestFinish));

  // Backward pass (reverse topo)
  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i];
    const node = nodes.get(id)!;
    // Find successors
    const successors = withDates.filter(t => getTaskDependencies(t).includes(id)).map(t => t.id);
    if (successors.length === 0) {
      node.latestFinish = projectEnd;
    } else {
      node.latestFinish = Math.min(...successors.map(s => nodes.get(s)?.latestStart || projectEnd));
    }
    node.latestStart = node.latestFinish - node.duration;
    node.slack = node.latestStart - node.earliestStart;
  }

  // Critical path = tasks with slack = 0
  const criticalPath = new Set<string>();
  for (const node of nodes.values()) {
    if (Math.abs(node.slack) < 0.5) {
      criticalPath.add(node.id);
    }
  }

  // If no dependencies exist, longest chain is critical
  if (criticalPath.size === 0 && withDates.length > 0) {
    // Find longest duration task
    let maxDur = 0;
    let maxId = '';
    for (const t of withDates) {
      const s = parseDate(t.data.startDate || t.data.dueDate)!;
      const e = parseDate(t.data.dueDate)!;
      const dur = daysBetween(s, e);
      if (dur > maxDur) { maxDur = dur; maxId = t.id; }
    }
    criticalPath.add(maxId);
  }

  return criticalPath;
}

/* ===== MILESTONE DETECTION ===== */

export function isMilestone(task: Task): boolean {
  return task.data.priority === 'Urgente' || !task.data.dueDate;
}

/* ===== PHASE GROUPING ===== */

export function groupTasksByPhase(tasks: Task[]): { phase: string; tasks: Task[]; color: string; progress: number }[] {
  const phaseMap = new Map<string, Task[]>();

  for (const t of tasks) {
    const phase = t.data.phase || 'Sin fase';
    if (!phaseMap.has(phase)) phaseMap.set(phase, []);
    phaseMap.get(phase)!.push(t);
  }

  const result: { phase: string; tasks: Task[]; color: string; progress: number }[] = [];

  // Sort phases: known phases first in DEFAULT_PHASES order, then alphabetical
  const knownOrder = ['Planos','Cimentación','Estructura','Instalaciones','Acabados','Entrega'];
  const sortedPhases = Array.from(phaseMap.keys()).sort((a, b) => {
    const ai = knownOrder.indexOf(a);
    const bi = knownOrder.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  for (const phase of sortedPhases) {
    const phaseTasks = phaseMap.get(phase)!;
    const completed = phaseTasks.filter(t => t.data.status === 'Completado').length;
    const progress = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;
    const colorIdx = knownOrder.indexOf(phase);
    const color = colorIdx >= 0 ? PHASE_COLORS[phase] || DEFAULT_PHASE_COLORS[colorIdx % DEFAULT_PHASE_COLORS.length] : DEFAULT_PHASE_COLORS[sortedPhases.indexOf(phase) % DEFAULT_PHASE_COLORS.length];
    result.push({ phase, tasks: phaseTasks, color, progress });
  }

  return result;
}

/* ===== DEPENDENCY ARROW PATH ===== */

export interface ArrowPath {
  fromTaskId: string;
  toTaskId: string;
  path: string; // SVG path d attribute
}

/**
 * Generate SVG arrow paths between dependent tasks.
 * barPositions: Map<taskId, { left: number; width: number; rowIndex: number; rowHeight: number }>
 */
export function generateDependencyArrows(
  tasks: Task[],
  barPositions: Map<string, { left: number; width: number; rowIndex: number; rowHeight: number }>,
): ArrowPath[] {
  const arrows: ArrowPath[] = [];

  for (const task of tasks) {
    const deps = getTaskDependencies(task);
    const toPos = barPositions.get(task.id);
    if (!toPos || deps.length === 0) continue;

    for (const depId of deps) {
      const fromPos = barPositions.get(depId);
      if (!fromPos) continue;

      const x1 = fromPos.left + fromPos.width; // right edge of source
      const y1 = fromPos.rowIndex * fromPos.rowHeight + fromPos.rowHeight / 2;
      const x2 = toPos.left; // left edge of target
      const y2 = toPos.rowIndex * toPos.rowHeight + toPos.rowHeight / 2;

      // Create a smooth curved arrow
      const dx = Math.abs(x2 - x1);
      const cpOffset = Math.max(10, dx * 0.4);

      const path = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;

      arrows.push({ fromTaskId: depId, toTaskId: task.id, path });
    }
  }

  return arrows;
}

/* ===== LEGACY HELPERS ===== */

export function calcGanttDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
}

export function calcGanttOffset(phaseStart: string, timelineStart: string): number {
  if (!phaseStart || !timelineStart) return 0;
  return Math.max(0, Math.ceil((new Date(phaseStart).getTime() - new Date(timelineStart).getTime()) / (1000 * 60 * 60 * 24)));
}
