'use client';
import type { Project } from '@/lib/types';

interface FilesEmptyProps {
  searchQuery: string;
  projects: Project[];
  onGoToProjectFiles: (projectId: string) => void;
}

export function FilesEmpty({ searchQuery, projects, onGoToProjectFiles }: FilesEmptyProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4">📂</div>
      <div className="text-[15px] font-semibold text-[var(--foreground)] mb-1">No se encontraron archivos</div>
      <div className="text-[13px] text-[var(--af-text3)] mb-4">
        {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sube archivos desde la vista de cada proyecto'}
      </div>
      {!searchQuery && projects.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
          {projects.slice(0, 5).map(p => (
            <button
              key={p.id}
              className="skeuo-btn text-[11px] px-3 py-1.5 text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-all"
              onClick={() => onGoToProjectFiles(p.id)}
            >
              {p.data.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
