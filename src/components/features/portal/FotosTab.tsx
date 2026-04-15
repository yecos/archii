import { useGallery } from '@/hooks/useDomain';

interface FotosTabProps {
  projectId: string;
  photos: any[];
}

export default function FotosTab({ projectId, photos }: FotosTabProps) {
  const gal = useGallery();
  const filteredPhotos = photos;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">
          {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">🖼️</div>
          <div className="text-sm">Sin fotos en este proyecto</div>
          <div className="text-xs mt-1">Las fotos del progreso se agregarán aquí</div>
        </div>
      ) : (
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))' }}
        >
          {filteredPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden skeuo-well cursor-pointer hover:border-[var(--af-accent)]/50 transition-all"
              onClick={() => {
                gal.setGalleryFilterProject(projectId);
                gal.setGalleryFilterCat('all');
                gal.openLightbox(photo, idx);
              }}
            >
              <img
                src={photo.data.imageData}
                alt={photo.data.caption || 'Foto'}
                className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                loading="lazy"
                onLoad={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '1';
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  {photo.data.caption && (
                    <div className="text-xs text-white font-medium truncate">
                      {photo.data.caption}
                    </div>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white/90 mt-0.5 inline-block">
                    {photo.data.categoryName}
                  </span>
                </div>
              </div>
              {/* Category badge always visible */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/40 text-white/90 backdrop-blur-sm">
                  {photo.data.categoryName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
