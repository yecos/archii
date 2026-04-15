import React from 'react';
import { User, MapPin, CalendarDays, Clock, ChevronRight } from 'lucide-react';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import { fmtCOP, fmtDateTime } from '@/lib/helpers';
import { projectStatusColor, progressColor } from './statusHelpers';

export interface ActivityItem {
  id: string;
  text: string;
  time: any;
  icon: string;
}

interface ProjectCardProps {
  project: any;
  progress: number;
  spent: number;
  budget: number;
  activityItems: ActivityItem[];
  onSelect: () => void;
}

export default function ProjectCard({
  project,
  progress: prog,
  spent,
  budget,
  activityItems,
  onSelect,
}: ProjectCardProps) {
  const isActive = !['Completado', 'Cancelado'].includes(project.data.status);

  return (
    <div
      className="card-elevated rounded-xl p-5 hover:border-[var(--af-accent)]/30 transition-all cursor-pointer group border border-transparent"
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{project.data.name}</h3>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            )}
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${projectStatusColor(project.data.status)}`}
          >
            {project.data.status}
          </span>
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--muted-foreground)] mt-1 flex-shrink-0 group-hover:text-[var(--af-accent)] transition-colors"
        />
      </div>

      {/* Key Info */}
      <div className="space-y-1.5 text-[12px] text-[var(--muted-foreground)] mb-4">
        {project.data.client && (
          <div className="flex items-center gap-1.5">
            <User size={12} className="flex-shrink-0" />
            <span className="truncate">{project.data.client}</span>
          </div>
        )}
        {project.data.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{project.data.location}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {project.data.startDate && (
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="flex-shrink-0" />
              <span>{project.data.startDate}</span>
            </div>
          )}
          {project.data.endDate && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="flex-shrink-0" />
              <span>{project.data.endDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[var(--muted-foreground)]">Progreso</span>
          <span className="text-[11px] font-semibold">{prog}%</span>
        </div>
        <div className="h-1 bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(prog)}`}
            style={{ width: prog + '%' }}
          />
        </div>
      </div>

      {/* Budget Summary */}
      {budget > 0 && (
        <div className="mb-4">
          <BudgetProgressBar spent={spent} budget={budget} showThresholds={false} compact />
        </div>
      )}

      {/* Budget text fallback */}
      {budget > 0 && (
        <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] mb-3">
          <span>
            <span className="text-[var(--af-accent)]">{fmtCOP(spent)}</span> gastado
          </span>
          <span>de {fmtCOP(budget)}</span>
        </div>
      )}

      {/* Recent Activity */}
      {activityItems.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <div className="text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
            Actividad reciente
          </div>
          <div className="space-y-1.5">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <span className="text-xs mt-0.5 flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[var(--foreground)] truncate">{item.text}</div>
                  <div className="text-[10px] text-[var(--af-text3)]">{fmtDateTime(item.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
