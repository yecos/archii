'use client';
import React from 'react';
import { useApp } from '@/contexts/AppContext';

export default function CompaniesScreen() {
  const {
    companies, projects, deleteCompany, setEditingId, setForms, openModal, showToast,
  } = useApp();

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-[var(--muted-foreground)]">{companies.length} empresa{companies.length !== 1 ? 's' : ''} registrada{companies.length !== 1 ? 's' : ''}</div>
        <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, compName: '', compNit: '', compAddress: '', compPhone: '', compEmail: '', compLegal: '' })); openModal('company'); }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva empresa
        </button>
      </div>
      {companies.length === 0 ? (<div className="text-center py-16"><div className="text-4xl mb-3">🏢</div><div className="text-sm text-[var(--muted-foreground)]">No hay empresas registradas</div><div className="text-xs text-[var(--af-text3)] mt-1">Crea tu primera empresa para organizar proyectos</div></div>) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(c => {
          const compProjects = projects.filter(p => p.data.companyId === c.id);
          return (<div key={c.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-lg">🏢</div>
                <div><div className="text-sm font-semibold">{c.data.name || 'Sin nombre'}</div><div className="text-[10px] text-[var(--muted-foreground)]">NIT: {c.data.nit || 'N/A'}</div></div>
              </div>
              <div className="flex gap-1">
                <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { setEditingId(c.id); setForms(p => ({ ...p, compName: c.data.name || '', compNit: c.data.nit || '', compAddress: c.data.address || '', compPhone: c.data.phone || '', compEmail: c.data.email || '', compLegal: c.data.legalName || '' })); openModal('company'); }} title="Editar">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" onClick={() => deleteCompany(c.id)} title="Eliminar">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
            {c.data.address && <div className="text-[11px] text-[var(--muted-foreground)] mb-1">📍 {c.data.address}</div>}
            {c.data.phone && <div className="text-[11px] text-[var(--muted-foreground)] mb-1">📞 {c.data.phone}</div>}
            {c.data.email && <div className="text-[11px] text-[var(--muted-foreground)] mb-2">✉️ {c.data.email}</div>}
            <div className="pt-3 border-t border-[var(--border)] mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[var(--af-text3)]">{compProjects.length} proyecto{compProjects.length !== 1 ? 's' : ''}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">{compProjects.length > 0 ? 'Activa' : 'Sin proyectos'}</span>
            </div>
          </div>);
        })}
      </div>
      )}
    </div>
  );
}
