'use client';
import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Building2, FolderKanban, Users, Mail, Phone, MapPin } from 'lucide-react';
import { confirm } from '@/hooks/useConfirmDialog';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { fmtCOP } from '@/lib/helpers';
import { getFirebase } from '@/lib/firebase-service';

export default function CompaniesScreen() {
  const ui = useUI();
  const fs = useFirestore();
  const auth = useAuth();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return fs.companies;
    const q = search.toLowerCase();
    return fs.companies.filter(c =>
      (c.data.name || '').toLowerCase().includes(q) ||
      (c.data.nit || '').toLowerCase().includes(q) ||
      (c.data.email || '').toLowerCase().includes(q) ||
      (c.data.legalName || '').toLowerCase().includes(q)
    );
  }, [fs.companies, search]);

  const stats = useMemo(() => {
    const totalProjects = fs.companies.reduce((s, c) => s + fs.projects.filter(p => p.data.companyId === c.id).length, 0);
    const activeCompanies = fs.companies.filter(c => fs.projects.some(p => p.data.companyId === c.id && p.data.status !== 'Completado' && p.data.status !== 'Cancelado')).length;
    const totalBudget = fs.companies.reduce((s, c) => {
      return s + fs.projects.filter(p => p.data.companyId === c.id).reduce((ps, p) => ps + (p.data.budget || 0), 0);
    }, 0);
    return { totalProjects, activeCompanies, totalBudget };
  }, [fs.companies, fs.projects]);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { val: fs.companies.length, lbl: 'Empresas', icon: <Building2 size={16} />, bg: 'bg-[var(--af-accent)]/10', iconColor: 'text-[var(--af-accent)]' },
          { val: stats.activeCompanies, lbl: 'Activas', icon: <FolderKanban size={16} />, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
          { val: stats.totalProjects, lbl: 'Proyectos', icon: <FolderKanban size={16} />, bg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
          { val: fmtCOP(stats.totalBudget), lbl: 'Presupuesto total', icon: <Building2 size={16} />, bg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
        ].map((m, i) => (
          <div key={i} className="card-elevated rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center ${m.iconColor}`}>{m.icon}</div>
            </div>
            <div className="text-lg font-bold">{m.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            className="w-full skeuo-input pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none"
            placeholder="Buscar por nombre, NIT, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {search && (
            <span className="text-[11px] text-[var(--af-text3)]">
              {filtered.length} de {fs.companies.length}
            </span>
          )}
          <button className="flex items-center gap-1.5 skeuo-btn bg-[var(--af-accent)] text-background px-3.5 py-2 text-[13px] font-semibold cursor-pointer" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, compName: '', compNit: '', compAddress: '', compPhone: '', compEmail: '', compLegal: '' })); ui.openModal('company'); }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />Nueva empresa
          </button>
        </div>
      </div>

      {/* Company List */}
      {fs.companies.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-4 text-3xl">🏢</div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">No hay empresas registradas</div>
          <div className="text-[13px] text-[var(--af-text3)] mb-4">Crea tu primera empresa para organizar proyectos por compañía</div>
          <button className="skeuo-btn bg-[var(--af-accent)] text-background px-4 py-2 text-[13px] font-semibold cursor-pointer" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, compName: '', compNit: '', compAddress: '', compPhone: '', compEmail: '', compLegal: '' })); ui.openModal('company'); }}>
            <Plus className="w-3.5 h-3.5 inline mr-1" strokeWidth={2.5} />Crear empresa
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--af-text3)]">
          <Search size={24} className="mx-auto mb-2 opacity-50" />
          <div className="text-sm">Sin resultados para &quot;{search}&quot;</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const compProjects = fs.projects.filter(p => p.data.companyId === c.id);
            const activeProjects = compProjects.filter(p => p.data.status !== 'Completado' && p.data.status !== 'Cancelado');
            const compBudget = compProjects.reduce((s, p) => s + (p.data.budget || 0), 0);
            const compSpent = fs.expenses.filter(e => compProjects.some(p => p.id === e.data.projectId)).reduce((s, e) => s + (Number(e.data.amount) || 0), 0);
            return (
              <div key={c.id} className="card-elevated rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-lg">🏢</div>
                    <div>
                      <div className="text-sm font-semibold">{c.data.name || 'Sin nombre'}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">NIT: {c.data.nit || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="skeuo-btn w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--skeuo-pressed)] transition-colors" onClick={() => { ui.setEditingId(c.id); ui.setForms(p => ({ ...p, compName: c.data.name || '', compNit: c.data.nit || '', compAddress: c.data.address || '', compPhone: c.data.phone || '', compEmail: c.data.email || '', compLegal: c.data.legalName || '' })); ui.openModal('company'); }} title="Editar">
                      <Pencil className="w-3 h-3" strokeWidth={2} />
                    </button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" onClick={async () => { if (!(await confirm({ title: 'Eliminar empresa', description: `¿Eliminar "${c.data.name}" y todos sus datos asociados?`, confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('companies').doc(c.id).delete(); ui.showToast('Empresa eliminada'); } catch (err) { console.error('[ArchiFlow] Companies: delete company failed:', err); ui.showToast('Error', 'error'); } }} title="Eliminar">
                      <Trash2 className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="text-[11px] text-[var(--muted-foreground)] space-y-1 mb-3">
                  {c.data.email && <div className="flex items-center gap-1.5 truncate"><Mail size={11} className="flex-shrink-0" />{c.data.email}</div>}
                  {c.data.phone && <div className="flex items-center gap-1.5 truncate"><Phone size={11} className="flex-shrink-0" />{c.data.phone}</div>}
                  {c.data.address && <div className="flex items-center gap-1.5 truncate"><MapPin size={11} className="flex-shrink-0" />{c.data.address}</div>}
                </div>

                {/* Stats */}
                <div className="skeuo-well rounded-lg p-2.5 mb-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[13px] font-bold text-[var(--af-accent)]">{compProjects.length}</div>
                      <div className="text-[9px] text-[var(--muted-foreground)]">Proyectos</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-emerald-400">{activeProjects.length}</div>
                      <div className="text-[9px] text-[var(--muted-foreground)]">Activos</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-blue-400">{fmtCOP(compBudget)}</div>
                      <div className="text-[9px] text-[var(--muted-foreground)]">Presup.</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-[var(--skeuo-edge-light)] flex items-center justify-between">
                  <span className="skeuo-badge text-[10px] px-2.5 py-0.5 bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20">
                    {compProjects.length > 0 ? `${activeProjects.length} activo${activeProjects.length !== 1 ? 's' : ''}` : 'Sin proyectos'}
                  </span>
                  {compBudget > 0 && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {Math.round(compSpent / compBudget * 100)}% ejecutado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
