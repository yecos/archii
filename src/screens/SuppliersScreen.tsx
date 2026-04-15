'use client';
import React from 'react';
import { Plus } from 'lucide-react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerContainer';

export default function SuppliersScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-[var(--muted-foreground)]">{fs.suppliers.length} proveedores</div>
        <button className="flex items-center gap-1.5 skeuo-btn bg-[var(--af-accent)] text-background px-3.5 py-2 text-[13px] font-semibold cursor-pointer" onClick={() => { ui.setEditingId(null); ui.openModal('supplier'); }}>
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />Nuevo proveedor
        </button>
      </div>
      {auth.loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {!auth.loading && fs.suppliers.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">🏪</div><div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proveedores</div><div className="text-[13px]">Agrega tu primer proveedor</div></div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fs.suppliers.map(s => (
            <StaggerItem key={s.id}><div className="card-elevated rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-11 h-11 skeuo-well rounded-lg flex items-center justify-center text-lg">🏪</div>
                <div className="flex gap-1.5">
                  <button className="px-1.5 py-0.5 rounded bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] text-xs cursor-pointer hover:bg-[var(--skeuo-pressed)] transition-colors" onClick={() => { ui.setEditingId(s.id); ui.setForms(p => ({ ...p, supName: s.data.name, supCategory: s.data.category, supPhone: s.data.phone, supEmail: s.data.email, supAddress: s.data.address, supWebsite: s.data.website, supNotes: s.data.notes, supRating: String(s.data.rating) })); ui.openModal('supplier'); }}>✏️</button>
                  <button className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 shadow-[var(--skeuo-shadow-raised-sm)] text-xs cursor-pointer hover:bg-red-500/20 transition-colors" onClick={() => fs.deleteSupplier(s.id)}>🗑</button>
                </div>
              </div>
              <div className="text-sm font-semibold mb-0.5">{s.data.name}</div>
              <div className="text-[11px] text-[var(--af-text3)] mb-2">{s.data.category}</div>
              <div className="text-[11px] text-[var(--af-accent)] mb-2">{'★'.repeat(s.data.rating || 5)}{'☆'.repeat(5 - (s.data.rating || 5))}</div>
              <div className="text-xs text-[var(--muted-foreground)] space-y-0.5">
                {s.data.phone && <div className="truncate">📞 {s.data.phone}</div>}
                {s.data.email && <div className="truncate">✉️ {s.data.email}</div>}
                {s.data.address && <div className="truncate">📍 {s.data.address}</div>}
                {s.data.website && <div className="truncate">🌐 {s.data.website}</div>}
              </div>
            </div></StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
