'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface QuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (prefillText?: string) => void;
}

interface ExecutedAction {
  type: string;
  label: string;
  icon: string;
  details: string;
  success: boolean;
  error?: string;
}

const ACTION_BUTTONS = [
  {
    id: 'tasks',
    label: 'Sugerir tareas',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    prompt: 'Sugiere 5 tareas importantes para mi proyecto actual con prioridades y fechas límite recomendadas',
    description: 'Genera tareas sugeridas para tu proyecto',
  },
  {
    id: 'budget',
    label: 'Analizar presupuesto',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    prompt: 'Analiza mi presupuesto actual, muestra gastos por categoría y recomienda cómo optimizar costos',
    description: 'Analiza y optimiza los gastos del proyecto',
  },
  {
    id: 'schedule',
    label: 'Planificar cronograma',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    prompt: 'Crea un cronograma de obra con hitos y fechas clave para las próximas 8 semanas',
    description: 'Sugiere hitos y fechas clave',
  },
  {
    id: 'improve',
    label: 'Mejoras del proyecto',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    ),
    prompt: 'Analiza mi proyecto y dame recomendaciones accionables para mejorarlo (tiempo, costo, calidad)',
    description: 'Recomendaciones para mejorar tu proyecto',
  },
];

export default function QuickActions({ isOpen, onClose, onOpenChat }: QuickActionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [results, setResults] = useState<{ text: string; actions?: ExecutedAction[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const projectContext = useUIStore((s) => s.aiProjectContext);

  if (!isOpen) return null;

  const handleAction = async (action: (typeof ACTION_BUTTONS)[number]) => {
    setLoadingId(action.id);
    setActiveId(action.id);
    setResults(null);
    setError(null);

    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: action.prompt,
            },
          ],
          projectContext: projectContext || 'Proyecto de arquitectura general',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.setupRequired) {
          setError(`${data.error}\n${data.help}`);
        } else {
          setError(data.error || 'Error obteniendo sugerencias');
        }
        return;
      }

      setResults({
        text: data.message || 'Sin respuesta',
        actions: data.actions || undefined,
      });
    } catch (err) {
      console.error('[ArchiFlow AI] Error en sugerencias:', err);
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed bottom-32 md:bottom-24 right-3 left-3 md:left-auto md:right-6 md:w-80 z-[95] animate-slideUp">
      <div className="bg-[var(--af-bg1)] border border-[var(--af-bg4)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--af-bg4)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--af-accent)] to-amber-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-foreground">Acciones rápidas</h4>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-3 space-y-1.5">
          {ACTION_BUTTONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={!!loadingId}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
                'hover:bg-[var(--af-bg3)] active:scale-[0.98]',
                activeId === action.id && 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20',
                loadingId && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                activeId === action.id
                  ? 'bg-[var(--af-accent)]/15 text-[var(--af-accent)]'
                  : 'bg-[var(--af-bg3)] text-muted-foreground'
              )}>
                {loadingId === action.id ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  action.icon
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{action.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-3 pb-3">
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 leading-relaxed whitespace-pre-wrap">
              {error}
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="px-3 pb-3 border-t border-[var(--af-bg4)] pt-2">
            <div className="px-3 py-2.5 rounded-lg bg-[var(--af-bg3)] text-xs text-foreground leading-relaxed max-h-48 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
              {results.text}
            </div>
            {results.actions && results.actions.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {results.actions.map((action, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] border',
                      action.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-300'
                    )}
                  >
                    <span>{action.icon}</span>
                    <span className="font-medium">{action.label}</span>
                    <span className="opacity-80 truncate">{action.details}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Open Chat CTA */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              onClose();
              onOpenChat();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--af-accent)]/15 to-amber-600/10 text-[var(--af-accent)] text-xs font-semibold active:from-[var(--af-accent)]/20 active:to-amber-600/15 transition-all border border-[var(--af-accent)]/10 mb-[env(safe-area-inset-bottom,0px)]"
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2Z" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
              Abrir Super IA
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
