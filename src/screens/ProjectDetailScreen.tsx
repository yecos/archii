'use client';
import React from 'react';
import { Plus, Eye, Pencil, Trash2, ChevronLeft, X } from 'lucide-react';
import { confirm } from '@/hooks/useConfirmDialog';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { fmtCOP, fmtDate, fmtSize, statusColor, prioColor, taskStColor } from '@/lib/helpers';

export default function ProjectDetailScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const gal = useGallery();
  const cmt = useComments();

  if (!fs.currentProject) return null;

  return (
<div className="animate-fadeIn space-y-4">
            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(fs.currentProject.data.status)}`}>{fs.currentProject.data.status}</span>
                  <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl mt-2">{fs.currentProject.data.name}</div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">{fs.currentProject.data.location && '📍 ' + fs.currentProject.data.location}{fs.currentProject.data.client ? ' · ' + fs.currentProject.data.client : ''}</div>
                  {fs.currentProject.data.description && <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">{fs.currentProject.data.description}</div>}
                </div>
                <div className="flex gap-3">
                  <div className="text-center"><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(fs.currentProject.data.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
                  <div className="text-center"><div className="text-lg font-semibold text-emerald-400">{fmtCOP(fs.projectSpent)}</div><div className="text-[10px] text-[var(--af-text3)]">Gastado</div></div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${(fs.currentProject.data.progress || 0) >= 80 ? 'bg-emerald-500' : (fs.currentProject.data.progress || 0) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: (fs.currentProject.data.progress || 0) + '%' }} /></div>
                <input type="number" min="0" max="100" className="w-14 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--foreground)] outline-none text-center focus:border-[var(--af-accent)]" value={fs.currentProject.data.progress || 0} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); fs.updateProjectProgress(v); }} />
                <span className="text-sm font-medium text-[var(--muted-foreground)]">%</span>
              </div>
              {fs.projectBudget > 0 && <div className="mt-3 text-xs text-[var(--muted-foreground)]">{fs.projectSpent > fs.projectBudget ? <span className="text-red-400 font-medium">⚠️ Excedido por {fmtCOP(fs.projectSpent - fs.projectBudget)}</span> : `Restante: ${fmtCOP(fs.projectBudget - fs.projectSpent)} (${Math.round((fs.projectSpent / fs.projectBudget) * 100)}% del presupuesto)`}</div>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
              {['Resumen', 'Tareas', 'Presupuesto', 'Archivos', 'Obra', 'Portal'].map(tab => (
                <button key={tab} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${ui.forms.detailTab === tab ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => ui.setForms(p => ({ ...p, detailTab: tab }))}>{tab}</button>
              ))}
            </div>

            {/* Tab: Resumen */}
            {ui.forms.detailTab === 'Resumen' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-4">Información</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Cliente</span><span>{fs.currentProject.data.client || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Ubicación</span><span>{fs.currentProject.data.location || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Inicio</span><span>{fs.currentProject.data.startDate || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Entrega</span><span>{fs.currentProject.data.endDate || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Presupuesto</span><span className="text-[var(--af-accent)] font-semibold">{fmtCOP(fs.currentProject.data.budget)}</span></div>
                </div>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-4">Actividad reciente</div>
                {fs.projectTasks.filter(t => t.data.status !== 'Completado').slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <div className={`w-2 h-2 rounded-full ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 text-sm truncate">{t.data.title}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                  </div>
                ))}
                {fs.projectTasks.filter(t => t.data.status !== 'Completado').length === 0 && <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin tareas pendientes</div>}
              </div>
            </div>)}

            {/* Tab: Tareas */}
            {ui.forms.detailTab === 'Tareas' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{fs.projectTasks.length} tareas en este proyecto</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { ui.setForms(p => ({ ...p, taskTitle: '', taskProject: ui.selectedProjectId, taskDue: new Date().toISOString().split('T')[0] })); ui.openModal('task'); }}>+ Nueva tarea</button>
              </div>
              {fs.projectTasks.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">✅</div><div className="text-sm">Sin tareas en este proyecto</div></div> :
              fs.projectTasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center hover:border-[var(--af-accent)] ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : ''}" onClick={() => fs.toggleTask(t.id, t.data.status)}>{t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
                    <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                      {t.data.dueDate && <span>📅 {fmtDate(t.data.dueDate)}</span>}
                      {t.data.assigneeId && <span>👤 {auth.getUserName(t.data.assigneeId)}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => fs.openEditTask(t)}><Pencil className="w-3 h-3" /></button>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => fs.deleteTask(t.id)}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>)}

            {/* Tab: Presupuesto */}
            {ui.forms.detailTab === 'Presupuesto' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{fs.projectExpenses.length} gastos · Total: <span className="text-[var(--af-accent)] font-semibold">{fmtCOP(fs.projectSpent)}</span> {fs.projectBudget > 0 && <span>de {fmtCOP(fs.projectBudget)}</span>}</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { ui.setForms(p => ({ ...p, expConcept: '', expProject: ui.selectedProjectId, expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); ui.openModal('expense'); }}>+ Registrar gasto</button>
              </div>
              {fs.projectBudget > 0 && <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-2"><span className="text-[var(--muted-foreground)]">Presupuesto utilizado</span><span className="font-semibold">{Math.min(100, Math.round((fs.projectSpent / fs.projectBudget) * 100))}%</span></div>
                <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${fs.projectSpent > fs.projectBudget ? 'bg-red-500' : fs.projectSpent > fs.projectBudget * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: Math.min(100, (fs.projectSpent / fs.projectBudget) * 100) + '%' }} /></div>
              </div>}
              {fs.projectExpenses.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">💰</div><div className="text-sm">Sin gastos registrados</div></div> :
              <div className="space-y-2">
                {fs.projectExpenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.data.concept}</div><div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div></div>
                    <div className="text-sm font-semibold text-[var(--af-accent)]">{fmtCOP(e.data.amount)}</div>
                    <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => fs.deleteExpense(e.id)}>✕</button>
                  </div>
                ))}
              </div>}
            </div>)}

            {/* Tab: Archivos */}
            {ui.forms.detailTab === 'Archivos' && (<div>
              {/* OneDrive Section */}
              {!od.msConnected ? (
                <div className="mb-4 bg-[#0078d4]/10 border border-[#0078d4]/20 rounded-xl p-6 text-center">
                  <div className="text-[40px] mb-3">☁️</div>
                  <div className="text-[15px] font-semibold mb-1">Conectar OneDrive</div>
                  <div className="text-[13px] text-[var(--muted-foreground)] mb-4">Almacena planos, fotos y documentos en la nube</div>
                  <button onClick={auth.doMicrosoftLogin} className="px-5 py-2.5 bg-[#0078d4] text-white rounded-lg text-[13px] font-medium hover:bg-[#006cbd] transition-colors cursor-pointer border-none">Conectar con Microsoft</button>
                </div>
              ) : (
                <div className="mb-4">
                  {!od.showOneDrive ? (
                    <button className="w-full bg-gradient-to-r from-[#00a4ef] to-[#7fba00] text-white border-none rounded-xl py-3 text-sm font-semibold cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2" onClick={() => fs.currentProject && od.openOneDriveForProject(fs.currentProject.data.name)}>
                      <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
                      Abrir en OneDrive — {fs.currentProject?.data.name}
                    </button>
                  ) : (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                      {/* Header with tabs */}
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#00a4ef"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#00a4ef"/></svg>
                          <span className="text-sm font-semibold text-[#00a4ef]">OneDrive — {fs.currentProject?.data.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 bg-[var(--af-bg3)] rounded-lg p-0.5">
                            <button onClick={() => od.setOdTab('files')} className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odTab === 'files' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}>📋 Archivos</button>
                            <button onClick={() => { od.setOdTab('gallery'); if (ui.selectedProjectId) od.loadGalleryPhotos(ui.selectedProjectId); }} className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${od.odTab === 'gallery' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}>🖼️ Galería</button>
                          </div>
                          <button className="text-xs px-2 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { od.setShowOneDrive(false); od.setOneDriveFiles([]); od.setOdBreadcrumbs([]); od.setOdSearchQuery(''); od.setOdSearchResults([]); }}>✕</button>
                        </div>
                      </div>

                      {od.odTab === 'gallery' ? (
                        /* === Gallery View === */
                        <div>
                          {od.galleryLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {Array.from({length: 8}).map((_, i) => (
                                <div key={i} className="bg-[var(--af-bg3)] rounded-lg animate-pulse aspect-square" />
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
                                className="w-[150px] sm:w-[180px] pl-7 pr-2.5 py-1.5 text-[11px] rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] outline-none focus:border-[#00a4ef]/40"
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">🔍</span>
                              {od.odSearching && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-[#00a4ef]/30 border-t-[#00a4ef] rounded-full animate-spin" />}
                            </div>

                            {/* View toggle */}
                            <div className="flex items-center gap-0.5 bg-[var(--af-bg3)] rounded-lg p-0.5">
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
                            <div className="mb-3 bg-[var(--af-bg3)] rounded-lg p-3">
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
                                  <div key={f.id} className="flex items-center gap-2 py-2 px-2 bg-[var(--af-bg3)] rounded-lg hover:bg-[var(--af-bg4)] transition-colors">
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
                                  <div key={f.id} className={`bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg p-2.5 hover:border-[#00a4ef]/30 transition-all group ${f.folder ? 'cursor-pointer' : ''}`} onClick={() => { if (f.folder) { od.navigateToFolder(f.id); od.setOdBreadcrumbs(prev => [...prev, { id: f.id, name: f.name }]); } }}>
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
                                  <div key={f.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--af-bg3)] transition-colors group ${f.folder ? 'cursor-pointer' : ''}`} onClick={() => { if (f.folder) { od.navigateToFolder(f.id); od.setOdBreadcrumbs(prev => [...prev, { id: f.id, name: f.name }]); } }}>
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

              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{fs.projectFiles.length} archivos locales</div>
                <div>
                  <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => document.getElementById('file-upload-input')?.click()}>
                    + Subir archivo
                  </button>
                  <input id="file-upload-input" type="file" style={{ display: 'none' }} onChange={fs.uploadFile} />
                </div>
              </div>
              {fs.projectFiles.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">📂</div><div className="text-sm">Sin archivos subidos</div></div> :
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fs.projectFiles.map(f => (
                  <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-lg">
                        {f.data.type?.startsWith('image/') ? '🖼️' : f.data.type === 'application/pdf' ? '📄' : f.data.type?.includes('video') ? '🎬' : '📎'}
                      </div>
                      <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => fs.deleteFile(f)}>✕</button>
                    </div>
                    <div className="text-sm font-medium truncate mb-0.5">{f.data.name}</div>
                    <div className="text-[11px] text-[var(--af-text3)]">{fmtSize(f.data.size)}</div>
                    {f.data.type?.startsWith('image/') && f.data.url && <div className="mt-2"><img src={f.data.url} alt={f.data.name} className="w-full h-24 object-cover rounded-lg border border-[var(--border)]" loading="lazy" /></div>}
                    {f.data.url && <a href={f.data.url} download={f.data.name} className="text-[11px] text-[var(--af-accent)] mt-2 inline-block hover:underline">Descargar archivo</a>}
                  </div>
                ))}
              </div>}
            </div>)}

            {/* Tab: Obra */}
            {ui.forms.detailTab === 'Obra' && (<div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1">
                  <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${ui.forms.workView === 'timeline' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => ui.setForms(p => ({ ...p, workView: 'timeline' }))}>Timeline</button>
                  <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${ui.forms.workView === 'gantt' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => ui.setForms(p => ({ ...p, workView: 'gantt' }))}>Gantt</button>
                  <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${ui.forms.workView === 'bitacora' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => ui.setForms(p => ({ ...p, workView: 'bitacora' }))}>📝 Bitácora</button>
                </div>
                <div className="flex gap-2">
                  {ui.forms.workView !== 'bitacora' && fs.workPhases.length === 0 && <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={fs.initDefaultPhases}>Inicializar fases</button>}
                </div>
              </div>

              {/* Sub-tab: Timeline */}
              {ui.forms.workView === 'timeline' && (fs.workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Haz clic en &quot;Inicializar fases&quot; para comenzar el seguimiento</div></div> : (
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--input)]" />
                {fs.workPhases.map(phase => {
                  const isActive = phase.data.status === 'En progreso', isDone = phase.data.status === 'Completada';
                  return (<div key={phase.id} className="relative mb-5">
                    <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--card)] ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)] shadow-[0_0_0_3px_rgba(200,169,110,0.2)]' : 'bg-[var(--af-bg4)] border-[var(--input)]'}`} />
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="text-sm font-semibold">{phase.data.name}</div>
                        <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-md px-2 py-1 text-xs text-[var(--foreground)] outline-none cursor-pointer" value={phase.data.status} onChange={e => fs.updatePhaseStatus(phase.id, e.target.value)}>
                          <option value="Pendiente">Pendiente</option><option value="En progreso">En progreso</option><option value="Completada">Completada</option>
                        </select>
                      </div>
                      {phase.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{phase.data.description}</div>}
                      <div className="flex items-center gap-3 text-[11px] text-[var(--af-text3)]">
                        {phase.data.startDate && <span>Inicio: {phase.data.startDate}</span>}
                        {phase.data.endDate && <span>Fin: {phase.data.endDate}</span>}
                      </div>
                    </div>
                  </div>);
                })}
              </div>
              ))}

              {/* Sub-tab: Gantt */}
              {ui.forms.workView === 'gantt' && (fs.workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Haz clic en &quot;Inicializar fases&quot; para comenzar el seguimiento</div></div> : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 overflow-x-auto">
                  {(() => {
                    const phasesWithDates = fs.workPhases.filter(ph => ph.data.startDate || ph.data.endDate);
                    const allDates = fs.workPhases.filter(ph => ph.data.startDate).map(ph => new Date(ph.data.startDate).getTime()).concat(fs.workPhases.filter(ph => ph.data.endDate).map(ph => new Date(ph.data.endDate).getTime()));
                    const timelineStart = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
                    const timelineEnd = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date(timelineStart.getTime() + 30 * 86400000);
                    const totalDays = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / 86400000) + 7);
                    const dayWidth = Math.max(24, Math.min(50, 700 / totalDays));
                    const ganttColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                    return phasesWithDates.length === 0 ? (
                      <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">Las fases necesitan fechas de inicio/fin para mostrar el Gantt. Edita las fases para agregar fechas.</div>
                    ) : (
                      <div>
                        <div className="flex text-[10px] text-[var(--muted-foreground)] mb-2 ml-[140px]" style={{ width: totalDays * dayWidth }}>
                          {Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
                            const d = new Date(timelineStart.getTime() + i * 86400000);
                            return <div key={i} className="flex-shrink-0 text-center" style={{ width: dayWidth }}>{d.getDate()}/{d.getMonth() + 1}</div>;
                          })}
                        </div>
                        {fs.workPhases.map((phase, idx) => {
                          const days = fs.calcGanttDays(phase.data.startDate, phase.data.endDate);
                          const offset = fs.calcGanttOffset(phase.data.startDate, timelineStart.toISOString());
                          const color = ganttColors[idx % ganttColors.length];
                          const isDone = phase.data.status === 'Completada';
                          const isActive = phase.data.status === 'En progreso';
                          return (
                            <div key={phase.id} className="flex items-center mb-1.5">
                              <div className="w-[130px] text-[11px] font-medium truncate pr-2 shrink-0 flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
                                {phase.data.name}
                              </div>
                              <div className="relative h-6" style={{ width: totalDays * dayWidth }}>
                                <div className={`absolute h-6 rounded-md flex items-center px-2 text-[10px] font-medium text-white ${isDone ? 'opacity-70' : ''}`} style={{ left: offset * dayWidth, width: Math.max(days * dayWidth, 20), backgroundColor: color }}>
                                  {days > 2 && phase.data.name.substring(0, 12)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* Sub-tab: Bitácora */}
              {ui.forms.workView === 'bitacora' && (
              <div>
                {/* Bitácora header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {cmt.dailyLogs.length} registro{cmt.dailyLogs.length !== 1 ? 's' : ''} de bitácora
                  </div>
                  <button
                    className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
                    onClick={() => { cmt.resetLogForm(); cmt.setSelectedLogId(null); cmt.setDailyLogTab('create'); }}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo Registro
                  </button>
                </div>

                {/* Bitácora: List view */}
                {cmt.dailyLogTab === 'list' && (
                  <div className="space-y-3">
                    {cmt.dailyLogs.length === 0 ? (
                      <div className="text-center py-14 text-[var(--af-text3)]">
                        <div className="text-5xl mb-3">📋</div>
                        <div className="text-sm font-medium mb-1">Sin registros de bitácora</div>
                        <div className="text-xs">Crea el primer registro diario con actividades, clima y personal</div>
                        <button className="mt-4 text-xs px-4 py-2 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors" onClick={() => { cmt.resetLogForm(); cmt.setDailyLogTab('create'); }}>
                          Crear primer registro
                        </button>
                      </div>
                    ) : (
                      cmt.dailyLogs.map(log => {
                        const d = log.data;
                        const logDate = new Date(d.date + 'T12:00:00');
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isToday = d.date === todayStr;
                        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                        const isYesterday = d.date === yesterday.toISOString().split('T')[0];
                        const dateLabel = isToday ? 'Hoy' : isYesterday ? 'Ayer' : logDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });

                        return (
                          <div key={log.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--input)] transition-all group">
                            {/* Log header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--af-bg3)]/30">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isToday ? 'bg-[var(--af-accent)]/15' : 'bg-[var(--af-bg4)]'}`}>
                                  {d.weather ? (() => { switch(d.weather) { case 'Soleado': return '☀️'; case 'Nublado': return '☁️'; case 'Lluvioso': return '🌧️'; case 'Parcialmente nublado': return '⛅'; case 'Tormenta': return '⛈️'; default: return '🌤️'; } })() : '📅'}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold capitalize">{dateLabel}</div>
                                  <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2">
                                    {d.weather && <span>{d.weather}</span>}
                                    {d.temperature && <span>· {d.temperature}°C</span>}
                                    {d.laborCount > 0 && <span>· {d.laborCount} personas</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent transition-colors" onClick={() => { cmt.setSelectedLogId(log.id); cmt.setDailyLogTab('detail'); }} title="Ver detalle">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent transition-colors" onClick={() => cmt.openEditLog(log)} title="Editar">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent transition-colors" onClick={async () => { if (await confirm({ title: 'Eliminar registro', description: '¿Eliminar este registro de bitácora?', confirmText: 'Eliminar', variant: 'destructive' })) cmt.deleteDailyLog(log.id); }} title="Eliminar">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                </button>
                              </div>
                            </div>

                            {/* Log summary */}
                            <div className="px-4 py-3">
                              {d.activities?.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Actividades</div>
                                  <div className="flex flex-wrap gap-1">
                                    {d.activities.map((a: string, i: number) => (
                                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--af-bg3)] text-[var(--foreground)]">{a}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {d.observations && (
                                <div className="text-[12px] text-[var(--muted-foreground)] mt-1 line-clamp-2">{d.observations}</div>
                              )}
                              {d.photos?.length > 0 && (
                                <div className="flex gap-1.5 mt-2">
                                  {d.photos!.slice(0, 4).map((p: string, i: number) => (
                                    <img key={i} src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]" loading="lazy" />
                                  ))}
                                  {d.photos!.length > 4 && <div className="w-14 h-14 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[11px] text-[var(--muted-foreground)] border border-[var(--border)]">+{d.photos!.length - 4}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Bitácora: Detail view */}
                {cmt.dailyLogTab === 'detail' && cmt.selectedLogId && (() => {
                  const log = cmt.dailyLogs.find((l: any) => l.id === cmt.selectedLogId);
                  if (!log) return <div className="text-center py-8 text-[var(--af-text3)]">Registro no encontrado</div>;
                  const d = log.data;
                  return (
                    <div className="space-y-4">
                      <button className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer border-none bg-transparent" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); }}>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Volver a bitácora
                      </button>

                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-lg font-semibold">{new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            <div className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                              {d.supervisor && <span>Supervisor: {d.supervisor}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {d.weather && <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--af-bg3)] text-xs">{(() => { switch(d.weather) { case 'Soleado': return '☀️'; case 'Nublado': return '☁️'; case 'Lluvioso': return '🌧️'; case 'Parcialmente nublado': return '⛅'; case 'Tormenta': return '⛈️'; default: return '🌤️'; } })()} {d.weather}</div>}
                            {d.temperature > 0 && <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--af-bg3)] text-xs">🌡️ {d.temperature}°C</div>}
                          </div>
                        </div>

                        {d.activities?.length > 0 && (
                          <div className="mb-4">
                            <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Actividades Realizadas</div>
                            <div className="space-y-1.5">
                              {d.activities!.map((a: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-1.5 flex-shrink-0" />
                                  {a}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {d.laborCount > 0 && (
                            <div className="bg-[var(--af-bg3)] rounded-lg p-3">
                              <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Personal en Obra</div>
                              <div className="text-xl font-semibold text-[var(--af-accent)]">{d.laborCount}</div>
                            </div>
                          )}
                          {d.equipment?.length > 0 && (
                            <div className="bg-[var(--af-bg3)] rounded-lg p-3">
                              <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Equipos</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {d.equipment!.map((e: string, i: number) => <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--card)]">{e}</span>)}
                              </div>
                            </div>
                          )}
                        </div>

                        {d.materials?.length > 0 && (
                          <div className="mb-4">
                            <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Materiales Utilizados</div>
                            <div className="flex flex-wrap gap-1">
                              {d.materials!.map((m: string, i: number) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{m}</span>)}
                            </div>
                          </div>
                        )}

                        {d.photos?.length > 0 && (
                          <div className="mb-4">
                            <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Fotos del Día ({d.photos!.length})</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {d.photos!.map((p: string, i: number) => <img key={i} src={p} alt="" className="w-full h-28 rounded-lg object-cover border border-[var(--border)] cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" />)}
                            </div>
                          </div>
                        )}

                        {d.observations && (
                          <div>
                            <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Observaciones</div>
                            <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap bg-[var(--af-bg3)] rounded-lg p-3">{d.observations}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Bitácora: Create/Edit form */}
                {cmt.dailyLogTab === 'create' && (
                  <div className="space-y-4">
                    <button className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer border-none bg-transparent" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); cmt.resetLogForm(); }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Volver a bitácora
                    </button>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                      <div className="text-[15px] font-semibold mb-4">{cmt.selectedLogId ? '✏️ Editar Registro' : '📝 Nuevo Registro'}</div>

                      {/* Date and Weather */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Fecha *</label>
                          <input type="date" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" value={cmt.logForm.date} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Clima</label>
                          <select className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] cursor-pointer" value={cmt.logForm.weather} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, weather: e.target.value }))}>
                            <option value="">Seleccionar...</option>
                            <option value="Soleado">☀️ Soleado</option>
                            <option value="Parcialmente nublado">⛅ Parcialmente nublado</option>
                            <option value="Nublado">☁️ Nublado</option>
                            <option value="Lluvioso">🌧️ Lluvioso</option>
                            <option value="Tormenta">⛈️ Tormenta</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Temperatura (°C)</label>
                          <input type="number" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="25" value={cmt.logForm.temperature} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, temperature: e.target.value }))} />
                        </div>
                      </div>

                      {/* Supervisor and Labor */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Supervisor</label>
                          <input type="text" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre del supervisor" value={cmt.logForm.supervisor} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, supervisor: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Personal en Obra</label>
                          <input type="number" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="10" value={cmt.logForm.laborCount} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, laborCount: e.target.value }))} />
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="mb-4">
                        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Actividades Realizadas</label>
                        <div className="space-y-2">
                          {(cmt.logForm.activities || ['']).map((a: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <input type="text" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder={`Actividad ${i + 1}`} value={a} onChange={e => { const arr = [...(cmt.logForm.activities || [''])]; arr[i] = e.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: arr })); }} />
                              {(cmt.logForm.activities || ['']).length > 1 && (
                                <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.activities || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: arr.length > 0 ? arr : [''] })); }}>
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: [...(p.activities || ['']), ''] }))}>
                            + Agregar actividad
                          </button>
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="mb-4">
                        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Equipos Utilizados</label>
                        <div className="space-y-2">
                          {(cmt.logForm.equipment || ['']).map((e: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <input type="text" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder={`Equipo ${i + 1}`} value={e} onChange={ev => { const arr = [...(cmt.logForm.equipment || [''])]; arr[i] = ev.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: arr })); }} />
                              {(cmt.logForm.equipment || ['']).length > 1 && (
                                <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.equipment || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: arr.length > 0 ? arr : [''] })); }}>
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: [...(p.equipment || ['']), ''] }))}>
                            + Agregar equipo
                          </button>
                        </div>
                      </div>

                      {/* Materials */}
                      <div className="mb-4">
                        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Materiales Utilizados</label>
                        <div className="space-y-2">
                          {(cmt.logForm.materials || ['']).map((m: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <input type="text" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder={`Material ${i + 1}`} value={m} onChange={ev => { const arr = [...(cmt.logForm.materials || [''])]; arr[i] = ev.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: arr })); }} />
                              {(cmt.logForm.materials || ['']).length > 1 && (
                                <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.materials || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: arr.length > 0 ? arr : [''] })); }}>
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: [...(p.materials || ['']), ''] }))}>
                            + Agregar material
                          </button>
                        </div>
                      </div>

                      {/* Photos */}
                      <div className="mb-4">
                        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Fotos del Día</label>
                        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                          {(cmt.logForm.photos || []).map((p: string, i: number) => (
                            <div key={i} className="relative flex-shrink-0 w-20 h-20">
                              <img src={p} alt="" className="w-full h-full rounded-lg object-cover border border-[var(--border)]" loading="lazy" />
                              <button className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center cursor-pointer border-none leading-none" onClick={() => { const arr = (cmt.logForm.photos || []).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((pf: Record<string, any>) => ({ ...pf, photos: arr })); }}>✕</button>
                            </div>
                          ))}
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--af-accent)]/40 transition-colors flex-shrink-0">
                            <input type="file" accept="image/*" className="hidden" multiple onChange={e => { const files = e.target.files; if (!files) return; Array.from(files).forEach(f => { const reader = new FileReader(); reader.onload = () => cmt.setLogForm((pf: Record<string, any>) => ({ ...pf, photos: [...(pf.photos || []), reader.result as string] })); reader.readAsDataURL(f); }); }} />
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </label>
                        </div>
                      </div>

                      {/* Observations */}
                      <div className="mb-5">
                        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Observaciones</label>
                        <textarea className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows={3} placeholder="Notas adicionales del día..." value={cmt.logForm.observations} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, observations: e.target.value }))} />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 justify-end">
                        <button className="px-4 py-2 rounded-lg text-sm border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer bg-transparent transition-colors" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); cmt.resetLogForm(); }}>Cancelar</button>
                        <button className="px-5 py-2 rounded-lg text-sm bg-[var(--af-accent)] text-background font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity" onClick={cmt.saveDailyLog}>{cmt.selectedLogId ? 'Actualizar' : 'Guardar Registro'}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>)}

            {/* Tab: Portal */}
            {ui.forms.detailTab === 'Portal' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">Vista del cliente</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { ui.setForms(p => ({ ...p, appTitle: '', appDesc: '' })); ui.openModal('approval'); }}>+ Nueva aprobación</button>
              </div>
              {/* Client summary */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl mb-2">{fs.currentProject.data.name}</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-3">{fs.currentProject.data.description || 'Sin descripción'}</div>
                <div className="flex items-center gap-3 mb-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(fs.currentProject.data.status)}`}>{fs.currentProject.data.status}</span><span className="text-sm font-medium">{fs.currentProject.data.progress || 0}% completado</span></div>
                <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: (fs.currentProject.data.progress || 0) + '%' }} /></div>
              </div>
              {/* Work phases for client */}
              {fs.workPhases.length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div className="text-[15px] font-semibold mb-3">Fases del proyecto</div>
                <div className="space-y-2">
                  {fs.workPhases.map(ph => (
                    <div key={ph.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-3 h-3 rounded-full ${ph.data.status === 'Completada' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
                      <span className="text-sm flex-1">{ph.data.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ph.data.status === 'Completada' ? 'bg-emerald-500/10 text-emerald-400' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{ph.data.status}</span>
                    </div>
                  ))}
                </div>
              </div>)}
              {/* Files gallery */}
              {fs.projectFiles.filter(f => f.data.type?.startsWith('image/')).length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div className="text-[15px] font-semibold mb-3">Galería</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {fs.projectFiles.filter(f => f.data.type?.startsWith('image/')).map(f => (
                    <a key={f.id} href={f.data.url} download={f.data.name}><img src={f.data.url} alt={f.data.name} className="w-full aspect-square object-cover rounded-lg border border-[var(--border)] hover:border-[var(--af-accent)] transition-all" loading="lazy" /></a>
                  ))}
                </div>
              </div>)}
              {/* Approvals */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-3">Aprobaciones</div>
                {fs.approvals.length === 0 ? <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin solicitudes de aprobación</div> :
                fs.approvals.map(a => (
                  <div key={a.id} className="border border-[var(--border)] rounded-lg p-3 mb-2">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-semibold">{a.data.title}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.data.status === 'Aprobada' ? 'bg-emerald-500/10 text-emerald-400' : a.data.status === 'Rechazada' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.data.status}</span>
                    </div>
                    {a.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{a.data.description}</div>}
                    {a.data.status === 'Pendiente' && (
                      <div className="flex gap-2 mt-2">
                        <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-emerald-500 hover:text-white transition-all" onClick={() => fs.updateApproval(a.id, 'Aprobada')}>✓ Aprobar</button>
                        <button className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-red-500 hover:text-white transition-all" onClick={() => fs.updateApproval(a.id, 'Rechazada')}>✕ Rechazar</button>
                        <button className="ml-auto text-xs text-[var(--af-text3)] cursor-pointer hover:text-red-400" onClick={() => fs.deleteApproval(a.id)}>Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>)}
          </div>
  );
}
