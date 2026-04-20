'use client';

import { useState, useCallback } from 'react';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  destructive: true,
};

type ResolveFn = (confirmed: boolean) => void;

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolveRef = useState<ResolveFn | null>(null);
  const setResolve = resolveRef[1];

  const confirm = useCallback((options: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolve(() => resolve);
      setState({
        open: true,
        title: options.title,
        description: options.description || '',
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        destructive: options.destructive !== false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(initialState);
    resolveRef[0]?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(initialState);
    resolveRef[0]?.(false);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setState(prev => ({ ...prev, open: false }));
      resolveRef[0]?.(false);
    }
  }, []);

  return {
    ...state,
    confirm,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    onOpenChange: handleOpenChange,
  };
}
