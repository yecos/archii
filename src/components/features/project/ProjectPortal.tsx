'use client';
import React from 'react';
import { fmtCOP, statusColor } from '@/lib/helpers';

interface ProjectPortalProps {
  project: { data: Record<string, any> };
  workPhases: Array<{ id: string; data: Record<string, any> }>;
  projectFiles: Array<{ id: string; data: Record<string, any> }>;
  approvals: Array<{ id: string; data: Record<string, any> }>;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
  updateApproval: (approvalId: string, status: string) => void;
  deleteApproval: (approvalId: string) => void;
}

export default function ProjectPortal({ project, workPhases, projectFiles, approvals, setForms, openModal, updateApproval, deleteApproval }: ProjectPortalProps) {
  const imageFiles = projectFiles.filter(f => f.data.type?.startsWith('image/'));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">Vista del cliente</div>
        <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, appTitle: '', appDesc: '' })); openModal('approval'); }}>+ Nueva aprobación</button>
      </div>
      {/* Client summary */}
      <div className="card-elevated p-5 mb-4">
        <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl mb-2">{project.data.name}</div>
        <div className="text-sm text-[var(--muted-foreground)] mb-3">{project.data.description || 'Sin descripción'}</div>
        <div className="flex items-center gap-3 mb-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(project.data.status)}`}>{project.data.status}</span><span className="text-sm font-medium">{project.data.progress || 0}% completado</span></div>
        <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: (project.data.progress || 0) + '%' }} /></div>
      </div>
      {/* Work phases for client */}
      {workPhases.length > 0 && (<div className="card-elevated p-5 mb-4">
        <div className="text-[15px] font-semibold mb-3">Fases del proyecto</div>
        <div className="space-y-2">
          {workPhases.map(ph => (
            <div key={ph.id} className="flex items-center gap-3 py-1.5">
              <div className={`w-3 h-3 rounded-full ${ph.data.status === 'Completada' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
              <span className="text-sm flex-1">{ph.data.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ph.data.status === 'Completada' ? 'bg-emerald-500/10 text-emerald-400' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{ph.data.status}</span>
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
