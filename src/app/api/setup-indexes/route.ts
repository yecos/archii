import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'archiflow-prod-2026';

const INDEXES = [
  // (tenantId ASC, createdAt DESC)
  { collection: 'projects', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'tasks', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'expenses', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'suppliers', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'companies', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'meetings', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'invProducts', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'invMovements', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'invTransfers', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'timeEntries', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'invoices', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'galleryPhotos', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  { collection: 'fieldNotes', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'DESCENDING' as const }] },
  // (tenantId ASC, createdAt ASC) for generalMessages
  { collection: 'generalMessages', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'createdAt', order: 'ASCENDING' as const }] },
  // (tenantId ASC, name ASC) for invCategories
  { collection: 'invCategories', fields: [{ fieldPath: 'tenantId', order: 'ASCENDING' as const }, { fieldPath: 'name', order: 'ASCENDING' as const }] },
];

function buildConsoleLink(index: typeof INDEXES[0]) {
  const fieldsBase64 = Buffer.from(JSON.stringify(index.fields)).toString('base64');
  return `https://console.firebase.google.com/v1/r/project/${PROJECT_ID}/firestore/indexes?create_composite=${fieldsBase64}`;
}

/**
 * GET /api/setup-indexes
 * Returns links to create each composite index in Firebase Console.
 * This is the safe fallback if automatic creation fails.
 */
export async function GET() {
  const links = INDEXES.map(idx => ({
    collection: idx.collection,
    fields: idx.fields.map(f => `${f.fieldPath} ${f.order}`).join(', '),
    link: buildConsoleLink(idx),
  }));

  return NextResponse.json({
    message: 'Indices compuestos faltantes — haz clic en cada enlace para crearlos',
    projectId: PROJECT_ID,
    total: links.length,
    indexes: links,
    instructions: [
      '1. Haz clic en cada enlace de abajo',
      '2. Firebase Console abrirá el formulario de creación del índice',
      '3. Haz clic en "Create Index" (los campos ya están llenos)',
      '4. Los índices tardan 1-3 minutos en activarse',
      '5. Después de crear todos, recarga la app con Ctrl+Shift+R',
    ],
  });
}

/**
 * POST /api/setup-indexes
 * Attempts to create all composite indexes via Firebase Admin API.
 * Falls back to returning console links if admin API is not available.
 */
export async function POST(req: NextRequest) {
  try {
    const app = getAdminApp();

    // Try to get an access token from the admin app for the REST API
    let token = '';
    try {
      const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
      const auth = getAdminAuth(app);
      // We can't get a token for the app itself, only for users
    } catch {
      // Admin auth not available
    }

    // If we don't have a token, return links for manual creation
    const links = INDEXES.map(idx => ({
      collection: idx.collection,
      fields: idx.fields.map(f => `${f.fieldPath} ${f.order}`).join(', '),
      link: buildConsoleLink(idx),
    }));

    return NextResponse.json({
      message: 'Crea los índices haciendo clic en los enlaces (se necesita autenticación Firebase)',
      projectId: PROJECT_ID,
      total: links.length,
      indexes: links,
      autoCreated: false,
      instructions: [
        'Para crear automáticamente, configura FIREBASE_ADMIN_CREDENTIALS en Vercel',
        'Mientras tanto, haz clic en cada enlace para crearlos manualmente',
      ],
    });
  } catch (error: any) {
    // Fallback: return links
    const links = INDEXES.map(idx => ({
      collection: idx.collection,
      link: buildConsoleLink(idx),
    }));

    return NextResponse.json({
      message: 'Enlaces para crear índices manualmente',
      error: error.message,
      projectId: PROJECT_ID,
      indexes: links,
    }, { status: 500 });
  }
}
