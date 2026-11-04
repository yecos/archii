// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  isFlagEnabledDynamic: vi.fn(),
  getProvider: vi.fn(),
  getIntegrationLogs: vi.fn(),
  sanitizeIntegration: vi.fn((value: unknown) => value),
  getAdminDb: vi.fn(),
  decryptIntegrationConfig: vi.fn(),
  verifyTenantMembership: vi.fn(),
  verifyTenantSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  AuthError: class AuthError extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));
vi.mock('@/lib/feature-flags-server', () => ({ isFlagEnabledDynamic: mocks.isFlagEnabledDynamic }));
vi.mock('@/lib/marketplace-service', () => ({
  getProvider: mocks.getProvider,
  getIntegrationLogs: mocks.getIntegrationLogs,
  sanitizeIntegration: mocks.sanitizeIntegration,
  IntegrationAccessError: class IntegrationAccessError extends Error {
    readonly status = 404;
  },
}));
vi.mock('@/lib/firebase-admin', () => ({ getAdminDb: mocks.getAdminDb }));
vi.mock('@/lib/integration-crypto', () => ({ decryptIntegrationConfig: mocks.decryptIntegrationConfig }));
vi.mock('@/lib/tenant-utils', () => ({
  verifyTenantMembership: mocks.verifyTenantMembership,
  verifyTenantSuperAdmin: mocks.verifyTenantSuperAdmin,
}));

import { GET, POST } from './route';

const makeRequest = (body: unknown) => new NextRequest('http://localhost/api/integrations/slack', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isFlagEnabledDynamic.mockResolvedValue(true);
  mocks.requireAuth.mockResolvedValue({ uid: 'user-a', email: 'a@example.com' });
  mocks.verifyTenantMembership.mockResolvedValue(true);
  mocks.verifyTenantSuperAdmin.mockResolvedValue(true);
  mocks.getProvider.mockReturnValue({ id: 'slack', name: 'Slack', configSchema: [] });
  mocks.decryptIntegrationConfig.mockImplementation((value: unknown) => value);
  mocks.getAdminDb.mockReturnValue({
    collection: () => ({
      doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ tenantId: 'tenant-a', providerId: 'slack', config: { channel: '#alerts' } }) }) }),
    }),
  });
  mocks.getIntegrationLogs.mockResolvedValue([]);
});

describe('provider integrations API', () => {
  it('blocks connection tests for non-admin tenant members', async () => {
    mocks.verifyTenantSuperAdmin.mockResolvedValue(false);

    const response = await POST(makeRequest({
      action: 'test',
      tenantId: 'tenant-a',
      instanceId: 'integration-a',
    }), { params: Promise.resolve({ provider: 'slack' }) });

    expect(response.status).toBe(403);
  });

  it('blocks log-bearing instance details for non-admin tenant members', async () => {
    mocks.verifyTenantSuperAdmin.mockResolvedValue(false);

    const response = await GET(
      new NextRequest('http://localhost/api/integrations/slack?tenantId=tenant-a&instanceId=integration-a', {
        headers: { authorization: 'Bearer test' },
      }),
      { params: Promise.resolve({ provider: 'slack' }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.getIntegrationLogs).not.toHaveBeenCalled();
  });
});
