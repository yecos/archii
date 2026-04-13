'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import AIChatPanel from './AIChatPanel';
import QuickActions from './QuickActions';
import { useUIStore } from '@/stores/ui-store';

export default function AIFloatingWrapper() {
  const [chatOpen, setChatOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltip, setTooltip] = useState(true);
  const currentScreen = useUIStore((s) => s.currentScreen);

  // Hide FABs on chat screen to avoid overlapping the chat input bar
  const hideFABs = currentScreen === 'chat';

  // Mostrar el botón después de un breve delay para que no moleste al cargar
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Ocultar tooltip después de 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => setTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleChatOpen = () => {
    setChatOpen(true);
    setQuickOpen(false);
    setTooltip(false);
  };

  const handleQuickToggle = () => {
    setQuickOpen((prev) => !prev);
    setTooltip(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Chat Panel */}
      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* Quick Actions */}
      <QuickActions
        isOpen={quickOpen}
        onClose={() => setQuickOpen(false)}
        onOpenChat={handleChatOpen}
      />

      {/* Floating Buttons - hidden on chat screen, positioned higher on desktop */}
      {!hideFABs && (
      <div className="fixed bottom-20 md:bottom-20 right-4 md:right-6 z-[90] flex flex-col items-end gap-3">
        {/* Tooltip */}
        {tooltip && !chatOpen && !quickOpen && (
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
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Main AI Chat Button (golden) */}
        <button
          onClick={handleChatOpen}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
            'shadow-xl shadow-[var(--af-accent)]/20 hover:shadow-2xl hover:shadow-[var(--af-accent)]/30',
            'bg-[var(--af-accent)] text-black hover:scale-105 active:scale-95',
            chatOpen && 'scale-90 opacity-0 pointer-events-none'
          )}
          title="Abrir asistente IA"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2Z" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
      )}
    </>
  );
}
