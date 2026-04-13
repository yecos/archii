'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormTextarea, ModalFooter } from '@/components/common/FormField';

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

export default function ApprovalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, closeModal, saveApproval } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">Nueva aprobación</h2>

      <div className="space-y-3">
        <FormField label="Título" required>
          <FormInput
            value={forms.appTitle || ''}
            onChange={(e) => setForms(p => ({ ...p, appTitle: e.target.value }))}
            placeholder="Título de la solicitud"
          />
        </FormField>

        <FormField label="Descripción">
          <FormTextarea
            value={forms.appDesc || ''}
            onChange={(e) => setForms(p => ({ ...p, appDesc: e.target.value }))}
            placeholder="Describe lo que necesitas aprobar"
            rows={3}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => closeModal('approval')}
        onSubmit={saveApproval}
        submitLabel="Crear"
      />
    </DrawerModal>
  );
}
