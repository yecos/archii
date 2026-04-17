'use client';
import { useMemo } from 'react';
import { fmtCOP, taskStColor } from '@/lib/helpers';

interface WorkPhase {
  id: string;
  data: Record<string, any>;
}

interface ProjectResumenProps {
  project: { data: { client: string; location: string; startDate: string; endDate: string; budget: number; name: string; description: string; status: string; progress: number } };
  projectTasks: Array<{ id: string; data: { title: string; priority: string; status: string } }>;
  approvals: Array<{ id: string; data: Record<string, any> }>;
  workPhases: WorkPhase[];
  selectedProjectId: string | null;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
}

function phaseStatusValue(status: string): number {
  if (status === 'Completada') return 100;
  if (status === 'En progreso') return 50;
  return 0;
}

function phaseStatusColor(status: string): string {
  if (status === 'Completada') return 'bg-emerald-500';
  if (status === 'En progreso') return 'bg-[var(--af-accent)]';
  return 'bg-[var(--af-bg4)]';
}

function progressColor(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 40) return 'var(--af-accent)';
  return '#f59e0b';
}

export default function ProjectResumen({ project, projectTasks, approvals, workPhases, selectedProjectId, setForms, openModal }: ProjectResumenProps) {
  const pendingTasks = projectTasks.filter(t => t.data.status !== 'Completado');

  const phaseProgress = useMemo(() => {
    if (workPhases.length === 0) return 0;
    const total = workPhases.reduce((sum, ph) => sum + phaseStatusValue(ph.data.status || 'Pendiente'), 0);
    return Math.round(total / workPhases.length);
  }, [workPhases]);

  const completedPhases = useMemo(() => workPhases.filter(ph => ph.data.status === 'Completada').length, [workPhases]);
  const inProgressPhases = useMemo(() => workPhases.filter(ph => ph.data.status === 'En progreso').length, [workPhases]);
  const pendingPhasesCount = useMemo(() => workPhases.filter(ph => ph.data.status === 'Pendiente' || !ph.data.status).length, [workPhases]);

  // SVG circular progress ring
  const ringRadius = 40;
  const ringStroke = 6;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (phaseProgress / 100) * ringCircumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Progress card */}
      <div className="card-elevated p-5">
        <div className="text-[15px] font-semibold mb-4">Avance del proyecto</div>
        <div className="flex items-center gap-5">
          {/* Circular progress ring */}
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="var(--af-bg4)" strokeWidth={ringStroke} />
              <circle
                cx="50" cy="50" r={ringRadius} fill="none"
                stroke={progressColor(phaseProgress)}
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: progressColor(phaseProgress) }}>{phaseProgress}%</span>
            </div>
          </div>
          {/* Summary stats */}
          <div className="flex-1 space-y-2.5 min-w-0">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Completadas</span>
              <span className="font-semibold text-emerald-400">{completedPhases}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--af-accent)] inline-block" />En progreso</span>
              <span className="font-semibold text-[var(--af-accent)]">{inProgressPhases}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--af-bg4)] inline-block" />Pendientes</span>
              <span className="font-semibold text-[var(--muted-foreground)]">{pendingPhasesCount}</span>
            </div>
          </div>
        </div>
        {/* Per-phase progress bars */}
        {workPhases.length > 0 && (
          <div className="mt-4 space-y-2">
            {workPhases.map((ph, i) => {
              const pct = phaseStatusValue(ph.data.status || 'Pendiente');
              return (
                <div key={ph.id} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-[var(--muted-foreground)] w-24 truncate text-right" title={ph.data.name}>{ph.data.name}</span>
                  <div className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ph.data.status === 'Completada' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`}
                      style={{ width: pct + '%' }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium w-8 text-right ${pct === 100 ? 'text-emerald-400' : pct === 50 ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {workPhases.length === 0 && (
          <div className="mt-4 text-center py-3 text-[var(--af-text3)] text-xs rounded-lg bg-[var(--af-bg4)]">
            Inicializa las fases en la pestaña Ejecución para ver el avance
          </div>
        )}
      </div>

      {/* Information card */}
      <div className="card-elevated p-5">
        <div className="text-[15px] font-semibold mb-4">Información</div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Cliente</span><span>{project.data.client || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Ubicación</span><span>{project.data.location || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Inicio</span><span>{project.data.startDate || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Entrega</span><span>{project.data.endDate || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Presupuesto</span><span className="text-[var(--af-accent)] font-semibold">{fmtCOP(project.data.budget)}</span></div>
        </div>
      </div>

      {/* Activity */}
      <div className="card-elevated p-5">
        <div className="text-[15px] font-semibold mb-4">Actividad reciente</div>
        {pendingTasks.slice(0, 5).map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
            <div className={`w-2 h-2 rounded-full ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div className="flex-1 text-sm truncate">{t.data.title}</div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
          </div>
        ))}
        {pendingTasks.length === 0 && <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin tareas pendientes</div>}
      </div>

      {/* Approvals */}
      <div className="card-elevated p-5 md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[15px] font-semibold flex items-center gap-2">📋 Aprobaciones</div>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => { setForms(p => ({ ...p, appTitle: '', appDesc: '', appType: 'general', appAmount: '', appProject: selectedProjectId })); openModal('approval'); }}
          >+ Solicitar Aprobación</button>
        </div>
        {approvals.length === 0 ? (
          <div className="text-center py-4 text-[var(--af-text3)] text-sm">Sin solicitudes de aprobación</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {approvals.slice(0, 10).map(a => {
              const isPending = a.data.status === 'Pendiente';
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 skeuo-panel rounded-lg">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 skeuo-well">
                    {a.data.type === 'budget_change' ? '💰' : a.data.type === 'phase_completion' ? '🏗️' : a.data.type === 'expense_approval' ? '🧾' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{a.data.title}</div>
                    {a.data.description && <div className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">{a.data.description}</div>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        a.data.status === 'Aprobada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>{a.data.status}</span>
                      {a.data.amount > 0 && <span className="text-[10px] text-[var(--af-accent)] font-medium">{fmtCOP(a.data.amount)}</span>}
                      {a.data.requestedByName && <span className="text-[10px] text-[var(--af-text3)]">{a.data.requestedByName}</span>}
                    </div>
                    {a.data.comments && <div className="text-[10px] text-[var(--muted-foreground)] mt-1 italic">💬 {a.data.comments}</div>}
                  </div>
                  {isPending && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-xs px-1.5 py-1 rounded bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500 hover:text-white transition-all" onClick={() => { setForms(p => ({ ...p, reviewingApproval: a, reviewComment: '' })); openModal('approval'); }}>✓</button>
                      <button className="text-xs px-1.5 py-1 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500 hover:text-white transition-all" onClick={() => { setForms(p => ({ ...p, reviewingApproval: a, reviewComment: '' })); openModal('approval'); }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
