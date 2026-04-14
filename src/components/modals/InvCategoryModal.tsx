'use client';
import React from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useInventory } from '@/hooks/useDomain';
import { FormField, FormInput, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { CAT_COLORS } from '@/lib/types';

export default function InvCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const inv = useInventory();
  const { forms, setForms, editingId, closeModal } = ui;
  const { invCategories, saveInvCategory } = inv;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={420}>
      <div className="text-lg font-semibold mb-5">
        {editingId ? 'Editar categoría' : '🏷️ Nueva categoría'}
      </div>

      <FormField label="Nombre" required>
        <FormInput placeholder="Ej: Materiales" value={forms.invCatName || ''} onChange={e => setForms(p => ({ ...p, invCatName: e.target.value }))} />
      </FormField>

      <div className="mb-3">
        <FormField label="Color">
          <div className="flex flex-wrap gap-2">
            {CAT_COLORS.map(color => (
              <button
                key={color}
                className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${forms.invCatColor === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                onClick={() => setForms(p => ({ ...p, invCatColor: color }))}
              />
            ))}
          </div>
        </FormField>
      </div>

      <FormField label="Descripción">
        <FormTextarea rows={2} placeholder="Descripción..." value={forms.invCatDesc || ''} onChange={e => setForms(p => ({ ...p, invCatDesc: e.target.value }))} />
      </FormField>

      <ModalFooter onCancel={() => closeModal('invCategory')} onSubmit={saveInvCategory} submitLabel={editingId ? 'Guardar' : 'Crear categoría'} />
    </CenterModal>
  );
}
