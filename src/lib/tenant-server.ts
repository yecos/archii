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
 * Used in API routes after Firebase Auth verification.
 */
export async function getTenantIdForUser(userId: string): Promise<string | null> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return (userDoc.data() as Record<string, unknown>).tenantId as string | null;
    }
    return null;
  } catch (err) {
    console.error('[Tenant] Failed to get tenantId for user:', err);
    return null;
  }
}
