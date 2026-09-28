/**
 * error-reporting-service.ts
 * Reporta errores de UI capturados por ErrorBoundary a Firestore.
 * Se almacena en la colección `error_reports`.
 */

import { getFirebase } from '@/lib/firebase-service';
import { isFlagEnabled } from '@/lib/feature-flags';

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  screen?: string;
  userAgent?: string;
  userId?: string;
  timestamp?: any;
}

export async function reportError(report: ErrorReport): Promise<void> {
  if (!isFlagEnabled('error_reporting')) return;

  try {
    const app = getFirebase();
    if (!app) return;

    const user = app.auth().currentUser;
    const tenantId = typeof window !== 'undefined'
      ? window.localStorage.getItem('archii-active-tenant')
      : null;
    if (!user || !tenantId) return;

    const token = await user.getIdToken();
    const response = await fetch('/api/error-reports', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...report,
        tenantId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      }),
    });

    if (!response.ok) {
      throw new Error(`Error reporting failed with status ${response.status}`);
    }
  } catch {
    // Error reporting must never crash the app
    console.error('[ErrorReporting] Failed to report error to Firestore');
  }
}
