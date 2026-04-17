import { NextResponse } from 'next/server';
import { getAdminInitStatus, getAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  const status = getAdminInitStatus();

  // Try to actually initialize and see what happens
  let initError: string | null = null;
  try {
    getAdminApp();
  } catch (e: unknown) {
    initError = e instanceof Error ? e.message : String(e);
  }

  // Check which env vars are set (without revealing values)
  const envChecks = {
    FIREBASE_ADMIN_CREDENTIALS: !!process.env.FIREBASE_ADMIN_CREDENTIALS,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'NOT SET',
  };

  // Show first 50 chars of FIREBASE_ADMIN_CREDENTIALS to verify it's valid JSON
  let credPreview = 'NOT SET';
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    const raw = process.env.FIREBASE_ADMIN_CREDENTIALS;
    credPreview = raw.substring(0, 80);
    try {
      const parsed = JSON.parse(raw);
      credPreview += `... [VALID JSON, project: ${parsed.project_id}, email: ${parsed.client_email}]`;
    } catch {
      credPreview += '... [INVALID JSON - NOT PARSEABLE]';
    }
  }

  return NextResponse.json({
    initStatus: status,
    initError,
    envChecks,
    credPreview,
  });
}
