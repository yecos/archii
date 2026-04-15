'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, FileText, Image, FileSpreadsheet, File, Ruler,
  LayoutGrid, List, ChevronDown, X, ExternalLink, Upload,
  FolderOpen, Filter, ArrowUpDown, XCircle
} from 'lucide-react';
import { useUI, useAuth, useFirestore, useOneDrive, useGallery } from '@/hooks/useDomain';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import { fmtDate, fmtSize } from '@/lib/helpers';
import { getFirebase, serverTimestamp, QuerySnapshot } from '@/lib/firebase-service';
import type { Project, GalleryPhoto } from '@/lib/types';

/* ===== TYPES ===== */

type FileSource = 'local' | 'onedrive' | 'gallery';
type FileCategory = 'todos' | 'documentos' | 'imagenes' | 'planos' | 'otros';
type SortKey = 'nombre' | 'fecha' | 'tamano';
type ViewMode = 'grid' | 'list';

interface UnifiedFile {
  id: string;
  name: string;
  source: FileSource;
  category: FileCategory;
  size: number;
  date: any;
  projectName: string;
  projectId: string;
  url: string;
  mimeType?: string;
  thumbnailUrl?: string;
  caption?: string;
}

/* ===== HELPERS ===== */

const FILE_CATEGORY_TABS: { key: FileCategory; label: string; icon: string }[] = [
  { key: 'todos', label: 'Todos', icon: '📂' },
  { key: 'documentos', label: 'Documentos', icon: '📄' },
  { key: 'imagenes', label: 'Imágenes', icon: '🖼️' },
  { key: 'planos', label: 'Planos', icon: '📐' },
  { key: 'otros', label: 'Otros', icon: '📎' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'tamano', label: 'Tamaño' },
];

function getFileCategory(fileName: string, mimeType?: string): FileCategory {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mt = (mimeType || '').toLowerCase();

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'heic'];
  const planosExts = ['dwg', 'dxf', 'skp', 'plt', 'hpGL', '3dm', 'rvt', 'ifc'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods'];

  if (imageExts.includes(ext) || mt.includes('image')) return 'imagenes';
  if (planosExts.includes(ext) || mt.includes('dwg') || mt.includes('dxf')) return 'planos';
  if (docExts.includes(ext) || mt.includes('pdf') || mt.includes('word') || mt.includes('sheet') || mt.includes('document') || mt.includes('presentation') || mt.includes('csv')) return 'documentos';
  return 'otros';
}

function FileIcon({ fileName, mimeType }: { fileName: string; mimeType?: string }) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mt = (mimeType || '').toLowerCase();

  if (mt.includes('pdf') || ext === 'pdf') return <FileText size={18} className="text-red-400" />;
  if (mt.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'heic'].includes(ext))
    return <Image size={18} className="text-emerald-400" />;
  if (mt.includes('sheet') || mt.includes('excel') || mt.includes('csv') || ['xls', 'xlsx', 'csv'].includes(ext))
    return <FileSpreadsheet size={18} className="text-emerald-500" />;
  if (mt.includes('word') || mt.includes('document') || ['doc', 'docx', 'rtf', 'odt'].includes(ext))
    return <FileText size={18} className="text-blue-400" />;
  if (['dwg', 'dxf', 'skp', 'plt', 'rvt', 'ifc'].includes(ext) || mt.includes('dwg') || mt.includes('dxf'))
    return <Ruler size={18} className="text-amber-400" />;
  return <File size={18} className="text-[var(--muted-foreground)]" />;
}

function SourceBadge({ source }: { source: FileSource }) {
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

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
}

/* ===== MAIN COMPONENT ===== */

export default function FilesScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const gal = useGallery();

  const { navigateTo, setForms, setSelectedProjectId, showToast } = ui;
  const { projects } = fs;
  const { loading } = auth;

  /* ---- Local State ---- */
  const [allLocalFiles, setAllLocalFiles] = useState<UnifiedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory>('todos');
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');

  /* ---- Load ALL project files via collectionGroup ---- */
  useEffect(() => {
    if (!auth.ready || !auth.authUser) { setLoadingFiles(false); return; }
    setLoadingFiles(true);
    const db = getFirebase().firestore();
    const unsub = db.collectionGroup('files').orderBy('createdAt', 'desc').onSnapshot(
      (snap: QuerySnapshot) => {
        const files: UnifiedFile[] = [];
        snap.forEach((doc: any) => {
          const d = doc.data();
          // Extract projectId from document reference: projects/{pid}/files/{fid}
          const projectId = doc.ref?.parent?.parent?.id || '';
          const proj = projects.find((p: Project) => p.id === projectId);
          const cat = getFileCategory(d.name, d.type);
          files.push({
            id: doc.id,
            name: d.name || 'Sin nombre',
            source: 'local',
            category: cat,
            size: d.size || 0,
            date: d.createdAt,
            projectName: proj?.data?.name || 'Proyecto',
            projectId,
            url: d.data || d.url || '', // base64 data or URL
            mimeType: d.type || '',
          });
        });
        setAllLocalFiles(files);
        setLoadingFiles(false);
      },
      (err: any) => {
        console.error('[ArchiFlow] Error loading global files:', err);
        setLoadingFiles(false);
      }
    );
    return () => unsub();
  }, [auth.ready, auth.authUser, projects]);

  /* ---- Build OneDrive files (currently loaded in OD context) ---- */
  const odFiles: UnifiedFile[] = useMemo(() => {
    if (!od.msConnected || !od.oneDriveFiles.length) return [];
    // Find which project folder is currently being browsed
    const projName = od.odBreadcrumbs.length > 0 ? od.odBreadcrumbs[0].name : 'OneDrive';
    return od.oneDriveFiles
      .filter((f: any) => !f.folder)
      .map((f: any) => ({
        id: f.id,
        name: f.name || 'Archivo',
        source: 'onedrive' as FileSource,
        category: getFileCategory(f.name, f.mimeType || f.file?.mimeType),
        size: f.size || 0,
        date: f.lastModifiedDateTime || f.createdDateTime,
        projectName: projName,
        projectId: od.odProjectFolder || '',
        url: f.webUrl || '',
        mimeType: f.mimeType || f.file?.mimeType || '',
        thumbnailUrl: f.thumbnailUrl,
      }));
  }, [od.msConnected, od.oneDriveFiles, od.odBreadcrumbs, od.odProjectFolder]);

  /* ---- Build Gallery photos ---- */
  const galFiles: UnifiedFile[] = useMemo(() => {
    return gal.galleryPhotos.map((p: any) => {
      const proj = projects.find((pr: Project) => pr.id === p.data?.projectId);
      return {
        id: p.id,
        name: p.data?.caption || 'Foto de galería',
        source: 'gallery' as FileSource,
        category: 'imagenes' as FileCategory,
        size: 0,
        date: p.data?.createdAt,
        projectName: proj?.data?.name || 'Proyecto',
        projectId: p.data?.projectId || '',
        url: p.data?.imageData || '',
        caption: p.data?.caption || '',
      };
    });
  }, [gal.galleryPhotos, projects]);

  /* ---- Merge all files ---- */
  const mergedFiles = useMemo(() => {
    return [...allLocalFiles, ...odFiles, ...galFiles];
  }, [allLocalFiles, odFiles, galFiles]);

  /* ---- Filter & Sort ---- */
  const filteredFiles = useMemo(() => {
    let result = [...mergedFiles];

    // Filter by project
    if (filterProjectId !== 'all') {
      result = result.filter(f => f.projectId === filterProjectId);
    }

    // Filter by category
    if (activeCategory !== 'todos') {
      result = result.filter(f => f.category === activeCategory);
    }

    // Search by name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'nombre':
          return a.name.localeCompare(b.name, 'es');
        case 'tamano':
          return b.size - a.size;
        case 'fecha':
        default: {
          const da = toDate(a.date);
          const db2 = toDate(b.date);
          return db2.getTime() - da.getTime();
        }
      }
    });

    return result;
  }, [mergedFiles, filterProjectId, activeCategory, searchQuery, sortKey]);

  /* ---- Stats ---- */
  const stats = useMemo(() => {
    const s: Record<string, number> = { total: mergedFiles.length, documentos: 0, imagenes: 0, planos: 0, otros: 0 };
    mergedFiles.forEach(f => {
      const cat = f.category;
      s[cat] = (s[cat] || 0) + 1;
    });
    return s;
  }, [mergedFiles]);

  /* ---- Project list for filter (only projects with files) ---- */
  const projectsWithFiles = useMemo(() => {
    const ids = new Set(mergedFiles.map(f => f.projectId));
    return projects.filter((p: Project) => ids.has(p.id));
  }, [projects, mergedFiles]);

  /* ---- Handlers ---- */
  const handleFileClick = useCallback((file: UnifiedFile) => {
    if (file.source === 'onedrive' && file.url) {
      window.open(file.url, '_blank', 'noopener');
      return;
    }
    const isImage = file.category === 'imagenes' && file.url;
    if (isImage) {
      setLightboxSrc(file.url);
      setLightboxName(file.name);
      return;
    }
    // For local non-image files with base64 data, open in new tab
    if (file.url && file.url.startsWith('data:')) {
      const w = window.open('', '_blank');
      if (w) {
        if (file.url.startsWith('data:application/pdf')) {
          w.document.write(`<embed src="${file.url}" width="100%" height="100%" type="application/pdf" />`);
        } else {
          w.document.write(`
            <html><head><title>${file.name}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a1a;color:#ccc;font-family:sans-serif;}</style></head>
            <body><div style="text-align:center;"><div style="font-size:48px;margin-bottom:16px;">📎</div><div>${file.name}</div><div style="font-size:12px;color:#888;margin-top:8px;">${fmtSize(file.size)}</div></div></body></html>
          `);
        }
      }
    }
  }, []);

  const handleGoToProjectFiles = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setForms(p => ({ ...p, detailTab: 'Archivos' }));
    navigateTo('projectDetail', projectId);
  }, [setSelectedProjectId, setForms, navigateTo]);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
    setLightboxName('');
  }, []);

  /* ---- Show sort dropdown ---- */
  const [showSort, setShowSort] = useState(false);
  /* ---- Show project dropdown (mobile) ---- */
  const [showProjectDrop, setShowProjectDrop] = useState(false);

  /* ===== RENDER ===== */
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Loading */}
      {(loading || loadingFiles) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !loadingFiles && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: 'Total', value: stats['total'] || 0, icon: '📂' },
              { label: 'Documentos', value: stats['documentos'] || 0, icon: '📄' },
              { label: 'Imágenes', value: stats['imagenes'] || 0, icon: '🖼️' },
              { label: 'Planos', value: stats['planos'] || 0, icon: '📐' },
              { label: 'Otros', value: stats['otros'] || 0, icon: '📎' },
            ].map(s => (
              <button
                key={s.label}
                className="card-elevated rounded-lg p-3 text-center hover:border-[var(--af-accent)]/30 transition-all cursor-pointer"
                onClick={() => {
                  if (s.label === 'Total') setActiveCategory('todos');
                  else setActiveCategory(s.label.toLowerCase() as FileCategory);
                }}
              >
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{s.value}</div>
                <div className="text-[10px] text-[var(--af-text3)]">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Main Layout: Sidebar + Content */}
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Sidebar — Project Filter (Desktop) */}
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
                    onClick={() => handleGoToProjectFiles(filterProjectId)}
                  >
                    <Upload size={13} /> Subir archivos
                  </button>
                )}

                {/* OneDrive Status */}
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <div className="text-[11px] text-[var(--af-text3)] flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${od.msConnected ? 'bg-emerald-500' : 'bg-[var(--af-bg4)]'}`} />
                    {od.msConnected ? 'OneDrive conectado' : 'OneDrive no conectado'}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {/* Toolbar */}
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
                      onClick={() => handleGoToProjectFiles(filterProjectId)}
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

              {/* Results count */}
              <div className="text-[12px] text-[var(--af-text3)] mb-3 px-1">
                {filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''} encontrado{filteredFiles.length !== 1 ? 's' : ''}
                {(searchQuery || filterProjectId !== 'all' || activeCategory !== 'todos') && (
                  <button
                    className="ml-2 text-[var(--af-accent)] hover:underline cursor-pointer bg-transparent border-none text-[12px]"
                    onClick={() => { setSearchQuery(''); setFilterProjectId('all'); setActiveCategory('todos'); }}
                  >
                    <XCircle size={11} className="inline mr-0.5 -mt-px" />
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Files Display */}
              {filteredFiles.length === 0 ? (
                /* Empty State */
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
                          onClick={() => handleGoToProjectFiles(p.id)}
                        >
                          {p.data.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredFiles.map(file => (
                    <div
                      key={`${file.source}-${file.id}`}
                      className="card-elevated rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-all group cursor-pointer"
                      onClick={() => handleFileClick(file)}
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
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="card-elevated rounded-xl overflow-hidden">
                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] text-[var(--muted-foreground)] font-medium border-b border-[var(--border)] skeuo-well">
                    <div className="w-7 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">Nombre</div>
                    <div className="w-[70px] text-right flex-shrink-0 hidden sm:block">Tamaño</div>
                    <div className="w-[80px] text-right flex-shrink-0 hidden sm:block">Fecha</div>
                    <div className="w-[80px] flex-shrink-0 hidden md:block">Proyecto</div>
                    <div className="w-[60px] flex-shrink-0">Origen</div>
                  </div>
                  {/* File rows */}
                  {filteredFiles.map(file => (
                    <div
                      key={`${file.source}-${file.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--af-bg3)] transition-colors group cursor-pointer"
                      onClick={() => handleFileClick(file)}
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
                  ))}
                </div>
              )}
            </main>
          </div>
        </>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn"
          onClick={closeLightbox}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button
              className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors cursor-pointer border-none"
              onClick={closeLightbox}
            >
              <X size={20} />
            </button>
            {/* Image */}
            <img
              src={lightboxSrc}
              alt={lightboxName}
              className="max-w-full max-h-[80dvh] object-contain rounded-lg"
              loading="lazy"
              onError={() => { showToast('Error al cargar imagen', 'error'); closeLightbox(); }}
            />
            {/* Caption */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-[12px] text-center pb-[env(safe-area-inset-bottom,0px)]">
              {lightboxName}
            </div>
          </div>
        </div>
      )}

      {/* Close dropdowns on outside click */}
      {(showSort || showProjectDrop) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowSort(false); setShowProjectDrop(false); }} />
      )}
    </div>
  );
}
