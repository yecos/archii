'use client';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function AnimatedTabs({ tabs, activeTab, onTabChange, className = '' }: AnimatedTabsProps) {
  return (
    <div className={`relative flex gap-1 bg-[var(--af-bg3)] p-1 rounded-xl ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors cursor-pointer border-none bg-transparent ${
            activeTab === tab.id ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-[var(--card)] shadow-sm rounded-lg"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
