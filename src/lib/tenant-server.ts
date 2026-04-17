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
