import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * POST /api/migrate-tenant
 * Asigna un tenantId a todos los documentos huérfanos de una colección.
 * Usa .set() con merge:true para evitar NOT_FOUND cuando el doc no existe.
 *
 * Body: { collection: string, tenantId: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
    }

    // Inicializar Firebase Admin
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const { collection: collectionName, tenantId } = await req.json();
    if (!collectionName || !tenantId) {
      return NextResponse.json({ error: 'Faltan parámetros: collection, tenantId' }, { status: 400 });
    }

    // Listas de seguridad: solo permitir colecciones conocidas
    const allowedCollections = [
      'projects', 'tasks', 'expenses', 'suppliers', 'companies',
      'invoices', 'quotations', 'comments', 'galleryPhotos',
      'invProducts', 'invCategories', 'invMovements', 'invTransfers',
      'meetings', 'timeEntries', 'approvals',
    ];
    if (!allowedCollections.includes(collectionName)) {
      return NextResponse.json({ error: `Colección no permitida: ${collectionName}` }, { status: 400 });
    }

    const snapshot = await db.collection(collectionName).get();
    let updated = 0;
    let skipped = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Skip si ya tiene tenantId asignado
      if (data.tenantId) {
        skipped++;
        continue;
      }
      // Usar .set() con merge:true para evitar NOT_FOUND
      batch.set(doc.ref, { tenantId }, { merge: true });
      batchCount++;
      updated++;

      // Firestore batches have a limit of 500 operations
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      collection: collectionName,
      tenantId,
      total: snapshot.size,
      updated,
      skipped,
    });
  } catch (error: any) {
    console.error('[migrate-tenant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
