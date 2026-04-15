'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import QuickActions from './QuickActions';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Sparkles } from 'lucide-react';

export default function AIFloatingWrapper() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const [tooltip, setTooltip] = useState(true);
  const currentScreen = useUIStore((s) => s.currentScreen);
  const setAIAgentOpen = useUIStore((s) => s.setAIAgentOpen);
  const lastScrollY = useRef(0);

  // Hide FABs on chat screen to avoid overlapping the chat input bar
  const hideFABs = currentScreen === 'chat';

  // Show button after 2-second delay
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hide tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    if (hideFABs) return;
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      const currentY = mainContent.scrollTop;
      const diff = currentY - lastScrollY.current;

      if (diff > 10 && currentY > 100) {
        setIsScrollHidden(true);
      } else if (diff < -5) {
        setIsScrollHidden(false);
      }

      lastScrollY.current = currentY;
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [hideFABs]);

  const handleAgentOpen = () => {
    setAIAgentOpen(true);
    setQuickOpen(false);
    setTooltip(false);
  };

  const handleQuickToggle = () => {
    setQuickOpen((prev) => !prev);
    setTooltip(false);
  };

  const shouldShow = isVisible && !isScrollHidden;

  return (
    <>
      {/* Quick Actions */}
      <QuickActions
        isOpen={quickOpen}
        onClose={() => setQuickOpen(false)}
        onOpenChat={handleAgentOpen}
      />

      {/* Floating Buttons - hidden on chat screen, positioned higher on desktop */}
      {!hideFABs && (
      <div className={cn(
        'fixed bottom-20 md:bottom-20 right-4 md:right-6 z-[90] flex flex-col items-end gap-3 transition-all duration-300',
        shouldShow
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      )}>
        {/* Tooltip */}
        {tooltip && !quickOpen && (
          <div className="animate-slideUp mb-1 px-3 py-2 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)] shadow-lg text-xs text-muted-foreground max-w-[200px]">
            Pregúntame sobre tu proyecto
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-[var(--af-bg3)] border-r border-b border-[var(--af-bg4)] rotate-45" />
          </div>
        )}

        {/* Quick Actions Button (+) */}
        <button
          onClick={handleQuickToggle}
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg',
            quickOpen
              ? 'bg-[var(--af-bg3)] text-foreground rotate-45 border border-[var(--af-bg4)]'
              : 'bg-[var(--af-bg3)] text-foreground border border-[var(--af-bg4)] hover:border-[var(--af-accent)]/30'
          )}
          title="Acciones rápidas"
          aria-label="Acciones rápidas"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Main AI Agent Button (golden) — now opens the unified Agent panel */}
        <button
          onClick={handleAgentOpen}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
            'shadow-xl shadow-[var(--af-accent)]/20 hover:shadow-2xl hover:shadow-[var(--af-accent)]/30',
            'bg-[var(--af-accent)] text-black hover:scale-105 active:scale-95',
          )}
          title="Abrir Agente IA"
          aria-label="Abrir Agente IA"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>
      )}
    </>
  );
}
