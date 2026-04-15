'use client';
import { X } from 'lucide-react';

interface LightboxProps {
  src: string;
  name: string;
  onClose: () => void;
  onError: () => void;
}

export function Lightbox({ src, name, onClose, onError }: LightboxProps) {
  return (
    <div
      className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors cursor-pointer border-none"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {/* Image */}
        <img
          src={src}
          alt={name}
          className="max-w-full max-h-[80dvh] object-contain rounded-lg"
          loading="lazy"
          onError={onError}
        />
        {/* Caption */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-[12px] text-center pb-[env(safe-area-inset-bottom,0px)]">
          {name}
        </div>
      </div>
    </div>
  );
}
