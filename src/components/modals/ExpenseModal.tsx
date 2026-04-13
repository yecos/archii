'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { EXPENSE_CATS } from '@/lib/types';

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

export default function ExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, closeModal, saveExpense, projects } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
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
    </DrawerModal>
  );
}
