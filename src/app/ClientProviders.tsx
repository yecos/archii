'use client';
import React, { useEffect } from 'react';
import AppProvider from '@/contexts/AppContext';
import { useUIStore } from '@/stores/ui-store';
import { initOfflineSync } from '@/lib/offline-queue';

/**
 * ClientProviders — Client-side wrapper for layout.tsx
 *
 * Wraps all page content in AppProvider so that useApp() works
 * everywhere in the component tree, regardless of dynamic imports.
 *
 * Also initializes the theme system from localStorage on mount.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const initTheme = useUIStore(s => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Inicializar offline sync listener (fire-and-forget)
  useEffect(() => {
    const cleanup = initOfflineSync();
    return cleanup;
  }, []);

  return <AppProvider>{children}</AppProvider>;
}
