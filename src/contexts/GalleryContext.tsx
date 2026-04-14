'use client';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, getStorage, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import type { GalleryPhoto, OneDriveFile } from '@/lib/types';
import { confirm } from '@/hooks/useConfirmDialog';

/* ===== GALLERY CONTEXT ===== */
interface GalleryContextType {
  // Collection state
  galleryPhotos: GalleryPhoto[];
  setGalleryPhotos: React.Dispatch<React.SetStateAction<GalleryPhoto[]>>;

  // Upload progress
  uploadProgress: number;

  // Domain UI state
  galleryFilterProject: string; setGalleryFilterProject: React.Dispatch<React.SetStateAction<string>>;
  galleryFilterCat: string; setGalleryFilterCat: React.Dispatch<React.SetStateAction<string>>;
  lightboxPhoto: GalleryPhoto | OneDriveFile | null; setLightboxPhoto: React.Dispatch<React.SetStateAction<GalleryPhoto | OneDriveFile | null>>;
  lightboxIndex: number; setLightboxIndex: React.Dispatch<React.SetStateAction<number>>;

  // CRUD Functions
  saveGalleryPhoto: () => Promise<void>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  handleGalleryImageSelect: (e: any) => Promise<void>;

  // Lightbox Functions
  openLightbox: (photo: GalleryPhoto | OneDriveFile, idx: number) => void;
  closeLightbox: () => void;
  lightboxPrev: () => void;
  lightboxNext: () => void;
  getFilteredGalleryPhotos: () => GalleryPhoto[];
}

const GalleryContext = createContext<GalleryContextType | null>(null);

/** Maximum file size: 10 MB (up from 5 MB — storage handles large files better) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Compress images larger than this to max 1600px on longest side */
const COMPRESSION_THRESHOLD = 800 * 1024; // 800 KB
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Compress an image file using canvas.
 * Returns a Blob of the compressed image, or the original if compression isn't needed.
 */
async function compressImage(file: File): Promise<Blob> {
  // Don't compress if already small enough
  if (file.size < COMPRESSION_THRESHOLD) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if exceeding max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function GalleryProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, openModal, closeModal, editingId, setEditingId } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // ===== COLLECTION STATE =====
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // ===== DOMAIN UI STATE =====
  const [galleryFilterProject, setGalleryFilterProject] = useState<string>('all');
  const [galleryFilterCat, setGalleryFilterCat] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | OneDriveFile | null>(null);
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

  // ===== CRUD FUNCTIONS =====

  const saveGalleryPhoto = useCallback(async () => {
    const imageData = forms.galleryImageData || '';
    if (!imageData) { showToast('Selecciona una foto', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();

      // If imageData starts with "data:" it's a base64 (new upload or legacy)
      if (imageData.startsWith('data:')) {
        setUploadProgress(10);
        showToast('Subiendo foto...', 'info');

        // Convert base64 to Blob
        const res = await fetch(imageData);
        const blob = await res.blob();

        // Compress if needed
        const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
        const compressed = await compressImage(file);
        setUploadProgress(30);

        // Upload to Firebase Storage
        const storage = getStorage();
        const projectId = forms.galleryProject || 'general';
        const timestamp = Date.now();
        const storagePath = `gallery/${authUser?.uid}/${projectId}/${timestamp}_${file.name}`;
        const storageRef = storage.ref(storagePath);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uploadTask: any = storageRef.put(compressed, {
          contentType: 'image/jpeg',
          customMetadata: { uploadedBy: authUser?.uid || '', projectId },
        });

        await new Promise<void>((resolveUpload, rejectUpload) => {
          uploadTask.on(
            'state_changed',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (snapshot: any) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(30 + progress * 0.6); // 30-90%
            },
            (error: Error) => rejectUpload(error),
            async () => {
              // Upload complete — get download URL
              try {
                const downloadURL = await storageRef.getDownloadURL();
                const metadata = await storageRef.getMetadata();

                const data = {
                  projectId: forms.galleryProject || '',
                  categoryName: forms.galleryCategory || 'Otro',
                  caption: forms.galleryCaption || '',
                  imageData: downloadURL,
                  storagePath,
                  fileName: file.name,
                  fileSize: metadata.size || compressed.size,
                  contentType: 'image/jpeg',
                  createdAt: ts,
                  createdBy: authUser?.uid,
                };

                if (editingId) {
                  // On edit: delete old storage file if it had one
                  const oldDoc = await db.collection('galleryPhotos').doc(editingId).get();
                  const oldData = oldDoc.data();
                  if (oldData?.storagePath) {
                    try { await storage.ref(oldData.storagePath).delete(); } catch { /* ignore */ }
                  }
                  await db.collection('galleryPhotos').doc(editingId).update(data);
                  showToast('Foto actualizada');
                } else {
                  await db.collection('galleryPhotos').add(data);
                  showToast('Foto agregada a galería');
                }

                setUploadProgress(100);
                resolveUpload();
              } catch (err) {
                rejectUpload(err);
              }
            }
          );
        });

        // Reset progress after a brief delay
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        // It's already a URL (e.g., re-saving with existing URL)
        const data = {
          projectId: forms.galleryProject || '',
          categoryName: forms.galleryCategory || 'Otro',
          caption: forms.galleryCaption || '',
          imageData,
          createdAt: ts,
          createdBy: authUser?.uid,
        };
        if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); }
        else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); }
      }

      closeModal('gallery');
      setEditingId(null);
      setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' }));
    } catch (err) {
      setUploadProgress(0);
      console.error('[ArchiFlow] Gallery: save photo failed:', err);
      showToast('Error al guardar foto', 'error');
    }
  }, [forms, authUser, editingId, showToast, closeModal, setEditingId, setForms]);

  const deleteGalleryPhoto = useCallback(async (id: string) => {
    if (!(await confirm({ title: 'Eliminar foto', description: '¿Eliminar foto de la galería?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try {
      const db = getFirebase().firestore();
      const doc = await db.collection('galleryPhotos').doc(id).get();
      const data = doc.data();

      // Delete from Firebase Storage if it has a storagePath
      if (data?.storagePath) {
        try {
          const storage = getStorage();
          await storage.ref(data.storagePath).delete();
        } catch (err) {
          console.warn('[ArchiFlow] Could not delete from Storage:', err);
        }
      }

      await db.collection('galleryPhotos').doc(id).delete();
      showToast('Foto eliminada');
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, [showToast]);

  const handleGalleryImageSelect = useCallback(async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; }
    if (file.size > MAX_FILE_SIZE) { showToast(`La imagen no puede superar ${MAX_FILE_SIZE / (1024 * 1024)} MB`, 'error'); return; }
    try {
      // Preview as base64 (will be uploaded to Storage on save)
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForms(p => ({ ...p, galleryImageData: preview }));
    } catch (err) { console.error('[ArchiFlow] Gallery: process image failed:', err); showToast('Error al procesar imagen', 'error'); }
  }, [showToast, setForms]);

  // ===== LIGHTBOX FUNCTIONS =====

  const getFilteredGalleryPhotos = useCallback(() => {
    let photos = galleryPhotos;
    if (galleryFilterProject !== 'all') photos = photos.filter((p: any) => p.data.projectId === galleryFilterProject);
    if (galleryFilterCat !== 'all') photos = photos.filter((p: any) => p.data.categoryName === galleryFilterCat);
    return photos;
  }, [galleryPhotos, galleryFilterProject, galleryFilterCat]);

  const openLightbox = useCallback((photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); }, []);
  const closeLightbox = useCallback(() => { setLightboxPhoto(null); setLightboxIndex(0); }, []);
  const lightboxPrev = useCallback(() => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev - 1 + filtered.length) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  }, [getFilteredGalleryPhotos]);
  const lightboxNext = useCallback(() => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev + 1) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  }, [getFilteredGalleryPhotos]);

  // ===== PROVIDER =====

  const value: GalleryContextType = useMemo(() => ({
    galleryPhotos, setGalleryPhotos,
    uploadProgress,
    galleryFilterProject, setGalleryFilterProject,
    galleryFilterCat, setGalleryFilterCat,
    lightboxPhoto, setLightboxPhoto,
    lightboxIndex, setLightboxIndex,
    saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect,
    openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos,
  }), [galleryPhotos, uploadProgress, galleryFilterProject, galleryFilterCat, lightboxPhoto, lightboxIndex,
      saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect, openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos]);

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGalleryContext() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGalleryContext must be used within GalleryProvider');
  return ctx;
}
