'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, ModalFooter } from '@/components/common/FormField';
import { PHOTO_CATS } from '@/lib/types';

const DrawerModal = ({ open, onClose, children, maxWidth = 480 }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number }) => (
  <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }} handleOnly={false} dismissible={true}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
      <Drawer.Content className="bg-[var(--card)] border-t border-[var(--border)] rounded-t-2xl mx-auto z-[101] flex flex-col max-h-[85dvh] sm:max-h-[85vh]" style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined, width: '95vw' }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <Drawer.Handle className="w-10 h-[5px] rounded-full bg-[var(--muted-foreground)]/20 active:bg-[var(--muted-foreground)]/40 transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

export default function GalleryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, projects, editingId, saveGalleryPhoto, handleGalleryImageSelect, closeModal } = useApp();

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <div className="text-lg font-semibold mb-5 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        {editingId ? 'Editar foto' : 'Agregar foto'}
      </div>

      {/* Image preview / upload area */}
      <div className="mb-4">
        <FormField label="Foto" required>
          {forms.galleryImageData ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
              <img src={forms.galleryImageData} alt="Preview" className="w-full max-h-[200px] object-contain bg-[var(--af-bg3)]" />
              <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors" onClick={() => setForms(p => ({ ...p, galleryImageData: '' }))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
              <ImageIcon className="w-8 h-8 text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--muted-foreground)]">Toca para seleccionar una imagen</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG, WebP — máx. 5 MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleGalleryImageSelect} />
            </label>
          )}
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <FormField label="Proyecto">
          <FormSelect value={forms.galleryProject || ''} onChange={e => setForms(p => ({ ...p, galleryProject: e.target.value }))}>
            <option value="">Sin proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Categoría">
          <FormSelect value={forms.galleryCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, galleryCategory: e.target.value }))}>
            {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </FormSelect>
        </FormField>
      </div>

      <FormField label="Descripción">
        <FormInput placeholder="Ej: Vista frontal del proyecto" value={forms.galleryCaption || ''} onChange={e => setForms(p => ({ ...p, galleryCaption: e.target.value }))} />
      </FormField>

      <ModalFooter onCancel={() => closeModal('gallery')} onSubmit={saveGalleryPhoto} submitLabel={editingId ? 'Guardar' : 'Subir foto'} />
    </DrawerModal>
  );
}
