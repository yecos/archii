'use client';
import { useRef, useEffect, useState, useCallback } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  // Update pill position when activeTab changes
  const updatePill = useCallback(() => {
    const btn = btnRefs.current.get(activeTab);
    const container = containerRef.current;
    if (btn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  // Re-measure on resize
  useEffect(() => {
    const observer = new ResizeObserver(updatePill);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updatePill]);

  const setBtnRef = useCallback((id: string) => (el: HTMLButtonElement | null) => {
    if (el) btnRefs.current.set(id, el);
  }, []);

  return (
    <div ref={containerRef} className={`relative flex gap-1 skeuo-well p-1 ${className}`}>
      {/* Sliding pill indicator */}
      <div
        className="absolute top-1 h-[calc(100%-8px)] card-elevated rounded-lg transition-all duration-200 ease-out pointer-events-none z-0"
        style={{
          left: pillStyle.left,
          width: pillStyle.width,
          opacity: pillStyle.width > 0 ? 1 : 0,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={setBtnRef(tab.id)}
          onClick={() => onTabChange(tab.id)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors duration-200 cursor-pointer border-none bg-transparent ${
            activeTab === tab.id
              ? 'text-[var(--foreground)] font-medium'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
