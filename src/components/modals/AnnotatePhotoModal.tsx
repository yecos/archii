'use client';
import React, { useState, useCallback } from 'react';
import PhotoAnnotator from '@/components/ui/PhotoAnnotator';
import type { PhotoAnnotatorRef } from '@/components/ui/PhotoAnnotator';
import { X, Download } from 'lucide-react';
import CenterModal from '@/components/common/CenterModal';

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

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={896} title="Anotar Foto">
      {/* Header row */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-[var(--af-accent)] text-sm flex-shrink-0">
            ✏️
          </div>
          {title && <div className="text-[11px] text-[var(--muted-foreground)] truncate">{title}</div>}
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
      <PhotoAnnotator
        ref={annotatorRef}
        src={src}
        width={700}
        height={500}
        showToolbar
      />

      {/* Hint */}
      <div className="pt-4">
        <div className="text-[10px] text-[var(--af-text3)] text-center">
          Usa las herramientas para marcar la foto con flechas, rectángulos, círculos, texto o dibujo libre.
          Puedes cambiar el color y grosor del trazo. Las anotaciones se exportan como imagen PNG.
        </div>
      </div>
    </CenterModal>
  );
}
