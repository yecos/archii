'use client';
import CenterModal from '@/components/common/CenterModal';
import { useUI, useFirestore, useTimeTracking } from '@/hooks/useDomain';
import { DEFAULT_PHASES } from '@/lib/types';
import type { Project } from '@/lib/types';

export default function TimeEntryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const fs = useFirestore();
  const tt = useTimeTracking();
  const { forms, setForms, closeModal } = ui;
  const { projects } = fs;
  const { saveManualTimeEntry } = tt;

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480} title={ui.editingId ? 'Editar registro' : 'Nuevo registro de tiempo'}>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label>
          <select
            className="w-full skeuo-input px-3 py-2 text-sm"
            value={forms.teProject || ''}
            onChange={(e) => setForms(p => ({ ...p, teProject: e.target.value }))}
          >
            <option value="">— Seleccionar —</option>
            {projects.map((p: Project) => (
              <option key={p.id} value={p.id}>{p.data.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fase</label>
          <select
            className="w-full skeuo-input px-3 py-2 text-sm"
            value={forms.tePhase || ''}
            onChange={(e) => setForms(p => ({ ...p, tePhase: e.target.value }))}
          >
            <option value="">— Sin fase —</option>
            {DEFAULT_PHASES.map(ph => (
              <option key={ph} value={ph}>{ph}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label>
          <textarea
            className="w-full skeuo-input px-3 py-2 text-sm resize-none"
            value={forms.teDescription || ''}
            onChange={(e) => setForms(p => ({ ...p, teDescription: e.target.value }))}
            placeholder="¿Qué hiciste?"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label>
          <input
            type="date"
            className="w-full skeuo-input px-3 py-2 text-sm"
            value={forms.teDate || ''}
            onChange={(e) => setForms(p => ({ ...p, teDate: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Duración (min)</label>
          <input
            type="number"
            className="w-full skeuo-input px-3 py-2 text-sm"
            value={forms.teManualDuration || ''}
            onChange={(e) => setForms(p => ({ ...p, teManualDuration: e.target.value }))}
            placeholder="60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hora inicio</label>
            <input
              type="time"
              className="w-full skeuo-input px-3 py-2 text-sm"
              value={forms.teStartTime || ''}
              onChange={(e) => setForms(p => ({ ...p, teStartTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hora fin</label>
            <input
              type="time"
              className="w-full skeuo-input px-3 py-2 text-sm"
              value={forms.teEndTime || ''}
              onChange={(e) => setForms(p => ({ ...p, teEndTime: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Tarifa/h (COP)</label>
            <input
              type="number"
              className="w-full skeuo-input px-3 py-2 text-sm"
              value={forms.teRate || 50000}
              onChange={(e) => setForms(p => ({ ...p, teRate: e.target.value }))}
              placeholder="50000"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={forms.teBillable !== false}
                onChange={(e) => setForms(p => ({ ...p, teBillable: e.target.checked }))}
                className="w-4 h-4 rounded accent-[var(--af-accent)]"
              />
              Billable
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4">
        <div className="skeuo-divider -mx-5 sm:-mx-6 mb-4" />
        <div className="flex gap-2 justify-end">
          <button
            className="skeuo-btn px-4 py-2 text-[13px] font-medium"
            onClick={() => closeModal('timeEntry')}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)]"
            onClick={saveManualTimeEntry}
          >
            Guardar
          </button>
        </div>
      </div>
    </CenterModal>
  );
}
