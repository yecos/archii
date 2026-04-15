'use client';
import { getBudgetColor, getBudgetTextColorClass, BUDGET_THRESHOLDS } from '@/lib/budget-alerts';
import { fmtCOP } from '@/lib/helpers';

interface BudgetProgressBarProps {
  /** Total amount spent */
  spent: number;
  /** Total project budget (must be > 0) */
  budget: number;
  /** Whether to show threshold marker lines at 80%, 90%, 100% */
  showThresholds?: boolean;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Compact mode — thinner bar, no text details */
  compact?: boolean;
}

/**
 * BudgetProgressBar — a reusable progress bar for project budgets.
 *
 * Color coding:
 *  - Green (< 80%)
 *  - Yellow/Amber (80-89%)
 *  - Orange (90-99%)
 *  - Red (>= 100%)
 *
 * Optionally shows threshold markers at 80%, 90%, and 100% lines.
 */
export default function BudgetProgressBar({
  spent,
  budget,
  showThresholds = false,
  className = '',
  showLabel = true,
  compact = false,
}: BudgetProgressBarProps) {
  if (budget <= 0) return null;

  const pct = Math.min((spent / budget) * 100, 150); // Cap visual at 150%
  const displayPct = Math.round((spent / budget) * 100);
  const color = getBudgetColor(displayPct);
  const textColor = getBudgetTextColorClass(displayPct);
  const barWidth = Math.min(pct, 100);
  const isOverBudget = spent > budget;
  const remaining = budget - spent;

  return (
    <div className={className}>
      {/* Label row */}
      {showLabel && !compact && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[var(--muted-foreground)]">Presupuesto utilizado</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${textColor}`}>
              {displayPct}%
            </span>
            {isOverBudget && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                +{Math.round((spent - budget) / budget * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar with threshold markers */}
      <div className="relative">
        {/* Threshold markers (rendered behind the bar) */}
        {showThresholds && (
          <div className="absolute inset-0 flex items-center pointer-events-none" style={{ zIndex: 1 }}>
            {BUDGET_THRESHOLDS.map((t) => (
              <div
                key={t.pct}
                className="absolute h-full flex flex-col items-center"
                style={{ left: `${Math.min(t.pct, 100)}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-full opacity-40" style={{ backgroundColor: t.color }} />
              </div>
            ))}
          </div>
        )}

        {/* Bar background */}
        <div className={`w-full rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2.5'} bg-[var(--af-bg4)]`}>
          {/* Fill */}
          <div
            className={`${compact ? 'h-1.5' : 'h-2.5'} rounded-full transition-all duration-500`}
            style={{
              width: `${barWidth}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Threshold labels */}
      {showThresholds && (
        <div className="relative mt-1 flex items-center" style={{ height: '14px' }}>
          {BUDGET_THRESHOLDS.map((t) => (
            <div
              key={t.pct}
              className="absolute flex flex-col items-center"
              style={{ left: `${Math.min(t.pct, 100)}%`, transform: 'translateX(-50%)' }}
            >
              <span
                className="text-[9px] font-medium leading-none"
                style={{ color: t.color, opacity: 0.7 }}
              >
                {t.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Detail row */}
      {showLabel && !compact && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-[11px] text-[var(--muted-foreground)]">
            <span className={textColor}>{fmtCOP(spent)}</span>
            {' de '}
            {fmtCOP(budget)}
          </div>
          {isOverBudget ? (
            <span className="text-[11px] text-red-400 font-medium">
              ⚠️ Excedido por {fmtCOP(Math.abs(remaining))}
            </span>
          ) : remaining > 0 ? (
            <span className="text-[11px] text-[var(--af-text3)]">
              Restante: {fmtCOP(remaining)}
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400">Presupuesto al 100%</span>
          )}
        </div>
      )}
    </div>
  );
}
