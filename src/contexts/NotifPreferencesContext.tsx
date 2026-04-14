'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { getFirebase } from '@/lib/firebase-service';
import { DEFAULT_NOTIF_PREFERENCES, type NotifEventType, type NotifPreferences } from '@/lib/types';

/* ===== NOTIFICATION PREFERENCES CONTEXT =====
 *
 * Stores per-user granular notification preferences in Firestore at
 *   users/{uid}/settings/notifications
 *
 * Falls back to localStorage if Firestore is unavailable.
 * Exposes: preferences, loading, updatePreference, resetDefaults, isEventEnabled
 */

const STORAGE_KEY = 'archiflow-notif-event-prefs';

interface NotifPreferencesContextType {
  /** Current notification preferences for all event types. */
  preferences: NotifPreferences;
  /** Whether preferences are still being loaded from Firestore. */
  loading: boolean;
  /** Toggle a single event type on/off and persist the change. */
  updatePreference: (event: NotifEventType, enabled: boolean) => void;
  /** Reset all preferences to their defaults (all enabled). */
  resetDefaults: () => void;
  /** Check whether a specific event type is currently enabled. */
  isEventEnabled: (event: NotifEventType) => boolean;
}

const NotifPreferencesContext = createContext<NotifPreferencesContextType | null>(null);

export default function NotifPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuthContext();
  const [preferences, setPreferences] = useState<NotifPreferences>({ ...DEFAULT_NOTIF_PREFERENCES });
  const [loading, setLoading] = useState(true);

  // Load preferences from Firestore on mount (or when authUser changes)
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPrefs = async () => {
      try {
        const db = getFirebase().firestore();
        const doc = await db.collection('users').doc(authUser.uid).collection('settings').doc('notifications').get();
        if (doc.exists) {
          const data = doc.data();
          // Merge with defaults so newly-added event types default to true
          const merged: NotifPreferences = { ...DEFAULT_NOTIF_PREFERENCES };
          for (const key of Object.keys(DEFAULT_NOTIF_PREFERENCES) as NotifEventType[]) {
            if (key in data && typeof data[key] === 'boolean') {
              merged[key] = data[key];
            }
          }
          if (!cancelled) setPreferences(merged);
        }
      } catch (err) {
        // Firestore unavailable — try localStorage fallback
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (!cancelled) {
              setPreferences({ ...DEFAULT_NOTIF_PREFERENCES, ...parsed });
            }
          }
        } catch {
          // Ignore localStorage errors — defaults will be used
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPrefs();
    return () => { cancelled = true; };
  }, [authUser]);

  // Persist preferences to Firestore (with localStorage fallback)
  const savePrefs = useCallback(async (prefs: NotifPreferences) => {
    if (!authUser) return;
    try {
      const db = getFirebase().firestore();
      await db.collection('users').doc(authUser.uid).collection('settings').doc('notifications').set(prefs);
    } catch {
      // Fallback to localStorage if Firestore write fails
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, [authUser]);

  const updatePreference = useCallback((event: NotifEventType, enabled: boolean) => {
    setPreferences(prev => {
      const next = { ...prev, [event]: enabled };
      // Persist asynchronously (fire-and-forget)
      savePrefs(next);
      return next;
    });
  }, [savePrefs]);

  const resetDefaults = useCallback(() => {
    const defaults = { ...DEFAULT_NOTIF_PREFERENCES };
    setPreferences(defaults);
    savePrefs(defaults);
  }, [savePrefs]);

  const isEventEnabled = useCallback((event: NotifEventType): boolean => {
    return preferences[event] !== false;
  }, [preferences]);

  const value = useMemo<NotifPreferencesContextType>(() => ({
    preferences,
    loading,
    updatePreference,
    resetDefaults,
    isEventEnabled,
  }), [preferences, loading, updatePreference, resetDefaults, isEventEnabled]);

  return (
    <NotifPreferencesContext.Provider value={value}>
      {children}
    </NotifPreferencesContext.Provider>
  );
}

export function useNotifPreferencesContext() {
  const ctx = useContext(NotifPreferencesContext);
  if (!ctx) throw new Error('useNotifPreferencesContext must be used within NotifPreferencesProvider');
  return ctx;
}
