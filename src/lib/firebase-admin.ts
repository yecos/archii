import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let _adminDb: ReturnType<typeof getFirestore> | null = null;
let _adminAuth: ReturnType<typeof getAuth> | null = null;
let _initAttempted = false;

function initAdmin() {
  if (_initAttempted) return;
  _initAttempted = true;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !rawKey || !clientEmail) {
      console.warn('[Firebase Admin] Missing FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL env vars — admin SDK not initialized');
      return;
    }

    const privateKey = rawKey.replace(/\\n/g, '\n');

    const serviceAccount: ServiceAccount = {
      projectId,
      privateKey,
      clientEmail,
    };

    const adminApp = getApps().length ? getApp() : initializeApp({
      credential: cert(serviceAccount),
    });

    _adminDb = getFirestore(adminApp);
    _adminAuth = getAuth(adminApp);
    console.log('[Firebase Admin] Initialized successfully');
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization failed:', err?.message || err);
  }
}

// Lazy getter — safe to call even without credentials (returns null)
export function getAdminDb() {
  initAdmin();
  return _adminDb;
}

export function adminDb() {
  initAdmin();
  return _adminDb;
}

export function adminAuth() {
  initAdmin();
  return _adminAuth;
}

export { FieldValue };

// Default export (lazy)
export default {
  get db() { initAdmin(); return _adminDb; },
  get auth() { initAdmin(); return _adminAuth; },
};
