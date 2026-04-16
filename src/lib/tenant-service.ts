/**
 * tenant-service.ts
 * Multi-tenant middleware utilities for Firestore data isolation.
 * Provides helper functions to scope queries by tenantId,
 * enforce plan limits, and manage tenant-specific branding.
 */

import { getFirebase, getDb, serverTimestamp, snapToDocs, type CollectionRef, type QuerySnapshot, type DocumentData } from '@/lib/firebase-service';
import { TENANT_PLAN_LIMITS } from '@/lib/types';
import type { Tenant, TenantPlan, TenantLimits, TenantStats } from '@/lib/types';

/* ===== CONSTANTS ===== */

const TENANTS_COLLECTION = 'tenants';
const TENANT_USER_FIELD = 'tenantId';

/* ===== DOMAIN DETECTION ===== */

/**
 * Attempt to detect the tenant from the current browser hostname.
 * Returns null if no matching domain is configured.
 * Example: 'acme.archiflow.app' → searches for domain 'acme.archiflow.app'
 */
export function detectTenantFromDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  // Skip localhost and default domains
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    return null;
  }
  // The full hostname (or subdomain portion) is used as the domain key
  return hostname;
}

/* ===== TENANT QUERY BUILDER ===== */

/**
 * Adds a `.where('tenantId', '==', tenantId)` filter to a Firestore collection reference.
 * Use this for ALL Firestore queries to ensure data isolation between tenants.
 *
 * @param collectionName - Firestore collection path (e.g., 'projects', 'tasks')
 * @param tenantId - The current tenant ID to filter by
 * @returns A scoped CollectionRef with the tenant filter applied
 */
export function tenantQuery<T extends DocumentData = DocumentData>(collectionName: string, tenantId: string): CollectionRef<T> {
  const db = getDb();
  return db.collection<T>(collectionName).where(TENANT_USER_FIELD, '==', tenantId);
}

/**
 * Creates a tenant-scoped subcollection reference.
 */
export function tenantSubCollection<T extends DocumentData = DocumentData>(
  parentDocPath: string,
  subCollection: string,
  tenantId: string,
): CollectionRef<T> {
  const db = getDb();
  return db.doc(parentDocPath).collection<T>(subCollection).where(TENANT_USER_FIELD, '==', tenantId);
}

/* ===== TENANT CRUD OPERATIONS ===== */

/**
 * Fetch all tenants (super-admin only).
 */
export async function fetchAllTenants(): Promise<Array<{ id: string; data: Tenant['data'] }>> {
  const db = getDb();
  const snap: QuerySnapshot = await db.collection(TENANTS_COLLECTION).orderBy('name', 'asc').get();
  return snapToDocs<Tenant['data']>(snap);
}

/**
 * Fetch a single tenant by ID.
 */
export async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  const db = getDb();
  const doc = await db.collection(TENANTS_COLLECTION).doc(tenantId).get();
  if (!doc.exists) return null;
  return { id: doc.id, data: doc.data() as Tenant['data'] };
}

/**
 * Look up a tenant by its configured domain.
 */
export async function fetchTenantByDomain(domain: string): Promise<Tenant | null> {
  const db = getDb();
  const snap: QuerySnapshot = await db.collection(TENANTS_COLLECTION)
    .where('domain', '==', domain)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as Tenant['data'] };
}

/**
 * Create a new tenant with plan-based limits.
 */
export async function createTenant(
  name: string,
  domain: string,
  plan: TenantPlan,
  createdBy: string,
  logo?: string,
): Promise<string> {
  const db = getDb();
  const planConfig = TENANT_PLAN_LIMITS[plan];
  const tenantData: Omit<Tenant['data'], 'createdAt' | 'updatedAt'> = {
    name,
    domain: domain.toLowerCase().trim(),
    logo: logo || '',
    plan,
    settings: { primaryColor: '', secondaryColor: '', customLogo: '' },
    limits: {
      maxProjects: planConfig.maxProjects,
      maxUsers: planConfig.maxUsers,
      maxStorage: planConfig.maxStorage,
    },
    stats: { userCount: 0, projectCount: 0, storageUsed: 0 },
    createdBy,
  };
  const ref = await db.collection(TENANTS_COLLECTION).add({
    ...tenantData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update an existing tenant's settings and data.
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<{
    name: string;
    domain: string;
    logo: string;
    plan: TenantPlan;
    settings: Partial<Tenant['data']['settings']>;
    limits: Partial<Tenant['data']['limits']>;
  }>,
): Promise<void> {
  const db = getDb();
  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.domain !== undefined) updateData.domain = updates.domain.toLowerCase().trim();
  if (updates.logo !== undefined) updateData.logo = updates.logo;
  if (updates.plan !== undefined) {
    updateData.plan = updates.plan;
    const planConfig = TENANT_PLAN_LIMITS[updates.plan];
    updateData.limits = {
      maxProjects: planConfig.maxProjects,
      maxUsers: planConfig.maxUsers,
      maxStorage: planConfig.maxStorage,
    };
  }
  if (updates.settings) updateData.settings = updates.settings;
  await db.collection(TENANTS_COLLECTION).doc(tenantId).update(updateData);
}

/**
 * Delete a tenant and optionally its associated data.
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  const db = getDb();
  // Delete tenant-owned collections first (best effort)
  const collectionsToDelete = ['projects', 'tasks', 'expenses', 'suppliers', 'chat', 'gallery'];
  for (const col of collectionsToDelete) {
    try {
      const snap: QuerySnapshot = await db.collection(col).where(TENANT_USER_FIELD, '==', tenantId).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn(`[Tenant] Failed to clean collection "${col}":`, err);
    }
  }
  await db.collection(TENANTS_COLLECTION).doc(tenantId).delete();
}

/* ===== PLAN LIMIT ENFORCEMENT ===== */

/**
 * Check if a tenant has reached their plan limit for a resource.
 * Returns { allowed: boolean, current: number, max: number, message?: string }
 */
export function checkPlanLimit(
  tenant: { data: Tenant['data'] },
  resource: 'projects' | 'users' | 'storage',
): { allowed: boolean; current: number; max: number; message?: string } {
  const { limits, stats } = tenant.data;
  const isUnlimited = limits.maxProjects === -1;
  if (isUnlimited) return { allowed: true, current: 0, max: -1 };

  const currentMap = {
    projects: stats.projectCount,
    users: stats.userCount,
    storage: stats.storageUsed,
  };
  const maxMap = {
    projects: limits.maxProjects,
    users: limits.maxUsers,
    storage: limits.maxStorage,
  };

  const current = currentMap[resource] || 0;
  const max = maxMap[resource] || 0;

  if (current >= max) {
    const labels = { projects: 'proyectos', users: 'usuarios', storage: 'almacenamiento' };
    return {
      allowed: false,
      current,
      max,
      message: `Límite alcanzado: ${current}/${max} ${labels[resource]}. Actualiza tu plan para más capacidad.`,
    };
  }
  return { allowed: true, current, max };
}

/* ===== STORAGE HELPERS ===== */

/**
 * Format MB value to human-readable string.
 */
export function formatStorageMB(mb: number): string {
  if (mb === -1) return 'Ilimitado';
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/**
 * Get the default tenant limits for a given plan.
 */
export function getDefaultLimits(plan: TenantPlan): TenantLimits {
  const cfg = TENANT_PLAN_LIMITS[plan];
  return {
    maxProjects: cfg.maxProjects,
    maxUsers: cfg.maxUsers,
    maxStorage: cfg.maxStorage,
  };
}

/**
 * Get empty stats for a new tenant.
 */
export function getEmptyStats(): TenantStats {
  return { userCount: 0, projectCount: 0, storageUsed: 0 };
}
