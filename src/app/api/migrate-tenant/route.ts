/**
 * POST /api/migrate-tenant
 * One-time migration: creates a default tenant for the authenticated user
 * and assigns all their existing data (without tenantId) to that tenant.
 *
 * This handles the case where data was created BEFORE multi-tenant was added.
 * All collections that use tenantId filtering are migrated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adminFirestore = require('firebase-admin/firestore');

/** All Firestore collections that are tenant-scoped */
const TENANT_COLLECTIONS = [
  'projects',
  'tasks',
  'expenses',
  'suppliers',
  'companies',
  'invoices',
  'quotations',
  'meetings',
  'comments',
  'chat',
  'gallery',
  'invProducts',
  'invCategories',
  'invMovements',
  'invTransfers',
  'timeEntries',
  'timeSessions',
  'fieldNotes',
  'photoLog',
  'inspections',
  'purchaseOrders',
  'changeOrders',
  'formTemplates',
  'formInstances',
  'automations',
  'backupHistory',
] as const;

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const db = getAdminDb();

    // 1. Check if user already has tenants
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const existingTenants = userData.tenants as Array<{ tenantId: string }> | undefined;

    if (existingTenants && existingTenants.length > 0) {
      // User already has tenants — just migrate orphaned data
      const tenantId = existingTenants[0].tenantId;
      const result = await migrateOrphanedData(db, tenantId);
      return NextResponse.json({
        message: 'Migración completada (usuario ya tenía tenant)',
        tenantId,
        ...result,
      });
    }

    // 2. Create a default tenant
    const joinCode = generateJoinCode();
    const tenantRef = await db.collection('tenants').add({
      name: `${userData.name || userData.email || 'Mi'} Organización`,
      domain: '',
      logo: '',
      plan: 'pro',
      settings: { primaryColor: '', secondaryColor: '', customLogo: '' },
      limits: { maxProjects: 20, maxUsers: 25, maxStorage: 10240 },
      stats: { userCount: 1, projectCount: 0, storageUsed: 0 },
      joinCode,
      createdBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const tenantId = tenantRef.id;

    // 3. Add tenant to user's memberships
    await db.collection('users').doc(user.uid).update({
      tenants: [{
        tenantId,
        role: 'Admin',
        joinedAt: new Date(),
      }],
      tenantId: adminFirestore.FieldValue?.delete?.() || null, // Remove legacy field if it exists
    });

    // 4. Migrate all existing data to the new tenant
    const result = await migrateOrphanedData(db, tenantId);

    // 5. Count projects for tenant stats
    const projectCount = result.migrated['projects'] || 0;
    await db.collection('tenants').doc(tenantId).update({
      'stats.projectCount': projectCount,
    });

    return NextResponse.json({
      message: 'Tenant creado y datos migrados exitosamente',
      tenantId,
      tenantName: `${userData.name || userData.email || 'Mi'} Organización`,
      joinCode,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) throw error;
    console.error('[Migrate] Error:', error);
    return NextResponse.json(
      { error: 'Error en la migración', details: String(error) },
      { status: 500 },
    );
  }
}

async function migrateOrphanedData(
  db: FirebaseFirestore.Firestore,
  tenantId: string,
): Promise<{ migrated: Record<string, number>; total: number; errors: string[] }> {
  const migrated: Record<string, number> = {};
  let total = 0;
  const errors: string[] = [];

  for (const collection of TENANT_COLLECTIONS) {
    try {
      // Find all docs in this collection that DON'T have a tenantId
      const snap = await db.collection(collection)
        .where('tenantId', '==', '') // won't match anything
        .get();

      // Since empty string filter may not work as expected across all indexes,
      // use a different approach: fetch a batch and check individually
      // We'll use a simpler approach: query without tenantId filter for small collections
      // and use the not-equal filter approach
    } catch (queryErr) {
      // Index not available — skip this approach
    }

    try {
      // Alternative: fetch all and filter in memory (for migration only)
      // This is a one-time operation, so it's acceptable
      const snap = await db.collection(collection).limit(500).get();

      if (snap.empty) {
        migrated[collection] = 0;
        continue;
      }

      const docsToUpdate = snap.docs.filter(doc => {
        const data = doc.data() as Record<string, unknown>;
        // Update if tenantId is missing, empty, or null
        return !data.tenantId;
      });

      if (docsToUpdate.length === 0) {
        migrated[collection] = 0;
        continue;
      }

      // Batch update (max 500 per batch)
      const BATCH_SIZE = 400;
      let processed = 0;

      for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          batch.update(doc.ref, { tenantId });
          processed++;
        }

        try {
          await batch.commit();
        } catch (batchErr) {
          errors.push(`${collection}: batch at ${i} failed`);
          console.error(`[Migrate] ${collection} batch error:`, batchErr);
        }
      }

      migrated[collection] = processed;
      total += processed;
    } catch (err) {
      const msg = `${collection}: ${String(err)}`;
      errors.push(msg);
      console.error(`[Migrate] Error migrating ${collection}:`, err);
    }
  }

  return { migrated, total, errors };
}
