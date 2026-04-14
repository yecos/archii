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
 */

import UIProvider from './UIContext';
import AuthProvider from './AuthContext';
import OneDriveProvider from './OneDriveContext';
import FirestoreProvider from './FirestoreContext';
import AdminProvider from './AdminContext';
import ChatProvider from './ChatContext';
import NotifPreferencesProvider from './NotifPreferencesContext';
import NotifProvider from './NotifContext';

/**
 * AppProvider composes all 6 specialized providers.
 * Nesting order matters — each provider can only consume contexts from its ancestors:
 *
 *   UIProvider          (no deps)
 *     AuthProvider      (consumes UIContext)
 *       OneDriveProvider  (consumes UIContext, AuthContext)
 *         FirestoreProvider (consumes UIContext, AuthContext, OneDriveContext)
 *           ChatProvider    (consumes UIContext, AuthContext)
 *             NotifPreferencesProvider (consumes AuthContext — stores per-user prefs in Firestore)
 *               NotifProvider (consumes UIContext, AuthContext, ChatContext, FirestoreContext, NotifPreferencesContext)
 */
export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <OneDriveProvider>
          <FirestoreProvider>
            <AdminProvider>
            <ChatProvider>
              <NotifPreferencesProvider>
                <NotifProvider>
                  {children}
                </NotifProvider>
              </NotifPreferencesProvider>
            </ChatProvider>
            </AdminProvider>
          </FirestoreProvider>
        </OneDriveProvider>
      </AuthProvider>
    </UIProvider>
  );
}
