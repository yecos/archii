'use client';
import React from 'react';
import { confirm } from '@/hooks/useConfirmDialog';
import { fmtSize } from '@/lib/helpers';

interface OdBreadcrumb {
  id: string;
  name: string;
}

interface OneDriveState {
  msConnected: boolean;
  msAccessToken: string | null;
  showOneDrive: boolean;
  odTab: 'files' | 'gallery';
  galleryLoading: boolean;
  odGalleryPhotos: any[];
  msLoading: boolean;
  odSearchQuery: string;
  odSearchResults: any[];
  odSearching: boolean;
  odViewMode: 'list' | 'grid';
  odUploading: boolean;
  odUploadFile: string;
  odUploadProgress: number;
  odDragOver: boolean;
  odProjectFolder: string | null;
  odCurrentFolder: string;
  odBreadcrumbs: OdBreadcrumb[];
  oneDriveFiles: any[];
  odRenaming: string | null;
  odRenameName: string;
  setOdTab: (tab: 'files' | 'gallery') => void;
  setShowOneDrive: (show: boolean) => void;
  setOneDriveFiles: (files: any[]) => void;
  setOdBreadcrumbs: (updater: OdBreadcrumb[] | ((prev: OdBreadcrumb[]) => OdBreadcrumb[])) => void;
  setOdSearchQuery: (query: string) => void;
  setOdSearchResults: (results: any[]) => void;
  setOdViewMode: (mode: 'list' | 'grid') => void;
  setOdDragOver: (dragOver: boolean) => void;
  setOdRenaming: (id: string | null) => void;
  setOdRenameName: (name: string) => void;
  setOdCurrentFolder: (folder: string) => void;
  openOneDriveForProject: (projectName: string) => void;
  loadGalleryPhotos: (projectId: string) => void;
  loadOneDriveFiles: (folderId: string) => void;
  navigateToFolder: (folderId: string, breadcrumbIndex?: number) => void;
  searchOneDriveFiles: (query: string) => void;
  getFileIcon: (mimeType: string, name: string) => React.ReactNode;
  formatFileSize: (size: number) => string;
  timeAgo: (dateStr: string) => string;
  downloadOneDriveFile: (fileId: string, fileName: string) => void;
  renameOneDriveFile: (fileId: string, newName: string) => void;
  deleteFromOneDrive: (fileId: string, folderId: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDroppedFiles: (files: FileList) => Promise<void>;
}

interface ProjectArchivosProps {
  projectName: string;
  msConnected: boolean;
  doMicrosoftLogin: () => void;
  od: OneDriveState;
  projectFiles: Array<{ id: string; data: Record<string, any> }>;
  selectedProjectId: string | null;
  uploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteFile: (file: any) => void;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
  gal: {
    setLightboxPhoto: (photo: any) => void;
    setLightboxIndex: (index: number) => void;
  };
}

export default function ProjectArchivos({ projectName, msConnected, doMicrosoftLogin, od, projectFiles, selectedProjectId, uploadFile, deleteFile, setForms, openModal, gal }: ProjectArchivosProps) {
  return (
    <div>
      {/* OneDrive Section */}
      {!msConnected ? (
        <div className="mb-4 bg-[#0078d4]/10 border border-[#0078d4]/20 rounded-xl p-6 text-center">
          <div className="text-[40px] mb-3">☁️</div>
          <div className="text-[15px] font-semibold mb-1">Conectar OneDrive</div>
          <div className="text-[13px] text-[var(--muted-foreground)] mb-4">Almacena planos, fotos y documentos en la nube</div>
          <button onClick={doMicrosoftLogin} className="px-5 py-2.5 bg-[#0078d4] text-white rounded-lg text-[13px] font-medium hover:bg-[#006cbd] transition-colors cursor-pointer border-none">Conectar con Microsoft</button>
        </div>
      ) : (
        <div className="mb-4">
          {!od.showOneDrive ? (
            <button className="w-full bg-gradient-to-r from-[#00a4ef] to-[#7fba00] text-white border-none rounded-xl py-3 text-sm font-semibold cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2" onClick={() => od.openOneDriveForProject(projectName)}>
              <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
              Abrir en OneDrive — {projectName}
            </button>
          ) : (
            <div className="card-elevated p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#00a4ef"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#00a4ef"/></svg>
                  <span className="text-sm font-semibold text-[#00a4ef]">OneDrive — {projectName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 skeuo-panel rounded-lg p-0.5">
                    <button onClick={() => od.setOdTab('files')} className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odTab === 'files' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}>📋 Archivos</button>
                    <button onClick={() => { od.setOdTab('gallery'); if (selectedProjectId) od.loadGalleryPhotos(selectedProjectId); }} className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odTab === 'gallery' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}>🖼️ Galería</button>
                  </div>
                  <button className="text-xs px-2 py-1.5 rounded-lg skeuo-btn cursor-pointer" onClick={() => { od.setShowOneDrive(false); od.setOneDriveFiles([]); od.setOdBreadcrumbs([]); od.setOdSearchQuery(''); od.setOdSearchResults([]); }}>✕</button>
                </div>
              </div>

              {od.odTab === 'gallery' ? (
                /* === Gallery View === */
                <div>
                  {od.galleryLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="skeuo-panel rounded-lg animate-pulse aspect-square" />
                      ))}
                    </div>
                  ) : od.odGalleryPhotos.length === 0 ? (
                    <div className="text-center py-8 text-[var(--af-text3)]">
                      <div className="text-3xl mb-2">🖼️</div>
                      <div className="text-sm">Sin fotos en la galería</div>
                      <div className="text-xs mt-1">Las imágenes de OneDrive aparecerán aquí</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {od.odGalleryPhotos.map((photo: any, idx: number) => (
                        <div key={photo.id || idx} className="relative group rounded-lg overflow-hidden cursor-pointer border border-[var(--border)] hover:border-[#00a4ef]/40 transition-all" onClick={() => { gal.setLightboxPhoto(photo); gal.setLightboxIndex(idx); }}>
                          <img
                            src={`${photo.thumbnailUrl || photo.thumbnailLarge || photo.webUrl}?access_token=${od.msAccessToken}`}
                            alt={photo.name || ''}
                            className="w-full aspect-square object-cover bg-[var(--af-bg3)]"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2212%22>🖼️</text></svg>'; }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end">
                            <div className="w-full px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="text-[10px] text-white truncate">{photo.name || 'Foto'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* === Files View === */
                <div>
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] min-w-0 flex-1 overflow-hidden">
                      <button onClick={() => { if (od.odProjectFolder) { od.setOdCurrentFolder(od.odProjectFolder); od.setOdBreadcrumbs([]); od.loadOneDriveFiles(od.odProjectFolder); } }} className="hover:text-[#00a4ef] truncate shrink-0 cursor-pointer bg-transparent border-none text-inherit">OneDrive</button>
                      {od.odBreadcrumbs.map((crumb, i) => (
                        <React.Fragment key={crumb.id}>
                          <span className="shrink-0">/</span>
                          <button onClick={() => od.navigateToFolder(crumb.id, i)} className="hover:text-[#00a4ef] truncate max-w-[80px] sm:max-w-[120px] cursor-pointer bg-transparent border-none text-inherit">{crumb.name}</button>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-shrink-0">
                      <input
                        value={od.odSearchQuery}
                        onChange={(e) => { od.setOdSearchQuery(e.target.value); if (e.target.value.length > 2) od.searchOneDriveFiles(e.target.value); else if (!e.target.value) od.setOdSearchResults([]); }}
                        placeholder="Buscar archivos..."
                        className="w-[150px] sm:w-[180px] pl-7 pr-2.5 py-1.5 text-[11px] rounded-lg skeuo-input outline-none focus:border-[#00a4ef]/40"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">🔍</span>
                      {od.odSearching && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-[#00a4ef]/30 border-t-[#00a4ef] rounded-full animate-spin" />}
                    </div>

                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 skeuo-panel rounded-lg p-0.5">
                      <button onClick={() => od.setOdViewMode('list')} className={`px-1.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odViewMode === 'list' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}>📋</button>
                      <button onClick={() => od.setOdViewMode('grid')} className={`px-1.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odViewMode === 'grid' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}>⊞</button>
                    </div>

                    {/* Upload */}
                    <label className="px-2.5 py-1.5 bg-[#00a4ef] text-white rounded-lg text-[11px] font-medium cursor-pointer hover:bg-[#0091d5] transition-colors flex items-center gap-1">
                      <span>⬆️</span> Subir
                      <input type="file" className="hidden" onChange={od.handleFileUpload} />
                    </label>
                  </div>

                  {/* Upload progress */}
                  {od.odUploading && (
                    <div className="mb-3 skeuo-panel rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium truncate max-w-[200px]">{od.odUploadFile}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">{od.odUploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-[#00a4ef] rounded-full transition-all duration-300" style={{ width: `${od.odUploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Drag & drop wrapper */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); od.setOdDragOver(true); }}
                    onDragLeave={() => od.setOdDragOver(false)}
                    onDrop={async (e) => { e.preventDefault(); od.setOdDragOver(false); await od.handleDroppedFiles(e.dataTransfer.files); }}
                    className={`rounded-lg transition-colors min-h-[120px] ${od.odDragOver ? 'ring-2 ring-[#00a4ef] bg-[#00a4ef]/5' : ''}`}
                  >
                    {od.msLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[#00a4ef]/30 border-t-[#00a4ef] rounded-full animate-spin mr-2" />
                        <span className="text-xs text-[var(--muted-foreground)]">Cargando archivos...</span>
                      </div>
                    ) : od.odSearchQuery && od.odSearchResults.length > 0 ? (
                      /* Search results */
                      <div className="space-y-1">
                        <div className="text-[10px] text-[var(--muted-foreground)] mb-2">{od.odSearchResults.length} resultado(s) para &quot;{od.odSearchQuery}&quot;</div>
                        {od.odSearchResults.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 py-2 px-2 skeuo-panel rounded-lg hover:bg-[var(--af-bg4)] transition-colors">
                            <span className="text-sm">{od.getFileIcon(f.mimeType || '', f.name)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{f.name}</div>
                              <div className="text-[10px] text-[var(--af-text3)]">{od.formatFileSize(f.size || 0)}</div>
                            </div>
                            <button onClick={() => od.downloadOneDriveFile(f.id, f.name)} className="text-[10px] text-[#00a4ef] px-1.5 py-0.5 rounded hover:bg-[#00a4ef]/10 cursor-pointer bg-transparent border-none">⬇️</button>
                          </div>
                        ))}
                      </div>
                    ) : od.odSearchQuery && !od.odSearching && od.odSearchResults.length === 0 ? (
                      <div className="text-center py-8 text-[var(--af-text3)]">
                        <div className="text-sm">Sin resultados para &quot;{od.odSearchQuery}&quot;</div>
                      </div>
                    ) : od.oneDriveFiles.length === 0 ? (
                      <div className="text-center py-8 text-[var(--af-text3)]">
                        <div className="text-3xl mb-2">☁️</div>
                        <div className="text-sm">Carpeta vacía</div>
                        <div className="text-xs mt-1">Arrastra archivos aquí o usa el botón &quot;Subir&quot;</div>
                      </div>
                    ) : od.odViewMode === 'grid' ? (
                      /* Grid view */
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {od.oneDriveFiles.map((f: any) => (
                          <div key={f.id} className={`skeuo-panel rounded-lg p-2.5 hover:border-[#00a4ef]/30 transition-all group ${f.folder ? 'cursor-pointer' : ''}`} onClick={() => { if (f.folder) { od.navigateToFolder(f.id); od.setOdBreadcrumbs((prev: OdBreadcrumb[]) => [...prev, { id: f.id, name: f.name }]); } }}>
                            <div className="w-9 h-9 bg-[var(--af-bg4)] rounded-lg flex items-center justify-center text-base mb-2">{od.getFileIcon(f.file?.mimeType || f.mimeType || '', f.name)}</div>
                            <div className="text-[11px] font-medium truncate mb-0.5">
                              {od.odRenaming === f.id ? (
                                <input
                                  autoFocus
                                  value={od.odRenameName}
                                  onChange={(e) => od.setOdRenameName(e.target.value)}
                                  onBlur={() => od.renameOneDriveFile(f.id, od.odRenameName)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') od.renameOneDriveFile(f.id, od.odRenameName); if (e.key === 'Escape') od.setOdRenaming(null); }}
                                  className="w-full px-1.5 py-0.5 text-[11px] rounded border border-[#00a4ef]/40 bg-[var(--card)] outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : f.name}
                            </div>
                            <div className="text-[10px] text-[var(--af-text3)]">{f.folder ? 'Carpeta' : od.formatFileSize(f.size || 0)}</div>
                            {f.lastModifiedDateTime && <div className="text-[9px] text-[var(--af-text3)]">{od.timeAgo(f.lastModifiedDateTime)}</div>}
                            {!f.folder && (
                              <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => od.downloadOneDriveFile(f.id, f.name)} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--card)] cursor-pointer bg-transparent border-none">⬇️</button>
                                <button onClick={() => { od.setOdRenaming(f.id); od.setOdRenameName(f.name); }} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--card)] cursor-pointer bg-transparent border-none">✏️</button>
                                <button onClick={async () => { if (await confirm({ title: 'Eliminar archivo', description: '¿Eliminar archivo de OneDrive?', confirmText: 'Eliminar', variant: 'destructive' })) { od.deleteFromOneDrive(f.id, od.odCurrentFolder); } }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer border-none hover:bg-red-500/20">✕</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* List view */
                      <div className="space-y-1">
                        {/* Column headers */}
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-[var(--muted-foreground)] font-medium border-b border-[var(--border)]">
                          <div className="w-7 shrink-0"></div>
                          <div className="flex-1 min-w-0">Nombre</div>
                          <div className="w-[60px] text-right shrink-0 hidden sm:block">Tamaño</div>
                          <div className="w-[70px] text-right shrink-0 hidden sm:block">Fecha</div>
                          <div className="w-[60px] shrink-0"></div>
                        </div>
                        {od.oneDriveFiles.map((f: any) => (
                          <div key={f.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--af-bg3)] transition-colors group ${f.folder ? 'cursor-pointer' : ''}`} onClick={() => { if (f.folder) { od.navigateToFolder(f.id); od.setOdBreadcrumbs((prev: OdBreadcrumb[]) => [...prev, { id: f.id, name: f.name }]); } }}>
                            <div className="w-7 h-7 bg-[var(--af-bg3)] rounded-md flex items-center justify-center text-sm flex-shrink-0">{od.getFileIcon(f.file?.mimeType || f.mimeType || '', f.name)}</div>
                            <div className="flex-1 min-w-0">
                              {od.odRenaming === f.id ? (
                                <input
                                  autoFocus
                                  value={od.odRenameName}
                                  onChange={(e) => od.setOdRenameName(e.target.value)}
                                  onBlur={() => od.renameOneDriveFile(f.id, od.odRenameName)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') od.renameOneDriveFile(f.id, od.odRenameName); if (e.key === 'Escape') od.setOdRenaming(null); }}
                                  className="w-full px-1.5 py-0.5 text-[11px] rounded border border-[#00a4ef]/40 bg-[var(--card)] outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className="text-[11px] font-medium truncate">{f.name}</div>
                              )}
                            </div>
                            <div className="w-[60px] text-right text-[10px] text-[var(--af-text3)] shrink-0 hidden sm:block">{f.folder ? '—' : od.formatFileSize(f.size || 0)}</div>
                            <div className="w-[70px] text-right text-[10px] text-[var(--af-text3)] shrink-0 hidden sm:block">{f.lastModifiedDateTime ? od.timeAgo(f.lastModifiedDateTime) : '—'}</div>
                            <div className="flex items-center gap-0.5 w-[60px] shrink-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              {!f.folder && (
                                <>
                                  <button onClick={() => od.downloadOneDriveFile(f.id, f.name)} className="text-[10px] px-1 py-0.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer bg-transparent border-none" title="Descargar">⬇️</button>
                                  <button onClick={() => { od.setOdRenaming(f.id); od.setOdRenameName(f.name); }} className="text-[10px] px-1 py-0.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer bg-transparent border-none" title="Renombrar">✏️</button>
                                </>
                              )}
                              <button onClick={async () => { if (await confirm({ title: 'Eliminar archivo', description: '¿Eliminar de OneDrive?', confirmText: 'Eliminar', variant: 'destructive' })) { od.deleteFromOneDrive(f.id, od.odCurrentFolder); } }} className="text-[10px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer border-none hover:bg-red-500/20" title="Eliminar">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Local Files Section */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">{projectFiles.length} archivos locales</div>
        <div>
          <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => document.getElementById('file-upload-input')?.click()}>
            + Subir archivo
          </button>
          <input id="file-upload-input" type="file" style={{ display: 'none' }} onChange={uploadFile} />
        </div>
      </div>
      {projectFiles.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">📂</div><div className="text-sm">Sin archivos subidos</div></div> :
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projectFiles.map(f => (
          <div key={f.id} className="card-elevated p-4 hover:border-[var(--input)] transition-all group">
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-lg">
                {f.data.type?.startsWith('image/') ? '🖼️' : f.data.type === 'application/pdf' ? '📄' : f.data.type?.includes('video') ? '🎬' : '📎'}
              </div>
              <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => deleteFile(f)}>✕</button>
            </div>
            <div className="text-sm font-medium truncate mb-0.5">{f.data.name}</div>
            <div className="text-[11px] text-[var(--af-text3)]">{fmtSize(f.data.size)}</div>
            {f.data.type?.startsWith('image/') && f.data.url && <div className="mt-2"><img src={f.data.url} alt={f.data.name} className="w-full h-24 object-cover rounded-lg border border-[var(--border)]" loading="lazy" /></div>}
            {f.data.url && <a href={f.data.url} download={f.data.name} className="text-[11px] text-[var(--af-accent)] mt-2 inline-block hover:underline">Descargar archivo</a>}
          </div>
        ))}
      </div>}
    </div>
  );
}
