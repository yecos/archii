'use client';

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
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg transition-all duration-200 cursor-pointer border-none ${
            activeTab === tab.id
              ? 'text-[var(--foreground)] font-medium bg-[var(--card)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-transparent'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
