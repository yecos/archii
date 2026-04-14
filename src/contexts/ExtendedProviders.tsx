'use client';
import React from 'react';

/**
 * ExtendedProviders — dynamically loaded provider group.
 *
 * Split from AppContext to force Turbopack to create a separate chunk.
 * All these providers only consume contexts from Core providers
 * (UIContext, AuthContext, OneDriveContext, FirestoreContext) which
 * are guaranteed to be initialized before this module loads.
 */

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
 * Extended provider tree.
 * Nesting order — each provider can only consume ancestor contexts:
 *
 *   CommentsProvider     (consumes UIContext, AuthContext)
 *     InvoiceProvider    (consumes UIContext, AuthContext)
 *       InventoryProvider(consumes UIContext, AuthContext)
 *         GalleryProvider  (consumes UIContext, AuthContext)
 *           TimeTrackingProvider (consumes UIContext, AuthContext)
 *             CalendarProvider   (consumes UIContext, AuthContext)
 *               AdminProvider    (consumes FirestoreContext)
 *                 ChatProvider   (consumes UIContext, AuthContext)
 *                   NotifPreferencesProvider (consumes AuthContext)
 *                     NotifProvider (consumes many contexts)
 */
export default function ExtendedProviders({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
