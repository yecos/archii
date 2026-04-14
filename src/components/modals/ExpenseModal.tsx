'use client';
import React from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { EXPENSE_CATS } from '@/lib/types';

export default function ExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, closeModal } = ui;
  const { saveExpense, projects } = fs;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">Registrar gasto</h2>

      <div className="space-y-3">
        <FormField label="Concepto" required>
          <FormInput
            value={forms.expConcept || ''}
            onChange={(e) => setForms(p => ({ ...p, expConcept: e.target.value }))}
            placeholder="Concepto del gasto"
          />
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={forms.expProject || ''}
            onChange={(e) => setForms(p => ({ ...p, expProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="Categoría">
          <FormSelect
            value={forms.expCategory || 'Materiales'}
            onChange={(e) => setForms(p => ({ ...p, expCategory: e.target.value }))}
          >
            {EXPENSE_CATS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Monto COP">
            <FormInput
              type="number"
              value={forms.expAmount || ''}
              onChange={(e) => setForms(p => ({ ...p, expAmount: e.target.value }))}
              placeholder="0"
            />
          </FormField>

          <FormField label="Fecha">
            <FormInput
              type="date"
              value={forms.expDate || ''}
              onChange={(e) => setForms(p => ({ ...p, expDate: e.target.value }))}
            />
          </FormField>
        </div>
      </div>

      <ModalFooter
        onCancel={() => closeModal('expense')}
        onSubmit={saveExpense}
        submitLabel="Registrar"
      />
    </CenterModal>
  );
}
