'use client';
import { ExternalLink } from 'lucide-react';
import { fmtDate, fmtSize } from '@/lib/helpers';
import { FileIcon } from './FileIcon';
import { SourceBadge } from './SourceBadge';
import type { UnifiedFile } from './types';

interface FileGridCardProps {
  file: UnifiedFile;
  onClick: (file: UnifiedFile) => void;
}

export function FileGridCard({ file, onClick }: FileGridCardProps) {
  return (
    <div
      className="card-elevated rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-all group cursor-pointer"
      onClick={() => onClick(file)}
    >
      {/* File preview area */}
      <div className="w-full h-24 skeuo-well rounded-xl flex items-center justify-center mb-3 overflow-hidden">
        {file.category === 'imagenes' && file.url && !file.url.startsWith('data:') ? (
          <img
            src={file.thumbnailUrl || file.url}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
              if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = 'flex';
            }}
          />
        ) : file.category === 'imagenes' && file.url && file.url.startsWith('data:') ? (
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
            }}
          />
        ) : (
          <FileIcon fileName={file.name} mimeType={file.mimeType} />
        )}
      </div>

      {/* File info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate text-[var(--foreground)]">{file.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-[var(--af-text3)]">
              {file.size > 0 ? fmtSize(file.size) : '—'}
            </span>
            <span className="text-[10px] text-[var(--af-text3)]">·</span>
            <span className="text-[10px] text-[var(--af-text3)]">
              {file.date ? fmtDate(file.date) : '—'}
            </span>
          </div>
        </div>
        {file.source === 'onedrive' && (
          <ExternalLink size={13} className="text-[var(--af-text3)] group-hover:text-[#00a4ef] transition-colors flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <SourceBadge source={file.source} />
        <span className="text-[10px] px-1.5 py-0.5 rounded skeuo-well text-[var(--af-text3)] truncate max-w-[140px]">
          {file.projectName}
        </span>
      </div>
    </div>
  );
}
