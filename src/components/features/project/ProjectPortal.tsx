'use client';
import { useState, useMemo } from 'react';
import { fmtCOP, statusColor } from '@/lib/helpers';

interface WorkPhase {
  id: string;
  data: Record<string, any>;
}

interface ProjectPortalProps {
  project: { data: Record<string, any> };
  workPhases: WorkPhase[];
  projectFiles: Array<{ id: string; data: Record<string, any> }>;
  approvals: Array<{ id: string; data: Record<string, any> }>;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
  updateApproval: (approvalId: string, status: string) => void;
  deleteApproval: (approvalId: string) => void;
  updatePhaseStatus: (phaseId: string, status: string) => void;
}

function phaseStatusValue(status: string): number {
  if (status === 'Completada') return 100;
  if (status === 'En progreso') return 50;
  return 0;
}

function progressColor(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 40) return 'var(--af-accent)';
  return '#f59e0b';
}

export default function ProjectPortal({ project, workPhases, projectFiles, approvals, setForms, openModal, updateApproval, deleteApproval, updatePhaseStatus }: ProjectPortalProps) {
  const imageFiles = projectFiles.filter(f => f.data.type?.startsWith('image/'));

  const activePhases = useMemo(() => workPhases.filter(ph => ph.data.status && ph.data.status !== 'Pendiente'), [workPhases]);
  const pendingPhasesCount = useMemo(() => workPhases.filter(ph => !ph.data.status || ph.data.status === 'Pendiente').length, [workPhases]);

  const phaseProgress = useMemo(() => {
    if (activePhases.length === 0) return 0;
    const total = activePhases.reduce((sum, ph) => sum + phaseStatusValue(ph.data.status), 0);
    return Math.round(total / activePhases.length);
  }, [activePhases]);

  const completedPhases = useMemo(() => activePhases.filter(ph => ph.data.status === 'Completada').length, [activePhases]);
  const inProgressPhases = useMemo(() => activePhases.filter(ph => ph.data.status === 'En progreso').length, [activePhases]);

  // SVG ring values
  const ringRadius = 36;
  const ringStroke = 5;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (phaseProgress / 100) * ringCircumference;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">Vista del cliente</div>
        <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, appTitle: '', appDesc: '' })); openModal('approval'); }}>+ Nueva aprobación</button>
      </div>
      {/* Client summary with auto-calculated progress */}
      <div className="card-elevated p-5 mb-4">
        <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl mb-2">{project.data.name}</div>
        <div className="text-sm text-[var(--muted-foreground)] mb-4">{project.data.description || 'Sin descripción'}</div>

        {workPhases.length > 0 ? (
          <div className="flex items-center gap-5">
            {/* Circular progress ring */}
            <div className="relative flex-shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
                <circle cx="44" cy="44" r={ringRadius} fill="none" stroke="var(--af-bg4)" strokeWidth={ringStroke} />
                <circle
                  cx="44" cy="44" r={ringRadius} fill="none"
                  stroke={progressColor(phaseProgress)}
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: progressColor(phaseProgress) }}>{phaseProgress}%</span>
              </div>
            </div>
            {/* Phase summary */}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold mb-2">Avance por fases</div>
              <div className="space-y-1.5">
                {activePhases.map(ph => {
                  const pct = phaseStatusValue(ph.data.status);
                  return (
                    <div key={ph.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--muted-foreground)] w-20 truncate text-right" title={ph.data.name}>{ph.data.name}</span>
                      <div className="flex-1 h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${ph.data.status === 'Completada' ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`}
                          style={{ width: pct + '%' }}
                        />
                      </div>
                      <span className={`text-[9px] font-medium w-6 text-right ${pct === 100 ? 'text-emerald-400' : 'text-[var(--af-accent)]'}`}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(project.data.status)}`}>{project.data.status}</span>
            <span className="text-sm font-medium">{project.data.progress || 0}% completado</span>
          </div>
        )}
      </div>
      {/* Work phases for client — with editable status */}
      {workPhases.length > 0 && (<div className="card-elevated p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[15px] font-semibold">Fases del proyecto</div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-emerald-400">{completedPhases} completada{completedPhases !== 1 ? 's' : ''}</span>
            <span className="text-[var(--af-accent)]">{inProgressPhases} en progreso</span>
            <span className="text-[var(--af-text3)]">{pendingPhasesCount} pendiente{pendingPhasesCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="space-y-2">
          {workPhases.map(ph => (
            <div key={ph.id} className="flex items-center gap-3 py-1.5 group">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${ph.data.status === 'Completada' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
              <span className="text-sm flex-1">{ph.data.name}</span>
              <select
                className="skeuo-input rounded-lg px-2 py-1 text-[11px] cursor-pointer w-auto opacity-60 group-hover:opacity-100 transition-opacity"
                value={ph.data.status}
                onChange={(e) => updatePhaseStatus(ph.id, e.target.value)}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En progreso">En progreso</option>
                <option value="Completada">Completada</option>
              </select>
            </div>
          ))}
        </div>
      </div>)}
      {/* Files gallery */}
      {imageFiles.length > 0 && (<div className="card-elevated p-5 mb-4">
        <div className="text-[15px] font-semibold mb-3">Galería</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {imageFiles.map(f => (
            <a key={f.id} href={f.data.url} download={f.data.name}><img src={f.data.url} alt={f.data.name} className="w-full aspect-square object-cover rounded-lg border border-[var(--border)] hover:border-[var(--af-accent)] transition-all" loading="lazy" /></a>
          ))}
        </div>
      </div>)}
      {/* Approvals */}
      <div className="card-elevated p-5">
        <div className="text-[15px] font-semibold mb-3">Aprobaciones</div>
        {approvals.length === 0 ? <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin solicitudes de aprobación</div> :
        approvals.map(a => (
          <div key={a.id} className="border border-[var(--border)] rounded-lg p-3 mb-2">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm font-semibold">{a.data.title}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.data.status === 'Aprobada' ? 'bg-emerald-500/10 text-emerald-400' : a.data.status === 'Rechazada' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.data.status}</span>
            </div>
            {a.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{a.data.description}</div>}
            {a.data.status === 'Pendiente' && (
              <div className="flex gap-2 mt-2">
                <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-emerald-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Aprobada')}>✓ Aprobar</button>
                <button className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-red-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Rechazada')}>✕ Rechazar</button>
                <button className="ml-auto text-xs text-[var(--af-text3)] cursor-pointer hover:text-red-400" onClick={() => deleteApproval(a.id)}>Eliminar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
