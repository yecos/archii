'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { XCircle } from 'lucide-react';
import { useUI, useAuth, useFirestore, useOneDrive, useGallery } from '@/hooks/useDomain';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import { fmtSize } from '@/lib/helpers';
import { useTenantId } from '@/hooks/useTenantId';
import { getFirebase, QuerySnapshot, QueryDocSnapshot } from '@/lib/firebase-service';
import type { Project, OneDriveFile, GalleryPhoto } from '@/lib/types';
import {
  StatsBar, ProjectSidebar, FilesToolbar, FileGridCard, FileListRow,
  FilesEmpty, Lightbox,
} from '@/components/features/files';
import {
  getFileCategory, toDate,
  type FileCategory, type SortKey, type ViewMode, type UnifiedFile,
} from '@/components/features/files';

/* ===== MAIN COMPONENT ===== */

export default function FilesScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const gal = useGallery();
  const tenantId = useTenantId();

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
  const [showSort, setShowSort] = useState(false);
  const [showProjectDrop, setShowProjectDrop] = useState(false);

  /* ---- Load ALL project files via collectionGroup ---- */
  useEffect(() => {
    if (!auth.ready || !auth.authUser || !tenantId) { setLoadingFiles(false); return; }
    setLoadingFiles(true);
    const db = getFirebase().firestore();
    const unsub = db.collectionGroup('files').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').onSnapshot(
      (snap: QuerySnapshot) => {
        const files: UnifiedFile[] = [];
        snap.forEach((doc: QueryDocSnapshot) => {
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
      (err: Error) => {
        console.error('[ArchiFlow] Error loading global files:', err);
        setLoadingFiles(false);
      }
    );
    return () => unsub();
  }, [auth.ready, auth.authUser, projects, tenantId]);

  /* ---- Build OneDrive files (currently loaded in OD context) ---- */
  const odFiles: UnifiedFile[] = useMemo(() => {
    if (!od.msConnected || !od.oneDriveFiles.length) return [];
    // Find which project folder is currently being browsed
    const projName = od.odBreadcrumbs.length > 0 ? od.odBreadcrumbs[0].name : 'OneDrive';
    return od.oneDriveFiles
      .filter((f: OneDriveFile) => !f.folder)
      .map((f: OneDriveFile) => ({
        id: f.id,
        name: f.name || 'Archivo',
        source: 'onedrive' as const,
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
    return gal.galleryPhotos.map((p: GalleryPhoto) => {
      const proj = projects.find((pr: Project) => pr.id === p.data?.projectId);
      return {
        id: p.id,
        name: p.data?.caption || 'Foto de galería',
        source: 'gallery' as const,
        category: 'imagenes' as const,
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

  const handleLightboxError = useCallback(() => {
    showToast('Error al cargar imagen', 'error');
    closeLightbox();
  }, [showToast, closeLightbox]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterProjectId('all');
    setActiveCategory('todos');
  }, []);

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
          <StatsBar stats={stats} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

          {/* Main Layout: Sidebar + Content */}
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Sidebar — Project Filter (Desktop) */}
            <ProjectSidebar
              filterProjectId={filterProjectId}
              setFilterProjectId={setFilterProjectId}
              projectsWithFiles={projectsWithFiles}
              onGoToProjectFiles={handleGoToProjectFiles}
              msConnected={od.msConnected}
            />

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {/* Toolbar */}
              <FilesToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterProjectId={filterProjectId}
                projects={projects}
                projectsWithFiles={projectsWithFiles}
                setFilterProjectId={setFilterProjectId}
                sortKey={sortKey}
                setSortKey={setSortKey}
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                stats={stats}
                showSort={showSort}
                setShowSort={setShowSort}
                showProjectDrop={showProjectDrop}
                setShowProjectDrop={setShowProjectDrop}
                onGoToProjectFiles={handleGoToProjectFiles}
              />

              {/* Results count */}
              <div className="text-[12px] text-[var(--af-text3)] mb-3 px-1">
                {filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''} encontrado{filteredFiles.length !== 1 ? 's' : ''}
                {(searchQuery || filterProjectId !== 'all' || activeCategory !== 'todos') && (
                  <button
                    className="ml-2 text-[var(--af-accent)] hover:underline cursor-pointer bg-transparent border-none text-[12px]"
                    onClick={clearFilters}
                  >
                    <XCircle size={11} className="inline mr-0.5 -mt-px" />
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Files Display */}
              {filteredFiles.length === 0 ? (
                <FilesEmpty
                  searchQuery={searchQuery}
                  projects={projects}
                  onGoToProjectFiles={handleGoToProjectFiles}
                />
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredFiles.map(file => (
                    <FileGridCard key={`${file.source}-${file.id}`} file={file} onClick={handleFileClick} />
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
                    <FileListRow key={`${file.source}-${file.id}`} file={file} onClick={handleFileClick} />
                  ))}
                </div>
              )}
            </main>
          </div>
        </>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          name={lightboxName}
          onClose={closeLightbox}
          onError={handleLightboxError}
        />
      )}

      {/* Close dropdowns on outside click */}
      {(showSort || showProjectDrop) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowSort(false); setShowProjectDrop(false); }} />
      )}
    </div>
  );
}
