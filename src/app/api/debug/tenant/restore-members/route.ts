import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/debug/tenant/restore-members
 * Temporal — restaurar miembros de un tenant.
 * Body: { tenantId: string, emails: string[] }
 * Eliminar después de diagnosticar.
 */
export async function POST(request: NextRequest) {
  let user: any;
  try {
    user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId, emails } = body;

    if (!tenantId || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Faltan tenantId o emails" }, { status: 400 });
    }

    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    // Verify tenant exists and user is creator
    const tenantDoc = await db.collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }
    const tenantData = tenantDoc.data()!;
    if (tenantData.createdBy !== user.uid) {
      return NextResponse.json({ error: "Solo el creador puede restaurar miembros" }, { status: 403 });
    }

    // Find user UIDs by email
    const uidsToAdd: string[] = [];
    const notFound: string[] = [];
    const alreadyMembers: string[] = [];
    const currentMembers: string[] = tenantData.members || [];

    for (const email of emails) {
      const snap = await db.collection("users").where("email", "==", email.trim().toLowerCase()).limit(1).get();
      if (snap.empty) {
        notFound.push(email);
        continue;
      }
      const uid = snap.docs[0].id;
      if (currentMembers.includes(uid)) {
        alreadyMembers.push(email);
      } else {
        uidsToAdd.push(uid);
      }
    }

    // Add members
    if (uidsToAdd.length > 0) {
      await db.collection("tenants").doc(tenantId).update({
        members: FieldValue.arrayUnion(...uidsToAdd),
      });
    }

    return NextResponse.json({
      tenantName: tenantData.name,
      added: uidsToAdd.length,
      notFound,
      alreadyMembers,
      totalMembers: currentMembers.length + uidsToAdd.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
