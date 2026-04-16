'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase } from '@/lib/firebase-service';
import {
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
  DollarSign,
  ClipboardList,
  CalendarClock,
  BarChart3,
} from 'lucide-react';

/* ===== Types ===== */
interface Suggestion {
  id: string;
  title: string;
  description: string;
  actionType: string;
  actionLabel?: string;
  priority: 'alta' | 'media' | 'baja';
  projectId?: string | null;
}

interface AISuggestionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (screen: string, projectId?: string | null) => void;
}

type SuggestionType = 'overview' | 'tasks' | 'budget' | 'expenses' | 'schedule';

/* ===== Config ===== */
const TYPE_TABS: { id: SuggestionType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'General', icon: <BarChart3 size={14} /> },
  { id: 'tasks', label: 'Tareas', icon: <ClipboardList size={14} /> },
  { id: 'budget', label: 'Presupuesto', icon: <DollarSign size={14} /> },
  { id: 'expenses', label: 'Gastos', icon: <DollarSign size={14} /> },
  { id: 'schedule', label: 'Cronograma', icon: <CalendarClock size={14} /> },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  alta: {
    color: 'text-red-400',
    bg: 'bg-red-500/8',
    border: 'border-red-500/20',
    icon: <AlertTriangle size={14} className="text-red-400" />,
  },
  media: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    icon: <Clock size={14} className="text-amber-400" />,
  },
  baja: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
    icon: <CheckCircle2 size={14} className="text-emerald-400" />,
  },
};

const ACTION_TYPE_NAVIGATION: Record<string, string> = {
  task: 'tasks',
  budget: 'budget',
  expense: 'budget',
  schedule: 'tasks',
  navigate: 'projects',
};

/* ===== Helpers ===== */
function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }
    const fb = getFirebase();
    if (!fb?.auth?.()) {
      reject(new Error('Firebase not ready'));
      return;
    }
    const currentUser = fb.auth().currentUser;
    if (!currentUser) {
      reject(new Error('Not authenticated'));
      return;
    }
    currentUser.getIdToken().then(resolve).catch(reject);
  });
}

/* ===== Component ===== */
export default function AISuggestionsPanel({ isOpen, onClose, onNavigate }: AISuggestionsPanelProps) {
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SuggestionType>('overview');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedTabs, setFetchedTabs] = useState<Set<SuggestionType>>(new Set());

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissedIds.has(s.id)),
    [suggestions, dismissedIds]
  );

  const fetchSuggestions = useCallback(
    async (tabType: SuggestionType) => {
      if (!authUser || fetchedTabs.has(tabType)) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch('/api/ai-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: tabType,
            context: tabType === 'overview' ? 'Dashboard general del usuario' : undefined,
          }),
        });

        const data = await response.json();

        if (data.error && data.setupRequired) {
          setError('Configura OPENAI_API_KEY para usar sugerencias IA.');
          return;
        }

        if (data.error) {
          setError(data.message || data.error);
          return;
        }

        const newSuggestions: Suggestion[] = (data.suggestions || []).map((s: Suggestion, i: number) => ({
          ...s,
          id: s.id || `sug-${tabType}-${i}`,
        }));

        setSuggestions((prev) => {
          // Remove old suggestions for this tab type and add new ones
          const filtered = prev.filter((s) => !s.id.includes(`-${tabType}-`));
          return [...filtered, ...newSuggestions];
        });
        setFetchedTabs((prev) => new Set(prev).add(tabType));
      } catch (err) {
        console.error('[ArchiFlow AI Suggestions] Fetch error:', err);
        setError('Error de conexión. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    },
    [authUser, fetchedTabs]
  );

  const handleTabChange = useCallback(
    (tab: SuggestionType) => {
      setActiveTab(tab);
      fetchSuggestions(tab);
    },
    [fetchSuggestions]
  );

  const handleRefresh = useCallback(() => {
    setFetchedTabs(new Set());
    setSuggestions([]);
    setDismissedIds(new Set());
    setError(null);
    fetchSuggestions(activeTab);
  }, [activeTab, fetchSuggestions]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleAction = useCallback(
    (suggestion: Suggestion) => {
      const targetScreen = ACTION_TYPE_NAVIGATION[suggestion.actionType];
      if (targetScreen && onNavigate) {
        onNavigate(targetScreen, suggestion.projectId || undefined);
        onClose();
      }
    },
    [onNavigate, onClose]
  );

  // Auto-fetch overview when panel opens AND user is authenticated
  useEffect(() => {
    if (isOpen && authUser) {
      fetchSuggestions('overview');
    }
  }, [isOpen, authUser, fetchSuggestions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg h-[85dvh] sm:h-[80vh] max-h-[100dvh] sm:max-h-[700px] flex flex-col',
          'bg-[var(--af-bg1)] border border-[var(--af-bg4)] sm:rounded-2xl rounded-t-2xl shadow-2xl',
          'animate-slideUp overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--af-bg4)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--af-accent)]/15 flex items-center justify-center">
              <Sparkles size={18} className="text-[var(--af-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sugerencias IA</h3>
              <p className="text-xs text-muted-foreground">Recomendaciones inteligentes</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="w-9 h-9 rounded-lg hover:bg-[var(--af-bg4)] active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Actualizar sugerencias"
            >
              <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-[var(--af-bg4)] active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-[var(--af-bg4)] overflow-x-auto scrollbar-none">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-[var(--af-accent)]/15 text-[var(--af-accent)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[var(--af-bg3)]'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={32} className="text-[var(--af-accent)] animate-spin" />
              <p className="text-sm text-muted-foreground">Analizando tus proyectos...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-xs text-[var(--af-accent)] hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && visibleSuggestions.length === 0 && fetchedTabs.has(activeTab) && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--af-accent)]/10 flex items-center justify-center">
                <Sparkles size={24} className="text-[var(--af-accent)]" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {dismissedIds.size > 0
                  ? 'Descartaste todas las sugerencias'
                  : 'No hay sugerencias disponibles'}
              </p>
              {dismissedIds.size > 0 && (
                <button
                  onClick={() => setDismissedIds(new Set())}
                  className="mt-1 text-xs text-[var(--af-accent)] hover:underline"
                >
                  Mostrar descartadas
                </button>
              )}
            </div>
          )}

          {/* Suggestion Cards */}
          {!isLoading &&
            !error &&
            visibleSuggestions.map((suggestion) => {
              const priority = PRIORITY_CONFIG[suggestion.priority] || PRIORITY_CONFIG.media;
              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    'relative group rounded-xl border p-4 transition-all hover:shadow-md',
                    priority.bg,
                    priority.border
                  )}
                >
                  {/* Priority indicator */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{priority.icon}</div>
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h4 className="text-[13px] font-semibold text-foreground leading-snug">
                        {suggestion.title}
                      </h4>
                      {/* Description */}
                      <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                        {suggestion.description}
                      </p>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        {suggestion.actionLabel && suggestion.actionType !== 'info' && (
                          <button
                            onClick={() => handleAction(suggestion)}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--af-accent)] hover:underline"
                          >
                            {suggestion.actionLabel}
                            <ArrowRight size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(suggestion.id)}
                          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                    {/* Dismiss button (top right) */}
                    <button
                      onClick={() => handleDismiss(suggestion.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Descartar sugerencia"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--af-bg4)]">
          <p className="text-[10px] text-muted-foreground/50 text-center pb-[env(safe-area-inset-bottom,0px)]">
            Las sugerencias son generadas por IA y pueden no ser exactas. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
