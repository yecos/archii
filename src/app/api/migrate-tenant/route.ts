/**
 * POST /api/migrate-tenant
 * One-time migration: creates a default tenant for the authenticated user
 * and assigns all their existing data (without tenantId) to that tenant.
 *
 * This handles the case where data was created BEFORE multi-tenant was added.
 * All collections that use tenantId filtering are migrated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { authenticateRequestDebug } from '@/lib/api-auth';

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || "yecos11@gmail.com").split(",").map(e => e.trim().toLowerCase());

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
  'generalMessages',
  'galleryPhotos',
  'dailyLogs',
  'projectTemplates',
  'directMessages',
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
    // Authenticate with detailed error reporting
    const { user, error: authError } = await authenticateRequestDebug(request);

    if (authError) {
      return NextResponse.json(
        { error: `Autenticación fallida: ${authError.reason}`, detail: authError.detail },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Check admin
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json(
        { error: 'No autorizado. Solo admins.', email: user.email, allowedAdmins: ADMIN_EMAILS },
        { status: 403 },
      );
    }

    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    // Parse optional body (can pass { tenantId: "..." } to assign to existing tenant)
    let targetTenantId: string | null = null;
    let force = false;
    try {
      const body = await request.json();
      targetTenantId = body.tenantId || null;
      force = body.force === true;
    } catch { /* no body — will auto-detect */ }

    // 1. Check user and existing tenants
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado', uid: user.uid }, { status: 404 });
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const existingTenants = userData.tenants as Array<{ tenantId: string }> | undefined;

    let tenantId: string;

    // Priority: explicit tenantId param > first existing tenant > create new
    if (targetTenantId) {
      // Validate that the tenant exists
      const tenantDoc = await db.collection('tenants').doc(targetTenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant no encontrado', tenantId: targetTenantId }, { status: 404 });
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
    const result = await migrateOrphanedData(db, tenantId, force);

    // 3. Migrate project subcollections (tasks, comments, expenses)
    const subResult = await migrateProjectSubcollections(db, tenantId, force);

    // 4. Update project count in tenant stats
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
      forceUsed: force,
      projectSubcollections: subResult,
    });
  } catch (error: unknown) {
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
  force: boolean = false,
): Promise<{ migrated: Record<string, number>; total: number; errors: string[]; forceUsed: boolean }> {
  const migrated: Record<string, number> = {};
  let total = 0;
  const errors: string[] = [];

  for (const collection of TENANT_COLLECTIONS) {
    try {
      // Paginate through the entire collection using cursors
      let allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      const PAGE_SIZE = 500;
      let hasMore = true;

      while (hasMore) {
        let query = db.collection(collection).orderBy('__name__').limit(PAGE_SIZE);
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        const pageSnap = await query.get();
        if (pageSnap.empty) {
          hasMore = false;
        } else {
          allDocs = allDocs.concat(pageSnap.docs);
          lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
          if (pageSnap.docs.length < PAGE_SIZE) hasMore = false;
        }
      }

      if (allDocs.length === 0) {
        migrated[collection] = 0;
        continue;
      }

      const docsToUpdate = force
        ? allDocs
        : allDocs.filter(doc => {
            const data = doc.data() as Record<string, unknown>;
            return !data.tenantId;
          });

      if (docsToUpdate.length === 0) {
        migrated[collection] = 0;
        continue;
      }

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

  return { migrated, total, errors, forceUsed: force };
}

async function migrateProjectSubcollections(
  db: FirebaseFirestore.Firestore,
  tenantId: string,
  force: boolean = false,
): Promise<{ migrated: Record<string, Record<string, number>>; total: number; errors: string[] }> {
  const migrated: Record<string, Record<string, number>> = {};
  let total = 0;
  const errors: string[] = [];
  const SUBCOLLECTIONS = ['tasks', 'comments', 'expenses'] as const;

  try {
    // Get all projects belonging to the tenant
    const projectsSnap = await db.collection('projects').where('tenantId', '==', tenantId).get();

    if (projectsSnap.empty) {
      return { migrated, total, errors };
    }

    for (const projectDoc of projectsSnap.docs) {
      const projectId = projectDoc.id;

      for (const sub of SUBCOLLECTIONS) {
        try {
          const subRef = db.collection('projects').doc(projectId).collection(sub);

          // Paginate through subcollection using cursors
          let allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
          let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
          const PAGE_SIZE = 500;
          let hasMore = true;

          while (hasMore) {
            let query = subRef.orderBy('__name__').limit(PAGE_SIZE);
            if (lastDoc) {
              query = query.startAfter(lastDoc);
            }
            const pageSnap = await query.get();
            if (pageSnap.empty) {
              hasMore = false;
            } else {
              allDocs = allDocs.concat(pageSnap.docs);
              lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
              if (pageSnap.docs.length < PAGE_SIZE) hasMore = false;
            }
          }

          if (allDocs.length === 0) continue;

          const docsToUpdate = force
            ? allDocs
            : allDocs.filter(doc => {
                const data = doc.data() as Record<string, unknown>;
                return !data.tenantId;
              });

          if (docsToUpdate.length === 0) continue;

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
              errors.push(`${projectId}/${sub}: batch at ${i} failed`);
              console.error(`[Migrate] ${projectId}/${sub} batch error:`, batchErr);
            }
          }

          if (!migrated[projectId]) migrated[projectId] = {};
          migrated[projectId][sub] = processed;
          total += processed;
        } catch (err) {
          const msg = `${projectId}/${sub}: ${String(err)}`;
          errors.push(msg);
          console.error(`[Migrate] Error migrating ${projectId}/${sub}:`, err);
        }
      }
    }
  } catch (err) {
    const msg = `projects query: ${String(err)}`;
    errors.push(msg);
    console.error('[Migrate] Error querying projects for subcollection migration:', err);
  }

  return { migrated, total, errors };
}
