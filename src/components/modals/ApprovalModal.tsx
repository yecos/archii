'use client';
import React, { useMemo } from 'react';
import CenterModal from '@/components/common/CenterModal';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { useUI, useFirestore, useAuth } from '@/hooks/useDomain';
import { APPROVAL_TYPE_LABELS, APPROVAL_TYPE_ICONS } from '@/lib/types';
import type { ApprovalType, Approval, Project } from '@/lib/types';
import { fmtCOP } from '@/lib/helpers';

const APPROVAL_TYPES: { value: ApprovalType; label: string; icon: string }[] = [
  { value: 'budget_change', label: 'Cambio presupuestario', icon: '💰' },
  { value: 'phase_completion', label: 'Completar fase', icon: '🏗️' },
  { value: 'expense_approval', label: 'Aprobar gasto', icon: '🧾' },
  { value: 'general', label: 'General', icon: '📋' },
];

export default function ApprovalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const auth = useAuth();
  const { forms, setForms, closeModal, selectedProjectId } = ui;
  const { saveApproval, createApproval, approveApproval, rejectApproval } = fs;

  const appType = (forms.appType || 'general') as ApprovalType;
  const showAmount = appType === 'budget_change' || appType === 'expense_approval';

  // If there's a reviewing approval (from admin or detail), show review section
  const reviewApproval = (forms.reviewingApproval ?? null) as Approval | null;

  const handleSubmit = async () => {
    await createApproval({
      type: appType,
      projectId: forms.appProject || selectedProjectId || undefined,
      amount: showAmount ? (Number(forms.appAmount) || undefined) : undefined,
    });
  };

  const handleApprove = async () => {
    if (reviewApproval?.id) {
      await approveApproval(reviewApproval.id, forms.reviewComment);
      setForms(p => ({ ...p, reviewingApproval: null, reviewComment: '' }));
    }
  };

  const handleReject = async () => {
    if (reviewApproval?.id) {
      await rejectApproval(reviewApproval.id, forms.reviewComment);
      setForms(p => ({ ...p, reviewingApproval: null, reviewComment: '' }));
    }
  };

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={reviewApproval ? 520 : 500} title="Aprobación">
      {/* Review Mode */}
      {reviewApproval ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{APPROVAL_TYPE_ICONS[reviewApproval.data?.type as ApprovalType] || '📋'}</span>
            <h2 className="text-lg font-semibold flex-1">Revisar Aprobación</h2>
          </div>

          <div className="skeuo-panel p-4 mb-4">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-semibold">{reviewApproval.data?.title}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                reviewApproval.data?.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : ''
              }`}>
                {reviewApproval.data?.status}
              </span>
            </div>
            {reviewApproval.data?.description && (
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{reviewApproval.data?.description}</p>
            )}
            <div className="space-y-1 text-[11px] text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <span>Tipo:</span>
                <span className="font-medium text-[var(--foreground)]">{APPROVAL_TYPE_LABELS[reviewApproval.data?.type as ApprovalType] || reviewApproval.data?.type}</span>
              </div>
              {reviewApproval.data?.projectName && (
                <div className="flex items-center gap-2">
                  <span>Proyecto:</span>
                  <span className="font-medium text-[var(--foreground)]">{reviewApproval.data?.projectName}</span>
                </div>
              )}
              {(reviewApproval.data?.amount ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span>Monto:</span>
                  <span className="font-semibold text-[var(--af-accent)]">{fmtCOP(reviewApproval.data?.amount ?? 0)}</span>
                </div>
              )}
              {reviewApproval.data?.requestedByName && (
                <div className="flex items-center gap-2">
                  <span>Solicitado por:</span>
                  <span className="font-medium text-[var(--foreground)]">{reviewApproval.data?.requestedByName}</span>
                </div>
              )}
            </div>
          </div>

          <FormField label="Comentario (opcional)">
            <FormTextarea
              value={forms.reviewComment || ''}
              onChange={(e) => setForms(p => ({ ...p, reviewComment: e.target.value }))}
              placeholder="Agrega un comentario sobre tu decisión..."
              rows={3}
            />
          </FormField>

          <div className="mt-5 pt-4">
            <div className="skeuo-divider -mx-5 sm:-mx-6 mb-4" />
            <div className="flex gap-2 justify-end">
              <button
                className="skeuo-btn px-4 py-2 text-[13px] font-medium"
                onClick={() => { closeModal('approval'); setForms(p => ({ ...p, reviewingApproval: null, reviewComment: '' })); }}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
                onClick={handleReject}
              >
                ✕ Rechazar
              </button>
              <button
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all"
                onClick={handleApprove}
              >
                ✓ Aprobar
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Create Mode */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📋</span>
            <h2 className="text-lg font-semibold">Nueva Solicitud de Aprobación</h2>
          </div>

          <div className="space-y-3">
            <FormField label="Tipo de aprobación" required>
              <div className="grid grid-cols-2 gap-2">
                {APPROVAL_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                      appType === t.value
                        ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/40'
                        : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--input)]'
                    }`}
                    onClick={() => setForms(p => ({ ...p, appType: t.value }))}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Proyecto" required>
              <FormSelect
                value={forms.appProject || selectedProjectId || ''}
                onChange={(e) => setForms(p => ({ ...p, appProject: e.target.value }))}
              >
                <option value="">Seleccionar proyecto</option>
                {fs.projects.map((p: Project) => (
                  <option key={p.id} value={p.id}>{p.data.name}</option>
                ))}
              </FormSelect>
            </FormField>

            <FormField label="Título" required>
              <FormInput
                value={forms.appTitle || ''}
                onChange={(e) => setForms(p => ({ ...p, appTitle: e.target.value }))}
                placeholder="Ej: Incremento de presupuesto para acabados"
              />
            </FormField>

            {showAmount && (
              <FormField label="Monto (COP)">
                <FormInput
                  type="number"
                  value={forms.appAmount || ''}
                  onChange={(e) => setForms(p => ({ ...p, appAmount: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </FormField>
            )}

            <FormField label="Descripción">
              <FormTextarea
                value={forms.appDesc || ''}
                onChange={(e) => setForms(p => ({ ...p, appDesc: e.target.value }))}
                placeholder={
                  appType === 'budget_change'
                    ? 'Describe el cambio presupuestario solicitado y su justificación...'
                    : appType === 'phase_completion'
                    ? 'Describe la fase que se desea marcar como completada...'
                    : appType === 'expense_approval'
                    ? 'Describe el gasto que requiere aprobación...'
                    : 'Describe lo que necesitas aprobar...'
                }
                rows={3}
              />
            </FormField>
          </div>

          <ModalFooter
            onCancel={() => closeModal('approval')}
            onSubmit={handleSubmit}
            submitLabel="Enviar Solicitud"
          />
        </>
      )}
    </CenterModal>
  );
}
