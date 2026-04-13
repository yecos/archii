'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { ArrowLeftRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
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

export default function InvTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, invProducts, saveInvTransfer, getWarehouseStock, closeModal } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <div className="text-lg font-semibold mb-5 flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5" />
        Nueva transferencia
      </div>

      <div className="mb-3">
        <FormField label="Producto" required>
          <FormSelect value={forms.invTrProduct || ''} onChange={e => setForms(p => ({ ...p, invTrProduct: e.target.value }))}>
            <option value="">Seleccionar producto</option>
            {invProducts.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField label="Desde" required>
          <FormSelect value={forms.invTrFrom || ''} onChange={e => setForms(p => ({ ...p, invTrFrom: e.target.value }))}>
            <option value="">Seleccionar</option>
            {INV_WAREHOUSES.map(w => (
              <option key={w} value={w} disabled={w === forms.invTrTo}>{w}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Hasta" required>
          <FormSelect value={forms.invTrTo || ''} onChange={e => setForms(p => ({ ...p, invTrTo: e.target.value }))}>
            <option value="">Seleccionar</option>
            {INV_WAREHOUSES.map(w => (
              <option key={w} value={w} disabled={w === forms.invTrFrom}>{w}</option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField label="Cantidad" required>
          <FormInput type="number" placeholder="10" min="1" value={forms.invTrQty || ''} onChange={e => setForms(p => ({ ...p, invTrQty: e.target.value }))} />
        </FormField>
        <FormField label="Fecha">
          <FormInput type="date" value={forms.invTrDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invTrDate: e.target.value }))} />
        </FormField>
      </div>

      <FormField label="Notas">
        <FormTextarea rows={2} placeholder="Motivo de la transferencia..." value={forms.invTrNotes || ''} onChange={e => setForms(p => ({ ...p, invTrNotes: e.target.value }))} />
      </FormField>

      {/* Live preview */}
      {forms.invTrProduct && forms.invTrFrom && (() => {
        const prod = invProducts.find(p => p.id === forms.invTrProduct);
        if (!prod) return null;
        const fromStock = getWarehouseStock(prod, forms.invTrFrom);
        const toStock = getWarehouseStock(prod, forms.invTrTo);
        const qty = Number(forms.invTrQty || 0);
        return (
          <div className={`rounded-lg p-3 mt-3 text-sm border space-y-1 ${qty > fromStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Stock en {forms.invTrFrom}:</span>
              <span className="font-medium">{fromStock} → {qty > fromStock ? '❌' : fromStock - qty} {prod.data.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Stock en {forms.invTrTo}:</span>
              <span className="font-medium">{toStock} → {toStock + qty} {prod.data.unit}</span>
            </div>
            {qty > fromStock && (
              <div className="text-red-400 text-xs">⚠ Stock insuficiente en origen</div>
            )}
          </div>
        );
      })()}

      <ModalFooter
        onCancel={() => closeModal('invTransfer')}
        onSubmit={saveInvTransfer}
        submitLabel="Transferir"
        submitColor="bg-blue-600 text-white border-none hover:bg-blue-700"
      />
    </DrawerModal>
  );
}
