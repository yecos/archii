/**
 * /api/tenant-sync-counts
 *
 * Recalcula stats.projectCount y stats.userCount para todos los tenants
 * basándose en los datos reales en Firestore.
 *
 * BUG FIX: Los usuarios se buscan client-side (no con array-contains)
 * porque tenants[] contiene objetos, no strings. Firestore's array-contains
 * requiere match exacto del elemento completo.
 *
 * Uso:
 *   POST /api/tenant-sync-counts              → Sincronizar todos los tenants
 *   POST /api/tenant-sync-counts?tenantId=xxx  → Sincronizar un tenant específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const specificTenantId = searchParams.get('tenantId');

    const db = getAdminDb();

    // Fetch all users once and build a tenant → users map
    // (We can't use array-contains because tenants[] contains objects, not strings)
    const allUsersSnap = await db.collection('users').get();
    const tenantUserMap = new Map<string, number>();

    for (const userDoc of allUsersSnap.docs) {
      const userData = userDoc.data();
      const tenants = (userData.tenants as Array<{ tenantId: string }>) || [];

      // New format: tenants[] array
      if (tenants.length > 0) {
        for (const m of tenants) {
          const count = tenantUserMap.get(m.tenantId) || 0;
          tenantUserMap.set(m.tenantId, count + 1);
        }
      }
      // Legacy format: tenantId string field
      else if (userData.tenantId) {
        const count = tenantUserMap.get(userData.tenantId as string) || 0;
        tenantUserMap.set(userData.tenantId as string, count + 1);
      }
    }

    if (specificTenantId) {
      // Sync a single tenant
      const projectSnap = await db
        .collection('projects')
        .where('tenantId', '==', specificTenantId)
        .get();

      const realUserCount = tenantUserMap.get(specificTenantId) || 0;

      await db.collection('tenants').doc(specificTenantId).update({
        'stats.projectCount': projectSnap.size,
        'stats.userCount': realUserCount,
      });

      return NextResponse.json({
        success: true,
        tenantId: specificTenantId,
        projectCount: projectSnap.size,
        userCount: realUserCount,
      });
    }

    // Sync all tenants
    const tenantsSnap = await db.collection('tenants').get();
    const results: Array<{
      tenantId: string;
      name: string;
      projectCount: number;
      userCount: number;
      previous: { projectCount: number; userCount: number };
    }> = [];

    const batch = db.batch();

    for (const tenantDoc of tenantsSnap.docs) {
      const tid = tenantDoc.id;
      const tData = tenantDoc.data();
      const previousStats = tData.stats || { projectCount: 0, userCount: 0 };

      // Count real projects
      const projectSnap = await db
        .collection('projects')
        .where('tenantId', '==', tid)
        .get();

      const newProjectCount = projectSnap.size;
      const newUserCount = tenantUserMap.get(tid) || 0;

      batch.update(tenantDoc.ref, {
        'stats.projectCount': newProjectCount,
        'stats.userCount': newUserCount,
      });

      results.push({
        tenantId: tid,
        name: tData.name || 'Sin nombre',
        projectCount: newProjectCount,
        userCount: newUserCount,
        previous: {
          projectCount: previousStats.projectCount || 0,
          userCount: previousStats.userCount || 0,
        },
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      tenantsSynced: results.length,
      details: results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Tenant Sync Counts] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
