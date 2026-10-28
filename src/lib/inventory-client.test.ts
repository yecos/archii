// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryRequest, loadInventoryHistory } from './inventory-client';
import { getFirebase, getAuthHeaders } from './firebase-service';

vi.mock('./firebase-service', () => ({
  getAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer verified-token' })),
  getFirebase: vi.fn(),
}));
let uid = 'director';
let stored: Map<string, string>;
beforeEach(() => {
  uid = 'director';
  stored = new Map();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => stored.get(key), setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.mocked(getFirebase).mockImplementation(() => ({ auth: () => ({ currentUser: { uid } }) }) as any);
});
const data = (quantity = 2) => ({ productId: crypto.randomUUID(), type: 'Entrada', warehouse: 'Almacén Principal', quantity });
const success = () => Response.json({ success: true, id: 'movement-a', stock: 7 });

describe('inventory request delivery', () => {
  it('reuses the same operation ID after a response is lost', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('network lost')).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const input = data();
    await expect(inventoryRequest('company-a', 'movement', input)).rejects.toThrow('Sin confirmación');
    expect(stored.size).toBe(1);
    await inventoryRequest('company-a', 'movement', input);
    const bodies = fetchMock.mock.calls.map(call => JSON.parse(call[1].body));
    expect(bodies[0].requestId).toBe(bodies[1].requestId);
    expect(stored.size).toBe(0);
  });
  it('allows retry when obtaining the authentication header fails', async () => {
    vi.mocked(getAuthHeaders).mockRejectedValueOnce(new Error('token unavailable'));
    const fetchMock = vi.fn().mockResolvedValue(success());
    vi.stubGlobal('fetch', fetchMock);
    const input = data();
    await expect(inventoryRequest('company-a', 'movement', input)).rejects.toThrow('token unavailable');
    await expect(inventoryRequest('company-a', 'movement', input)).resolves.toMatchObject({ stock: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('shares one in-flight request for a double click', async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
    vi.stubGlobal('fetch', fetchMock);
    const input = data();
    const first = inventoryRequest('company-a', 'movement', input);
    const second = inventoryRequest('company-a', 'movement', input);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolve(success());
    expect(await first).toEqual(await second);
  });
  it('never reuses an operation ID for another tenant or user', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network lost'));
    vi.stubGlobal('fetch', fetchMock);
    const input = data();
    await inventoryRequest('company-a', 'movement', input).catch(() => {});
    await inventoryRequest('company-b', 'movement', input).catch(() => {});
    uid = 'contractor';
    await inventoryRequest('company-a', 'movement', input).catch(() => {});
    const ids = fetchMock.mock.calls.map(call => JSON.parse(call[1].body).requestId);
    expect(new Set(ids).size).toBe(3);
  });
});


describe('complete report history', () => {
  it('loads more than 100 records from the server, scoped to the active tenant', async () => {
    const snapshots = Array.from({ length: 125 }, (_, i) => ({ id: `entry-${i}`, data: () => ({ quantity: i + 1 }) }));
    const get = vi.fn(async () => ({ docs: snapshots }));
    const query = { get };
    const where = vi.fn(() => query);
    vi.mocked(getFirebase).mockImplementation(() => ({ firestore: () => ({ collection: () => ({ where }) }) }) as any);
    const result = await loadInventoryHistory('company-a');
    expect(result.movements).toHaveLength(125);
    expect(result.transfers).toHaveLength(125);
    expect(where).toHaveBeenCalledWith('tenantId', '==', 'company-a');
    expect(get).toHaveBeenCalledWith({ source: 'server' });
  });
  it('rejects incomplete or offline history instead of exporting a partial report', async () => {
    vi.mocked(getFirebase).mockImplementation(() => ({ firestore: () => ({ collection: () => ({ where: () => ({ get: () => Promise.reject(new Error('offline')) }) }) }) }) as any);
    await expect(loadInventoryHistory('company-a')).rejects.toThrow('offline');
  });
});
