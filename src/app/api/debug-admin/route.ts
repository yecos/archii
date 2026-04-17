import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check FIREBASE_ADMIN_CREDENTIALS
  const credRaw = process.env.FIREBASE_ADMIN_CREDENTIALS;
  results.credExists = !!credRaw;
  results.credLength = credRaw?.length || 0;
  results.credFirstChars = credRaw ? credRaw.substring(0, 100) : 'NOT SET';

  // 2. Try to parse it
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(credRaw || '');
    results.credParseable = true;
    results.credProjectId = parsed.project_id;
    results.credClientEmail = parsed.client_email;
    results.credHasPrivateKey = !!(parsed.private_key && parsed.private_key.includes('BEGIN PRIVATE KEY'));
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
  let adminError: string | null = null;
  let adminSuccess = false;
  try {
    // Dynamic import to avoid cache
    const { initializeApp, cert, getApps, getApp, getAuth } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    // Delete existing apps to force fresh init
    const existingApps = getApps();
    for (const app of existingApps) {
      try { await app.delete(); } catch { /* ignore */ }
    }

    if (parsed) {
      const app = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id as string,
      });
      const auth = getAuth(app);
      // Try to verify a dummy operation
      const db = getFirestore(app);
      adminSuccess = true;
      results.adminInitMethod = 'FIREBASE_ADMIN_CREDENTIALS (fresh)';
    } else {
      results.adminInitMethod = 'NO CREDENTIALS AVAILABLE';
    }
  } catch (e: unknown) {
    adminError = e instanceof Error ? e.message : String(e);
    results.adminInitError = adminError;
  }

  results.adminSuccess = adminSuccess;

  return NextResponse.json(results);
}
