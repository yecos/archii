/**
 * firebase-admin.ts
 * Firebase Admin SDK para uso en API routes (server-side).
 * El firebase-service.ts usa window.firebase (client-side),
 * pero las API routes corren en el servidor donde no existe window.
 *
 * IMPORTANTE: El project_id de las credenciales DEBE coincidir con
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID. Si no coinciden, Firestore fallará
 * con PERMISSION_DENIED porque el service account no tiene acceso
 * a la base de datos del otro proyecto.
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
let _credProjectId: string | null = null;  // project_id from credentials JSON
let _appProjectId: string | null = null;   // project_id used by the app

const APP_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!APP_PROJECT_ID) {
  console.warn('[ArchiFlow Admin] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Admin SDK may not work correctly.');
}

export function getAdminProjectId(): string {
  return APP_PROJECT_ID || '';
}

/**
 * Returns detailed init status including project mismatch detection.
 */
export function getAdminInitStatus(): {
  method: string;
  error: string | null;
  projectId: string;
  credProjectId: string | null;
  mismatch: boolean;
} {
  return {
    method: _initMethod,
    error: _initError,
    projectId: _appProjectId || APP_PROJECT_ID || '',
    credProjectId: _credProjectId,
    mismatch: !!(_credProjectId && _credProjectId !== APP_PROJECT_ID),
  };
}

// Credenciales para firebase-admin desde variables de entorno
function getAdminConfig() {
  // 1. Full JSON credentials
  const credJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (credJson) {
    try {
      const parsed = JSON.parse(credJson);
      _initMethod = 'FIREBASE_ADMIN_CREDENTIALS';
      _credProjectId = parsed.project_id || null;

      // Detect project mismatch
      if (parsed.project_id && parsed.project_id !== APP_PROJECT_ID) {
        _initError = `PROJECT_MISMATCH: Las credenciales son para "${parsed.project_id}" pero la app usa "${APP_PROJECT_ID}". Necesitas credenciales del proyecto "${APP_PROJECT_ID}".`;
        console.error(`[ArchiFlow Admin] ${_initError}`);
      } else {
        console.log(`[ArchiFlow Admin] Using FIREBASE_ADMIN_CREDENTIALS (project: ${parsed.project_id || APP_PROJECT_ID})`);
      }

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
      return cert({ clientEmail, privateKey, projectId: APP_PROJECT_ID } as import('firebase-admin/app').ServiceAccount);
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
        _credProjectId = parsed.project_id || null;
        if (parsed.project_id && parsed.project_id !== APP_PROJECT_ID) {
          _initError = `PROJECT_MISMATCH: GOOGLE_APPLICATION_CREDENTIALS es para "${parsed.project_id}" pero la app usa "${APP_PROJECT_ID}".`;
          console.error(`[ArchiFlow Admin] ${_initError}`);
        }
        return cert(parsed);
      }
    } catch {
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

export function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApp();
  } else {
    _appProjectId = APP_PROJECT_ID || null;
    const credential = getAdminConfig();
    const config: { projectId: string; credential?: ReturnType<typeof cert> } = {
      projectId: APP_PROJECT_ID || '',
    };
    // Only pass credential if we got a valid one — undefined causes init error
    if (credential) {
      config.credential = credential;
    }
    _adminApp = initializeApp(config);
  }
  return _adminApp;
}

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  _adminDb = getFirestore(getAdminApp());
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
