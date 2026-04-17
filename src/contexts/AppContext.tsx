'use client';
import React from 'react';

/* ===== PROVIDER COMPOSITION =====
 *
 * All providers are statically imported in a single chain.
 * There are NO circular dependencies (verified with madge --circular).
 * The previous React.lazy() split caused Turbopack dual-chunk TDZ errors
 * at runtime because the same modules appeared in multiple chunks.
 *
 * Nesting order — each provider can only consume ancestor contexts:
 *
 *   UIProvider
 *     AuthProvider          (consumes UIContext)
 *       TenantProvider      (consumes UIContext, AuthContext) — MUST be before all providers that use useTenantId()
 *         PhaseProvider      (consumes UIContext, AuthContext, TenantContext)
 *           OneDriveProvider  (consumes UIContext, AuthContext)
 *           FirestoreProvider  (consumes UIContext, AuthContext, OneDriveContext, TenantContext)
 *             CommentsProvider (consumes UIContext, AuthContext, TenantContext)
 *               InvoiceProvider (consumes UIContext, AuthContext, TenantContext)
 *                 QuotationProvider (consumes UIContext, AuthContext, TenantContext)
 *                   InventoryProvider (consumes UIContext, AuthContext, TenantContext)
 *                     GalleryProvider (consumes UIContext, AuthContext, TenantContext)
 *                       TimeTrackingProvider (consumes UIContext, AuthContext, TenantContext)
 *                         CalendarProvider (consumes UIContext, AuthContext, TenantContext)
 *                           AdminProvider (consumes FirestoreContext)
 *                             ChatProvider (consumes UIContext, AuthContext, TenantContext)
 *                               NotifPreferencesProvider (consumes AuthContext)
 *                                 NotifProvider (consumes many contexts, TenantContext)
 *                                   PresenceProvider (consumes UIContext, AuthContext)
 *                                     AutomationProvider (consumes UIContext, AuthContext)
 *                                       GeolocationProvider (consumes UIContext, AuthContext, FirestoreContext)
 *                                         OfflineQueueProvider
 *                                           I18nProvider
 */

import UIProvider from './UIContext';
import AuthProvider from './AuthContext';
import TenantProvider from './TenantContext';
import OneDriveProvider from './OneDriveContext';
import FirestoreProvider from './FirestoreContext';
import CommentsProvider from './CommentsContext';
import InvoiceProvider from './InvoiceContext';
import QuotationProvider from './QuotationContext';
import InventoryProvider from './InventoryContext';
import GalleryProvider from './GalleryContext';
import TimeTrackingProvider from './TimeTrackingContext';
import CalendarProvider from './CalendarContext';
import AdminProvider from './AdminContext';
import ChatProvider from './ChatContext';
import NotifPreferencesProvider from './NotifPreferencesContext';
import NotifProvider from './NotifContext';
import { OfflineQueueProvider } from './OfflineQueueContext';
import PresenceProvider from './PresenceContext';
import AutomationProvider from './AutomationContext';
import { I18nProvider } from './I18nContext';
import GeolocationProvider from './GeolocationContext';
import PhaseProvider from './PhaseContext';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <TenantProvider>
          <PhaseProvider>
            <OneDriveProvider>
              <FirestoreProvider>
                <CommentsProvider>
                  <InvoiceProvider>
                    <QuotationProvider>
                      <InventoryProvider>
                        <GalleryProvider>
                          <TimeTrackingProvider>
                            <CalendarProvider>
                              <AdminProvider>
                                <ChatProvider>
                                  <NotifPreferencesProvider>
                                    <NotifProvider>
                                      <OfflineQueueProvider>
                                        <PresenceProvider>
                                          <AutomationProvider>
                                            <GeolocationProvider>
                                              <I18nProvider>
                                                {children}
                                              </I18nProvider>
                                            </GeolocationProvider>
                                          </AutomationProvider>
                                        </PresenceProvider>
                                      </OfflineQueueProvider>
                                    </NotifProvider>
                                  </NotifPreferencesProvider>
                                </ChatProvider>
                              </AdminProvider>
                            </CalendarProvider>
                          </TimeTrackingProvider>
                        </GalleryProvider>
                      </InventoryProvider>
                    </QuotationProvider>
                  </InvoiceProvider>
                </CommentsProvider>
              </FirestoreProvider>
            </OneDriveProvider>
          </PhaseProvider>
        </TenantProvider>
      </AuthProvider>
    </UIProvider>
  );
}
