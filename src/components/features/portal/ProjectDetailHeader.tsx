import React from 'react';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import { fmtCOP } from '@/lib/helpers';
import { projectStatusColor, progressColor } from './statusHelpers';

interface ProjectDetailHeaderProps {
  project: any;
  budget: number;
  spent: number;
}

export default function ProjectDetailHeader({
  project,
  budget,
  spent,
}: ProjectDetailHeaderProps) {
  const prog = project.data.progress || 0;

  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${projectStatusColor(project.data.status)}`}
            >
              {project.data.status}
            </span>
            <h1
              className="text-2xl mt-2"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {project.data.name}
            </h1>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">
              {project.data.location && '📍 ' + project.data.location}
              {project.data.client ? ' · ' + project.data.client : ''}
            </div>
            {project.data.description && (
              <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">
                {project.data.description}
              </div>
            )}
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-lg font-semibold text-[var(--af-accent)]">
                {fmtCOP(budget)}
              </div>
              <div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-400">{fmtCOP(spent)}</div>
              <div className="text-[10px] text-[var(--af-text3)]">Gastado</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor(prog)}`}
              style={{ width: prog + '%' }}
            />
          </div>
          <span className="text-sm font-medium text-[var(--muted-foreground)]">{prog}%</span>
        </div>

        {budget > 0 && (
          <div className="mt-3">
            <BudgetProgressBar spent={spent} budget={budget} showThresholds />
          </div>
        )}
      </div>
    </div>
  );
}
