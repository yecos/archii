'use client';
import React, { useState, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useTimeTracking } from '@/hooks/useDomain';
import { useQuotation } from '@/hooks/useDomain';
import { fmtCOP } from '@/lib/helpers';
import EmptyState from '@/components/ui/EmptyState';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieIcon, FileText,
  CreditCard, Timer, Target, Wallet, Percent, Activity
} from 'lucide-react';

/* ===== Helpers ===== */
function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function riskColor(value: number, thresholds: [number, number] = [80, 95]): string {
  if (value >= thresholds[1]) return 'text-red-400';
  if (value >= thresholds[0]) return 'text-amber-400';
  return 'text-emerald-400';
}

function riskBg(value: number, thresholds: [number, number] = [80, 95]): string {
  if (value >= thresholds[1]) return 'bg-red-400/10 border-red-400/30';
  if (value >= thresholds[0]) return 'bg-amber-400/10 border-amber-400/30';
  return 'bg-emerald-400/10 border-emerald-400/30';
}

function monthKey(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [y, m] = key.split('-');
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

/* ===== Main Component ===== */
export default function ProfitabilityScreen() {
  const { showToast } = useUI();
  const { projects, expenses } = useFirestore();
  const { invoices } = useInvoice();
  const { timeEntries } = useTimeTracking();
  const { quotations } = useQuotation();

  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'projects' | 'cashflow'>('overview');

  // ─── Filter by project ───
  const filteredProjects = useMemo(() => {
    if (selectedProject === 'all') return projects.filter(p => p.data.status !== 'Cancelado');
    return projects.filter(p => p.id === selectedProject && p.data.status !== 'Cancelado');
  }, [projects, selectedProject]);

  const projectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => projectIds.has(e.data.projectId));
  }, [expenses, projectIds]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => projectIds.has(i.data.projectId) && i.data.status !== 'Cancelada');
  }, [invoices, projectIds]);

  const filteredTimeEntries = useMemo(() => {
    return timeEntries.filter(te => projectIds.has(te.data.projectId) && te.data.billable);
  }, [timeEntries, projectIds]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => projectIds.has(q.data.projectId) && ['Aprobada', 'Enviada'].includes(q.data.status));
  }, [quotations, projectIds]);

  // ─── Global KPIs ───
  const kpis = useMemo(() => {
    const totalBudget = filteredProjects.reduce((s, p) => s + (p.data.budget || 0), 0);
    const totalSpent = filteredExpenses.reduce((s, e) => s + Number(e.data.amount), 0);
    const totalInvoiced = filteredInvoices.reduce((s, i) => s + Number(i.data.total), 0);
    const totalPaid = filteredInvoices.filter(i => i.data.status === 'Pagada').reduce((s, i) => s + Number(i.data.total), 0);
    const totalOverdue = filteredInvoices.filter(i => i.data.status === 'Vencida').reduce((s, i) => s + Number(i.data.total), 0);
    const totalPending = filteredInvoices.filter(i => ['Enviada', 'Borrador'].includes(i.data.status)).reduce((s, i) => s + Number(i.data.total), 0);
    const totalBillable = filteredTimeEntries.reduce((s, te) => s + (Number(te.data.duration) || 0) * (Number(te.data.rate) || 0) / 60, 0);
    const pipelineValue = filteredQuotations.reduce((s, q) => s + Number(q.data.grandTotal), 0);

    const budgetUtil = pct(totalSpent, totalBudget);
    const margin = pct(totalInvoiced - totalSpent, totalInvoiced);
    const collectionRate = pct(totalPaid, totalInvoiced);
    const avgProjectBudget = filteredProjects.length > 0 ? totalBudget / filteredProjects.length : 0;

    return {
      totalBudget, totalSpent, totalInvoiced, totalPaid, totalOverdue,
      totalPending, totalBillable, pipelineValue,
      budgetUtil, margin, collectionRate, avgProjectBudget,
      balance: totalInvoiced - totalSpent,
      budgetRemaining: totalBudget - totalSpent,
    };
  }, [filteredProjects, filteredExpenses, filteredInvoices, filteredTimeEntries, filteredQuotations]);

  // ─── Monthly trend (last 6 months) ───
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    return months.map(m => {
      const exp = filteredExpenses
        .filter(e => monthKey(e.data.date) === m)
        .reduce((s, e) => s + Number(e.data.amount), 0);
      const inv = filteredInvoices
        .filter(i => monthKey(i.data.issueDate) === m)
        .reduce((s, i) => s + Number(i.data.total), 0);
      const paid = filteredInvoices
        .filter(i => i.data.status === 'Pagada' && monthKey(i.data.paidDate || i.data.issueDate) === m)
        .reduce((s, i) => s + Number(i.data.total), 0);
      return { month: m, label: monthLabel(m), expenses: exp, invoiced: inv, paid };
    });
  }, [filteredExpenses, filteredInvoices]);

  // ─── Expense by category ───
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.data.category || 'Otro';
      cats[cat] = (cats[cat] || 0) + Number(e.data.amount);
    });
    return Object.entries(cats)
      .map(([cat, total]) => ({ category: cat, total, pct: pct(total, kpis.totalSpent) }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, kpis.totalSpent]);

  // ─── Per-project profitability ───
  const projectProfitability = useMemo(() => {
    return filteredProjects
      .map(p => {
        const pid = p.id;
        const pExpenses = expenses.filter(e => e.data.projectId === pid);
        const pInvoices = invoices.filter(i => i.data.projectId === pid && i.data.status !== 'Cancelada');
        const pPaid = pInvoices.filter(i => i.data.status === 'Pagada');
        const pTime = timeEntries.filter(te => te.data.projectId === pid && te.data.billable);

        const budget = p.data.budget || 0;
        const spent = pExpenses.reduce((s, e) => s + Number(e.data.amount), 0);
        const invoiced = pInvoices.reduce((s, i) => s + Number(i.data.total), 0);
        const paidAmt = pPaid.reduce((s, i) => s + Number(i.data.total), 0);
        const billableHrs = pTime.reduce((s, te) => s + (Number(te.data.duration) || 0), 0) / 60;
        const billableRev = pTime.reduce((s, te) => s + (Number(te.data.duration) || 0) * (Number(te.data.rate) || 0) / 60, 0);

        return {
          id: p.id,
          name: p.data.name,
          status: p.data.status,
          progress: p.data.progress || 0,
          budget, spent, invoiced, paidAmt,
          remaining: budget - spent,
          utilization: pct(spent, budget),
          margin: pct(invoiced - spent, invoiced),
          collectionRate: pct(paidAmt, invoiced),
          billableHrs: Math.round(billableHrs),
          billableRev,
          overdue: pInvoices.filter(i => i.data.status === 'Vencida').reduce((s, i) => s + Number(i.data.total), 0),
        };
      })
      .sort((a, b) => b.budget - a.budget);
  }, [filteredProjects, expenses, invoices, timeEntries]);

  // ─── At-risk projects ───
  const atRiskProjects = useMemo(() => {
    return projectProfitability.filter(p =>
      p.utilization >= 80 || p.overdue > 0
    ).sort((a, b) => b.utilization - a.utilization);
  }, [projectProfitability]);

  // ─── Cash Flow Pipeline ───
  const cashPipeline = useMemo(() => {
    const receivable = filteredInvoices.filter(i => ['Enviada', 'Borrador'].includes(i.data.status));
    const overdue = filteredInvoices.filter(i => i.data.status === 'Vencida');
    return { receivable, overdue, paidTotal: kpis.totalPaid };
  }, [filteredInvoices, kpis.totalPaid]);

  const maxMonthlyVal = useMemo(() => {
    return Math.max(
      1,
      ...monthlyTrend.map(m => Math.max(m.expenses, m.invoiced))
    );
  }, [monthlyTrend]);

  const maxCatVal = useMemo(() => {
    return categoryBreakdown.length > 0 ? Math.max(1, categoryBreakdown[0].total) : 1;
  }, [categoryBreakdown]);

  // ─── Empty state ───
  if (projects.length === 0) {
    return (
      <EmptyState
        illustration="projects"
        title="Sin datos financieros"
        description="Crea proyectos con presupuestos para ver el dashboard de rentabilidad"
      />
    );
  }

  // ─── KPI Card Component ───
  const KpiCard = ({ icon: Icon, label, value, sub, color, bg }: {
    icon: typeof DollarSign;
    label: string;
    value: string;
    sub?: string;
    color: string;
    bg?: string;
  }) => (
    <div className="card-glass-subtle rounded-xl p-3 sm:p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg || 'bg-[var(--af-accent)]/10'}`}>
          <Icon size={16} className={color} />
        </div>
        {sub && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${bg || ''} ${color}`}>{sub}</span>}
      </div>
      <div className={`text-lg sm:text-xl font-bold font-tabular text-gradient ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{label}</div>
    </div>
  );

  // ===== RENDER =====
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 skeuo-well rounded-xl p-1">
          {([
            { k: 'Resumen', v: 'overview' as const },
            { k: 'Por Proyecto', v: 'projects' as const },
            { k: 'Flujo de Caja', v: 'cashflow' as const },
          ]).map(t => (
            <button key={t.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${viewMode === t.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setViewMode(t.v)}>{t.k}</button>
          ))}
        </div>
        <select className="skeuo-input px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none rounded-lg" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
          <option value="all">Todos los proyectos</option>
          {projects.filter(p => p.data.status !== 'Cancelado').map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
        </select>
      </div>

      {/* ===== GLOBAL KPIs ===== */}
      <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Presupuesto Total" value={fmtCOP(kpis.totalBudget)} color="text-[var(--af-accent)]" />
        <KpiCard icon={CreditCard} label="Gastado" value={fmtCOP(kpis.totalSpent)} sub={`${kpis.budgetUtil}%`} color={riskColor(kpis.budgetUtil)} bg={riskBg(kpis.budgetUtil)} />
        <KpiCard icon={FileText} label="Facturado" value={fmtCOP(kpis.totalInvoiced)} color="text-[var(--af-blue)]" />
        <KpiCard icon={DollarSign} label="Cobrado" value={fmtCOP(kpis.totalPaid)} sub={`${kpis.collectionRate}%`} color={kpis.collectionRate >= 70 ? 'text-emerald-400' : 'text-amber-400'} bg={kpis.collectionRate >= 70 ? 'bg-emerald-400/10' : 'bg-amber-400/10'} />
      </div>

      {/* ===== SECONDARY KPIs ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-glass-subtle rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Percent size={14} className="text-purple-400" />
            <span className="text-[18px] font-bold font-tabular text-gradient text-purple-400">{kpis.margin}%</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Margen de Ganancia</div>
          <div className="flex items-center gap-1 mt-1">
            {kpis.margin >= 20 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
            <span className={`text-[10px] font-medium ${kpis.margin >= 20 ? 'text-emerald-400' : 'text-red-400'}`}>
              {kpis.balance >= 0 ? `+${fmtCOP(kpis.balance)}` : fmtCOP(kpis.balance)}
            </span>
          </div>
        </div>

        <div className="card-glass-subtle rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-emerald-400" />
            <span className="text-[18px] font-bold font-tabular text-gradient text-emerald-400">{fmtCOP(kpis.pipelineValue)}</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Pipeline Cotizaciones</div>
          <div className="text-[10px] text-[var(--af-text3)] mt-1">{filteredQuotations.length} cotizaciones activas</div>
        </div>

        <div className="card-glass-subtle rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-400" />
            <span className="text-[18px] font-bold font-tabular text-gradient text-amber-400">{kpis.totalOverdue > 0 ? fmtCOP(kpis.totalOverdue) : '$0'}</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Facturas Vencidas</div>
          <div className="text-[10px] text-[var(--af-text3)] mt-1">{cashPipeline.overdue.length} facturas</div>
        </div>

        <div className="card-glass-subtle rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={14} className="text-[var(--af-blue)]" />
            <span className="text-[18px] font-bold font-tabular text-gradient text-[var(--af-blue)]">{fmtCOP(kpis.totalBillable)}</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Horas Facturables</div>
          <div className="text-[10px] text-[var(--af-text3)] mt-1">{Math.round(filteredTimeEntries.reduce((s, te) => s + (Number(te.data.duration) || 0), 0) / 60)}h billables</div>
        </div>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Trend */}
          <div className="card-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-[var(--af-accent)]" />
              <span className="text-[13px] font-semibold">Tendencia Mensual (6 meses)</span>
            </div>
            <div className="space-y-2">
              {monthlyTrend.map((m, i) => {
                const maxVal = maxMonthlyVal;
                const invW = maxVal > 0 ? (m.invoiced / maxVal) * 100 : 0;
                const expW = maxVal > 0 ? (m.expenses / maxVal) * 100 : 0;
                const paidW = maxVal > 0 ? (m.paid / maxVal) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--muted-foreground)] w-12 shrink-0 text-right">{m.label}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-2.5 rounded-full bg-[var(--af-accent)]/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--af-accent)] transition-all" style={{ width: `${invW}%` }} />
                      </div>
                      <div className="h-1.5 rounded-full bg-red-400/10 overflow-hidden">
                        <div className="h-full rounded-full bg-red-400/60 transition-all" style={{ width: `${expW}%` }} />
                      </div>
                    </div>
                    <div className="text-[10px] text-right w-20 shrink-0 space-y-0.5">
                      <div className="text-[var(--af-accent)]">{fmtCOP(m.invoiced)}</div>
                      <div className="text-red-400/70">{fmtCOP(m.expenses)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-[var(--af-accent)]" /> Facturado</div>
              <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-red-400/60" /> Gastado</div>
            </div>
          </div>

          {/* Expense by Category */}
          <div className="card-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon size={16} className="text-purple-400" />
              <span className="text-[13px] font-semibold">Gastos por Categoria</span>
            </div>
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-[var(--muted-foreground)]">Sin gastos registrados</div>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => {
                  const w = maxCatVal > 0 ? (cat.total / maxCatVal) * 100 : 0;
                  const colors = ['bg-[var(--af-accent)]', 'bg-purple-400', 'bg-[var(--af-blue)]', 'bg-amber-400', 'bg-emerald-400', 'bg-red-400'];
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--muted-foreground)]">{fmtCOP(cat.total)}</span>
                          <span className="text-[10px] text-[var(--af-text3)] w-8 text-right">{cat.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--af-bg3)] overflow-hidden">
                        <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* At-Risk Alert */}
          {atRiskProjects.length > 0 && (
            <div className="card-glass-subtle rounded-xl p-4 border border-amber-400/20 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-[13px] font-semibold text-amber-400">Alertas de Riesgo ({atRiskProjects.length})</span>
              </div>
              <div className="space-y-2">
                {atRiskProjects.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-[12px] p-2 rounded-lg bg-amber-400/5">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-[var(--muted-foreground)]">
                        {p.utilization >= 95 ? 'Presupuesto agotado' : 'Presupuesto alto'} ({p.utilization}%)
                        {p.overdue > 0 && ` · ${fmtCOP(p.overdue)} vencido`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold font-tabular ${riskColor(p.utilization)}`}>{p.utilization}%</div>
                      <div className="text-[var(--af-text3)]">{fmtCOP(p.spent)} / {fmtCOP(p.budget)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== PROJECTS TAB ===== */}
      {viewMode === 'projects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">{projectProfitability.length} proyectos</span>
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Saludable</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Precaucion</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Riesgo</span>
            </div>
          </div>
          {projectProfitability.map(p => {
            const dotColor = p.utilization >= 95 ? 'bg-red-400' : p.utilization >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div key={p.id} className="card-glass-subtle rounded-xl p-4 transition-all hover:translate-y-[-1px]">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                      <span>{p.status}</span>
                      <span>·</span>
                      <span>Avance: {p.progress}%</span>
                      {p.overdue > 0 && <span className="text-red-400">· Vencido: {fmtCOP(p.overdue)}</span>}
                    </div>
                  </div>
                </div>

                {/* Budget Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[var(--muted-foreground)]">{fmtCOP(p.spent)} gastado</span>
                    <span className="font-medium">{p.utilization}% de {fmtCOP(p.budget)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--af-bg3)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.utilization >= 95 ? 'bg-red-400' : p.utilization >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(p.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {[
                    { lbl: 'Facturado', val: fmtCOP(p.invoiced), color: 'text-[var(--af-blue)]' },
                    { lbl: 'Cobrado', val: fmtCOP(p.paidAmt), color: 'text-emerald-400' },
                    { lbl: 'Margen', val: `${p.margin}%`, color: p.margin >= 20 ? 'text-emerald-400' : p.margin >= 0 ? 'text-amber-400' : 'text-red-400' },
                    { lbl: 'Cobro', val: `${p.collectionRate}%`, color: p.collectionRate >= 70 ? 'text-emerald-400' : 'text-amber-400' },
                    { lbl: 'Hrs Bill', val: `${p.billableHrs}h`, color: 'text-[var(--af-blue)]' },
                  ].map((m, i) => (
                    <div key={i} className="card-glass-subtle rounded-lg p-2 text-center">
                      <div className={`text-[13px] font-bold font-tabular ${m.color}`}>{m.val}</div>
                      <div className="text-[9px] text-[var(--af-text3)]">{m.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== CASHFLOW TAB ===== */}
      {viewMode === 'cashflow' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cash Flow Summary */}
          <div className="card-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-emerald-400" />
              <span className="text-[13px] font-semibold">Estado de Caja</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                <div>
                  <div className="text-[12px] text-[var(--muted-foreground)]">Total Cobrado</div>
                  <div className="text-lg font-bold font-tabular text-emerald-400">{fmtCOP(kpis.totalPaid)}</div>
                </div>
                <CheckCircle2 size={24} className="text-emerald-400/40" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--af-blue)]/5 border border-[var(--af-blue)]/20">
                <div>
                  <div className="text-[12px] text-[var(--muted-foreground)]">Por Cobrar</div>
                  <div className="text-lg font-bold font-tabular text-[var(--af-blue)]">{fmtCOP(kpis.totalPending)}</div>
                </div>
                <Clock size={24} className="text-[var(--af-blue)]/40" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-400/5 border border-red-400/20">
                <div>
                  <div className="text-[12px] text-[var(--muted-foreground)]">Vencido</div>
                  <div className="text-lg font-bold font-tabular text-red-400">{fmtCOP(kpis.totalOverdue)}</div>
                </div>
                <AlertTriangle size={24} className="text-red-400/40" />
              </div>
              <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center">
                <span className="text-[13px] font-semibold">Balance Neto</span>
                <div className="flex items-center gap-2">
                  {kpis.balance >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
                  <span className={`text-lg font-bold font-tabular ${kpis.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {kpis.balance >= 0 ? '+' : ''}{fmtCOP(kpis.balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Details */}
          <div className="card-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight size={16} className="text-purple-400" />
              <span className="text-[13px] font-semibold">Pipeline de Ingresos</span>
            </div>

            {/* Quotation pipeline */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-2">Cotizaciones Activas</div>
              {filteredQuotations.length === 0 ? (
                <div className="text-[12px] text-[var(--muted-foreground)] py-2">Sin cotizaciones activas</div>
              ) : (
                <div className="space-y-1.5">
                  {filteredQuotations.slice(0, 5).map(q => {
                    const proj = projects.find(p => p.id === q.data.projectId);
                    return (
                      <div key={q.id} className="flex items-center justify-between p-2 rounded-lg bg-purple-400/5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium truncate">{proj?.data.name || 'Sin proyecto'}</div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">{q.data.status}</div>
                        </div>
                        <span className="text-[13px] font-bold font-tabular text-purple-400 ml-2">{fmtCOP(q.data.grandTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoice receivables */}
            <div>
              <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-2">Facturas por Cobrar</div>
              {cashPipeline.receivable.length === 0 ? (
                <div className="text-[12px] text-[var(--muted-foreground)] py-2">Sin facturas pendientes</div>
              ) : (
                <div className="space-y-1.5">
                  {cashPipeline.receivable.slice(0, 5).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--af-blue)]/5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium truncate">{inv.data.number} — {inv.data.projectName}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{inv.data.status} · {inv.data.dueDate}</div>
                      </div>
                      <span className="text-[13px] font-bold font-tabular text-[var(--af-blue)] ml-2">{fmtCOP(inv.data.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
