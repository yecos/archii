'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MESES } from '@/lib/types';

interface CalendarHeaderProps {
  calView: 'monthly' | 'weekly';
  weekLabel: string;
  calMonth: number;
  calYear: number;
  calFilterProject: string;
  projects: Array<{ id: string; data: { name: string } }>;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: 'monthly' | 'weekly') => void;
  onFilterProjectChange: (value: string) => void;
  onGoToday: () => void;
}

export default function CalendarHeader({
  calView,
  weekLabel,
  calMonth,
  calYear,
  calFilterProject,
  projects,
  onPrev,
  onNext,
  onViewChange,
  onFilterProjectChange,
  onGoToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <button
          className="skeuo-btn w-8 h-8 rounded-lg flex items-center justify-center"
          onClick={onPrev}
        >
          <ChevronLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>
        <div className="text-[15px] font-semibold min-w-[120px] sm:min-w-[160px] text-center">
          {calView === 'weekly' ? weekLabel : `${MESES[calMonth]} ${calYear}`}
        </div>
        <button
          className="skeuo-btn w-8 h-8 rounded-lg flex items-center justify-center"
          onClick={onNext}
        >
          <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="skeuo-well flex rounded-xl overflow-hidden">
          <button
            className={`text-[11px] px-3 py-1.5 cursor-pointer transition-colors ${
              calView === 'monthly'
                ? 'bg-[var(--af-accent)] text-background font-semibold'
                : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
            }`}
            onClick={() => onViewChange('monthly')}
          >
            Mensual
          </button>
          <button
            className={`text-[11px] px-3 py-1.5 cursor-pointer transition-colors border-l border-[var(--border)] ${
              calView === 'weekly'
                ? 'bg-[var(--af-accent)] text-background font-semibold'
                : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
            }`}
            onClick={() => onViewChange('weekly')}
          >
            Semanal
          </button>
        </div>
        <select
          className="skeuo-input rounded-lg px-2.5 py-1.5 text-[11px]"
          value={calFilterProject}
          onChange={e => onFilterProjectChange(e.target.value)}
        >
          <option value="all">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.data.name}
            </option>
          ))}
        </select>
        <button
          className="skeuo-btn text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"
          onClick={onGoToday}
        >
          Hoy
        </button>
      </div>
    </div>
  );
}
