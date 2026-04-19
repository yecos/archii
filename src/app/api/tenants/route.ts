import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/tenants
 *
 * Gestión de tenants (espacios de trabajo) para multi-tenancy.
 * Flujo:
 *   1. Login/Register (Firebase Auth)
 *   2. Pantalla de Tenant:
 *      - Si NO tiene tenants → Crear uno (se convierte en Super Admin)
 *      - Si tiene 1 tenant → Auto-seleccionar
 *      - Si tiene varios → Mostrar selector
 *      - Si lo invitan con código → Entra como Miembro
 *
 * Operaciones:
 *   - create: Crear un nuevo tenant (creador = Super Admin)
 *   - join: Unirse a un tenant por código (entra como Miembro)
 *   - list: Listar los tenants del usuario con su rol
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

/**
 * Migrate existing unassigned data to a new tenant.
 * Updates all documents in the collections that either:
 * - Don't have a 'tenantId' field
 * - Have 'tenantId' set to null or empty string
 *
 * Each collection may use different field names for the user reference:
 * - Most use 'createdBy'
 * - Comments and messages use 'userId'
 *
 * This is used when creating a new tenant and the user wants to
 * assign their existing data to the new tenant for isolation.
 */
async function migrateExistingData(
  db: any,
  tenantId: string,
  userId: string
): Promise<Record<string, number>> {
  // Mapping: collection name -> possible user reference field names
  const collectionConfig: Record<string, string[]> = {
    'projects': ['createdBy'],
    'tasks': ['createdBy'],
    'expenses': ['createdBy'],
    'suppliers': ['createdBy'],
    'companies': ['createdBy'],
    'meetings': ['createdBy'],
    'galleryPhotos': ['createdBy'],
    'invProducts': ['createdBy'],
    'invCategories': ['createdBy'],
    'invMovements': ['createdBy'],
    'invTransfers': ['createdBy'],
    'timeEntries': ['createdBy'],
    'invoices': ['createdBy', 'userId'],
    'comments': ['userId'],
    'generalMessages': ['userId', 'senderId'],
  };

  const counts: Record<string, number> = {};
  let totalMigrated = 0;

  for (const [collectionName, userFields] of Object.entries(collectionConfig)) {
    try {
      let migrated = 0;
      let batch = db.batch();
      let batchCount = 0;

      // Try each user field until we find documents
      for (const userField of userFields) {
        try {
          const snap = await db.collection(collectionName)
            .where(userField, '==', userId)
            .limit(500)
            .get();

          for (const doc of snap.docs) {
            const data = doc.data();
            const currentTenantId = data.tenantId;
            // Only migrate if not already assigned to a tenant
            if (!currentTenantId || currentTenantId === '' || currentTenantId === null) {
              batch.update(doc.ref, { tenantId });
              batchCount++;
              migrated++;

              if (batchCount >= 450) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
              }
            }
          }

          // If we found documents with this field, no need to try other fields
          if (!snap.empty) break;
        } catch (queryErr: any) {
          // If the field doesn't exist in the collection, the query will fail
          // Skip to the next user field
          console.warn(`[Tenants] Query on ${collectionName}.${userField} failed:`, queryErr.message);
          continue;
        }
      }

      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
      }

      if (migrated > 0) {
        counts[collectionName] = migrated;
        totalMigrated += migrated;
        console.log(`[Tenants] Migrated ${migrated} documents from ${collectionName} to tenant ${tenantId}`);
      }
    } catch (err) {
      console.error(`[Tenants] Error migrating ${collectionName}:`, err);
      counts[collectionName] = -1; // Error marker
    }
  }

  console.log(`[Tenants] Total migrated: ${totalMigrated} documents to tenant ${tenantId}`);
  return counts;
}

export async function POST(request: NextRequest) {
  // Auth check first (reads Authorization header, not body)
  let user: any;
  try {
    user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  // Read body ONCE — request.json() can only be called once
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { action, name, code } = body;

  if (!action || !["create", "join", "list"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida. Usa: create, join, list" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    if (action === "list") {
      // List tenants where user is a member, with their role in each tenant
      const snap = await db.collection("tenants").where("members", "array-contains", user.uid).get();
      const tenants = snap.docs.map((d: any) => {
        const data = d.data();
        // Determine user's role: Super Admin if they created it, Miembro otherwise
        const isCreator = data.createdBy === user.uid;
        return {
          id: d.id,
          name: data.name || '',
          code: data.code || '',
          members: data.members || [],
          createdBy: data.createdBy || '',
          createdAt: data.createdAt || null,
          role: isCreator ? 'Super Admin' : 'Miembro',
        };
      });
      return NextResponse.json({ tenants });
    }

    if (action === "create") {
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
      }

      const migrateExisting = body.migrateExisting === true;
      const tenantCode = await ensureUniqueCode(db);
      const tenantRef = await db.collection("tenants").add({
        name: name.trim(),
        code: tenantCode,
        members: [user.uid],
        createdBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`[Tenants] Created tenant "${name.trim()}" (${tenantCode}) by ${user.email} — Super Admin`);

      // Migrate existing unassigned data to this new tenant
      let migratedCounts: Record<string, number> | null = null;
      if (migrateExisting) {
        migratedCounts = await migrateExistingData(db, tenantRef.id, user.uid);
        console.log(`[Tenants] Migration complete for tenant ${tenantRef.id}:`, migratedCounts);
      }

      return NextResponse.json({
        tenantId: tenantRef.id,
        name: name.trim(),
        code: tenantCode,
        role: 'Super Admin', // Creator is always Super Admin
        migratedCounts,
      });
    }

    if (action === "join") {
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
      const isCreator = tenantData.createdBy === user.uid;

      if (tenantData.members && tenantData.members.includes(user.uid)) {
        return NextResponse.json({
          tenantId,
          name: tenantData.name,
          code: tenantData.code,
          role: isCreator ? 'Super Admin' : 'Miembro',
          alreadyMember: true,
        });
      }

      // Add user to members array (joins as Miembro)
      await db.collection("tenants").doc(tenantId).update({
        members: FieldValue.arrayUnion(user.uid),
      });

      console.log(`[Tenants] User ${user.email} joined tenant "${tenantData.name}" (${code}) as Miembro`);

      return NextResponse.json({
        tenantId,
        name: tenantData.name,
        code: tenantData.code,
        role: 'Miembro', // Joined users are always Miembro
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[Tenants] Error:", message);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
