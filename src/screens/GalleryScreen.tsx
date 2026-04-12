'use client';

import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { PHOTO_CATS } from '@/lib/constants';

export default function GalleryScreen() {
  const galleryPhotos = useAppStore(s => s.galleryPhotos);
  const galleryFilterProject = useAppStore(s => s.galleryFilterProject);
  const galleryFilterCat = useAppStore(s => s.galleryFilterCat);
  const setGalleryFilterProject = useAppStore(s => s.setGalleryFilterProject);
  const setGalleryFilterCat = useAppStore(s => s.setGalleryFilterCat);
  const projects = useAppStore(s => s.projects);
  const setEditingId = useAppStore(s => s.setEditingId);
  const setForms = useAppStore(s => s.setForms);
  const openModal = useAppStore(s => s.openModal);
  const setLightboxPhoto = useAppStore(s => s.setLightboxPhoto);
  const setLightboxIndex = useAppStore(s => s.setLightboxIndex);
  const showToast = useAppStore(s => s.showToast);

  // Local computed: filtered gallery photos
  const getFilteredGalleryPhotos = () => {
    let photos = galleryPhotos;
    if (galleryFilterProject !== 'all') photos = photos.filter(p => p.data.projectId === galleryFilterProject);
    if (galleryFilterCat !== 'all') photos = photos.filter(p => p.data.categoryName === galleryFilterCat);
    return photos;
  };

  // TODO: connect to deleteGalleryPhoto (defined in page.tsx)
  const deleteGalleryPhoto = async (id: string) => { if (!confirm('¿Eliminar foto de la galería?')) return; try { await (window as any).firebase.firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch {} };

  // TODO: connect to openLightbox (defined in page.tsx)
  const openLightbox = (photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); };

  const filteredPhotos = getFilteredGalleryPhotos();

  return (<div className="animate-fadeIn p-4 sm:p-6 space-y-4">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold">📸 Galería de proyectos</h2>
      <p className="text-sm text-[var(--muted-foreground)]">{filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}</p>
    </div>
    <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' })); openModal('gallery'); }}>
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Agregar foto
    </button>
  </div>

  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-2">
    <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={galleryFilterProject} onChange={e => setGalleryFilterProject(e.target.value)}>
      <option value="all">Todos los proyectos</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
    </select>
    <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={galleryFilterCat} onChange={e => setGalleryFilterCat(e.target.value)}>
      <option value="all">Todas las categorías</option>
      {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>

  {/* Photo Grid */}
  {filteredPhotos.length === 0 ? (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🖼️</div>
      <div className="text-[var(--muted-foreground)]">No hay fotos en la galería</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">Agrega fotos de tus proyectos para documentar el progreso</div>
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
      {filteredPhotos.map((photo, idx) => {
        const proj = projects.find(p => p.id === photo.data.projectId);
        return (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)]/50 transition-all" onClick={() => openLightbox(photo, idx)}>
            <img src={photo.data.imageData} alt={photo.data.caption || 'Foto'} className="w-full h-full object-cover" loading="lazy" />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                {photo.data.caption && <div className="text-xs text-white font-medium truncate">{photo.data.caption}</div>}
                <div className="flex items-center gap-1 mt-0.5">
                  {proj && <span className="text-[10px] text-white/70 truncate">{proj.data.name}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white/90">{photo.data.categoryName}</span>
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <button className="w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs hover:bg-red-500 transition-colors" onClick={e => { e.stopPropagation(); deleteGalleryPhoto(photo.id); }}>✕</button>
              </div>
            </div>
            {/* Category badge always visible */}
            <div className="absolute top-1.5 left-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/40 text-white/90 backdrop-blur-sm">{photo.data.categoryName}</span>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>);
}
