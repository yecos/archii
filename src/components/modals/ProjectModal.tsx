'use client';
import React from 'react';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import CenterModal from '@/components/common/CenterModal';

export default function ProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, editingId, closeModal } = ui;
  const { saveProject, companies } = fs;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480} title={editingId ? 'Editar proyecto' : 'Nuevo proyecto'}>

      <div className="space-y-3">
        <FormField label="Nombre" required>
          <FormInput
            value={forms.projName || ''}
            onChange={(e) => setForms(p => ({ ...p, projName: e.target.value }))}
            placeholder="Nombre del proyecto"
          />
        </FormField>

        <FormField label="Estado">
          <FormSelect
            value={forms.projStatus || 'Concepto'}
            onChange={(e) => setForms(p => ({ ...p, projStatus: e.target.value }))}
          >
            <option value="Concepto">Concepto</option>
            <option value="Diseno">Diseño</option>
            <option value="Ejecucion">Ejecución</option>
            <option value="Terminado">Terminado</option>
          </FormSelect>
        </FormField>

        <FormField label="Cliente">
          <FormInput
            value={forms.projClient || ''}
            onChange={(e) => setForms(p => ({ ...p, projClient: e.target.value }))}
            placeholder="Nombre del cliente"
          />
        </FormField>

        <FormField label="Ubicación">
          <FormInput
            value={forms.projLocation || ''}
            onChange={(e) => setForms(p => ({ ...p, projLocation: e.target.value }))}
            placeholder="Ubicación del proyecto"
          />
        </FormField>

        <FormField label="Empresa">
          <FormSelect
            value={forms.projCompany || ''}
            onChange={(e) => setForms(p => ({ ...p, projCompany: e.target.value }))}
          >
            <option value="">— Sin empresa —</option>
            {companies.map((c: any) => (
              <option key={c.id} value={c.id}>{c.data?.name || c.name}</option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="Presupuesto COP">
          <FormInput
            type="number"
            value={forms.projBudget || ''}
            onChange={(e) => setForms(p => ({ ...p, projBudget: e.target.value }))}
            placeholder="0"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha inicio">
            <FormInput
              type="date"
              value={forms.projStart || ''}
              onChange={(e) => setForms(p => ({ ...p, projStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Fecha entrega">
            <FormInput
              type="date"
              value={forms.projEnd || ''}
              onChange={(e) => setForms(p => ({ ...p, projEnd: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Descripción">
          <FormTextarea
            value={forms.projDesc || ''}
            onChange={(e) => setForms(p => ({ ...p, projDesc: e.target.value }))}
            placeholder="Descripción del proyecto"
            rows={3}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => closeModal('project')}
        onSubmit={saveProject}
        submitLabel={editingId ? 'Actualizar' : 'Crear proyecto'}
      />
    </CenterModal>
  );
}
