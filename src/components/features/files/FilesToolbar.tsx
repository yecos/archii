'use client';
import React from 'react';
import { Search, FolderOpen, ChevronDown, X, ArrowUpDown, LayoutGrid, List, Upload } from 'lucide-react';
import type { Project } from '@/lib/types';
import { FILE_CATEGORY_TABS, SORT_OPTIONS } from './types';
import type { FileCategory, SortKey, ViewMode } from './types';

interface FilesToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterProjectId: string;
  projects: Project[];
  projectsWithFiles: Project[];
  setFilterProjectId: (id: string) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeCategory: FileCategory;
  setActiveCategory: (cat: FileCategory) => void;
  stats: Record<string, number>;
  showSort: boolean;
  setShowSort: (v: boolean) => void;
  showProjectDrop: boolean;
  setShowProjectDrop: (v: boolean) => void;
  onGoToProjectFiles: (projectId: string) => void;
}

export function FilesToolbar({
  searchQuery,
  setSearchQuery,
  filterProjectId,
  projects,
  projectsWithFiles,
  setFilterProjectId,
  sortKey,
  setSortKey,
  viewMode,
  setViewMode,
  activeCategory,
  setActiveCategory,
  stats,
  showSort,
  setShowSort,
  showProjectDrop,
  setShowProjectDrop,
  onGoToProjectFiles,
}: FilesToolbarProps) {
  return (
    <div className="card-elevated rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile: Project selector dropdown */}
        <div className="lg:hidden relative">
          <button
            className="skeuo-btn flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors text-[var(--foreground)]"
            onClick={() => { setShowProjectDrop(!showProjectDrop); setShowSort(false); }}
          >
            <FolderOpen size={13} />
            <span className="truncate max-w-[100px]">
              {filterProjectId === 'all' ? 'Todos' : (projects.find((p: Project) => p.id === filterProjectId)?.data?.name || 'Proyecto')}
            </span>
            <ChevronDown size={12} />
          </button>
          {showProjectDrop && (
            <div className="absolute top-full left-0 mt-1 w-52 skeuo-well rounded-xl z-50 py-1 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <button
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--af-bg3)] cursor-pointer bg-transparent border-none text-[var(--foreground)]"
                onClick={() => { setFilterProjectId('all'); setShowProjectDrop(false); }}
              >
                📂 Todos los proyectos
              </button>
              {projectsWithFiles.map(p => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--af-bg3)] cursor-pointer truncate bg-transparent border-none text-[var(--foreground)]"
                  onClick={() => { setFilterProjectId(p.id); setShowProjectDrop(false); }}
                >
                  {p.data.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full pl-8 pr-8 py-1.5 text-[13px] rounded-lg skeuo-input outline-none focus:border-[var(--af-accent)]/40 text-[var(--foreground)] placeholder:text-[var(--af-text3)]"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--af-text3)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none"
              onClick={() => setSearchQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            className="skeuo-btn flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors text-[var(--foreground)]"
            onClick={() => { setShowSort(!showSort); setShowProjectDrop(false); }}
          >
            <ArrowUpDown size={13} />
            <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.key === sortKey)?.label}</span>
            <ChevronDown size={12} />
          </button>
          {showSort && (
            <div className="absolute top-full right-0 mt-1 w-36 skeuo-well rounded-xl z-50 py-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`w-full text-left px-3 py-2 text-[13px] cursor-pointer transition-colors border-none ${sortKey === opt.key ? 'text-[var(--af-accent)] bg-[var(--af-accent)]/5' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`}
                  style={{ backgroundColor: sortKey === opt.key ? 'var(--af-accent)/5' : undefined }}
                  onClick={() => { setSortKey(opt.key); setShowSort(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 skeuo-well rounded-xl p-0.5">
          <button
            className={`p-1.5 rounded-md cursor-pointer transition-all bg-transparent border-none ${viewMode === 'grid' ? 'card-elevated text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            onClick={() => setViewMode('grid')}
            title="Vista de cuadrícula"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`p-1.5 rounded-md cursor-pointer transition-all bg-transparent border-none ${viewMode === 'list' ? 'card-elevated text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            onClick={() => setViewMode('list')}
            title="Vista de lista"
          >
            <List size={15} />
          </button>
        </div>

        {/* Mobile Upload Button */}
        {filterProjectId !== 'all' && (
          <button
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => onGoToProjectFiles(filterProjectId)}
          >
            <Upload size={13} /> Subir
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-none -mx-1 px-1">
        {FILE_CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap cursor-pointer transition-all border-none ${
              activeCategory === tab.key
                ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-medium'
                : 'skeuo-well text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setActiveCategory(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.key === 'todos' && <span className="text-[10px] text-[var(--af-text3)]">({stats.total})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
