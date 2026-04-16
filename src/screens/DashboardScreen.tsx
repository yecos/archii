'use client';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useTimeTracking } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toSafeDate } from '@/lib/date-utils';
import { fmtCOP, fmtDate, statusColor } from '@/lib/helpers';
import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import {
  FolderKanban, Clock, DollarSign, AlertTriangle, ChevronDown, ChevronUp,
  ChevronRight, Settings, RotateCcw, Plus, FileText, Calendar,
  GripVertical, X, Check, BarChart3, PieChart, Activity, Users, Zap,
  Bell, MoreHorizontal, Download, FileSpreadsheet, ShieldCheck,
} from 'lucide-react';
import { exportGeneralReportPDF } from '@/lib/export-pdf';
import { exportProjectsExcel } from '@/lib/export-excel';
import dynamic from 'next/dynamic';
import type { Task, Expense, Invoice, TeamUser, DailyLog, Project, FirestoreTimestamp, NotifEntry } from '@/lib/types';

/* ===== Lazy-loaded chart component ===== */
const WidgetCharts = dynamic(() => import('@/components/dashboard/WidgetCharts'), {
  loading: () => <div className="card-elevated h-[200px] animate-pulse flex items-center justify-center text-[var(--af-text3)] text-sm">Cargando gráficos...</div>,
  ssr: false,
});

/* ===== TYPES ===== */

type WidgetId = 'kpi' | 'taskDistribution' | 'budgetOverview' | 'recentActivity' | 'upcomingDeadlines' | 'teamWorkload' | 'quickActions';

interface WidgetConfig {
  id: WidgetId;
  title: string;
  icon: string;
  description: string;
  defaultEnabled: boolean;
  spanFull?: boolean; // takes full width
}

interface DashboardConfig {
  enabledWidgets: WidgetId[];
  widgetOrder: WidgetId[];
  collapsedWidgets: WidgetId[];
}

/* ===== WIDGET DEFINITIONS ===== */

const ALL_WIDGETS: WidgetConfig[] = [
  { id: 'kpi', title: 'Indicadores Clave', icon: '📊', description: 'Resumen de KPIs principales', defaultEnabled: true, spanFull: true },
  { id: 'taskDistribution', title: 'Distribución de Tareas', icon: '🥧', description: 'Tareas por estado (pie chart)', defaultEnabled: true },
  { id: 'budgetOverview', title: 'Presupuesto por Proyecto', icon: '💰', description: 'Gastado vs presupuesto (bar chart)', defaultEnabled: true },
  { id: 'recentActivity', title: 'Actividad Reciente', icon: '🕐', description: 'Últimos 10 eventos', defaultEnabled: true },
  { id: 'upcomingDeadlines', title: 'Próximas Fechas Límite', icon: '📅', description: 'Tareas en los próximos 7 días', defaultEnabled: true },
  { id: 'teamWorkload', title: 'Carga de Trabajo', icon: '👥', description: 'Tareas por miembro del equipo', defaultEnabled: true },
  { id: 'quickActions', title: 'Acciones Rápidas', icon: '⚡', description: 'Crear proyecto, tarea, etc.', defaultEnabled: true },
];

const LS_KEY = 'archiflow-dashboard-config';

/* ===== LOCALSTORAGE PERSISTENCE ===== */

function getDefaultConfig(): DashboardConfig {
  return {
    enabledWidgets: ALL_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id),
    widgetOrder: ALL_WIDGETS.map(w => w.id),
    collapsedWidgets: [],
  };
}

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
      const defaults = getDefaultConfig();
      return {
        enabledWidgets: Array.isArray(parsed.enabledWidgets) ? parsed.enabledWidgets : defaults.enabledWidgets,
        widgetOrder: Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : defaults.widgetOrder,
        collapsedWidgets: Array.isArray(parsed.collapsedWidgets) ? parsed.collapsedWidgets : defaults.collapsedWidgets,
      };
    }
  } catch (err) {
    console.error('[ArchiFlow] Dashboard: Failed to load config:', err);
  }
  return getDefaultConfig();
}

function saveConfig(config: DashboardConfig): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[ArchiFlow] Dashboard: Failed to save config:', err);
  }
}

/* ===== HELPERS ===== */

function formatRelativeTime(date: Date | FirestoreTimestamp | null): string {
  try {
    const d = date && 'toDate' in date ? date.toDate() : new Date(date as Date);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    if (diffDay === 1) return 'Ayer';
    if (diffDay < 7) return `Hace ${diffDay} días`;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

/* ===== SUB-COMPONENTS ===== */

/* ─── Widget Frame ─── */
function WidgetFrame({
  widget,
  isCollapsed,
  onToggleCollapse,
  children,
}: {
  widget: WidgetConfig;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`card-elevated rounded-xl overflow-hidden transition-all duration-300 ${isCollapsed ? 'animate-fadeIn' : 'animate-fadeIn'}`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/50 cursor-pointer select-none" onClick={onToggleCollapse}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{widget.icon}</span>
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{widget.title}</h3>
        </div>
        <button className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] transition-colors cursor-pointer">
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {/* Widget Body */}
      {!isCollapsed && (
        <div className="p-4 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── KPI Widget ─── */
function KPIWidget({ projects, tasks, expenses, pendingApprovals }: {
  projects: Project[];
  tasks: Task[];
  expenses: Expense[];
  pendingApprovals: any[];
}) {
  const totalExpenses = useMemo(() => expenses.reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0), [expenses]);
  const overdueTasks = useMemo(() => tasks.filter((t: Task) => {
    if (t.data.status === 'Completado' || !t.data.dueDate) return false;
    return new Date(t.data.dueDate) < new Date();
  }), [tasks]);

  const kpis = [
    { val: projects.length, lbl: 'Proyectos totales', icon: <FolderKanban size={16} />, bg: 'bg-blue-500/10', iconColor: 'text-blue-400', sub: `${projects.filter((p: Project) => String(p.data.status) === 'Ejecucion' || p.data.status === 'En ejecución').length} en ejecución` },
    { val: tasks.filter((t: Task) => t.data.status !== 'Completado').length, lbl: 'Tareas activas', icon: <Clock size={16} />, bg: 'bg-orange-500/10', iconColor: 'text-orange-400', sub: `${tasks.filter((t: Task) => t.data.status === 'En progreso').length} en progreso` },
    { val: fmtCOP(totalExpenses), lbl: 'Gastos totales', icon: <DollarSign size={16} />, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', sub: `${expenses.length} registros` },
    { val: overdueTasks.length, lbl: 'Tareas vencidas', icon: <AlertTriangle size={16} />, bg: 'bg-red-500/10', iconColor: 'text-red-400', sub: overdueTasks.length === 0 ? 'Al día' : 'Requieren atención' },
    { val: pendingApprovals.length, lbl: 'Aprobaciones', icon: <ShieldCheck size={16} />, bg: 'bg-amber-500/10', iconColor: 'text-amber-400', sub: pendingApprovals.length === 0 ? 'Sin solicitudes' : 'Requiere revisión' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, i) => (
        <div key={i} className="card-glass card-glass-hover rounded-xl p-4 relative overflow-hidden cursor-default">
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--af-accent)]/30 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.iconColor}`}>{kpi.icon}</div>
            {kpi.val === overdueTasks.length && overdueTasks.length > 0 && <span className="status-pulse w-2 h-2 rounded-full bg-red-500" />}
          </div>
          <div className="text-xl md:text-2xl font-bold leading-tight font-tabular">{kpi.val}</div>
          <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5">{kpi.lbl}</div>
          <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Quick Actions Widget ─── */
function QuickActionsWidget({ navigateTo }: { navigateTo: (s: string) => void }) {
  const actions = [
    { label: 'Nuevo Proyecto', icon: <FolderKanban size={16} />, color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20', screen: 'projects' },
    { label: 'Nueva Tarea', icon: <FileText size={16} />, color: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20', screen: 'tasks' },
    { label: 'Calendario', icon: <Calendar size={16} />, color: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20', screen: 'calendar' },
    { label: 'Chat', icon: <Activity size={16} />, color: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20', screen: 'chat' },
    { label: 'Reportes', icon: <BarChart3 size={16} />, color: 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] hover:bg-[var(--af-accent)]/20 border-[var(--af-accent)]/20', screen: 'reports' },
    { label: 'Facturas', icon: <DollarSign size={16} />, color: 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border-pink-500/20', screen: 'invoices' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {actions.map((action) => (
        <button
          key={action.screen + action.label}
          onClick={() => navigateTo(action.screen)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--skeuo-shadow-raised-sm)] active:scale-[0.97] ${action.color}`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Recent Activity Widget ─── */
function RecentActivityWidget({ tasks, expenses, dailyLogs, projects, invoices }: {
  tasks: Task[];
  expenses: Expense[];
  dailyLogs: DailyLog[];
  projects: Project[];
  invoices: Invoice[];
}) {
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; icon: string; color: string; title: string; subtitle: string; time: FirestoreTimestamp | null | undefined }[] = [];

    tasks.filter((t: Task) => t.data.status === 'Completado' && t.data.updatedAt).slice(0, 5).forEach((t: Task) => {
      items.push({ id: `tc-${t.id}`, type: 'task', icon: '✅', color: 'bg-emerald-500', title: t.data.title, subtitle: `Tarea completada · ${projects.find((p: Project) => p.id === t.data.projectId)?.data?.name || ''}`, time: t.data.updatedAt });
    });
    expenses.slice(0, 5).forEach((e: Expense) => {
      items.push({ id: `exp-${e.id}`, type: 'expense', icon: '💰', color: 'bg-[var(--af-accent)]', title: e.data.concept, subtitle: `${fmtCOP(Number(e.data.amount))} · ${e.data.category}`, time: e.data.createdAt });
    });
    invoices.slice(0, 3).forEach((inv: Invoice) => {
      items.push({ id: `inv-${inv.id}`, type: 'invoice', icon: '🧾', color: 'bg-purple-500', title: `Factura ${inv.data.number || ''}`.trim(), subtitle: `${fmtCOP(Number(inv.data.total))} · ${inv.data.status}`, time: inv.data.createdAt });
    });
    dailyLogs.slice(0, 3).forEach((l: DailyLog) => {
      items.push({ id: `dl-${l.id}`, type: 'log', icon: '📝', color: 'bg-blue-500', title: `Bitácora ${l.data.date}`, subtitle: `${(l.data.activities || []).length} actividades`, time: l.data.createdAt });
    });

    items.sort((a, b) => {
      const ta = a.time ? toSafeDate(a.time) : new Date(0);
      const tb = b.time ? toSafeDate(b.time) : new Date(0);
      return tb.getTime() - ta.getTime();
    });
    return items.slice(0, 10);
  }, [tasks, expenses, dailyLogs, projects, invoices]);

  if (recentActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
        <div className="text-2xl mb-2">📭</div>
        <div className="text-xs">Sin actividad reciente</div>
      </div>
    );
  }

  return (
    <div className="space-y-0 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
      {recentActivity.map((item, idx) => {
        const isLast = idx === recentActivity.length - 1;
        return (
          <div key={item.id} className="relative flex gap-3">
            {/* Dot + Line */}
            <div className="flex flex-col items-center shrink-0" style={{ width: '20px' }}>
              <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0 mt-1.5 ring-2 ring-[var(--card)]`} />
              {!isLast && <div className="w-0.5 flex-1 bg-[var(--border)] min-h-[8px]" />}
            </div>
            {/* Content */}
            <div className="flex-1 pb-3 min-w-0">
              <div className="skeuo-well rounded-lg p-2.5 hover:bg-[var(--af-bg4)] transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-px">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[var(--foreground)] truncate leading-tight">{item.title}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate">{item.subtitle}</div>
                  </div>
                </div>
                {item.time && (
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1.5 ml-6">{formatRelativeTime(item.time)}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Upcoming Deadlines Widget ─── */
function UpcomingDeadlinesWidget({ tasks, projects, navigateTo }: {
  tasks: Task[];
  projects: Project[];
  navigateTo: (s: string) => void;
}) {
  const upcoming = useMemo(() => {
    return tasks
      .filter((t: Task) => {
        if (t.data.status === 'Completado' || !t.data.dueDate) return false;
        const d = daysUntil(t.data.dueDate);
        return d >= 0 && d <= 7;
      })
      .sort((a, b) => daysUntil(a.data.dueDate) - daysUntil(b.data.dueDate))
      .slice(0, 8);
  }, [tasks]);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
        <div className="text-2xl mb-2">🎉</div>
        <div className="text-xs">Sin fechas próximas</div>
      </div>
    );
  }

  const priorityColor = (p: string) => p === 'Urgente' ? 'bg-red-500/10 text-red-400 border-red-500/20' : p === 'Alta' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]';
  const urgencyBg = (d: number) => d === 0 ? 'bg-red-500/5 border-red-500/20' : d === 1 ? 'bg-amber-500/5 border-amber-500/20' : '';
  const urgencyBadge = (d: number) => {
    if (d === 0) return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">HOY</span>;
    if (d === 1) return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/80 text-white">MAÑANA</span>;
    return <span className="text-[10px] text-[var(--muted-foreground)]">{d} días</span>;
  };

  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
      {upcoming.map((t: Task) => {
        const proj = projects.find((p: Project) => p.id === t.data.projectId);
        const d = daysUntil(t.data.dueDate);
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border skeuo-well hover:bg-[var(--af-bg4)] transition-colors cursor-pointer ${urgencyBg(d)}`}
            onClick={() => navigateTo('tasks')}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">{t.data.title}</div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate">{proj?.data?.name || 'Sin proyecto'}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${priorityColor(t.data.priority)}`}>{t.data.priority}</span>
              {urgencyBadge(d)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Team Workload Widget (inline bars) ─── */
function TeamWorkloadInlineWidget({ tasks, teamUsers }: {
  tasks: Task[];
  teamUsers: TeamUser[];
}) {
  const workload = useMemo(() => {
    const byUser: Record<string, { total: number; active: number; done: number }> = {};
    teamUsers.forEach(u => { byUser[u.id] = { total: 0, active: 0, done: 0 }; });
    tasks.forEach((t: Task) => {
      if (t.data.assigneeId && byUser[t.data.assigneeId]) {
        byUser[t.data.assigneeId].total++;
        if (t.data.status === 'En progreso' || String(t.data.status) === 'En revisión') byUser[t.data.assigneeId].active++;
        if (t.data.status === 'Completado') byUser[t.data.assigneeId].done++;
      }
    });
    return Object.entries(byUser)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].active - a[1].active)
      .slice(0, 8)
      .map(([uid, data]) => {
        const user = teamUsers.find((u: TeamUser) => u.id === uid);
        return {
          name: (user?.data.name || 'Sin nombre').split(' ')[0],
          total: data.total,
          active: data.active,
          done: data.done,
          pending: data.total - data.active - data.done,
        };
      });
  }, [tasks, teamUsers]);

  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
        <div className="text-2xl mb-2">👥</div>
        <div className="text-xs">Sin tareas asignadas</div>
      </div>
    );
  }

  const maxTotal = Math.max(...workload.map(w => w.total), 1);

  return (
    <div className="space-y-3">
      {workload.map((w) => (
        <div key={w.name} className="group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold">{w.name}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{w.total} tareas</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{w.active}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{w.done}</span>
              {w.pending > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--af-bg4)] inline-block" />{w.pending}</span>}
            </div>
          </div>
          {/* Stacked bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--af-bg4)]">
            {w.active > 0 && (
              <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${(w.active / maxTotal) * 100}%` }} />
            )}
            {w.done > 0 && (
              <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${(w.done / maxTotal) * 100}%` }} />
            )}
            {w.pending > 0 && (
              <div className="bg-[var(--muted-foreground)]/20 h-full transition-all duration-500" style={{ width: `${(w.pending / maxTotal) * 100}%` }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Widget Configurator Panel ─── */
function WidgetConfigurator({
  isOpen,
  onClose,
  config,
  onConfigChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  onConfigChange: (c: DashboardConfig) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const orderedWidgets = ALL_WIDGETS.filter(w => config.widgetOrder.includes(w.id));

  const toggleWidget = (id: WidgetId) => {
    const enabled = config.enabledWidgets.includes(id);
    const newEnabled = enabled
      ? config.enabledWidgets.filter(w => w !== id)
      : [...config.enabledWidgets, id];
    onConfigChange({ ...config, enabledWidgets: newEnabled });
  };

  const moveWidget = (id: WidgetId, direction: 'up' | 'down') => {
    const order = [...config.widgetOrder];
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
    onConfigChange({ ...config, widgetOrder: order });
  };

  const resetToDefault = () => {
    const defaults = getDefaultConfig();
    onConfigChange(defaults);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fadeIn" />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-2xl animate-slideInRight" ref={panelRef}>
        <div className="h-full flex flex-col bg-[var(--background)] border-l border-[var(--border)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-[var(--af-accent)]" />
              <h2 className="text-sm font-bold">Personalizar Dashboard</h2>
            </div>
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] cursor-pointer transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Info text */}
          <div className="px-4 py-3 border-b border-[var(--border)]/50">
            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              Activa o desactiva widgets y reordénalos con las flechas. Los cambios se guardan automáticamente.
            </p>
          </div>

          {/* Widget List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin' }}>
            {orderedWidgets.map((widget) => {
              const isEnabled = config.enabledWidgets.includes(widget.id);
              const orderIdx = config.widgetOrder.indexOf(widget.id);
              const canMoveUp = orderIdx > 0;
              const canMoveDown = orderIdx < config.widgetOrder.length - 1;

              return (
                <div
                  key={widget.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isEnabled
                      ? 'border-[var(--border)] bg-[var(--card)]'
                      : 'border-[var(--border)]/30 bg-[var(--af-bg4)]/30 opacity-60'
                  }`}
                >
                  {/* Drag Handle (visual) */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => moveWidget(widget.id, 'up')}
                      disabled={!canMoveUp}
                      className={`p-0.5 rounded cursor-pointer transition-colors ${canMoveUp ? 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--af-bg4)]' : 'text-[var(--border)] cursor-not-allowed'}`}
                      aria-label="Mover arriba"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <GripVertical size={12} className="text-[var(--border)]" />
                    <button
                      onClick={() => moveWidget(widget.id, 'down')}
                      disabled={!canMoveDown}
                      className={`p-0.5 rounded cursor-pointer transition-colors ${canMoveDown ? 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--af-bg4)]' : 'text-[var(--border)] cursor-not-allowed'}`}
                      aria-label="Mover abajo"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Widget info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{widget.icon}</span>
                      <span className="text-[12px] font-semibold truncate">{widget.title}</span>
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate">{widget.description}</p>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className={`relative w-9 h-5 rounded-full shrink-0 cursor-pointer transition-all duration-200 border ${
                      isEnabled
                        ? 'bg-[var(--af-accent)] border-[var(--af-accent)]'
                        : 'bg-[var(--af-bg4)] border-[var(--border)]'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Activar ${widget.title}`}
                  >
                    <span
                      className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        isEnabled ? 'left-[calc(100%-18px)]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={resetToDefault}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              Restablecer valores predeterminados
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== MAIN DASHBOARD SCREEN ===== */

export default function DashboardScreen() {
  const { navigateTo, showToast } = useUI();
  const { authUser, loading, getUserName, teamUsers } = useAuth();
  const { projects, tasks, pendingCount, activeTasks, completedTasks, toggleTask, openProject, expenses, pendingApprovals } = useFirestore();
  const { timeEntries } = useTimeTracking();
  const { invoices } = useInvoice();
  const { unreadCount, notifHistory } = useNotif();
  const { dailyLogs } = useComments();
  const [config, setConfig] = useState<DashboardConfig>(loadConfig);
  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);
  const { accent } = useThemeColors();

  // Persist config changes
  const handleConfigChange = useCallback((newConfig: DashboardConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  // Close toolbar menu on outside click
  React.useEffect(() => {
    if (!toolbarMenuOpen) return;
    const handler = (e: Event) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target as Node)) {
        setToolbarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [toolbarMenuOpen]);

  // ─── Computed data for chart widgets ───

  const taskStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    tasks.forEach((t: Task) => { statuses[t.data.status] = (statuses[t.data.status] || 0) + 1; });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const budgetOverviewData = useMemo(() => {
    const spentByProject: Record<string, number> = {};
    expenses.forEach((e: Expense) => {
      const pid = e.data.projectId;
      if (pid) spentByProject[pid] = (spentByProject[pid] || 0) + (Number(e.data.amount) || 0);
    });
    return projects
      .filter((p: Project) => (Number(p.data.budget) || 0) > 0)
      .slice(0, 6)
      .map((p: Project) => ({
        name: p.data.name.length > 15 ? p.data.name.slice(0, 15) + '…' : p.data.name,
        presupuesto: Number(p.data.budget) || 0,
        gastado: spentByProject[p.id] || 0,
      }));
  }, [projects, expenses]);

  const teamWorkloadData = useMemo(() => {
    const byUser: Record<string, { total: number; active: number; done: number }> = {};
    teamUsers.forEach(u => { byUser[u.id] = { total: 0, active: 0, done: 0 }; });
    tasks.forEach((t: Task) => {
      if (t.data.assigneeId && byUser[t.data.assigneeId]) {
        byUser[t.data.assigneeId].total++;
        if (t.data.status === 'En progreso' || String(t.data.status) === 'En revisión') byUser[t.data.assigneeId].active++;
        if (t.data.status === 'Completado') byUser[t.data.assigneeId].done++;
      }
    });
    return Object.entries(byUser)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].active - a[1].active)
      .slice(0, 6)
      .map(([uid, data]) => {
        const user = teamUsers.find((u: TeamUser) => u.id === uid);
        return {
          name: (user?.data.name || 'Sin nombre').split(' ')[0],
          activas: data.active,
          completadas: data.done,
          pendientes: data.total - data.active - data.done,
        };
      });
  }, [tasks, teamUsers]);

  // ─── Render widgets based on config ───

  const enabledOrderedWidgets = config.widgetOrder.filter(id => config.enabledWidgets.includes(id));

  const renderWidget = (id: WidgetId) => {
    const widget = ALL_WIDGETS.find(w => w.id === id);
    if (!widget) return null;
    const isCollapsed = config.collapsedWidgets.includes(id);
    const toggleCollapse = () => {
      const collapsed = isCollapsed
        ? config.collapsedWidgets.filter(w => w !== id)
        : [...config.collapsedWidgets, id];
      handleConfigChange({ ...config, collapsedWidgets: collapsed });
    };

    const content = (() => {
      switch (id) {
        case 'kpi':
          return <KPIWidget projects={projects} tasks={tasks} expenses={expenses} pendingApprovals={pendingApprovals} />;
        case 'taskDistribution':
          return <WidgetCharts type="pie" data={taskStatusData} accent={accent} />;
        case 'budgetOverview':
          return <WidgetCharts type="budget" data={budgetOverviewData} accent={accent} />;
        case 'recentActivity':
          return <RecentActivityWidget tasks={tasks} expenses={expenses} dailyLogs={dailyLogs} projects={projects} invoices={invoices} />;
        case 'upcomingDeadlines':
          return <UpcomingDeadlinesWidget tasks={tasks} projects={projects} navigateTo={navigateTo} />;
        case 'teamWorkload':
          return <WidgetCharts type="workload" data={teamWorkloadData} accent={accent} />;
        case 'quickActions':
          return <QuickActionsWidget navigateTo={navigateTo} />;
        default:
          return null;
      }
    })();

    return (
      <WidgetFrame key={id} widget={widget} isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse}>
        {content}
      </WidgetFrame>
    );
  };

  // Split widgets into full-span and regular
  const fullSpanWidgets = enabledOrderedWidgets.filter(id => ALL_WIDGETS.find(w => w.id === id)?.spanFull);
  const regularWidgets = enabledOrderedWidgets.filter(id => !ALL_WIDGETS.find(w => w.id === id)?.spanFull);

  return (
    <div className="animate-fadeIn space-y-5">
      {loading && <SkeletonDashboard />}
      {!loading && (<>

      {/* ─── Dashboard Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="skeuo-badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20">v3.0</span>
          <span className="text-[11px] text-[var(--af-text3)]">Dashboard Personalizable</span>
          <span className="text-[11px] text-[var(--af-text3)] hidden sm:inline">
            · {enabledOrderedWidgets.length} widget{enabledOrderedWidgets.length !== 1 ? 's' : ''} activo{enabledOrderedWidgets.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            className="skeuo-btn flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20 cursor-pointer hover:bg-[var(--af-accent)]/20 transition-all"
            onClick={() => setConfiguratorOpen(true)}
          >
            <Settings size={13} />
            <span className="sm:inline hidden">Personalizar</span>
          </button>
          {/* Export PDF */}
          <button className="hidden sm:flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportGeneralReportPDF({ projects, tasks, expenses, invoices, teamUsers, timeEntries }); showToast('Reporte PDF descargado'); } catch (err) { showToast('Error', 'error'); }
          }}>
            <FileText size={12} /> PDF
          </button>
          {/* Export Excel */}
          <button className="hidden sm:flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportProjectsExcel(projects, tasks, expenses); showToast('Excel descargado'); } catch (err) { showToast('Error', 'error'); }
          }}>
            <Download size={12} /> Excel
          </button>
          {/* Mobile overflow */}
          <div className="relative sm:hidden" ref={toolbarMenuRef}>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => setToolbarMenuOpen(!toolbarMenuOpen)} aria-label="Más opciones">
              <MoreHorizontal size={16} />
            </button>
            {toolbarMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 skeuo-panel rounded-lg p-1 min-w-[160px] shadow-lg animate-fadeIn">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] rounded-md transition-colors" onClick={() => {
                  try { exportGeneralReportPDF({ projects, tasks, expenses, invoices, teamUsers, timeEntries }); showToast('Reporte PDF descargado'); } catch { showToast('Error', 'error'); }
                  setToolbarMenuOpen(false);
                }}>
                  <FileText size={13} /> Reporte PDF
                </button>
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] rounded-md transition-colors" onClick={() => {
                  try { exportProjectsExcel(projects, tasks, expenses); showToast('Excel descargado'); } catch { showToast('Error', 'error'); }
                  setToolbarMenuOpen(false);
                }}>
                  <Download size={13} /> Exportar Excel
                </button>
                <div className="h-px bg-[var(--border)] my-1" />
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/5 rounded-md transition-colors" onClick={() => {
                  setConfiguratorOpen(true);
                  setToolbarMenuOpen(false);
                }}>
                  <Settings size={13} /> Personalizar widgets
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Widget Configurator Panel ─── */}
      <WidgetConfigurator
        isOpen={configuratorOpen}
        onClose={() => setConfiguratorOpen(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

      {/* ─── Empty State ─── */}
      {enabledOrderedWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 card-elevated rounded-xl">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-[15px] font-semibold mb-2">Dashboard vacío</div>
          <div className="text-[13px] text-[var(--muted-foreground)] mb-4 text-center max-w-xs">
            Activa widgets para personalizar tu dashboard.
          </div>
          <button
            className="skeuo-btn flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-[var(--af-accent)] text-[var(--primary-foreground)] cursor-pointer hover:opacity-90 transition-all"
            onClick={() => setConfiguratorOpen(true)}
          >
            <Settings size={14} />
            Configurar widgets
          </button>
        </div>
      )}

      {/* ─── Full-Span Widgets ─── */}
      {fullSpanWidgets.length > 0 && (
        <div className="space-y-4">
          {fullSpanWidgets.map(id => renderWidget(id))}
        </div>
      )}

      {/* ─── Widget Grid (3 cols desktop, 2 tablet, 1 mobile) ─── */}
      {regularWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {regularWidgets.map(id => renderWidget(id))}
        </div>
      )}

      </>)}
    </div>
  );
}
