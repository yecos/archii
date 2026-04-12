'use client';
import React from 'react';
import { useApp } from '@/contexts/AppContext';

export default function ObraScreen() {
  const {
    projects, setSelectedProjectId, setForms, navigateTo,
  } = useApp();

  return (
    <div className="animate-fadeIn">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-3">Seguimiento de obra</div>
        <div className="text-center py-12 text-[var(--af-text3)]">
          <div className="text-3xl mb-2">🏗️</div>
          <div className="text-sm mb-3">Selecciona un proyecto en ejecución para ver su seguimiento</div>
          {projects.filter(p => p.data.status === 'Ejecucion').length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {projects.filter(p => p.data.status === 'Ejecucion').map(p => (<button key={p.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] hover:border-[var(--input)] transition-all" onClick={() => { setSelectedProjectId(p.id); setForms(p => ({ ...p, detailTab: 'Obra' })); navigateTo('projectDetail', p.id); }}>{p.data.name}</button>))}
            </div>
          ) : <div className="text-xs mt-2">No hay proyectos en ejecución</div>}
        </div>
      </div>
    </div>
  );
}
