'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import { fmtCOP, fmtDate, statusColor, prioColor, getInitials, avatarColor } from '@/lib/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, FolderKanban, Clock, DollarSign, AlertTriangle, Users, CheckCircle, Zap, Target, ArrowUpRight, ArrowDownRight, Timer, CalendarCheck, BarChart3, FileDown, MessageSquare, Hammer } from 'lucide-react';

const CHART_COLORS = ['#c8a96e', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-[12px]">
      {label && <div className="font-semibold text-[var(--foreground)] mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-[var(--muted-foreground)]">{p.name}:</span>
          <span className="font-semibold">{typeof p.value === 'number' && p.value > 9999 ? fmtCOP(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Health Score Ring ─── */
function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Bueno' : score >= 40 ? 'Atención' : 'Crítico';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="2.5" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={`${score.toFixed(1)}, 100`} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold" style={{ color }}>{Math.round(score)}%</span>
        <span className="text-[8px] text-[var(--muted-foreground)]">{label}</span>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const {
    loading, projects, tasks, pendingCount, navigateTo, toggleTask, openProject, getUserName,
    activeTasks, completedTasks, unreadCount, notifHistory, expenses, invoices, teamUsers, authUser,
    dailyLogs, timeEntries, punchList, checklists,
  } = useApp();

  // ─── Computed data ───
  const totalExpenses = useMemo(() => expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0), [expenses]);
  const totalInvoiced = useMemo(() => invoices.reduce((s: number, inv: any) => s + (Number(inv.data.total) || 0), 0), [invoices]);
  const totalBudget = useMemo(() => projects.reduce((s: number, p: any) => s + (Number(p.data.budget) || 0), 0), [projects]);
  const overdueTasks = useMemo(() => tasks.filter((t: any) => {
    if (t.data.status === 'Completado' || !t.data.dueDate) return false;
    return new Date(t.data.dueDate) < new Date();
  }), [tasks]);
  const urgentTasks = useMemo(() => tasks.filter((t: any) => {
    if (t.data.status === 'Completado' || !t.data.dueDate) return false;
    const diff = (new Date(t.data.dueDate).getTime() - new Date().getTime()) / 86400000;
    return diff <= 3 && diff >= 0;
  }), [tasks]);

  // ─── Project Health Scores ───
  const projectHealth = useMemo(() => {
    return projects.slice(0, 5).map((p: any) => {
      const prog = Number(p.data.progress) || 0;
      const budget = Number(p.data.budget) || 0;
      const projExpenses = expenses.filter((e: any) => e.data.projectId === p.id).reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
      const projTasks = tasks.filter((t: any) => t.data.projectId === p.id);
      const doneTasks = projTasks.filter((t: any) => t.data.status === 'Completado').length;
      const taskRatio = projTasks.length > 0 ? doneTasks / projTasks.length : 0;
      const budgetRatio = budget > 0 ? 1 - (projExpenses / budget) : 1;
      const isOverdue = p.data.endDate && new Date(p.data.endDate) < new Date() && p.data.status !== 'Terminado';
      let score = (taskRatio * 40) + (budgetRatio * 30) + (prog / 100 * 30);
      if (isOverdue) score = Math.max(score - 20, 0);
      score = Math.min(Math.max(score, 0), 100);
      return { ...p, healthScore: score, projExpenses, projTasks: projTasks.length, doneTasks, isOverdue };
    });
  }, [projects, tasks, expenses]);

  // ─── Team Productivity ───
  const teamProductivity = useMemo(() => {
    return teamUsers.slice(0, 6).map((u: any) => {
      const userTasks = tasks.filter((t: any) => t.data.assigneeId === u.id);
      const done = userTasks.filter((t: any) => t.data.status === 'Completado').length;
      const inProgress = userTasks.filter((t: any) => t.data.status === 'En progreso').length;
      const totalTime = timeEntries.filter((te: any) => te.data.userId === u.id).reduce((s: number, te: any) => s + (Number(te.data.minutes) || 0), 0);
      return { ...u, totalTasks: userTasks.length, done, inProgress, totalMinutes: totalTime };
    }).sort((a: any, b: any) => b.done - a.done);
  }, [teamUsers, tasks, timeEntries]);

  // ─── Upcoming Deadlines (7 days) ───
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    return tasks
      .filter((t: any) => {
        if (t.data.status === 'Completado' || !t.data.dueDate) return false;
        const d = new Date(t.data.dueDate);
        return d >= now && d <= week;
      })
      .sort((a: any, b: any) => new Date(a.data.dueDate).getTime() - new Date(b.data.dueDate).getTime())
      .slice(0, 8);
  }, [tasks]);

  // ─── Burndown chart data ───
  const burndownData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const total = pendingCount + completedTasks.length;
    return days.map((label, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dayStr = d.toISOString().split('T')[0];
      const done = tasks.filter((t: any) => {
        if (t.data.status !== 'Completado' || !t.data.updatedAt) return false;
        try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === dayStr : false; } catch { return false; }
      }).length;
      let doneSoFar = 0;
      for (let j = 0; j <= i; j++) {
        const dj = new Date(today);
        dj.setDate(today.getDate() + mondayOffset + j);
        const djStr = dj.toISOString().split('T')[0];
        doneSoFar += tasks.filter((t: any) => {
          if (t.data.status !== 'Completado' || !t.data.updatedAt) return false;
          try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === djStr : false; } catch { return false; }
        }).length;
      }
      return { name: label, pendientes: Math.max(total - doneSoFar, 0), completadas: done };
    });
  }, [tasks, pendingCount, completedTasks]);

  // ─── Task status distribution ───
  const taskStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    tasks.forEach((t: any) => { statuses[t.data.status] = (statuses[t.data.status] || 0) + 1; });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // ─── Expenses by category ───
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.data.category] = (cats[e.data.category] || 0) + (Number(e.data.amount) || 0); });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [expenses]);

  // ─── Weekly trend (tasks created vs completed) ───
  const weeklyTrend = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return days.map((label, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dayStr = d.toISOString().split('T')[0];
      let created = 0, completed = 0;
      tasks.forEach((t: any) => {
        if (!t.data.createdAt && !t.data.updatedAt) return;
        try {
          const createdStr = t.data.createdAt?.toDate?.().toISOString().split('T')[0];
          const completedStr = (t.data.status === 'Completado' && t.data.updatedAt?.toDate?.().toISOString().split('T')[0]);
          if (createdStr === dayStr) created++;
          if (completedStr === dayStr) completed++;
        } catch {}
      });
      return { name: label, creadas: created, completadas: completed };
    });
  }, [tasks]);

  // ─── Recent activity ───
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; title: string; subtitle: string; time: any; icon: string; color: string }[] = [];
    tasks.filter((t: any) => t.data.status === 'Completado' && t.data.updatedAt).slice(0, 5).forEach((t: any) => {
      items.push({ id: t.id, type: 'task', title: t.data.title, subtitle: `Tarea completada · ${projects.find((p: any) => p.id === t.data.projectId)?.data?.name || ''}`, time: t.data.updatedAt, icon: '✓', color: 'bg-emerald-500' });
    });
    expenses.slice(0, 5).forEach((e: any) => {
      items.push({ id: e.id, type: 'expense', title: e.data.concept, subtitle: `${fmtCOP(Number(e.data.amount))} · ${e.data.category}`, time: e.data.createdAt, icon: '$', color: 'bg-[var(--af-accent)]' });
    });
    dailyLogs.slice(0, 3).forEach((l: any) => {
      items.push({ id: l.id, type: 'log', title: `Bitácora ${l.data.date}`, subtitle: `${(l.data.activities || []).length} actividades`, time: l.data.createdAt, icon: '📝', color: 'bg-blue-500' });
    });
    items.sort((a, b) => {
      const ta = a.time?.toDate?.() || new Date(a.time) || new Date(0);
      const tb = b.time?.toDate?.() || new Date(b.time) || new Date(0);
      return tb.getTime() - ta.getTime();
    });
    return items.slice(0, 8);
  }, [tasks, expenses, dailyLogs, projects]);

  // ─── Punch list summary ───
  const punchSummary = useMemo(() => {
    const items = (punchList || []) as any[];
    const pending = items.filter((p: any) => p.data.status === 'Pendiente').length;
    const inProgress = items.filter((p: any) => p.data.status === 'En progreso').length;
    const resolved = items.filter((p: any) => p.data.status === 'Resuelto' || p.data.status === 'Verificado').length;
    return { total: items.length, pending, inProgress, resolved };
  }, [punchList]);

  // ─── Quick Stats ───
  const quickStats = [
    { val: projects.length, lbl: 'Proyectos totales', icon: <FolderKanban size={16} />, bg: 'bg-blue-500/10', iconColor: 'text-blue-400', sub: `${projects.filter((p: any) => p.data.status === 'Ejecucion').length} en ejecución`, trend: null },
    { val: pendingCount, lbl: 'Tareas pendientes', icon: <Clock size={16} />, bg: 'bg-orange-500/10', iconColor: 'text-orange-400', sub: `${activeTasks.length} en progreso`, trend: pendingCount > 0 ? <ArrowUpRight size={12} className="text-orange-400" /> : null },
    { val: fmtCOP(totalExpenses), lbl: 'Gastos totales', icon: <DollarSign size={16} />, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', sub: `${expenses.length} registros`, trend: totalBudget > 0 ? <span className="text-[10px] text-emerald-400">{Math.round(totalExpenses / totalBudget * 100)}% del presupuesto</span> : null },
    { val: overdueTasks.length, lbl: 'Tareas vencidas', icon: <AlertTriangle size={16} />, bg: overdueTasks.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10', iconColor: overdueTasks.length > 0 ? 'text-red-400' : 'text-emerald-400', sub: overdueTasks.length === 0 ? 'Al día' : 'Requieren atención', trend: overdueTasks.length > 0 ? <ArrowUpRight size={12} className="text-red-400" /> : <CheckCircle size={12} className="text-emerald-400" /> },
  ];

  return (
    <div className="animate-fadeIn space-y-5">
      {loading && <SkeletonDashboard />}
      {!loading && (<>

      {/* ═══ Row 1: KPI Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickStats.map((m, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5 hover:border-[var(--af-accent)]/30 transition-all cursor-default group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center ${m.iconColor}`}>{m.icon}</div>
              {m.trend && <div className="flex items-center gap-1">{m.trend}</div>}
            </div>
            <div className="text-xl md:text-2xl font-bold leading-tight">{m.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5">{m.lbl}</div>
            <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ Row 2: Quick Actions + Upcoming Deadlines ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-[var(--af-accent)]" />
            <div className="text-[15px] font-semibold">Acciones Rápidas</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Nuevo Proyecto', icon: <FolderKanban size={15} />, screen: 'projects', color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
              { label: 'Nueva Tarea', icon: <CheckCircle size={15} />, screen: 'tasks', color: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' },
              { label: 'Ver Kanban', icon: <BarChart3 size={15} />, screen: 'kanbanAvanzado', color: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' },
              { label: 'Diagrama Gantt', icon: <Target size={15} />, screen: 'gantt', color: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
              { label: 'Bitácora', icon: <Timer size={15} />, screen: 'bitacora', color: 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' },
              { label: 'Punch List', icon: <Hammer size={15} />, screen: 'punchList', color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
              { label: 'Checklists', icon: <CalendarCheck size={15} />, screen: 'checklists', color: 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' },
              { label: 'Notas', icon: <MessageSquare size={15} />, screen: 'notas', color: 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/20' },
            ].map((a, i) => (
              <button key={i} className={`flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-[12.5px] font-medium cursor-pointer transition-all border border-transparent ${a.color}`} onClick={() => navigateTo(a.screen)}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={16} className="text-orange-400" />
              <div className="text-[15px] font-semibold">Próximas Entregas (7 días)</div>
            </div>
            {upcomingDeadlines.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">{upcomingDeadlines.length} pendientes</span>}
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
              <div className="text-sm text-[var(--af-text3)]">Sin entregas próximas</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {upcomingDeadlines.map((t: any) => {
                const daysLeft = Math.ceil((new Date(t.data.dueDate).getTime() - new Date().getTime()) / 86400000);
                const isToday = daysLeft === 0;
                const isUrgent = daysLeft <= 1;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)] transition-colors cursor-pointer" onClick={() => toggleTask(t.id)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-red-500/20 text-red-400' : isUrgent ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      <span className="text-[11px] font-bold">{daysLeft}d</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{t.data.title}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">{projects.find((p: any) => p.id === t.data.projectId)?.data?.name || 'Sin proyecto'}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Row 3: Project Health + Team Productivity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project Health */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[var(--af-accent)]" />
              <div className="text-[15px] font-semibold">Salud de Proyectos</div>
            </div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('projects')}>Ver todos</button>
          </div>
          {projectHealth.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Crea tu primer proyecto</div>
          ) : (
            <div className="space-y-3">
              {projectHealth.map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 p-3 bg-[var(--af-bg3)] rounded-lg cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => openProject(p.id)}>
                  <HealthRing score={p.healthScore} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold truncate">{p.data.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(p.data.status)}`}>{p.data.status}</span>
                      {p.isOverdue && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
                      <span>{p.doneTasks}/{p.projTasks} tareas</span>
                      <span>·</span>
                      <span>{p.data.progress || 0}% avance</span>
                      <span>·</span>
                      <span className={p.projExpenses > 0 && p.data.budget > 0 && (p.projExpenses / p.data.budget) > 0.9 ? 'text-red-400' : ''}>{fmtCOP(p.projExpenses)} gastado</span>
                    </div>
                    <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden mt-2">
                      <div className={`h-full rounded-full transition-all duration-500 ${Number(p.data.progress) >= 80 ? 'bg-emerald-500' : Number(p.data.progress) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: (p.data.progress || 0) + '%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Productivity */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-violet-400" />
              <div className="text-[15px] font-semibold">Productividad del Equipo</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">{teamProductivity.length} miembros</span>
          </div>
          {teamProductivity.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin miembros del equipo</div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {teamProductivity.map((u: any) => {
                const rate = u.totalTasks > 0 ? Math.round((u.done / u.totalTasks) * 100) : 0;
                const hours = Math.floor(u.totalMinutes / 60);
                const mins = u.totalMinutes % 60;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 bg-[var(--af-bg3)] rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(u.id)}`}>
                      {u.data?.photoURL ? <img src={u.data.photoURL} className="w-full h-full rounded-full object-cover" alt="" /> : getInitials(u.data?.name || u.data?.email || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{u.data?.name || u.data?.email || 'Usuario'}</div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        <span>{u.done} completadas</span>
                        <span>·</span>
                        <span>{u.inProgress} en curso</span>
                        <span>·</span>
                        <span>{hours}h {mins}m</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-[14px] font-bold ${rate >= 70 ? 'text-emerald-400' : rate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{rate}%</div>
                      <div className="text-[9px] text-[var(--muted-foreground)]">efectividad</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Row 4: Charts ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Trend */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-emerald-400" />
            <div className="text-[15px] font-semibold">Tendencia Semanal</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="creadas" name="Creadas" stroke="#c8a96e" fill="rgba(200,169,110,0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="completadas" name="Completadas" stroke="#10b981" fill="rgba(16,185,129,0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Burndown Chart */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-4">Burndown Semanal</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={burndownData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(200,169,110,0.06)' }} />
              <Bar dataKey="pendientes" name="Pendientes" fill="rgba(200,169,110,0.4)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Row 5: Financial + Activity + Pie + Punch ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sprint Progress Ring */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3">Progreso Sprint</div>
          <div className="flex items-center justify-center">
            <div className="relative w-[100px] h-[100px]">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="2.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tasks.length > 0 ? (completedTasks.length / tasks.length) >= 0.8 ? '#10b981' : (completedTasks.length / tasks.length) >= 0.4 ? '#c8a96e' : '#f59e0b' : 'var(--af-bg4)'} strokeWidth="2.5" strokeDasharray={`${tasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(1) : 0}, 100`} strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[20px] font-bold">{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-[12px] text-[var(--muted-foreground)]">{completedTasks.length} de {tasks.length} tareas</div>
            <div className="text-[11px] text-emerald-400 mt-1">{activeTasks.length} en progreso</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3">Resumen Financiero</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]" />
                <span className="text-[13px]">Presupuesto</span>
              </div>
              <span className="text-[13px] font-semibold">{fmtCOP(totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[13px]">Facturado</span>
              </div>
              <span className="text-[13px] font-semibold">{fmtCOP(totalInvoiced)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[13px]">Gastado</span>
              </div>
              <span className="text-[13px] font-semibold text-red-400">{fmtCOP(totalExpenses)}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--muted-foreground)]">Balance</span>
                <span className={`text-[14px] font-bold ${totalInvoiced - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtCOP(totalInvoiced - totalExpenses)}
                </span>
              </div>
              {totalBudget > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] text-[var(--muted-foreground)]">Ejecutado</span>
                  <span className="text-[12px] font-semibold">{Math.round(totalExpenses / totalBudget * 100)}%</span>
                </div>
              )}
            </div>
          </div>
          <button className="w-full mt-3 text-xs text-[var(--af-accent)] cursor-pointer hover:underline text-center" onClick={() => navigateTo('invoices')}>
            Ver facturas →
          </button>
        </div>

        {/* Punch List Summary */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Punch List</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('punchList')}>Ver →</button>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[12px]">Pendientes</span>
              </div>
              <span className="text-[13px] font-bold text-amber-400">{punchSummary.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[12px]">En progreso</span>
              </div>
              <span className="text-[13px] font-bold text-blue-400">{punchSummary.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[12px]">Resueltos</span>
              </div>
              <span className="text-[13px] font-bold text-emerald-400">{punchSummary.resolved}</span>
            </div>
            {punchSummary.total > 0 && (
              <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden mt-1">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(punchSummary.resolved / punchSummary.total * 100).toFixed(0)}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3">Distribución Tareas</div>
          {taskStatusData.length === 0 ? (
            <div className="text-center py-6 text-[var(--af-text3)] text-[12px]">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} dataKey="value" stroke="none">
                  {taskStatusData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {taskStatusData.map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-[var(--muted-foreground)]">{d.name}</span>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Row 6: Expense by Category + Recent Activity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense by Category */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Gastos por Categoría</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('budget')}>Ver presupuesto →</button>
          </div>
          {expenseByCategory.length === 0 ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin gastos registrados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={expenseByCategory} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Gasto" fill="#c8a96e" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Actividad Reciente</div>
            <TrendingUp size={16} className="text-[var(--af-text3)]" />
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin actividad reciente</div>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {recentActivity.map(item => (
                <div key={item.id + item.type} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5`}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{item.title}</div>
                    <div className="text-[11px] text-[var(--af-text3)] truncate">{item.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      </>)}
    </div>
  );
}
