// ============================================================
// ArchiFlow Service Worker v5 — Offline-First PWA
// ============================================================
// Features:
//   - Runtime app shell caching (Next.js _next/static/*)
//   - Stale-while-revalidate for static assets
//   - Network-first with cache fallback for navigation
//   - Background Sync for replaying failed mutations
//   - Push notification handling
//   - SW update notification to clients
//   - Clear cache / skip waiting message support
// ============================================================

const CACHE_NAME = 'archiflow-v6';
const SHELL_CACHE = 'archiflow-shell-v6';
const DATA_CACHE = 'archiflow-data-v6';

// Core assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-384.png',
];

// Maximum age for cached responses (7 days)
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

// Maximum number of items in data cache
const MAX_DATA_CACHE = 200;

// ============================================================
// Install — precache core assets, skip waiting
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Don't fail install if some assets can't be cached
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// ============================================================
// Activate — clean old caches, claim clients
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
  self.clients.claim();
});

// ============================================================
// Fetch — intelligent caching strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests — let them go to network
  // Background Sync handles offline mutation replay
  if (event.request.method !== 'GET') {
    // For POST/PUT/DELETE to our API routes, queue for background sync if offline
    if (url.pathname.startsWith('/api/') && !navigator.onLine) {
      event.respondWith(
        new Response(JSON.stringify({ queued: true, message: 'Operación encolada para sincronización' }), {
          status: 202,
          statusText: 'Accepted',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      // Clone and queue for background sync
      cloneAndQueueRequest(event.request);
      return;
    }
    return;
  }

  // Skip Firebase (real-time data handled by SDK persistence)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('graph.facebook.com') ||
    url.hostname.includes('firebasestorage.app')
  ) {
    return;
  }

  // Skip Microsoft Graph API
  if (url.hostname.includes('microsoft.com')) return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Next.js app shell — stale-while-revalidate (fast offline load)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
    return;
  }

  // Build manifest and other Next.js chunks
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
    return;
  }

  // Navigation requests — network first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstCacheFallback(event.request, SHELL_CACHE));
    return;
  }

  // Static assets (images, fonts, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
    return;
  }

  // API GET requests — network first with short cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstCacheFallback(event.request, DATA_CACHE, 5 * 60 * 1000));
    return;
  }

  // Default — network first, cache fallback
  event.respondWith(networkFirstCacheFallback(event.request, CACHE_NAME));
});

// ============================================================
// Caching Strategies
// ============================================================

/** Serve from cache immediately, update in background */
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) => {
    return cache.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    });
  });
}

/** Try network first, fall back to cache */
function networkFirstCacheFallback(request, cacheName, maxAge) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, clone);
          trimCache(cacheName, MAX_DATA_CACHE);
        });
      }
      return response;
    })
    .catch(() => {
      return caches.match(request).then((cached) => {
        if (cached && maxAge) {
          // Check cache age
          const dateHeader = cached.headers.get('sw-cache-date');
          if (dateHeader) {
            const age = Date.now() - parseInt(dateHeader, 10);
            if (age > maxAge) {
              return caches.match('/').then((fallback) => fallback || cached);
            }
          }
        }
        // Navigation fallback to /
        if (request.mode === 'navigate') {
          return cached || caches.match('/');
        }
        return cached;
      });
    });
}

/** Trim cache to max entries (LRU-like: delete oldest first) */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    // Non-critical — don't fail fetch
  }
}

/** Clone request and queue it for Background Sync */
function cloneAndQueueRequest(request) {
  try {
    request.clone().text().then((body) => {
      const queueEntry = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: Date.now(),
      };
      // Store in IndexedDB for background sync
      return idbPut('offline-queue', queueEntry);
    }).catch(() => {
      // Queue failed — non-critical for now
    });
  } catch (err) {
    // Non-critical
  }
}

/** Simple IndexedDB put operation for the offline queue */
function idbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('archiflow-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'timestamp' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Read all entries from the offline queue */
function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('archiflow-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'timestamp' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => resolve(getAllReq.result || []);
        getAllReq.onerror = () => reject(getAllReq.error);
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete an entry from the offline queue */
function idbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('archiflow-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'timestamp' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Check if URL is a static asset */
function isStaticAsset(pathname) {
  const exts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ico', '.webp', '.avif'];
  return exts.some((ext) => pathname.endsWith(ext));
}

// ============================================================
// Background Sync — replay queued mutations when online
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-mutations') {
    event.waitUntil(replayOfflineMutations());
  }
  if (event.tag === 'archiflow-sync') {
    event.waitUntil(replayOfflineMutations());
  }
});

async function replayOfflineMutations() {
  try {
    const entries = await idbGetAll('offline-queue');
    if (entries.length === 0) return;

    // Notify clients that sync is starting
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_START', count: entries.length });
    });

    let success = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        const opts: RequestInit = {
          method: entry.method,
          headers: entry.headers,
        };
        if (entry.method !== 'GET' && entry.body) {
          opts.body = entry.body;
        }
        const response = await fetch(entry.url, opts);
        if (response.ok || response.status === 202) {
          await idbDelete('offline-queue', entry.timestamp);
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }

      // Update progress
      const processed = success + failed;
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_PROGRESS',
          total: entries.length,
          processed: processed,
          success: success,
          failed: failed,
        });
      });
    }

    // Notify completion
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        total: entries.length,
        success: success,
        failed: failed,
      });
    });

    // Register next sync if there were failures
    if (failed > 0) {
      await self.registration.sync.register('archiflow-sync');
    }
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

// ============================================================
// Push Notification Handler
// ============================================================
self.addEventListener('push', (event) => {
  let data = { title: 'ArchiFlow', body: 'Nueva notificación', icon: '/icon-192.png' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
      tag: data.tag || 'archiflow-' + Date.now(),
      renotify: true,
    })
  );
});

// ============================================================
// Notification Click Handler
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0];
        client.focus();
        if (event.notification.data?.screen) {
          client.postMessage({
            type: 'NAVIGATE',
            screen: event.notification.data.screen,
            itemId: event.notification.data.itemId,
          });
        }
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

// ============================================================
// Message Handler — commands from the app
// ============================================================
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((keys) => {
        Promise.all(keys.map((key) => caches.delete(key))).then(() => {
          console.log('[SW] All caches cleared');
        });
      });
      break;

    case 'NAVIGATE':
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage(data));
      });
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.source.postMessage({ type: 'CACHE_SIZE', size: size });
      });
      break;

    case 'REGISTER_SYNC':
      if ('sync' in self.registration) {
        self.registration.sync.register('archiflow-sync').catch(() => {
          // Background sync not supported — mutations will replay on next online event
        });
      }
      break;

    case 'GET_OFFLINE_QUEUE_SIZE':
      idbGetAll('offline-queue').then((entries) => {
        event.source.postMessage({ type: 'OFFLINE_QUEUE_SIZE', count: entries.length });
      });
      break;
  }
});

/** Calculate total cache size in bytes */
async function getCacheSize() {
  let totalSize = 0;
  const keys = await caches.keys();
  for (const key of keys) {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  return totalSize;
}

// ============================================================
// Online event — trigger sync when coming back online
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ONLINE') {
    if ('sync' in self.registration) {
      self.registration.sync.register('archiflow-sync').catch(() => {});
    }
  }
});
