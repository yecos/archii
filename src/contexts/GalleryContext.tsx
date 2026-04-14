'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { confirm } from '@/hooks/useConfirmDialog';

/* ===== GALLERY CONTEXT ===== */
interface GalleryContextType {
  // Collection state
  galleryPhotos: any[];
  setGalleryPhotos: React.Dispatch<React.SetStateAction<any[]>>;

  // Domain UI state
  galleryFilterProject: string; setGalleryFilterProject: React.Dispatch<React.SetStateAction<string>>;
  galleryFilterCat: string; setGalleryFilterCat: React.Dispatch<React.SetStateAction<string>>;
  lightboxPhoto: any; setLightboxPhoto: React.Dispatch<React.SetStateAction<any>>;
  lightboxIndex: number; setLightboxIndex: React.Dispatch<React.SetStateAction<number>>;

  // CRUD Functions
  saveGalleryPhoto: () => Promise<void>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  handleGalleryImageSelect: (e: any) => Promise<void>;

  // Lightbox Functions
  openLightbox: (photo: any, idx: number) => void;
  closeLightbox: () => void;
  lightboxPrev: () => void;
  lightboxNext: () => void;
  getFilteredGalleryPhotos: () => any[];
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export default function GalleryProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, openModal, closeModal, editingId, setEditingId } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // ===== COLLECTION STATE =====
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);

  // ===== DOMAIN UI STATE =====
  const [galleryFilterProject, setGalleryFilterProject] = useState<string>('all');
  const [galleryFilterCat, setGalleryFilterCat] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // ===== EFFECTS =====

  // Load gallery photos
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setGalleryPhotos(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando galleryPhotos:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // ===== HELPER =====

  const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ===== CRUD FUNCTIONS =====

  const saveGalleryPhoto = async () => {
    const imageData = forms.galleryImageData || '';
    if (!imageData) { showToast('Selecciona una foto', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const data = { projectId: forms.galleryProject || '', categoryName: forms.galleryCategory || 'Otro', caption: forms.galleryCaption || '', imageData, createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); }
      else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); }
      closeModal('gallery'); setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' }));
    } catch { showToast('Error al guardar foto', 'error'); }
  };

  const deleteGalleryPhoto = async (id: string) => { if (!(await confirm({ title: 'Eliminar foto', description: '¿Eliminar foto de la galería?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const handleGalleryImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', 'error'); return; }
    try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, galleryImageData: base64 })); }
    catch { showToast('Error al procesar imagen', 'error'); }
  };

  // ===== LIGHTBOX FUNCTIONS =====

  const openLightbox = (photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxPhoto(null); setLightboxIndex(0); };
  const lightboxPrev = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev - 1 + filtered.length) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  };
  const lightboxNext = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev + 1) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  };

  const getFilteredGalleryPhotos = () => {
    let photos = galleryPhotos;
    if (galleryFilterProject !== 'all') photos = photos.filter((p: any) => p.data.projectId === galleryFilterProject);
    if (galleryFilterCat !== 'all') photos = photos.filter((p: any) => p.data.categoryName === galleryFilterCat);
    return photos;
  };

  // ===== PROVIDER =====

  const value: GalleryContextType = useMemo(() => ({
    galleryPhotos, setGalleryPhotos,
    galleryFilterProject, setGalleryFilterProject,
    galleryFilterCat, setGalleryFilterCat,
    lightboxPhoto, setLightboxPhoto,
    lightboxIndex, setLightboxIndex,
    saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect,
    openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos,
  }), [galleryPhotos, galleryFilterProject, galleryFilterCat, lightboxPhoto, lightboxIndex, saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect, openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos]);

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGalleryContext() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGalleryContext must be used within GalleryProvider');
  return ctx;
}
