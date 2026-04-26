'use client';
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { statusColor, fmtCOP } from '@/lib/helpers';
import { SkeletonProjects } from '@/components/ui/SkeletonLoaders';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { exportProjectsPDF } from '@/lib/export-pdf';
import { exportProjectsExcel } from '@/lib/export-excel';
import {
  Pencil, Trash2, Search, AlertTriangle, Clock, FolderKanban, Download,
  FileText, Filter, TrendingUp, DollarSign, CheckCircle2, Plus, BarChart3, PieChart as PieIcon,
  LayoutGrid, GanttChart, Heart, HeartPulse, X, CheckSquare, Square, ArrowUpDown, Archive, Play, CircleDot,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { Project, Task, Expense } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  Concepto: '#828282',
  Diseno: '#3b82f6',
  Ejecucion: '#f59e0b',
  Terminado: '#10b981',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const STATUS_LABELS: Record<string, string> = {
  Concepto: 'Concepto',
  Diseno: 'Diseño',
  Ejecucion: 'Ejecución',
  Terminado: 'Terminado',
};

function ChartTooltipContent({ active, payload }: { active?: boolean; payload?: { name?: string; dataKey?: string; value: number | string }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-[12px]">
      <div className="font-semibold">{payload[0].name || payload[0].dataKey}</div>
      <div className="text-[var(--af-accent)]">
        {typeof payload[0].value === 'number' && payload[0].value > 1000
          ? fmtCOP(payload[0].value)
          : payload[0].value}
      </div>
    </div>
  );
}

// ─── Health Score Computation ───
type HealthLevel = 'excelente' | 'bueno' | 'riesgo' | 'critico';

function computeHealth(p: Project, tasks: Task[], expenses: Expense[], today: string): { score: number; level: HealthLevel; details: { budget: number; schedule: number; tasks: number; progress: number } } {
  const d = p.data;
  let budgetPts = 25;
  let schedulePts = 25;
  let tasksPts = 25;
  let progressPts = 25;

  // --- Budget health ---
  const budget = d.budget || 0;
  const spent = expenses.filter((e: Expense) => e.data.projectId === p.id).reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0);
  if (budget > 0) {
    const pct = spent / budget;
    if (pct > 1) budgetPts = 0;
    else if (pct > 0.9) budgetPts = 5;
    else if (pct > 0.75) budgetPts = 12;
    else if (pct > 0.5) budgetPts = 18;
    else budgetPts = 25;
  }

  // --- Schedule health ---
  if (d.startDate && d.endDate) {
    const start = new Date(d.startDate + 'T00:00:00').getTime();
    const end = new Date(d.endDate + 'T23:59:59').getTime();
    const now = new Date(today + 'T12:00:00').getTime();
    if (now > end) {
      schedulePts = d.status === 'Terminado' ? 25 : 0;
    } else if (now > end - 7 * 86400000) {
      schedulePts = 8;
    } else if (now > (start + end) / 2) {
      schedulePts = 15;
    } else {
      schedulePts = 25;
    }
  }

  // --- Task health ---
  const projTasks = tasks.filter((t: Task) => t.data.projectId === p.id);
  const totalTasks = projTasks.length;
  const overdueTasks = projTasks.filter((t: Task) => t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today).length;
  if (totalTasks > 0) {
    const overdueRatio = overdueTasks / totalTasks;
    if (overdueRatio > 0.5) tasksPts = 0;
    else if (overdueRatio > 0.25) tasksPts = 8;
    else if (overdueRatio > 0) tasksPts = 16;
    else tasksPts = 25;
  }

  // --- Progress alignment ---
  const prog = d.progress || 0;
  if (d.startDate && d.endDate && d.status !== 'Terminado') {
    const start = new Date(d.startDate + 'T00:00:00').getTime();
    const end = new Date(d.endDate + 'T23:59:59').getTime();
    const total = end - start;
    if (total > 0) {
      const elapsed = Math.max(0, Math.min(1, (new Date(today + 'T12:00:00').getTime() - start) / total));
      const expectedProgress = Math.round(elapsed * 100);
      const diff = prog - expectedProgress;
      if (diff < -30) progressPts = 0;
      else if (diff < -15) progressPts = 8;
      else if (diff < -5) progressPts = 15;
      else progressPts = 25;
    }
  }

  const score = budgetPts + schedulePts + tasksPts + progressPts;
  let level: HealthLevel = 'excelente';
  if (score < 35) level = 'critico';
  else if (score < 60) level = 'riesgo';
  else if (score < 80) level = 'bueno';

  return { score, level, details: { budget: budgetPts, schedule: schedulePts, tasks: tasksPts, progress: progressPts } };
}

const HEALTH_CONFIG: Record<HealthLevel, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  excelente: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Excelente', icon: <HeartPulse size={11} className="text-emerald-400" /> },
  bueno: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Bueno', icon: <Heart size={11} className="text-blue-400" /> },
  riesgo: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'En Riesgo', icon: <AlertTriangle size={11} className="text-amber-400" /> },
  critico: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Crítico', icon: <AlertTriangle size={11} className="text-red-400" /> },
};

// ─── Timeline / Gantt Component ───
function TimelineView({ projects, getHealth }: { projects: Project[]; getHealth: (p: Project) => { score: number; level: HealthLevel; details: { budget: number; schedule: number; tasks: number; progress: number } } }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr + 'T12:00:00').getTime();

  // Determine date range
  const allDates = projects.flatMap((p: Project) => {
    const dates: number[] = [];
    if (p.data.startDate) dates.push(new Date(p.data.startDate + 'T00:00:00').getTime());
    if (p.data.endDate) dates.push(new Date(p.data.endDate + 'T23:59:59').getTime());
    return dates;
  });
  const minDate = allDates.length > 0 ? Math.min(todayMs, ...allDates) - 7 * 86400000 : todayMs - 30 * 86400000;
  const maxDate = allDates.length > 0 ? Math.max(todayMs, ...allDates) + 14 * 86400000 : todayMs + 60 * 86400000;
  const totalRange = maxDate - minDate;

  const dateToPct = (dateStr: string, isEnd = false) => {
    if (!dateStr) return 0;
    const ms = new Date((isEnd ? dateStr + 'T23:59:59' : dateStr + 'T00:00:00')).getTime();
    return Math.max(0, Math.min(100, ((ms - minDate) / totalRange) * 100));
  };

  const todayPct = ((todayMs - minDate) / totalRange) * 100;

  // Generate month markers
  const monthMarkers: { label: string; pct: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  if (cursor.getTime() < minDate) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() < maxDate) {
    const pct = ((cursor.getTime() - minDate) / totalRange) * 100;
    monthMarkers.push({ label: MONTHS[cursor.getMonth()] + ' ' + cursor.getFullYear().toString().slice(2), pct });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--af-text3)] text-sm">
        <GanttChart size={32} className="mx-auto mb-2 opacity-30" />
        No hay proyectos con fechas para mostrar en el timeline
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Timeline header */}
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="text-[15px] font-semibold flex items-center gap-2">
          <GanttChart size={16} className="text-[var(--af-accent)]" />
          Timeline de Proyectos
        </div>
      </div>

      {/* Month markers */}
      <div className="relative border-b border-[var(--border)] h-7 overflow-hidden">
        {monthMarkers.map((m, i) => (
          <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: m.pct + '%' }}>
            <span className="text-[9px] text-[var(--muted-foreground)] pl-1 whitespace-nowrap">{m.label}</span>
            <div className="w-px h-full bg-[var(--af-bg4)] ml-1" />
          </div>
        ))}
      </div>

      {/* Project bars */}
      <div className="divide-y divide-[var(--border)]">
        {projects.map((p: Project) => {
          const d = p.data;
          const hasDates = d.startDate && d.endDate;
          const health = getHealth(p);
          const healthCfg = HEALTH_CONFIG[health.level as HealthLevel];
          const leftPct = dateToPct(d.startDate);
          const widthPct = hasDates ? Math.max(1.5, dateToPct(d.endDate, true) - leftPct) : 0;
          const barColor = STATUS_COLORS[d.status] || '#828282';

          return (
            <div key={p.id} className="relative px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--af-bg3)]/30 transition-colors cursor-pointer" onClick={() => {}}>
              {/* Project label */}
              <div className="w-36 sm:w-48 flex-shrink-0">
                <div className="text-[12px] font-semibold truncate">{d.name}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] truncate">{d.client || d.location || STATUS_LABELS[d.status] || d.status}</div>
              </div>

              {/* Bar area */}
              <div className="flex-1 relative h-10 overflow-hidden">
                {/* Today line */}
                <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-20" style={{ left: todayPct + '%' }}>
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                </div>

                {/* Month grid lines */}
                {monthMarkers.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-[var(--af-bg4)]/50" style={{ left: m.pct + '%' }} />
                ))}

                {hasDates ? (
                  <div className="absolute top-1.5 h-7 rounded-md flex items-center overflow-hidden transition-all group/bar" style={{ left: leftPct + '%', width: widthPct + '%' }}>
                    <div className="absolute inset-0 opacity-90 rounded-md" style={{ background: barColor }} />
                    <div className="relative z-10 flex items-center justify-between px-2 w-full">
                      <span className="text-[10px] font-medium text-white truncate">{d.progress || 0}%</span>
                      <span className="text-[9px] text-white/80 hidden sm:inline">{STATUS_LABELS[d.status] || d.status}</span>
                    </div>
                    {/* Progress fill inside bar */}
                    <div className="absolute top-0 left-0 bottom-0 bg-white/20 rounded-l-md" style={{ width: (d.progress || 0) + '%' }} />
                  </div>
                ) : (
                  <div className="absolute top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">Sin fechas definidas</div>
                )}
              </div>

              {/* Health badge */}
              <div className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 ${healthCfg.bg}`}>
                {healthCfg.icon}
                <span className="hidden sm:inline">{health.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today legend */}
      <div className="border-t border-[var(--border)] px-4 py-2 flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Hoy</div>
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: v }} /> {STATUS_LABELS[k] || k}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Batch Actions Bar ───
function BatchActionBar({ selectedCount, onClear, onExportPDF, onExportCSV, onStatusChange }: {
  selectedCount: number;
  onClear: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-[var(--af-accent)]" />
          <span className="text-[13px] font-semibold">{selectedCount} seleccionados</span>
        </div>
        <div className="w-px h-6 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)] transition-colors" onClick={onExportPDF}>
            <FileText size={13} /> PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)] transition-colors" onClick={onExportCSV}>
            <Download size={13} /> CSV
          </button>
          <select
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)] transition-colors border-none outline-none text-[var(--foreground)]"
            defaultValue=""
            onChange={e => { if (e.target.value) { onStatusChange(e.target.value); e.target.value = ''; } }}
          >
            <option value="" disabled>Cambiar estado...</option>
            <option value="Concepto">Concepto</option>
            <option value="Diseno">Diseño</option>
            <option value="Ejecucion">Ejecución</option>
            <option value="Terminado">Terminado</option>
          </select>
        </div>
        <button className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={onClear}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ProjectsScreen() {
  const {
    loading, projects, companies, forms, setForms, setEditingId, openModal,
    visibleProjects, openEditProject, deleteProject, openProject, getMyRole, tasks,
    expenses, showToast, teamUsers, activeTenantId,
  } = useApp();

  const confirmDialog = useConfirmDialog();

  // --- Local filter state ---
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBudgetMin, setFilterBudgetMin] = useState('');
  const [filterBudgetMax, setFilterBudgetMax] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // --- View mode: cards vs timeline ---
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

  // --- Batch selection ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().split('T')[0];

  // --- Filtered projects ---
  const filteredProjects = useMemo(() => {
    let projs = visibleProjects();
    if (forms.projFilter) projs = projs.filter((p: Project) => p.data.status === forms.projFilter);
    if (forms.projCompanyFilter) projs = projs.filter((p: Project) => p.data.companyId === forms.projCompanyFilter);
    if (filterType) projs = projs.filter((p: Project) => (p.data.projectType || 'Ejecución') === filterType);
    if (filterBudgetMin) projs = projs.filter((p: Project) => (p.data.budget || 0) >= Number(filterBudgetMin));
    if (filterBudgetMax) projs = projs.filter((p: Project) => (p.data.budget || 0) <= Number(filterBudgetMax));
    if (filterDateFrom) projs = projs.filter((p: Project) => p.data.startDate && p.data.startDate >= filterDateFrom);
    if (filterDateTo) projs = projs.filter((p: Project) => p.data.startDate && p.data.startDate <= filterDateTo);
    const q = search.toLowerCase();
    if (q) {
      projs = projs.filter((p: Project) =>
        (p.data.name || '').toLowerCase().includes(q) ||
        (p.data.client || '').toLowerCase().includes(q) ||
        (p.data.location || '').toLowerCase().includes(q) ||
        (p.data.description || '').toLowerCase().includes(q)
      );
    }
    return projs;
  }, [forms.projFilter, forms.projCompanyFilter, projects, search, filterType, filterBudgetMin, filterBudgetMax, filterDateFrom, filterDateTo]);

  // --- KPI computations ---
  const totalBudget = useMemo(() => projects.reduce((s: number, p: Project) => s + (p.data.budget || 0), 0), [projects]);
  const totalSpent = useMemo(() => expenses.reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0), [expenses]);
  const avgProgress = useMemo(() => projects.length > 0
    ? Math.round(projects.reduce((s: number, p: Project) => s + (p.data.progress || 0), 0) / projects.length)
    : 0, [projects]);
  const completedCount = useMemo(() => projects.filter((p: Project) => p.data.status === 'Terminado').length, [projects]);
  const projectsWithOverdue = useMemo(() => {
    return filteredProjects.filter((p: Project) => {
      const projTasks = tasks.filter((t: Task) => t.data.projectId === p.id);
      return projTasks.some((t: Task) => t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today);
    }).length;
  }, [filteredProjects, tasks, today]);
  const overBudgetCount = useMemo(() => {
    return projects.filter((p: Project) => {
      const budget = p.data.budget || 0;
      if (budget <= 0) return false;
      const spent = expenses.filter((e: Expense) => e.data.projectId === p.id).reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0);
      return spent > budget;
    }).length;
  }, [projects, expenses]);

  // ─── Health score per project ───
  const healthMap = useMemo(() => {
    const map: Record<string, any> = {};
    projects.forEach((p: Project) => { map[p.id] = computeHealth(p, tasks, expenses, today); });
    return map;
  }, [projects, tasks, expenses, today]);

  const getHealth = (p: Project): { score: number; level: HealthLevel; details: { budget: number; schedule: number; tasks: number; progress: number } } => healthMap[p.id] || { score: 100, level: 'excelente' as HealthLevel, details: { budget: 25, schedule: 25, tasks: 25, progress: 25 } };

  // Health KPI summary
  const healthSummary = useMemo(() => {
    const active = projects.filter((p: Project) => p.data.status !== 'Terminado');
    let excelente = 0, bueno = 0, riesgo = 0, critico = 0;
    active.forEach((p: Project) => {
      const h = healthMap[p.id];
      if (!h) return;
      if (h.level === 'excelente') excelente++;
      else if (h.level === 'bueno') bueno++;
      else if (h.level === 'riesgo') riesgo++;
      else critico++;
    });
    return { excelente, bueno, riesgo, critico, total: active.length };
  }, [projects, healthMap]);

  // Health chart data
  const healthChartData = useMemo(() => {
    if (healthSummary.total === 0) return [];
    return [
      { name: 'Excelente', value: healthSummary.excelente, color: '#10b981' },
      { name: 'Bueno', value: healthSummary.bueno, color: '#3b82f6' },
      { name: 'En Riesgo', value: healthSummary.riesgo, color: '#f59e0b' },
      { name: 'Crítico', value: healthSummary.critico, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [healthSummary]);

  // --- Status distribution for pie chart ---
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const s = p.data.status || 'Concepto';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: STATUS_LABELS[name] || name,
        value,
        color: STATUS_COLORS[name] || '#828282',
      }));
  }, [projects]);

  // --- Monthly created trend (6 months) ---
  const monthlyCreated = useMemo(() => {
    const data: { name: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTotal = projects.filter((p: Project) => {
        const created = p.data.createdAt;
        if (!created) return false;
        const dateStr = typeof created === 'object' && 'toDate' in created ? created.toDate() : new Date(created as string);
        const ck = `${dateStr.getFullYear()}-${String(dateStr.getMonth() + 1).padStart(2, '0')}`;
        return ck === key;
      }).length;
      data.push({ name: MONTHS[d.getMonth()], total: monthTotal });
    }
    return data;
  }, [projects]);

  // --- Budget per project ---
  const projectBudgetData = useMemo(() => {
    return projects
      .map((p: Project) => {
        const budget = p.data.budget || 0;
        const spent = expenses.filter((e: Expense) => e.data.projectId === p.id)
          .reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0);
        return { id: p.id, name: p.data.name, budget, spent, pct: budget > 0 ? Math.round((spent / budget) * 100) : 0 };
      })
      .filter(p => p.budget > 0 || p.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [projects, expenses]);

  // --- Helpers ---
  const getProjectStats = (projectId: string) => {
    const projTasks = tasks.filter((t: Task) => t.data.projectId === projectId);
    const pending = projTasks.filter((t: Task) => t.data.status !== 'Completado').length;
    const overdue = projTasks.filter((t: Task) => t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today).length;
    const completed = projTasks.filter((t: Task) => t.data.status === 'Completado').length;
    return { pending, overdue, completed, total: projTasks.length };
  };

  const getProjectSpent = (projectId: string) => {
    return expenses.filter((e: Expense) => e.data.projectId === projectId)
      .reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0);
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate + 'T23:59:59').getTime() - new Date().getTime()) / 86400000);
    return diff;
  };

  const clearFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterBudgetMin('');
    setFilterBudgetMax('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = search || filterType || filterBudgetMin || filterBudgetMax || filterDateFrom || filterDateTo;

  // --- Status tabs ---
  const statusTabs = [
    { k: 'Todos', v: '' },
    { k: 'Concepto', v: 'Concepto' },
    { k: 'Diseño', v: 'Diseno' },
    { k: 'Ejecución', v: 'Ejecucion' },
    { k: 'Terminados', v: 'Terminado' },
  ];

  // --- Exports ---
  const exportCSV = (projList?: Project[]) => {
    const list = projList || filteredProjects;
    const q = '"';
    const dq = '""';
    const headers = ['Proyecto', 'Estado', 'Tipo', 'Cliente', 'Ubicación', 'Presupuesto', 'Gastado', 'Saldo', 'Progreso', 'Tareas', 'Completadas', 'Fecha Inicio', 'Fecha Entrega', 'Salud'];
    const esc = (v: string | number) => q + String(v).split(q).join(dq) + q;
    const rows = list.map((p: Project) => {
      const d = p.data;
      const stats = getProjectStats(p.id);
      const spent = getProjectSpent(p.id);
      const h = getHealth(p);
      return [
        d.name, d.status, d.projectType || 'Ejecución', d.client || '', d.location || '',
        d.budget || 0, spent, (d.budget || 0) - spent, `${d.progress || 0}%`,
        stats.total, stats.completed, d.startDate || '', d.endDate || '',
        `${h.score} (${HEALTH_CONFIG[h.level].label})`,
      ];
    });
    const csv = [headers, ...rows].map((r: (string | number)[]) => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'proyectos_' + new Date().toISOString().split('T')[0] + '.csv'; a.click(); URL.revokeObjectURL(url);
    showToast('Proyectos exportados a CSV');
  };

  const handleNewProject = () => {
    setEditingId(null);
    openModal('project');
  };

  // --- Batch operations ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p: Project) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const batchExportPDF = () => {
    const selected = projects.filter((p: Project) => selectedIds.has(p.id));
    if (selected.length === 0) return;
    try {
      exportProjectsPDF({ projects: selected, tasks, expenses });
      showToast(`PDF generado con ${selected.length} proyectos`);
    } catch { showToast('Error al generar PDF', 'error'); }
  };

  const batchExportCSV = () => {
    const selected = projects.filter((p: Project) => selectedIds.has(p.id));
    if (selected.length === 0) return;
    exportCSV(selected);
  };

  const batchChangeStatus = async (newStatus: string) => {
    const selected = projects.filter((p: Project) => selectedIds.has(p.id));
    if (selected.length === 0) return;
    const confirmed = await confirmDialog.confirm({
      title: 'Cambiar estado en lote',
      description: `¿Cambiar el estado de ${selected.length} proyectos a "${STATUS_LABELS[newStatus] || newStatus}"?`,
    });
    if (!confirmed || !activeTenantId) return;
    try {
      const { getFirebase } = await import('@/lib/firebase-service');
      const app = getFirebase();
      const db = app.firestore();
      const batch = db.batch();
      selected.forEach((p: Project) => {
        const ref = db.collection('projects').doc(p.id);
        batch.update(ref, { status: newStatus, updatedAt: new Date() });
      });
      await batch.commit();
      showToast(`${selected.length} proyectos actualizados a "${STATUS_LABELS[newStatus] || newStatus}"`);
      clearSelection();
    } catch (err: unknown) {
      showToast('Error al actualizar proyectos: ' + (err instanceof Error ? err.message : ''), 'error');
    }
  };

  const isAllSelected = filteredProjects.length > 0 && selectedIds.size === filteredProjects.length;

  return (
    <div className="animate-fadeIn space-y-5">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderKanban size={20} className="text-[var(--af-accent)]" />
            Proyectos
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {projects.length} proyectos{filteredProjects.length !== projects.length ? ` · ${filteredProjects.length} filtrados` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-[var(--af-bg3)] rounded-lg p-0.5 border border-[var(--border)]">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-all ${viewMode === 'cards' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={13} /> Tarjetas
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-all ${viewMode === 'timeline' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              onClick={() => setViewMode('timeline')}
            >
              <GanttChart size={13} /> Timeline
            </button>
          </div>

          {/* Batch toggle */}
          <button
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer border transition-colors ${selectedIds.size > 0 ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30' : 'bg-[var(--af-bg3)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--af-bg4)]'}`}
            onClick={() => { if (selectedIds.size > 0) clearSelection(); else setSelectedIds(new Set()); }}
          >
            <CheckSquare size={14} />
            {selectedIds.size > 0 ? `${selectedIds.size}` : 'Seleccionar'}
          </button>

          {/* Exports */}
          <button
            className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors"
            onClick={() => { try { exportProjectsPDF({ projects: filteredProjects, tasks, expenses }); showToast('Reporte PDF descargado'); } catch { showToast('Error al generar PDF', 'error'); } }}
          >
            <FileText size={14} /> PDF
          </button>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors"
            onClick={() => { try { exportProjectsExcel(filteredProjects, tasks, expenses); showToast('Excel descargado'); } catch { showToast('Error al generar Excel', 'error'); } }}
          >
            <Download size={14} /> Excel
          </button>
          <button
            className="hidden sm:flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors"
            onClick={() => exportCSV()}
          >
            <Download size={14} /> CSV
          </button>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={handleNewProject}
          >
            <Plus size={15} /> Nuevo proyecto
          </button>
        </div>
      </div>

      {/* ===== SEARCH + FILTERS ===== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cliente, ubicación..."
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors"
            />
          </div>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer border transition-colors ${showFilters || hasActiveFilters ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--af-bg3)]'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filtros
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)]" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-[var(--muted-foreground)] mb-1 block">Tipo de proyecto</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none cursor-pointer">
                  <option value="">Todos los tipos</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Ejecución">Ejecución</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--muted-foreground)] mb-1 block">Presupuesto mínimo (COP)</label>
                <input type="number" value={filterBudgetMin} onChange={e => setFilterBudgetMin(e.target.value)} placeholder="Ej: 10000000" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none cursor-pointer" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--muted-foreground)] mb-1 block">Presupuesto máximo (COP)</label>
                <input type="number" value={filterBudgetMax} onChange={e => setFilterBudgetMax(e.target.value)} placeholder="Ej: 500000000" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none cursor-pointer" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--muted-foreground)] mb-1 block">Fecha inicio</label>
                <div className="flex gap-2">
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--foreground)] outline-none cursor-pointer" />
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--foreground)] outline-none cursor-pointer" />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <button className="mt-3 text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={clearFilters}>Limpiar filtros</button>
            )}
          </div>
        )}
      </div>

      {/* ===== STATUS TABS ===== */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 overflow-x-auto mb-1 scrollbar-none">
        {statusTabs.map(tab => {
          const projs = visibleProjects();
          const count = tab.v ? projs.filter((p: Project) => p.data.status === tab.v).length : projs.length;
          return (
            <button key={tab.k} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${(forms.projFilter || '') === tab.v ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms((p: Record<string, any>) => ({ ...p, projFilter: tab.v }))}>
              {tab.k} ({count})
            </button>
          );
        })}
      </div>

      {/* ===== COMPANY FILTER PILLS ===== */}
      {(getMyRole() === 'Admin' || getMyRole() === 'Director') && companies.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${!forms.projCompanyFilter ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => setForms((p: Record<string, any>) => ({ ...p, projCompanyFilter: '' }))}>
            Todas las empresas
          </button>
          {companies.map(c => (
            <button key={c.id} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${forms.projCompanyFilter === c.id ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => setForms((p: Record<string, any>) => ({ ...p, projCompanyFilter: c.id }))}>
              {c.data.name}
            </button>
          ))}
        </div>
      )}

      {/* ===== KPI CARDS (8 total: 6 original + health score + health chart) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <FolderKanban size={11} className="text-[var(--af-accent)]" />
            Activos
          </div>
          <div className="text-lg font-bold text-[var(--af-accent)]">{projects.length - completedCount}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{completedCount} terminados</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <DollarSign size={11} className="text-[var(--af-accent)]" />
            Presupuesto
          </div>
          <div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(totalBudget)}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">Gastado: {fmtCOP(totalSpent)}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <TrendingUp size={11} className="text-emerald-400" />
            Progreso prom.
          </div>
          <div className="text-lg font-bold">{avgProgress}%</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">de todos los proyectos</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-400" />
            Terminados
          </div>
          <div className="text-lg font-bold text-emerald-400">{completedCount}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0}% del total</div>
        </div>
        <div className={`bg-[var(--card)] border rounded-xl p-4 ${projectsWithOverdue > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)]'}`}>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            {projectsWithOverdue > 0 && <AlertTriangle size={10} className="text-red-400" />}
            Tareas vencidas
          </div>
          <div className={`text-lg font-bold ${projectsWithOverdue > 0 ? 'text-red-400' : ''}`}>{projectsWithOverdue}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">del total filtrado</div>
        </div>
        <div className={`bg-[var(--card)] border rounded-xl p-4 ${overBudgetCount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)]'}`}>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            {overBudgetCount > 0 && <AlertTriangle size={10} className="text-red-400" />}
            Sobrepasados
          </div>
          <div className={`text-lg font-bold ${overBudgetCount > 0 ? 'text-red-400' : ''}`}>{overBudgetCount}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{projectBudgetData.length} con presupuesto</div>
        </div>

        {/* ★ NEW: Health Score KPI */}
        <div className={`bg-[var(--card)] border rounded-xl p-4 ${healthSummary.critico > 0 ? 'border-red-500/20' : healthSummary.riesgo > 0 ? 'border-amber-500/20' : 'border-[var(--border)]'}`}>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <HeartPulse size={11} className="text-emerald-400" />
            Salud global
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-emerald-400">{healthSummary.excelente}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">OK</span>
            {healthSummary.riesgo > 0 && <span className="text-[11px] font-medium text-amber-400">/ {healthSummary.riesgo} riesgo</span>}
            {healthSummary.critico > 0 && <span className="text-[11px] font-medium text-red-400">/ {healthSummary.critico} crítico</span>}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{healthSummary.total} proyectos activos</div>
        </div>

        {/* ★ NEW: Health Distribution Mini Donut */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <Heart size={11} className="text-[var(--af-accent)]" />
            Distribución salud
          </div>
          {healthChartData.length > 0 ? (
            <div className="flex items-center gap-2">
              <ResponsiveContainer width={48} height={48}>
                <PieChart>
                  <Pie data={healthChartData} cx="50%" cy="50%" innerRadius={14} outerRadius={22} paddingAngle={1} dataKey="value" stroke="none">
                    {healthChartData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-0.5">
                {healthChartData.filter(d => d.value > 0).map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1 text-[9px]">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[var(--muted-foreground)]">{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[var(--muted-foreground)] mt-2">Sin datos</div>
          )}
        </div>
      </div>

      {/* ===== CHARTS: PIE + BAR ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart - status distribution */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            <PieIcon size={16} className="text-[var(--af-accent)]" />
            Distribución por Estado
          </div>
          {statusDist.length === 0 ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {statusDist.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {statusDist.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[var(--muted-foreground)]">{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar chart - monthly created */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold flex items-center gap-2">
              <BarChart3 size={16} className="text-[var(--af-accent)]" />
              Proyectos Creados
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--af-bg4)]">6 meses</span>
          </div>
          {monthlyCreated.every(d => d.total === 0) ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin proyectos creados en los últimos 6 meses</div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={monthlyCreated} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(200,169,110,0.06)' }} />
                <Bar dataKey="total" name="Proyectos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ===== BUDGET CARDS PER PROJECT ===== */}
      {projectBudgetData.length > 0 && viewMode === 'cards' && (
        <div>
          <div className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-[var(--af-accent)]" />
            Presupuesto por Proyecto
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectBudgetData.map((p) => (
              <div key={p.id} className={`bg-[var(--card)] border rounded-xl p-4 transition-all ${p.pct > 100 ? 'border-red-500/30 bg-red-500/5' : p.pct >= 80 ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border)]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold truncate flex-1 mr-2">{p.name}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${p.pct > 100 ? 'bg-red-500/15 text-red-400' : p.pct >= 80 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {p.pct}%
                  </span>
                </div>
                <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${p.pct > 100 ? 'bg-red-500' : p.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, p.pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                  <span>Gastado: <span className="text-[var(--foreground)] font-medium">{fmtCOP(p.spent)}</span></span>
                  <span>Presupuesto: <span className="text-[var(--foreground)] font-medium">{fmtCOP(p.budget)}</span></span>
                </div>
                {p.pct > 100 && (
                  <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                    <AlertTriangle size={10} /> Excedido por {fmtCOP(p.spent - p.budget)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== LOADING ===== */}
      {loading && <SkeletonProjects />}

      {/* ===== EMPTY STATE ===== */}
      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
            <FolderKanban size={24} className="text-[var(--af-text3)]" />
          </div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin proyectos</div>
          <div className="text-xs mt-1">{hasActiveFilters || forms.projFilter ? 'No se encontraron resultados con los filtros aplicados' : 'Crea tu primer proyecto para empezar'}</div>
        </div>
      )}

      {/* ===== SELECT ALL BAR (when batch mode active) ===== */}
      {!loading && filteredProjects.length > 0 && selectedIds.size >= 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--muted-foreground)]">
            <button
              className="w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                borderColor: isAllSelected ? 'var(--af-accent)' : 'var(--border)',
                background: isAllSelected ? 'var(--af-accent)' : 'transparent',
              }}
              onClick={toggleSelectAll}
            >
              {isAllSelected && <CheckSquare size={13} className="text-background" />}
            </button>
            Seleccionar todos ({filteredProjects.length})
          </label>
          {selectedIds.size > 0 && (
            <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={clearSelection}>
              Limpiar selección
            </button>
          )}
        </div>
      )}

      {/* ===== TIMELINE VIEW ===== */}
      {!loading && viewMode === 'timeline' && filteredProjects.length > 0 && (
        <TimelineView projects={filteredProjects} getHealth={getHealth} />
      )}

      {/* ===== PROJECT CARDS ===== */}
      {!loading && viewMode === 'cards' && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p: Project) => {
            const d = p.data;
            const prog = d.progress || 0;
            const compName = companies.find((c: any) => c.id === d.companyId)?.data?.name;
            const stats = getProjectStats(p.id);
            const daysLeft = getDaysRemaining(d.endDate);
            const spent = getProjectSpent(p.id);
            const budgetPct = d.budget > 0 ? Math.round((spent / d.budget) * 100) : 0;
            const health = getHealth(p);
            const healthCfg = HEALTH_CONFIG[health.level];
            const isSelected = selectedIds.has(p.id);

            return (
              <div key={p.id} className={`bg-[var(--card)] border rounded-xl p-4 cursor-pointer transition-all hover:border-[var(--input)] hover:-translate-y-0.5 relative overflow-hidden group ${isSelected ? 'border-[var(--af-accent)] ring-1 ring-[var(--af-accent)]/30' : 'border-[var(--border)]'}`} onClick={() => openProject(p.id)}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--af-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* ★ Batch checkbox */}
                <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
                  <button
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all cursor-pointer ${isSelected ? 'bg-[var(--af-accent)] border-[var(--af-accent)]' : 'border-[var(--border)] bg-[var(--card)] opacity-0 group-hover:opacity-100 hover:opacity-100'}`}
                    onClick={() => toggleSelect(p.id)}
                  >
                    {isSelected && <CheckSquare size={13} className="text-background" />}
                  </button>
                </div>

                {/* Top: status + type + company + overdue + health + actions */}
                <div className="flex justify-between items-start mb-3 pr-8">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor(d.status)}`}>{STATUS_LABELS[d.status] || d.status || 'Concepto'}</span>
                    {d.projectType && d.projectType !== 'Ejecución' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${d.projectType === 'Diseño' ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' : d.projectType === 'Ambos' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                        {d.projectType}
                      </span>
                    )}
                    {compName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--af-text3)]">{compName}</span>}
                    {stats.overdue > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{stats.overdue}
                      </span>
                    )}
                    {/* ★ Health badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${healthCfg.bg} ${healthCfg.color}`} title={`Salud: ${health.score}/100`}>
                      {healthCfg.icon}
                      {health.score}
                    </span>
                  </div>
                  {/* Desktop edit/delete */}
                  <div className="hidden md:flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button className="px-2.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => openEditProject(p)}>✏️</button>
                    <button className="px-2.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer hover:bg-red-500/20" onClick={async () => { if (await confirmDialog.confirm({ title: 'Eliminar proyecto', description: `¿Estás seguro de eliminar "${d.name}"? Esta acción no se puede deshacer.` })) deleteProject(p.id); }}>🗑</button>
                  </div>
                  {/* Mobile overflow */}
                  <div className="md:hidden" onClick={e => e.stopPropagation()}>
                    <OverflowMenu
                      actions={[
                        { label: 'Editar proyecto', icon: <Pencil size={14} />, onClick: () => openEditProject(p) },
                        { label: 'Eliminar proyecto', icon: <Trash2 size={14} />, onClick: async () => { if (await confirmDialog.confirm({ title: 'Eliminar proyecto', description: `¿Estás seguro de eliminar "${d.name}"?` })) deleteProject(p.id); }, variant: 'danger', separator: true },
                      ]}
                      side="left"
                      align="end"
                    />
                  </div>
                </div>

                {/* Project name */}
                <div className="text-[15px] font-semibold mb-1 leading-tight">{d.name}</div>
                <div className="text-xs text-[var(--af-text3)] mb-3 truncate">
                  {d.location ? '📍 ' + d.location : ''}{d.location && d.client ? ' · ' : ''}{d.client || ''}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} />
                </div>

                {/* Budget progress (if has budget) */}
                {d.budget > 0 && (
                  <div className="mb-3">
                    <div className="h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${budgetPct > 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, budgetPct)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--af-text3)] mt-1">
                      <span>{fmtCOP(spent)} gastado</span>
                      <span className={budgetPct > 100 ? 'text-red-400 font-medium' : ''}>{budgetPct}% de {fmtCOP(d.budget)}</span>
                    </div>
                  </div>
                )}

                {/* ★ Health detail bars (mini) */}
                <div className="mb-3 flex gap-1">
                  {[
                    { label: 'Pres.', val: health.details.budget, max: 25 },
                    { label: 'Crono.', val: health.details.schedule, max: 25 },
                    { label: 'Tareas', val: health.details.tasks, max: 25 },
                    { label: 'Progr.', val: health.details.progress, max: 25 },
                  ].map((h) => (
                    <div key={h.label} className="flex-1 text-center">
                      <div className="h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${h.val >= 20 ? 'bg-emerald-500' : h.val >= 12 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${(h.val / h.max) * 100}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-[var(--muted-foreground)]">{h.label}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--foreground)]">{prog}%</span>
                    {d.budget > 0 && <span className="text-[var(--af-accent)] font-medium">{fmtCOP(d.budget)}</span>}
                    {stats.total > 0 && (
                      <span className="text-[var(--muted-foreground)]">
                        <CheckCircle2 size={10} className="inline mr-0.5 text-emerald-400" />{stats.completed}/{stats.total}
                      </span>
                    )}
                  </div>
                  {daysLeft !== null && d.status !== 'Terminado' && (
                    <span className={`flex items-center gap-1 font-medium ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft < 0 ? `-${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MOBILE FAB ===== */}
      <FloatingActionButton onClick={handleNewProject} ariaLabel="Nuevo proyecto" />

      {/* ===== BATCH ACTION BAR ===== */}
      {selectedIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          onExportPDF={batchExportPDF}
          onExportCSV={batchExportCSV}
          onStatusChange={batchChangeStatus}
        />
      )}

      {/* ===== CONFIRM DIALOG ===== */}
      <ConfirmDialog {...confirmDialog} />
    </div>
  );
}
