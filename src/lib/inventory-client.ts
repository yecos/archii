'use client';
import { getAuthHeaders, getFirebase } from '@/lib/firebase-service';
import type { InventoryAction, InventoryResult } from '@/lib/inventory-service';

const requests = new Map<string, { id: string; pending?: Promise<InventoryResult> }>();

/** Preserve the operation ID across a lost response and a reload in the same tab. */
export async function inventoryRequest(tenantId: string | null, action: InventoryAction, data: Record<string, unknown>): Promise<InventoryResult> {
  const uid = getFirebase().auth().currentUser?.uid;
  if (!tenantId || !uid) throw new Error('Se requiere una sesión y un espacio de trabajo activos');
  const payload = JSON.stringify({ uid, tenantId, action, data });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const storageKey = `archii-inventory-${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
  let saved = requests.get(storageKey);
  if (saved?.pending) return saved.pending;
  if (!saved) {
    let id: string | null = null;
    try { id = sessionStorage.getItem(storageKey); } catch { /* WebView storage may be unavailable. */ }
    saved = { id: id && /^[A-Za-z0-9_-]{16,128}$/.test(id) ? id : crypto.randomUUID() };
    requests.set(storageKey, saved);
    try { sessionStorage.setItem(storageKey, saved.id); } catch { /* In-memory retries still share the ID. */ }
  }
  const operation = saved;
  operation.pending = (async () => {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ tenantId, action, data, requestId: operation.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo confirmar la operación');
      requests.delete(storageKey);
      try { sessionStorage.removeItem(storageKey); } catch { /* No persisted entry. */ }
      return result as InventoryResult;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError)) throw error;
      throw new Error('Sin confirmación del servidor. Conserva los datos y reintenta al recuperar la conexión.');
    } finally {
      clearTimeout(timeout);
      operation.pending = undefined;
    }
  })();
  return operation.pending;
}

/** Full history is fetched only when reports are opened, never from a partial offline cache. */
export async function loadInventoryHistory(tenantId: string) {
  const db = getFirebase().firestore();
  const read = async (collection: string) => {
    const snapshot = await db.collection(collection).where('tenantId', '==', tenantId).get({ source: 'server' });
    const docs = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    // Sorting locally also includes legacy records that have no createdAt field.
    const timestamp = (data: Record<string, any>) => data.createdAt?.toMillis?.() || Date.parse(data.date || '') || 0;
    return docs.sort((a, b) => timestamp(b.data) - timestamp(a.data));
  };
  const [movements, transfers] = await Promise.all([read('invMovements'), read('invTransfers')]);
  return { movements, transfers };
}
