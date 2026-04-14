'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { useChatContext } from './ChatContext';
import { useFirestoreContext } from './FirestoreContext';
import { useCalendarContext } from './CalendarContext';
import { useInventoryContext } from './InventoryContext';
import { fmtDate } from '@/lib/helpers';

/* ===== NOTIFICATION CONTEXT ===== */
interface NotifContextType {
  // State
  notifPermission: NotificationPermission;
  setNotifPermission: React.Dispatch<React.SetStateAction<NotificationPermission>>;
  notifHistory: any[];
  setNotifHistory: React.Dispatch<React.SetStateAction<any[]>>;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showNotifPanel: boolean;
  setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  notifSound: boolean;
  setNotifSound: React.Dispatch<React.SetStateAction<boolean>>;
  inAppNotifs: any[];
  setInAppNotifs: React.Dispatch<React.SetStateAction<any[]>>;
  notifFilterCat: string;
  setNotifFilterCat: React.Dispatch<React.SetStateAction<string>>;
  showNotifBanner: boolean;
  setShowNotifBanner: React.Dispatch<React.SetStateAction<boolean>>;

  // Functions
  sendNotif: (title: string, body: string, icon?: string, tag?: string, data?: any) => void;
  sendBrowserNotif: (title: string, body: string, icon?: string, tag?: string, data?: any) => void;
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

export default function NotifProvider({ children }: { children: React.ReactNode }) {
  const { showToast, navigateToRef, selectedProjectId } = useUIContext();
  const { authUser } = useAuthContext();
  const { messages, chatProjectId } = useChatContext();
  const {
    tasks, approvals,
    projects,
  } = useFirestoreContext();
  const { meetings } = useCalendarContext();
  const { invMovements, invTransfers, invProducts } = useInventoryContext();

  // State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    chat: true, tasks: true, meetings: true, approvals: true, inventory: true, projects: true,
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifSound, setNotifSound] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState<any[]>([]);
  const [notifFilterCat, setNotifFilterCat] = useState<string>('all');
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // Refs
  const prevMessagesRef = useRef<any[]>([]);
  const prevTasksRef = useRef<any[]>([]);
  const prevMeetingsRef = useRef<any[]>([]);
  const prevApprovalsRef = useRef<any[]>([]);
  const prevMovementsRef = useRef<any[]>([]);
  const prevTransfersRef = useRef<any[]>([]);
  const prevProjectsRef = useRef<any[]>([]);
  const isTabVisibleRef = useRef(true);
  const firstLoadDoneRef = useRef(false);
  const overdueCheckedRef = useRef<string>('');

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
    if (!firstLoadDoneRef.current) {
      const timer = setTimeout(() => {
        prevMessagesRef.current = messages;
        prevTasksRef.current = tasks;
        prevMeetingsRef.current = meetings;
        prevApprovalsRef.current = approvals;
        prevMovementsRef.current = invMovements;
        prevTransfersRef.current = invTransfers;
        prevProjectsRef.current = projects;
        firstLoadDoneRef.current = true;
        console.log('[ArchiFlow] First load complete — notifications armed');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, tasks, meetings, approvals, invMovements, invTransfers, projects]);

  // Calculate unread count
  useEffect(() => {
    setUnreadCount(notifHistory.filter(n => !n.read).length);
  }, [notifHistory]);

  // Detect new chat messages
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
        sendBrowserNotif(`${senderName} en ${projName}`, `${typeLabel}${bodyText}`, undefined, `chat-${chatProjectId}`, { type: 'chat', screen: 'chat', itemId: chatProjectId });
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
          sendBrowserNotif('📋 Nueva tarea asignada', `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id });
        }
      });
      changedTasks.forEach(t => {
        if (t.data.assigneeId === authUser?.uid) {
          const proj = projects.find(p => p.id === t.data.projectId);
          sendBrowserNotif(t.data.status === 'Completado' ? '✅ Tarea completada' : t.data.status === 'En progreso' ? '🔄 Tarea en progreso' : '📝 Tarea actualizada', `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''} · ${t.data.status}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id });
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
        sendBrowserNotif('📅 Nueva reunión programada', `"${m.data.title}"${m.data.time ? ` a las ${m.data.time}` : ''}${m.data.date ? ` · ${fmtDate(m.data.date)}` : ''}${proj ? ` — ${proj.data.name}` : ''}`, undefined, `meeting-${m.id}`, { type: 'meeting', screen: 'calendar', itemId: m.id });
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
        sendBrowserNotif('📋 Nueva solicitud de aprobación', `"${a.data.title}" · Pendiente de revisión`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId });
      });
      changedApprovals.forEach(a => {
        sendBrowserNotif(a.data.status === 'Aprobada' ? '✅ Aprobación aceptada' : a.data.status === 'Rechazada' ? '❌ Aprobación rechazada' : '📝 Aprobación actualizada', `"${a.data.title}" · ${a.data.status}`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId });
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
      sendNotif(m.data.type === 'Entrada' ? '📥 Entrada de inventario' : '📤 Salida de inventario', `${prod?.data?.name || 'Producto'} · ${m.data.quantity} ${prod?.data?.unit || 'uds'}${m.data.reason ? ` — ${m.data.reason}` : ''}`, undefined, `mov-${m.id}`, { type: 'inventory', screen: 'inventory' });
    });
    const newTrans = invTransfers.filter(t => !prevTrans.find(p => p.id === t.id));
    newTrans.forEach(t => {
      sendNotif('🚚 Nueva transferencia', `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse} (${t.data.quantity})`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' });
    });
    const changedTrans = invTransfers.filter(t => {
      const p = prevTrans.find(pp => pp.id === t.id);
      return p && p.data.status !== t.data.status;
    });
    changedTrans.forEach(t => {
      const statusEmoji = t.data.status === 'Completada' ? '✅' : t.data.status === 'En tránsito' ? '🚛' : t.data.status === 'Cancelada' ? '❌' : '📦';
      sendNotif(`${statusEmoji} Transferencia ${t.data.status.toLowerCase()}`, `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' });
    });
    prevMovementsRef.current = invMovements;
    prevTransfersRef.current = invTransfers;
  }, [invMovements, invTransfers, invProducts, notifPrefs.inventory]);

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
            sendBrowserNotif(`⏰ Reunión en ${diff} minutos`, `"${m.data.title}" a las ${m.data.time}${proj ? ` — ${proj.data.name}` : ''}`, undefined, `reminder-${m.id}-${diff}`, { type: 'meeting', screen: 'calendar' });
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
        const statusEmoji = p.data.status === 'Ejecucion' ? '🏗️' : p.data.status === 'Terminado' ? '🎉' : p.data.status === 'Diseno' ? '🎨' : '📁';
        sendNotif(`${statusEmoji} Proyecto actualizado`, `"${p.data.name}" cambió a: ${p.data.status}`, undefined, `proj-${p.id}`, { type: 'project', screen: 'projects', itemId: p.id });
      });
    }
    prevProjectsRef.current = projects;
  }, [projects, notifPrefs.projects]);

  // Overdue tasks reminder
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
        sendNotif(`⚠️ ${myOverdue.length} tarea${myOverdue.length > 1 ? 's' : ''} vencida${myOverdue.length > 1 ? 's' : ''}`, myOverdue.slice(0, 3).map(t => `"${t.data.title}"`).join(', '), undefined, 'overdue-daily', { type: 'reminder', screen: 'tasks' });
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
        const stock = p.data.warehouseStock ? (Object.values(p.data.warehouseStock) as any[]).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock > 0 && stock <= (p.data.minStock || 5);
      });
      const outOfStock = invProducts.filter(p => {
        const stock = p.data.warehouseStock ? (Object.values(p.data.warehouseStock) as any[]).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock <= 0;
      });
      const total = lowStock.length + outOfStock.length;
      if (total > 0 && total !== lastLowStockCount) {
        lastLowStockCount = total;
        sendNotif(outOfStock.length > 0 ? '🚨 Alerta de inventario' : '⚠️ Stock bajo',
          outOfStock.length > 0
            ? `${outOfStock.length} sin stock${lowStock.length > 0 ? `, ${lowStock.length} bajo mínimo` : ''}: ${outOfStock.map(p => p.data.name).slice(0,3).join(', ')}`
            : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} bajo mínimo: ${lowStock.map(p => p.data.name).slice(0,3).join(', ')}`,
          undefined, 'inv-lowstock-check', { type: 'inventory', screen: 'inventory' }
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
        approval: [698.46, 880], inventory: [440, 554.37], project: [493.88, 659.25], reminder: [880, 1046.5],
      };
      const [f1, f2] = tones[type || ''] || [587.33, 880];
      osc.frequency.value = f1; osc.start();
      setTimeout(() => { osc.frequency.value = f2; }, 100);
      setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.stop(ctx.currentTime + 0.25); }, 200);
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, [notifSound]);

  const sendNotif = useCallback((title: string, body: string, icon?: string, tag?: string, data?: any) => {
    const type = data?.type || 'info';
    const notifEntry = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      title, body, icon: icon || '🔔', type, read: false,
      timestamp: new Date(), screen: data?.screen || null, itemId: data?.itemId || null,
    };
    setNotifHistory(prev => [notifEntry, ...prev].slice(0, 100));
    setInAppNotifs(prev => [...prev, { ...notifEntry, ts: Date.now() }]);
    setTimeout(() => setInAppNotifs(prev => prev.filter(n => Date.now() - n.ts < 5000)), 5500);
    playNotifSound(type);
    vibrateNotif();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: icon || '/icon-192.png', badge: '/icon-192.png', tag: tag || `archiflow-${Date.now()}`, requireInteraction: false, silent: true, data });
        n.onclick = () => { window.focus(); n.close(); if (data?.screen) navigateToRef.current(data.screen, data.itemId); };
        setTimeout(() => n.close(), 8000);
      } catch (e: any) { console.warn('OS Notification error:', e); }
    }
  }, [playNotifSound, vibrateNotif, navigateToRef]);

  const sendBrowserNotif = sendNotif;

  const requestNotifPermission = async () => {
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
  };

  const dismissNotifBanner = () => {
    setShowNotifBanner(false);
    localStorage.setItem('archiflow-notif-dismissed', String(Date.now()));
  };

  const toggleNotifPref = (key: string) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const markNotifRead = (id: string) => {
    setNotifHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotifRead = () => {
    setNotifHistory(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifHistory = () => {
    setNotifHistory([]);
    setInAppNotifs([]);
    showToast('Historial de notificaciones limpiado');
  };

  const value: NotifContextType = {
    notifPermission, setNotifPermission,
    notifHistory, setNotifHistory,
    notifPrefs, setNotifPrefs,
    showNotifPanel, setShowNotifPanel,
    unreadCount,
    notifSound, setNotifSound,
    inAppNotifs, setInAppNotifs,
    notifFilterCat, setNotifFilterCat,
    showNotifBanner, setShowNotifBanner,
    sendNotif, sendBrowserNotif,
    playNotifSound, vibrateNotif,
    requestNotifPermission, dismissNotifBanner,
    toggleNotifPref, markNotifRead, markAllNotifRead, clearNotifHistory,
    navigateToRef, isTabVisibleRef,
  };

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotifContext() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifContext must be used within NotifProvider');
  return ctx;
}
