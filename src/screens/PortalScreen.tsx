'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate, statusColor } from '@/lib/helpers';
import type { Submittal } from '@/lib/types';

export default function PortalScreen() {
  const {
    projects, tasks, rfis, submittals, punchItems,
    setSelectedProjectId, setForms, navigateTo, teamUsers, loading,
  } = useApp();

  // Compute per-project stats for client view
  const projectStats = useMemo(() => {
    return projects.map(p => {
      const projTasks = tasks.filter(t => t.data.projectId === p.id);
      const completedTasks = projTasks.filter(t => t.data.status === 'Completado').length;
      const totalTasks = projTasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const openRFIs = rfis.filter(r => r.data.projectId === p.id && r.data.status !== 'Cerrado' && r.data.status !== 'Respondido').length;
      const pendingSubs = submittals.filter((s: Submittal) => s.data.projectId === p.id && (s.data.status === 'Borrador' || s.data.status === 'En revisión')).length;
      const openPunch = punchItems.filter(pi => pi.data.projectId === p.id && pi.data.status !== 'Completado').length;
      return { ...p, totalTasks, completedTasks, progress, openRFIs, pendingSubs, openPunch };
    });
  }, [projects, tasks, rfis, submittals, punchItems]);

  const activeProjects = projectStats.filter(p => p.data.status === 'Ejecucion');
  const otherProjects = projectStats.filter(p => p.data.status !== 'Ejecucion');

  const openProjectPortal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setForms(p => ({ ...p, detailTab: 'Portal' }));
    navigateTo('projectDetail', projectId);
  };

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-xl">👥</div>
          <div>
            <div className="text-[15px] font-semibold">Portal del cliente</div>
            <div className="text-[11px] text-[var(--af-text3)]">Accede al progreso y documentos de cada proyecto</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] text-[var(--muted-foreground)]">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </div>
          {activeProjects.length > 0 && (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              {activeProjects.length} en ejecucion
            </div>
          )}
        </div>
      </div>

      {/* Active projects section */}
      {activeProjects.length > 0 && (
        <div>
          <div className="text-[13px] font-medium text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">Proyectos en ejecucion</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeProjects.map(p => (
              <button
                key={p.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--af-accent)]/40 transition-all group"
                onClick={() => openProjectPortal(p.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate group-hover:text-[var(--af-accent)] transition-colors">{p.data.name}</div>
                    {p.data.description && <div className="text-[11px] text-[var(--af-text3)] mt-1 line-clamp-1">{p.data.description}</div>}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--af-text3)] group-hover:bg-[var(--af-accent)]/10 group-hover:text-[var(--af-accent)] transition-all flex-shrink-0 ml-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--af-text3)]">Progreso general</span>
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)]">{p.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--af-bg3)]">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                {/* Quick stats */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--af-bg3)] text-[var(--muted-foreground)]">
                    {p.completedTasks}/{p.totalTasks} tareas
                  </span>
                  {p.openRFIs > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                      {p.openRFIs} RFI{p.openRFIs !== 1 ? 's' : ''} abierto{p.openRFIs !== 1 ? 's' : ''}
                    </span>
                  )}
                  {p.pendingSubs > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">
                      {p.pendingSubs} submittal{p.pendingSubs !== 1 ? 's' : ''} pendiente{p.pendingSubs !== 1 ? 's' : ''}
                    </span>
                  )}
                  {p.openPunch > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">
                      {p.openPunch} punch item{p.openPunch !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other projects */}
      {otherProjects.length > 0 && (
        <div>
          <div className="text-[13px] font-medium text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">Otros proyectos</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherProjects.map(p => (
              <button
                key={p.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--af-accent)]/40 transition-all group"
                onClick={() => openProjectPortal(p.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate group-hover:text-[var(--af-accent)] transition-colors">{p.data.name}</div>
                      <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{p.data.status || 'Sin estado'} · {p.totalTasks} tarea{p.totalTasks !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none text-[var(--af-text3)] group-hover:text-[var(--af-accent)] transition-all flex-shrink-0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-[14px] font-medium text-[var(--muted-foreground)] mb-1">Sin proyectos</div>
          <div className="text-[11px] text-[var(--af-text3)]">Los proyectos aparecen aqui cuando se creen nuevos</div>
        </div>
      )}
    </div>
  );
}
