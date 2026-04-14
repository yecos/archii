'use client';
import React from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useInventory } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { INV_WAREHOUSES } from '@/lib/types';

export default function InvTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const inv = useInventory();
  const { forms, setForms, closeModal } = ui;
  const { invProducts, saveInvTransfer, getWarehouseStock } = inv;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480} title="Nueva transferencia">

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
    </CenterModal>
  );
}
