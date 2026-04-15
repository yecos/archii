'use client';
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { fmtDate, fmtSize } from '@/lib/helpers';
import { FileIcon } from './FileIcon';
import { SourceBadge } from './SourceBadge';
import type { UnifiedFile } from './types';

interface FileListRowProps {
  file: UnifiedFile;
  onClick: (file: UnifiedFile) => void;
}

export function FileListRow({ file, onClick }: FileListRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--af-bg3)] transition-colors group cursor-pointer"
      onClick={() => onClick(file)}
    >
      {/* Icon */}
      <div className="w-7 h-7 skeuo-well rounded-md flex items-center justify-center flex-shrink-0">
        <FileIcon fileName={file.name} mimeType={file.mimeType} />
      </div>
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate text-[var(--foreground)] flex items-center gap-1.5">
          {file.name}
          {file.source === 'onedrive' && <ExternalLink size={11} className="text-[var(--af-text3)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
        </div>
        <div className="text-[10px] text-[var(--af-text3)] md:hidden mt-0.5">
          {file.size > 0 ? fmtSize(file.size) : ''} {file.date ? '· ' + fmtDate(file.date) : ''} · {file.projectName}
        </div>
      </div>
      {/* Size */}
      <div className="w-[70px] text-right text-[11px] text-[var(--muted-foreground)] flex-shrink-0 hidden sm:block">
        {file.size > 0 ? fmtSize(file.size) : '—'}
      </div>
      {/* Date */}
      <div className="w-[80px] text-right text-[11px] text-[var(--muted-foreground)] flex-shrink-0 hidden sm:block">
        {file.date ? fmtDate(file.date) : '—'}
      </div>
      {/* Project */}
      <div className="w-[80px] text-[11px] text-[var(--af-text3)] truncate flex-shrink-0 hidden md:block">
        {file.projectName}
      </div>
      {/* Source badge */}
      <div className="w-[60px] flex-shrink-0">
        <SourceBadge source={file.source} />
      </div>
    </div>
  );
}
