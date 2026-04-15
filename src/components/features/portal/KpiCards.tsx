import React from 'react';
import { FolderKanban, FileText, CircleDot } from 'lucide-react';

interface KpiCardsProps {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingInvoices: number;
}

export default function KpiCards({
  totalProjects,
  activeProjects,
  completedProjects,
  pendingInvoices,
}: KpiCardsProps) {
  const cards = [
    {
      value: totalProjects,
      label: 'Proyectos',
      icon: <FolderKanban size={16} />,
      bg: 'bg-[var(--af-accent)]/10',
      iconColor: 'text-[var(--af-accent)]',
      sub: `${activeProjects} activos`,
    },
    {
      value: activeProjects,
      label: 'En progreso',
      icon: <CircleDot size={16} />,
      bg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      sub: `${completedProjects} finalizados`,
    },
    {
      value: pendingInvoices,
      label: 'Facturas pendientes',
      icon: <FileText size={16} />,
      bg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      sub: pendingInvoices === 0 ? 'Al día' : 'Requieren atención',
      badge: pendingInvoices > 0,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="card-elevated rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-colors border border-transparent"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center ${card.iconColor}`}
            >
              {card.icon}
            </div>
            {card.badge && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="text-xl md:text-2xl font-bold leading-tight">{card.value}</div>
          <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5">{card.label}</div>
          <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
