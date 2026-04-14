'use client';
import React from 'react';
import dynamic from 'next/dynamic';

/* ─── Core context hooks ONLY — no extended providers imported here ───
 *
 * This file must NOT import from GalleryContext, InventoryContext, NotifContext,
 * or any other extended provider. Those live in AuthenticatedShell.tsx which
 * is dynamically loaded to avoid Turbopack dual-chunk TDZ conflicts with
 * the ExtendedProviders lazy chunk created by AppContext.
 */
import { useUIContext } from '@/contexts/UIContext';
import { useAuthContext } from '@/contexts/AuthContext';
import AppProvider from '@/contexts/AppContext';
import { Toaster } from 'sonner';

/* ─── Layout ─── */
import LoadingScreen from '@/components/layout/LoadingScreen';
import AuthScreen from '@/components/layout/AuthScreen';

/* ─── Authenticated shell — dynamically imported to create a separate chunk ─── */
const AuthenticatedShell = dynamic(() => import('./AuthenticatedShell'), {
  ssr: false,
});

/* ─── Toaster config (shared) ─── */
const TOASTER_PROPS = {
  position: 'top-center' as const,
  toastOptions: {
    unstyled: false,
    classNames: {
      toast: 'af-sonner-toast',
      title: 'af-sonner-title',
      description: 'af-sonner-desc',
      actionButton: 'af-sonner-action',
      cancelButton: 'af-sonner-cancel',
      success: '!bg-emerald-600 !text-white !border-emerald-500',
      error: '!bg-red-500 !text-white !border-red-400',
      warning: '!bg-amber-500 !text-white !border-amber-400',
    },
  },
  richColors: true,
  closeButton: true,
  duration: 3500,
};

/**
 * AppContent — lightweight gate: shows loading / auth screen,
 * then delegates to the dynamically-loaded AuthenticatedShell.
 *
 * Only uses CORE context hooks (UIContext, AuthContext).
 * Extended hooks are used inside AuthenticatedShell which lives
 * in its own Turbopack chunk — avoiding dual-chunk TDZ conflicts.
 */
function AppContent() {
  const { ready, loading, authUser, doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doPasswordReset, forms, setForms, showToast } = useUIContext();

  if (!ready || loading) return <LoadingScreen />;
  if (!authUser) return (
    <>
      {/* Toaster MUST be rendered here too — otherwise auth errors are invisible */}
      <Toaster {...TOASTER_PROPS} />
      <AuthScreen
        forms={forms}
        setForms={setForms}
        doLogin={doLogin}
        doRegister={doRegister}
        doGoogleLogin={doGoogleLogin}
        doMicrosoftLogin={doMicrosoftLogin}
        doPasswordReset={doPasswordReset}
        showToast={showToast}
      />
    </>
  );

  return <AuthenticatedShell />;
}

/* ─── Entry point — page.tsx handles lazy loading via dynamic() ─── */

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
