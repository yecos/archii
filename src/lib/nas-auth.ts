/**
 * nas-auth.ts
 * Server-only authorization helpers for the private NEXO S10-NAS integration.
 *
 * The NAS is intentionally NOT a general multi-tenant storage backend.
 * Only the tenant configured in NAS_TENANT_ID may use it.
 */

import { NextRequest } from 'next/server';
import { AuthError, requireAuth, type AuthUser } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireTenantMembership } from '@/lib/tenant-utils';

export class NasAccessError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 403, code = 'NAS_FORBIDDEN') {
    super(message);
    this.name = 'NasAccessError';
    this.status = status;
    this.code = code;
  }
}

export interface NasConfig {
  bridgeUrl: string;
  bridgeToken: string;
  tenantId: string;
  timeoutMs: number;
}

function readNasConfig(): NasConfig {
  if (process.env.NAS_ENABLED !== 'true') {
    throw new NasAccessError('NAS no habilitado', 404, 'NAS_DISABLED');
  }

  const tenantId = (process.env.NAS_TENANT_ID || '').trim();
  const bridgeUrl = (process.env.NAS_BRIDGE_URL || '').trim().replace(/\/+$/, '');
  const bridgeToken = (process.env.NAS_BRIDGE_TOKEN || '').trim();
  const timeoutMs = Math.max(3000, Math.min(60000, Number(process.env.NAS_REQUEST_TIMEOUT_MS || 15000)));

  if (!tenantId || !bridgeUrl || !bridgeToken) {
    throw new NasAccessError('NAS no configurado en el servidor', 503, 'NAS_NOT_CONFIGURED');
  }

  if (!/^https:\/\//i.test(bridgeUrl) && process.env.NODE_ENV === 'production') {
    throw new NasAccessError('NAS_BRIDGE_URL debe usar HTTPS en producción', 503, 'NAS_INSECURE_BRIDGE');
  }

  return { bridgeUrl, bridgeToken, tenantId, timeoutMs };
}

export async function requireNasAccess(
  request: NextRequest,
  requestedTenantId: string,
  projectId?: string
): Promise<{ user: AuthUser; config: NasConfig }> {
  let user: AuthUser;
  try {
    user = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new NasAccessError(error.message, error.status, 'AUTH_ERROR');
    }
    throw error;
  }

  const config = readNasConfig();

  // Return 404 rather than revealing which tenant owns the private NAS.
  if (!requestedTenantId || requestedTenantId !== config.tenantId) {
    throw new NasAccessError('Recurso no encontrado', 404, 'NAS_NOT_AVAILABLE');
  }

  try {
    await requireTenantMembership(user.uid, requestedTenantId);
  } catch (error: any) {
    throw new NasAccessError(
      error?.message || 'No autorizado para este tenant',
      error?.status || 403,
      'TENANT_FORBIDDEN'
    );
  }

  if (projectId) {
    const db = getAdminDb();
    const projectDoc = await db.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      throw new NasAccessError('Proyecto no encontrado', 404, 'PROJECT_NOT_FOUND');
    }

    const project = projectDoc.data() || {};
    if (project.tenantId !== requestedTenantId) {
      throw new NasAccessError('Proyecto fuera del tenant autorizado', 403, 'PROJECT_TENANT_MISMATCH');
    }
  }

  return { user, config };
}
