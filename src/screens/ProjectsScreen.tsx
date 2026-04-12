'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { statusColor, fmtCOP } from '@/lib/helpers';

export default function ProjectsScreen() {
  const {
    projects,
    forms,
    setForms,
    setEditingId,
    openModal,
    openProject,
    openEditProject,
    deleteProject,
  } = useApp();

  return (<div className="animate-fadeIn">
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 overflow-x-auto">
        {[{ k: 'Todos', v: '' }, { k: 'Concepto', v: 'Concepto' }, { k: 'Diseño', v: 'Diseno' }, { k: 'Ejecución', v: 'Ejecucion' }, { k: 'Terminados', v: 'Terminado' }].map((tab, i) => {
          const count = tab.v ? projects.filter(p => p.data.status === tab.v).length : projects.length;
          return (<button key={tab.k} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${(forms.projFilter || '') === tab.v ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, projFilter: tab.v }))}>{tab.k} ({count})</button>);
        })}
      </div>
      <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { setEditingId(null); openModal('project'); }}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo proyecto
      </button>
    </div>
    {projects.length === 0 ? (
      <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">📁</div><div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proyectos</div><div className="text-[13px]">Crea tu primer proyecto</div></div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.filter(p => !forms.projFilter || p.data.status === forms.projFilter).map(p => {
          const d = p.data, prog = d.progress || 0;
          return (<div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 cursor-pointer transition-all hover:border-[var(--input)] hover:-translate-y-0.5 relative overflow-hidden" onClick={() => openProject(p.id)}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--af-accent)] opacity-0 transition-opacity hover:!opacity-100" />
            <div className="flex justify-between items-start mb-2.5">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>{d.status || 'Concepto'}</span>
              <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                <button className="px-2.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => openEditProject(p)}>✏️</button>
                <button className="px-2.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer hover:bg-red-500/20" onClick={() => deleteProject(p.id)}>🗑</button>
              </div>
            </div>
            <div className="text-[15px] font-semibold mb-1">{d.name}</div>
            <div className="text-xs text-[var(--af-text3)] mb-3">{d.location ? '📍 ' + d.location : ''}{d.client ? ' · ' + d.client : ''}</div>
            <div className="flex gap-4 mb-3">
              <div><div className="text-lg font-semibold">{prog}%</div><div className="text-[10px] text-[var(--af-text3)]">Progreso</div></div>
              <div><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(d.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
            </div>
            <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} /></div>
          </div>);
        })}
      </div>
    )}
  </div>);
}
