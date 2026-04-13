'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { DEFAULT_PHASES } from '@/lib/types';

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

export default function TimeEntryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, closeModal, saveManualTimeEntry, projects } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">Registro Manual de Tiempo</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label>
          <select
            className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none"
            value={forms.teProject || ''}
            onChange={(e) => setForms(p => ({ ...p, teProject: e.target.value }))}
          >
            <option value="">— Seleccionar —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fase</label>
          <select
            className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none"
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
            className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none"
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
            className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
            value={forms.teDate || ''}
            onChange={(e) => setForms(p => ({ ...p, teDate: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Duración (min)</label>
          <input
            type="number"
            className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
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
              className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
              value={forms.teStartTime || ''}
              onChange={(e) => setForms(p => ({ ...p, teStartTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hora fin</label>
            <input
              type="time"
              className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
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
              className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
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

      <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
        <button
          className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all"
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
    </DrawerModal>
  );
}
