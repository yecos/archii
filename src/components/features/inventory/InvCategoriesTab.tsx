'use client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { InvProduct, InvCategory } from '@/lib/types';

interface InvCategoriesTabProps {
  invCategories: InvCategory[];
  invProducts: InvProduct[];
  openEditInvCategory: (category: InvCategory) => void;
  deleteInvCategory: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setForms: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  openModal: (modal: string) => void;
}

export default function InvCategoriesTab({
  invCategories, invProducts, openEditInvCategory, deleteInvCategory,
  setEditingId, setForms, openModal,
}: InvCategoriesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🏷️ Categorías ({invCategories.length})</h3>
        <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' })); openModal('invCategory'); }}><Plus className="w-4 h-4" strokeWidth={2} />Nueva categoría</button>
      </div>
      {invCategories.length === 0 ? (<div className="text-center py-12"><div className="w-14 h-14 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-3"><div className="text-2xl">🏷️</div></div><div className="text-[var(--muted-foreground)] text-sm">Aún no hay categorías</div><div className="text-[11px] text-[var(--muted-foreground)] mt-1">Crea categorías para organizar tus productos por tipo</div></div>) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {invCategories.map(c => {
            const count = invProducts.filter(p => p.data.categoryId === c.id).length;
            return (
              <div key={c.id} className="skeuo-panel rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (c.data.color || '#6b7280') + '20' }}><div className="w-5 h-5 rounded" style={{ backgroundColor: c.data.color }} /></div>
                    <div><div className="text-sm font-semibold">{c.data.name}</div><div className="text-xs text-[var(--muted-foreground)]">{count} producto{count !== 1 ? 's' : ''}</div>{c.data.description && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{c.data.description}</div>}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-8 h-8 rounded-lg card-elevated flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer" onClick={() => openEditInvCategory(c)}><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvCategory(c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
