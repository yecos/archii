'use client';
import React from 'react';
import { fmtCOP } from '@/lib/helpers';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';

interface ProjectPresupuestoProps {
  projectExpenses: Array<{ id: string; data: Record<string, any> }>;
  projectBudget: number;
  projectSpent: number;
  selectedProjectId: string | null;
  deleteExpense: (expenseId: string) => void;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
}

export default function ProjectPresupuesto({ projectExpenses, projectBudget, projectSpent, selectedProjectId, deleteExpense, setForms, openModal }: ProjectPresupuestoProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">{projectExpenses.length} gastos · Total: <span className="text-[var(--af-accent)] font-semibold">{fmtCOP(projectSpent)}</span> {projectBudget > 0 && <span>de {fmtCOP(projectBudget)}</span>}</div>
        <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, expConcept: '', expProject: selectedProjectId, expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); openModal('expense'); }}>+ Registrar gasto</button>
      </div>
      {projectBudget > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
          <BudgetProgressBar spent={projectSpent} budget={projectBudget} showThresholds />
        </div>
      )}
      {projectExpenses.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">💰</div><div className="text-sm">Sin gastos registrados</div></div> :
      <div className="space-y-2">
        {projectExpenses.map(e => (
          <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.data.concept}</div><div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div></div>
            <div className="text-sm font-semibold text-[var(--af-accent)]">{fmtCOP(e.data.amount)}</div>
            <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteExpense(e.id)}>✕</button>
          </div>
        ))}
      </div>}
    </div>
  );
}
