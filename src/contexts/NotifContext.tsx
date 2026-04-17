'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { useChatContext } from './ChatContext';
import { useFirestoreContext } from './FirestoreContext';
import { useCalendarContext } from './CalendarContext';
import { useInventoryContext } from './InventoryContext';
import { fmtDate } from '@/lib/helpers';
import { checkBudgetAlerts, formatBudgetAlertMessage } from '@/lib/budget-alerts';
import { useNotifPreferencesContext } from './NotifPreferencesContext';
import { useUIStore } from '@/stores/ui-store';
import { getFirebase } from '@/lib/firebase-service';
import { useTenantId } from '@/hooks/useTenantId';
import type { NotifEventType, NotifEntry, ChangeOrder, ChatMessage, Meeting, Approval, InvMovement, InvTransfer, Project, Expense, Task } from '@/lib/types';

interface NotifData {
  type?: string;
  screen?: string | null;
  itemId?: string | null;
  eventType?: NotifEventType;
}

/* ===== NOTIFICATION CONTEXT ===== */
interface NotifContextType {
  // State
  notifPermission: NotificationPermission;
  setNotifPermission: React.Dispatch<React.SetStateAction<NotificationPermission>>;
  notifHistory: NotifEntry[];
  setNotifHistory: React.Dispatch<React.SetStateAction<NotifEntry[]>>;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showNotifPanel: boolean;
  setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  notifSound: boolean;
  setNotifSound: React.Dispatch<React.SetStateAction<boolean>>;
  inAppNotifs: (NotifEntry & { ts?: number })[];
  setInAppNotifs: React.Dispatch<React.SetStateAction<(NotifEntry & { ts?: number })[]>>;
  notifFilterCat: string;
  setNotifFilterCat: React.Dispatch<React.SetStateAction<string>>;
  showNotifBanner: boolean;
  setShowNotifBanner: React.Dispatch<React.SetStateAction<boolean>>;
  persistenceReady: boolean;

  // Functions
  sendNotif: (title: string, body: string, icon?: string, tag?: string, data?: NotifData) => void;
  sendBrowserNotif: (title: string, body: string, icon?: string, tag?: string, data?: NotifData) => void;
  playNotifSound: (type?: string) => void;
  vibrateNotif: () => void;
  requestNotifPermission: () => Promise<void>;
  dismissNotifBanner: () => void;
  toggleNotifPref: (key: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifRead: () => void;
  clearNotifHistory: () => void;

  // Refs (exposed for advanced usage)
  navigateToRef: React.MutableRefObject<(s: string, projId?: string | null) => void>;
  isTabVisibleRef: React.MutableRefObject<boolean>;
}

const NotifContext = createContext<NotifContextType | null>(null);

/** Deduplication window: ignore same-tag notifications within 10s */
const DEDUP_WINDOW_MS = 10_000;

export default function NotifProvider({ children }: { children: React.ReactNode }) {
  const { showToast, navigateToRef, selectedProjectId } = useUIContext();
  const { authUser } = useAuthContext();
  const { messages, chatProjectId } = useChatContext();
  const {
    tasks, approvals,
    projects, expenses,
  } = useFirestoreContext();
  const { meetings } = useCalendarContext();
  const { invMovements, invTransfers, invProducts } = useInventoryContext();
  const { isEventEnabled } = useNotifPreferencesContext();
  const tenantId = useTenantId();

  // State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifHistory, setNotifHistory] = useState<NotifEntry[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    chat: true, tasks: true, meetings: true, approvals: true, inventory: true, projects: true,
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifSound, setNotifSound] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState<(NotifEntry & { ts?: number })[]>([]);
  const [notifFilterCat, setNotifFilterCat] = useState<string>('all');
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);

  // Refs
  const prevMessagesRef = useRef<ChatMessage[]>([]);
  const prevTasksRef = useRef<Task[]>([]);
  const prevMeetingsRef = useRef<Meeting[]>([]);
  const prevApprovalsRef = useRef<Approval[]>([]);
  const prevMovementsRef = useRef<InvMovement[]>([]);
  const prevTransfersRef = useRef<InvTransfer[]>([]);
  const prevProjectsRef = useRef<Project[]>([]);
  const prevExpensesRef = useRef<Expense[]>([]);
  const prevChangeOrdersRef = useRef<ChangeOrder[]>([]);
  const isTabVisibleRef = useRef(true);
  const firstLoadDoneRef = useRef(false);
  const overdueCheckedRef = useRef<string>('');
  const dedupMapRef = useRef<Record<string, number>>({});
  const firestoreUnsubscribeRef = useRef<(() => void) | null>(null);

  // Load changeOrders from Firestore client-side
  useEffect(() => {
    if (!authUser?.uid || !persistenceReady || !tenantId) return;
    const fb = getFirebase();
    if (!fb?.firestore) return;
    const db = fb.firestore();
    const unsub = db.collection('changeOrders').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(50)
      .onSnapshot((snap) => {
        setChangeOrders(snap.docs.map((d) => ({ id: d.id, data: d.data() } as unknown as ChangeOrder)));
      }, () => {});
    return () => { unsub(); setChangeOrders([]); };
  }, [authUser, persistenceReady, tenantId]);

  // ===== FIRESTORE PERSISTENCE =====

  // Save notification to Firestore
  const persistNotifToFirestore = useCallback(async (entry: NotifEntry) => {
    if (!authUser?.uid) return;
    try {
      const fb = getFirebase();
      if (!fb?.firestore) return;
      const db = fb.firestore();
      await db.collection('users').doc(authUser.uid).collection('notifications').doc(entry.id).set({
        ...entry,
        timestamp: fb.firestore.FieldValue.serverTimestamp(),
        _synced: true,
      });
    } catch (err) {
      // Silent fail — notifications still work in-memory
      console.warn('[NotifContext] Firestore persist failed:', err);
    }
  }, [authUser]);

  // Mark as read in Firestore
  const markReadInFirestore = useCallback(async (id: string) => {
    if (!authUser?.uid) return;
    try {
      const fb = getFirebase();
      if (!fb?.firestore) return;
      const db = fb.firestore();
      await db.collection('users').doc(authUser.uid).collection('notifications').doc(id).update({ read: true });
    } catch (err) {
      console.warn('[NotifContext] Firestore markRead failed:', err);
    }
  }, [authUser]);

  // Mark all as read in Firestore
  const markAllReadInFirestore = useCallback(async () => {
    if (!authUser?.uid) return;
    try {
      const fb = getFirebase();
      if (!fb?.firestore) return;
      const db = fb.firestore();
      const snap = await db.collection('users').doc(authUser.uid).collection('notifications')
        .where('read', '==', false).limit(100).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
      await batch.commit();
    } catch (err) {
      console.warn('[NotifContext] Firestore markAllRead failed:', err);
    }
  }, [authUser]);

  // Load notifications from Firestore on mount
  useEffect(() => {
    if (!authUser?.uid) return;
    const fb = getFirebase();
    if (!fb?.firestore) return;
    const db = fb.firestore();
    const notifsRef = db.collection('users').doc(authUser.uid).collection('notifications')
      .orderBy('timestamp', 'desc').limit(100);

    const unsubscribe = notifsRef.onSnapshot((snap) => {
      const loaded: NotifEntry[] = [];
      snap.docs.forEach((doc) => {
        const d = doc.data();
        const ts = d.timestamp;
        loaded.push({
          id: doc.id,
          title: typeof d.title === 'string' ? d.title : String(d.title ?? ''),
          body: typeof d.body === 'string' ? d.body : String(d.body ?? ''),
          icon: typeof d.icon === 'string' ? d.icon : '🔔',
          type: d.type || 'info',
          read: d.read || false,
          timestamp: ts?.toDate ? ts.toDate() : new Date(d.timestamp || Date.now()),
          screen: d.screen || null,
          itemId: d.itemId || null,
        });
      });
      setNotifHistory(prev => {
        // Merge: keep in-memory notifs that aren't from Firestore yet
        const fsIds = new Set(loaded.map(n => n.id));
        const localOnly = prev.filter((n) => !('_synced' in n && n._synced) && !fsIds.has(n.id));
        return [...loaded, ...localOnly].slice(0, 100);
      });
      setPersistenceReady(true);
    }, (err: unknown) => {
      console.warn('[NotifContext] Firestore listener error:', err instanceof Error ? err.message : String(err));
      setPersistenceReady(true);
    });

    firestoreUnsubscribeRef.current = unsubscribe;
    return () => { unsubscribe(); firestoreUnsubscribeRef.current = null; };
  }, [authUser]);

  // Cleanup: delete notifications older than 7 days from Firestore
  useEffect(() => {
    if (!authUser?.uid || !persistenceReady) return;
    const cleanup = async () => {
      try {
        const fb = getFirebase();
        if (!fb?.firestore) return;
        const db = fb.firestore();
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const snap = await db.collection('users').doc(authUser.uid).collection('notifications')
          .where('timestamp', '<', cutoff).limit(200).get();
        if (snap.empty) return;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[NotifContext] Cleaned ${snap.size} old notifications`);
      } catch (err) {
        console.warn('[NotifContext] Cleanup failed:', err);
      }
    };
    // Run once on load, then daily
    const timer = setTimeout(cleanup, 5000);
    const iv = setInterval(cleanup, 24 * 60 * 60 * 1000);
    return () => { clearTimeout(timer); clearInterval(iv); };
  }, [authUser, persistenceReady]);

  // ===== EFFECTS =====

  // Track document visibility
  useEffect(() => {
    const handler = () => { isTabVisibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    isTabVisibleRef.current = document.visibilityState === 'visible';
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Init notification permission + auto-show banner
  useEffect(() => {
    if (!('Notification' in window)) return;
    setNotifPermission(Notification.permission);
    try {
      const savedPrefs = localStorage.getItem('archiflow-notif-prefs');
      if (savedPrefs) setNotifPrefs(JSON.parse(savedPrefs));
      const savedSound = localStorage.getItem('archiflow-notif-sound');
      if (savedSound !== null) setNotifSound(savedSound === 'true');
    } catch (err) { console.error("[ArchiFlow]", err); }
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('archiflow-notif-dismissed');
      if (dismissed) {
        const diff = Date.now() - parseInt(dismissed);
        if (diff < 3 * 24 * 60 * 60 * 1000) return;
      }
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') setShowNotifBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Save notif sound pref
  useEffect(() => {
    try { localStorage.setItem('archiflow-notif-sound', String(notifSound)); } catch (err) { console.error("[ArchiFlow]", err); }
  }, [notifSound]);

  // Save notification preferences
  useEffect(() => {
    try { localStorage.setItem('archiflow-notif-prefs', JSON.stringify(notifPrefs)); } catch (err) { console.error("[ArchiFlow]", err); }
  }, [notifPrefs]);

  // After loading finishes, mark all current data as "seen"
  useEffect(() => {
    if (!persistenceReady) return;
    if (!firstLoadDoneRef.current) {
      const timer = setTimeout(() => {
        prevMessagesRef.current = messages;
        prevTasksRef.current = tasks;
        prevMeetingsRef.current = meetings;
        prevApprovalsRef.current = approvals;
        prevMovementsRef.current = invMovements;
        prevTransfersRef.current = invTransfers;
        prevProjectsRef.current = projects;
        prevExpensesRef.current = expenses;
        firstLoadDoneRef.current = true;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, tasks, meetings, approvals, invMovements, invTransfers, projects, expenses, persistenceReady]);

  // Calculate unread count
  useEffect(() => {
    setUnreadCount(notifHistory.filter(n => !n.read).length);
  }, [notifHistory]);

  // ===== EVENT DETECTION =====

  // Detect new chat messages (with dedup)
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (messages.length === 0) { prevMessagesRef.current = []; return; }
    const prev = prevMessagesRef.current;
    const newMsgs = messages.filter(m => !prev.find(p => p.id === m.id));
    if (newMsgs.length > 0 && notifPrefs.chat) {
      const otherMsgs = newMsgs.filter(m => m.uid !== authUser?.uid);
      if (otherMsgs.length > 0) {
        const lastMsg = otherMsgs[otherMsgs.length - 1];
        const projName = chatProjectId === '__general__' ? 'Chat General' : projects.find(p => p.id === chatProjectId)?.data?.name || 'Chat';
        const senderName = lastMsg.userName || 'Alguien';
        const msgType = lastMsg.type || 'TEXT';
        const typeLabel = msgType === 'AUDIO' ? '🎤 Nota de voz' : msgType === 'IMAGE' ? '🖼️ Imagen' : msgType === 'FILE' ? '📎 Archivo' : '';
        const bodyText = lastMsg.text?.substring(0, 120) || (msgType === 'AUDIO' ? '🎵 Nota de voz' : msgType === 'IMAGE' ? '📷 Foto' : msgType === 'FILE' ? `📎 ${lastMsg.fileName || 'Archivo'}` : '');
        // Smart grouping: bundle multiple messages
        const count = otherMsgs.length;
        const title = count > 1
          ? `${count} mensajes nuevos en ${projName}`
          : `${senderName} en ${projName}`;
        const body = count > 1
          ? `Último: ${senderName} — ${typeLabel}${bodyText}`
          : `${typeLabel}${bodyText}`;
        sendBrowserNotif(title, body, undefined, `chat-${chatProjectId}`, { type: 'chat', screen: 'chat', itemId: chatProjectId, eventType: 'chat_message' });
        useUIStore.getState().incrementChatUnread();
      }
    }
    prevMessagesRef.current = messages;
  }, [messages, notifPrefs.chat, authUser, chatProjectId, projects]);

  // Detect new/changed tasks
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (tasks.length === 0) { prevTasksRef.current = []; return; }
    const prev = prevTasksRef.current;
    const newTasks = tasks.filter(t => !prev.find(p => p.id === t.id));
    const changedTasks = tasks.filter(t => {
      const p = prev.find(pp => pp.id === t.id);
      return p && (p.data.status !== t.data.status || p.data.priority !== t.data.priority || p.data.assigneeId !== t.data.assigneeId);
    });
    if (notifPrefs.tasks) {
      newTasks.forEach(t => {
        if (t.data.assigneeId === authUser?.uid) {
          const proj = projects.find(p => p.id === t.data.projectId);
          sendBrowserNotif('📋 Nueva tarea asignada', `"${String(t.data.title ?? '')}"${proj ? ` — ${String(proj.data.name)}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id, eventType: 'task_assigned' });
        }
      });
      changedTasks.forEach(t => {
        if (t.data.assigneeId === authUser?.uid) {
          const proj = projects.find(p => p.id === t.data.projectId);
          sendBrowserNotif(t.data.status === 'Completado' ? '✅ Tarea completada' : t.data.status === 'En progreso' ? '🔄 Tarea en progreso' : '📝 Tarea actualizada', `"${String(t.data.title ?? '')}"${proj ? ` — ${String(proj.data.name)}` : ''} · ${String(t.data.status ?? '')}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id, eventType: t.data.status === 'Completado' ? 'task_completed' as NotifEventType : 'task_assigned' as NotifEventType });
        }
      });
    }
    prevTasksRef.current = tasks;
  }, [tasks, notifPrefs.tasks, authUser, projects]);

  // Detect new meetings
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (meetings.length === 0) { prevMeetingsRef.current = []; return; }
    const prev = prevMeetingsRef.current;
    const newMeetings = meetings.filter(m => !prev.find(p => p.id === m.id));
    if (newMeetings.length > 0 && notifPrefs.meetings) {
      newMeetings.forEach(m => {
        const proj = projects.find(p => p.id === m.data.projectId);
        sendBrowserNotif('📅 Nueva reunión programada', `"${String(m.data.title ?? '')}"${m.data.time ? ` a las ${String(m.data.time)}` : ''}${m.data.date ? ` · ${fmtDate(m.data.date)}` : ''}${proj ? ` — ${String(proj.data.name)}` : ''}`, undefined, `meeting-${m.id}`, { type: 'meeting', screen: 'calendar', itemId: m.id, eventType: 'meeting_reminder' });
      });
    }
    prevMeetingsRef.current = meetings;
  }, [meetings, notifPrefs.meetings, projects]);

  // Detect new approvals
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (approvals.length === 0) { prevApprovalsRef.current = []; return; }
    const prev = prevApprovalsRef.current;
    const newApprovals = approvals.filter(a => !prev.find(p => p.id === a.id));
    const changedApprovals = approvals.filter(a => {
      const p = prev.find(pp => pp.id === a.id);
      return p && p.data.status !== a.data.status;
    });
    if (notifPrefs.approvals) {
      newApprovals.forEach(a => {
        sendBrowserNotif('📋 Nueva solicitud de aprobación', `"${String(a.data.title ?? '')}" · Pendiente de revisión`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId, eventType: 'approval_action' });
      });
      changedApprovals.forEach(a => {
        sendBrowserNotif(a.data.status === 'Aprobada' ? '✅ Aprobación aceptada' : a.data.status === 'Rechazada' ? '❌ Aprobación rechazada' : '📝 Aprobación actualizada', `"${String(a.data.title ?? '')}" · ${String(a.data.status ?? '')}`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId, eventType: 'approval_action' });
      });
    }
    prevApprovalsRef.current = approvals;
  }, [approvals, notifPrefs.approvals, selectedProjectId]);

  // Detect inventory changes
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.inventory) return;
    const prevMov = prevMovementsRef.current;
    const prevTrans = prevTransfersRef.current;
    const newMovs = invMovements.filter(m => !prevMov.find(p => p.id === m.id));
    newMovs.forEach(m => {
      const prod = invProducts.find(p => p.id === m.data.productId);
      sendNotif(m.data.type === 'Entrada' ? '📥 Entrada de inventario' : '📤 Salida de inventario', `${prod?.data?.name || 'Producto'} · ${m.data.quantity} ${prod?.data?.unit || 'uds'}${m.data.reason ? ` — ${m.data.reason}` : ''}`, undefined, `mov-${m.id}`, { type: 'inventory', screen: 'inventory', eventType: 'inventory_alert' });
    });
    const newTrans = invTransfers.filter(t => !prevTrans.find(p => p.id === t.id));
    newTrans.forEach(t => {
      sendNotif('🚚 Nueva transferencia', `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse} (${t.data.quantity})`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory', eventType: 'inventory_alert' });
    });
    const changedTrans = invTransfers.filter(t => {
      const p = prevTrans.find(pp => pp.id === t.id);
      return p && p.data.status !== t.data.status;
    });
    changedTrans.forEach(t => {
      const statusEmoji = t.data.status === 'Completada' ? '✅' : t.data.status === 'En tránsito' ? '🚛' : t.data.status === 'Cancelada' ? '❌' : '📦';
      sendNotif(`${statusEmoji} Transferencia ${t.data.status.toLowerCase()}`, `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory', eventType: 'inventory_alert' });
    });
    prevMovementsRef.current = invMovements;
    prevTransfersRef.current = invTransfers;
  }, [invMovements, invTransfers, invProducts, notifPrefs.inventory]);

  // ★ NEW: Detect change order events
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!changeOrders || changeOrders.length === 0) { prevChangeOrdersRef.current = []; return; }
    const prev = prevChangeOrdersRef.current;
    const newCO = changeOrders.filter((c) => !prev.find((p) => p.id === c.id));
    const changedCO = changeOrders.filter((c) => {
      const p = prev.find((pp) => pp.id === c.id);
      return p && p.data.status !== c.data.status;
    });
    if (notifPrefs.projects) {
      newCO.forEach((co) => {
        sendBrowserNotif('🔄 Nuevo cambio solicitado', `"${String(co.data.title || (co.data.number ?? ''))}" · ${String(co.data.status ?? '')}`, undefined, `co-${co.id}`, { type: 'project', screen: 'changeOrders', itemId: co.id, eventType: 'phase_change' });
      });
      changedCO.forEach((co) => {
        const statusEmoji = co.data.status === 'Aprobada' ? '✅' : co.data.status === 'Rechazada' ? '❌' : co.data.status === 'Implementada' ? '🎉' : '📝';
        const isUrgent = co.data.status === 'Aprobada' || co.data.status === 'Rechazada';
        const fn = isUrgent ? sendBrowserNotif : sendNotif;
        fn(`${statusEmoji} Cambio de orden ${String(co.data.status ?? '').toLowerCase()}`, `"${String(co.data.title || (co.data.number ?? ''))}"${co.data.impactBudget ? ` · Impacto: $${Number(co.data.impactBudget).toLocaleString('es-CO')}` : ''}`, undefined, `co-${co.id}`, { type: 'project', screen: 'changeOrders', itemId: co.id, eventType: 'phase_change' });
      });
    }
    prevChangeOrdersRef.current = changeOrders;
  }, [changeOrders, notifPrefs.projects]);

  // Meeting reminder check
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.meetings || !authUser) return;
    const check = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      meetings.forEach(m => {
        if (m.data.date === todayStr && m.data.time) {
          const [h, min] = m.data.time.split(':').map(Number);
          const meetingMinutes = h * 60 + min;
          const diff = meetingMinutes - nowMinutes;
          if (diff === 15 || diff === 5) {
            const proj = projects.find(p => p.id === m.data.projectId);
            sendBrowserNotif(`⏰ Reunión en ${diff} minutos`, `"${String(m.data.title ?? '')}" a las ${String(m.data.time)}${proj ? ` — ${String(proj.data.name)}` : ''}`, undefined, `reminder-${m.id}-${diff}`, { type: 'meeting', screen: 'calendar', eventType: 'meeting_reminder' });
          }
        }
      });
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [meetings, notifPrefs.meetings, authUser, projects]);

  // Detect project status changes
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (projects.length === 0) { prevProjectsRef.current = []; return; }
    const prev = prevProjectsRef.current;
    const changedProjects = projects.filter(p => {
      const pr = prev.find(pp => pp.id === p.id);
      return pr && (pr.data.status !== p.data.status);
    });
    if (notifPrefs.projects) {
      changedProjects.forEach(p => {
        const statusEmoji = (p.data.status as string) === 'Ejecucion' ? '🏗️' : (p.data.status as string) === 'Terminado' ? '🎉' : (p.data.status as string) === 'Diseno' ? '🎨' : '📁';
        sendNotif(`${statusEmoji} Proyecto actualizado`, `"${String(p.data.name ?? '')}" cambió a: ${String(p.data.status ?? '')}`, undefined, `proj-${p.id}`, { type: 'project', screen: 'projects', itemId: p.id, eventType: 'phase_change' });
      });
    }
    prevProjectsRef.current = projects;
  }, [projects, notifPrefs.projects]);

  // Overdue tasks reminder (smart: only once per day, respects preferences)
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.tasks || !authUser) return;
    const check = () => {
      const today = new Date().toISOString().split('T')[0];
      const checkKey = `overdue-${today}`;
      if (overdueCheckedRef.current === checkKey) return;
      overdueCheckedRef.current = checkKey;
      const myOverdue = tasks.filter(t =>
        t.data.assigneeId === authUser?.uid && t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today
      );
      if (myOverdue.length > 0) {
        const urgentCount = myOverdue.filter(t => {
          if (!t.data.dueDate) return false;
          const days = Math.floor((Date.now() - new Date(t.data.dueDate).getTime()) / 86400000);
          return days >= 3;
        }).length;
        const prefix = urgentCount > 0 ? `🚨 ${urgentCount} urgente${urgentCount > 1 ? 's' : ''}` : `⚠️`;
        sendNotif(`${prefix} ${myOverdue.length} tarea${myOverdue.length > 1 ? 's' : ''} vencida${myOverdue.length > 1 ? 's' : ''}`,
          myOverdue.slice(0, 3).map(t => `"${t.data.title}"`).join(', '),
          undefined, 'overdue-daily', { type: 'reminder', screen: 'tasks', eventType: 'task_due_soon' });
      }
    };
    check();
    const iv = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(iv);
  }, [tasks, notifPrefs.tasks, authUser]);

  // Low stock periodic check
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.inventory) return;
    let lastLowStockCount = -1;
    const check = () => {
      const lowStock = invProducts.filter(p => {
        const stock = p.data.warehouseStock ? (Object.values(p.data.warehouseStock) as number[]).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock > 0 && stock <= (p.data.minStock || 5);
      });
      const outOfStock = invProducts.filter(p => {
        const stock = p.data.warehouseStock ? (Object.values(p.data.warehouseStock) as number[]).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock <= 0;
      });
      const total = lowStock.length + outOfStock.length;
      if (total > 0 && total !== lastLowStockCount) {
        lastLowStockCount = total;
        sendNotif(outOfStock.length > 0 ? '🚨 Alerta de inventario' : '⚠️ Stock bajo',
          outOfStock.length > 0
            ? `${outOfStock.length} sin stock${lowStock.length > 0 ? `, ${lowStock.length} bajo mínimo` : ''}: ${outOfStock.map(p => p.data.name).slice(0,3).join(', ')}`
            : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} bajo mínimo: ${lowStock.map(p => p.data.name).slice(0,3).join(', ')}`,
          undefined, 'inv-lowstock-check', { type: 'inventory', screen: 'inventory', eventType: 'inventory_alert' }
        );
      }
    };
    const initTimer = setTimeout(check, 10000);
    const iv = setInterval(check, 10 * 60 * 1000);
    return () => { clearTimeout(initTimer); clearInterval(iv); };
  }, [invProducts, notifPrefs.inventory]);

  // ===== FUNCTIONS =====

  const vibrateNotif = useCallback(() => {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

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
        approval: [698.46, 880], inventory: [440, 554.37], project: [493.88, 659.25], reminder: [880, 1046.5], budget: [415.3, 523.25],
      };
      const [f1, f2] = tones[type || ''] || [587.33, 880];
      osc.frequency.value = f1; osc.start();
      setTimeout(() => { osc.frequency.value = f2; }, 100);
      setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.stop(ctx.currentTime + 0.25); }, 200);
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, [notifSound]);

  const sendNotif = useCallback((title: string, body: string, icon?: string, tag?: string, data?: NotifData) => {
    // Check granular event preference — if eventType is specified and disabled, skip
    const eventType = data?.eventType as NotifEventType | undefined;
    if (eventType && !isEventEnabled(eventType)) return;

    // ★ Deduplication: skip if same tag was notified within window
    if (tag) {
      const lastTime = dedupMapRef.current[tag];
      if (lastTime && Date.now() - lastTime < DEDUP_WINDOW_MS) return;
      dedupMapRef.current[tag] = Date.now();
    }

    const type = data?.type || 'info';
    const notifEntry: NotifEntry & { _synced?: boolean } = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      title, body, icon: typeof icon === 'string' ? icon : '🔔', type, read: false,
      timestamp: new Date(), screen: data?.screen || null, itemId: data?.itemId || null,
    };
    setNotifHistory(prev => [notifEntry, ...prev].slice(0, 100));
    setInAppNotifs(prev => [...prev, { ...notifEntry, ts: Date.now() }]);
    setTimeout(() => setInAppNotifs(prev => prev.filter(n => Date.now() - (n.ts || 0) < 5000)), 5500);

    // ★ Persist to Firestore (async, non-blocking)
    persistNotifToFirestore(notifEntry);

    playNotifSound(type);
    vibrateNotif();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: icon || '/icon-192.png', badge: '/icon-192.png', tag: tag || `archiflow-${Date.now()}`, requireInteraction: false, silent: true, data });
        n.onclick = () => { window.focus(); n.close(); if (data?.screen) navigateToRef.current(data.screen, data.itemId); };
        setTimeout(() => n.close(), 8000);
      } catch (e: unknown) { console.warn('OS Notification error:', e); }
    }
  }, [playNotifSound, vibrateNotif, navigateToRef, isEventEnabled, persistNotifToFirestore]);

  const sendBrowserNotif = sendNotif;

  // Detect budget threshold crossings
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.projects) return;
    const prev = prevExpensesRef.current;
    // Only check when expenses change
    if (expenses.length === prev.length && expenses.every((e, i) => e.id === prev[i]?.id && e.data.amount === prev[i]?.data.amount)) {
      return;
    }
    const { newAlerts } = checkBudgetAlerts(projects, expenses);
    newAlerts.forEach((alert) => {
      const { title, body } = formatBudgetAlertMessage(alert);
      sendNotif(
        title,
        body,
        alert.emoji,
        `budget-${alert.projectId}-${alert.threshold}`,
        { type: 'budget', screen: 'projectDetail', itemId: alert.projectId, eventType: 'budget_alert' },
      );
    });
    prevExpensesRef.current = expenses;
  }, [expenses, projects, notifPrefs.projects, sendNotif]);

  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) { showToast('Tu navegador no soporta notificaciones', 'error'); return; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    setShowNotifBanner(false);
    if (perm === 'granted') {
      showToast('🔔 Notificaciones activadas');
      localStorage.setItem('archiflow-notif-perm', 'granted');
      localStorage.setItem('archiflow-notif-dismissed', String(Date.now()));
    } else {
      showToast('Notificaciones bloqueadas por el navegador', 'error');
    }
  }, [showToast]);

  const dismissNotifBanner = () => {
    setShowNotifBanner(false);
    localStorage.setItem('archiflow-notif-dismissed', String(Date.now()));
  };

  const toggleNotifPref = (key: string) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const markNotifRead = (id: string) => {
    setNotifHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markReadInFirestore(id);
  };

  const markAllNotifRead = () => {
    setNotifHistory(prev => prev.map(n => ({ ...n, read: true })));
    markAllReadInFirestore();
  };

  const clearNotifHistory = () => {
    setNotifHistory([]);
    setInAppNotifs([]);
    showToast('Historial de notificaciones limpiado');
  };

  const value: NotifContextType = useMemo(() => ({
    notifPermission, setNotifPermission,
    notifHistory, setNotifHistory,
    notifPrefs, setNotifPrefs,
    showNotifPanel, setShowNotifPanel,
    unreadCount,
    notifSound, setNotifSound,
    inAppNotifs, setInAppNotifs,
    notifFilterCat, setNotifFilterCat,
    showNotifBanner, setShowNotifBanner,
    persistenceReady,
    sendNotif, sendBrowserNotif,
    playNotifSound, vibrateNotif,
    requestNotifPermission, dismissNotifBanner,
    toggleNotifPref, markNotifRead, markAllNotifRead, clearNotifHistory,
    navigateToRef, isTabVisibleRef,
  }), [notifPermission, notifHistory, notifPrefs, showNotifPanel, unreadCount, notifSound, inAppNotifs, notifFilterCat, showNotifBanner, persistenceReady, sendNotif, sendBrowserNotif, playNotifSound, vibrateNotif, requestNotifPermission, dismissNotifBanner, toggleNotifPref, markNotifRead, markAllNotifRead, clearNotifHistory]);

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotifContext() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifContext must be used within NotifProvider');
  return ctx;
}
