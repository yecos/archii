'use client';
import React, { useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { fmtCOP } from '@/lib/helpers';
import { DollarSign, Download, Plus, TrendingDown, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import { getBudgetTextColorClass, getBudgetBgClass, getBudgetBorderColorClass } from '@/lib/budget-alerts';

const CAT_COLORS: Record<string, string> = {
  'Materiales': '#c8a96e',
  'Mano de obra': '#3a7cc4',
  'Mobiliario': '#7b5bbf',
  'Acabados': '#10b981',
  'Imprevistos': '#ef4444',
  'Transporte': '#f59e0b',
  'Equipos': '#6366f1',
  'Servicios': '#ec4899',
};

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-[12px]">
      <div className="font-semibold">{payload[0].name}</div>
      <div className="text-[var(--af-accent)]">{fmtCOP(payload[0].value)}</div>
    </div>
  );
}

export default function BudgetScreen() {
  const ui = useUI();
  const fs = useFirestore();

  const totalExpenses = useMemo(() => fs.expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0), [fs.expenses]);

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    fs.expenses.forEach((e: any) => {
      const cat = e.data.category || 'Otros';
      cats[cat] = (cats[cat] || 0) + (Number(e.data.amount) || 0);
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#9a9b9e' }));
  }, [fs.expenses]);

  const byProject = useMemo(() => {
    const map: Record<string, any[]> = {};
    fs.expenses.forEach((e: any) => {
      const k = e.data.projectId || '_none';
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [fs.expenses]);

  const avgExpense = fs.expenses.length > 0 ? totalExpenses / fs.expenses.length : 0;
  const topCategory = byCategory.length > 0 ? byCategory[0] : null;

  const exportCSV = () => {
    const q = '"';
    const dq = '""';
    const headers = ['Concepto', 'Proyecto', 'Categoría', 'Monto', 'Fecha'];
    const esc = (v: string) => q + String(v).split(q).join(dq) + q;
    const rows = fs.expenses.map((e: any) => [e.data.concept, fs.projects.find((p: any) => p.id === e.data.projectId)?.data?.name || '—', e.data.category, e.data.amount, e.data.date]);
    const csv = [headers, ...rows].map((r: any) => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'presupuesto_' + new Date().toISOString().split('T')[0] + '.csv'; a.click(); URL.revokeObjectURL(url);
    ui.showToast('Presupuesto exportado a CSV');
  };

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign size={20} className="text-[var(--af-accent)]" />
            Presupuesto
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{fs.expenses.length} gastos registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors"
            onClick={exportCSV}
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => { ui.setForms((p: any) => ({ ...p, expConcept: '', expProject: '', expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); ui.openModal('expense'); }}
          >
            <Plus size={15} /> Registrar gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Total gastado</div>
          <div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(totalExpenses)}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Promedio por gasto</div>
          <div className="text-lg font-bold">{fmtCOP(avgExpense)}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Mayor categoría</div>
          <div className="text-lg font-bold">{topCategory ? topCategory.name : '—'}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Total en {topCategory?.name || '—'}</div>
          <div className="text-lg font-bold">{topCategory ? fmtCOP(topCategory.value) : fmtCOP(0)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3">Distribución por Categoría</div>
          {byCategory.length === 0 ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {byCategory.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {byCategory.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[var(--muted-foreground)]">{d.name}</span>
                    <span className="font-semibold">{Math.round((d.value / totalExpenses) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category breakdown list */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 lg:col-span-2">
          <div className="text-[15px] font-semibold mb-3">Detalle por Categoría</div>
          {byCategory.length === 0 ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin gastos</div>
          ) : (
            <div className="space-y-3">
              {byCategory.map((cat: any, i: number) => {
                const pct = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                        <span className="text-[13px] font-medium">{cat.name}</span>
                        <span className="text-[10px] text-[var(--af-text3)]">{fs.expenses.filter((e: any) => (e.data.category || 'Otros') === cat.name).length} registros</span>
                      </div>
                      <span className="text-[13px] font-semibold">{fmtCOP(cat.value)}</span>
                    </div>
                    <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expenses by Project */}
      {Object.keys(byProject).length > 0 && (
        <div className="space-y-3">
          {Object.entries(byProject).map(([pid, exps]: [string, any]) => {
            const proj = fs.projects.find((p: any) => p.id === pid);
            const total = exps.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
            const budget = Number(proj?.data?.budget) || 0;
            const pct = budget > 0 ? (total / budget) * 100 : -1;
            return (
              <div key={pid} className={`bg-[var(--card)] border rounded-xl p-5 ${budget > 0 && pct >= 80 ? `${getBudgetBorderColorClass(pct)}` : 'border-[var(--border)]'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-[var(--af-accent)]" />
                    <span className="text-[15px] font-semibold">{proj?.data.name || 'Sin proyecto'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {budget > 0 && pct >= 80 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getBudgetBgClass(pct)} ${getBudgetTextColorClass(pct)} border ${getBudgetBorderColorClass(pct)}`}>
                        {Math.round(pct)}%
                      </span>
                    )}
                    <span className="text-[14px] font-semibold text-[var(--af-accent)]">{fmtCOP(total)}</span>
                  </div>
                </div>
                {budget > 0 && (
                  <div className="mb-3">
                    <BudgetProgressBar spent={total} budget={budget} showThresholds showLabel={!exps.length} />
                  </div>
                )}
                {exps.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0 group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: CAT_COLORS[e.data.category] || '#9a9b9e' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{e.data.concept}</div>
                      <div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div>
                    </div>
                    <div className="text-sm font-semibold">{fmtCOP(Number(e.data.amount))}</div>
                    <button className="text-xs px-1.5 py-1 rounded bg-red-500/10 text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => fs.deleteExpense(e.id)}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {fs.expenses.length === 0 && (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
            <DollarSign size={24} className="text-[var(--af-text3)]" />
          </div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin gastos</div>
          <div className="text-xs mt-1">Registra tu primer gasto para empezar a llevar control</div>
        </div>
      )}
    </div>
  );
}
