import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'archiflow-c2855',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
};

const adminApp = getApps().length ? getApp() : initializeApp({
  credential: serviceAccount.privateKey && serviceAccount.clientEmail
    ? cert(serviceAccount)
    : cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
});

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export { FieldValue };
export default adminApp;
