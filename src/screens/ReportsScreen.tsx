'use client';
import React, { useMemo, useState } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useTimeTracking } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import dynamic from 'next/dynamic';
import { Download, FileSpreadsheet, FileText, Filter, AlertTriangle } from 'lucide-react';
const _im = () => import('@/components/features/ReportsCharts');
const TaskStatusPie = dynamic(() => _im().then(m => ({ default: m.TaskStatusPie })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const TaskPriorityPie = dynamic(() => _im().then(m => ({ default: m.TaskPriorityPie })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const MonthlyExpenseTrend = dynamic(() => _im().then(m => ({ default: m.MonthlyExpenseTrend })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const RoleDistPie = dynamic(() => _im().then(m => ({ default: m.RoleDistPie })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const BudgetVsRealBar = dynamic(() => _im().then(m => ({ default: m.BudgetVsRealBar })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const ExpenseCategoryPie = dynamic(() => _im().then(m => ({ default: m.ExpenseCategoryPie })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const HoursByProjectBar = dynamic(() => _im().then(m => ({ default: m.HoursByProjectBar })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
const TeamRoleDistPie = dynamic(() => _im().then(m => ({ default: m.TeamRoleDistPie })), { loading: () => <div className="animate-pulse card-elevated rounded-xl h-[220px]" />, ssr: false });
import { exportGeneralReportPDF, exportBudgetPDF, exportTimeReportPDF } from '@/lib/export-pdf';
import { exportExpensesExcel, exportTimeExcel, exportProjectsExcel } from '@/lib/export-excel';
import { fmtCOP, getInitials, avatarColor, fmtDuration, getWeekStart } from '@/lib/helpers';
import { ROLE_ICONS } from '@/lib/types';


export default function ReportsScreen() {
  const { forms, setForms, showToast } = useUI();
  const { teamUsers } = useAuth();
  const { expenses, projects, tasks } = useFirestore();
  const { timeEntries } = useTimeTracking();
  const { invoices } = useInvoice();
  const { dailyLogs } = useComments();

  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Filter data by date
  const filteredExpenses = useMemo(() => {
    if (dateFilter === 'all') return expenses;
    const now = new Date();
    let start: Date;
    if (dateFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (dateFilter === 'quarter') { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return expenses.filter(e => {
      if (!e.data.date) return false;
      return new Date(e.data.date) >= start;
    });
  }, [expenses, dateFilter]);

  const filteredInvoices = useMemo(() => {
    if (dateFilter === 'all') return invoices;
    const now = new Date();
    let start: Date;
    if (dateFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (dateFilter === 'quarter') { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return invoices.filter(inv => {
      if (!inv.data.issueDate) return false;
      return new Date(inv.data.issueDate) >= start;
    });
  }, [invoices, dateFilter]);

  const filteredTimeEntries = useMemo(() => {
    if (dateFilter === 'all') return timeEntries;
    const now = new Date();
    let start: Date;
    if (dateFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (dateFilter === 'quarter') { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return timeEntries.filter(e => {
      if (!e.data.date) return false;
      return new Date(e.data.date) >= start;
    });
  }, [timeEntries, dateFilter]);

  // Computed data for charts
  const categoryData = useMemo(() => {
    const catSpend: Record<string, number> = {};
    filteredExpenses.forEach(e => { const c = e.data.category || 'Otro'; catSpend[c] = (catSpend[c] || 0) + e.data.amount; });
    return Object.entries(catSpend).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const budgetVsRealData = useMemo(() => {
    return projects.filter(p => p.data.budget > 0).sort((a, b) => b.data.budget - a.data.budget).slice(0, 6).map(p => {
      const spent = filteredExpenses.filter(e => e.data.projectId === p.id).reduce((s, e) => s + e.data.amount, 0);
      const rawName = p.data.name || 'Sin nombre';
      const name = rawName.length > 12 ? rawName.slice(0, 12) + '...' : rawName;
      return { name, presupuesto: p.data.budget, gastado: spent };
    });
  }, [projects, filteredExpenses]);

  const taskStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    tasks.forEach(t => { statuses[t.data.status || 'Sin estado'] = (statuses[t.data.status || 'Sin estado'] || 0) + 1; });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const taskPriorityData = useMemo(() => {
    const prios: Record<string, number> = {};
    tasks.forEach(t => { const p = t.data.priority || 'Otro'; prios[p] = (prios[p] || 0) + 1; });
    return Object.entries(prios).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const hoursByProjectData = useMemo(() => {
    const byProject: Record<string, number> = {};
    filteredTimeEntries.forEach(e => { byProject[e.data.projectId] = (byProject[e.data.projectId] || 0) + (e.data.duration || 0); });
    return Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([pid, mins]) => {
      const proj = projects.find(p => p.id === pid);
      const name = (proj?.data.name || pid).length > 15 ? (proj?.data.name || pid).slice(0, 15) + '...' : (proj?.data.name || pid);
      return { name, horas: Math.round(mins / 60 * 10) / 10 };
    });
  }, [filteredTimeEntries, projects]);

  const roleDistData = useMemo(() => {
    const roles: Record<string, number> = {};
    teamUsers.forEach(u => { const r = u.data.role || 'Miembro'; roles[r] = (roles[r] || 0) + 1; });
    return Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [teamUsers]);

  // Monthly expense trend (Line Chart)
  const monthlyExpenseTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    filteredExpenses.forEach(e => {
      if (!e.data.date) return;
      const d = new Date(e.data.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key] !== undefined) months[key] += e.data.amount;
    });
    return Object.entries(months).map(([key, value]) => {
      const [y, m] = key.split('-');
      return { name: monthNames[parseInt(m) - 1], gastos: value };
    });
  }, [filteredExpenses]);

  const dateLabel = { all: 'Todo el tiempo', month: 'Este mes', quarter: 'Este trimestre', year: 'Este año' }[dateFilter];

  return (
<div className="animate-fadeIn space-y-4">
        {/* Export toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 skeuo-well rounded-xl p-1">
            {['General', 'Financiero', 'Tiempo', 'Equipo'].map(tab => (
              <button key={tab} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${(!forms.reportTab || forms.reportTab === 'General') === (tab === 'General') ? 'card-elevated text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, reportTab: tab }))}>{tab}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date filter */}
            <div className="flex gap-1 skeuo-well rounded-xl p-0.5">
              {[{ k: 'all', l: 'Todo' }, { k: 'month', l: 'Mes' }, { k: 'quarter', l: 'Trim.' }, { k: 'year', l: 'Año' }].map(f => (
                <button key={f.k} className={`px-2 py-1 rounded-md text-[11px] cursor-pointer transition-all ${dateFilter === f.k ? 'card-elevated text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)]'}`} onClick={() => setDateFilter(f.k as 'all' | 'month' | 'quarter' | 'year')}>{f.l}</button>
              ))}
            </div>
            {/* PDF */}
            <button className="skeuo-btn flex items-center gap-1.5 text-[var(--foreground)] px-3 py-2 text-xs font-medium cursor-pointer hover:border-[var(--af-accent)]/30 transition-colors" onClick={() => {
              try {
                exportGeneralReportPDF({ projects, tasks, expenses: filteredExpenses, invoices: filteredInvoices, teamUsers, timeEntries: filteredTimeEntries });
                showToast('Reporte PDF descargado');
              } catch (err) { console.error('[ArchiFlow] Reports: export general report PDF failed:', err); showToast('Error al generar PDF', 'error'); }
            }}>
              <FileText size={13} /> PDF
            </button>
            {/* CSV (legacy) */}
            <button className="skeuo-btn flex items-center gap-1.5 text-[var(--foreground)] px-3 py-2 text-xs font-medium cursor-pointer hover:border-[var(--af-accent)]/30 transition-colors" onClick={() => {
              try {
                let csv = 'Tipo,Dato,Valor\n';
                csv += `Proyectos,Total,${projects.length}\n`;
                csv += `Presupuesto,Total,${projects.reduce((s, p) => s + (p.data.budget || 0), 0)}\n`;
                csv += `Gastos,Total,${filteredExpenses.reduce((s, e) => s + (e.data.amount || 0), 0)}\n`;
                csv += `Tareas,Completadas,${tasks.filter(t => t.data.status === 'Completado').length}\n`;
                csv += `Tareas,Pendientes,${tasks.filter(t => t.data.status !== 'Completado').length}\n`;
                csv += `Equipo,Miembros,${teamUsers.length}\n`;
                csv += `Tiempo,Horas totales,${filteredTimeEntries.reduce((s, e) => s + (e.data.duration || 0), 0)} minutos\n`;
                csv += `Facturas,Total facturado,${filteredInvoices.filter(i => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0)}\n`;
                projects.forEach(p => { csv += `Proyecto,"${p.data.name}",Presupuesto: ${p.data.budget}, Progreso: ${p.data.progress}%\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `archiflow-reporte-${new Date().toISOString().split('T')[0]}.csv`; a.click();
                URL.revokeObjectURL(url);
                showToast('Reporte CSV descargado');
              } catch (err) { console.error('[ArchiFlow] Reports: export CSV failed:', err); showToast('Error al exportar', 'error'); }
            }}>
              <Download size={13} /> CSV
            </button>
          </div>
        </div>

        {/* General Report */}
        {(!forms.reportTab || forms.reportTab === 'General') && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(() => {
            const totalBudget = projects.reduce((s, p) => s + (p.data.budget || 0), 0);
            const totalSpent = filteredExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
            const taskCompleted = tasks.filter(t => t.data.status === 'Completado').length;
            const taskInProgress = tasks.filter(t => t.data.status === 'En progreso').length;
            const taskPending = tasks.filter(t => t.data.status === 'Completado' || (t.data.status as string) === 'Pendiente' || t.data.status === 'Por hacer').length;
            const taskOverdue = tasks.filter(t => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < new Date()).length;
            const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
            const membersByRole: Record<string, number> = {};
            teamUsers.forEach(u => { const r = u.data.role || 'Miembro'; membersByRole[r] = (membersByRole[r] || 0) + 1; });
            const tasksPerMember: Record<string, number> = {};
            tasks.forEach(t => { if (t.data.assigneeId) { tasksPerMember[t.data.assigneeId] = (tasksPerMember[t.data.assigneeId] || 0) + 1; } });
            return <div className="contents">
              {/* Card 1: Estado de Proyectos */}
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">Estado de Proyectos</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--af-accent)]">{projects.length}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Total Proyectos</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--foreground)]">{fmtCOP(totalBudget)}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Presupuesto Total</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--foreground)]">{fmtCOP(totalSpent)}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Gastado ({dateLabel})</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${budgetPct > 90 ? 'text-red-400' : budgetPct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{budgetPct}%</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Utilizacion</div></div>
                </div>
                <TaskStatusPie data={taskStatusData} />
                {projects.length > 0 && <div className="space-y-2"><div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Progreso por proyecto</div>{projects.slice(0, 5).map(p => (<div key={p.id}><div className="flex justify-between text-xs mb-1"><span className="text-[var(--foreground)] truncate mr-2">{p.data.name}</span><span className="text-[var(--muted-foreground)]">{p.data.progress || 0}%</span></div><div className="w-full bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full h-2"><div className="bg-[var(--af-accent)] rounded-full h-2 transition-all" style={{ width: `${p.data.progress || 0}%` }} /></div></div>))}{projects.length > 5 && <div className="text-xs text-[var(--muted-foreground)]">+{projects.length - 5} proyectos mas</div>}</div>}
              </div>
              {/* Card 2: Tareas y Productividad */}
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">Tareas y Productividad</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--af-accent)]">{tasks.length}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Total Tareas</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-emerald-400">{taskCompleted}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Completadas</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-400">{taskInProgress}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">En Progreso</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${taskOverdue > 0 ? 'text-red-400' : 'text-[var(--foreground)]'}`}>{taskPending}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Pendientes</div></div>
                </div>
                {taskOverdue > 0 && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-red-400" /><span className="text-sm text-red-400 font-medium">{taskOverdue} tarea{taskOverdue !== 1 ? 's' : ''} vencida{taskOverdue !== 1 ? 's' : ''}</span></div>}
                {tasks.length > 0 && <div className="skeuo-well rounded-xl p-3 mb-3"><div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Completitud general</div><div className="flex justify-between text-xs mb-1"><span className="text-[var(--foreground)]">Progreso</span><span className="text-[var(--muted-foreground)]">{tasks.length > 0 ? Math.round((taskCompleted / tasks.length) * 100) : 0}%</span></div><div className="w-full bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full h-2.5"><div className="bg-emerald-400 rounded-full h-2.5 transition-all" style={{ width: `${tasks.length > 0 ? (taskCompleted / tasks.length) * 100 : 0}%` }} /></div></div>}
                <TaskPriorityPie data={taskPriorityData} />
              </div>
              {/* Card 3: Presupuesto */}
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">Presupuesto</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(totalBudget)}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Presupuesto</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-lg font-bold text-[var(--foreground)]">{fmtCOP(totalSpent)}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Gastado</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className={`text-lg font-bold ${budgetPct > 90 ? 'text-red-400' : budgetPct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{budgetPct}%</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Utilizado</div></div>
                </div>
                <div className="skeuo-well rounded-xl p-3 mb-4"><div className="flex justify-between text-xs mb-1"><span className="text-[var(--foreground)]">Utilizacion del presupuesto</span><span className="text-[var(--muted-foreground)]">{fmtCOP(totalBudget - totalSpent)} restante</span></div><div className="w-full bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full h-3"><div className={`rounded-full h-3 transition-all ${budgetPct > 90 ? 'bg-red-400' : budgetPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} /></div></div>
                <MonthlyExpenseTrend data={monthlyExpenseTrend} />
                {/* Export budget button */}
                <button className="w-full text-xs text-[var(--af-accent)] cursor-pointer hover:underline text-center bg-[var(--af-accent)]/5 rounded-lg py-2 transition-colors hover:bg-[var(--af-accent)]/10" onClick={() => {
                  try { exportBudgetPDF({ expenses: filteredExpenses, projects }); showToast('Presupuesto PDF descargado'); } catch (err) { console.error('[ArchiFlow] Reports: export budget PDF failed:', err); showToast('Error', 'error'); }
                }}>
                  <FileText size={12} className="inline mr-1" /> Descargar reporte de presupuesto PDF
                </button>
              </div>
              {/* Card 4: Equipo */}
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">Equipo</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--af-accent)]">{teamUsers.length}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Miembros</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--foreground)]">{Object.keys(membersByRole).length}</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Roles distintos</div></div>
                </div>
                <RoleDistPie data={roleDistData} />
                {Object.keys(tasksPerMember).length > 0 && <div className="space-y-2"><div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Tareas asignadas por miembro</div>{Object.entries(tasksPerMember).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([uid, cnt]) => {const member = teamUsers.find(u => u.id === uid); return (<div key={uid} className="flex items-center gap-2"><div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(uid) }}>{member ? getInitials(member.data.name) : '?'}</div><span className="text-sm text-[var(--foreground)] flex-1 truncate">{member ? member.data.name : uid}</span><span className="text-sm font-semibold text-[var(--foreground)]">{cnt}</span></div>);})}</div>}
              </div>
            </div>;
          })()}
        </div>)}

        {/* Financial Report */}
        {forms.reportTab === 'Financiero' && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const totalBudget = projects.reduce((s, p) => s + (p.data.budget || 0), 0);
            const totalSpent = filteredExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
            const totalInvoiced = filteredInvoices.filter(i => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0);
            const totalPaid = filteredInvoices.filter(i => i.data.status === 'Pagada').reduce((s, i) => s + (i.data.total || 0), 0);
            const totalPending = filteredInvoices.filter(i => i.data.status === 'Enviada' || i.data.status === 'Borrador').reduce((s, i) => s + (i.data.total || 0), 0);
            const totalOverdue = filteredInvoices.filter(i => i.data.status === 'Vencida').reduce((s, i) => s + (i.data.total || 0), 0);
            const totalBillable = filteredTimeEntries.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0) * (e.data.rate || 0) / 60, 0);
            const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
            return (<>
              <div className="lg:col-span-2 card-elevated rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold">Resumen Financiero</h3>
                  <span className="text-[11px] text-[var(--af-text3)]">{dateLabel}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[{ lbl: 'Presupuesto', val: fmtCOP(totalBudget), c: 'text-[var(--af-accent)]' }, { lbl: 'Gastado', val: fmtCOP(totalSpent), c: 'text-[var(--foreground)]' }, { lbl: 'Facturado', val: fmtCOP(totalInvoiced), c: 'text-blue-400' }, { lbl: 'Cobrado', val: fmtCOP(totalPaid), c: 'text-emerald-400' }, { lbl: 'Por cobrar', val: fmtCOP(totalPending + totalOverdue), c: totalOverdue > 0 ? 'text-red-400' : 'text-amber-400' }].map((m, i) => (
                    <div key={i} className="skeuo-well rounded-xl p-3 text-center"><div className={`text-xl font-bold ${m.c}`}>{m.val}</div><div className="text-[11px] text-[var(--muted-foreground)]">{m.lbl}</div></div>
                  ))}
                </div>
              </div>
              {/* Alerts */}
              {(totalOverdue > 0 || (totalBudget > 0 && totalSpent > totalBudget * 0.9)) && <div className="lg:col-span-2 space-y-2">
                {totalOverdue > 0 && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2"><AlertTriangle size={18} className="text-red-400" /><span className="text-sm text-red-400 font-medium">Facturas vencidas por {fmtCOP(totalOverdue)}</span></div>}
                {totalBudget > 0 && totalSpent > totalBudget * 0.9 && <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-400" /><span className="text-sm text-amber-400 font-medium">Gasto al {Math.round(totalSpent / totalBudget * 100)}% del presupuesto</span></div>}
              </div>}
              {/* Budget vs Real */}
              <div className="lg:col-span-2 card-elevated rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold">Presupuesto vs Real por Proyecto</h3>
                  <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => {
                    try { exportBudgetPDF({ expenses: filteredExpenses, projects }); showToast('PDF descargado'); } catch (err) { console.error('[ArchiFlow] Reports: export budget PDF failed:', err); showToast('Error', 'error'); }
                  }}><FileText size={12} className="inline mr-1" />PDF</button>
                </div>
                <BudgetVsRealBar data={budgetVsRealData} budgetPct={budgetPct} />
              </div>
              {/* Gastos por categoria */}
              <div className="card-elevated rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold">Gastos por Categoria</h3>
                  <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => {
                    try { exportExpensesExcel(filteredExpenses, projects); showToast('Excel descargado'); } catch (err) { console.error('[ArchiFlow] Reports: export expenses Excel failed:', err); showToast('Error', 'error'); }
                  }}><FileSpreadsheet size={12} className="inline mr-1" />Excel</button>
                </div>
                <ExpenseCategoryPie data={categoryData} />
              </div>
              {/* Rentabilidad */}
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-[15px] font-semibold mb-4">Metricas de Rentabilidad</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const margin = totalInvoiced > 0 ? Math.round(((totalInvoiced - totalSpent) / totalInvoiced) * 100) : 0;
                    const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
                    const avgProject = projects.length > 0 ? totalBudget / projects.length : 0;
                    const timeRevenue = totalBillable;
                    return [
                      { lbl: 'Margen', val: `${margin}%`, c: margin > 20 ? 'text-emerald-400' : margin > 0 ? 'text-amber-400' : 'text-red-400' },
                      { lbl: 'Tasa de cobro', val: `${collectionRate}%`, c: collectionRate > 80 ? 'text-emerald-400' : 'text-amber-400' },
                      { lbl: 'Promedio proyecto', val: fmtCOP(avgProject), c: 'text-[var(--af-accent)]' },
                      { lbl: 'Horas facturables', val: fmtCOP(timeRevenue), c: 'text-blue-400' },
                    ].map((m, i) => (<div key={i} className="skeuo-well rounded-xl p-3 text-center"><div className={`text-lg font-bold ${m.c}`}>{m.val}</div><div className="text-[11px] text-[var(--muted-foreground)]">{m.lbl}</div></div>));
                  })()}
                </div>
              </div>
            </>);
          })()}
        </div>)}

        {/* Time Report */}
        {forms.reportTab === 'Tiempo' && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const totalHrs = filteredTimeEntries.reduce((s, e) => s + (e.data.duration || 0), 0);
            const billableHrs = filteredTimeEntries.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0), 0);
            const totalBillable = filteredTimeEntries.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0) * (e.data.rate || 0) / 60, 0);
            const thisWeek = filteredTimeEntries.filter(e => { if (!e.data.date) return false; const d = new Date(e.data.date); return d >= getWeekStart(); });
            const weekHrs = thisWeek.reduce((s, e) => s + (e.data.duration || 0), 0);
            const byUser: Record<string, number> = {};
            filteredTimeEntries.forEach(e => { byUser[e.data.userId] = (byUser[e.data.userId] || 0) + (e.data.duration || 0); });
            return (<>
              <div className="card-elevated rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold">Resumen de Tiempo</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--af-text3)]">{dateLabel}</span>
                    <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => {
                      try { exportTimeReportPDF({ timeEntries: filteredTimeEntries, teamUsers, projects }); showToast('PDF descargado'); } catch (err) { console.error('[ArchiFlow] Reports: export time report PDF failed:', err); showToast('Error', 'error'); }
                    }}><FileText size={12} className="inline mr-1" />PDF</button>
                    <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => {
                      try { exportTimeExcel(filteredTimeEntries, projects, teamUsers); showToast('Excel descargado'); } catch (err) { console.error('[ArchiFlow] Reports: export time Excel failed:', err); showToast('Error', 'error'); }
                    }}><FileSpreadsheet size={12} className="inline mr-1" />Excel</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--af-accent)]">{fmtDuration(totalHrs)}</div><div className="text-[11px] text-[var(--muted-foreground)]">Total registrado</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-emerald-400">{fmtDuration(billableHrs)}</div><div className="text-[11px] text-[var(--muted-foreground)]">Facturable</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-400">{fmtCOP(totalBillable)}</div><div className="text-[11px] text-[var(--muted-foreground)]">Valor facturable</div></div>
                  <div className="skeuo-well rounded-xl p-3 text-center"><div className="text-2xl font-bold text-[var(--foreground)]">{fmtDuration(weekHrs)}</div><div className="text-[11px] text-[var(--muted-foreground)]">Esta semana</div></div>
                </div>
              </div>
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-[15px] font-semibold mb-4">Horas por Proyecto</h3>
                <HoursByProjectBar data={hoursByProjectData} />
              </div>
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-[15px] font-semibold mb-4">Horas por Miembro</h3>
                {Object.keys(byUser).length === 0 ? <div className="text-sm text-[var(--muted-foreground)]">Sin datos</div> : (
                  <div className="space-y-2">{Object.entries(byUser).sort((a, b) => b[1] - a[1]).map(([uid, mins]) => {
                    const user = teamUsers.find(u => u.id === uid);
                    return (<div key={uid} className="flex items-center gap-2"><div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(uid) }}>{user ? getInitials(user.data.name) : '?'}</div><span className="text-sm text-[var(--foreground)] flex-1">{user?.data.name || uid.substring(0, 10)}</span><span className="text-sm font-semibold">{fmtDuration(mins)}</span></div>);
                  })}</div>
                )}
              </div>
            </>);
          })()}
        </div>)}

        {/* Team Report */}
        {forms.reportTab === 'Equipo' && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const membersByRole: Record<string, number> = {};
            teamUsers.forEach(u => { const r = u.data.role || 'Miembro'; membersByRole[r] = (membersByRole[r] || 0) + 1; });
            const tasksPerMember: Record<string, { total: number; done: number; overdue: number }> = {};
            teamUsers.forEach(u => { tasksPerMember[u.id] = { total: 0, done: 0, overdue: 0 }; });
            tasks.forEach(t => { if (t.data.assigneeId && tasksPerMember[t.data.assigneeId]) { tasksPerMember[t.data.assigneeId].total++; if (t.data.status === 'Completado') tasksPerMember[t.data.assigneeId].done++; if (t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < new Date()) tasksPerMember[t.data.assigneeId].overdue++; } });
            const hoursPerMember: Record<string, number> = {};
            filteredTimeEntries.forEach(e => { hoursPerMember[e.data.userId] = (hoursPerMember[e.data.userId] || 0) + (e.data.duration || 0); });
            return (<>
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-[15px] font-semibold mb-4">Distribucion por Roles</h3>
                <TeamRoleDistPie data={roleDistData} />
              </div>
              <div className="card-elevated rounded-xl p-5">
                <h3 className="text-[15px] font-semibold mb-4">Productividad por Miembro</h3>
                <div className="md:hidden space-y-2">
                  {teamUsers.sort((a, b) => (tasksPerMember[b.id]?.total || 0) - (tasksPerMember[a.id]?.total || 0)).map(u => {
                    const stats = tasksPerMember[u.id] || { total: 0, done: 0, overdue: 0 };
                    const hrs = hoursPerMember[u.id] || 0;
                    return (
                      <div key={u.id} className="card-elevated rounded-lg p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(u.id) }}>{getInitials(u.data.name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{u.data.name}</div>
                          <div className="flex gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                            <span>{stats.total} tareas</span>
                            <span className="text-emerald-400">{stats.done} listas</span>
                            <span>{stats.overdue > 0 ? <span className="text-red-400">{stats.overdue} vencidas</span> : '0 vencidas'}</span>
                            <span>{fmtDuration(hrs)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs"><th className="text-left py-2 pr-3">Miembro</th><th className="text-center py-2 px-2">Tareas</th><th className="text-center py-2 px-2">Listas</th><th className="text-center py-2 px-2">Vencidas</th><th className="text-center py-2 pl-2">Horas</th></tr></thead>
                    <tbody>
                      {teamUsers.sort((a, b) => (tasksPerMember[b.id]?.total || 0) - (tasksPerMember[a.id]?.total || 0)).map(u => {
                        const stats = tasksPerMember[u.id] || { total: 0, done: 0, overdue: 0 };
                        const hrs = hoursPerMember[u.id] || 0;
                        return (<tr key={u.id} className="border-b border-[var(--border)] last:border-0"><td className="py-2 pr-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(u.id) }}>{getInitials(u.data.name)}</div><span className="text-xs truncate max-w-[80px]">{u.data.name}</span></div></td><td className="text-center py-2 px-2 text-xs">{stats.total}</td><td className="text-center py-2 px-2 text-xs text-emerald-400">{stats.done}</td><td className="text-center py-2 px-2 text-xs">{stats.overdue > 0 ? <span className="text-red-400">{stats.overdue}</span> : '0'}</td><td className="text-center py-2 pl-2 text-xs">{fmtDuration(hrs)}</td></tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>);
          })()}
        </div>)}
      </div>
  );
}
