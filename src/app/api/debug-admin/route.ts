import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check FIREBASE_ADMIN_CREDENTIALS
  const credRaw = process.env.FIREBASE_ADMIN_CREDENTIALS;
  results.credExists = !!credRaw;
  results.credLength = credRaw ? credRaw.length : 0;
  results.credFirstChars = credRaw ? credRaw.substring(0, 100) : 'NOT SET';

  // 2. Try to parse it
  let credProjectId: string | null = null;
  let credClientEmail: string | null = null;
  let credHasPrivateKey = false;

  try {
    const parsed = JSON.parse(credRaw || '') as Record<string, unknown>;
    results.credParseable = true;
    credProjectId = String(parsed.project_id || '');
    credClientEmail = String(parsed.client_email || '');
    credHasPrivateKey = !!(
      parsed.private_key &&
      String(parsed.private_key).includes('BEGIN PRIVATE KEY')
    );
    results.credProjectId = credProjectId;
    results.credClientEmail = credClientEmail;
    results.credHasPrivateKey = credHasPrivateKey;
  } catch (e: unknown) {
    results.credParseable = false;
    results.credParseError = e instanceof Error ? e.message : String(e);
  }

  // 3. Check all relevant env vars
  results.envVars = {
    FIREBASE_ADMIN_CREDENTIALS: credRaw ? `SET (${credRaw.length} chars)` : 'NOT SET',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || 'NOT SET',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? `SET (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : 'NOT SET',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'NOT SET',
  };

  // 4. Try to initialize Firebase Admin from scratch
  let adminSuccess = false;
  try {
    if (credRaw && credProjectId && credClientEmail && credHasPrivateKey) {
      const { initializeApp, cert, getApps, getAuth } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');

      // Delete existing apps to force fresh init
      const existingApps = getApps();
      for (const app of existingApps) {
        try { await app.delete(); } catch { /* ignore */ }
      }

      const parsed = JSON.parse(credRaw) as Record<string, unknown>;
      const app = initializeApp({
        credential: cert(parsed as Parameters<typeof cert>[0]),
        projectId: credProjectId,
      });
      const auth = getAuth(app);
      const db = getFirestore(app);
      adminSuccess = true;
      results.adminInitMethod = 'FIREBASE_ADMIN_CREDENTIALS (fresh)';
    } else {
      results.adminInitMethod = 'CREDENTIALS INCOMPLETE';
      results.why = {
        hasRaw: !!credRaw,
        hasProjectId: !!credProjectId,
        hasClientEmail: !!credClientEmail,
        hasPrivateKey: credHasPrivateKey,
      };
    }
  } catch (e: unknown) {
    results.adminInitError = e instanceof Error ? e.message : String(e);
  }

  results.adminSuccess = adminSuccess;

  return NextResponse.json(results);
}
