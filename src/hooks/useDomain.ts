'use client';

// Domain hooks — thin wrappers around context hooks for direct import
// Consumers should use these instead of useApp() to avoid unnecessary re-renders

// UI domain
export { useUIContext as useUI } from '@/contexts/UIContext';

// Auth domain
export { useAuthContext as useAuth } from '@/contexts/AuthContext';

// Firestore domain (projects, tasks, expenses, suppliers, companies, files, phases, approvals, gantt)
export { useFirestoreContext as useFirestore } from '@/contexts/FirestoreContext';

// Admin domain (admin UI state, gantt admin helpers, permissions)
export { useAdminContext as useAdmin } from '@/contexts/AdminContext';

// OneDrive domain
export { useOneDriveContext as useOneDrive } from '@/contexts/OneDriveContext';

// Chat domain
export { useChatContext as useChat } from '@/contexts/ChatContext';

// Inventory domain
export { useInventoryContext as useInventory } from '@/contexts/InventoryContext';

// Gallery domain
export { useGalleryContext as useGallery } from '@/contexts/GalleryContext';

// Time Tracking domain
export { useTimeTrackingContext as useTimeTracking } from '@/contexts/TimeTrackingContext';

// Calendar domain
export { useCalendarContext as useCalendar } from '@/contexts/CalendarContext';

// Invoice domain
export { useInvoiceContext as useInvoice } from '@/contexts/InvoiceContext';

// Quotation domain
export { useQuotationContext as useQuotation } from '@/contexts/QuotationContext';

// Comments domain
export { useCommentsContext as useComments } from '@/contexts/CommentsContext';

// Notifications domain
export { useNotifContext as useNotif } from '@/contexts/NotifContext';

// Notification Preferences domain
export { useNotifPreferencesContext as useNotifPreferences } from '@/contexts/NotifPreferencesContext';

// Presence domain
export { usePresenceContext as usePresence } from '@/contexts/PresenceContext';
