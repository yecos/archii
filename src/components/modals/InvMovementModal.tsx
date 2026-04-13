'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, ModalFooter } from '@/components/common/FormField';
import { INV_WAREHOUSES } from '@/lib/types';

const DrawerModal = ({ open, onClose, children, maxWidth = 480 }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number }) => (
  <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }} handleOnly={false} dismissible={true}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
      <Drawer.Content className="bg-[var(--card)] border-t border-[var(--border)] rounded-t-2xl mx-auto z-[101] flex flex-col max-h-[85dvh] sm:max-h-[85vh]" style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined, width: '95vw' }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <Drawer.Handle className="w-10 h-[5px] rounded-full bg-[var(--muted-foreground)]/20 active:bg-[var(--muted-foreground)]/40 transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

export default function InvMovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, invProducts, saveInvMovement, getWarehouseStock, getTotalStock, closeModal } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <div className="text-lg font-semibold mb-5 flex items-center gap-2">
        <ClipboardList className="w-5 h-5" />
        Registrar movimiento
      </div>

      {/* Tipo toggle */}
      <div className="mb-3">
        <FormField label="Tipo" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Entrada' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`}
              onClick={() => setForms(p => ({ ...p, invMovType: 'Entrada' }))}
            >
              ↓ Entrada
            </button>
            <button
              className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Salida' ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`}
              onClick={() => setForms(p => ({ ...p, invMovType: 'Salida' }))}
            >
              ↑ Salida
            </button>
          </div>
        </FormField>
      </div>

      {/* Producto */}
      <div className="mb-3">
        <FormField label="Producto" required>
          <FormSelect value={forms.invMovProduct || ''} onChange={e => setForms(p => ({ ...p, invMovProduct: e.target.value }))}>
            <option value="">Seleccionar producto</option>
            {invProducts.map(p => (
              <option key={p.id} value={p.id}>{p.data.name} (Total: {getTotalStock(p)})</option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField label="Almacén" required>
          <FormSelect value={forms.invMovWarehouse || 'Almacén Principal'} onChange={e => setForms(p => ({ ...p, invMovWarehouse: e.target.value }))}>
            {INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Cantidad" required>
          <FormInput type="number" placeholder="10" min="1" value={forms.invMovQty || ''} onChange={e => setForms(p => ({ ...p, invMovQty: e.target.value }))} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField label="Fecha">
          <FormInput type="date" value={forms.invMovDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invMovDate: e.target.value }))} />
        </FormField>
        <FormField label="Referencia">
          <FormInput placeholder="Factura #..." value={forms.invMovRef || ''} onChange={e => setForms(p => ({ ...p, invMovRef: e.target.value }))} />
        </FormField>
      </div>

      <FormField label="Motivo">
        <FormInput placeholder="Compra proveedor, Uso en obra..." value={forms.invMovReason || ''} onChange={e => setForms(p => ({ ...p, invMovReason: e.target.value }))} />
      </FormField>

      {/* Stock preview */}
      {forms.invMovProduct && (() => {
        const prod = invProducts.find(p => p.id === forms.invMovProduct);
        if (!prod) return null;
        const wh = forms.invMovWarehouse || 'Almacén Principal';
        const curStock = getWarehouseStock(prod, wh);
        const qty = Number(forms.invMovQty || 0);
        return (
          <div className={`rounded-lg p-3 mt-3 text-sm border ${forms.invMovType === 'Salida' && qty > curStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Stock en {wh}:</span>
              <span className="font-medium">{curStock} {prod.data.unit}</span>
            </div>
            {qty > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-[var(--muted-foreground)]">Después:</span>
                <span className={`font-bold ${forms.invMovType === 'Salida' && qty > curStock ? 'text-red-400' : 'text-[var(--foreground)]'}`}>
                  {forms.invMovType === 'Entrada' ? curStock + qty : Math.max(0, curStock - qty)} {prod.data.unit}
                </span>
              </div>
            )}
            {forms.invMovType === 'Salida' && qty > curStock && (
              <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
                <AlertTriangle className="w-3 h-3" />
                Excede stock disponible en {wh}
              </div>
            )}
          </div>
        );
      })()}

      <ModalFooter
        onCancel={() => closeModal('invMovement')}
        onSubmit={saveInvMovement}
        submitLabel="Registrar"
        submitColor="bg-emerald-600 text-white border-none hover:bg-emerald-700"
      />
    </DrawerModal>
  );
}
