'use client';
import type { FileCategory } from './types';

interface StatsBarProps {
  stats: Record<string, number>;
  activeCategory: FileCategory;
  setActiveCategory: (cat: FileCategory) => void;
}

const STATS_ITEMS = [
  { label: 'Total', key: 'total' as const, icon: '📂' },
  { label: 'Documentos', key: 'documentos' as const, icon: '📄' },
  { label: 'Imágenes', key: 'imagenes' as const, icon: '🖼️' },
  { label: 'Planos', key: 'planos' as const, icon: '📐' },
  { label: 'Otros', key: 'otros' as const, icon: '📎' },
];

export function StatsBar({ stats, activeCategory, setActiveCategory }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {STATS_ITEMS.map(s => (
        <button
          key={s.label}
          className="card-elevated rounded-lg p-3 text-center hover:border-[var(--af-accent)]/30 transition-all cursor-pointer"
          onClick={() => {
            if (s.label === 'Total') setActiveCategory('todos');
            else setActiveCategory(s.label.toLowerCase() as FileCategory);
          }}
        >
          <div className="text-lg mb-0.5">{s.icon}</div>
          <div className="text-sm font-semibold text-[var(--foreground)]">{stats[s.key] || 0}</div>
          <div className="text-[10px] text-[var(--af-text3)]">{s.label}</div>
        </button>
      ))}
    </div>
  );
}
