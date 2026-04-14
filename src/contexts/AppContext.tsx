'use client';
import React, { Suspense } from 'react';

/* ===== PROVIDER COMPOSITION =====
 *
 * Two-level provider architecture to avoid Turbopack TDZ errors:
 *
 * Level 1 — Core providers (statically imported, always available):
 *   UIProvider > AuthProvider > OneDriveProvider > FirestoreProvider
 *
 * Level 2 — Extended providers (dynamically imported, separate chunks):
 *   CommentsProvider, InvoiceProvider, InventoryProvider, GalleryProvider,
 *   TimeTrackingProvider, CalendarProvider, AdminProvider, ChatProvider,
 *   NotifPreferencesProvider, NotifProvider
 *
 * This forces Turbopack to create separate chunks for each group,
 * preventing intra-chunk circular evaluation order issues.
 */

import UIProvider from './UIContext';
import AuthProvider from './AuthContext';
import OneDriveProvider from './OneDriveContext';
import FirestoreProvider from './FirestoreContext';

/* ─── Extended Providers — dynamically imported to create separate chunks ─── */
const ExtendedProviders = React.lazy(() => import('./ExtendedProviders'));

/**
 * AppProvider composes all providers in two levels.
 * Core providers load synchronously; extended providers load lazily.
 */
export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <OneDriveProvider>
          <FirestoreProvider>
            <Suspense fallback={null}>
              <ExtendedProviders>
                {children}
              </ExtendedProviders>
            </Suspense>
          </FirestoreProvider>
        </OneDriveProvider>
      </AuthProvider>
    </UIProvider>
  );
}
