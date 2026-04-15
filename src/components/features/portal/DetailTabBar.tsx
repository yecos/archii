import React from 'react';
import { Eye, ImageIcon, FileText, MessageSquare } from 'lucide-react';
import type { DetailTab } from './statusHelpers';

interface DetailTabBarProps {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
  { key: 'resumen', label: 'Resumen', icon: <Eye size={13} /> },
  { key: 'fotos', label: 'Fotos', icon: <ImageIcon size={13} /> },
  { key: 'facturas', label: 'Facturas', icon: <FileText size={13} /> },
  { key: 'actividad', label: 'Actividad', icon: <MessageSquare size={13} /> },
];

export default function DetailTabBar({ activeTab, onTabChange }: DetailTabBarProps) {
  return (
    <div className="flex gap-1 skeuo-well rounded-xl p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${
            activeTab === t.key
              ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-btn)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          onClick={() => onTabChange(t.key)}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
