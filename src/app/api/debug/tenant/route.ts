import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/debug/tenant
 * Temporal — diagnosticar estado de tenants y usuarios.
 * PROTEGIDO: Solo administradores (requireAdmin).
 * Eliminar después de diagnosticar.
 */
export async function GET(request: NextRequest) {
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
    const result: any = { tenants: [], users: [] };

    // All tenants
    const tenantsSnap = await db.collection("tenants").get();
    for (const doc of tenantsSnap.docs) {
      const d = doc.data();
      const membersResolved: any[] = [];
      if (d.members && d.members.length > 0) {
        for (const uid of d.members) {
          const uDoc = await db.collection("users").doc(uid).get();
          membersResolved.push({
            uid,
            name: uDoc.exists ? uDoc.data()?.name : "NOT FOUND",
            email: uDoc.exists ? uDoc.data()?.email : "N/A",
          });
        }
      }
      result.tenants.push({
        id: doc.id,
        name: d.name,
        code: d.code,
        members: d.members || [],
        membersResolved,
        createdBy: d.createdBy,
        createdAt: d.createdAt?._seconds ? new Date(d.createdAt._seconds * 1000).toISOString() : null,
      });
    }

    // All users
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      const d = doc.data();
      result.users.push({
        uid: doc.id,
        name: d.name,
        email: d.email,
        role: d.role,
        photoURL: d.photoURL ? "YES" : "NO",
      });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
