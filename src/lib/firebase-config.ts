/**
 * firebase-config.ts
 * Centralized Firebase client configuration from environment variables.
 * All Firebase credentials MUST be set via NEXT_PUBLIC_ env vars
 * (Vercel dashboard or .env.local for development).
 *
 * NEVER hardcode Firebase credentials in source code.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

/**
 * Validates that all required Firebase config values are present.
 * Call this at startup to fail fast if env vars are missing.
 */
export function validateFirebaseConfig(): boolean {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      `[ArchiFlow] Missing NEXT_PUBLIC_FIREBASE_* environment variables: ${missing.join(', ')}. ` +
      'Set them in Vercel dashboard or .env.local for local development.'
    );
    return false;
  }
  return true;
}
