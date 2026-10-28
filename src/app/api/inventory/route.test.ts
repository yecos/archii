// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthError, requireAuth } from '@/lib/api-auth';
import { executeInventory } from '@/lib/inventory-service';
import { InventoryError } from '@/lib/inventory-stock';
import { POST } from './route';

vi.mock('@/lib/api-auth', () => ({
  requireAuth: vi.fn(),
  AuthError: class extends Error { constructor(message: string, public status: number) { super(message); } },
}));
vi.mock('@/lib/firebase-admin', () => ({ getAdminDb: () => 'database' }));
vi.mock('@/lib/inventory-service', () => ({ executeInventory: vi.fn() }));
const payload = { tenantId: 'company-a', requestId: 'operation-123456789', action: 'movement', data: { productId: 'product-a', type: 'Salida', quantity: 2, warehouse: 'Almacén Principal' } };
const request = (body: unknown) => new NextRequest('http://localhost/api/inventory', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireAuth).mockResolvedValue({ uid: 'director', email: 'director@example.com' });
});

describe('authenticated inventory endpoint', () => {
  it('requires authentication before processing a mutation', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new AuthError('No autenticado', 401));
    expect((await POST(request(payload))).status).toBe(401);
    expect(executeInventory).not.toHaveBeenCalled();
  });
  it.each([null, {}, { ...payload, data: [] }, { ...payload, requestId: 1 }])('rejects malformed request %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(executeInventory).not.toHaveBeenCalled();
  });
  it('uses the verified user identity, not an identity supplied in the body', async () => {
    vi.mocked(executeInventory).mockResolvedValue({ id: 'movement-a', stock: 3 });
    const response = await POST(request({ ...payload, uid: 'owner' }));
    expect(response.status).toBe(200);
    expect(executeInventory).toHaveBeenCalledWith('database', 'director', 'company-a', payload.requestId, 'movement', payload.data);
    expect(await response.json()).toEqual({ success: true, id: 'movement-a', stock: 3 });
  });
  it.each([403, 404, 409])('preserves domain error status %i', async status => {
    vi.mocked(executeInventory).mockRejectedValue(new InventoryError('Operación rechazada', status));
    const response = await POST(request(payload));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: 'Operación rechazada' });
  });
  it('reports an unconfirmed operation without exposing internal errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(executeInventory).mockRejectedValue(new Error('internal credential or database error'));
    const response = await POST(request(payload));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('Reintenta con los mismos datos');
    log.mockRestore();
  });
});
