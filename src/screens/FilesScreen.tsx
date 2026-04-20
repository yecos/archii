'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import { getFirebaseIdToken } from '@/lib/firebase-service';
import { fmtSize } from '@/lib/helpers';

/* ===== Types ===== */
interface ODItem {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  folder?: Record<string, unknown>;
  file?: { mimeType?: string };
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  webUrl?: string;
  thumbnails?: Array<{ medium?: { url?: string } }>;
}

type TabKey = 'team' | 'personal';

/* ===== Helpers ===== */
const getFileIcon = (item: ODItem): string => {
  if (item.folder) return '📁';
  const name = (item.name || '').toLowerCase();
  const mime = item.file?.mimeType || item.mimeType || '';
  if (mime.includes('pdf') || name.endsWith('.pdf')) return '📄';
  if (mime.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|heic)$/)) return '🖼️';
  if (mime.includes('word') || name.match(/\.(doc|docx)$/)) return '📝';
  if (mime.includes('sheet') || name.includes('excel') || name.match(/\.(xls|xlsx)$/)) return '📊';
  if (mime.includes('presentation') || name.includes('powerpoint') || name.match(/\.(ppt|pptx)$/)) return '📽️';
  if (name.match(/\.(dwg|dxf)$/)) return '📐';
  if (name.match(/\.(zip|rar|7z)$/)) return '📦';
  if (mime.includes('video') || name.match(/\.(mp4|mov|avi|mkv)$/)) return '🎬';
  if (mime.includes('audio') || name.match(/\.(mp3|wav|ogg|aac)$/)) return '🎵';
  if (name.match(/\.(csv)$/)) return '📊';
  if (name.match(/\.(txt|md|log)$/)) return '📃';
  return '📎';
};

const formatTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-CO');
};

/* ===== Tenant OneDrive Hook ===== */
function useTenantOneDrive(tenantId: string | null) {
  const [items, setItems] = useState<ODItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check connection status
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const token = await getFirebaseIdToken();
        if (!token) return;
        const res = await fetch(`/api/tenants/onedrive/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ action: 'status', tenantId }),
        });
        if (res.ok) {
          const data = await res.json();
          setConnected(data.connected);
          setConnectedEmail(data.connectedByEmail);
        }
      } catch (err) {
        console.error('[Tenant OD] Status check error:', err);
      }
    })();
  }, [tenantId]);

  // Load files
  const loadFiles = useCallback(async (folderId?: string) => {
    if (!tenantId) return;
    const targetFolder = folderId || currentFolder;
    setLoading(true);
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const params = new URLSearchParams({ tenantId, folderId: targetFolder, top: '100' });
      const res = await fetch(`/api/tenants/onedrive/files?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.folderId && targetFolder === 'root') {
          setCurrentFolder(data.folderId);
        }
      } else if (res.status === 401) {
        const data = await res.json();
        if (data.code === 'TOKEN_EXPIRED') {
          // Try refreshing
          await refreshTenantToken(tenantId);
          // Get fresh token for retry
          const newToken = await getFirebaseIdToken();
          if (!newToken) return;
          const retryRes = await fetch(`/api/tenants/onedrive/files?${params}`, {
            headers: { 'Authorization': `Bearer ${newToken}` },
          });
          if (retryRes.ok) {
            const data2 = await retryRes.json();
            setItems(data2.items || []);
          }
        }
      }
    } catch (err) {
      console.error('[Tenant OD] Load files error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentFolder]);

  const refreshTenantToken = async (tid: string) => {
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      await fetch('/api/tenants/onedrive/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'refresh', tenantId: tid }),
      });
    } catch (err) {
      console.error('[Tenant OD] Refresh error:', err);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
    setRenamingId(null);
    loadFiles(folderId);
  };

  // Navigate breadcrumb
  const navigateBreadcrumb = (index: number) => {
    if (index === -1) {
      // Root
      setCurrentFolder('root');
      setBreadcrumbs([]);
      setSearchQuery('');
      setRenamingId(null);
      loadFiles('root');
    } else {
      const newCrumbs = breadcrumbs.slice(0, index + 1);
      const target = newCrumbs[newCrumbs.length - 1];
      setCurrentFolder(target.id);
      setBreadcrumbs(newCrumbs);
      setSearchQuery('');
      setRenamingId(null);
      loadFiles(target.id);
    }
  };

  // Upload file
  const uploadFile = async (file: File) => {
    if (!tenantId) return;
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(10);
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const formData = new FormData();
      formData.append('file', file);
      const params = new URLSearchParams({ tenantId, folderId: currentFolder });
      setUploadProgress(40);
      const res = await fetch(`/api/tenants/onedrive/files?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      setUploadProgress(90);
      if (res.ok) {
        loadFiles();
      } else {
        console.error('[Tenant OD] Upload error:', await res.text());
      }
    } catch (err) {
      console.error('[Tenant OD] Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(100);
      setUploadFileName('');
    }
  };

  // Delete file
  const deleteFile = async (itemId: string, itemName: string) => {
    if (!confirm(`¿Eliminar "${itemName}"?`)) return;
    if (!tenantId) return;
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const params = new URLSearchParams({ tenantId });
      const res = await fetch(`/api/tenants/onedrive/files/${itemId}?${params}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        loadFiles();
      }
    } catch (err) {
      console.error('[Tenant OD] Delete error:', err);
    }
  };

  // Rename file
  const renameFile = async (itemId: string, newName: string) => {
    if (!newName.trim() || !tenantId) return;
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const params = new URLSearchParams({ tenantId });
      const res = await fetch(`/api/tenants/onedrive/files/${itemId}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameName('');
        loadFiles();
      }
    } catch (err) {
      console.error('[Tenant OD] Rename error:', err);
    }
  };

  // Download file
  const downloadFile = async (itemId: string) => {
    if (!tenantId) return;
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const params = new URLSearchParams({ tenantId });
      const res = await fetch(`/api/tenants/onedrive/files/${itemId}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisp = res.headers.get('content-disposition');
        let filename = 'descargar';
        if (contentDisp) {
          const match = contentDisp.match(/filename\*=UTF-8''(.+)/i);
          if (match) filename = decodeURIComponent(match[1]);
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[Tenant OD] Download error:', err);
    }
  };

  // Create folder
  const createFolder = async (name: string) => {
    if (!name.trim() || !tenantId) return;
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      const res = await fetch('/api/tenants/onedrive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tenantId, folderId: currentFolder, name: name.trim() }),
      });
      if (res.ok) {
        setCreatingFolder(false);
        setNewFolderName('');
        loadFiles();
      }
    } catch (err) {
      console.error('[Tenant OD] Create folder error:', err);
    }
  };

  // Handle dropped files
  const handleDroppedFiles = (files: FileList) => {
    if (!connected) return;
    Array.from(files).forEach(file => uploadFile(file));
  };

  // Filter items by search
  const filteredItems = searchQuery
    ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return {
    items, filteredItems, loading, currentFolder, breadcrumbs,
    connected, connectedEmail, uploading, uploadProgress, uploadFileName,
    searchQuery, setSearchQuery, viewMode, setViewMode,
    renamingId, setRenamingId, renameName, setRenameName,
    creatingFolder, setCreatingFolder, newFolderName, setNewFolderName,
    dragOver, setDragOver, fileInputRef,
    loadFiles, navigateToFolder, navigateBreadcrumb, uploadFile,
    deleteFile, renameFile, downloadFile, createFolder, handleDroppedFiles,
  };
}

/* ===== Personal OneDrive Hook ===== */
function usePersonalOneDrive() {
  const { msConnected, msAccessToken, msRefreshToken, refreshMsToken, setMsTokenExpiry } = useApp();
  const [items, setItems] = useState<ODItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (folderId?: string) => {
    if (!msConnected) return;
    const targetFolder = folderId || currentFolder;
    setLoading(true);
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const params = new URLSearchParams({ folderId: targetFolder, top: '100' });
      const res = await fetch(`/api/onedrive/files?${params}`, {
        headers: { 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else if (res.status === 401) {
        const data = await res.json();
        if (data.code === 'TOKEN_EXPIRED' && msRefreshToken) {
          const newToken = await refreshMsToken();
          if (newToken) {
            setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
            const retryRes = await fetch(`/api/onedrive/files?${params}`, {
              headers: { 'x-firebase-token': fbToken, 'Authorization': `Bearer ${newToken}` },
            });
            if (retryRes.ok) {
              const data2 = await retryRes.json();
              setItems(data2.items || []);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Personal OD] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [msConnected, msAccessToken, msRefreshToken, currentFolder, refreshMsToken, setMsTokenExpiry]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
    setRenamingId(null);
    loadFiles(folderId);
  };

  const navigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolder('root');
      setBreadcrumbs([]);
      setSearchQuery('');
      setRenamingId(null);
      loadFiles('root');
    } else {
      const newCrumbs = breadcrumbs.slice(0, index + 1);
      const target = newCrumbs[newCrumbs.length - 1];
      setCurrentFolder(target.id);
      setBreadcrumbs(newCrumbs);
      setSearchQuery('');
      setRenamingId(null);
      loadFiles(target.id);
    }
  };

  const uploadFile = async (file: File) => {
    if (!msConnected) return;
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(10);
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const formData = new FormData();
      formData.append('file', file);
      const params = new URLSearchParams({ folderId: currentFolder });
      setUploadProgress(40);
      const res = await fetch(`/api/onedrive/files?${params}`, {
        method: 'POST',
        headers: { 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
        body: formData,
      });
      setUploadProgress(90);
      if (res.ok) {
        loadFiles();
      }
    } catch (err) {
      console.error('[Personal OD] Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(100);
      setUploadFileName('');
    }
  };

  const deleteFile = async (itemId: string, itemName: string) => {
    if (!confirm(`¿Eliminar "${itemName}"?`)) return;
    if (!msConnected) return;
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const res = await fetch(`/api/onedrive/files/${itemId}`, {
        method: 'DELETE',
        headers: { 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
      });
      if (res.ok) loadFiles();
    } catch (err) {
      console.error('[Personal OD] Delete error:', err);
    }
  };

  const renameFile = async (itemId: string, newName: string) => {
    if (!newName.trim() || !msConnected) return;
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const res = await fetch(`/api/onedrive/files/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameName('');
        loadFiles();
      }
    } catch (err) {
      console.error('[Personal OD] Rename error:', err);
    }
  };

  const downloadFile = async (itemId: string) => {
    if (!msConnected) return;
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const res = await fetch(`/api/onedrive/files/${itemId}`, {
        headers: { 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisp = res.headers.get('content-disposition');
        let filename = 'descargar';
        if (contentDisp) {
          const match = contentDisp.match(/filename\*=UTF-8''(.+)/i);
          if (match) filename = decodeURIComponent(match[1]);
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[Personal OD] Download error:', err);
    }
  };

  const createFolder = async (name: string) => {
    if (!name.trim() || !msConnected) return;
    try {
      const fbToken = await getFirebaseIdToken();
      if (!fbToken || !msAccessToken) return;
      const res = await fetch('/api/onedrive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-firebase-token': fbToken, 'Authorization': `Bearer ${msAccessToken}` },
        body: JSON.stringify({ folderId: currentFolder, folderName: name.trim(), projectId: '' }),
      });
      if (res.ok) {
        setCreatingFolder(false);
        setNewFolderName('');
        loadFiles();
      }
    } catch (err) {
      console.error('[Personal OD] Create folder error:', err);
    }
  };

  const handleDroppedFiles = (files: FileList) => {
    if (!msConnected) return;
    Array.from(files).forEach(file => uploadFile(file));
  };

  const filteredItems = searchQuery
    ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return {
    items, filteredItems, loading, currentFolder, breadcrumbs,
    uploading, uploadProgress, uploadFileName,
    searchQuery, setSearchQuery, viewMode, setViewMode,
    renamingId, setRenamingId, renameName, setRenameName,
    creatingFolder, setCreatingFolder, newFolderName, setNewFolderName,
    dragOver, setDragOver, fileInputRef,
    loadFiles, navigateToFolder, navigateBreadcrumb, uploadFile,
    deleteFile, renameFile, downloadFile, createFolder, handleDroppedFiles,
  };
}

/* ===== File Browser Component (shared) ===== */
function FileBrowser({
  od,
  title,
  emptyIcon,
  emptyText,
  emptySubtext,
  isConnected,
  onConnect,
  connectLabel,
  isTenantAdmin,
  tenantEmail,
}: {
  od: ReturnType<typeof useTenantOneDrive> | ReturnType<typeof usePersonalOneDrive>;
  title: string;
  emptyIcon: string;
  emptyText: string;
  emptySubtext: string;
  isConnected: boolean;
  onConnect?: () => void;
  connectLabel?: string;
  isTenantAdmin?: boolean;
  tenantEmail?: string | null;
}) {
  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">{emptyIcon}</div>
        <div className="text-[15px] font-semibold mb-1">{emptyText}</div>
        <div className="text-xs text-[var(--muted-foreground)] mb-4 max-w-xs mx-auto">{emptySubtext}</div>
        {onConnect && (
          <button
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors"
            style={{ backgroundColor: '#00a4ef' }}
            onClick={onConnect}
          >
            {connectLabel || 'Conectar'}
          </button>
        )}
        {tenantEmail && isTenantAdmin && (
          <div className="mt-3 text-[10px] text-[var(--af-text3)]">
            Conectado como: {tenantEmail}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar archivos..."
            value={od.searchQuery}
            onChange={e => od.setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--af-text3)] focus:outline-none focus:border-[var(--af-accent)] transition-colors"
          />
          {od.searchQuery && (
            <button onClick={() => od.setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {/* View mode toggle */}
          <button
            onClick={() => od.setViewMode(od.viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={od.viewMode === 'list' ? 'Vista cuadrícula' : 'Vista lista'}
          >
            {od.viewMode === 'list' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
            )}
          </button>
          {/* New folder */}
          <button
            onClick={() => od.setCreatingFolder(true)}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Nueva carpeta"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {/* Upload */}
          <button
            onClick={() => od.fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg text-[12px] font-medium text-white cursor-pointer transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--af-accent)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Subir
          </button>
          <input
            ref={od.fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach(f => od.uploadFile(f));
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-3 text-[11px] overflow-x-auto pb-1">
        <button
          onClick={() => od.navigateBreadcrumb(-1)}
          className="text-[var(--af-accent)] hover:underline whitespace-nowrap font-medium"
        >
          {title}
        </button>
        {od.breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            <svg className="w-3 h-3 text-[var(--af-text3)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            <button
              onClick={() => od.navigateBreadcrumb(i)}
              className={`hover:underline whitespace-nowrap ${i === od.breadcrumbs.length - 1 ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)]'}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Creating folder inline */}
      {od.creatingFolder && (
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-[var(--af-bg3)] rounded-lg border border-[var(--border)]">
          <span className="text-lg">📁</span>
          <input
            type="text"
            placeholder="Nombre de la carpeta..."
            value={od.newFolderName}
            onChange={e => od.setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') od.createFolder(od.newFolderName);
              if (e.key === 'Escape') { od.setCreatingFolder(false); od.setNewFolderName(''); }
            }}
            autoFocus
            className="flex-1 bg-transparent border-none text-[13px] text-[var(--foreground)] placeholder:text-[var(--af-text3)] focus:outline-none"
          />
          <button
            onClick={() => od.createFolder(od.newFolderName)}
            className="px-3 py-1 rounded text-[11px] font-medium bg-[var(--af-accent)] text-white"
          >
            Crear
          </button>
          <button
            onClick={() => { od.setCreatingFolder(false); od.setNewFolderName(''); }}
            className="px-2 py-1 rounded text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload progress */}
      {od.uploading && (
        <div className="mb-3 p-2.5 bg-[var(--af-accent)]/10 rounded-lg border border-[var(--af-accent)]/20">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 animate-spin text-[var(--af-accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[12px] text-[var(--af-accent)] font-medium truncate">{od.uploadFileName}</span>
          </div>
          <div className="h-1 bg-[var(--af-accent)]/20 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--af-accent)] rounded-full transition-all" style={{ width: od.uploadProgress + '%' }} />
          </div>
        </div>
      )}

      {/* Drop zone overlay */}
      {od.dragOver && (
        <div className="absolute inset-0 z-10 bg-[var(--af-accent)]/5 border-2 border-dashed border-[var(--af-accent)] rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm text-[var(--af-accent)] font-medium">Soltar archivos aquí</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {od.loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--af-bg3)]">
              <div className="w-8 h-8 rounded bg-[var(--af-bg4)] af-skeleton" />
              <div className="flex-1">
                <div className="h-3 w-32 rounded bg-[var(--af-bg4)] af-skeleton mb-1.5" />
                <div className="h-2 w-20 rounded bg-[var(--af-bg4)] af-skeleton" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!od.loading && od.filteredItems.length === 0 && (
        <div className="text-center py-12 text-[var(--af-text3)]">
          <div className="text-4xl mb-2">{od.searchQuery ? '🔍' : '📂'}</div>
          <div className="text-sm">
            {od.searchQuery ? 'No se encontraron resultados' : 'Carpeta vacía'}
          </div>
          {!od.searchQuery && (
            <div className="text-xs mt-1">Arrastra archivos aquí o usa el botón Subir</div>
          )}
        </div>
      )}

      {/* File Grid View */}
      {!od.loading && od.filteredItems.length > 0 && od.viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {od.filteredItems.map(item => (
            <div
              key={item.id}
              className="group bg-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--af-accent)]/40 transition-all cursor-pointer"
              onDoubleClick={() => {
                if (item.folder) od.navigateToFolder(item.id, item.name);
              }}
              onClick={() => {
                if (item.folder) od.navigateToFolder(item.id, item.name);
              }}
              onContextMenu={e => e.preventDefault()}
              onDragOver={e => { e.preventDefault(); od.setDragOver(true); }}
              onDragLeave={() => od.setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                od.setDragOver(false);
                if (e.dataTransfer.files.length > 0 && item.folder) {
                  // Navigate into folder then upload
                  od.navigateToFolder(item.id, item.name);
                  setTimeout(() => od.handleDroppedFiles(e.dataTransfer.files), 300);
                }
              }}
            >
              <div className="text-3xl text-center mb-2">{getFileIcon(item)}</div>
              <div className="text-[11px] font-medium truncate text-center" title={item.name}>{item.name}</div>
              {item.folder ? (
                <div className="text-[9px] text-[var(--af-text3)] text-center mt-0.5">Carpeta</div>
              ) : (
                <>
                  <div className="text-[9px] text-[var(--af-text3)] text-center mt-0.5">{fmtSize(item.size || 0)}</div>
                  <div className="flex justify-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); od.downloadFile(item.id); }}
                      className="p-1 rounded bg-[var(--af-bg4)] hover:bg-[var(--af-accent)]/20 text-[var(--muted-foreground)] hover:text-[var(--af-accent)] transition-colors"
                      title="Descargar"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); od.setRenamingId(item.id); od.setRenameName(item.name); }}
                      className="p-1 rounded bg-[var(--af-bg4)] hover:bg-amber-500/20 text-[var(--muted-foreground)] hover:text-amber-400 transition-colors"
                      title="Renombrar"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); od.deleteFile(item.id, item.name); }}
                      className="p-1 rounded bg-[var(--af-bg4)] hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File List View */}
      {!od.loading && od.filteredItems.length > 0 && od.viewMode === 'list' && (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {od.filteredItems.map(item => (
            <div
              key={item.id}
              className={`group flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--af-bg3)] transition-colors ${item.folder ? 'cursor-pointer' : ''}`}
              onDoubleClick={() => {
                if (item.folder) od.navigateToFolder(item.id, item.name);
              }}
              onClick={() => {
                if (item.folder) od.navigateToFolder(item.id, item.name);
              }}
              onContextMenu={e => e.preventDefault()}
              onDragOver={e => { e.preventDefault(); od.setDragOver(true); }}
              onDragLeave={() => od.setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                od.setDragOver(false);
                if (e.dataTransfer.files.length > 0 && item.folder) {
                  od.navigateToFolder(item.id, item.name);
                  setTimeout(() => od.handleDroppedFiles(e.dataTransfer.files), 300);
                }
              }}
            >
              {/* Renaming mode */}
              {od.renamingId === item.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-base">{getFileIcon(item)}</span>
                  <input
                    type="text"
                    value={od.renameName}
                    onChange={e => od.setRenameName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') od.renameFile(item.id, od.renameName);
                      if (e.key === 'Escape') { od.setRenamingId(null); od.setRenameName(''); }
                    }}
                    autoFocus
                    className="flex-1 bg-[var(--af-bg4)] border border-[var(--af-accent)] rounded px-2 py-1 text-[13px] text-[var(--foreground)] focus:outline-none"
                  />
                  <button
                    onClick={e => { e.stopPropagation(); od.renameFile(item.id, od.renameName); }}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--af-accent)] text-white"
                  >
                    OK
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); od.setRenamingId(null); od.setRenameName(''); }}
                    className="px-2 py-1 rounded text-[11px] text-[var(--muted-foreground)]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  {/* Thumbnail */}
                  <div className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-lg flex-shrink-0">
                    {item.thumbnails?.[0]?.medium?.url ? (
                      <img src={item.thumbnails[0].medium.url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      getFileIcon(item)
                    )}
                  </div>
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{item.name}</div>
                    <div className="text-[10px] text-[var(--af-text3)] flex items-center gap-2">
                      {item.folder ? (
                        <span>Carpeta</span>
                      ) : (
                        <>
                          <span>{fmtSize(item.size || 0)}</span>
                          {item.lastModifiedDateTime && (
                            <span>· {formatTimeAgo(item.lastModifiedDateTime)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Actions (hover) */}
                  {!item.folder && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); od.downloadFile(item.id); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] hover:text-[var(--af-accent)] transition-colors"
                        title="Descargar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); od.setRenamingId(item.id); od.setRenameName(item.name); }}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--muted-foreground)] hover:text-amber-400 transition-colors"
                        title="Renombrar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); od.deleteFile(item.id, item.name); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Main Files Screen ===== */
export default function FilesScreen() {
  const {
    activeTenantId, activeTenantRole, doMicrosoftLogin, msConnected,
    navigateTo, projects, setForms, setSelectedProjectId, loading,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('team');
  const [connectTenantMs, setConnectTenantMs] = useState(false);
  const [tenantConnecting, setTenantConnecting] = useState(false);

  const tenant = useTenantOneDrive(activeTenantId);
  const personal = usePersonalOneDrive();

  const isTenantAdmin = activeTenantRole === 'Super Admin';

  // Connect tenant MS account
  const handleTenantConnect = async () => {
    if (!activeTenantId || !isTenantAdmin) return;
    setTenantConnecting(true);
    try {
      // Use Microsoft login to get a fresh token
      const fb = (await import('@/lib/firebase-service')).getFirebase();
      const authNS = fb.auth;
      const authInstance = fb.auth();
      const provider = new authNS.OAuthProvider('microsoft.com');
      provider.addScope('Files.ReadWrite.All');
      provider.addScope('Sites.ReadWrite.All');
      provider.addScope('User.Read');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await authInstance.signInWithPopup(provider);
      const credential = result.credential as any;

      if (credential?.accessToken) {
        // Save to tenant
        const token = await getFirebaseIdToken();
        if (!token) return;
        const res = await fetch('/api/tenants/onedrive/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            action: 'save',
            tenantId: activeTenantId,
            accessToken: credential.accessToken,
            refreshToken: credential.refreshToken || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          tenant.loadFiles('root');
          setConnectTenantMs(false);
          // Refresh connection status
          const statusRes = await fetch('/api/tenants/onedrive/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'status', tenantId: activeTenantId }),
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            // We can't directly set tenant.connected since it's derived from the hook
            // But the hook will re-check on next render cycle
          }
        } else {
          const errData = await res.json();
          console.error('[Tenant OD] Connect error:', errData);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      console.error('[Tenant OD] Microsoft login error:', err);
    } finally {
      setTenantConnecting(false);
    }
  };

  // Disconnect tenant MS account
  const handleTenantDisconnect = async () => {
    if (!confirm('¿Desconectar la cuenta de Microsoft del equipo? Los archivos permanecerán en OneDrive.')) return;
    if (!activeTenantId) return;
    try {
      const token = await getFirebaseIdToken();
      if (!token) return;
      await fetch('/api/tenants/onedrive/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'disconnect', tenantId: activeTenantId }),
      });
      window.location.reload();
    } catch (err) {
      console.error('[Tenant OD] Disconnect error:', err);
    }
  };

  // Drag and drop for the active tab
  const currentOd = activeTab === 'team' ? tenant : personal;
  const currentConnected = activeTab === 'team' ? (tenant.connected === true) : msConnected;

  return (
    <div className="animate-fadeIn">
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center text-lg">
              📁
            </div>
            <div>
              <div className="text-[15px] font-semibold">Archivos</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Gestiona archivos del equipo y personales</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--af-bg3)] rounded-lg">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-2 px-3 rounded-md text-[12px] font-medium transition-all ${
              activeTab === 'team'
                ? 'bg-[var(--af-accent)] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            🏢 Archivos del Equipo
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 px-3 rounded-md text-[12px] font-medium transition-all ${
              activeTab === 'personal'
                ? 'bg-[var(--af-accent)] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            👤 Mi OneDrive
          </button>
        </div>
      </div>

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-5 relative"
          onDragOver={e => { e.preventDefault(); tenant.setDragOver(true); }}
          onDragLeave={() => tenant.setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            tenant.setDragOver(false);
            if (e.dataTransfer.files.length > 0) tenant.handleDroppedFiles(e.dataTransfer.files);
          }}
        >
          {/* Tenant connection status bar */}
          {tenant.connected && tenant.connectedEmail && (
            <div className="flex items-center justify-between mb-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-emerald-400">
                  Conectado: {tenant.connectedEmail}
                </span>
              </div>
              {isTenantAdmin && (
                <button
                  onClick={handleTenantDisconnect}
                  className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                >
                  Desconectar
                </button>
              )}
            </div>
          )}

          <FileBrowser
            od={tenant}
            title="Equipo"
            emptyIcon="🏢"
            emptyText="OneDrive del Equipo"
            emptySubtext={
              isTenantAdmin
                ? 'Conecta la cuenta de Microsoft 365 del equipo para compartir archivos con todos los miembros.'
                : 'El administrador del equipo aún no ha conectado la cuenta de Microsoft. Pídele que lo configure.'
            }
            isConnected={tenant.connected === true}
            onConnect={isTenantAdmin ? handleTenantConnect : undefined}
            connectLabel={tenantConnecting ? 'Conectando...' : 'Conectar Microsoft del Equipo'}
            isTenantAdmin={isTenantAdmin}
            tenantEmail={tenant.connectedEmail}
          />
        </div>
      )}

      {/* Personal Tab */}
      {activeTab === 'personal' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-5 relative"
          onDragOver={e => { e.preventDefault(); personal.setDragOver(true); }}
          onDragLeave={() => personal.setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            personal.setDragOver(false);
            if (e.dataTransfer.files.length > 0) personal.handleDroppedFiles(e.dataTransfer.files);
          }}
        >
          <FileBrowser
            od={personal}
            title="Mi OneDrive"
            emptyIcon="☁️"
            emptyText="Tu OneDrive Personal"
            emptySubtext="Conecta tu cuenta de Microsoft para gestionar tus archivos personales en la nube."
            isConnected={msConnected}
            onConnect={doMicrosoftLogin}
            connectLabel="Conectar con Microsoft"
          />
        </div>
      )}

      {/* Quick access to project folders */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold">Carpetas de Proyectos</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">
            {projects.length} proyectos
          </span>
        </div>
        <div className="text-xs text-[var(--muted-foreground)] mb-3">
          Accede rápidamente a los archivos de cada proyecto desde su vista de detalle.
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)]">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-xs">Sin proyectos aún</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {projects.slice(0, 8).map(p => (
              <button
                key={p.id}
                className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg p-3 text-left cursor-pointer hover:border-[var(--af-accent)]/40 transition-all group"
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setForms((f: any) => ({ ...f, detailTab: 'Archivos' }));
                  navigateTo('projectDetail', p.id);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📁</span>
                  <span className="text-[11px] font-medium truncate group-hover:text-[var(--af-accent)] transition-colors">{p.data.name}</span>
                </div>
                <span className="text-[9px] text-[var(--af-text3)]">{p.data.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
