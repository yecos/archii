'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebaseIdToken } from '@/lib/firebase-service';

export interface NasFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: string;
}

interface NasListResponse {
  items?: NasFileItem[];
  projectId?: string;
  path?: string;
}

function parentPath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const parts = clean.split('/');
  parts.pop();
  return parts.join('/');
}

export function useNasStorage(tenantId: string | null, projectId: string | null) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [online, setOnline] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<NasFileItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apiRequest = useCallback(async (
    action: string,
    init: RequestInit = {},
    extra: Record<string, string> = {}
  ) => {
    if (!tenantId) throw new Error('Tenant no disponible');
    const token = await getFirebaseIdToken();
    if (!token) throw new Error('Sesión no autenticada');

    const params = new URLSearchParams({ action, tenantId, ...extra });
    if (projectId) params.set('projectId', projectId);

    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`/api/nas?${params.toString()}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      let message = `Error NAS HTTP ${response.status}`;
      let code = '';
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
        if (body?.code) code = body.code;
      } catch {
        // ignore JSON parse errors
      }
      const err = new Error(message) as Error & { status?: number; code?: string };
      err.status = response.status;
      err.code = code;
      throw err;
    }

    return response;
  }, [tenantId, projectId]);

  const checkStatus = useCallback(async () => {
    if (!tenantId || !projectId) {
      setAvailable(false);
      return false;
    }

    try {
      const response = await apiRequest('status');
      const body = await response.json();
      setAvailable(true);
      setOnline(body?.bridge?.ok !== false);
      setError(null);
      return true;
    } catch (err: any) {
      if (err?.status === 404) {
        setAvailable(false);
        setOnline(false);
        setError(null);
        return false;
      }
      setAvailable(true);
      setOnline(false);
      setError(err instanceof Error ? err.message : 'NAS no disponible');
      return false;
    }
  }, [tenantId, projectId, apiRequest]);

  const list = useCallback(async (path = currentPath) => {
    if (!tenantId || !projectId) return;
    setLoading(true);
    try {
      const response = await apiRequest('list', {}, { path });
      const body = await response.json() as NasListResponse;
      setItems(body.items || []);
      setCurrentPath(body.path ?? path);
      setInitialized(true);
      setOnline(true);
      setError(null);
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'PROJECT_STORAGE_NOT_FOUND') {
        setItems([]);
        setInitialized(false);
      } else {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los archivos');
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, projectId, currentPath, apiRequest]);

  const ensureProjectStorage = useCallback(async () => {
    setLoading(true);
    try {
      await apiRequest('ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setInitialized(true);
      setCurrentPath('');
      await list('');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, list]);

  const createFolder = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    await apiRequest('folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, name: clean }),
    });
    await list(currentPath);
  }, [apiRequest, currentPath, list]);

  const upload = useCallback(async (file: File) => {
    await apiRequest('upload', {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }, {
      path: currentPath,
      name: file.name,
    });
    await list(currentPath);
  }, [apiRequest, currentPath, list]);

  const rename = useCallback(async (item: NasFileItem, newName: string) => {
    const clean = newName.trim();
    if (!clean || clean === item.name) return;
    await apiRequest('rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path, newName: clean }),
    });
    await list(currentPath);
  }, [apiRequest, currentPath, list]);

  const move = useCallback(async (item: NasFileItem, destination: string) => {
    await apiRequest('move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path, destination }),
    });
    await list(currentPath);
  }, [apiRequest, currentPath, list]);

  const remove = useCallback(async (item: NasFileItem) => {
    await apiRequest('delete', { method: 'DELETE' }, { path: item.path });
    await list(currentPath);
  }, [apiRequest, currentPath, list]);

  const download = useCallback(async (item: NasFileItem) => {
    if (item.isDirectory) return;
    const response = await apiRequest('download', {}, { path: item.path });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [apiRequest]);

  const openFolder = useCallback(async (item: NasFileItem) => {
    if (!item.isDirectory) return;
    await list(item.path);
  }, [list]);

  const goUp = useCallback(async () => {
    await list(parentPath(currentPath));
  }, [currentPath, list]);

  const breadcrumbs = useMemo(() => {
    const clean = currentPath.replace(/^\/+|\/+$/g, '');
    if (!clean) return [] as Array<{ name: string; path: string }>;
    const parts = clean.split('/');
    return parts.map((name, index) => ({
      name,
      path: parts.slice(0, index + 1).join('/'),
    }));
  }, [currentPath]);

  useEffect(() => {
    setCurrentPath('');
    setItems([]);
    setInitialized(true);
    setError(null);

    checkStatus().then((ok) => {
      if (ok) void list('');
    });
  }, [tenantId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    available,
    online,
    initialized,
    loading,
    currentPath,
    items,
    error,
    breadcrumbs,
    checkStatus,
    list,
    ensureProjectStorage,
    createFolder,
    upload,
    rename,
    move,
    remove,
    download,
    openFolder,
    goUp,
  };
}
