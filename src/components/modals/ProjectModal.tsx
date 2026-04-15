'use client';
import React from 'react';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import CenterModal from '@/components/common/CenterModal';
import type { ProjectTemplate } from '@/lib/types';

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: '', name: 'Proyecto en blanco', icon: '📝', description: '', phases: [], tasks: [] },
  { id: 'residencial', name: 'Residencial Nuevo', icon: '🏠', description: 'Proyecto de construcción residencial desde cero.', phases: ['Prediseño', 'Anteproyecto', 'Licencias', 'Construcción', 'Acabados', 'Entrega'], tasks: ['Levantamiento topográfico', 'Estudio de suelos', 'Diseño arquitectónico', 'Licencia de construcción', 'Ajuste de diseño', 'Obra negra', 'Obra blanca', 'Instalaciones', 'Acabados', 'Paisajismo'] },
  { id: 'remodelacion', name: 'Remodelación', icon: '🔨', description: 'Remodelación de espacio existente.', phases: ['Diagnóstico', 'Diseño', 'Presupuesto', 'Obra', 'Entrega'], tasks: ['Inspección del espacio', 'Levantamiento planimétrico', 'Diseño de remodelación', 'Aprobación del cliente', 'Demoliciones', 'Construcción', 'Acabados', 'Limpieza y entrega'] },
  { id: 'interiorismo', name: 'Interiorismo', icon: '🎨', description: 'Diseño y ejecución de interiores.', phases: ['Concepto', 'Diseño', 'Muebles', 'Obra', 'Decoración'], tasks: ['Brief del cliente', 'Moodboard y paleta', 'Planos de mobiliario', 'Selección de materiales', 'Cotización', 'Fabricación de muebles', 'Instalación', 'Styling final'] },
  { id: 'consultoria', name: 'Consultoría', icon: '📋', description: 'Asesoría técnica o de diseño.', phases: ['Diagnóstico', 'Propuesta', 'Seguimiento', 'Entrega'], tasks: ['Solicitud del cliente', 'Visita técnica', 'Informe de diagnóstico', 'Propuesta de consultoría', 'Reunión de presentación', 'Seguimiento', 'Entrega de informe final'] },
];

export { PROJECT_TEMPLATES };

export default function ProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, editingId, closeModal } = ui;
  const { saveProject, companies } = fs;

  const handleTemplateChange = (templateId: string) => {
    const tpl = PROJECT_TEMPLATES.find(t => t.id === templateId);
    setForms(p => ({
      ...p,
      projTemplate: templateId,
      projDesc: tpl?.description || '',
      projStatus: 'Concepto',
    }));
  };

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480} title={editingId ? 'Editar proyecto' : 'Nuevo proyecto'}>

      <div className="space-y-3">
        {!editingId && (
          <FormField label="Plantilla">
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`card-elevated flex items-start gap-2 p-2.5 text-left cursor-pointer ${forms.projTemplate === tpl.id ? 'ring-2 ring-[var(--af-accent)]/40 bg-[var(--af-accent)]/5' : ''}`}
                  onClick={() => handleTemplateChange(tpl.id)}
                >
                  <span className="text-lg flex-shrink-0">{tpl.icon}</span>
                  <div>
                    <div className="text-[12px] font-medium text-[var(--foreground)]">{tpl.name}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{tpl.description || 'Sin descripción'}</div>
                  </div>
                </button>
              ))}
            </div>
          </FormField>
        )}

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

        {!editingId && forms.projTemplate && (
          <div className="skeuo-well p-3">
            <div className="text-[11px] font-semibold text-[var(--af-accent)] mb-1.5">La plantilla creará automáticamente:</div>
            <div className="text-[10px] text-[var(--muted-foreground)] space-y-0.5">
              {(() => {
                const tpl = PROJECT_TEMPLATES.find(t => t.id === forms.projTemplate);
                if (!tpl) return null;
                return (
                  <>
                    <div>📁 {tpl.phases.length} fases de trabajo</div>
                    <div>📋 {tpl.tasks.length} tareas iniciales</div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <ModalFooter
        onCancel={() => closeModal('project')}
        onSubmit={saveProject}
        submitLabel={editingId ? 'Actualizar' : 'Crear proyecto'}
      />
    </CenterModal>
  );
}
