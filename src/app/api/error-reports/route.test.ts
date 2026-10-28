// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyTenantMembership } from '@/lib/tenant-utils';
import { POST } from './route';

const { add } = vi.hoisted(() => ({ add: vi.fn(async () => ({ id: 'error-a' })) }));
vi.mock('@/lib/api-auth', () => ({ requireAuth: vi.fn(async () => ({ uid: 'director', email: 'director@example.test' })), AuthError: class extends Error {} }));
vi.mock('@/lib/tenant-utils', () => ({ verifyTenantMembership: vi.fn(async () => true) }));
vi.mock('@/lib/firebase-admin', () => ({ getAdminDb: () => ({ collection: () => ({ add }) }), getAdminFieldValue: () => ({ serverTimestamp: () => 'timestamp' }) }));

beforeEach(() => { add.mockClear(); vi.mocked(verifyTenantMembership).mockResolvedValue(true); });
describe('inventory error reporting regression', () => {
  it('persists an error even when optional screen and stack fields are absent', async () => {
    const response = await POST(new NextRequest('http://localhost/api/error-reports', { method: 'POST', body: JSON.stringify({ tenantId: 'company-a', message: 'No se pudo confirmar la operación' }) }));
    expect(response.status).toBe(201);
    const record = (add.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(record.screen).toBe('');
    expect(Object.values(record)).not.toContain(undefined);
  });
  it('rejects error reports belonging to another company', async () => {
    vi.mocked(verifyTenantMembership).mockResolvedValue(false);
    const response = await POST(new NextRequest('http://localhost/api/error-reports', { method: 'POST', body: JSON.stringify({ tenantId: 'company-b', message: 'Error' }) }));
    expect(response.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });
});
