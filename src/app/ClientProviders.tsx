'use client';
import React, { useEffect } from 'react';
import AppProvider from '@/contexts/AppContext';
import { NotificationProvider } from '@/hooks/useNotifications';
import { ChatProvider } from '@/hooks/useChat';
import { useUIStore } from '@/stores/ui-store';
import { initOfflineSync } from '@/lib/offline-queue';

/**
 * ClientProviders — Client-side wrapper for layout.tsx
 *
 * Provider hierarchy:
 *   NotificationProvider → AppProvider → ChatProvider → children
 *
 * NotificationProvider wraps AppProvider so that:
 * - AppProvider can call useNotificationsContext() for detection effects
 * - Components can use useNotificationsContext() for notification UI
 * ChatProvider wraps children inside AppProvider so that:
 * - ChatProvider can call useApp() for auth/tenant/project data
 * - Components can use useChatContext() for chat state and functions
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

  return (
    <NotificationProvider>
      <AppProvider>
        <ChatProvider>{children}</ChatProvider>
      </AppProvider>
    </NotificationProvider>
  );
}
