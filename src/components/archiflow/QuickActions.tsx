'use client';

import { useState } from 'react';
import { SquareCheck, DollarSign, Calendar, BarChart3, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface QuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}

interface SuggestionResult {
  text?: string;
  action?: string;
  title?: string;
  concept?: string;
  milestone?: string;
  category?: string;
  reason?: string;
  description?: string;
  impact?: string;
  dependencies?: string;
}

const ACTION_BUTTONS = [
  {
    id: 'tasks',
    label: 'Sugerir tareas',
    icon: <SquareCheck className="w-4 h-4" />,
    type: 'tasks' as const,
    description: 'Genera tareas sugeridas para tu proyecto',
  },
  {
    id: 'budget',
    label: 'Optimizar presupuesto',
    icon: <DollarSign className="w-4 h-4" />,
    type: 'budget' as const,
    description: 'Analiza y optimiza los gastos del proyecto',
  },
  {
    id: 'schedule',
    label: 'Planificar cronograma',
    icon: <Calendar className="w-4 h-4" />,
    type: 'schedule' as const,
    description: 'Sugiere hitos y fechas clave',
  },
  {
    id: 'improve',
    label: 'Mejoras del proyecto',
    icon: <BarChart3 className="w-4 h-4" />,
    type: 'overview' as const,
    description: 'Recomendaciones para mejorar tu proyecto',
  },
];

export default function QuickActions({ isOpen, onClose, onOpenChat }: QuickActionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const projectContext = useUIStore((s) => s.aiProjectContext);

  if (!isOpen) return null;

  const handleAction = async (action: (typeof ACTION_BUTTONS)[number]) => {
    setLoadingId(action.id);
    setActiveId(action.id);
    setSuggestions([]);
    setError(null);

    try {
      // Get Firebase auth token
      const fb = (window as any).firebase;
      const currentUser = fb?.auth?.()?.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          context: projectContext || 'Proyecto de arquitectura general',
          type: action.type,
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

      const result = data.suggestions || [];
      setSuggestions(result);
      if (result.length === 0) {
        setError('No se generaron sugerencias. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('[ArchiFlow AI] Error en sugerencias:', err);
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoadingId(null);
    }
  };

  const getSuggestionText = (s: SuggestionResult): string => {
    if (s.text) return s.text;
    if (s.title) return `${s.title}${s.reason ? ` — ${s.reason}` : ''}`;
    if (s.concept) return `${s.concept}${s.reason ? ` — ${s.reason}` : ''}`;
    if (s.action) return `${s.action}${s.description ? ` — ${s.description}` : ''}`;
    if (s.milestone) return `${s.milestone}${s.dependencies ? ` (deps: ${s.dependencies})` : ''}`;
    return JSON.stringify(s);
  };

  return (
    <div className="fixed bottom-32 md:bottom-24 right-3 left-3 md:left-auto md:right-6 md:w-80 z-[95] animate-slideUp">
      <div className="bg-[var(--af-bg1)] border border-[var(--af-bg4)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--af-bg4)] flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Acciones rápidas</h4>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
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
                  <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* Suggestions Results */}
        {suggestions.length > 0 && (
          <div className="px-3 pb-3 border-t border-[var(--af-bg4)] pt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Sugerencias ({suggestions.length})
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg bg-[var(--af-bg3)] text-xs text-foreground leading-relaxed"
                >
                  {getSuggestionText(s)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Chat CTA */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              onClose();
              onOpenChat();
            }}
            className="w-full py-3 rounded-xl bg-[var(--af-accent)]/10 text-[var(--af-accent)] text-xs font-medium active:bg-[var(--af-accent)]/20 transition-colors mb-[env(safe-area-inset-bottom,0px)]"
          >
            💬 Preguntar al asistente IA
          </button>
        </div>
      </div>
    </div>
  );
}
