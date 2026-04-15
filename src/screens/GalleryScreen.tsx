'use client';
import React, { useState } from 'react';
import { Plus, Camera, Image as ImageIcon } from 'lucide-react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { SkeletonGallery } from '@/components/ui/SkeletonLoaders';
import { PHOTO_CATS } from '@/lib/types';

export default function GalleryScreen() {
  const ui = useUI();
  const fs = useFirestore();
  const gallery = useGallery();
  const od = useOneDrive();
  const [photoLimit, setPhotoLimit] = useState(24);

  const uploadActive = gallery.uploadProgress > 0 && gallery.uploadProgress < 100;

  return (
    <div className="animate-fadeIn p-4 sm:p-6 space-y-4">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold"><Camera size={18} className="inline mr-1.5 text-[var(--af-accent)]" />Galería de proyectos</h2>
      <p className="text-sm text-[var(--muted-foreground)]">{gallery.getFilteredGalleryPhotos().length} foto{gallery.getFilteredGalleryPhotos().length !== 1 ? 's' : ''}</p>
    </div>
    <button className="skeuo-btn px-4 py-2 text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none flex items-center gap-2 self-start" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' })); ui.openModal('gallery'); }}>
      <Plus className="w-4 h-4" strokeWidth={2} />
      Agregar foto
    </button>
  </div>

  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-2">
    <select className="flex-1 skeuo-input rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={gallery.galleryFilterProject} onChange={e => gallery.setGalleryFilterProject(e.target.value)}>
      <option value="all">Todos los proyectos</option>
      {fs.projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
    </select>
    <select className="flex-1 skeuo-input rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={gallery.galleryFilterCat} onChange={e => gallery.setGalleryFilterCat(e.target.value)}>
      <option value="all">Todas las categorías</option>
      {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>

  {/* Upload Progress */}
  {uploadActive && (
    <div className="card-elevated rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Subiendo foto...</span>
        <span className="text-sm text-[var(--muted-foreground)]">{Math.round(gallery.uploadProgress)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--af-accent)] transition-all duration-300" style={{ width: `${gallery.uploadProgress}%` }} />
      </div>
    </div>
  )}

  {/* Loading skeleton */}
  {od.galleryLoading && <SkeletonGallery />}

  {/* Photo Grid */}
  {!od.galleryLoading && gallery.getFilteredGalleryPhotos().length === 0 ? (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-3"><ImageIcon size={24} className="text-[var(--af-text3)]" /></div>
      <div className="text-[var(--muted-foreground)]">No hay fotos en la galería</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">Agrega fotos de tus proyectos para documentar el progreso</div>
    </div>
  ) : (
    <>
    <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))' }}>
      {gallery.getFilteredGalleryPhotos().slice(0, photoLimit).map((photo, idx) => {
        const proj = fs.projects.find(p => p.id === photo.data.projectId);
        return (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] cursor-pointer hover:shadow-[var(--skeuo-shadow-raised)] transition-all" onClick={() => gallery.openLightbox(photo, idx)}>
            <img src={photo.data.imageData} alt={photo.data.caption || 'Foto'} className="w-full h-full object-cover opacity-0 transition-opacity duration-300" loading="lazy" onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1' }} />
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
                <button className="w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs hover:bg-red-500 transition-colors" onClick={e => { e.stopPropagation(); gallery.deleteGalleryPhoto(photo.id); }}>✕</button>
              </div>
            </div>
            {/* Category badge always visible */}
            <div className="absolute top-1.5 left-1.5">
              <span className="skeuo-badge text-[10px] px-2 py-0.5 bg-[var(--skeuo-raised)]/90 text-[var(--foreground)] border-[var(--skeuo-edge-light)] backdrop-blur-sm">{photo.data.categoryName}</span>
            </div>
          </div>
        );
      })}
    </div>
    {photoLimit < gallery.getFilteredGalleryPhotos().length && (
      <div className="text-center py-4">
        <button className="skeuo-btn px-5 py-2.5 text-[13px] font-medium cursor-pointer text-[var(--foreground)]" onClick={() => setPhotoLimit(prev => prev + 24)}>
          Cargar mas fotos ({gallery.getFilteredGalleryPhotos().length - photoLimit} restantes)
        </button>
      </div>
    )}
    </>
  )}
</div>
  );
}
