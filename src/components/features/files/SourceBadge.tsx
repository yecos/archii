'use client';
import React from 'react';
import type { FileSource } from './types';

interface SourceBadgeProps {
  source: FileSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const cfg: Record<FileSource, { label: string; cls: string }> = {
    local: { label: 'Local', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    onedrive: { label: 'OneDrive', cls: 'bg-[#00a4ef]/10 text-[#00a4ef] border-[#00a4ef]/30' },
    gallery: { label: 'Galería', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };
  const c = cfg[source];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}
