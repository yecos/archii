import React, { useMemo } from 'react';
import { useFirestore } from '@/hooks/useDomain';
import { CheckCircle2, TrendingUp } from 'lucide-react';
import { fmtCOP } from '@/lib/helpers';

interface ResumenTabProps {
  project: any;
}

export default function ResumenTab({ project }: ResumenTabProps) {
  const fs = useFirestore();
  const proj = project;

  const projectExpenses = useMemo(
    () => fs.expenses.filter((e: any) => e.data.projectId === project.id),
    [fs.expenses, project.id],
  );
  const projectTasks = useMemo(
    () => fs.tasks.filter((t: any) => t.data.projectId === project.id),
    [fs.tasks, project.id],
  );
  const completedTasks = useMemo(
    () => projectTasks.filter((t: any) => t.data.status === 'Completado').length,
    [projectTasks],
  );

  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    projectExpenses.forEach((e: any) => {
      cats[e.data.category] = (cats[e.data.category] || 0) + (Number(e.data.amount) || 0);
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [projectExpenses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Info Card */}
      <div className="card-elevated rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-4">Información del Proyecto</div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Cliente</span>
            <span className="font-medium">{proj.data.client || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Ubicación</span>
            <span>{proj.data.location || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fase actual</span>
            <span>{proj.data.phase || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fecha inicio</span>
            <span>{proj.data.startDate || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fecha entrega</span>
            <span>{proj.data.endDate || '—'}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Presupuesto</span>
              <span className="text-[var(--af-accent)] font-semibold">
                {fmtCOP(proj.data.budget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card-elevated rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-4">Progreso</div>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-[120px] h-[120px]">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--af-bg4)"
                strokeWidth="2.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={
                  proj.data.progress >= 80
                    ? '#10b981'
                    : proj.data.progress >= 40
                      ? '#c8a96e'
                      : '#f59e0b'
                }
                strokeWidth="2.5"
                strokeDasharray={`${proj.data.progress || 0}, 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[22px] font-bold">{proj.data.progress || 0}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Tareas completadas</span>
            </div>
            <span className="font-semibold">
              {completedTasks}/{projectTasks.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[var(--af-accent)]" />
              <span>Gastos registrados</span>
            </div>
            <span className="font-semibold">{projectExpenses.length}</span>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <div className="card-elevated rounded-xl p-5 md:col-span-2">
          <div className="text-[15px] font-semibold mb-4">Gastos por Categoría</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expensesByCategory.map(([cat, amount]) => {
              const totalExp = expensesByCategory.reduce((s, [, v]) => s + v, 0);
              const pct = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
              return (
                <div key={cat} className="skeuo-well rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium">{cat}</span>
                    <span className="text-[13px] font-semibold text-[var(--af-accent)]">
                      {fmtCOP(amount)}
                    </span>
                  </div>
                  <div className="h-1 bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--af-accent)] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[var(--af-text3)] mt-1">
                    {pct}% del total
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
