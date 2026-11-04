// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  isFlagEnabledDynamic: vi.fn(),
  verifyTenantMembership: vi.fn(),
  verifyTenantSuperAdmin: vi.fn(),
  getAvailableProviders: vi.fn(),
  getTenantIntegrations: vi.fn(),
  sanitizeIntegration: vi.fn((value: unknown) => value),
  requireTenantIntegration: vi.fn(),
  installIntegration: vi.fn(),
  uninstallIntegration: vi.fn(),
  updateIntegrationConfig: vi.fn(),
  triggerIntegration: vi.fn(),
  getIntegrationLogs: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  AuthError: class AuthError extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));
vi.mock('@/lib/feature-flags-server', () => ({ isFlagEnabledDynamic: mocks.isFlagEnabledDynamic }));
vi.mock('@/lib/tenant-utils', () => ({
  verifyTenantMembership: mocks.verifyTenantMembership,
  verifyTenantSuperAdmin: mocks.verifyTenantSuperAdmin,
}));
vi.mock('@/lib/marketplace-service', () => ({
  getAvailableProviders: mocks.getAvailableProviders,
  getTenantIntegrations: mocks.getTenantIntegrations,
  sanitizeIntegration: mocks.sanitizeIntegration,
  requireTenantIntegration: mocks.requireTenantIntegration,
  installIntegration: mocks.installIntegration,
  uninstallIntegration: mocks.uninstallIntegration,
  updateIntegrationConfig: mocks.updateIntegrationConfig,
  triggerIntegration: mocks.triggerIntegration,
  getIntegrationLogs: mocks.getIntegrationLogs,
  IntegrationAccessError: class IntegrationAccessError extends Error {
    readonly status = 404;
    constructor() { super('Integración no encontrada'); }
  },
}));

import { POST } from './route';
import { IntegrationAccessError } from '@/lib/marketplace-service';

const makeRequest = (body: unknown) => new NextRequest('http://localhost/api/integrations', {
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
  mocks.requireTenantIntegration.mockResolvedValue({
    id: 'integration-a',
    tenantId: 'tenant-a',
    providerId: 'slack',
    config: { channel: '#alerts' },
  });
  mocks.getIntegrationLogs.mockResolvedValue([]);
});

describe('tenant-scoped integrations API', () => {
  it('rejects external effects from a tenant member who is not an admin', async () => {
    mocks.verifyTenantSuperAdmin.mockResolvedValue(false);

    const response = await POST(makeRequest({
      action: 'trigger',
      tenantId: 'tenant-a',
      instanceId: 'integration-a',
      event: 'task.created',
    }));

    expect(response.status).toBe(403);
    expect(mocks.triggerIntegration).not.toHaveBeenCalled();
  });

  it('returns not-found for an instance outside the requested tenant', async () => {
    mocks.requireTenantIntegration.mockRejectedValue(new IntegrationAccessError());
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(makeRequest({
      action: 'update',
      tenantId: 'tenant-a',
      instanceId: 'integration-b',
      config: { channel: '#alerts' },
    }));

    expect(response.status).toBe(404);
    expect(mocks.updateIntegrationConfig).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('passes the tenant scope into log reads', async () => {
    const response = await POST(makeRequest({
      action: 'logs',
      tenantId: 'tenant-a',
      instanceId: 'integration-a',
      limit: 30,
    }));

    expect(response.status).toBe(200);
    expect(mocks.getIntegrationLogs).toHaveBeenCalledWith('tenant-a', 'integration-a', 30);
  });
});
