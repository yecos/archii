'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

export interface QueuedMutation {
  /** Unique ID for this queued operation */
  id: string;
  /** Firestore operation type */
  type: 'add' | 'set' | 'update' | 'delete';
  /** Firestore collection path (e.g. "projects" or "users/uid/tasks") */
  collection: string;
  /** Document ID (for update/delete/set operations) */
  docId?: string;
  /** Data payload for add/set/update operations */
  data?: Record<string, unknown>;
  /** Merge option for set operations */
  merge?: boolean;
  /** Timestamp when operation was queued */
  queuedAt: number;
  /** Number of retry attempts */
  retries: number;
  /** Last error message if retry failed */
  lastError?: string;
  /** Human-readable label for display */
  label: string;
}

export interface OfflineQueueState {
  /** Operations waiting to be synced */
  pendingMutations: QueuedMutation[];
  /** Total count of pending operations */
  pendingCount: number;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Current sync progress (0-100) */
  syncProgress: number;
  /** Total synced in current session */
  syncedCount: number;
  /** Failed operations in current session */
  failedCount: number;
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether offline mode is fully active */
  isOfflineMode: boolean;
  /** Storage used by cached data (bytes) */
  cacheSizeBytes: number;
  /** Queue a new mutation for sync */
  enqueue: (mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'retries'>) => string;
  /** Manually trigger sync */
  triggerSync: () => Promise<void>;
  /** Remove a specific queued mutation */
  removeQueued: (id: string) => Promise<void>;
  /** Clear all queued mutations */
  clearQueue: () => Promise<void>;
  /** Retry a failed mutation */
  retryMutation: (id: string) => Promise<boolean>;
  /** Estimate cache size */
  refreshCacheSize: () => Promise<void>;
}

/* ========================================================================== */
/*  IndexedDB helpers                                                          */
/* ========================================================================== */

const DB_NAME = 'archiflow-offline-queue';
const DB_VERSION = 2;
const STORE_NAME = 'mutations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGetAll(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result || []) as QueuedMutation[]);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(mutation: QueuedMutation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ========================================================================== */
/*  Firestore mutation executor                                                */
/* ========================================================================== */

async function executeMutation(mutation: QueuedMutation): Promise<void> {
  const fb = (window as unknown as { firebase?: { firestore: () => unknown } }).firebase;
  if (!fb) throw new Error('Firebase no disponible');

  const db = fb.firestore() as {
    collection: (path: string) => { doc: (id?: string) => unknown; add: (data: unknown) => Promise<unknown> };
  };

  const colRef = db.collection(mutation.collection);

  switch (mutation.type) {
    case 'add': {
      await (colRef as { add: (data: unknown) => Promise<unknown> }).add(mutation.data);
      break;
    }
    case 'set': {
      const docRef = (colRef as { doc: (id?: string) => { set: (data: unknown, opts?: { merge?: boolean }) => Promise<void> } }).doc(mutation.docId);
      await docRef.set(mutation.data, { merge: mutation.merge });
      break;
    }
    case 'update': {
      const docRef = (colRef as { doc: (id?: string) => { update: (data: unknown) => Promise<void> } }).doc(mutation.docId);
      await docRef.update(mutation.data);
      break;
    }
    case 'delete': {
      const docRef = (colRef as { doc: (id?: string) => { delete: () => Promise<void> } }).doc(mutation.docId);
      await docRef.delete();
      break;
    }
  }
}

/* ========================================================================== */
/*  Context                                                                    */
/* ========================================================================== */

const OfflineQueueContext = createContext<OfflineQueueState | null>(null);

const MAX_RETRIES = 3;

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const [pendingMutations, setPendingMutations] = useState<QueuedMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [cacheSizeBytes, setCacheSizeBytes] = useState(0);

  const syncingRef = useRef(false);
  const pendingRef = useRef<QueuedMutation[]>([]);

  // Keep ref in sync
  useEffect(() => {
    pendingRef.current = pendingMutations;
  }, [pendingMutations]);

  // ---- Load queue from IndexedDB on mount ----
  useEffect(() => {
    let cancelled = false;
    idbGetAll().then((mutations) => {
      if (!cancelled) {
        const sorted = mutations.sort((a, b) => a.queuedAt - b.queuedAt);
        setPendingMutations(sorted);
      }
    }).catch(() => {
      // IndexedDB unavailable — queue won't persist across reloads
    });
    return () => { cancelled = true; };
  }, []);

  // ---- Network status ----
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (pendingRef.current.length > 0) {
        triggerSync();
      }
      // Notify service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' });
      }
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- SW message listener (sync events from service worker) ----
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type) return;

      if (data.type === 'SYNC_START') {
        setIsSyncing(true);
        setSyncProgress(0);
      } else if (data.type === 'SYNC_PROGRESS') {
        setSyncProgress(data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0);
        setSyncedCount(data.success);
        setFailedCount(data.failed);
      } else if (data.type === 'SYNC_COMPLETE') {
        setIsSyncing(false);
        setSyncProgress(100);
        // Reload queue from IDB after sync
        idbGetAll().then((remaining) => {
          setPendingMutations(remaining.sort((a, b) => a.queuedAt - b.queuedAt));
        }).catch(() => {});
        // Reset counters after a delay
        setTimeout(() => {
          setSyncedCount(0);
          setFailedCount(0);
          setSyncProgress(0);
        }, 3000);
      } else if (data.type === 'CACHE_SIZE') {
        setCacheSizeBytes(data.size || 0);
      } else if (data.type === 'OFFLINE_QUEUE_SIZE') {
        // Update pending count from SW's perspective
        // We rely on our own IDB reads for accuracy
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // ---- Enqueue a mutation ----
  const enqueue = useCallback((mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'retries'>): string => {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const full: QueuedMutation = {
      ...mutation,
      id,
      queuedAt: Date.now(),
      retries: 0,
    };

    setPendingMutations((prev) => {
      const next = [...prev, full].sort((a, b) => a.queuedAt - b.queuedAt);
      pendingRef.current = next;
      return next;
    });

    // Persist to IndexedDB
    idbPut(full).catch(() => {
      // IndexedDB write failed — mutation is in-memory only
      console.warn('[OfflineQueue] IndexedDB write failed for mutation:', id);
    });

    // Register background sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_SYNC' });
    }

    return id;
  }, []);

  // ---- Trigger sync ----
  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;

    const currentQueue = [...pendingRef.current];
    if (currentQueue.length === 0) {
      syncingRef.current = false;
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncedCount(0);
    setFailedCount(0);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < currentQueue.length; i++) {
      const mutation = currentQueue[i];
      const processed = i + 1;

      try {
        await executeMutation(mutation);
        await idbDelete(mutation.id);
        success++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        const updated = { ...mutation, retries: mutation.retries + 1, lastError: errorMsg };

        if (updated.retries >= MAX_RETRIES) {
          // Max retries reached — remove from queue but log
          await idbDelete(mutation.id);
          failed++;
          console.error('[OfflineQueue] Mutation failed permanently:', updated.label, errorMsg);
        } else {
          // Update retry count in IDB
          await idbPut(updated);
          failed++;
        }
      }

      setSyncProgress(Math.round((processed / currentQueue.length) * 100));
      setSyncedCount(success);
      setFailedCount(failed);
    }

    // Reload queue state
    const remaining = await idbGetAll().catch(() => []);
    setPendingMutations(remaining.sort((a, b) => a.queuedAt - b.queuedAt));

    setIsSyncing(false);
    syncingRef.current = false;

    // Auto-reset counters
    setTimeout(() => {
      setSyncedCount(0);
      setFailedCount(0);
      setSyncProgress(0);
    }, 4000);
  }, []);

  // ---- Remove a queued mutation ----
  const removeQueued = useCallback(async (id: string) => {
    await idbDelete(id).catch(() => {});
    setPendingMutations((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ---- Clear entire queue ----
  const clearQueue = useCallback(async () => {
    await idbClear().catch(() => {});
    setPendingMutations([]);
  }, []);

  // ---- Retry a single mutation ----
  const retryMutation = useCallback(async (id: string): Promise<boolean> => {
    const mutation = pendingRef.current.find((m) => m.id === id);
    if (!mutation || !navigator.onLine) return false;

    try {
      await executeMutation(mutation);
      await idbDelete(id);
      setPendingMutations((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      const updated = { ...mutation, retries: mutation.retries + 1, lastError: errorMsg };
      await idbPut(updated).catch(() => {});
      setPendingMutations((prev) =>
        prev.map((m) => (m.id === id ? updated : m)).sort((a, b) => a.queuedAt - b.queuedAt)
      );
      return false;
    }
  }, []);

  // ---- Cache size ----
  const refreshCacheSize = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_SIZE' });
    }
  }, []);

  // Refresh cache size on mount
  useEffect(() => {
    refreshCacheSize();
    const interval = setInterval(refreshCacheSize, 60000);
    return () => clearInterval(interval);
  }, [refreshCacheSize]);

  const value: OfflineQueueState = {
    pendingMutations,
    pendingCount: pendingMutations.length,
    isSyncing,
    syncProgress,
    syncedCount,
    failedCount,
    isOnline,
    isOfflineMode: !isOnline || pendingMutations.length > 0,
    cacheSizeBytes,
    enqueue,
    triggerSync,
    removeQueued,
    clearQueue,
    retryMutation,
    refreshCacheSize,
  };

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  );
}

export function useOfflineQueue(): OfflineQueueState {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error('useOfflineQueue debe usarse dentro de OfflineQueueProvider');
  return ctx;
}
