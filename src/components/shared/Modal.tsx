'use client';

import React from 'react';
import { useAppStore } from '@/stores/app-store';

interface ModalProps {
  name: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export default function Modal({ name, title, children, wide, onSubmit, submitLabel, loading }: ModalProps) {
  const modals = useAppStore(s => s.modals);
  const closeModal = useAppStore(s => s.closeModal);

  if (!modals[name]) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal(name)}>
      <div
        className={`bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn ${wide ? 'sm:w-[560px]' : 'sm:w-[480px]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-5">{title}</div>
        {children}
        {onSubmit && (
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal(name)}>Cancelar</button>
            <button className={`px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-colors ${loading ? 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]' : 'bg-[var(--af-accent)] text-background hover:bg-[var(--af-accent2)]'}`} onClick={onSubmit} disabled={loading}>
              {loading ? 'Guardando...' : submitLabel || 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
