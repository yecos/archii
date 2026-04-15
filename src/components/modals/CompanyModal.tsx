'use client';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, ModalFooter } from '@/components/common/FormField';

export default function CompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, editingId, closeModal } = ui;
  const { saveCompany } = fs;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={500} title={editingId ? 'Editar empresa' : 'Nueva empresa'}>

      <div className="space-y-3">
        <FormField label="Nombre comercial" required>
          <FormInput placeholder="Ej: Arquitectura Pérez SAS" value={forms.compName || ''} onChange={e => setForms(p => ({ ...p, compName: e.target.value }))} />
        </FormField>

        <FormField label="Razón legal">
          <FormInput placeholder="Nombre legal completo" value={forms.compLegal || ''} onChange={e => setForms(p => ({ ...p, compLegal: e.target.value }))} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="NIT">
            <FormInput placeholder="900123456-7" value={forms.compNit || ''} onChange={e => setForms(p => ({ ...p, compNit: e.target.value }))} />
          </FormField>
          <FormField label="Teléfono">
            <FormInput placeholder="+57 300 1234567" value={forms.compPhone || ''} onChange={e => setForms(p => ({ ...p, compPhone: e.target.value }))} />
          </FormField>
        </div>

        <FormField label="Correo de contacto">
          <FormInput placeholder="contacto@empresa.com" value={forms.compEmail || ''} onChange={e => setForms(p => ({ ...p, compEmail: e.target.value }))} />
        </FormField>

        <FormField label="Dirección">
          <FormInput placeholder="Dirección de la empresa" value={forms.compAddress || ''} onChange={e => setForms(p => ({ ...p, compAddress: e.target.value }))} />
        </FormField>
      </div>

      <div className="mt-5 pt-4">
        <div className="skeuo-divider -mx-5 sm:-mx-6 mb-4" />
        <div className="flex gap-3 justify-end">
          <button
            className="skeuo-btn px-4 py-2.5 text-[13px] font-medium"
            onClick={() => closeModal('company')}
          >
            Cancelar
          </button>
          <button
            className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={saveCompany}
          >
            {editingId ? 'Guardar cambios' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </CenterModal>
  );
}
