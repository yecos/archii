'use client';
import React, { useState, useCallback } from 'react';
import PhotoAnnotator from '@/components/ui/PhotoAnnotator';
import type { PhotoAnnotatorRef } from '@/components/ui/PhotoAnnotator';
import { X, Download } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
  onSave?: (annotatedDataURL: string) => void;
}

export default function AnnotatePhotoModal({ open, onClose, src, title, onSave }: Props) {
  const [saved, setSaved] = useState(false);
  const annotatorRef = React.useRef<PhotoAnnotatorRef>(null);

  const handleSave = useCallback(() => {
    const url = annotatorRef.current?.exportAnnotated();
    if (url) {
      onSave?.(url);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    }
  }, [onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl card-elevated rounded-2xl shadow-2xl animate-scaleIn flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-[var(--af-accent)] text-sm">
              ✏️
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate">Anotar Foto</div>
              {title && <div className="text-[11px] text-[var(--muted-foreground)] truncate">{title}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--af-accent)] text-background hover:bg-[var(--af-accent2)]'
              }`}
              onClick={handleSave}
            >
              {saved ? '✓ Guardado' : <><Download size={13} /> Guardar Anotación</>}
            </button>
            <button
              className="w-8 h-8 rounded-lg bg-[var(--af-bg4)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4">
          <PhotoAnnotator
            ref={annotatorRef}
            src={src}
            width={700}
            height={500}
            showToolbar
          />
        </div>

        {/* Hint */}
        <div className="px-4 pb-3">
          <div className="text-[10px] text-[var(--af-text3)] text-center">
            Usa las herramientas para marcar la foto con flechas, rectángulos, círculos, texto o dibujo libre.
            Puedes cambiar el color y grosor del trazo. Las anotaciones se exportan como imagen PNG.
          </div>
        </div>
      </div>
    </div>
  );
}
