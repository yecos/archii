'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import { fmtCOP, fmtDate, statusColor } from '@/lib/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, FolderKanban, Clock, DollarSign, AlertTriangle, Download, FileText, Zap } from 'lucide-react';
import { exportGeneralReportPDF } from '@/lib/export-pdf';
import { exportProjectsExcel } from '@/lib/export-excel';

const CHART_COLORS = ['#c8a96e', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

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

export default function DashboardScreen() {
  const {
    loading, projects, tasks, pendingCount, navigateTo, toggleTask, openProject, getUserName,
    activeTasks, completedTasks, unreadCount, notifHistory, expenses, invoices, teamUsers, authUser,
    dailyLogs, timeEntries, showToast,
  } = useApp();

  // Computed data
  const totalExpenses = useMemo(() => expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0), [expenses]);
  const totalInvoiced = useMemo(() => invoices.reduce((s: number, inv: any) => s + (Number(inv.data.total) || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter((i: any) => i.data.status === 'Pagada').reduce((s: number, i: any) => s + (Number(i.data.total) || 0), 0), [invoices]);
  const overdueTasks = useMemo(() => tasks.filter((t: any) => {
    if (t.data.status === 'Completado' || !t.data.dueDate) return false;
    return new Date(t.data.dueDate) < new Date();
  }), [tasks]);

  // Burndown chart data
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
      const done = i === 0 ? doneSoFar : doneSoFar - days.slice(0, i).reduce((acc, _, k) => {
        const dk = new Date(today);
        dk.setDate(today.getDate() + mondayOffset + k);
        const dkStr = dk.toISOString().split('T')[0];
        return acc + tasks.filter((t: any) => {
          if (t.data.status !== 'Completado' || !t.data.updatedAt) return false;
          try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === dkStr : false; } catch { return false; }
        }).length;
      }, 0);
      return { name: label, pendientes: Math.max(total - doneSoFar, 0), completadas: done };
    });
  }, [tasks, pendingCount, completedTasks]);

  // Task status distribution
  const taskStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    tasks.forEach((t: any) => { statuses[t.data.status] = (statuses[t.data.status] || 0) + 1; });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Expenses by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.data.category] = (cats[e.data.category] || 0) + (Number(e.data.amount) || 0); });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [expenses]);

  // NEW: Revenue trend (last 6 months)
  const revenueTrend = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data: { name: string; facturado: number; cobrado: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthInvoiced = invoices.filter((inv: any) => {
        if (!inv.data.issueDate || inv.data.status === 'Cancelada') return false;
        return inv.data.issueDate.startsWith(key);
      }).reduce((s, inv) => s + (inv.data.total || 0), 0);
      const monthPaid = invoices.filter((inv: any) => {
        if (!inv.data.paidDate) return false;
        try {
          const d = inv.data.paidDate?.toDate ? inv.data.paidDate.toDate() : new Date(inv.data.paidDate);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
        } catch { return false; }
      }).reduce((s, inv) => s + (inv.data.total || 0), 0);
      data.push({ name: monthNames[d.getMonth()], facturado: monthInvoiced, cobrado: monthPaid });
    }
    return data;
  }, [invoices]);

  // NEW: Team workload
  const teamWorkload = useMemo(() => {
    const byUser: Record<string, { total: number; active: number; done: number }> = {};
    teamUsers.forEach(u => { byUser[u.id] = { total: 0, active: 0, done: 0 }; });
    tasks.forEach((t: any) => {
      if (t.data.assigneeId && byUser[t.data.assigneeId]) {
        byUser[t.data.assigneeId].total++;
        if (t.data.status === 'En progreso' || t.data.status === 'Revision') byUser[t.data.assigneeId].active++;
        if (t.data.status === 'Completado') byUser[t.data.assigneeId].done++;
      }
    });
    return Object.entries(byUser)
      .filter(([_, v]) => v.total > 0)
      .sort((a, b) => b[1].active - a[1].active)
      .slice(0, 6)
      .map(([uid, data]) => {
        const user = teamUsers.find((u: any) => u.id === uid);
        return {
          name: (user?.data.name || 'Sin nombre').split(' ')[0],
          activas: data.active,
          completadas: data.done,
          pendientes: data.total - data.active - data.done,
        };
      });
  }, [tasks, teamUsers]);

  // Recent activity
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

  return (
    <div className="animate-fadeIn space-y-5">
      {loading && <SkeletonDashboard />}
      {!loading && (<>

      {/* ─── v2.0 Badge ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="af-badge-gold">v2.0</span>
          <span className="text-[11px] text-[var(--af-text3)]">Dashboard Premium</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportGeneralReportPDF({ projects, tasks, expenses, invoices, teamUsers, timeEntries }); showToast('Reporte PDF descargado'); } catch { showToast('Error', 'error'); }
          }}>
            <FileText size={12} /> PDF
          </button>
          <button className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportProjectsExcel(projects, tasks, expenses); showToast('Excel descargado'); } catch { showToast('Error', 'error'); }
          }}>
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* ─── Row 1: KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { val: projects.length, lbl: 'Proyectos totales', icon: <FolderKanban size={16} />, bg: 'bg-blue-500/10', iconColor: 'text-blue-400', sub: `${projects.filter((p: any) => p.data.status === 'Ejecucion').length} en ejecución` },
          { val: pendingCount, lbl: 'Tareas pendientes', icon: <Clock size={16} />, bg: 'bg-orange-500/10', iconColor: 'text-orange-400', sub: `${activeTasks.length} en progreso` },
          { val: fmtCOP(totalExpenses), lbl: 'Gastos totales', icon: <DollarSign size={16} />, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', sub: `${expenses.length} registros` },
          { val: overdueTasks.length, lbl: 'Tareas vencidas', icon: <AlertTriangle size={16} />, bg: 'bg-red-500/10', iconColor: 'text-red-400', sub: overdueTasks.length === 0 ? 'Al día' : 'Requieren atención' },
        ].map((m, i) => (
          <div key={i} className={`af-kpi-card p-5 animate-fadeInUp stagger-${i + 1} hover:border-[var(--af-accent)]/30 transition-colors cursor-default`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center ${m.iconColor}`}>{m.icon}</div>
              {i === 3 && overdueTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
            <div className="text-xl md:text-2xl font-bold leading-tight">{m.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5">{m.lbl}</div>
            <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Row 2: Projects + Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Proyectos recientes</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('projects')}>Ver todos</button>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Crea tu primer proyecto</div>
          ) : projects.slice(0, 4).map((p: any) => {
            const prog = p.data.progress || 0;
            return (
              <div key={p.id} className="p-3 bg-[var(--af-bg3)] rounded-lg mb-2 cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => openProject(p.id)}>
                <div className="flex justify-between mb-2">
                  <div className="text-sm font-semibold truncate flex-1 mr-2">{p.data.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(p.data.status)}`}>{p.data.status}</span>
                </div>
                <div className="af-progress">
                  <div className={`af-progress-bar ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-[var(--muted-foreground)]">{prog}% completado</span>
                  {p.data.endDate && <span className="text-[11px] text-[var(--af-text3)]">{fmtDate(p.data.endDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Actividad reciente</div>
            <TrendingUp size={16} className="text-[var(--af-text3)]" />
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin actividad reciente</div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {recentActivity.map(item => (
                <div key={item.id + item.type} className="flex items-start gap-3 group">
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

      {/* ─── Row 3: Mini widgets ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sprint Progress Ring */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[15px] font-semibold mb-3">Progreso Sprint</div>
          <div className="flex items-center justify-center">
            <div className="relative w-[100px] h-[100px]">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="2.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tasks.length > 0 ? (completedTasks.length / tasks.length) >= 0.8 ? '#10b981' : (completedTasks.length / tasks.length) >= 0.4 ? '#c8a96e' : '#f59e0b' : 'var(--af-bg4)'} strokeWidth="2.5" strokeDasharray={`${tasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(1) : 0}, 100`} strokeLinecap="round" className="transition-all duration-700" style={{ filter: 'drop-shadow(0 0 6px rgba(200,169,110,0.4))' }} />
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
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[15px] font-semibold mb-3">Resumen Financiero</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[13px]">Facturado</span></div>
              <span className="text-[13px] font-semibold">{fmtCOP(totalInvoiced)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[13px]">Cobrado</span></div>
              <span className="text-[13px] font-semibold text-emerald-400">{fmtCOP(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[13px]">Gastado</span></div>
              <span className="text-[13px] font-semibold text-red-400">{fmtCOP(totalExpenses)}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between">
              <span className="text-[12px] text-[var(--muted-foreground)]">Balance</span>
              <span className={`text-[14px] font-bold ${totalInvoiced - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCOP(totalInvoiced - totalExpenses)}</span>
            </div>
          </div>
          <button className="w-full mt-3 text-xs text-[var(--af-accent)] cursor-pointer hover:underline text-center" onClick={() => navigateTo('invoices')}>Ver facturas →</button>
        </div>

        {/* Notifications */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Notificaciones</div>
            {unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          <div className="flex flex-col gap-2 max-h-[130px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {notifHistory.length === 0 ? <div className="text-center py-4 text-[var(--af-text3)] text-[12px]">Sin notificaciones</div> :
            notifHistory.slice(0, 5).map((n: any) => (
              <div key={n.id} className={`flex items-start gap-2 p-2 rounded-lg ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}>
                <span className="text-[14px] mt-0.5 flex-shrink-0">{n.icon || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{n.title}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">{n.body}</div>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
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

      {/* ─── Row 4: Charts v2.0 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend (NEW in v2.0) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold flex items-center gap-2"><Zap size={16} className="text-[var(--af-accent)]" /> Tendencia de Ingresos</div>
            <span className="text-[10px] text-[var(--af-text3)]">Últimos 6 meses</span>
          </div>
          {revenueTrend.some(d => d.facturado > 0 || d.cobrado > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="facturado" name="Facturado" stroke="#c8a96e" fill="rgba(200,169,110,0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke="#10b981" fill="rgba(16,185,129,0.08)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin datos de facturación</div>
          )}
        </div>

        {/* Burndown Chart */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
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

      {/* ─── Row 5: Team Workload + Expense Categories (NEW v2.0) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Workload */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Carga de Trabajo</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('reports')}>Reporte completo →</button>
          </div>
          {teamWorkload.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas asignadas</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={teamWorkload} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="activas" name="Activas" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" barSize={16} />
                <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" barSize={16} />
                <Bar dataKey="pendientes" name="Pendientes" fill="rgba(200,169,110,0.4)" radius={[2, 2, 0, 0]} stackId="a" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense by Category */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
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
      </div>

      </>)}
    </div>
  );
}
