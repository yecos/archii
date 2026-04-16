/**
 * useTenantId.ts
 * Centralized hook for accessing the current tenant ID (CLIENT-SIDE ONLY).
 * All context providers and components that query Firestore
 * MUST use this hook to apply tenant-scoped filtering.
 *
 * Returns null if tenant context is not yet loaded (graceful degradation).
 */

import { useTenantContext } from '@/contexts/TenantContext';

/**
 * Returns the current tenant ID.
 * All Firestore queries MUST filter by this value to ensure data isolation.
 *
 * Usage in onSnapshot:
 *   const tenantId = useTenantId();
 *   if (!tenantId) return null; // wait for tenant to load
 *   db.collection('projects').where('tenantId', '==', tenantId)...
 *
 * Usage in add/set:
 *   const tenantId = useTenantId();
 *   db.collection('projects').add({ ...data, tenantId });
 */
export function useTenantId(): string | null {
  const { currentTenantId } = useTenantContext();
  return currentTenantId;
}
