'use client';
import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { fmtCOP } from '@/lib/helpers';
import { INV_WAREHOUSES } from '@/lib/types';
import type { InvProduct, InvCategory } from '@/lib/types';

interface InvProductsTabProps {
  invProducts: InvProduct[];
  invCategories: InvCategory[];
  invSearch: string;
  invFilterCat: string;
  setInvSearch: (v: string) => void;
  setInvFilterCat: (v: string) => void;
  getTotalStock: (product: InvProduct) => number;
  getWarehouseStock: (product: InvProduct, warehouse: string) => number;
  getInvCategoryColor: (categoryId: string) => string;
  getInvCategoryName: (categoryId: string) => string;
  openEditInvProduct: (product: InvProduct) => void;
  deleteInvProduct: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setForms: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  openModal: (modal: string) => void;
}

export default function InvProductsTab({
  invProducts, invCategories, invSearch, invFilterCat, setInvSearch, setInvFilterCat,
  getTotalStock, getWarehouseStock, getInvCategoryColor, getInvCategoryName,
  openEditInvProduct, deleteInvProduct, setEditingId, setForms, openModal,
}: InvProductsTabProps) {
  const [productLimit, setProductLimit] = useState(20);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-1.5"><Package size={18} className="text-[var(--af-accent)]" /> Productos ({invProducts.length})</h3>
        <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); const rf: Record<string,any> = { invProdName: '', invProdSku: '', invProdCat: '', invProdUnit: 'Unidad', invProdPrice: '', invProdMinStock: '5', invProdDesc: '', invProdImage: '', invProdWarehouse: 'Almacén Principal' }; INV_WAREHOUSES.forEach(w => { rf[`invProdWS_${w.replace(/\s/g,'_')}`] = '0'; }); setForms(p => ({ ...p, ...rf })); openModal('invProduct'); }}>
          <Plus className="w-4 h-4" strokeWidth={2} />
          Nuevo producto
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Buscar producto..." value={invSearch} onChange={e => setInvSearch(e.target.value)} />
        </div>
        <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={invFilterCat} onChange={e => setInvFilterCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {invCategories.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}
        </select>
      </div>
      {(() => {
        const filtered = invProducts.filter(p => {
          const ms = !invSearch || p.data.name.toLowerCase().includes(invSearch.toLowerCase()) || (p.data.sku || '').toLowerCase().includes(invSearch.toLowerCase());
          const mc = invFilterCat === 'all' || p.data.categoryId === invFilterCat;
          return ms && mc;
        });
        return filtered.length === 0 ? (
          <div className="text-center py-12"><div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3"><Package size={28} className="text-[var(--af-text3)]" /></div><div className="text-[var(--muted-foreground)]">No hay productos</div></div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, productLimit).map(p => {
            const totalSt = getTotalStock(p);
            const isLow = totalSt <= (Number(p.data.minStock) || 0);
            const isOut = totalSt === 0;
            return (
              <div key={p.id} className={`bg-[var(--af-bg3)] rounded-xl p-3 sm:p-4 border ${isOut ? 'border-red-500/40' : isLow ? 'border-amber-500/30' : 'border-[var(--border)]'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    {p.data.imageData ? <img src={p.data.imageData} alt={p.data.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5" loading="lazy" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: (getInvCategoryColor(p.data.categoryId) || '#6b7280') + '20' }}><div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getInvCategoryColor(p.data.categoryId) }} /></div>}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{p.data.name}</span>
                        {p.data.sku && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--muted-foreground)]">{p.data.sku}</span>}
                        {isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">AGOTADO</span>}
                        {isLow && !isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 flex items-center gap-0.5"><AlertTriangle size={10} /> Bajo</span>}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{getInvCategoryName(p.data.categoryId)} · {p.data.unit}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="w-8 h-8 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer" onClick={() => openEditInvProduct(p)}><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {/* Per-warehouse stock breakdown */}
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {INV_WAREHOUSES.map(wh => {
                      const ws = getWarehouseStock(p, wh);
                      return (
                        <div key={wh} className="text-center">
                          <div className="text-[10px] text-[var(--muted-foreground)] truncate">{wh}</div>
                          <div className={`text-sm font-bold ${ws === 0 ? 'text-red-400' : ws <= (Number(p.data.minStock) || 0) ? 'text-amber-400' : 'text-[var(--foreground)]'}`}>{ws}</div>
                        </div>
                      );
                    })}
                    <div className="text-center">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Total</div>
                      <div className="text-sm font-bold text-[var(--af-accent)]">{totalSt}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><div className="text-[10px] text-[var(--muted-foreground)]">Precio unit.</div><div className="text-sm font-medium">{fmtCOP(Number(p.data.price) || 0)}</div></div>
                  <div><div className="text-[10px] text-[var(--muted-foreground)]">Valor total</div><div className="text-sm font-medium">{fmtCOP((Number(p.data.price) || 0) * totalSt)}</div></div>
                </div>
              </div>
            );
          })}
          {filtered.length > productLimit && (
            <div className="text-center py-4">
              <button className="px-5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer bg-[var(--af-bg3)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--af-accent)]/30 transition-colors" onClick={() => setProductLimit(prev => prev + 20)}>
                Cargar más productos
              </button>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
