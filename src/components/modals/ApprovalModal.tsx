'use client';
import React from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, FormTextarea, ModalFooter } from '@/components/common/FormField';

export default function ApprovalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, closeModal } = ui;
  const { saveApproval } = fs;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480}>
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
    </CenterModal>
  );
}
