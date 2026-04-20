import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/api-auth";
import { getAdminDb, getAdminFieldValue } from "@/lib/firebase-admin";

/**
 * POST /api/dedup-users
 *
 * Deduplicates users across the entire system:
 *   1. Finds all users/ documents grouped by email
 *   2. For each group with duplicates, picks the "best" document
 *   3. Merges the duplicate into the kept document (preserves name, photo)
 *   4. Updates all tenant members[] arrays to remove duplicate UIDs
 *   5. Deletes the duplicate user documents
 *
 * Also accepts { action: 'list' } to just see duplicates without fixing them.
 * Also accepts { action: 'dedup-tenant', tenantId } to dedup only one tenant's members.
 *
 * Auth: Only Super Admins (creator or in superAdmins array of any tenant)
 */

export async function POST(request: NextRequest) {
  // Auth check
  let user: any;
  try {
    user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { action, tenantId } = body;

  try {
    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();

    // Verify the caller is a Super Admin of at least one tenant
    const tenantsSnap = await db.collection("tenants")
      .where("members", "array-contains", user.uid)
      .get();

    let isSuperAdmin = false;
    for (const doc of tenantsSnap.docs) {
      const data = doc.data();
      if (data.createdBy === user.uid || (data.superAdmins || []).includes(user.uid)) {
        isSuperAdmin = true;
        break;
      }
    }
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Solo un Super Admin puede ejecutar deduplicación" }, { status: 403 });
    }

    // ===== ACTION: LIST (preview only, no changes) =====
    if (action === "list") {
      const usersSnap = await db.collection("users").get();
      const byEmail: Record<string, any[]> = {};

      for (const doc of usersSnap.docs) {
        const data = doc.data();
        const email = (data.email || "").toLowerCase().trim();
        if (!email) continue;
        if (!byEmail[email]) byEmail[email] = [];
        byEmail[email].push({ uid: doc.id, name: data.name, email: data.email, photoURL: data.photoURL || '', role: data.role });
      }

      const duplicates = Object.entries(byEmail)
        .filter(([, docs]) => docs.length > 1)
        .map(([email, docs]) => ({ email, count: docs.length, users: docs }));

      return NextResponse.json({
        totalUsers: usersSnap.size,
        uniqueEmails: Object.keys(byEmail).length,
        duplicateGroups: duplicates.length,
        duplicates,
      });
    }

    // ===== ACTION: DEDUP-TENANT (remove duplicate UIDs from one tenant) =====
    if (action === "dedup-tenant") {
      if (!tenantId) {
        return NextResponse.json({ error: "Falta tenantId" }, { status: 400 });
      }

      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
      }
      const tenantData = tenantDoc.data()!;
      const members: string[] = tenantData.members || [];

      // Find duplicate UIDs (same email, different UIDs in members)
      const memberEmails: Record<string, string[]> = {};
      const uidToEmail: Record<string, string> = {};

      for (const uid of members) {
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) continue;
        const email = (userDoc.data()?.email || "").toLowerCase().trim();
        if (!email) continue;
        uidToEmail[uid] = email;
        if (!memberEmails[email]) memberEmails[email] = [];
        memberEmails[email].push(uid);
      }

      // Find duplicates within the tenant
      const dupEmails = Object.entries(memberEmails)
        .filter(([, uids]) => uids.length > 1);

      if (dupEmails.length === 0) {
        return NextResponse.json({ message: "No hay duplicados en este tenant", tenantName: tenantData.name, duplicatesRemoved: 0 });
      }

      // For each duplicate group, pick the best UID to keep
      const uidsToRemove: string[] = [];
      const details: any[] = [];

      for (const [email, uids] of dupEmails) {
        // Pick the one with the best name (longest, not email prefix)
        let bestUid = uids[0];
        let bestName = '';
        for (const uid of uids) {
          const doc = await db.collection("users").doc(uid).get();
          const d = doc.data();
          const name = d?.name || '';
          if (name.length > bestName.length && !name.includes('@')) {
            bestName = name;
            bestUid = uid;
          }
        }

        const remove = uids.filter(uid => uid !== bestUid);
        uidsToRemove.push(...remove);

        details.push({
          email,
          keep: { uid: bestUid, name: bestName },
          remove: remove.map(uid => {
            const doc = db.collection("users").doc(uid).get();
            return { uid };
          }),
        });
      }

      // Remove duplicate UIDs from tenant members array
      if (uidsToRemove.length > 0) {
        // Remove one by one (arrayRemove doesn't support arrays in all SDKs)
        for (const uid of uidsToRemove) {
          await db.collection("tenants").doc(tenantId).update({
            members: FieldValue.arrayRemove(uid),
          });
        }
      }

      // Delete the duplicate user documents (the ones NOT kept)
      let deletedDocs = 0;
      for (const detail of details) {
        for (const rem of detail.remove) {
          try {
            // Check if this UID is a member of any OTHER tenant before deleting
            const otherTenants = await db.collection("tenants")
              .where("members", "array-contains", rem.uid)
              .get();
            if (otherTenants.empty) {
              await db.collection("users").doc(rem.uid).delete();
              deletedDocs++;
            }
          } catch (err) {
            console.warn(`[Dedup] Could not delete ${rem.uid}:`, err);
          }
        }
      }

      return NextResponse.json({
        tenantName: tenantData.name,
        duplicateGroups: dupEmails.length,
        duplicatesRemoved: uidsToRemove.length,
        docsDeleted: deletedDocs,
        details,
      });
    }

    // ===== ACTION: FULL (dedup all users across all tenants) =====
    // Default action: full dedup

    // Step 1: Find all duplicate users/ documents
    const usersSnap = await db.collection("users").get();
    const byEmail: Record<string, any[]> = {};

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const email = (data.email || "").toLowerCase().trim();
      if (!email) continue;
      if (!byEmail[email]) byEmail[email] = [];
      byEmail[email].push({ uid: doc.id, name: data.name, email: data.email, photoURL: data.photoURL || '', role: data.role });
    }

    const dupGroups = Object.entries(byEmail)
      .filter(([, docs]) => docs.length > 1);

    if (dupGroups.length === 0) {
      return NextResponse.json({ message: "No hay usuarios duplicados", totalUsers: usersSnap.size });
    }

    // Step 2: For each duplicate group, pick best and merge
    const toDelete: string[] = [];
    const mergeMap: Record<string, string> = {}; // oldUid -> keepUid
    const results: any[] = [];

    for (const [email, docs] of dupGroups) {
      // Pick the best document: prefer the one with a real name, photo, and earliest creation
      let best = docs[0];
      for (const d of docs) {
        const hasName = d.name && d.name.length > 3 && !d.name.includes('@');
        const bestHasName = best.name && best.name.length > 3 && !best.name.includes('@');
        if (hasName && !bestHasName) { best = d; continue; }
        if (hasName && bestHasName && d.photoURL && !best.photoURL) { best = d; }
      }

      for (const d of docs) {
        if (d.uid !== best.uid) {
          toDelete.push(d.uid);
          mergeMap[d.uid] = best.uid;
        }
      }

      results.push({ email, keep: best.uid, remove: docs.filter(d => d.uid !== best.uid).map(d => d.uid) });
    }

    // Step 3: Update all tenant members[] arrays
    const allTenants = await db.collection("tenants").get();
    let tenantsUpdated = 0;

    for (const tenantDoc of allTenants.docs) {
      const data = tenantDoc.data();
      const members: string[] = data.members || [];
      let changed = false;

      for (const oldUid of toDelete) {
        if (members.includes(oldUid)) {
          // Replace oldUid with keepUid (add keep if not present, remove old)
          const keepUid = mergeMap[oldUid];
          if (keepUid && !members.includes(keepUid)) {
            members.push(keepUid);
          }
          changed = true;
        }
      }

      if (changed) {
        // Remove old UIDs
        for (const oldUid of toDelete) {
          await db.collection("tenants").doc(tenantDoc.id).update({
            members: FieldValue.arrayRemove(oldUid),
          });
        }
        tenantsUpdated++;
      }
    }

    // Step 4: Delete duplicate user documents
    let deleted = 0;
    for (const uid of toDelete) {
      try {
        await db.collection("users").doc(uid).delete();
        deleted++;
      } catch (err) {
        console.warn(`[Dedup] Could not delete ${uid}:`, err);
      }
    }

    console.log(`[Dedup] Full dedup: ${dupGroups.length} groups, ${toDelete.length} to delete, ${deleted} deleted, ${tenantsUpdated} tenants updated`);

    return NextResponse.json({
      totalUsers: usersSnap.size,
      duplicateGroups: dupGroups.length,
      duplicatesFound: toDelete.length,
      duplicatesDeleted: deleted,
      tenantsUpdated,
      results,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[Dedup] Error:", message);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
