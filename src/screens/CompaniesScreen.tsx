'use client';
import React from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { confirm } from '@/hooks/useConfirmDialog';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { getFirebase } from '@/lib/firebase-service';

export default function CompaniesScreen() {
  const ui = useUI();
  const fs = useFirestore();

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-[var(--muted-foreground)]">{fs.companies.length} empresa{fs.companies.length !== 1 ? 's' : ''} registrada{fs.companies.length !== 1 ? 's' : ''}</div>
        <button className="flex items-center gap-1.5 skeuo-btn bg-[var(--af-accent)] text-background px-3.5 py-2 text-[13px] font-semibold cursor-pointer" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, compName: '', compNit: '', compAddress: '', compPhone: '', compEmail: '', compLegal: '' })); ui.openModal('company'); }}>
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />Nueva empresa
        </button>
      </div>
      {fs.companies.length === 0 ? (<div className="text-center py-16"><div className="text-4xl mb-3">🏢</div><div className="text-sm text-[var(--muted-foreground)]">No hay empresas registradas</div><div className="text-xs text-[var(--af-text3)] mt-1">Crea tu primera empresa para organizar proyectos</div></div>) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fs.companies.map(c => {
          const compProjects = fs.projects.filter(p => p.data.companyId === c.id);
          return (<div key={c.id} className="card-elevated rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-lg">🏢</div>
                <div><div className="text-sm font-semibold">{c.data.name || 'Sin nombre'}</div><div className="text-[10px] text-[var(--muted-foreground)]">NIT: {c.data.nit || 'N/A'}</div></div>
              </div>
              <div className="flex gap-1">
                <button className="skeuo-btn w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--skeuo-pressed)] transition-colors" onClick={() => { ui.setEditingId(c.id); ui.setForms(p => ({ ...p, compName: c.data.name || '', compNit: c.data.nit || '', compAddress: c.data.address || '', compPhone: c.data.phone || '', compEmail: c.data.email || '', compLegal: c.data.legalName || '' })); ui.openModal('company'); }} title="Editar">
                  <Pencil className="w-3 h-3" strokeWidth={2} />
                </button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" onClick={async () => { if (!(await confirm({ title: 'Eliminar empresa', description: '¿Eliminar esta empresa?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('companies').doc(c.id).delete(); ui.showToast('Empresa eliminada'); } catch (err) { console.error('[ArchiFlow]', err); ui.showToast('Error', 'error'); } }} title="Eliminar">
                  <Trash2 className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            </div>
            {c.data.address && <div className="text-[11px] text-[var(--muted-foreground)] mb-1">📍 {c.data.address}</div>}
            {c.data.phone && <div className="text-[11px] text-[var(--muted-foreground)] mb-1">📞 {c.data.phone}</div>}
            {c.data.email && <div className="text-[11px] text-[var(--muted-foreground)] mb-2">✉️ {c.data.email}</div>}
            <div className="pt-3 border-t border-[var(--border)] mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[var(--af-text3)]">{compProjects.length} proyecto{compProjects.length !== 1 ? 's' : ''}</span>
              <span className="skeuo-badge text-[10px] px-2.5 py-0.5 bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20">{compProjects.length > 0 ? 'Activa' : 'Sin proyectos'}</span>
            </div>
          </div>);
        })}
      </div>
      )}
    </div>
  );
}
