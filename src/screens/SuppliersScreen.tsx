'use client';
import React, { useMemo, useState } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Globe, Star } from 'lucide-react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { SUPPLIER_CATS } from '@/lib/types';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerContainer';

export default function SuppliersScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = useMemo(() => {
    let list = fs.suppliers;
    if (filterCat !== 'all') list = list.filter(s => s.data.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.data.name || '').toLowerCase().includes(q) ||
        (s.data.email || '').toLowerCase().includes(q) ||
        (s.data.phone || '').toLowerCase().includes(q) ||
        (s.data.notes || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [fs.suppliers, search, filterCat]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: fs.suppliers.length };
    fs.suppliers.forEach(s => {
      const cat = s.data.category || 'Otro';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [fs.suppliers]);

  const avgRating = useMemo(() => {
    return fs.suppliers.length > 0 ? fs.suppliers.reduce((s, sup) => s + (sup.data.rating || 0), 0) / fs.suppliers.length : 0;
  }, [fs.suppliers]);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { val: fs.suppliers.length, lbl: 'Proveedores', icon: '🏪', bg: 'bg-[var(--af-accent)]/10' },
          { val: Object.keys(categoryCounts).length - 1, lbl: 'Categorías', icon: '📦', bg: 'bg-blue-500/10' },
          { val: avgRating > 0 ? `${avgRating} ★` : 'N/A', lbl: 'Calificación prom.', icon: '⭐', bg: 'bg-amber-500/10' },
          { val: SUPPLIER_CATS.length, lbl: 'Categorías disponibles', icon: '📋', bg: 'bg-emerald-500/10' },
        ].map((m, i) => (
          <div key={i} className="card-elevated rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-2 text-base`}>{m.icon}</div>
            <div className="text-lg font-bold">{m.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              className="w-full skeuo-input pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 skeuo-well rounded-xl p-0.5 overflow-x-auto scrollbar-none">
            {['all', ...SUPPLIER_CATS].map(cat => (
              <button
                key={cat}
                className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all whitespace-nowrap ${filterCat === cat ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                onClick={() => setFilterCat(cat)}
              >
                {cat === 'all' ? 'Todos' : cat}
                {categoryCounts[cat] !== undefined && (
                  <span className="ml-1 text-[9px] opacity-60">{categoryCounts[cat]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-1.5 skeuo-btn bg-[var(--af-accent)] text-background px-3.5 py-2 text-[13px] font-semibold cursor-pointer flex-shrink-0" onClick={() => { ui.setEditingId(null); ui.openModal('supplier'); }}>
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />Nuevo proveedor
        </button>
      </div>

      {/* Supplier Grid */}
      {fs.suppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-4 text-3xl">🏪</div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proveedores</div>
          <div className="text-[13px] text-[var(--af-text3)] mb-4">Agrega tu primer proveedor para gestionar contactos de materiales y servicios</div>
          <button className="skeuo-btn bg-[var(--af-accent)] text-background px-4 py-2 text-[13px] font-semibold cursor-pointer" onClick={() => { ui.setEditingId(null); ui.openModal('supplier'); }}>
            <Plus className="w-3.5 h-3.5 inline mr-1" strokeWidth={2.5} />Agregar proveedor
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--af-text3)]">
          <Search size={24} className="mx-auto mb-2 opacity-50" />
          <div className="text-sm">Sin resultados para &quot;{search}&quot;</div>
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <StaggerItem key={s.id}>
              <div className="card-elevated rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 skeuo-well rounded-lg flex items-center justify-center text-lg">🏪</div>
                    <div>
                      <div className="text-sm font-semibold">{s.data.name}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{s.data.category}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="skeuo-btn w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--skeuo-pressed)] transition-colors" onClick={() => { ui.setEditingId(s.id); ui.setForms(p => ({ ...p, supName: s.data.name, supCategory: s.data.category, supPhone: s.data.phone, supEmail: s.data.email, supAddress: s.data.address, supWebsite: s.data.website, supNotes: s.data.notes, supRating: String(s.data.rating) })); ui.openModal('supplier'); }} title="Editar">
                      ✏️
                    </button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" onClick={() => fs.deleteSupplier(s.id)} title="Eliminar">
                      🗑
                    </button>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={13}
                      className={star <= (s.data.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-[var(--af-bg4)]'}
                    />
                  ))}
                  <span className="text-[10px] text-[var(--muted-foreground)] ml-1">{s.data.rating || 0}.0</span>
                </div>

                {/* Contact info */}
                <div className="text-[11px] text-[var(--muted-foreground)] space-y-1.5">
                  {s.data.phone && <div className="flex items-center gap-1.5 truncate"><Phone size={11} className="flex-shrink-0 text-[var(--af-accent)]" />{s.data.phone}</div>}
                  {s.data.email && <div className="flex items-center gap-1.5 truncate"><Mail size={11} className="flex-shrink-0 text-[var(--af-accent)]" />{s.data.email}</div>}
                  {s.data.address && <div className="flex items-center gap-1.5 truncate"><MapPin size={11} className="flex-shrink-0 text-[var(--af-accent)]" />{s.data.address}</div>}
                  {s.data.website && <div className="flex items-center gap-1.5 truncate"><Globe size={11} className="flex-shrink-0 text-[var(--af-accent)]" />{s.data.website}</div>}
                </div>

                {s.data.notes && (
                  <div className="mt-3 pt-3 border-t border-[var(--skeuo-edge-light)]">
                    <div className="text-[10px] text-[var(--af-text3)] leading-relaxed line-clamp-2">{s.data.notes}</div>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
