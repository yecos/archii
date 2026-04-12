'use client';

import React, { useRef } from 'react';
import { fileToBase64 } from '@/lib/utils';

interface PhotoUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
}

export default function PhotoUploader({ images, onImagesChange, maxPhotos = 5, maxSizeMB = 5 }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target?.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (images.length >= maxPhotos) break;
      if (file.size > maxSizeMB * 1024 * 1024) continue;
      try {
        const base64 = await fileToBase64(file);
        onImagesChange([...images, base64]);
      } catch {}
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center text-[10px] hover:bg-red-500 cursor-pointer"
              onClick={() => removeImage(idx)}
            >✕</button>
          </div>
        ))}
        {images.length < maxPhotos && (
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
            <span className="text-lg">+</span>
            <span className="text-[8px] text-[var(--muted-foreground)]">Foto</span>
            <input type="file" accept="image/*" className="hidden" ref={inputRef} onChange={handleSelect} />
          </label>
        )}
      </div>
      <div className="text-[10px] text-[var(--muted-foreground)]">{images.length}/{maxPhotos} fotos · máx. {maxSizeMB}MB c/u</div>
    </div>
  );
}
