'use client';
import React from 'react';

/* ===== THIN WRAPPER — AppContext =====
 *
 * The monolithic AppContext has been decomposed into 6 specialized contexts:
 *   1. UIContext        — theme, navigation, sidebar, modals, forms, PWA install
 *   2. AuthContext      — firebase ready, auth state, login/register/logout, team users
 *   3. OneDriveContext  — Microsoft/OneDrive state and API functions
 *   4. FirestoreContext — all Firestore collection listeners, CRUD functions, domain UI state
 *   5. ChatContext      — chat messages, voice recording, file attachments, reactions
 *   6. NotifContext     — notification engine (browser + in-app), detection effects
 *
 * This file is kept for backward compatibility. All 45+ consumer files still import
 * `AppProvider` and/or `useApp` from this path. The useApp() hook is re-exported from
 * @/hooks/useApp.ts which combines all 6 contexts into the same flat interface.
 */

import UIProvider from './UIContext';
import AuthProvider from './AuthContext';
import OneDriveProvider from './OneDriveContext';
import FirestoreProvider from './FirestoreContext';
import ChatProvider from './ChatContext';
import NotifProvider from './NotifContext';

export { useApp } from '@/hooks/useApp';

/**
 * AppProvider composes all 6 specialized providers.
 * Nesting order matters — each provider can only consume contexts from its ancestors:
 *
 *   UIProvider          (no deps)
 *     AuthProvider      (consumes UIContext)
 *       OneDriveProvider  (consumes UIContext, AuthContext)
 *         FirestoreProvider (consumes UIContext, AuthContext, OneDriveContext)
 *           ChatProvider    (consumes UIContext, AuthContext)
 *             NotifProvider (consumes UIContext, AuthContext, ChatContext, FirestoreContext)
 */
export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <OneDriveProvider>
          <FirestoreProvider>
            <ChatProvider>
              <NotifProvider>
                {children}
              </NotifProvider>
            </ChatProvider>
          </FirestoreProvider>
        </OneDriveProvider>
      </AuthProvider>
    </UIProvider>
  );
}

/**
 * Legacy context export — kept for any code that might import the context directly.
 * The useApp() hook is the recommended way to access context values.
 */
export const AppContext = React.createContext<any>(null);
