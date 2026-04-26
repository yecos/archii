import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/debug/tenant/migrate-all-users
 * TEMPORAL — migra TODOS los usuarios de la coleccion 'users' al tenant indicado.
 * REQUIRES: Admin authentication (requireAdmin)
 *
 * Body: { tenantName?: string, tenantId?: string }
 */
export async function POST(request: NextRequest) {
  let user: any;
  try {
    // SECURITY: Upgraded from requireAuth to requireAdmin
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantName, tenantId } = body;

    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    // 1. Find the tenant
    let targetTenantId: string | null = null;
    let targetTenantName: string | null = null;

    if (tenantId) {
      // Use provided tenantId directly
      const doc = await db.collection("tenants").doc(tenantId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: `Tenant con ID "${tenantId}" no encontrado` }, { status: 404 });
      }
      targetTenantId = doc.id;
      targetTenantName = doc.data()!.name;
    } else {
      // Search by name (default: "TEMPLO")
      const searchTerm = (tenantName || "TEMPLO").toUpperCase();
      const tenantsSnap = await db.collection("tenants").get();
      const matches = tenantsSnap.docs.filter(d => {
        const name = (d.data().name || "").toUpperCase();
        return name.includes(searchTerm);
      });

      if (matches.length === 0) {
        return NextResponse.json({
          error: `No se encontró ningún tenant con "${tenantName || "TEMPLO"}"`,
          availableTenants: tenantsSnap.docs.map(d => ({ id: d.id, name: d.data().name })),
        }, { status: 404 });
      }

      if (matches.length > 1) {
        return NextResponse.json({
          error: `Se encontraron ${matches.length} tenants que coinciden`,
          matches: matches.map(d => ({ id: d.id, name: d.data().name })),
        }, { status: 400 });
      }

      targetTenantId = matches[0].id;
      targetTenantName = matches[0].data().name;
    }

    // 2. Get current members
    const tenantDoc = await db.collection("tenants").doc(targetTenantId).get();
    const tenantData = tenantDoc.data()!;
    const currentMembers: string[] = tenantData.members || [];

    // 3. Get ALL users from Firestore
    const usersSnap = await db.collection("users").get();
    const allUsers: { uid: string; name: string; email: string; role: string }[] = [];
    usersSnap.forEach(doc => {
      const d = doc.data();
      allUsers.push({
        uid: doc.id,
        name: d.name || "Sin nombre",
        email: d.email || "",
        role: d.role || "Miembro",
      });
    });

    // 4. Calculate which UIDs to add
    const uidsToAdd = allUsers
      .map(u => u.uid)
      .filter(uid => !currentMembers.includes(uid));

    const alreadyMembers = allUsers.filter(u => currentMembers.includes(u.uid));

    if (uidsToAdd.length === 0) {
      return NextResponse.json({
        message: `Todos los ${allUsers.length} usuarios ya son miembros del tenant "${targetTenantName}"`,
        tenantId: targetTenantId,
        tenantName: targetTenantName,
        totalUsers: allUsers.length,
        alreadyMembers: alreadyMembers.length,
        added: 0,
        newTotalMembers: currentMembers.length,
        users: allUsers,
      });
    }

    // 5. Add all missing users to tenant members array
    await db.collection("tenants").doc(targetTenantId).update({
      members: FieldValue.arrayUnion(...uidsToAdd),
    });

    return NextResponse.json({
      message: `Migración exitosa al tenant "${targetTenantName}"`,
      tenantId: targetTenantId,
      tenantName: targetTenantName,
      totalUsers: allUsers.length,
      alreadyMembers: alreadyMembers.length,
      added: uidsToAdd.length,
      newTotalMembers: currentMembers.length + uidsToAdd.length,
      usersAdded: allUsers.filter(u => uidsToAdd.includes(u.uid)),
      usersAlready: alreadyMembers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[Migrate All Users]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
