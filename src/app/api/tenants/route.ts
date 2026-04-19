import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/tenants
 *
 * Gestión de tenants (espacios de trabajo) para multi-tenancy.
 * Operaciones:
 *   - create: Crear un nuevo tenant
 *   - join: Unirse a un tenant por código de invitación
 *   - list: Listar los tenants del usuario
 */

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function ensureUniqueCode(db: any): Promise<string> {
  let code = generateCode();
  let attempts = 0;
  while (attempts < 20) {
    const snap = await db.collection("tenants").where("code", "==", code).limit(1).get();
    if (snap.empty) return code;
    code = generateCode();
    attempts++;
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    if (!action || !["create", "join", "list"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida. Usa: create, join, list" }, { status: 400 });
    }

    // Re-auth after body parse
    let user: any;
    try {
      user = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    if (action === "list") {
      // List tenants where user is a member
      const snap = await db.collection("tenants").where("members", "array-contains", user.uid).get();
      const tenants = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ tenants });
    }

    if (action === "create") {
      const { name } = await request.json();
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
      }

      const code = await ensureUniqueCode(db);
      const tenantRef = await db.collection("tenants").add({
        name: name.trim(),
        code,
        members: [user.uid],
        createdBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`[Tenants] Created tenant "${name.trim()}" (${code}) by ${user.email}`);

      return NextResponse.json({
        tenantId: tenantRef.id,
        name: name.trim(),
        code,
      });
    }

    if (action === "join") {
      const { code } = await request.json();
      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "Código requerido" }, { status: 400 });
      }

      const snap = await db.collection("tenants").where("code", "==", code.trim().toUpperCase()).limit(1).get();

      if (snap.empty) {
        return NextResponse.json({ error: "Código no encontrado. Verifica e intenta de nuevo." }, { status: 404 });
      }

      const tenantDoc = snap.docs[0];
      const tenantData = tenantDoc.data();
      const tenantId = tenantDoc.id;

      if (tenantData.members && tenantData.members.includes(user.uid)) {
        return NextResponse.json({
          tenantId,
          name: tenantData.name,
          code: tenantData.code,
          alreadyMember: true,
        });
      }

      // Add user to members array
      await db.collection("tenants").doc(tenantId).update({
        members: FieldValue.arrayUnion(user.uid),
      });

      console.log(`[Tenants] User ${user.email} joined tenant "${tenantData.name}" (${code})`);

      return NextResponse.json({
        tenantId,
        name: tenantData.name,
        code: tenantData.code,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[Tenants] Error:", message);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
