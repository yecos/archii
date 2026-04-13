'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { CAT_COLORS } from '@/lib/types';

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

export default function InvCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, invCategories, editingId, saveInvCategory, closeModal } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={420}>
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
    </DrawerModal>
  );
}
