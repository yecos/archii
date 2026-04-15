'use client';
import { FolderOpen, Upload } from 'lucide-react';
import type { Project } from '@/lib/types';

interface ProjectSidebarProps {
  filterProjectId: string;
  setFilterProjectId: (id: string) => void;
  projectsWithFiles: Project[];
  onGoToProjectFiles: (projectId: string) => void;
  msConnected: boolean;
}

export function ProjectSidebar({
  filterProjectId,
  setFilterProjectId,
  projectsWithFiles,
  onGoToProjectFiles,
  msConnected,
}: ProjectSidebarProps) {
  return (
    <aside className="hidden lg:block w-56 flex-shrink-0">
      <div className="skeuo-panel rounded-xl p-4 sticky top-4">
        <div className="text-[13px] font-semibold mb-3 flex items-center gap-2">
          <FolderOpen size={14} /> Proyectos
        </div>
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          <button
            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer ${filterProjectId === 'all' ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`}
            onClick={() => setFilterProjectId('all')}
          >
            📂 Todos los proyectos
          </button>
          {projectsWithFiles.map(p => (
            <button
              key={p.id}
              className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer truncate ${filterProjectId === p.id ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`}
              onClick={() => setFilterProjectId(p.id)}
            >
              {p.data.color ? (
                <span className="inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: p.data.color }} />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--af-bg4)] mr-2 flex-shrink-0" />
              )}
              <span className="truncate">{p.data.name}</span>
            </button>
          ))}
        </div>

        {/* Upload CTA */}
        {filterProjectId !== 'all' && (
          <button
            className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[12px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => onGoToProjectFiles(filterProjectId)}
          >
            <Upload size={13} /> Subir archivos
          </button>
        )}

        {/* OneDrive Status */}
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <div className="text-[11px] text-[var(--af-text3)] flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${msConnected ? 'bg-emerald-500' : 'bg-[var(--af-bg4)]'}`} />
            {msConnected ? 'OneDrive conectado' : 'OneDrive no conectado'}
          </div>
        </div>
      </div>
    </aside>
  );
}
