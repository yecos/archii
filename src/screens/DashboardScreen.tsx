'use client';
import React, { useMemo, useState } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useTimeTracking } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import AISuggestionsPanel from '@/components/archiflow/AISuggestionsPanel';
import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import dynamic from 'next/dynamic';
const ActivityTimeline = dynamic(() => import('@/components/features/ActivityTimeline'), { ssr: false });
const DashboardCharts = dynamic(() => import('@/components/features/DashboardCharts'), {
  loading: () => <div className="animate-pulse bg-[var(--card)] rounded-xl h-[300px]" />,
  ssr: false
});
import { fmtCOP, fmtDate, statusColor } from '@/lib/helpers';
import { getActiveAlerts, getBudgetBgClass, getBudgetBorderColorClass, getBudgetTextColorClass, type BudgetAlert } from '@/lib/budget-alerts';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import { FolderKanban, Clock, DollarSign, AlertTriangle, Download, FileText, TrendingUp, AlertCircle, ChevronRight, Sparkles, ShieldCheck, Bell } from 'lucide-react';
import { exportGeneralReportPDF } from '@/lib/export-pdf';
import { exportProjectsExcel } from '@/lib/export-excel';


export default function DashboardScreen() {
  const { navigateTo, showToast } = useUI();
  const { authUser, loading, getUserName, teamUsers } = useAuth();
  const { projects, tasks, pendingCount, activeTasks, completedTasks, toggleTask, openProject, expenses, pendingApprovals } = useFirestore();
  const { timeEntries } = useTimeTracking();
  const { invoices } = useInvoice();
  const { unreadCount, notifHistory } = useNotif();
  const { dailyLogs } = useComments();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Computed data
  const totalExpenses = useMemo(() => expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0), [expenses]);
  const totalInvoiced = useMemo(() => invoices.reduce((s: number, inv: any) => s + (Number(inv.data.total) || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter((i: any) => i.data.status === 'Pagada').reduce((s: number, i: any) => s + (Number(i.data.total) || 0), 0), [invoices]);
  const overdueTasks = useMemo(() => tasks.filter((t: any) => {
    if (t.data.status === 'Completado' || !t.data.dueDate) return false;
    return new Date(t.data.dueDate) < new Date();
  }), [tasks]);

  // Budget alerts
  const budgetAlerts = useMemo(() => getActiveAlerts(projects as any, expenses as any), [projects, expenses]);

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
          try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === djStr : false; } catch (err) { console.error('[ArchiFlow] Dashboard: task date parsing failed:', err); return false; }
        }).length;
      }
      const done = i === 0 ? doneSoFar : doneSoFar - days.slice(0, i).reduce((acc, _, k) => {
        const dk = new Date(today);
        dk.setDate(today.getDate() + mondayOffset + k);
        const dkStr = dk.toISOString().split('T')[0];
        return acc + tasks.filter((t: any) => {
          if (t.data.status !== 'Completado' || !t.data.updatedAt) return false;
          try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === dkStr : false; } catch (err) { console.error('[ArchiFlow] Dashboard: task date parsing failed:', err); return false; }
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
        return inv.data.paidDate.startsWith(key);
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
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20">v2.0</span>
          <span className="text-[11px] text-[var(--af-text3)]">Dashboard Premium</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20 cursor-pointer hover:bg-[var(--af-accent)]/20 transition-colors"
            onClick={() => setSuggestionsOpen(true)}
          >
            <Sparkles size={13} />
            <span>Sugerencias IA</span>
          </button>
          <button className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportGeneralReportPDF({ projects, tasks, expenses, invoices, teamUsers, timeEntries }); showToast('Reporte PDF descargado'); } catch (err) { console.error('[ArchiFlow] Dashboard: export general report PDF failed:', err); showToast('Error', 'error'); }
          }}>
            <FileText size={12} /> PDF
          </button>
          <button className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => {
            try { exportProjectsExcel(projects, tasks, expenses); showToast('Excel descargado'); } catch (err) { console.error('[ArchiFlow] Dashboard: export projects Excel failed:', err); showToast('Error', 'error'); }
          }}>
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* ─── AI Suggestions Panel ─── */}
      <AISuggestionsPanel
        isOpen={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        onNavigate={(screen, projectId) => {
          if (projectId) {
            openProject(projectId);
          } else {
            navigateTo(screen);
          }
        }}
      />

      {/* ─── Budget Alert Banner ─── */}
      {budgetAlerts.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400" />
              <div className="text-[15px] font-semibold">Alertas de Presupuesto</div>
              <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold flex items-center justify-center border border-red-500/20">{budgetAlerts.length}</span>
            </div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline flex items-center gap-1" onClick={() => navigateTo('budget')}>
              Ver presupuesto <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {budgetAlerts.map((alert: BudgetAlert) => (
              <div
                key={`alert-${alert.projectId}-${alert.threshold}`}
                className={`flex items-center gap-3 p-3 rounded-lg ${getBudgetBgClass(alert.percentage)} border ${getBudgetBorderColorClass(alert.percentage)} cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99]`}
                onClick={() => openProject(alert.projectId)}
              >
                <div className="text-xl flex-shrink-0"><AlertTriangle size={20} className={alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'danger' ? 'text-orange-400' : 'text-amber-400'} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{alert.projectName}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {fmtCOP(alert.spent)} de {fmtCOP(alert.budget)} · <span className={getBudgetTextColorClass(alert.percentage)}>{Math.round(alert.percentage)}%</span>
                  </div>
                  <div className="mt-2">
                    <BudgetProgressBar spent={alert.spent} budget={alert.budget} showLabel={false} compact />
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--muted-foreground)] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Row 1: KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { val: projects.length, lbl: 'Proyectos totales', icon: <FolderKanban size={16} />, bg: 'bg-blue-500/10', iconColor: 'text-blue-400', sub: `${projects.filter((p: any) => p.data.status === 'Ejecucion').length} en ejecución` },
          { val: pendingCount, lbl: 'Tareas pendientes', icon: <Clock size={16} />, bg: 'bg-orange-500/10', iconColor: 'text-orange-400', sub: `${activeTasks.length} en progreso` },
          { val: fmtCOP(totalExpenses), lbl: 'Gastos totales', icon: <DollarSign size={16} />, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', sub: `${expenses.length} registros` },
          { val: overdueTasks.length, lbl: 'Tareas vencidas', icon: <AlertTriangle size={16} />, bg: 'bg-red-500/10', iconColor: 'text-red-400', sub: overdueTasks.length === 0 ? 'Al día' : 'Requieren atención' },
          { val: pendingApprovals.length, lbl: 'Aprobaciones pendientes', icon: <ShieldCheck size={16} />, bg: 'bg-amber-500/10', iconColor: 'text-amber-400', sub: pendingApprovals.length === 0 ? 'Sin solicitudes' : 'Requiere revisión', badge: pendingApprovals.length > 0 },
        ].map((m, i) => (
          <div key={i} className="card-elevated rounded-xl p-4 md:p-5 relative overflow-hidden cursor-default">
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--af-accent)]/30 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center ${m.iconColor}`}>{m.icon}</div>
              {i === 3 && overdueTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {m.badge && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
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
              <div key={p.id} className="p-3 bg-[var(--af-bg3)] rounded-lg mb-2 cursor-pointer hover:bg-[var(--af-bg4)] transition-colors duration-150" onClick={() => openProject(p.id)}>
                <div className="flex justify-between mb-2">
                  <div className="text-sm font-semibold truncate flex-1 mr-2">{p.data.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(p.data.status)}`}>{p.data.status}</span>
                </div>
                <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} />
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
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('reports')}>Ver reportes →</button>
          </div>
          <ActivityTimeline />
        </div>
      </div>

      {/* ─── Row 3: Mini widgets ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
        <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5">
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
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Notificaciones</div>
            {unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          <div className="flex flex-col gap-2 max-h-[130px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {notifHistory.length === 0 ? <div className="text-center py-4 text-[var(--af-text3)] text-[12px]">Sin notificaciones</div> :
            notifHistory.slice(0, 5).map((n: any) => (
              <div key={n.id} className={`flex items-start gap-2 p-2 rounded-lg ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}>
                <span className="mt-0.5 flex-shrink-0">{n.icon || <Bell size={14} />}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{n.title}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">{n.body}</div>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Lazy-loaded Chart Sections ─── */}
      <DashboardCharts
        taskStatusData={taskStatusData}
        burndownData={burndownData}
        revenueTrend={revenueTrend}
        teamWorkload={teamWorkload}
        expenseByCategory={expenseByCategory}
        navigateTo={navigateTo}
      />

      </>)}
    </div>
  );
}
