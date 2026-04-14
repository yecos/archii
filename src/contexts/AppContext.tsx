'use client';
import React from 'react';

/* ===== PROVIDER COMPOSITION =====
 *
 * The monolithic AppContext was decomposed in ETAPA 2 into 6 specialized contexts:
 *   1. UIContext        — theme, navigation, sidebar, modals, forms, PWA install
 *   2. AuthContext      — firebase ready, auth state, login/register/logout, team users
 *   3. OneDriveContext  — Microsoft/OneDrive state and API functions
 *   4. FirestoreContext — all Firestore collection listeners, CRUD functions, domain UI state
 *   5. ChatContext      — chat messages, voice recording, file attachments, reactions
 *   6. NotifContext     — notification engine (browser + in-app), detection effects
 *
 * All consumers now use domain hooks from @/hooks/useDomain.ts (ETAPA 4).
 * useApp.ts was fully deprecated and removed in ETAPA 7.
 *
 * IMPORTANT: ALL provider nesting lives here. No provider file imports another
 * provider file. This prevents circular dependency issues (TDZ errors) caused
 * by Turbopack/webpack module resolution order.
 */

import UIProvider from './UIContext';
import AuthProvider from './AuthContext';
import OneDriveProvider from './OneDriveContext';
import FirestoreProvider from './FirestoreContext';
import CommentsProvider from './CommentsContext';
import InvoiceProvider from './InvoiceContext';
import InventoryProvider from './InventoryContext';
import GalleryProvider from './GalleryContext';
import TimeTrackingProvider from './TimeTrackingContext';
import CalendarProvider from './CalendarContext';
import AdminProvider from './AdminContext';
import ChatProvider from './ChatContext';
import NotifPreferencesProvider from './NotifPreferencesContext';
import NotifProvider from './NotifContext';

/**
 * AppProvider composes all providers.
 * Nesting order matters — each provider can only consume contexts from its ancestors:
 *
 *   UIProvider          (no deps)
 *     AuthProvider      (consumes UIContext)
 *       OneDriveProvider  (consumes UIContext, AuthContext)
 *         FirestoreProvider (consumes UIContext, AuthContext, OneDriveContext)
 *           CommentsProvider   (consumes UIContext, AuthContext)
 *             InvoiceProvider  (consumes UIContext, AuthContext)
 *               InventoryProvider (consumes UIContext, AuthContext)
 *                 GalleryProvider   (consumes UIContext, AuthContext)
 *                   TimeTrackingProvider (consumes UIContext, AuthContext)
 *                     CalendarProvider (consumes UIContext, AuthContext)
 *                       AdminProvider    (consumes FirestoreContext)
 *                         ChatProvider   (consumes UIContext, AuthContext)
 *                           NotifPreferencesProvider (consumes AuthContext)
 *                             NotifProvider (consumes UIContext, AuthContext, ChatContext, FirestoreContext, CalendarContext, InventoryContext, NotifPreferencesContext)
 */
export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <OneDriveProvider>
          <FirestoreProvider>
            <CommentsProvider>
              <InvoiceProvider>
                <InventoryProvider>
                  <GalleryProvider>
                    <TimeTrackingProvider>
                      <CalendarProvider>
                        <AdminProvider>
                          <ChatProvider>
                            <NotifPreferencesProvider>
                              <NotifProvider>
                                {children}
                              </NotifProvider>
                            </NotifPreferencesProvider>
                          </ChatProvider>
                        </AdminProvider>
                      </CalendarProvider>
                    </TimeTrackingProvider>
                  </GalleryProvider>
                </InventoryProvider>
              </InvoiceProvider>
            </CommentsProvider>
          </FirestoreProvider>
        </OneDriveProvider>
      </AuthProvider>
    </UIProvider>
  );
}
