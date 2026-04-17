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
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';

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
    const FieldValue = getAdminFieldValue();

    // Parse optional body (can pass { tenantId: "..." } to assign to existing tenant)
    let targetTenantId: string | null = null;
    try {
      const body = await request.json();
      targetTenantId = body.tenantId || null;
    } catch { /* no body — will auto-detect */ }

    // 1. Check user and existing tenants
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const existingTenants = userData.tenants as Array<{ tenantId: string }> | undefined;

    let tenantId: string;

    // Priority: explicit tenantId param > first existing tenant > create new
    if (targetTenantId) {
      // Validate that the tenant exists
      const tenantDoc = await db.collection('tenants').doc(targetTenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
      }
      tenantId = targetTenantId;
      // Ensure user is a member of this tenant
      if (existingTenants && !existingTenants.some(t => t.tenantId === targetTenantId)) {
        await db.collection('users').doc(user.uid).set({
          tenants: FieldValue.arrayUnion({
            tenantId,
            role: 'Admin',
            joinedAt: new Date(),
          }),
        }, { merge: true });
      }
    } else if (existingTenants && existingTenants.length > 0) {
      // No explicit tenantId — use first existing tenant
      tenantId = existingTenants[0].tenantId;
    } else {
      // No tenants at all — create a default one
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
      tenantId = tenantRef.id;

      // Add tenant to user's memberships
      await db.collection('users').doc(user.uid).set({
        tenants: [{
          tenantId,
          role: 'Admin',
          joinedAt: new Date(),
        }],
        tenantId: FieldValue.delete(),
      }, { merge: true });
    }

    // 2. Migrate all existing orphaned data to the target tenant
    const result = await migrateOrphanedData(db, tenantId);

    // 3. Update project count in tenant stats
    const projectCount = result.migrated['projects'] || 0;
    if (projectCount > 0) {
      await db.collection('tenants').doc(tenantId).set({
        'stats.projectCount': FieldValue.increment(projectCount),
      }, { merge: true });
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantName = tenantDoc.exists
      ? ((tenantDoc.data() as Record<string, unknown>).name as string || tenantId)
      : tenantId;

    return NextResponse.json({
      message: targetTenantId
        ? `Datos migrados al tenant "${tenantName}"`
        : `Tenant "${tenantName}" ${existingTenants?.length ? 'ya existía' : 'creado'} y datos migrados`,
      tenantId,
      tenantName,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
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
      // Fetch all docs in this collection and filter in memory
      // This is a one-time migration, so it's acceptable
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
          batch.set(doc.ref, { tenantId }, { merge: true });
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
