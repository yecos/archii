'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { fmtCOP } from '@/lib/helpers';
import EmptyState from '@/components/ui/EmptyState';
import {
  Brain, Sparkles, TrendingUp, TrendingDown, DollarSign, Clock,
  AlertTriangle, ShieldAlert, Zap, Target, BarChart3, CalendarDays,
  ChevronRight, RefreshCw, Loader2, Info, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Eye
} from 'lucide-react';

/* ===== Types ===== */
type PredictionMode = 'full' | 'budget' | 'timeline' | 'risks';

interface BudgetPrediction {
  currentBurnRate: number;
  projectedTotal: number;
  variance: number;
  variancePercent: number;
  riskLevel: string;
  recommendation: string;
  monthlyForecast: Array<{ month: string; projected: number; cumulative: number }>;
}

interface MilestonePrediction {
  name: string;
  plannedDate: string;
  projectedDate: string;
  status: string;
}

interface TimelinePrediction {
  currentVelocity: number;
  projectedEndDate: string;
  plannedEndDate: string;
  varianceDays: number;
  riskLevel: string;
  recommendation: string;
  milestones: MilestonePrediction[];
}

interface RiskItem {
  id: string;
  title: string;
  description: string;
  probability: number;
  impact: string;
  category: string;
  mitigation: string;
}

interface PredictionData {
  type: string;
  overallRisk: string;
  confidence: number;
  summary: string;
  budget?: BudgetPrediction;
  timeline?: TimelinePrediction;
  risks?: RiskItem[];
  keyInsights?: string[];
}

/* ===== Helpers ===== */
function riskBadgeColor(level: string): string {
  switch (level) {
    case 'bajo': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'medio': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'alto': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'critico': return 'bg-red-500/10 text-red-400 border-red-500/30';
    default: return 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]';
  }
}

function riskDotColor(level: string): string {
  switch (level) {
    case 'bajo': return 'bg-emerald-400';
    case 'medio': return 'bg-amber-400';
    case 'alto': return 'bg-orange-400';
    case 'critico': return 'bg-red-400';
    default: return 'bg-[var(--muted-foreground)]';
  }
}

function milestoneStatusColor(status: string): string {
  switch (status) {
    case 'adelantado': return 'text-emerald-400';
    case 'a tiempo': return 'text-[var(--af-blue)]';
    case 'atrasado': return 'text-amber-400';
    case 'en riesgo': return 'text-red-400';
    default: return 'text-[var(--muted-foreground)]';
  }
}

function impactIcon(impact: string) {
  switch (impact) {
    case 'critico': return <XCircle size={14} className="text-red-400" />;
    case 'alto': return <AlertTriangle size={14} className="text-orange-400" />;
    case 'medio': return <Info size={14} className="text-amber-400" />;
    default: return <CheckCircle2 size={14} className="text-emerald-400" />;
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 75) return 'text-emerald-400';
  if (confidence >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function categoryIcon(category: string): string {
  switch (category) {
    case 'presupuesto': return '💰';
    case 'cronograma': return '⏰';
    case 'recursos': return '👷';
    case 'calidad': return '✅';
    case 'legal': return '⚖️';
    default: return '📋';
  }
}

/* ===== Main Component ===== */
export default function PredictiveAIScreen() {
  const { showToast } = useUI();
  const { projects } = useFirestore();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [mode, setMode] = useState<PredictionMode>('full');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const activeProjects = useMemo(() => {
    return projects.filter(p => {
      const s = p.data.status || '';
      return s !== 'Cancelado' && s !== 'Completado';
    });
  }, [projects]);

  const selectedProjectData = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find(p => p.id === selectedProject) || null;
  }, [projects, selectedProject]);

  // Auto-select first project
  React.useEffect(() => {
    if (!selectedProject && activeProjects.length > 0) {
      setSelectedProject(activeProjects[0].id);
    }
  }, [activeProjects, selectedProject]);

  const runPrediction = useCallback(async () => {
    if (!selectedProject) return;

    // Get auth token via CDN firebase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = (window as any).firebase;
    if (!fb?.auth?.().currentUser) {
      showToast('No hay sesión activa', 'error');
      return;
    }

    setLoading(true);
    setPrediction(null);
    setExpandedRisk(null);

    try {
      const token = await fb.auth().currentUser.getIdToken();
      const res = await fetch('/api/ai-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: mode,
          projectId: selectedProject,
        }),
      });

      const data = await res.json();

      if (data.error && !data.prediction) {
        showToast(data.error || 'Error al generar predicción', 'error');
        return;
      }

      if (data.prediction) {
        setPrediction(data.prediction);
      } else {
        showToast('No se pudo generar la predicción', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor', 'error');
      console.error('[PredictiveAI] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, mode, showToast]);

  /* ===== Empty state ===== */
  if (projects.length === 0) {
    return (
      <EmptyState
        illustration="projects"
        title="Sin datos para predecir"
        description="Crea proyectos con presupuestos y tareas para activar las predicciones con IA"
      />
    );
  }

  /* ===== Confidence Meter Component ===== */
  const ConfidenceMeter = ({ value }: { value: number }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[var(--af-bg3)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${value >= 75 ? 'bg-emerald-400' : value >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-[12px] font-bold font-tabular ${confidenceColor(value)}`}>{value}%</span>
    </div>
  );

  /* ===== Budget Forecast Card ===== */
  const BudgetCard = ({ budget }: { budget: BudgetPrediction }) => {
    const maxForecast = Math.max(1, ...(budget.monthlyForecast || []).map(m => m.cumulative));
    return (
      <div className="card-glass-subtle rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--af-accent)]" />
          <span className="text-[13px] font-semibold">Predicción de Presupuesto</span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadgeColor(budget.riskLevel)}`}>
            {budget.riskLevel.toUpperCase()}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
            <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Burn Rate Mensual</div>
            <div className="text-[15px] font-bold font-tabular text-[var(--af-accent)]">{fmtCOP(budget.currentBurnRate)}</div>
            <div className="text-[10px] text-[var(--af-text3)]">gasto promedio/mes</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
            <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Proyección Total</div>
            <div className="text-[15px] font-bold font-tabular text-[var(--af-blue)]">{fmtCOP(budget.projectedTotal)}</div>
            <div className="text-[10px] text-[var(--af-text3)]">al cierre del proyecto</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
            <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Variación</div>
            <div className={`text-[15px] font-bold font-tabular flex items-center gap-1 ${budget.variance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {budget.variance > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {budget.variance > 0 ? '+' : ''}{fmtCOP(budget.variance)}
            </div>
            <div className={`text-[10px] font-medium ${budget.variance > 0 ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
              {budget.variance > 0 ? 'Sobrecosto proyectado' : 'Ahorro proyectado'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
            <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Var. Porcentual</div>
            <div className={`text-[15px] font-bold font-tabular flex items-center gap-1 ${budget.variancePercent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {budget.variancePercent > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {budget.variancePercent > 0 ? '+' : ''}{budget.variancePercent}%
            </div>
            <div className="text-[10px] text-[var(--af-text3)]">vs presupuesto original</div>
          </div>
        </div>

        {/* Monthly Forecast Chart */}
        {budget.monthlyForecast && budget.monthlyForecast.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-3">
              Proyección Mensual
            </div>
            <div className="space-y-2">
              {budget.monthlyForecast.map((m, i) => {
                const w = maxForecast > 0 ? (m.cumulative / maxForecast) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] text-[var(--muted-foreground)] w-14 shrink-0">{m.month}</span>
                    <div className="flex-1 h-3 rounded-full bg-[var(--af-bg3)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--af-accent)] to-[var(--af-blue)] transition-all duration-500"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium font-tabular text-[var(--af-blue)] w-16 text-right">{fmtCOP(m.cumulative)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {budget.recommendation && (
          <div className="p-3 rounded-lg bg-[var(--af-accent)]/5 border border-[var(--af-accent)]/20">
            <div className="flex items-center gap-2 mb-1">
              <LightbulbIcon />
              <span className="text-[11px] font-semibold text-[var(--af-accent)]">Recomendación</span>
            </div>
            <p className="text-[12px] text-[var(--foreground)] leading-relaxed">{budget.recommendation}</p>
          </div>
        )}
      </div>
    );
  };

  /* ===== Timeline Prediction Card ===== */
  const TimelineCard = ({ timeline }: { timeline: TimelinePrediction }) => (
    <div className="card-glass-subtle rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-[var(--af-blue)]" />
        <span className="text-[13px] font-semibold">Predicción de Cronograma</span>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadgeColor(timeline.riskLevel)}`}>
          {timeline.riskLevel.toUpperCase()}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
          <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Velocidad Actual</div>
          <div className="text-[15px] font-bold font-tabular text-[var(--af-blue)]">{timeline.currentVelocity}</div>
          <div className="text-[10px] text-[var(--af-text3)]">tareas/semana</div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--af-bg2)]">
          <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Varianza</div>
          <div className={`text-[15px] font-bold font-tabular flex items-center gap-1 ${timeline.varianceDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {timeline.varianceDays > 0 ? <Clock size={14} /> : <Zap size={14} />}
            {timeline.varianceDays > 0 ? '+' : ''}{timeline.varianceDays} días
          </div>
          <div className="text-[10px] text-[var(--af-text3)]">{timeline.varianceDays > 0 ? 'retraso' : 'adelanto'}</div>
        </div>
      </div>

      {/* Dates comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Fecha Planificada</div>
          <div className="text-[14px] font-bold font-tabular">{timeline.plannedEndDate || '—'}</div>
        </div>
        <div className={`p-3 rounded-lg border ${timeline.varianceDays > 0 ? 'border-amber-400/30 bg-amber-400/5' : 'border-emerald-400/30 bg-emerald-400/5'}`}>
          <div className="text-[10px] text-[var(--muted-foreground)] mb-1">Fecha Proyectada</div>
          <div className={`text-[14px] font-bold font-tabular ${timeline.varianceDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {timeline.projectedEndDate || '—'}
          </div>
        </div>
      </div>

      {/* Milestones */}
      {timeline.milestones && timeline.milestones.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-3">
            Predicción por Milestones
          </div>
          <div className="space-y-2">
            {timeline.milestones.map((ms, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--af-bg2)]">
                <div className={`w-2 h-2 rounded-full shrink-0 ${riskDotColor(ms.status === 'a tiempo' ? 'bajo' : ms.status === 'adelantado' ? 'bajo' : ms.status === 'atrasado' ? 'medio' : 'alto')}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{ms.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                    <span>Plan: {ms.plannedDate}</span>
                    <ChevronRight size={10} />
                    <span className={milestoneStatusColor(ms.status)}>Proy: {ms.projectedDate}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${milestoneStatusColor(ms.status)}`}>
                  {ms.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {timeline.recommendation && (
        <div className="p-3 rounded-lg bg-[var(--af-blue)]/5 border border-[var(--af-blue)]/20">
          <div className="flex items-center gap-2 mb-1">
            <LightbulbIcon />
            <span className="text-[11px] font-semibold text-[var(--af-blue)]">Recomendación</span>
          </div>
          <p className="text-[12px] text-[var(--foreground)] leading-relaxed">{timeline.recommendation}</p>
        </div>
      )}
    </div>
  );

  /* ===== Risks Card ===== */
  const RisksCard = ({ risks }: { risks: RiskItem[] }) => {
    const sortedRisks = [...risks].sort((a, b) => (b.probability * (b.impact === 'critico' ? 4 : b.impact === 'alto' ? 3 : b.impact === 'medio' ? 2 : 1)) - (a.probability * (a.impact === 'critico' ? 4 : a.impact === 'alto' ? 3 : a.impact === 'medio' ? 2 : 1)));

    return (
      <div className="card-glass-subtle rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-orange-400" />
          <span className="text-[13px] font-semibold">Análisis de Riesgos</span>
          <span className="ml-auto text-[10px] font-medium text-[var(--muted-foreground)]">{risks.length} riesgos</span>
        </div>

        <div className="space-y-2">
          {sortedRisks.map((risk) => {
            const isExpanded = expandedRisk === risk.id;
            return (
              <div
                key={risk.id}
                className={`rounded-lg border transition-all cursor-pointer ${isExpanded ? 'border-[var(--af-accent)]/30 bg-[var(--af-accent)]/5' : 'border-[var(--border)] bg-[var(--af-bg2)] hover:border-[var(--border)]/80'}`}
                onClick={() => setExpandedRisk(isExpanded ? null : risk.id)}
              >
                <div className="flex items-center gap-3 p-3">
                  <span className="text-base">{categoryIcon(risk.category)}</span>
                  {impactIcon(risk.impact)}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{risk.title}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                      <span className={`font-medium ${milestoneStatusColor(risk.probability >= 70 ? 'en riesgo' : risk.probability >= 50 ? 'atrasado' : 'a tiempo')}`}>
                        {risk.probability}% prob.
                      </span>
                      <span>·</span>
                      <span>{risk.category}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)] pt-3">
                    <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">{risk.description}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-[var(--af-bg3)]">
                        <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">Probabilidad</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--af-bg4)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-400"
                              style={{ width: `${risk.probability}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold font-tabular">{risk.probability}%</span>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[var(--af-bg3)]">
                        <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">Impacto</div>
                        <span className={`text-[11px] font-bold mt-1 inline-block ${riskBadgeColor(risk.impact)}`}>
                          {risk.impact.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {risk.mitigation && (
                      <div className="p-2.5 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target size={12} className="text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-400">Mitigación Sugerida</span>
                        </div>
                        <p className="text-[11px] text-[var(--foreground)] leading-relaxed">{risk.mitigation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ===== RENDER ===== */
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 skeuo-well rounded-xl p-1">
          {([
            { k: '✨ Completa', v: 'full' as const },
            { k: '💰 Presupuesto', v: 'budget' as const },
            { k: '⏰ Cronograma', v: 'timeline' as const },
            { k: '🛡️ Riesgos', v: 'risks' as const },
          ]).map(t => (
            <button
              key={t.v}
              className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all whitespace-nowrap ${mode === t.v
                ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              onClick={() => setMode(t.v)}
            >
              {t.k}
            </button>
          ))}
        </div>

        <select
          className="skeuo-input px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none rounded-lg"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">Seleccionar proyecto...</option>
          {activeProjects.map(p => (
            <option key={p.id} value={p.id}>{p.data.name}</option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={runPrediction}
        disabled={!selectedProject || loading}
        className={`w-full py-3.5 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
          !selectedProject || loading
            ? 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Analizando proyecto...
          </>
        ) : (
          <>
            <Brain size={18} />
            Generar Predicción con IA
          </>
        )}
      </button>

      {/* Selected project info bar */}
      {selectedProjectData && (
        <div className="card-glass-subtle rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Sparkles size={16} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">{selectedProjectData.data.name}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              {selectedProjectData.data.status} · Presupuesto: {fmtCOP(selectedProjectData.data.budget || 0)}
              {selectedProjectData.data.progress !== undefined && ` · Avance: ${selectedProjectData.data.progress}%`}
            </div>
          </div>
        </div>
      )}

      {/* ===== LOADING STATE ===== */}
      {loading && (
        <div className="aurora-bg card-glass rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Brain size={48} className="text-purple-400/30" />
            <Loader2 size={24} className="absolute inset-0 m-auto text-purple-400 animate-spin" />
          </div>
          <div className="text-center">
            <div className="text-[14px] font-semibold">Analizando datos del proyecto...</div>
            <div className="text-[12px] text-[var(--muted-foreground)] mt-1">
              La IA está evaluando presupuestos, cronograma y riesgos
            </div>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== PREDICTION RESULTS ===== */}
      {prediction && !loading && (
        <div className="space-y-4">
          {/* Summary Header */}
          <div className="aurora-bg card-glass rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold">Predicción IA</div>
                <div className="text-[12px] text-[var(--muted-foreground)]">
                  Análisis de {selectedProjectData?.data.name || 'proyecto'}
                </div>
              </div>
              <div className={`text-[10px] font-bold px-3 py-1 rounded-full border ${riskBadgeColor(prediction.overallRisk)}`}>
                RIESGO {prediction.overallRisk.toUpperCase()}
              </div>
            </div>

            <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{prediction.summary}</p>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--muted-foreground)]">Confianza:</span>
              <ConfidenceMeter value={prediction.confidence} />
            </div>

            {/* Key Insights */}
            {prediction.keyInsights && prediction.keyInsights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                {prediction.keyInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--af-bg2)]">
                    <BarChart3 size={12} className="text-[var(--af-accent)] mt-0.5 shrink-0" />
                    <span className="text-[11px] text-[var(--foreground)] leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Re-run button */}
            <button
              onClick={runPrediction}
              className="w-full py-2 rounded-lg bg-[var(--af-bg3)] text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--af-bg4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw size={12} />
              Regenerar predicción
            </button>
          </div>

          {/* Budget Prediction */}
          {(mode === 'full' || mode === 'budget') && prediction.budget && (
            <BudgetCard budget={prediction.budget} />
          )}

          {/* Timeline Prediction */}
          {(mode === 'full' || mode === 'timeline') && prediction.timeline && (
            <TimelineCard timeline={prediction.timeline} />
          )}

          {/* Risks */}
          {(mode === 'full' || mode === 'risks') && prediction.risks && prediction.risks.length > 0 && (
            <RisksCard risks={prediction.risks} />
          )}

          {/* No data for specific mode */}
          {mode !== 'full' && (
            <>
              {mode === 'budget' && !prediction.budget && (
                <div className="card-glass-subtle rounded-xl p-6 text-center">
                  <DollarSign size={24} className="text-[var(--muted-foreground)] mx-auto mb-2" />
                  <div className="text-[13px] text-[var(--muted-foreground)]">
                    Datos insuficientes para predecir presupuesto. Intenta con el modo &quot;Completa&quot;.
                  </div>
                </div>
              )}
              {mode === 'timeline' && !prediction.timeline && (
                <div className="card-glass-subtle rounded-xl p-6 text-center">
                  <Clock size={24} className="text-[var(--muted-foreground)] mx-auto mb-2" />
                  <div className="text-[13px] text-[var(--muted-foreground)]">
                    Datos insuficientes para predecir cronograma. Intenta con el modo &quot;Completa&quot;.
                  </div>
                </div>
              )}
              {mode === 'risks' && (!prediction.risks || prediction.risks.length === 0) && (
                <div className="card-glass-subtle rounded-xl p-6 text-center">
                  <ShieldAlert size={24} className="text-[var(--muted-foreground)] mx-auto mb-2" />
                  <div className="text-[13px] text-[var(--muted-foreground)]">
                    No se detectaron riesgos significativos en este momento.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--af-bg2)] border border-[var(--border)]">
            <Eye size={14} className="text-[var(--muted-foreground)] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
              Las predicciones son generadas por IA basándose en los datos históricos del proyecto.
              No reemplazan el juicio profesional. La confianza indica la calidad de datos disponibles,
              no la precisión garantizada de la predicción. Revisa siempre con tu equipo.
            </p>
          </div>
        </div>
      )}

      {/* ===== IDLE STATE ===== */}
      {!prediction && !loading && selectedProject && (
        <div className="card-glass-subtle rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto">
            <Brain size={32} className="text-purple-400/60" />
          </div>
          <div>
            <div className="text-[15px] font-semibold mb-1">Listo para predecir</div>
            <div className="text-[13px] text-[var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
              Selecciona un tipo de análisis y presiona &quot;Generar Predicción&quot; para obtener
              proyecciones inteligentes de presupuesto, cronograma y riesgos del proyecto.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {[
              { icon: DollarSign, label: 'Presupuesto', desc: 'Sobrecosto o ahorro' },
              { icon: CalendarDays, label: 'Cronograma', desc: 'Retrasos y fechas' },
              { icon: ShieldAlert, label: 'Riesgos', desc: 'Mitigación proactiva' },
            ].map(item => (
              <div key={item.label} className="p-2.5 rounded-lg bg-[var(--af-bg3)] text-center">
                <item.icon size={18} className="text-[var(--af-accent)] mx-auto mb-1" />
                <div className="text-[11px] font-medium">{item.label}</div>
                <div className="text-[9px] text-[var(--muted-foreground)]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== SVG Icon Component ===== */
function LightbulbIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--af-accent)]">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
