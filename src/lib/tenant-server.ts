/**
 * tenant-server.ts
 * SERVER-SIDE ONLY utilities for multi-tenant data isolation.
 * Used in API routes where React hooks are not available.
 *
 * This file MUST NOT be imported from client-side code.
 */

import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Get tenantId from a user's Firestore document.
 * Supports both new format (tenants array) and legacy format (tenantId field).
 * Returns the first tenantId found, or null.
 */
export async function getTenantIdForUser(userId: string): Promise<string | null> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data() as Record<string, unknown>;
      // New format: tenants array
      const tenants = data.tenants as Array<{ tenantId: string }> | undefined;
      if (Array.isArray(tenants) && tenants.length > 0) {
        return tenants[0].tenantId;
      }
      // Legacy format: single tenantId field
      return (data.tenantId as string) || null;
    }
    return null;
  } catch (err) {
    console.error('[Tenant] Failed to get tenantId for user:', err);
    return null;
  }
}

/**
 * Get all tenant IDs a user belongs to.
 */
export async function getUserTenantIds(userId: string): Promise<string[]> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data() as Record<string, unknown>;
      const tenants = data.tenants as Array<{ tenantId: string }> | undefined;
      if (Array.isArray(tenants)) {
        return tenants.map(t => t.tenantId);
      }
      const singleId = data.tenantId as string | undefined;
      if (singleId) return [singleId];
    }
    return [];
  } catch (err) {
    console.error('[Tenant] Failed to get user tenant IDs:', err);
    return [];
  }
}

/**
 * Resolve the active tenant ID for an API request.
 * Priority:
 *  1. Explicit tenantId from request body (client sends its active tenant)
 *  2. First tenant from user's membership list
 *
 * Validates that the user actually belongs to the requested tenant.
 */
export async function resolveTenantId(
  userId: string,
  explicitTenantId?: string
): Promise<{ tenantId: string | null; error?: string }> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { tenantId: null, error: 'Usuario no encontrado' };
    }

    const data = userDoc.data() as Record<string, unknown>;
    const tenants = data.tenants as Array<{ tenantId: string }> | undefined;
    const userTenantIds = Array.isArray(tenants) ? tenants.map(t => t.tenantId) : [];

    // Also check legacy format
    const legacyId = (data.tenantId as string) || null;
    if (legacyId && !userTenantIds.includes(legacyId)) {
      userTenantIds.push(legacyId);
    }

    // If explicit tenantId provided, validate it belongs to the user
    if (explicitTenantId) {
      if (!userTenantIds.includes(explicitTenantId)) {
        return { tenantId: null, error: 'No tienes acceso a esta organización' };
      }
      return { tenantId: explicitTenantId };
    }

    // Fallback: first tenant
    if (userTenantIds.length > 0) {
      return { tenantId: userTenantIds[0] };
    }

    return { tenantId: null, error: 'Usuario no pertenece a ninguna organización' };
  } catch (err) {
    console.error('[Tenant] Failed to resolve tenantId:', err);
    return { tenantId: null, error: 'Error interno resolviendo organización' };
  }
}
