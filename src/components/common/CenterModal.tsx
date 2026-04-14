'use client';
import React from 'react';
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';

/**
 * CenterModal — Modal centrado en pantalla.
 * Usa Radix Dialog en vez de Vaul para evitar conflictos de posicionamiento.
 * Funciona igual en mobile y desktop: siempre centrado.
 */
export default function CenterModal({ open, onClose, children, maxWidth = 480, title }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number; title?: string }) {
  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-black/60 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="z-[101] bg-[var(--card)] border border-[var(--border)] rounded-2xl p-0 shadow-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col overflow-hidden"
          style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined, width: '95vw' }}
        >
          {title ? (
            <div className="px-5 pt-4 sm:px-6 sm:pt-5 pb-0">
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            </div>
          ) : (
            <DialogTitle className="sr-only">Modal</DialogTitle>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {children}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
