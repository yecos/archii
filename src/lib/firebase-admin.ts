/**
 * firebase-admin.ts
 * Firebase Admin SDK para uso en API routes (server-side).
 * El firebase-service.ts usa window.firebase (client-side),
 * pero las API routes corren en el servidor donde no existe window.
 *
 * Este módulo inicializa firebase-admin con las credenciales del proyecto.
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'archiflow-c2855';

// Credenciales para firebase-admin desde variables de entorno o JSON
function getAdminConfig() {
  // Si hay un JSON de credenciales completo, usarlo
  const credJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (credJson) {
    try {
      return cert(JSON.parse(credJson));
    } catch (e) {
      console.error('[ArchiFlow Admin] Error parseando FIREBASE_ADMIN_CREDENTIALS');
    }
  }

  // Si no, usar credenciales individuales (Application Default Credentials en Vercel)
  // Esto funciona si configuramos la cuenta de servicio en Vercel
  return undefined; // Usa ADC automáticamente
}

// Singleton
let _adminApp: ReturnType<typeof initializeApp> | null = null;
let _adminDb: ReturnType<typeof getFirestore> | null = null;

export function getAdminApp() {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApp();
  } else {
    _adminApp = initializeApp({
      projectId: FIREBASE_PROJECT_ID,
      credential: getAdminConfig(),
    });
  }
  return _adminApp;
}

export function getAdminDb() {
  if (_adminDb) return _adminDb;
  _adminDb = getFirestore(getAdminApp());
  return _adminDb;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

/**
 * FieldValue equivalente para server-side
 */
export function getAdminFieldValue() {
  return FieldValue;
}
