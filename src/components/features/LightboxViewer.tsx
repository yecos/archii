'use client';
import { useGallery } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { X, Download, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function LightboxViewer() {
  const gallery = useGallery();
  const od = useOneDrive();
  const fs = useFirestore();

  if (!gallery.lightboxPhoto) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn" onClick={gallery.closeLightbox}>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors" onClick={gallery.closeLightbox}><X size={20} /></button>
        {/* OneDrive photo lightbox */}
        {gallery.lightboxPhoto && 'thumbnailLarge' in gallery.lightboxPhoto && (gallery.lightboxPhoto as any).thumbnailLarge || gallery.lightboxPhoto && 'thumbnailUrl' in gallery.lightboxPhoto && (gallery.lightboxPhoto as any).thumbnailUrl ? (
          <>
            {/* Download button */}
            <button className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => od.downloadOneDriveFile(gallery.lightboxPhoto!.id, 'name' in gallery.lightboxPhoto! ? gallery.lightboxPhoto.name : '')} title="Descargar"><Download size={18} /></button>
            {/* Image */}
            <img src={'thumbnailLarge' in gallery.lightboxPhoto! ? (gallery.lightboxPhoto as any).thumbnailLarge : (gallery.lightboxPhoto as any).webUrl} className="max-w-full max-h-[80dvh] object-contain rounded-lg" alt={'name' in gallery.lightboxPhoto! ? gallery.lightboxPhoto.name : ''} loading="lazy" />
            {/* Navigation */}
            <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
              <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => {
                const prev = (gallery.lightboxIndex - 1 + od.odGalleryPhotos.length) % od.odGalleryPhotos.length;
                gallery.setLightboxIndex(prev); gallery.setLightboxPhoto(od.odGalleryPhotos[prev]);
              }}>
                <ChevronLeft size={20} className="stroke-current" />
              </button>
              <span className="text-white/60 text-sm">{gallery.lightboxIndex + 1} / {od.odGalleryPhotos.length}</span>
              <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => {
                const next = (gallery.lightboxIndex + 1) % od.odGalleryPhotos.length;
                gallery.setLightboxIndex(next); gallery.setLightboxPhoto(od.odGalleryPhotos[next]);
              }}>
                <ChevronRight size={20} className="stroke-current" />
              </button>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-[11px] mt-2">{'name' in gallery.lightboxPhoto! ? gallery.lightboxPhoto.name : ''}</div>
          </>
        ) : (
          <>
            {/* Main gallery photo lightbox */}
            <div className="absolute top-3 left-3 z-10 text-left">
              {gallery.lightboxPhoto && 'data' in gallery.lightboxPhoto && gallery.lightboxPhoto.data.caption && <div className="text-white text-sm font-medium">{gallery.lightboxPhoto.data.caption}</div>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-white/15 text-white/80">{'data' in gallery.lightboxPhoto! ? gallery.lightboxPhoto.data.categoryName : ''}</span>
                {(() => { const proj = fs.projects.find(p => p.id === ('data' in gallery.lightboxPhoto! ? gallery.lightboxPhoto.data.projectId : '')); return proj ? <span className="text-xs text-white/60">{proj.data.name}</span> : null; })()}
              </div>
            </div>
            {/* Image */}
            <img src={'data' in gallery.lightboxPhoto ? gallery.lightboxPhoto.data.imageData : ''} alt={'data' in gallery.lightboxPhoto ? gallery.lightboxPhoto.data.caption || 'Foto' : 'Foto'} className="max-w-full max-h-[80dvh] object-contain rounded-lg" loading="lazy" />
            {/* Navigation */}
            <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
              <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={gallery.lightboxPrev}>
                <ChevronLeft size={20} className="stroke-current" />
              </button>
              <span className="text-white/60 text-sm">{gallery.lightboxIndex + 1} / {gallery.getFilteredGalleryPhotos().length}</span>
              <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={gallery.lightboxNext}>
                <ChevronRight size={20} className="stroke-current" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
