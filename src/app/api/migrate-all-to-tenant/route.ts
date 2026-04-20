import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminAuth, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/migrate-all-to-tenant
 *
 * Migracion de emergencia: agrega TODOS los usuarios de Firebase Auth
 * al tenant especificado (o al unico tenant existente si solo hay uno).
 *
 * PROTEGIDO: Solo administradores (requireAdmin).
 * TEMPORAL: eliminar despues de la migracion.
 *
 * Body (opcional):
 *   { tenantId?: string }
 */
export async function POST(request: NextRequest) {
  let user: any;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const adminAuth = getAdminAuth();
    const FieldValue = getAdminFieldValue();

    // Leer body opcional para tenantId
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body vacio esta bien
    }
    const { tenantId: requestedTenantId } = body;

    // ===== PASO 1: Encontrar el tenant destino =====
    const tenantsSnap = await db.collection("tenants").get();
    const allTenants = tenantsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let targetTenantId: string;
    let targetTenant: any;

    if (requestedTenantId) {
      const found = allTenants.find((t: any) => t.id === requestedTenantId);
      if (!found) {
        return NextResponse.json({ error: `Tenant ${requestedTenantId} no encontrado` }, { status: 404 });
      }
      targetTenantId = requestedTenantId;
      targetTenant = found;
    } else if (allTenants.length === 0) {
      return NextResponse.json({ error: "No existe ningun tenant. Crea uno primero." }, { status: 400 });
    } else if (allTenants.length === 1) {
      targetTenantId = allTenants[0].id;
      targetTenant = allTenants[0];
    } else {
      return NextResponse.json({
        error: "Hay multiples tenants. Especifica cual usar con { tenantId: '...' }",
        tenants: allTenants.map((t: any) => ({ id: t.id, name: t.name, code: t.code, memberCount: (t.members || []).length })),
      }, { status: 400 });
    }

    const currentMembers: string[] = targetTenant.members || [];

    console.log(`[MigrateAll] Target tenant: ${targetTenant.name} (${targetTenantId}), current members: ${currentMembers.length}`);

    // ===== PASO 2: Obtener TODOS los usuarios de Firebase Auth =====
    const authUsers: { uid: string; email: string; displayName: string; photoURL: string }[] = [];
    let pageToken: string | undefined;
    do {
      const listResult = await adminAuth.listUsers(1000, pageToken);
      for (const authUser of listResult.users) {
        authUsers.push({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || '',
          photoURL: authUser.photoURL || '',
        });
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    console.log(`[MigrateAll] Firebase Auth users found: ${authUsers.length}`);

    // ===== PASO 3: Obtener usuarios de la coleccion users =====
    const usersSnap = await db.collection("users").get();
    const existingUserDocs = new Map<string, any>();
    for (const doc of usersSnap.docs) {
      existingUserDocs.set(doc.id, doc.data());
    }
    console.log(`[MigrateAll] users/ collection docs: ${existingUserDocs.size}`);

    // ===== PASO 4: Crear documentos users para auth users que no tienen uno =====
    const ADMIN_EMAILS = ["yecos11@gmail.com"];
    const createdUserDocs: string[] = [];
    for (const authUser of authUsers) {
      if (!existingUserDocs.has(authUser.uid)) {
        const isAdmin = ADMIN_EMAILS.includes(authUser.email);
        await db.collection("users").doc(authUser.uid).set({
          name: authUser.displayName || authUser.email.split('@')[0],
          email: authUser.email,
          photoURL: authUser.photoURL || '',
          role: isAdmin ? 'Admin' : 'Miembro',
          createdAt: FieldValue.serverTimestamp(),
        });
        createdUserDocs.push(`${authUser.email} (${authUser.uid})`);
        console.log(`[MigrateAll] Created users doc for: ${authUser.email}`);
      }
    }

    // ===== PASO 5: Agregar TODOS los UIDs al tenant =====
    const allUids = authUsers.map(u => u.uid);
    const uidsToAdd = allUids.filter(uid => !currentMembers.includes(uid));

    if (uidsToAdd.length > 0) {
      await db.collection("tenants").doc(targetTenantId).update({
        members: FieldValue.arrayUnion(...uidsToAdd),
      });
      console.log(`[MigrateAll] Added ${uidsToAdd.length} users to tenant`);
    }

    // ===== PASO 6: Migrar documentos huérfanos (sin tenantId) =====
    const orphanCollections = [
      'projects', 'tasks', 'expenses', 'suppliers', 'companies',
      'meetings', 'galleryPhotos', 'invProducts', 'invCategories',
      'invMovements', 'invTransfers', 'timeEntries', 'invoices',
    ];

    const migrationResults: Record<string, number> = {};
    let totalOrphansMigrated = 0;

    for (const collectionName of orphanCollections) {
      try {
        const snap = await db.collection(collectionName).limit(500).get();
        let migrated = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snap.docs) {
          const data = doc.data();
          if (!data.tenantId || data.tenantId === '' || data.tenantId === null) {
            batch.update(doc.ref, { tenantId: targetTenantId });
            batchCount++;
            migrated++;
            if (batchCount >= 450) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        if (migrated > 0) {
          migrationResults[collectionName] = migrated;
          totalOrphansMigrated += migrated;
          console.log(`[MigrateAll] Migrated ${migrated} orphans from ${collectionName}`);
        }
      } catch (err: any) {
        console.warn(`[MigrateAll] Error migrating ${collectionName}:`, err.message);
        migrationResults[collectionName] = -1;
      }
    }

    // ===== PASO 7: Migrar generalMessages (orphan) =====
    try {
      const snap = await db.collection("generalMessages").limit(500).get();
      let migrated = 0;
      let batch = db.batch();
      let batchCount = 0;
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!data.tenantId || data.tenantId === '' || data.tenantId === null) {
          batch.update(doc.ref, { tenantId: targetTenantId });
          batchCount++;
          migrated++;
          if (batchCount >= 450) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
      if (batchCount > 0) await batch.commit();
      if (migrated > 0) {
        migrationResults['generalMessages'] = migrated;
        totalOrphansMigrated += migrated;
      }
    } catch (err: any) {
      console.warn(`[MigrateAll] Error migrating generalMessages:`, err.message);
    }

    // ===== RESULTADO =====
    const newTotalMembers = currentMembers.length + uidsToAdd.length;

    return NextResponse.json({
      success: true,
      message: `Migracion completada exitosamente`,
      tenant: {
        id: targetTenantId,
        name: targetTenant.name,
        code: targetTenant.code,
      },
      authUsers: authUsers.length,
      usersDocsBefore: existingUserDocs.size,
      usersDocsCreated: createdUserDocs.length,
      membersBefore: currentMembers.length,
      membersAdded: uidsToAdd.length,
      membersTotal: newTotalMembers,
      orphanDocsMigrated: totalOrphansMigrated,
      orphanBreakdown: Object.keys(migrationResults).length > 0 ? migrationResults : 'Ningun documento huérfano',
      allAuthUsers: authUsers.map(u => ({ uid: u.uid, email: u.email })),
      createdUserDetails: createdUserDocs,
      note: 'Todos los usuarios de Firebase Auth ahora son miembros del tenant. Haz Ctrl+Shift+R para ver los cambios.',
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[MigrateAll] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
