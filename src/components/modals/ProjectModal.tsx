'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useUI, useFirestore } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import CenterModal from '@/components/common/CenterModal';
import {
  ALL_BUILT_IN_TEMPLATES, BLANK_TEMPLATE,
  countTemplateTasks, countTemplatePhases, mergeTemplates,
  type UnifiedTemplate,
} from '@/lib/templates';
import { getFirebase, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';

export default function ProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const { forms, setForms, editingId, closeModal } = ui;
  const { saveProject, companies } = fs;

  // Custom templates from Firestore
  const [customTemplates, setCustomTemplates] = useState<UnifiedTemplate[]>([]);

  // Load custom templates
  useEffect(() => {
    if (!open || editingId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projectTemplates').onSnapshot(
      (snap: QuerySnapshot) => {
        const docs = snapToDocs(snap);
        const parsed = docs.map((d: { id: string; data: Record<string, unknown> }) => ({
          id: d.id,
          name: (d.data.name as string) || 'Sin nombre',
          icon: (d.data.icon as string) || '📄',
          description: (d.data.description as string) || '',
          phases: (d.data.phases as string[]) || [],
          tasks: (d.data.tasks as string[]) || [],
          phasesData: (d.data.phasesData as Array<{ id: string; name: string; tasks: string[] }>) || [],
          isBuiltIn: false,
        })) as UnifiedTemplate[];
        setCustomTemplates(parsed);
      },
      (err: Error) => console.warn('[ArchiFlow] ProjectModal: templates listen error:', err)
    );
    return () => unsub();
  }, [open, editingId]);

  const allTemplates = useMemo(
    () => editingId ? [] : mergeTemplates(customTemplates),
    [customTemplates, editingId]
  );

  // Find selected template for preview
  const selectedTemplate = useMemo(
    () => allTemplates.find(t => t.id === forms.projTemplate),
    [allTemplates, forms.projTemplate]
  );

  const handleTemplateChange = (templateId: string) => {
    const tpl = allTemplates.find(t => t.id === templateId);
    setForms(p => ({
      ...p,
      projTemplate: templateId,
      projDesc: tpl?.description || '',
      projStatus: 'Concepto',
    }));
  };

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={520} title={editingId ? 'Editar proyecto' : 'Nuevo proyecto'}>

      <div className="space-y-3">
        {!editingId && (
          <FormField label="Plantilla">
            <div className="space-y-3">
              {/* Built-in templates */}
              <div className="grid grid-cols-2 gap-2">
                {ALL_BUILT_IN_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`card-elevated flex items-start gap-2 p-2.5 text-left cursor-pointer transition-all ${
                      forms.projTemplate === tpl.id
                        ? 'ring-2 ring-[var(--af-accent)]/40 bg-[var(--af-accent)]/5'
                        : ''
                    }`}
                    onClick={() => handleTemplateChange(tpl.id)}
                  >
                    <span className="text-lg flex-shrink-0">{tpl.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[var(--foreground)] truncate">{tpl.name}</div>
                      <div className="flex gap-2 text-[9px] text-[var(--muted-foreground)] mt-0.5">
                        <span>{countTemplatePhases(tpl)} fases</span>
                        <span>·</span>
                        <span>{countTemplateTasks(tpl)} tareas</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom templates */}
              {customTemplates.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5">
                    Mis Plantillas
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {customTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        className={`card-elevated flex items-start gap-2 p-2.5 text-left cursor-pointer transition-all ${
                          forms.projTemplate === tpl.id
                            ? 'ring-2 ring-[var(--af-accent)]/40 bg-[var(--af-accent)]/5'
                            : ''
                        }`}
                        onClick={() => handleTemplateChange(tpl.id)}
                      >
                        <span className="text-lg flex-shrink-0">{tpl.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-[var(--foreground)] truncate">{tpl.name}</div>
                          <div className="flex gap-2 text-[9px] text-[var(--muted-foreground)] mt-0.5">
                            <span>{countTemplatePhases(tpl)} fases</span>
                            <span>·</span>
                            <span>{countTemplateTasks(tpl)} tareas</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            {companies.map((c: { id: string; data?: { name?: string }; name?: string }) => (
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

        {/* Template preview */}
        {!editingId && selectedTemplate && selectedTemplate.id && (
          <div className="skeuo-well p-3">
            <div className="text-[11px] font-semibold text-[var(--af-accent)] mb-1.5">
              {selectedTemplate.icon} {selectedTemplate.name} creará automáticamente:
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] space-y-0.5">
              <div>📁 {countTemplatePhases(selectedTemplate)} fases de trabajo</div>
              <div>📋 {countTemplateTasks(selectedTemplate)} tareas iniciales</div>
              {selectedTemplate.phasesData?.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]">
                  {selectedTemplate.phasesData.slice(0, 4).map(phase => (
                    <div key={phase.id} className="flex items-center gap-1 mt-0.5">
                      <span className="text-[var(--af-accent)]">▸</span>
                      <span className="font-medium">{phase.name}</span>
                      <span className="text-[var(--skeuo-text-secondary)]">({phase.tasks.length} tareas)</span>
                    </div>
                  ))}
                  {selectedTemplate.phasesData.length > 4 && (
                    <div className="text-[var(--skeuo-text-secondary)] mt-0.5">
                      +{selectedTemplate.phasesData.length - 4} fases más...
                    </div>
                  )}
                </div>
              )}
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
