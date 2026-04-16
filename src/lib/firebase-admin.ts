/**
 * firebase-admin.ts
 * Firebase Admin SDK para uso en API routes (server-side).
 * El firebase-service.ts usa window.firebase (client-side),
 * pero las API routes corren en el servidor donde no existe window.
 *
 * Fuentes de credenciales (en orden de prioridad):
 *   1. FIREBASE_ADMIN_CREDENTIALS — JSON completo de service account
 *   2. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — credenciales individuales
 *   3. GOOGLE_APPLICATION_CREDENTIALS — JSON de credenciales (como string o path)
 *   4. Application Default Credentials (ADC) — automático en Google Cloud
 */

import { initializeApp, cert, getApps, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, type FieldValue } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Track initialization status for diagnostics
let _initMethod = 'none';
let _initError: string | null = null;

/**
 * Returns a description of how the Admin SDK was initialized.
 */
export function getAdminInitStatus(): { method: string; error: string | null; projectId: string } {
  return { method: _initMethod, error: _initError, projectId: getAdminProjectId() };
}

// Credenciales para firebase-admin desde variables de entorno
function getAdminConfig() {
  // 1. Full JSON credentials
  const credJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (credJson) {
    try {
      const parsed = JSON.parse(credJson);
      _initMethod = 'FIREBASE_ADMIN_CREDENTIALS';
      console.log(`[ArchiFlow Admin] Using FIREBASE_ADMIN_CREDENTIALS (project: ${parsed.project_id})`);
      // Sync project ID from credentials to avoid mismatch
      if (parsed.project_id) FIREBASE_PROJECT_ID_OVERRIDEN = parsed.project_id;
      return cert(parsed);
    } catch (e) {
      _initError = `Error parsing FIREBASE_ADMIN_CREDENTIALS: ${e instanceof Error ? e.message : e}`;
      console.error('[ArchiFlow Admin]', _initError);
    }
  }

  // 2. Individual env vars (client_email + private_key)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    try {
      _initMethod = 'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY';
      console.log(`[ArchiFlow Admin] Using individual credentials (${clientEmail})`);
      return cert({ client_email: clientEmail, private_key: privateKey, type: 'service_account' });
    } catch (e) {
      _initError = `Error using individual credentials: ${e instanceof Error ? e.message : e}`;
      console.error('[ArchiFlow Admin]', _initError);
    }
  }

  // 3. GOOGLE_APPLICATION_CREDENTIALS (JSON string on Vercel)
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gac) {
    try {
      const parsed = JSON.parse(gac);
      if (parsed.client_email && parsed.private_key) {
        _initMethod = 'GOOGLE_APPLICATION_CREDENTIALS (JSON)';
        console.log('[ArchiFlow Admin] Using GOOGLE_APPLICATION_CREDENTIALS as JSON');
        if (parsed.project_id) FIREBASE_PROJECT_ID_OVERRIDEN = parsed.project_id;
        return cert(parsed);
      }
    } catch {
      // Not JSON — might be a file path (not usable on Vercel serverless)
      _initError = 'GOOGLE_APPLICATION_CREDENTIALS is not valid JSON (might be a file path, not usable on Vercel)';
      console.warn('[ArchiFlow Admin]', _initError);
    }
  }

  // 4. Fallback to Application Default Credentials
  _initMethod = 'Application Default Credentials (ADC)';
  console.log('[ArchiFlow Admin] No explicit credentials found. Using ADC.');
  return undefined;
}

// Singleton
let _adminApp: ReturnType<typeof initializeApp> | null = null;
let _adminDb: ReturnType<typeof getFirestore> | null = null;

// Allow project_id override from credentials JSON to avoid mismatch
let FIREBASE_PROJECT_ID_OVERRIDEN: string | null = null;

export function getAdminProjectId(): string {
  return FIREBASE_PROJECT_ID_OVERRIDEN || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'archiflow-prod-2026';
}

export function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApp();
  } else {
    // getAdminConfig() may set FIREBASE_PROJECT_ID_OVERRIDEN
    const credential = getAdminConfig();
    _adminApp = initializeApp({
      projectId: FIREBASE_PROJECT_ID_OVERRIDEN || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'archiflow-prod-2026',
      credential,
    });
  }
  return _adminApp;
}

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  _adminDb = getFirestore(getAdminApp(), {
    // Use REST transport instead of gRPC — more reliable on Vercel/serverless
    preferRest: true,
  });
  return _adminDb;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * FieldValue equivalente para server-side
 */
let _fieldValue: typeof FieldValue | null = null;
export function getAdminFieldValue(): typeof FieldValue {
  if (_fieldValue) return _fieldValue;
  try {
    _fieldValue = require('firebase-admin/firestore').FieldValue;
  } catch {
    console.warn('[ArchiFlow Admin] Failed to load FieldValue via require, using import fallback');
    // Fallback: FieldValue is also available from the import
    const { FieldValue } = require('firebase-admin/firestore');
    _fieldValue = FieldValue;
  }
  return _fieldValue!;
}

/**
 * Tests if the Admin SDK Firestore connection is working.
 * Returns { ok, error, initStatus }
 */
export async function testAdminConnection(): Promise<{
  ok: boolean;
  error?: string;
  initStatus: ReturnType<typeof getAdminInitStatus>;
}> {
  try {
    const db = getAdminDb();
    // Try a simple read that should always work if properly authenticated
    const result = await db.collection('_health_check').limit(1).get();
    return {
      ok: true,
      initStatus: getAdminInitStatus(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: msg,
      initStatus: getAdminInitStatus(),
    };
  }
}
