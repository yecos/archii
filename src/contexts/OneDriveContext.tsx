'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import type { OneDriveFile } from '@/lib/types';
import { confirm } from '@/hooks/useConfirmDialog';

/* ===== ONEDRIVE CONTEXT ===== */
interface OneDriveContextType {
  // State
  msAccessToken: string | null;
  setMsAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  msConnected: boolean;
  setMsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  msLoading: boolean;
  setMsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  oneDriveFiles: OneDriveFile[];
  setOneDriveFiles: React.Dispatch<React.SetStateAction<OneDriveFile[]>>;
  odProjectFolder: string | null;
  setOdProjectFolder: React.Dispatch<React.SetStateAction<string | null>>;
  showOneDrive: boolean;
  setShowOneDrive: React.Dispatch<React.SetStateAction<boolean>>;
  msRefreshToken: string | null;
  setMsRefreshToken: React.Dispatch<React.SetStateAction<string | null>>;
  msTokenExpiry: number;
  setMsTokenExpiry: React.Dispatch<React.SetStateAction<number>>;

  // Enhanced state
  odSearchQuery: string;
  setOdSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  odSearchResults: OneDriveFile[];
  setOdSearchResults: React.Dispatch<React.SetStateAction<OneDriveFile[]>>;
  odSearching: boolean;
  setOdSearching: React.Dispatch<React.SetStateAction<boolean>>;
  odBreadcrumbs: { id: string; name: string }[];
  setOdBreadcrumbs: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
  odCurrentFolder: string;
  setOdCurrentFolder: React.Dispatch<React.SetStateAction<string>>;
  odViewMode: 'list' | 'grid';
  setOdViewMode: React.Dispatch<React.SetStateAction<'list' | 'grid'>>;
  odRenaming: string | null;
  setOdRenaming: React.Dispatch<React.SetStateAction<string | null>>;
  odRenameName: string;
  setOdRenameName: React.Dispatch<React.SetStateAction<string>>;
  odUploading: boolean;
  setOdUploading: React.Dispatch<React.SetStateAction<boolean>>;
  odUploadProgress: number;
  setOdUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  odUploadFile: string;
  setOdUploadFile: React.Dispatch<React.SetStateAction<string>>;
  odDragOver: boolean;
  setOdDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  odTab: 'files' | 'gallery';
  setOdTab: React.Dispatch<React.SetStateAction<'files' | 'gallery'>>;
  galleryLoading: boolean;
  setGalleryLoading: React.Dispatch<React.SetStateAction<boolean>>;
  odGalleryPhotos: any[];
  setOdGalleryPhotos: React.Dispatch<React.SetStateAction<any[]>>;

  // Functions
  disconnectMicrosoft: () => void;
  refreshMsToken: () => Promise<string | null>;
  graphApiGet: (endpoint: string, useToken?: string) => Promise<any>;
  ensureProjectFolder: (projectName: string) => Promise<string | null>;
  loadOneDriveFiles: (folderId: string) => Promise<void>;
  uploadToOneDrive: (file: File, folderId: string) => Promise<void>;
  deleteFromOneDrive: (fileId: string, folderId: string) => Promise<void>;
  openOneDriveForProject: (projectName: string) => Promise<void>;
  formatFileSize: (bytes: number) => string;
  timeAgo: (dateStr: string) => string;
  getFileIcon: (mimeType: string, name?: string) => string;
  navigateToFolder: (folderId: string, breadcrumbIndex?: number) => Promise<void>;
  uploadFileWithProgress: (file: File) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDroppedFiles: (files: FileList) => Promise<void>;
  renameOneDriveFile: (fileId: string, newName: string) => Promise<void>;
  downloadOneDriveFile: (fileId: string, fileName: string) => Promise<void>;
  searchOneDriveFiles: (query: string) => Promise<void>;
  loadGalleryPhotos: (projectId: string) => Promise<void>;
}

const OneDriveContext = createContext<OneDriveContextType | null>(null);

export default function OneDriveProvider({ children }: { children: React.ReactNode }) {
  const { showToast, selectedProjectId } = useUIContext();
  const { msAuthCallbackRef } = useAuthContext();

  // State
  const [msAccessToken, setMsAccessToken] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFile[]>([]);
  const [odProjectFolder, setOdProjectFolder] = useState<string | null>(null);
  const [showOneDrive, setShowOneDrive] = useState(false);
  const [msRefreshToken, setMsRefreshToken] = useState<string | null>(null);
  const [msTokenExpiry, setMsTokenExpiry] = useState<number>(0);

  // Enhanced state
  const [odSearchQuery, setOdSearchQuery] = useState('');
  const [odSearchResults, setOdSearchResults] = useState<OneDriveFile[]>([]);
  const [odSearching, setOdSearching] = useState(false);
  const [odBreadcrumbs, setOdBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [odCurrentFolder, setOdCurrentFolder] = useState<string>('root');
  const [odViewMode, setOdViewMode] = useState<'list' | 'grid'>('list');
  const [odRenaming, setOdRenaming] = useState<string | null>(null);
  const [odRenameName, setOdRenameName] = useState('');
  const [odUploading, setOdUploading] = useState(false);
  const [odUploadProgress, setOdUploadProgress] = useState(0);
  const [odUploadFile, setOdUploadFile] = useState<string>('');
  const [odDragOver, setOdDragOver] = useState(false);
  const [odTab, setOdTab] = useState<'files' | 'gallery'>('files');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [odGalleryPhotos, setOdGalleryPhotos] = useState<any[]>([]);

  // ===== EFFECTS =====

  // Register MS auth callback with AuthContext so it can set our tokens
  useEffect(() => {
    msAuthCallbackRef.current = (token: string, refreshToken: string | null) => {
      setMsAccessToken(token);
      setMsConnected(true);
      setMsRefreshToken(refreshToken);
      setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
    };
    return () => { msAuthCallbackRef.current = null; };
  }, [msAuthCallbackRef]);

  // Restore Microsoft session
  useEffect(() => {
    const saved = localStorage.getItem('msConnected');
    const token = localStorage.getItem('msAccessToken');
    const refreshToken = localStorage.getItem('msRefreshToken');
    if (saved === 'true' && token) {
      setMsConnected(true);
      setMsAccessToken(token);
      if (refreshToken) setMsRefreshToken(refreshToken);
      setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
    }
  }, []);

  // ===== FUNCTIONS =====

  const disconnectMicrosoft = () => {
    setMsAccessToken(null);
    setMsConnected(false);
    setMsRefreshToken(null);
    setMsTokenExpiry(0);
    setOneDriveFiles([]);
    setOdProjectFolder(null);
    setOdBreadcrumbs([]);
    setOdCurrentFolder('root');
    setOdSearchQuery('');
    setOdSearchResults([]);
    localStorage.removeItem('msAccessToken');
    localStorage.removeItem('msConnected');
    localStorage.removeItem('msRefreshToken');
    showToast('Microsoft desconectado');
  };

  const refreshMsToken = useCallback(async () => {
    if (!msRefreshToken) return null;
    try {
      const res = await fetch('/api/onedrive/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: msRefreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          setMsAccessToken(data.accessToken);
          sessionStorage.setItem('archiflow-ms-token', data.accessToken);
          localStorage.setItem('msAccessToken', data.accessToken);
          setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
          if (data.refreshToken) {
            setMsRefreshToken(data.refreshToken);
            localStorage.setItem('msRefreshToken', data.refreshToken);
          }
          return data.accessToken;
        }
      }
    } catch (e) {
      console.error('Error refreshing MS token:', e);
    }
    return null;
  }, [msRefreshToken]);

  // Auto-refresh token effect
  useEffect(() => {
    if (!msConnected || !msRefreshToken) return;
    const interval = setInterval(async () => {
      if (Date.now() >= msTokenExpiry - 60000) {
        await refreshMsToken();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [msConnected, msRefreshToken, msTokenExpiry, refreshMsToken]);

  const graphApiGet = useCallback(async (endpoint: string, useToken?: string) => {
    const token = useToken || msAccessToken;
    if (!token) return null;
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 && !useToken) {
        const newToken = await refreshMsToken();
        if (newToken) return graphApiGet(endpoint, newToken);
        disconnectMicrosoft();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }, [msAccessToken, refreshMsToken]);

  const ensureProjectFolder = async (projectName: string) => {
    if (!msAccessToken) return null;
    setMsLoading(true);
    try {
      const root = await graphApiGet('/me/drive/root/children');
      if (!root) { setMsLoading(false); return null; }
      const archiFolder = root.value?.find((f: any) => f.name === 'ArchiFlow' && f.folder);
      let archiFolderId: string;
      if (archiFolder) {
        archiFolderId = archiFolder.id;
      } else {
        const created = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'ArchiFlow', folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
        });
        if (!created.ok) { setMsLoading(false); return null; }
        const createdData = await created.json();
        archiFolderId = createdData.id;
      }
      const projChildren = await graphApiGet(`/me/drive/items/${archiFolderId}/children`);
      if (!projChildren) { setMsLoading(false); return null; }
      const projFolder = projChildren.value?.find((f: any) => f.name === projectName && f.folder);
      let projFolderId: string;
      if (projFolder) {
        projFolderId = projFolder.id;
      } else {
        const pCreated = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${archiFolderId}/children`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
        });
        if (!pCreated.ok) { setMsLoading(false); return null; }
        const pCreatedData = await pCreated.json();
        projFolderId = pCreatedData.id;
      }
      setOdProjectFolder(projFolderId);
      setMsLoading(false);
      return projFolderId;
    } catch { setMsLoading(false); return null; }
  };

  const loadOneDriveFiles = async (folderId: string) => {
    if (!msAccessToken) return;
    setMsLoading(true);
    try {
      const data = await graphApiGet(`/me/drive/items/${folderId}/children?$top=50&orderby=name`);
      if (data?.value) {
        setOneDriveFiles(data.value);
      }
    } catch { showToast('Error al cargar archivos', 'error'); }
    setMsLoading(false);
  };

  const uploadToOneDrive = async (file: File, folderId: string) => {
    if (!msAccessToken) return;
    setMsLoading(true);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(file.name)}:/content`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${msAccessToken}` },
        body: file
      });
      if (res.ok) {
        showToast('Archivo subido a OneDrive');
        loadOneDriveFiles(folderId);
      } else {
        showToast('Error al subir archivo', 'error');
      }
    } catch { showToast('Error al subir', 'error'); }
    setMsLoading(false);
  };

  const deleteFromOneDrive = async (fileId: string, folderId: string) => {
    if (!(await confirm({ title: 'Eliminar archivo', description: '¿Eliminar archivo de OneDrive?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    setMsLoading(true);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${msAccessToken}` }
      });
      if (res.ok) { showToast('Eliminado de OneDrive'); loadOneDriveFiles(folderId); }
      else { showToast('Error al eliminar', 'error'); }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
    setMsLoading(false);
  };

  const openOneDriveForProject = async (projectName: string) => {
    const folderId = await ensureProjectFolder(projectName);
    if (folderId) {
      await loadOneDriveFiles(folderId);
      setOdCurrentFolder(folderId);
      setOdBreadcrumbs([{ id: folderId, name: projectName }]);
      setShowOneDrive(true);
      setOdTab('files');
      setOdSearchQuery('');
      setOdSearchResults([]);
    } else {
      showToast('No se pudo crear la carpeta del proyecto', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date().getTime();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString('es');
  };

  const getFileIcon = (mimeType: string, name?: string) => {
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('dwg') || mimeType.includes('dxf')) return '📐';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('video')) return '🎬';
    if (name?.endsWith('.pdf')) return '📄';
    if (name?.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|heic)$/i)) return '🖼️';
    if (name?.match(/\.(doc|docx)$/i)) return '📝';
    if (name?.match(/\.(xls|xlsx)$/i)) return '📊';
    if (name?.match(/\.(dwg|dxf)$/i)) return '📐';
    if (name?.match(/\.(zip|rar)$/i)) return '📦';
    if (name?.match(/\.(mp4|mov|avi|mkv)$/i)) return '🎬';
    return '📎';
  };

  const navigateToFolder = async (folderId: string, breadcrumbIndex?: number) => {
    setOdCurrentFolder(folderId);
    if (breadcrumbIndex !== undefined) {
      setOdBreadcrumbs(prev => prev.slice(0, breadcrumbIndex + 1));
    }
    await loadOneDriveFiles(folderId);
  };

  const uploadFileWithProgress = async (file: File) => {
    setOdUploading(true);
    setOdUploadProgress(0);
    setOdUploadFile(file.name);
    try {
      if (file.size < 4 * 1024 * 1024) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', odCurrentFolder);
        formData.append('projectId', selectedProjectId || '');
        setOdUploadProgress(50);
        const res = await fetch('/api/onedrive/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${msAccessToken}` },
          body: formData
        });
        setOdUploadProgress(100);
        if (res.ok) {
          showToast('Archivo subido a OneDrive');
          await loadOneDriveFiles(odCurrentFolder);
        } else {
          showToast('Error al subir archivo', 'error');
        }
      } else {
        const sessionRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/items/' + odCurrentFolder + ':/' + encodeURIComponent(file.name) + '/createUploadSession', {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } })
        });
        if (!sessionRes.ok) throw new Error('No se pudo crear la sesión de carga');
        const session = await sessionRes.json();
        const uploadUrl = session.uploadUrl;
        const chunkSize = 5 * 1024 * 1024;
        let offset = 0;
        while (offset < file.size) {
          const chunk = file.slice(offset, offset + chunkSize);
          const chunkRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': `bytes ${offset}-${Math.min(offset + chunkSize - 1, file.size - 1)}/${file.size}`,
              'Content-Length': String(chunk.size)
            },
            body: chunk
          });
          if (!chunkRes.ok) throw new Error('Error en la carga del fragmento');
          offset += chunkSize;
          setOdUploadProgress(Math.round((offset / file.size) * 100));
        }
        showToast('Archivo subido a OneDrive');
        await loadOneDriveFiles(odCurrentFolder);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error al subir archivo: ' + (err as Error).message, 'error');
    } finally {
      setTimeout(() => { setOdUploading(false); setOdUploadProgress(0); setOdUploadFile(''); }, 500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !odCurrentFolder) return;
    await uploadFileWithProgress(file);
    e.target.value = '';
  };

  const handleDroppedFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      await uploadFileWithProgress(files[i]);
    }
  };

  const renameOneDriveFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) { setOdRenaming(null); return; }
    try {
      const res = await fetch(`/api/onedrive/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        showToast('Archivo renombrado');
        setOdRenaming(null);
        await loadOneDriveFiles(odCurrentFolder);
      } else {
        showToast('Error al renombrar', 'error');
      }
    } catch { showToast('Error al renombrar', 'error'); }
  };

  const downloadOneDriveFile = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/onedrive/files/${fileId}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      } else {
        showToast('Error al descargar', 'error');
      }
    } catch { showToast('Error al descargar', 'error'); }
  };

  const searchOneDriveFiles = useCallback(async (query: string) => {
    if (!query.trim()) { setOdSearchResults([]); return; }
    setOdSearching(true);
    try {
      const res = await fetch(`/api/onedrive/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOdSearchResults(data.items || data.value || []);
      }
    } catch (e) { console.error(e); }
    setOdSearching(false);
  }, [msAccessToken]);

  const loadGalleryPhotos = useCallback(async (projectId: string) => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`/api/onedrive/gallery/${projectId}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOdGalleryPhotos(data.items || data.photos || []);
      }
    } catch (e) { console.error(e); }
    setGalleryLoading(false);
  }, [msAccessToken]);

  const value: OneDriveContextType = {
    msAccessToken, setMsAccessToken,
    msConnected, setMsConnected,
    msLoading, setMsLoading,
    oneDriveFiles, setOneDriveFiles,
    odProjectFolder, setOdProjectFolder,
    showOneDrive, setShowOneDrive,
    msRefreshToken, setMsRefreshToken,
    msTokenExpiry, setMsTokenExpiry,
    odSearchQuery, setOdSearchQuery,
    odSearchResults, setOdSearchResults,
    odSearching, setOdSearching,
    odBreadcrumbs, setOdBreadcrumbs,
    odCurrentFolder, setOdCurrentFolder,
    odViewMode, setOdViewMode,
    odRenaming, setOdRenaming,
    odRenameName, setOdRenameName,
    odUploading, setOdUploading,
    odUploadProgress, setOdUploadProgress,
    odUploadFile, setOdUploadFile,
    odDragOver, setOdDragOver,
    odTab, setOdTab,
    galleryLoading, setGalleryLoading,
    odGalleryPhotos, setOdGalleryPhotos,
    disconnectMicrosoft, refreshMsToken, graphApiGet,
    ensureProjectFolder, loadOneDriveFiles, uploadToOneDrive,
    deleteFromOneDrive, openOneDriveForProject,
    formatFileSize, timeAgo, getFileIcon,
    navigateToFolder, uploadFileWithProgress,
    handleFileUpload, handleDroppedFiles,
    renameOneDriveFile, downloadOneDriveFile,
    searchOneDriveFiles, loadGalleryPhotos,
  };

  return <OneDriveContext.Provider value={value}>{children}</OneDriveContext.Provider>;
}

export function useOneDriveContext() {
  const ctx = useContext(OneDriveContext);
  if (!ctx) throw new Error('useOneDriveContext must be used within OneDriveProvider');
  return ctx;
}
