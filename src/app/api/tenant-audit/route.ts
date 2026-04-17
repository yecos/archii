/**
 * /api/tenant-audit
 *
 * Diagnóstico completo de integridad multi-tenant.
 * Verifica:
 * 1. Usuarios sin membresía de tenant (huérfanos)
 * 2. Usuarios con formato antiguo (tenantId string) no migrado
 * 3. Documentos en colecciones tenant-scoped sin campo tenantId
 * 4. Contadores stats inconsistentes en tenants
 * 5. Membresías duplicadas en users.tenants[]
 *
 * Uso:
 *   GET /api/tenant-audit              → Solo diagnóstico (lectura)
 *   POST /api/tenant-audit?fix=true    → Diagnóstico + auto-fix
 *   GET /api/tenant-audit?tenantId=xxx → Solo un tenant específico
 *
 * Requiere autenticación de admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/api-auth';

// All top-level collections that should have tenantId on every document
const TENANT_SCOPED_COLLECTIONS = [
  'projects', 'tasks', 'expenses', 'suppliers', 'companies',
  'invoices', 'quotations', 'meetings', 'comments', 'generalMessages',
  'galleryPhotos', 'dailyLogs', 'projectTemplates', 'directMessages',
  'invProducts', 'invCategories', 'invMovements', 'invTransfers',
  'timeEntries', 'timeSessions', 'fieldNotes', 'photoLog',
  'inspections', 'purchaseOrders', 'changeOrders', 'formTemplates',
  'formInstances', 'automations', 'backupHistory', 'approvals',
  'smartFiles', 'auditLogs',
];

interface AuditIssue {
  type: 'orphan_user' | 'legacy_format' | 'missing_tenantId' | 'duplicate_membership' | 'counter_mismatch' | 'missing_membership';
  severity: 'critical' | 'high' | 'medium' | 'low';
  collection: string;
  documentId: string;
  description: string;
  fixAction?: string;
}

export async function GET(request: NextRequest) {
  return handleAudit(request);
}

export async function POST(request: NextRequest) {
  return handleAudit(request);
}

async function handleAudit(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const shouldFix = searchParams.get('fix') === 'true' || request.method === 'POST';
    const specificTenantId = searchParams.get('tenantId');
    const specificCollection = searchParams.get('collection');

    const db = getAdminDb();
    const issues: AuditIssue[] = [];
    const stats = {
      totalUsers: 0,
      usersWithMemberships: 0,
      orphanUsers: 0,
      legacyUsers: 0,
      documentsChecked: 0,
      documentsMissingTenantId: 0,
      countersFixed: 0,
      membershipsFixed: 0,
    };

    // ===== 1. AUDIT: Users without tenant membership =====
    const usersSnap = await db.collection('users').get();
    stats.totalUsers = usersSnap.size;

    // Get all valid tenant IDs
    const tenantsSnap = await db.collection('tenants').get();
    const validTenantIds = new Set(tenantsSnap.docs.map(d => d.id));
    const tenantMap = new Map<string, string>();
    tenantsSnap.docs.forEach(d => tenantMap.set(d.id, d.data().name || 'Sin nombre'));

    const fixBatch = db.batch();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Check legacy format: old tenantId string field
      if (!userData.tenants || !Array.isArray(userData.tenants) || userData.tenants.length === 0) {
        if (userData.tenantId) {
          // Legacy format detected — needs migration
          stats.legacyUsers++;
          issues.push({
            type: 'legacy_format',
            severity: 'high',
            collection: 'users',
            documentId: uid,
            description: `Usuario "${userData.email}" tiene formato antiguo (tenantId: "${userData.tenantId}"). Debe migrarse a tenants[].`,
            fixAction: shouldFix ? 'Migrando a formato tenants[]...' : 'Usar ?fix=true para migrar automáticamente',
          });

          if (shouldFix && validTenantIds.has(userData.tenantId)) {
            const membership = {
              tenantId: userData.tenantId,
              role: userData.role || 'Miembro',
              joinedAt: userData.createdAt || new Date(),
            };
            fixBatch.update(userDoc.ref, {
              tenants: [membership],
              tenantId: getAdminFieldValue().delete(),
            });
            stats.membershipsFixed++;
          }
        } else {
          // Orphan user: no tenant at all
          stats.orphanUsers++;
          issues.push({
            type: 'orphan_user',
            severity: 'medium',
            collection: 'users',
            documentId: uid,
            description: `Usuario "${userData.email}" no tiene membresía de tenant ni formato antiguo.`,
            fixAction: 'Requiere asignación manual a un tenant.',
          });
        }
        continue;
      }

      stats.usersWithMemberships++;

      // Check for duplicate memberships (same tenantId multiple times)
      const tenants = userData.tenants as Array<{ tenantId: string }>;
      const seenIds = new Set<string>();
      for (const m of tenants) {
        if (seenIds.has(m.tenantId)) {
          issues.push({
            type: 'duplicate_membership',
            severity: 'medium',
            collection: 'users',
            documentId: uid,
            description: `Usuario "${userData.email}" tiene membresía duplicada en tenant "${m.tenantId}".`,
          });
          break;
        }
        seenIds.add(m.tenantId);
      }

      // Check for memberships pointing to non-existent tenants
      for (const m of tenants) {
        if (!validTenantIds.has(m.tenantId)) {
          issues.push({
            type: 'missing_membership',
            severity: 'high',
            collection: 'users',
            documentId: uid,
            description: `Usuario "${userData.email}" tiene membresía a tenant inexistente "${m.tenantId}".`,
          });
        }
      }

      // Deduplicate if fixing
      if (shouldFix && tenants.length !== seenIds.size) {
        const deduped = tenants.filter((m, i) => {
          const firstIdx = tenants.findIndex(t => t.tenantId === m.tenantId);
          return i === firstIdx;
        });
        // Also filter out memberships to non-existent tenants
        const cleaned = deduped.filter(m => validTenantIds.has(m.tenantId));
        fixBatch.update(userDoc.ref, { tenants: cleaned });
        stats.membershipsFixed++;
      }
    }

    if (shouldFix) {
      await fixBatch.commit();
    }

    // ===== 2. AUDIT: Documents missing tenantId =====
    const collectionsToCheck = specificCollection
      ? [specificCollection]
      : TENANT_SCOPED_COLLECTIONS;

    // Check only a sample (first 100 docs per collection) to avoid timeout
    const SAMPLE_SIZE = 100;

    for (const colName of collectionsToCheck) {
      try {
        const colSnap = await db.collection(colName).limit(SAMPLE_SIZE).get();
        for (const doc of colSnap.docs) {
          stats.documentsChecked++;
          const data = doc.data();
          if (!data.tenantId) {
            stats.documentsMissingTenantId++;
            issues.push({
              type: 'missing_tenantId',
              severity: 'critical',
              collection: colName,
              documentId: doc.id,
              description: `Documento sin tenantId en colección "${colName}". ${data.name || data.title || data.concept || ''}`,
            });
          }
        }
      } catch (err) {
        // Collection might not exist or require indexes — skip
        console.warn(`[Tenant Audit] Skipping collection "${colName}":`, err);
      }
    }

    // ===== 3. AUDIT: Tenant counter mismatches =====
    const tenantsToCheck = specificTenantId
      ? tenantsSnap.docs.filter(d => d.id === specificTenantId)
      : tenantsSnap.docs;

    // Build tenant → userCount map from the users we already loaded (above)
    const tenantUserCountMap = new Map<string, number>();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const tenants = (userData.tenants as Array<{ tenantId: string }>) || [];
      if (tenants.length > 0) {
        for (const m of tenants) {
          tenantUserCountMap.set(m.tenantId, (tenantUserCountMap.get(m.tenantId) || 0) + 1);
        }
      } else if (userData.tenantId) {
        tenantUserCountMap.set(userData.tenantId as string, (tenantUserCountMap.get(userData.tenantId as string) || 0) + 1);
      }
    }

    for (const tenantDoc of tenantsToCheck) {
      const tid = tenantDoc.id;
      const tData = tenantDoc.data();
      const storedStats = tData.stats || { projectCount: 0, userCount: 0 };

      // Count real projects
      const projectSnap = await db
        .collection('projects')
        .where('tenantId', '==', tid)
        .get();

      // Use pre-computed user count (can't use array-contains because tenants[] has objects)
      const realProjectCount = projectSnap.size;
      const realUserCount = tenantUserCountMap.get(tid) || 0;

      if (realProjectCount !== (storedStats.projectCount || 0)) {
        issues.push({
          type: 'counter_mismatch',
          severity: 'medium',
          collection: 'tenants',
          documentId: tid,
          description: `Tenant "${tData.name || tid}": projectCount almacenado=${storedStats.projectCount || 0}, real=${realProjectCount}.`,
        });

        if (shouldFix) {
          await db.collection('tenants').doc(tid).update({
            'stats.projectCount': realProjectCount,
          });
          stats.countersFixed++;
        }
      }

      if (realUserCount !== (storedStats.userCount || 0)) {
        issues.push({
          type: 'counter_mismatch',
          severity: 'medium',
          collection: 'tenants',
          documentId: tid,
          description: `Tenant "${tData.name || tid}": userCount almacenado=${storedStats.userCount || 0}, real=${realUserCount}.`,
        });

        if (shouldFix) {
          await db.collection('tenants').doc(tid).update({
            'stats.userCount': realUserCount,
          });
          stats.countersFixed++;
        }
      }
    }

    // ===== SUMMARY =====
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;

    return NextResponse.json({
      success: true,
      fixed: shouldFix,
      summary: {
        overall: criticalCount === 0 && highCount === 0 ? 'healthy' : criticalCount > 0 ? 'critical' : 'needs_attention',
        totalIssues: issues.length,
        bySeverity: { critical: criticalCount, high: highCount, medium: mediumCount, low: issues.length - criticalCount - highCount - mediumCount },
      },
      stats,
      issues,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Tenant Audit] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
