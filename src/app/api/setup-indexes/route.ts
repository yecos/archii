import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * POST /api/setup-indexes
 * Creates all missing composite indexes for Firestore queries.
 * Run once to set up indexes, then delete this endpoint.
 *
 * Composite indexes needed for queries: where('tenantId', '==', X).orderBy('field', 'desc')
 */
export async function POST() {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'archiflow-prod-2026';
    const app = getAdminApp();
    // Access the underlying app options to get the project ID
    const options = (app as any).options || {};

    console.log('[Setup Indexes] Project:', projectId);

    // List all collections that need composite indexes for: tenantId ASC + field DESC
    const indexes: { collection: string; field: string; queryScope: string }[] = [
      // Collections with: where('tenantId', '==', x).orderBy('createdAt', 'desc')
      { collection: 'projects', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'tasks', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'expenses', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'suppliers', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'companies', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'meetings', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'invProducts', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'invMovements', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'invTransfers', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'timeEntries', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'invoices', field: 'createdAt', queryScope: 'COLLECTION' },
      { collection: 'galleryPhotos', field: 'createdAt', queryScope: 'COLLECTION' },
      // Special: invCategories ordered by 'name' ASC
      { collection: 'invCategories', field: 'name', queryScope: 'COLLECTION' },
      // General messages: where('tenantId', '==', x).orderBy('createdAt', 'asc')
      { collection: 'generalMessages', field: 'createdAt', queryScope: 'COLLECTION' },
      // Field notes (if they have tenant filter)
      { collection: 'fieldNotes', field: 'createdAt', queryScope: 'COLLECTION' },
    ];

    // Generate the links for manual creation
    const links: string[] = [];
    for (const idx of indexes) {
      // Base64 encode: collectionGroup, fields array
      const fieldsB64 = Buffer.from(JSON.stringify([
        { fieldPath: 'tenantId', order: 'ASCENDING' },
        { fieldPath: idx.field, order: idx.field === 'name' ? 'ASCENDING' : 'DESCENDING' },
      ])).toString('base64');

      // The __name__ ASC is implicitly added by Firestore for the collection group indexes
      const nameB64 = Buffer.from(JSON.stringify([
        { fieldPath: '__name__', order: 'ASCENDING' },
      ])).toString('base64');

      // Build the console link
      const link = `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes?create_composite=${fieldsB64}`;
      links.push({ collection: idx.collection, field: idx.field, link });
    }

    return NextResponse.json({
      message: 'Enlaces para crear índices compuestos',
      projectId,
      indexes: links,
      instructions: [
        'Haz clic en cada enlace para crear el índice compuesto en Firebase Console.',
        'Los índices se crean automáticamente — tardan unos minutos en estar listos.',
        'Después de crear los índices, recarga la app.',
        'Este endpoint puede eliminarse después de crear los índices.',
      ],
    });
  } catch (error: any) {
    console.error('[Setup Indexes] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
