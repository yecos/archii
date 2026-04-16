/**
 * useNotifications.ts
 * Motor de notificaciones unificado (in-app + OS/Browser + sonido + vibración).
 * Extraído de page.tsx — maneja toda la lógica de notificaciones.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { uniqueId } from '@/lib/helpers';

/* ===== Types ===== */
interface NotifEntry {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: string;
  read: boolean;
  timestamp: Date;
  screen: string | null;
  itemId: string | null;
  ts?: number; // for in-app banner auto-remove
}

interface NotifOptions {
  type?: string;
  screen?: string;
  itemId?: string | null;
}

type NotifCategory = 'chat' | 'tasks' | 'meetings' | 'approvals' | 'inventory' | 'projects';

interface UseNotificationsReturn {
  /** Show unified notification (in-app toast + browser notification) */
  sendNotif: (title: string, body: string, icon?: string, tag?: string, data?: NotifOptions) => void;
  /** Notification permission state */
  notifPermission: NotificationPermission;
  /** Request browser notification permission */
  requestNotifPermission: () => Promise<void>;
  /** Dismiss permission banner */
  dismissNotifBanner: () => void;
  /** Notification preferences per category */
  notifPrefs: Record<string, boolean>;
  /** Toggle a notification preference */
  toggleNotifPref: (key: string) => void;
  /** Sound enabled/disabled */
  notifSound: boolean;
  setNotifSound: (v: boolean) => void;
  /** Show permission banner? */
  showNotifBanner: boolean;
  /** In-app notification banners (auto-dismiss) */
  inAppNotifs: NotifEntry[];
  /** Notification history */
  notifHistory: NotifEntry[];
  /** Unread count */
  unreadCount: number;
  /** Mark single notification as read */
  markNotifRead: (id: string) => void;
  /** Mark all as read */
  markAllNotifRead: () => void;
  /** Clear all history */
  clearNotifHistory: () => void;
  /** Current filter */
  notifFilterCat: string;
  setNotifFilterCat: (v: string) => void;
  /** Show notification panel */
  showNotifPanel: boolean;
  setShowNotifPanel: (v: boolean) => void;
  /** Ref to navigate function (set from parent) */
  navigateToRef: React.MutableRefObject<(s: string, projId?: string | null) => void>;
  /** Tab visibility ref */
  isTabVisibleRef: React.MutableRefObject<boolean>;
  /** Show toast (set from parent) */
  showToast: (msg: string, type?: string) => void;
}

export function useNotifications(showToastFn: (msg: string, type?: string) => void): UseNotificationsReturn {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifHistory, setNotifHistory] = useState<NotifEntry[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    chat: true, tasks: true, meetings: true, approvals: true, inventory: true, projects: true,
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifSound, setNotifSound] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState<NotifEntry[]>([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [notifFilterCat, setNotifFilterCat] = useState<string>('all');

  // Refs for cross-effect communication
  const navigateToRef = useRef<(s: string, projId?: string | null) => void>(() => {});
  const isTabVisibleRef = useRef(true);

  // Stable showToast ref
  const showToastRef = useRef(showToastFn);
  showToastRef.current = showToastFn;

  const showToast = useCallback((msg: string, type?: string) => {
    showToastRef.current(msg, type);
  }, []);

  /* ===== Track document visibility ===== */
  useEffect(() => {
    const handler = () => { isTabVisibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    isTabVisibleRef.current = document.visibilityState === 'visible';
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  /* ===== Init notification permission + restore prefs ===== */
  useEffect(() => {
    if (!('Notification' in window)) return;
    setNotifPermission(Notification.permission);
    try {
      const savedPrefs = localStorage.getItem('archiflow-notif-prefs');
      if (savedPrefs) setNotifPrefs(JSON.parse(savedPrefs));
      const savedSound = localStorage.getItem('archiflow-notif-sound');
      if (savedSound !== null) setNotifSound(savedSound === 'true');
    } catch (err) {
      console.error('[ArchiFlow] Error loading notification prefs:', err);
    }
    // Auto-show permission banner after 5s if not granted and not recently dismissed
    if (Notification.permission === 'default') {
      try {
        const dismissed = localStorage.getItem('archiflow-notif-dismissed');
        if (dismissed) {
          const diff = Date.now() - parseInt(dismissed);
          if (diff < 3 * 24 * 60 * 60 * 1000) return;
        }
      } catch (err) {
        console.error('[ArchiFlow] Notifications: check dismissed timestamp failed:', err);
      }
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') setShowNotifBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  /* ===== Persist sound pref ===== */
  useEffect(() => {
    try { localStorage.setItem('archiflow-notif-sound', String(notifSound)); } catch (err) {
      console.error('[ArchiFlow] Error saving sound pref:', err);
    }
  }, [notifSound]);

  /* ===== Persist notification preferences ===== */
  useEffect(() => {
    try { localStorage.setItem('archiflow-notif-prefs', JSON.stringify(notifPrefs)); } catch (err) {
      console.error('[ArchiFlow] Error saving notif prefs:', err);
    }
  }, [notifPrefs]);

  /* ===== Calculate unread count ===== */
  useEffect(() => {
    setUnreadCount(notifHistory.filter(n => !n.read).length);
  }, [notifHistory]);

  /* ===== Vibrate on mobile ===== */
  const vibrateNotif = useCallback(() => {
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch (err) {
      // Vibration API not available, silently ignore
    }
  }, []);

  /* ===== Play notification sound ===== */
  const playNotifSound = useCallback((type?: string) => {
    if (!notifSound) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.07;
      const tones: Record<string, [number, number]> = {
        chat: [587.33, 880], task: [659.25, 783.99], meeting: [523.25, 659.25],
        approval: [698.46, 880], inventory: [440, 554.37], project: [493.88, 659.25], reminder: [880, 1046.5],
      };
      const [f1, f2] = tones[type || ''] || [587.33, 880];
      osc.frequency.value = f1;
      osc.start();
      setTimeout(() => { osc.frequency.value = f2; }, 100);
      setTimeout(() => {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.stop(ctx.currentTime + 0.25);
      }, 200);
    } catch (err) {
      console.warn('[ArchiFlow] Audio notification error:', err);
    }
  }, [notifSound]);

  /* ===== UNIFIED NOTIFICATION ===== */
  const sendNotif = useCallback((title: string, body: string, icon?: string, tag?: string, data?: NotifOptions) => {
    const type = data?.type || 'info';
    const notifEntry: NotifEntry = {
      id: uniqueId('notif'),
      title, body,
      icon: icon || '🔔',
      type,
      read: false,
      timestamp: new Date(),
      screen: data?.screen || null,
      itemId: data?.itemId || null,
    };

    // Always add to history
    setNotifHistory(prev => [notifEntry, ...prev].slice(0, 100));

    // Always show in-app toast
    setInAppNotifs(prev => [...prev, { ...notifEntry, ts: Date.now() }]);
    setTimeout(() => setInAppNotifs(prev => prev.filter(n => n.ts != null && Date.now() - n.ts < 5000)), 5500);

    // Sound + vibrate
    playNotifSound(type);
    vibrateNotif();

    // Browser/OS notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body, icon: icon || '/icon-192.png', badge: '/icon-192.png',
          tag: tag || `archiflow-${Date.now()}`, requireInteraction: false, silent: true, data,
        });
        n.onclick = () => {
          window.focus();
          n.close();
          if (data?.screen) navigateToRef.current(data.screen, data.itemId);
        };
        setTimeout(() => n.close(), 8000);
      } catch (err) {
        console.warn('[ArchiFlow] Browser notification error:', err);
      }
    }
  }, [playNotifSound, vibrateNotif]);

  /* ===== Permission management ===== */
  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones', 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    setShowNotifBanner(false);
    if (perm === 'granted') {
      showToast('🔔 Notificaciones activadas');
      try {
        localStorage.setItem('archiflow-notif-perm', 'granted');
        localStorage.setItem('archiflow-notif-dismissed', String(Date.now()));
      } catch (err) {
        console.error('[ArchiFlow] Error saving notif permission:', err);
      }
    } else {
      showToast('Notificaciones bloqueadas por el navegador', 'error');
    }
  }, [showToast]);

  const dismissNotifBanner = useCallback(() => {
    setShowNotifBanner(false);
    try { localStorage.setItem('archiflow-notif-dismissed', String(Date.now())); } catch (err) {
      console.error('[ArchiFlow] Error dismissing notif banner:', err);
    }
  }, []);

  /* ===== History management ===== */
  const toggleNotifPref = useCallback((key: string) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const markNotifRead = useCallback((id: string) => {
    setNotifHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotifRead = useCallback(() => {
    setNotifHistory(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifHistory = useCallback(() => {
    setNotifHistory([]);
    setInAppNotifs([]);
    showToast('Historial de notificaciones limpiado');
  }, [showToast]);

  return {
    sendNotif, notifPermission, requestNotifPermission, dismissNotifBanner,
    notifPrefs, toggleNotifPref, notifSound, setNotifSound,
    showNotifBanner, inAppNotifs, notifHistory, unreadCount,
    markNotifRead, markAllNotifRead, clearNotifHistory,
    notifFilterCat, setNotifFilterCat,
    showNotifPanel, setShowNotifPanel,
    navigateToRef, isTabVisibleRef, showToast,
  };
}
