'use client';
import React from 'react';
import { useUI, useAuth, useFirestore } from '@/hooks/useDomain';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';

export default function FilesScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const { navigateTo, setForms, setSelectedProjectId } = ui;
  const { projects } = fs;
  const { loading } = auth;

  return (
<div className="animate-fadeIn">
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[15px] font-semibold mb-3">Planos y archivos</div>
              <div className="text-center py-12 text-[var(--af-text3)]">
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm mb-3">Sube archivos desde la vista de cada proyecto</div>
                <div className="text-xs">Selecciona un proyecto para ver y gestionar sus archivos</div>
                {projects.length > 0 && (<div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {projects.map(p => (<button key={p.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] hover:border-[var(--input)] transition-all" onClick={() => { setSelectedProjectId(p.id); setForms(p => ({ ...p, detailTab: 'Archivos' })); navigateTo('projectDetail', p.id); }}>{p.data.name}</button>))}
                </div>)}
              </div>
            </div>
          </div>
  );
}
