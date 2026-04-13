'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';

/* ===== MODULED IMPORTS ===== */
import type { TeamUser, Project, Task, Expense, Supplier, Approval, WorkPhase, ProjectFile, OneDriveFile, GalleryPhoto, InvProduct, InvCategory, InvMovement, InvTransfer, TimeEntry, Invoice, Comment } from '@/lib/types';
import { DEFAULT_PHASES, EXPENSE_CATS, SUPPLIER_CATS, PHOTO_CATS, INV_UNITS, INV_WAREHOUSES, TRANSFER_STATUSES, CAT_COLORS, ADMIN_EMAILS, USER_ROLES, ROLE_COLORS, ROLE_ICONS, MESES, DIAS_SEMANA, NAV_ITEMS, SCREEN_TITLES, DEFAULT_ROLE_PERMS } from '@/lib/types';

import { fmtCOP, fmtDate, fmtDateTime, fmtSize, getInitials, statusColor, prioColor, taskStColor, avatarColor, fmtRecTime, fmtDuration, fmtTimer, getWeekStart, fileToBase64, getPlatform, uniqueId } from '@/lib/helpers';

import { getFirebase } from '@/lib/firebase-service';
import * as fbActions from '@/lib/firestore-actions';

import { useFirestoreData } from '@/hooks/useFirestoreData';
import { useNotifications } from '@/hooks/useNotifications';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

import { notifyWhatsApp } from '@/lib/whatsapp-notifications';

/* ===== APP CONTEXT ===== */
const AppContext = createContext<any>(null);

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [screen, setScreen] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatProjectId, setChatProjectId] = useState<string | null>(null);
  const [workPhases, setWorkPhases] = useState<WorkPhase[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatMobileShow, setChatMobileShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Microsoft / OneDrive state
  const [msAccessToken, setMsAccessToken] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFile[]>([]);
  const [odProjectFolder, setOdProjectFolder] = useState<string | null>(null);
  const [showOneDrive, setShowOneDrive] = useState(false);

  // OneDrive token refresh
  const [msRefreshToken, setMsRefreshToken] = useState<string | null>(null);
  const [msTokenExpiry, setMsTokenExpiry] = useState<number>(0);

  // OneDrive enhanced state
  const [odSearchQuery, setOdSearchQuery] = useState('');
  const [odSearchResults, setOdSearchResults] = useState<OneDriveFile[]>([]);
  const [odSearching, setOdSearching] = useState(false);
  const [odBreadcrumbs, setOdBreadcrumbs] = useState<{id: string, name: string}[]>([]);
  const [odCurrentFolder, setOdCurrentFolder] = useState<string>('root');
  const [odViewMode, setOdViewMode] = useState<'list' | 'grid'>('list');
  const [odRenaming, setOdRenaming] = useState<string | null>(null);
  const [odRenameName, setOdRenameName] = useState('');
  const [odUploading, setOdUploading] = useState(false);
  const [odUploadProgress, setOdUploadProgress] = useState(0);
  const [odUploadFile, setOdUploadFile] = useState<string>('');
  const [odDragOver, setOdDragOver] = useState(false);
  const [odTab, setOdTab] = useState<'files' | 'gallery'>('files');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [odGalleryPhotos, setOdGalleryPhotos] = useState<any[]>([]);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calFilterProject, setCalFilterProject] = useState<string>('all');
  const [meetings, setMeetings] = useState<any[]>([]);

  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [galleryFilterProject, setGalleryFilterProject] = useState<string>('all');
  const [galleryFilterCat, setGalleryFilterCat] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Inventory state
  const [invProducts, setInvProducts] = useState<any[]>([]);
  const [invCategories, setInvCategories] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [invTab, setInvTab] = useState<'dashboard' | 'products' | 'categories' | 'warehouse' | 'movements' | 'transfers' | 'reports'>('dashboard');
  const [invFilterCat, setInvFilterCat] = useState<string>('all');
  const [invSearch, setInvSearch] = useState('');
  const [invMovFilterType, setInvMovFilterType] = useState<string>('all');
  const [invTransfers, setInvTransfers] = useState<any[]>([]);
  const [invTransferFilterStatus, setInvTransferFilterStatus] = useState<string>('all');
  const [invWarehouseFilter, setInvWarehouseFilter] = useState<string>('all');

  // Time Tracking state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeTab, setTimeTab] = useState<'tracker' | 'entries' | 'summary'>('tracker');
  const [timeFilterProject, setTimeFilterProject] = useState<string>('all');
  const [timeFilterDate, setTimeFilterDate] = useState<string>('');
  const [timeSession, setTimeSession] = useState<{ entryId: string | null; startTime: number | null; description: string; projectId: string; phaseName: string; isRunning: boolean }>({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
  const [timeTimerMs, setTimeTimerMs] = useState(0);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTab, setInvoiceTab] = useState<'list' | 'create'>('list');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<string>('all');

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Tasks view mode (list / kanban)
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');

  // Daily Log state
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [dailyLogTab, setDailyLogTab] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<Record<string, any>>({
    date: new Date().toISOString().split('T')[0],
    weather: '',
    temperature: '',
    activities: [''],
    laborCount: '',
    equipment: [''],
    materials: [''],
    observations: '',
    photos: [],
    supervisor: '',
  });

  // Admin state
  const [adminTab, setAdminTab] = useState<'timeline' | 'dashboard' | 'permissions' | 'team'>('timeline');
  const [adminWeekOffset, setAdminWeekOffset] = useState(0);
  const [adminTaskSearch, setAdminTaskSearch] = useState('');
  const [adminFilterAssignee, setAdminFilterAssignee] = useState<string>('all');
  const [adminFilterProject, setAdminFilterProject] = useState<string>('all');
  const [adminFilterPriority, setAdminFilterPriority] = useState<string>('all');
  const [adminTooltipTask, setAdminTooltipTask] = useState<any>(null);
  const [adminTooltipPos, setAdminTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [adminPermSection, setAdminPermSection] = useState<string>('roles');
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({
    'Ver Dashboard': ['Admin','Director','Arquitecto','Interventor','Contratista','Cliente','Miembro'],
    'Crear proyectos': ['Admin','Director','Arquitecto'],
    'Editar proyectos': ['Admin','Director','Arquitecto'],
    'Eliminar proyectos': ['Admin','Director'],
    'Crear tareas': ['Admin','Director','Arquitecto','Interventor','Contratista'],
    'Asignar tareas': ['Admin','Director','Arquitecto'],
    'Gestionar equipo': ['Admin','Director'],
    'Cambiar roles': ['Admin'],
    'Ver presupuestos': ['Admin','Director','Arquitecto','Interventor','Cliente'],
    'Ver inventario': ['Admin','Director','Arquitecto','Contratista','Interventor'],
    'Gestionar inventario': ['Admin','Director','Contratista'],
    'Panel Admin': ['Admin','Director'],
    'Chat general': ['Admin','Director','Arquitecto','Interventor','Contratista','Cliente','Miembro'],
    'Portal cliente': ['Admin','Director','Cliente'],
  });
  const toggleRolePerm = (permName: string, role: string) => {
    setRolePerms(prev => {
      const current = prev[permName] || [];
      const has = current.includes(role);
      const updated = { ...prev, [permName]: has ? current.filter(r => r !== role) : [...current, role] };
      // Save to localStorage
      try { localStorage.setItem('archiflow-role-perms', JSON.stringify(updated)); } catch (err) { console.error("[ArchiFlow]", err); }
      return updated;
    });
  };

  // Chat voice & files state
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [recVolume, setRecVolume] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioPreviewDuration, setAudioPreviewDuration] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [chatDropActive, setChatDropActive] = useState(false);
  const mediaRecRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const audioStreamRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const recTimerRef = useRef<any>(null);
  const recAnimRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewBlobRef = useRef<Blob | null>(null);
  const playingAudioRef = useRef<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatDmUser, setChatDmUser] = useState<string | null>(null);

  // Chat reply state
  const [chatReplyingTo, setChatReplyingTo] = useState<any>(null);

  // Chat reactions
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({});

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Chat context menu
  const [chatMenuMsg, setChatMenuMsg] = useState<string | null>(null);

  // Chat search within conversation
  const [chatMsgSearch, setChatMsgSearch] = useState('');

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // PWA Install state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Browser notifications state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    chat: true,
    tasks: true,
    meetings: true,
    approvals: true,
    inventory: true,
    projects: true,
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifSound, setNotifSound] = useState(true);
  const prevMessagesRef = useRef<any[]>([]);
  const prevTasksRef = useRef<any[]>([]);
  const prevMeetingsRef = useRef<any[]>([]);
  const prevApprovalsRef = useRef<any[]>([]);
  const prevMovementsRef = useRef<any[]>([]);
  const prevTransfersRef = useRef<any[]>([]);
  const navigateToRef = useRef<(s: string, projId?: string | null) => void>(() => {});
  const isTabVisibleRef = useRef(true);
  const prevProjectsRef = useRef<any[]>([]);
  const overdueCheckedRef = useRef<string>('');
  // Track first data load to avoid re-notifying existing items
  const firstLoadDoneRef = useRef(false);
  const [inAppNotifs, setInAppNotifs] = useState<any[]>([]);
  const [notifFilterCat, setNotifFilterCat] = useState<string>('all');
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // Init theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archiflow-theme');
      const isDark = saved ? saved === 'dark' : true;
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  // Check if running as standalone app
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // PWA Install prompt handler
  useEffect(() => {
    const isDismissed = localStorage.getItem('archiflow-install-dismissed');
    const alreadyInstalled = localStorage.getItem('archiflow-installed');
    if (alreadyInstalled) {
      setIsInstalled(true);
      return;
    }
    // Don't show banner if user already dismissed it within 7 days
    if (isDismissed) {
      const dismissedTime = parseInt(isDismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner after a small delay
      setTimeout(() => setShowInstallBanner(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      setIsInstalled(true);
      localStorage.setItem('archiflow-installed', 'true');
      showToast('ArchiFlow instalado correctamente');
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('archiflow-install-dismissed', String(Date.now()));
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('archiflow-theme', next ? 'dark' : 'light');
    showToast(next ? 'Modo nocturno activado' : 'Modo diurno activado');
  };

  // Toast helper
  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ===== NOTIFICATION ENGINE v2 =====

  // Track document visibility for dual strategy
  useEffect(() => {
    const handler = () => { isTabVisibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    isTabVisibleRef.current = document.visibilityState === 'visible';
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Vibrate on mobile
  const vibrateNotif = useCallback(() => {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  // Load saved role permissions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archiflow-role-perms');
      if (saved) setRolePerms(JSON.parse(saved));
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  // Request notification permission
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

  // Dismiss notification banner (don't show again for 3 days)
  const dismissNotifBanner = () => {
    setShowNotifBanner(false);
    localStorage.setItem('archiflow-notif-dismissed', String(Date.now()));
  };

  // Play notification sound with different tones per type
  const playNotifSound = useCallback((type?: string) => {
    if (!notifSound) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.07;
      // Different tones for different notification types
      const tones: Record<string, [number, number]> = {
        chat: [587.33, 880],
        task: [659.25, 783.99],
        meeting: [523.25, 659.25],
        approval: [698.46, 880],
        inventory: [440, 554.37],
        project: [493.88, 659.25],
        reminder: [880, 1046.5],
      };
      const [f1, f2] = tones[type || ''] || [587.33, 880];
      osc.frequency.value = f1;
      osc.start();
      setTimeout(() => { osc.frequency.value = f2; }, 100);
      setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.stop(ctx.currentTime + 0.25); }, 200);
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, [notifSound]);

  // UNIFIED NOTIFICATION: sends both in-app toast AND OS notification
  const sendNotif = useCallback((title: string, body: string, icon?: string, tag?: string, data?: any) => {
    const type = data?.type || 'info';
    const notifEntry = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      title,
      body,
      icon: icon || '🔔',
      type,
      read: false,
      timestamp: new Date(),
      screen: data?.screen || null,
      itemId: data?.itemId || null,
    };

    // ALWAYS add to history
    setNotifHistory(prev => [notifEntry, ...prev].slice(0, 100));

    // ALWAYS show in-app toast (even when tab is active)
    setInAppNotifs(prev => [...prev, { ...notifEntry, ts: Date.now() }]);
    setTimeout(() => setInAppNotifs(prev => prev.filter(n => Date.now() - n.ts < 5000)), 5500);

    // ALWAYS play sound + vibrate
    playNotifSound(type);
    vibrateNotif();

    // Send OS/Browser notification (when tab is NOT visible, or permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body,
          icon: icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: tag || `archiflow-${Date.now()}`,
          requireInteraction: false,
          silent: true, // We play our own sound
          data,
        });
        n.onclick = () => { window.focus(); n.close(); if (data?.screen) navigateToRef.current(data.screen, data.itemId); };
        setTimeout(() => n.close(), 8000);
      } catch (e: any) { console.warn('OS Notification error:', e); }
    }
  }, [playNotifSound, vibrateNotif]);

  // Keep backward compat alias
  const sendBrowserNotif = sendNotif;

  // Toggle notification pref
  const toggleNotifPref = (key: string) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Mark notification as read
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

  // Modals
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const openModal = useCallback((n: string) => setModals(p => ({ ...p, [n]: true })), []);
  const closeModal = useCallback((n: string) => { setModals(p => ({ ...p, [n]: false })); setEditingId(null); }, []);

  // Form defaults
  const [forms, setForms] = useState<Record<string, any>>({});

  // Wait for Firebase to be ready (initialized in layout.tsx)
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const fb = getFirebase();
        if (fb && fb.apps && fb.apps.length > 0) {
          clearInterval(iv);
          setReady(true);
        }
      } catch (e) {
        // Firebase not loaded yet, keep waiting
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Auth state
  useEffect(() => {
    if (!ready) return;
    const fb = getFirebase();
    const auth = fb.auth();
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      setAuthUser(user || null);
      if (user) {
        await fb.auth().currentUser;
        const db = fb.firestore();
        // Save user profile
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        const isAdminEmail = ADMIN_EMAILS.includes(user.email);
        console.log('[ArchiFlow Auth]', { email: user.email, isAdminEmail, currentRole: snap.exists ? snap.data()?.role : 'new' });
        if (!snap.exists) {
          await ref.set({ name: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || '', role: isAdminEmail ? 'Admin' : 'Miembro', createdAt: fb.firestore.FieldValue.serverTimestamp() });
        } else if (isAdminEmail) {
          // Force admin role for ADMIN_EMAILS on every login
          const current = snap.data()?.role;
          if (current !== 'Admin') {
            console.log('[ArchiFlow] Promoting', user.email, 'from', current, 'to Admin');
            await ref.update({ role: 'Admin' });
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ready]);

  // Load team
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('users').onSnapshot(snap => {
      setTeamUsers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load projects
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setProjects(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load tasks
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setTasks(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load expenses
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setExpenses(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load suppliers
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsubs: any[] = [];
    unsubs.push(db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setSuppliers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {}));

    // Companies listener
    unsubs.push(db.collection('companies').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setCompanies(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {}));

    return () => unsubs.forEach(u => u());
  }, [ready, authUser]);

  // Load chat messages
  useEffect(() => {
    if (!ready || !chatProjectId) return;
    const db = getFirebase().firestore();
    let unsub: any;
    if (chatProjectId === '__general__') {
      unsub = db.collection('generalMessages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    } else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
      const ids = [authUser.uid, chatDmUser].sort();
      const dmId = `dm_${ids[0]}_${ids[1]}`;
      unsub = db.collection('directMessages').doc(dmId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    } else {
      unsub = db.collection('projects').doc(chatProjectId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    }
    return () => { unsub(); setMessages([]); };
  }, [ready, chatProjectId, chatDmUser]);

  // Load work phases
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot(snap => {
      setWorkPhases(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => { unsub(); setWorkPhases([]); };
  }, [ready, selectedProjectId]);

  // Load project files
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setProjectFiles(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => { unsub(); setProjectFiles([]); };
  }, [ready, selectedProjectId]);

  // Load approvals
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setApprovals(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => { unsub(); setApprovals([]); };
  }, [ready, selectedProjectId]);

  // Load meetings
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot(snap => {
      setMeetings(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load gallery photos
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setGalleryPhotos(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory products
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invProducts').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setInvProducts(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory categories
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invCategories').orderBy('name', 'asc').onSnapshot(snap => {
      setInvCategories(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory movements
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invMovements').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => {
      setInvMovements(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory transfers
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invTransfers').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => {
      setInvTransfers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load time entries
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('timeEntries').orderBy('createdAt', 'desc').limit(200).onSnapshot(snap => {
      setTimeEntries(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load invoices
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invoices').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => {
      setInvoices(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load comments (all, filtered by view)
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('comments').orderBy('createdAt', 'asc').limit(300).onSnapshot(snap => {
      setComments(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load daily logs for selected project
  useEffect(() => {
    if (!ready || !authUser || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('dailyLogs').orderBy('date', 'desc').limit(100).onSnapshot(snap => {
      setDailyLogs(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => { unsub(); setDailyLogs([]); };
  }, [ready, authUser, selectedProjectId]);

  // Time tracker: live timer update
  useEffect(() => {
    if (!timeSession.isRunning || !timeSession.startTime) return;
    const interval = setInterval(() => {
      setTimeTimerMs(Date.now() - timeSession.startTime!);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeSession.isRunning, timeSession.startTime]);

  // Init default chat project (use ref to avoid set-state-in-effect)
  const chatProjectInitRef = useRef(false);
  useEffect(() => {
    if (projects.length > 0 && !chatProjectId && !chatProjectInitRef.current) {
      chatProjectInitRef.current = true;
      setChatProjectId('__general__');
    }
  }, [projects, chatProjectId]);

  // Auto-scroll chat
  useEffect(() => {
    const el = document.getElementById('chat-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ===== NOTIFICATION EFFECTS ===== */

  // Init notification permission + auto-show banner
  useEffect(() => {
    if (!('Notification' in window)) return;
    setNotifPermission(Notification.permission);
    // Restore notification prefs
    try {
      const savedPrefs = localStorage.getItem('archiflow-notif-prefs');
      if (savedPrefs) setNotifPrefs(JSON.parse(savedPrefs));
      const savedSound = localStorage.getItem('archiflow-notif-sound');
      if (savedSound !== null) setNotifSound(savedSound === 'true');
    } catch (err) { console.error("[ArchiFlow]", err); }
    // Auto-show permission banner after 5 seconds if not granted and not recently dismissed
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('archiflow-notif-dismissed');
      if (dismissed) {
        const diff = Date.now() - parseInt(dismissed);
        if (diff < 3 * 24 * 60 * 60 * 1000) return; // Don't show if dismissed within 3 days
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
    try { localStorage.setItem('archiflow-notif-prefs', JSON.stringify(notifPrefs)); } catch (err) { console.error("[ArchiFlow]", err); };
  }, [notifPrefs]);

  // After loading finishes, mark all current data as "seen" to avoid re-notifying
  useEffect(() => {
    if (!loading && !firstLoadDoneRef.current) {
      // Wait a bit for all Firestore listeners to populate
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
  }, [loading, messages, tasks, meetings, approvals, invMovements, invTransfers, projects]);

  // Calculate unread notification count
  useEffect(() => {
    setUnreadCount(notifHistory.filter(n => !n.read).length);
  }, [notifHistory]);

  // Detect new chat messages and notify
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
        sendBrowserNotif(
          `${senderName} en ${projName}`,
          `${typeLabel}${bodyText}`,
          undefined,
          `chat-${chatProjectId}`,
          { type: 'chat', screen: 'chat', itemId: chatProjectId }
        );
      }
    }
    prevMessagesRef.current = messages;
  }, [messages, notifPrefs.chat, authUser, chatProjectId, projects, sendBrowserNotif]);

  // Detect new/changed tasks assigned to me
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
      // New tasks assigned to me
      newTasks.forEach(t => {
        if (t.data.assigneeId === authUser?.uid) {
          const proj = projects.find(p => p.id === t.data.projectId);
          sendBrowserNotif(
            '📋 Nueva tarea asignada',
            `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`,
            undefined,
            `task-${t.id}`,
            { type: 'task', screen: 'tasks', itemId: t.id }
          );
        }
      });

      // Task status changes
      changedTasks.forEach(t => {
        if (t.data.assigneeId === authUser?.uid) {
          const proj = projects.find(p => p.id === t.data.projectId);
          sendBrowserNotif(
            t.data.status === 'Completado' ? '✅ Tarea completada' : t.data.status === 'En progreso' ? '🔄 Tarea en progreso' : '📝 Tarea actualizada',
            `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''} · ${t.data.status}`,
            undefined,
            `task-${t.id}`,
            { type: 'task', screen: 'tasks', itemId: t.id }
          );
        }
      });
    }
    prevTasksRef.current = tasks;
  }, [tasks, notifPrefs.tasks, authUser, projects, sendBrowserNotif]);

  // Detect new meetings
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (meetings.length === 0) { prevMeetingsRef.current = []; return; }
    const prev = prevMeetingsRef.current;
    const newMeetings = meetings.filter(m => !prev.find(p => p.id === m.id));

    if (newMeetings.length > 0 && notifPrefs.meetings) {
      newMeetings.forEach(m => {
        const proj = projects.find(p => p.id === m.data.projectId);
        sendBrowserNotif(
          '📅 Nueva reunión programada',
          `"${m.data.title}"${m.data.time ? ` a las ${m.data.time}` : ''}${m.data.date ? ` · ${fmtDate(m.data.date)}` : ''}${proj ? ` — ${proj.data.name}` : ''}`,
          undefined,
          `meeting-${m.id}`,
          { type: 'meeting', screen: 'calendar', itemId: m.id }
        );
      });
    }
    prevMeetingsRef.current = meetings;
  }, [meetings, notifPrefs.meetings, projects, sendBrowserNotif]);

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
        sendBrowserNotif(
          '📋 Nueva solicitud de aprobación',
          `"${a.data.title}" · Pendiente de revisión`,
          undefined,
          `approval-${a.id}`,
          { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId }
        );
      });
      changedApprovals.forEach(a => {
        sendBrowserNotif(
          a.data.status === 'Aprobada' ? '✅ Aprobación aceptada' : a.data.status === 'Rechazada' ? '❌ Aprobación rechazada' : '📝 Aprobación actualizada',
          `"${a.data.title}" · ${a.data.status}`,
          undefined,
          `approval-${a.id}`,
          { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId }
        );
      });
    }
    prevApprovalsRef.current = approvals;
  }, [approvals, notifPrefs.approvals, selectedProjectId, sendBrowserNotif]);

  // Detect low stock and inventory alerts (debounced - max once per 2 minutes)
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.inventory) return;
    const prevMov = prevMovementsRef.current;
    const prevTrans = prevTransfersRef.current;

    // New movements (entradas/salidas)
    const newMovs = invMovements.filter(m => !prevMov.find(p => p.id === m.id));
    newMovs.forEach(m => {
      const prod = invProducts.find(p => p.id === m.data.productId);
      sendNotif(
        m.data.type === 'Entrada' ? '📥 Entrada de inventario' : '📤 Salida de inventario',
        `${prod?.data?.name || 'Producto'} · ${m.data.quantity} ${prod?.data?.unit || 'uds'}${m.data.reason ? ` — ${m.data.reason}` : ''}`,
        undefined,
        `mov-${m.id}`,
        { type: 'inventory', screen: 'inventory' }
      );
    });

    // New transfers
    const newTrans = invTransfers.filter(t => !prevTrans.find(p => p.id === t.id));
    newTrans.forEach(t => {
      sendNotif(
        '🚚 Nueva transferencia',
        `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse} (${t.data.quantity})`,
        undefined,
        `transfer-${t.id}`,
        { type: 'inventory', screen: 'inventory' }
      );
    });

    // Transfer status changes
    const changedTrans = invTransfers.filter(t => {
      const p = prevTrans.find(pp => pp.id === t.id);
      return p && p.data.status !== t.data.status;
    });
    changedTrans.forEach(t => {
      const statusEmoji = t.data.status === 'Completada' ? '✅' : t.data.status === 'En tránsito' ? '🚛' : t.data.status === 'Cancelada' ? '❌' : '📦';
      sendNotif(
        `${statusEmoji} Transferencia ${t.data.status.toLowerCase()}`,
        `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse}`,
        undefined,
        `transfer-${t.id}`,
        { type: 'inventory', screen: 'inventory' }
      );
    });

    prevMovementsRef.current = invMovements;
    prevTransfersRef.current = invTransfers;
  }, [invMovements, invTransfers, invProducts, notifPrefs.inventory, sendNotif]);

  // Meeting reminder check (every 60 seconds)
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
          // Notify 15 minutes before and 5 minutes before
          if (diff === 15 || diff === 5) {
            const proj = projects.find(p => p.id === m.data.projectId);
            sendBrowserNotif(
              `⏰ Reunión en ${diff} minutos`,
              `"${m.data.title}" a las ${m.data.time}${proj ? ` — ${proj.data.name}` : ''}`,
              undefined,
              `reminder-${m.id}-${diff}`,
              { type: 'meeting', screen: 'calendar' }
            );
          }
        }
      });
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [meetings, notifPrefs.meetings, authUser, projects, sendBrowserNotif]);

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
        sendNotif(
          `${statusEmoji} Proyecto actualizado`,
          `"${p.data.name}" cambió a: ${p.data.status}`,
          undefined,
          `proj-${p.id}`,
          { type: 'project', screen: 'projects', itemId: p.id }
        );
      });
    }
    prevProjectsRef.current = projects;
  }, [projects, notifPrefs.projects, sendNotif]);

  // Overdue tasks reminder (check every 30 min)
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.tasks || !authUser) return;
    const check = () => {
      const today = new Date().toISOString().split('T')[0];
      const checkKey = `overdue-${today}`;
      if (overdueCheckedRef.current === checkKey) return;
      overdueCheckedRef.current = checkKey;

      const myOverdue = tasks.filter(t =>
        t.data.assigneeId === authUser?.uid &&
        t.data.status !== 'Completado' &&
        t.data.dueDate &&
        t.data.dueDate < today
      );
      if (myOverdue.length > 0) {
        sendNotif(
          `⚠️ ${myOverdue.length} tarea${myOverdue.length > 1 ? 's' : ''} vencida${myOverdue.length > 1 ? 's' : ''}`,
          myOverdue.slice(0, 3).map(t => `"${t.data.title}"`).join(', '),
          undefined,
          'overdue-daily',
          { type: 'reminder', screen: 'tasks' }
        );
      }
    };
    check();
    const iv = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(iv);
  }, [tasks, notifPrefs.tasks, authUser, sendNotif]);

  // Low stock periodic check (every 10 min)
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    if (!notifPrefs.inventory) return;
    let lastLowStockCount = -1;
    const check = () => {
      const lowStock = invProducts.filter(p => {
        const stock = p.data.warehouseStock ? Object.values(p.data.warehouseStock).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock > 0 && stock <= (p.data.minStock || 5);
      });
      const outOfStock = invProducts.filter(p => {
        const stock = p.data.warehouseStock ? Object.values(p.data.warehouseStock).reduce((a: number, b: number) => a + b, 0) : p.data.stock;
        return stock <= 0;
      });
      const total = lowStock.length + outOfStock.length;
      if (total > 0 && total !== lastLowStockCount) {
        lastLowStockCount = total;
        sendNotif(
          outOfStock.length > 0 ? '🚨 Alerta de inventario' : '⚠️ Stock bajo',
          outOfStock.length > 0
            ? `${outOfStock.length} sin stock${lowStock.length > 0 ? `, ${lowStock.length} bajo mínimo` : ''}: ${outOfStock.map(p => p.data.name).slice(0,3).join(', ')}`
            : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} bajo mínimo: ${lowStock.map(p => p.data.name).slice(0,3).join(', ')}`,
          undefined,
          'inv-lowstock-check',
          { type: 'inventory', screen: 'inventory' }
        );
      }
    };
    // Initial check after 10 seconds, then every 10 minutes
    const initTimer = setTimeout(check, 10000);
    const iv = setInterval(check, 10 * 60 * 1000);
    return () => { clearTimeout(initTimer); clearInterval(iv); };
  }, [invProducts, notifPrefs.inventory, sendNotif]);

  /* ===== FIREBASE ACTIONS ===== */
  const doLogin = async () => {
    const email = forms.loginEmail || '', pass = forms.loginPass || '';
    if (!email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try { await getFirebase().auth().signInWithEmailAndPassword(email, pass); } catch (e: any) { showToast(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos' : e.code === 'auth/user-not-found' ? 'No existe cuenta con ese correo' : 'Error al iniciar sesión', 'error'); }
  };

  const doRegister = async () => {
    const name = forms.regName || '', email = forms.regEmail || '', pass = forms.regPass || '';
    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      const cred = await getFirebase().auth().createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      const db = getFirebase().firestore();
      await db.collection('users').doc(cred.user.uid).set({ name, email, photoURL: '', role: 'Miembro', createdAt: getFirebase().firestore.FieldValue.serverTimestamp() });
    } catch (e: any) { showToast(e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado' : e.code === 'auth/weak-password' ? 'Mínimo 6 caracteres' : 'Error al registrar', 'error'); }
  };

  const doGoogleLogin = async () => {
    try { await getFirebase().auth().signInWithPopup(new (getFirebase().auth).GoogleAuthProvider()); } catch (e: any) { showToast('Error al iniciar con Google', 'error'); }
  };

  const doMicrosoftLogin = async () => {
    try {
      const provider = new (getFirebase().auth).OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await getFirebase().auth().signInWithPopup(provider);
      // Get OAuth access token for Microsoft Graph
      const credential = result.credential as any;
      if (credential?.accessToken) {
        setMsAccessToken(credential.accessToken);
        setMsConnected(true);
        setMsRefreshToken(credential.refreshToken || null);
        setMsTokenExpiry(Date.now() + 55 * 60 * 1000); // 55 min (5 min buffer)
        localStorage.setItem('msAccessToken', credential.accessToken);
        localStorage.setItem('msConnected', 'true');
        if (credential.refreshToken) localStorage.setItem('msRefreshToken', credential.refreshToken);
        showToast('Conectado con Microsoft');
      }
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error('[ArchiFlow] Microsoft login error:', e.code, e.message, e);
        const msgs: Record<string, string> = {
          'auth/popup-blocked': 'Ventana bloqueada — permite ventanas emergentes para este sitio',
          'auth/popup-closed-by-user': '',
          'auth/cancelled-popup-request': 'Se cerró el popup',
          'auth/invalid-credential': 'Credenciales de Microsoft inválidas',
          'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console',
          'auth/internal-error': 'Error interno — verifica la configuración del proveedor Microsoft en Firebase Console',
        };
        const msg = msgs[e.code] || `${e.code || 'Error'}: ${e.message || 'Verifica Firebase Console > Authentication > Sign-in method > Microsoft'}`;
        if (msg) showToast(`Microsoft: ${msg}`, 'error');
      }
    }
  };

  const disconnectMicrosoft = () => {
    setMsAccessToken(null);
    setMsConnected(false);
    setMsRefreshToken(null);
    setMsTokenExpiry(0);
    setOneDriveFiles([]);
    setOdProjectFolder(null);
    setOdBreadcrumbs([]);
    setOdCurrentFolder('root');
    setOdSearchQuery('');
    setOdSearchResults([]);
    localStorage.removeItem('msAccessToken');
    localStorage.removeItem('msConnected');
    localStorage.removeItem('msRefreshToken');
    showToast('Microsoft desconectado');
  };

  // Restore Microsoft session
  useEffect(() => {
    const saved = localStorage.getItem('msConnected');
    const token = localStorage.getItem('msAccessToken');
    const refreshToken = localStorage.getItem('msRefreshToken');
    if (saved === 'true' && token) {
      setMsConnected(true);
      setMsAccessToken(token);
      if (refreshToken) setMsRefreshToken(refreshToken);
      setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
    }
  }, []);

  // OneDrive API helpers
  const refreshMsToken = useCallback(async () => {
    if (!msRefreshToken) return null;
    try {
      const res = await fetch('/api/onedrive/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: msRefreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          setMsAccessToken(data.accessToken);
          sessionStorage.setItem('archiflow-ms-token', data.accessToken);
          localStorage.setItem('msAccessToken', data.accessToken);
          setMsTokenExpiry(Date.now() + 55 * 60 * 1000);
          if (data.refreshToken) {
            setMsRefreshToken(data.refreshToken);
            localStorage.setItem('msRefreshToken', data.refreshToken);
          }
          return data.accessToken;
        }
      }
    } catch (e) {
      console.error('Error refreshing MS token:', e);
    }
    return null;
  }, [msRefreshToken]);

  // Auto-refresh token effect
  useEffect(() => {
    if (!msConnected || !msRefreshToken) return;
    const interval = setInterval(async () => {
      if (Date.now() >= msTokenExpiry - 60000) {
        await refreshMsToken();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [msConnected, msRefreshToken, msTokenExpiry, refreshMsToken]);

  const graphApiGet = useCallback(async (endpoint: string, useToken?: string) => {
    const token = useToken || msAccessToken;
    if (!token) return null;
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 && !useToken) {
        const newToken = await refreshMsToken();
        if (newToken) return graphApiGet(endpoint, newToken);
        disconnectMicrosoft();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }, [msAccessToken, refreshMsToken]);

  const ensureProjectFolder = async (projectName: string) => {
    if (!msAccessToken) return null;
    setMsLoading(true);
    try {
      // Check if ArchiFlow root folder exists
      const root = await graphApiGet('/me/drive/root/children');
      if (!root) { setMsLoading(false); return null; }
      const archiFolder = root.value?.find((f: any) => f.name === 'ArchiFlow' && f.folder);
      let archiFolderId: string;
      if (archiFolder) {
        archiFolderId = archiFolder.id;
      } else {
        const created = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'ArchiFlow', folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
        });
        if (!created.ok) { setMsLoading(false); return null; }
        const createdData = await created.json();
        archiFolderId = createdData.id;
      }
      // Check if project subfolder exists
      const projChildren = await graphApiGet(`/me/drive/items/${archiFolderId}/children`);
      if (!projChildren) { setMsLoading(false); return null; }
      const projFolder = projChildren.value?.find((f: any) => f.name === projectName && f.folder);
      let projFolderId: string;
      if (projFolder) {
        projFolderId = projFolder.id;
      } else {
        const pCreated = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${archiFolderId}/children`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
        });
        if (!pCreated.ok) { setMsLoading(false); return null; }
        const pCreatedData = await pCreated.json();
        projFolderId = pCreatedData.id;
      }
      setOdProjectFolder(projFolderId);
      setMsLoading(false);
      return projFolderId;
    } catch { setMsLoading(false); return null; }
  };

  const loadOneDriveFiles = async (folderId: string) => {
    if (!msAccessToken) return;
    setMsLoading(true);
    try {
      const data = await graphApiGet(`/me/drive/items/${folderId}/children?$top=50&orderby=name`);
      if (data?.value) {
        setOneDriveFiles(data.value);
      }
    } catch { showToast('Error al cargar archivos', 'error'); }
    setMsLoading(false);
  };

  const uploadToOneDrive = async (file: File, folderId: string) => {
    if (!msAccessToken) return;
    setMsLoading(true);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(file.name)}:/content`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${msAccessToken}` },
        body: file
      });
      if (res.ok) {
        showToast('Archivo subido a OneDrive');
        loadOneDriveFiles(folderId);
      } else {
        showToast('Error al subir archivo', 'error');
      }
    } catch { showToast('Error al subir', 'error'); }
    setMsLoading(false);
  };

  const deleteFromOneDrive = async (fileId: string, folderId: string) => {
    if (!confirm('¿Eliminar archivo de OneDrive?')) return;
    setMsLoading(true);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${msAccessToken}` }
      });
      if (res.ok) { showToast('Eliminado de OneDrive'); loadOneDriveFiles(folderId); }
      else { showToast('Error al eliminar', 'error'); }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
    setMsLoading(false);
  };

  const openOneDriveForProject = async (projectName: string) => {
    const folderId = await ensureProjectFolder(projectName);
    if (folderId) {
      await loadOneDriveFiles(folderId);
      setOdCurrentFolder(folderId);
      setOdBreadcrumbs([{ id: folderId, name: projectName }]);
      setShowOneDrive(true);
      setOdTab('files');
      setOdSearchQuery('');
      setOdSearchResults([]);
    } else {
      showToast('No se pudo crear la carpeta del proyecto', 'error');
    }
  };

  // OneDrive helper functions
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date().getTime();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString('es');
  };

  const getFileIcon = (mimeType: string, name?: string) => {
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('dwg') || mimeType.includes('dxf')) return '📐';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('video')) return '🎬';
    if (name?.endsWith('.pdf')) return '📄';
    if (name?.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|heic)$/i)) return '🖼️';
    if (name?.match(/\.(doc|docx)$/i)) return '📝';
    if (name?.match(/\.(xls|xlsx)$/i)) return '📊';
    if (name?.match(/\.(dwg|dxf)$/i)) return '📐';
    if (name?.match(/\.(zip|rar)$/i)) return '📦';
    if (name?.match(/\.(mp4|mov|avi|mkv)$/i)) return '🎬';
    return '📎';
  };

  const navigateToFolder = async (folderId: string, breadcrumbIndex?: number) => {
    setOdCurrentFolder(folderId);
    if (breadcrumbIndex !== undefined) {
      setOdBreadcrumbs(prev => prev.slice(0, breadcrumbIndex + 1));
    }
    await loadOneDriveFiles(folderId);
  };

  const uploadFileWithProgress = async (file: File) => {
    setOdUploading(true);
    setOdUploadProgress(0);
    setOdUploadFile(file.name);
    try {
      if (file.size < 4 * 1024 * 1024) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', odCurrentFolder);
        formData.append('projectId', selectedProjectId || '');
        setOdUploadProgress(50);
        const res = await fetch('/api/onedrive/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${msAccessToken}` },
          body: formData
        });
        setOdUploadProgress(100);
        if (res.ok) {
          showToast('Archivo subido a OneDrive');
          await loadOneDriveFiles(odCurrentFolder);
        } else {
          showToast('Error al subir archivo', 'error');
        }
      } else {
        const sessionRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/items/' + odCurrentFolder + ':/' + encodeURIComponent(file.name) + '/createUploadSession', {
          method: 'POST',
          headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } })
        });
        if (!sessionRes.ok) throw new Error('No se pudo crear la sesión de carga');
        const session = await sessionRes.json();
        const uploadUrl = session.uploadUrl;
        const chunkSize = 5 * 1024 * 1024;
        let offset = 0;
        while (offset < file.size) {
          const chunk = file.slice(offset, offset + chunkSize);
          const chunkRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': `bytes ${offset}-${Math.min(offset + chunkSize - 1, file.size - 1)}/${file.size}`,
              'Content-Length': String(chunk.size)
            },
            body: chunk
          });
          if (!chunkRes.ok) throw new Error('Error en la carga del fragmento');
          offset += chunkSize;
          setOdUploadProgress(Math.round((offset / file.size) * 100));
        }
        showToast('Archivo subido a OneDrive');
        await loadOneDriveFiles(odCurrentFolder);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error al subir archivo: ' + (err as Error).message, 'error');
    } finally {
      setTimeout(() => { setOdUploading(false); setOdUploadProgress(0); setOdUploadFile(''); }, 500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !odCurrentFolder) return;
    await uploadFileWithProgress(file);
    e.target.value = '';
  };

  const handleDroppedFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      await uploadFileWithProgress(files[i]);
    }
  };

  const renameOneDriveFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) { setOdRenaming(null); return; }
    try {
      const res = await fetch(`/api/onedrive/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        showToast('Archivo renombrado');
        setOdRenaming(null);
        await loadOneDriveFiles(odCurrentFolder);
      } else {
        showToast('Error al renombrar', 'error');
      }
    } catch { showToast('Error al renombrar', 'error'); }
  };

  const downloadOneDriveFile = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/onedrive/files/${fileId}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      } else {
        showToast('Error al descargar', 'error');
      }
    } catch { showToast('Error al descargar', 'error'); }
  };

  const searchOneDriveFiles = useCallback(async (query: string) => {
    if (!query.trim()) { setOdSearchResults([]); return; }
    setOdSearching(true);
    try {
      const res = await fetch(`/api/onedrive/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOdSearchResults(data.items || data.value || []);
      }
    } catch (e) { console.error(e); }
    setOdSearching(false);
  }, [msAccessToken]);

  const loadGalleryPhotos = useCallback(async (projectId: string) => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`/api/onedrive/gallery/${projectId}`, {
        headers: { 'Authorization': `Bearer ${msAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOdGalleryPhotos(data.items || data.photos || []);
      }
    } catch (e) { console.error(e); }
    setGalleryLoading(false);
  }, [msAccessToken]);

  // Change user role (admin only)
  const updateUserRole = async (uid: string, newRole: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ role: newRole });
      showToast(`Rol actualizado a ${newRole}`);
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al cambiar rol', 'error'); }
  };

  const updateUserCompany = async (uid: string, companyId: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ companyId: companyId || null });
      showToast(companyId ? 'Empresa asignada' : 'Empresa removida');
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al asignar empresa', 'error'); }
  };

  // Get the current user's company ID
  const getMyCompanyId = () => {
    if (!authUser) return null;
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.companyId || null;
  };

  // Get current user's role
  const getMyRole = () => {
    if (!authUser) return 'Miembro';
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.role || 'Miembro';
  };

  // Filter projects based on company (Admin/Director see all, others see their company only)
  const visibleProjects = () => {
    const myRole = getMyRole();
    const myComp = getMyCompanyId();
    if (myRole === 'Admin' || myRole === 'Director') {
      return projects; // Admin y Director ven todo
    }
    if (myComp) {
      return projects.filter(p => !p.data.companyId || p.data.companyId === myComp);
    }
    return projects; // Si no tiene empresa, ve todo
  };

  const doLogout = () => { if (!confirm('¿Cerrar sesión?')) return; getFirebase().auth().signOut(); };

  const getUserName = (uid: string) => { if (!uid) return 'Sin asignar'; const u = teamUsers.find(x => x.id === uid); return u ? u.data.name : uid.substring(0, 8) + '...'; };

  const saveProject = async () => {
    const name = forms.projName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const ts = getFirebase().firestore.FieldValue.serverTimestamp();
    const data = { name, status: forms.projStatus || 'Concepto', client: forms.projClient || '', location: forms.projLocation || '', budget: Number(forms.projBudget) || 0, description: forms.projDesc || '', startDate: forms.projStart || '', endDate: forms.projEnd || '', companyId: forms.projCompany || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado'); }
      else { await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 }); showToast('Proyecto creado'); }
      closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto', projCompany: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteProject = async (id: string) => { if (!confirm('¿Eliminar este proyecto?')) return; try { await getFirebase().firestore().collection('projects').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); } };

  const openEditProject = (p: Project) => {
    setEditingId(p.id);
    setForms(f => ({ ...f, projName: p.data.name, projStatus: p.data.status, projClient: p.data.client, projLocation: p.data.location, projBudget: p.data.budget, projDesc: p.data.description, projStart: p.data.startDate, projEnd: p.data.endDate, projCompany: p.data.companyId || '' }));
    openModal('project');
  };

  const saveTask = async () => {
    if (isSavingTask) return;
    const title = forms.taskTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    setIsSavingTask(true);
    const db = getFirebase().firestore();
    const ts = getFirebase().firestore.FieldValue.serverTimestamp();
    const data = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: forms.taskAssignee || '', priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('tasks').doc(editingId).update(data); showToast('Tarea actualizada'); }
      else {
        await db.collection('tasks').add({ ...data, createdAt: ts, createdBy: authUser?.uid });
        showToast('Tarea creada');
        // Notificar por WhatsApp al asignado
        if (forms.taskAssignee && forms.taskProject) {
          const proj = projects.find(p => p.id === forms.taskProject);
          const projName = proj?.data.name || 'Proyecto';
          notifyWhatsApp.taskAssigned(forms.taskAssignee, title, projName, forms.taskPriority || 'Media', forms.taskDue || undefined).catch(() => {});
        }
      }
      closeModal('task'); setEditingId(null); setForms(p => ({ ...p, taskTitle: '', taskProject: '', taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0] }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
    finally { setIsSavingTask(false); }
  };

  const openEditTask = (t: Task) => {
    setEditingId(t.id);
    setForms(f => ({ ...f, taskTitle: t.data.title, taskDescription: t.data.description || '', taskProject: t.data.projectId || '', taskAssignee: t.data.assigneeId || '', taskPriority: t.data.priority || 'Media', taskStatus: t.data.status || 'Por hacer', taskDue: t.data.dueDate || '' }));
    openModal('task');
  };

  const updateProjectProgress = async (val: number) => {
    if (!selectedProjectId) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId).update({ progress: val, updatedAt: getFirebase().firestore.FieldValue.serverTimestamp() }); showToast(`Progreso: ${val}%`); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const updateUserName = async (newName: string) => {
    if (!newName || !authUser) return;
    try { await authUser.updateProfile({ displayName: newName }); await getFirebase().firestore().collection('users').doc(authUser.uid).update({ name: newName }); showToast('Nombre actualizado'); setForms(p => ({ ...p, editingName: false })); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const toggleTask = async (id: string, status: string) => {
    const ns = status === 'Completado' ? 'Por hacer' : 'Completado';
    try { await getFirebase().firestore().collection('tasks').doc(id).update({ status: ns, updatedAt: getFirebase().firestore.FieldValue.serverTimestamp() }); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const deleteTask = async (id: string) => { if (!confirm('¿Eliminar tarea?')) return; try { await getFirebase().firestore().collection('tasks').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const sendMessage = async (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => {
    const text = textOverride || forms.chatInput || '';
    if (!text && !audioData && !fileData) return;
    if (!chatProjectId) return;
    try {
      const db = getFirebase().firestore();
      const msgData: any = { text, uid: authUser?.uid, userName: authUser?.displayName || authUser?.email.split('@')[0], createdAt: getFirebase().firestore.FieldValue.serverTimestamp() };
      if (audioData) { msgData.audioData = audioData; msgData.audioDuration = audioDur || 0; msgData.type = 'AUDIO'; }
      if (fileData) { msgData.fileData = fileData.data; msgData.fileName = fileData.name; msgData.fileType = fileData.type; msgData.fileSize = fileData.size; msgData.type = fileData.type.startsWith('image/') ? 'IMAGE' : 'FILE'; }
      if (!msgData.type) msgData.type = 'TEXT';
      // Support reply-to
      if (chatReplyingTo) {
        msgData.replyTo = { id: chatReplyingTo.id, text: chatReplyingTo.text, userName: chatReplyingTo.userName, uid: chatReplyingTo.uid };
      }
      if (chatProjectId === '__general__') { await db.collection('generalMessages').add(msgData); }
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        const dmId = `dm_${ids[0]}_${ids[1]}`;
        msgData.recipientId = chatDmUser;
        await db.collection('directMessages').doc(dmId).collection('messages').add(msgData);
      }
      else { await db.collection('projects').doc(chatProjectId).collection('messages').add(msgData); }
      setForms(p => ({ ...p, chatInput: '' }));
      setChatReplyingTo(null);
    } catch { showToast('Error al enviar', 'error'); }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecRef.current = recorder;
      setIsRecording(true);
      let sec = 0;
      recTimerRef.current = setInterval(() => setRecDuration(++sec), 1000);
      const monitorVol = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        setRecVolume(Math.min(Math.sqrt(sum / data.length) * 4, 1));
        recAnimRef.current = requestAnimationFrame(monitorVol);
      };
      monitorVol();
    } catch { showToast('No se pudo acceder al microfono', 'error'); }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecRef.current;
      if (!recorder) { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current);
        setIsRecording(false); setRecDuration(0); setRecVolume(0);
        resolve(blob);
      };
      recorder.stop();
    });
  };

  const cancelRecording = () => {
    mediaRecRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current);
    setIsRecording(false); setRecDuration(0); setRecVolume(0);
  };

  const handleMicButton = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setAudioPreviewUrl(url);
      setAudioPreviewDuration(recDuration);
      audioPreviewBlobRef.current = blob;
    } else if (audioPreviewUrl) {
      setAudioPreviewUrl(null); setAudioPreviewDuration(0);
      audioPreviewBlobRef.current = null;
    } else {
      await startRecording();
    }
  };

  const sendVoiceNote = async () => {
    if (!audioPreviewBlobRef.current) return;
    showToast('Enviando nota de voz...');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await sendMessage('', base64, audioPreviewDuration);
      setAudioPreviewUrl(null); setAudioPreviewDuration(0);
      audioPreviewBlobRef.current = null;
    };
    reader.readAsDataURL(audioPreviewBlobRef.current);
  };

  // File handling
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 25 * 1024 * 1024) { showToast(`${file.name} excede 25MB`, 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const newFile = { id: Date.now() + '-' + Math.random().toString(36).slice(2,6), name: file.name, type: file.type, size: file.size, data: reader.result as string, preview: file.type.startsWith('image/') ? reader.result as string : null };
        setPendingFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingFile = (id: string) => { setPendingFiles(prev => prev.filter(f => f.id !== id)); };

  const sendPendingFiles = async () => {
    for (const f of pendingFiles) {
      await sendMessage('', undefined, undefined, { name: f.name, type: f.type, size: f.size, data: f.data });
    }
    setPendingFiles([]);
  };

  const sendAll = async () => {
    setShowEmojiPicker(false);
    if (audioPreviewBlobRef.current) { await sendVoiceNote(); return; }
    if (pendingFiles.length > 0) { await sendPendingFiles(); }
    if (forms.chatInput?.trim()) { await sendMessage(); }
  };

  // Toggle reaction on a message
  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!authUser) return;
    const uid = authUser.uid;
    setMessageReactions(prev => {
      const msgReactions = { ...prev[msgId] };
      const users = msgReactions[emoji] || [];
      if (users.includes(uid)) {
        msgReactions[emoji] = users.filter((u: string) => u !== uid);
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = [...users, uid];
      }
      return { ...prev, [msgId]: msgReactions };
    });
    try {
      const db = getFirebase().firestore();
      let collection: string;
      if (chatProjectId === '__general__') collection = 'generalMessages';
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        collection = `directMessages/dm_${ids[0]}_${ids[1]}/messages`;
      } else {
        collection = `projects/${chatProjectId}/messages`;
      }
      const reactionRef = db.collection(collection).doc(msgId).collection('reactions').doc(emoji);
      const snap = await reactionRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data.users.includes(uid)) {
          if (data.users.length <= 1) await reactionRef.delete();
          else await reactionRef.update({ users: data.users.filter((u: string) => u !== uid) });
        } else {
          await reactionRef.update({ users: [...data.users, uid] });
        }
      } else {
        await reactionRef.set({ users: [uid] });
      }
    } catch (err) { console.error('[ArchiFlow] Reaction error:', err); }
  };

  // Delete a chat message (only own messages)
  const deleteMessage = async (msgId: string) => {
    try {
      const db = getFirebase().firestore();
      let collection: string;
      if (chatProjectId === '__general__') collection = 'generalMessages';
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        collection = `directMessages/dm_${ids[0]}_${ids[1]}/messages`;
      } else {
        collection = `projects/${chatProjectId}/messages`;
      }
      await db.collection(collection).doc(msgId).delete();
      setChatMenuMsg(null);
      showToast('Mensaje eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  // Copy message text to clipboard
  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text);
    setChatMenuMsg(null);
    showToast('Texto copiado');
  };

  // Audio player
  const toggleAudioPlay = (msgId: string) => {
    const audioEl = document.getElementById('audio-' + msgId) as HTMLAudioElement;
    if (!audioEl) return;
    if (playingAudio === msgId) {
      audioEl.pause(); setPlayingAudio(null); setAudioProgress(0);
    } else {
      if (playingAudio) { const prev = document.getElementById('audio-' + playingAudio) as HTMLAudioElement; if (prev) prev.pause(); }
      audioEl.play(); setPlayingAudio(msgId);
      const onTime = () => { if (audioEl.duration) { setAudioProgress((audioEl.currentTime / audioEl.duration) * 100); setAudioCurrentTime(audioEl.currentTime); } };
      const onEnd = () => { setPlayingAudio(null); setAudioProgress(0); };
      audioEl.addEventListener('timeupdate', onTime);
      audioEl.addEventListener('ended', onEnd);
      audioEl.addEventListener('pause', onEnd);
    }
  };

  const fmtRecTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`; };
  const fileIcon = (type: string) => { if (type.startsWith('image/')) return '🖼️'; if (type.includes('pdf')) return '📄'; if (type.startsWith('audio/')) return '🎵'; if (type.startsWith('video/')) return '🎬'; if (type.includes('word') || type.includes('document')) return '📝'; if (type.includes('sheet') || type.includes('excel')) return '📊'; if (type.includes('zip') || type.includes('rar')) return '📦'; return '📎'; };
  const fmtFileSize = fmtSize;

  const saveExpense = async () => {
    const concept = forms.expConcept || '';
    if (!concept) { showToast('El concepto es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const amount = Number(forms.expAmount) || 0;
    const data = { concept, projectId: forms.expProject || '', category: forms.expCategory || 'Materiales', amount, date: forms.expDate || '', createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try {
      await db.collection('expenses').add(data);
      showToast('Gasto registrado');
      closeModal('expense'); setForms(p => ({ ...p, expConcept: '', expAmount: '', expDate: new Date().toISOString().split('T')[0] }));
      // Notificar por WhatsApp al creador
      if (forms.expProject) {
        const proj = projects.find(p => p.id === forms.expProject);
        const projName = proj?.data.name || 'Proyecto';
        notifyWhatsApp.expenseCreated(authUser?.uid || '', concept, amount, projName, forms.expCategory || undefined).catch(() => {});
      }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const deleteExpense = async (id: string) => { if (!confirm('¿Eliminar gasto?')) return; try { await getFirebase().firestore().collection('expenses').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const saveSupplier = async () => {
    const name = forms.supName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado'); }
      else { await db.collection('suppliers').add(data); showToast('Proveedor creado'); }
      closeModal('supplier'); setForms(p => ({ ...p, supName: '', supCategory: '', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const deleteSupplier = async (id: string) => { if (!confirm('¿Eliminar proveedor?')) return; try { await getFirebase().firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // Company CRUD
  const saveCompany = async () => {
    const name = forms.compName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const data = { name, nit: forms.compNit || '', legalName: forms.compLegal || '', address: forms.compAddress || '', phone: forms.compPhone || '', email: forms.compEmail || '', createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
      if (editingId) { await db.collection('companies').doc(editingId).update(data); showToast('Empresa actualizada'); }
      else { await db.collection('companies').add(data); showToast('Empresa creada'); }
      closeModal('company'); setEditingId(null);
    } catch { showToast('Error al guardar', 'error'); }
  };

  const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file || !selectedProjectId) return;
    if (file.size > 10 * 1024 * 1024) { showToast('El archivo no puede superar 10 MB', 'error'); return; }
    showToast('Subiendo archivo...');
    try {
      const base64 = await fileToBase64(file);
      const db = getFirebase().firestore();
      await db.collection('projects').doc(selectedProjectId).collection('files').add({ name: file.name, type: file.type, size: file.size, data: base64, createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), uploadedBy: authUser?.uid });
      showToast('Archivo subido');
    } catch (err: any) { showToast('Error al subir: ' + (err.message || ''), 'error'); }
    e.target.value = '';
  };

  const deleteFile = async (file: ProjectFile) => {
    if (!confirm('¿Eliminar archivo?')) return;
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId).collection('files').doc(file.id).delete();
      showToast('Archivo eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const initDefaultPhases = async () => {
    if (workPhases.length > 0) return;
    const db = getFirebase().firestore();
    const ts = getFirebase().firestore.FieldValue.serverTimestamp();
    for (let i = 0; i < DEFAULT_PHASES.length; i++) {
      await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name: DEFAULT_PHASES[i], description: '', status: 'Pendiente', order: i, startDate: '', endDate: '', createdAt: ts });
    }
    showToast('Fases inicializadas');
  };

  const updatePhaseStatus = async (phaseId: string, status: string) => {
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ status }); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const saveApproval = async () => {
    const title = forms.appTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').add({ title, description: forms.appDesc || '', status: 'Pendiente', createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid });
      showToast('Solicitud creada'); closeModal('approval'); setForms(p => ({ ...p, appTitle: '', appDesc: '' }));
      // Notificar por WhatsApp (broadcast a admins)
      const projName = currentProject?.data.name || 'Proyecto';
      notifyWhatsApp.approvalPending(authUser?.uid || '', title, projName, authUser?.displayName || authUser?.email || 'Usuario').catch(() => {});
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const updateApproval = async (id: string, status: string) => {
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).update({ status });
      showToast('Estado actualizado');
      // Notificar por WhatsApp al creador de la aprobación
      const approval = approvals.find(a => a.id === id);
      if (approval?.data?.createdBy) {
        const projName = currentProject?.data.name || 'Proyecto';
        notifyWhatsApp.approvalResolved(approval.data.createdBy, approval.data.title, status, authUser?.displayName || undefined).catch(() => {});
      }
    } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const deleteApproval = async (id: string) => { if (!confirm('¿Eliminar aprobación?')) return; try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // Daily Log CRUD
  const saveDailyLog = async () => {
    if (!selectedProjectId) { showToast('Selecciona un proyecto', 'error'); return; }
    const lf = logForm;
    if (!lf.date) { showToast('La fecha es obligatoria', 'error'); return; }
    const db = getFirebase().firestore();
    const data: Record<string, any> = {
      projectId: selectedProjectId,
      date: lf.date,
      weather: lf.weather || '',
      temperature: Number(lf.temperature) || 0,
      activities: (lf.activities || ['']).filter((a: string) => a.trim()),
      laborCount: Number(lf.laborCount) || 0,
      equipment: (lf.equipment || ['']).filter((e: string) => e.trim()),
      materials: (lf.materials || ['']).filter((m: string) => m.trim()),
      observations: lf.observations || '',
      photos: lf.photos || [],
      supervisor: lf.supervisor || authUser?.displayName || authUser?.email?.split('@')[0] || '',
      createdBy: authUser?.uid,
      updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
    };
    try {
      if (selectedLogId) {
        await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(selectedLogId).update(data);
        showToast('Bitácora actualizada');
      } else {
        data.createdAt = getFirebase().firestore.FieldValue.serverTimestamp();
        await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').add(data);
        showToast('Bitácora creada');
      }
      setDailyLogTab('list');
      setSelectedLogId(null);
      resetLogForm();
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al guardar', 'error'); }
  };

  const deleteDailyLog = async (logId: string) => {
    if (!selectedProjectId) return;
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(logId).delete();
      showToast('Bitácora eliminada');
      if (selectedLogId === logId) {
        setDailyLogTab('list');
        setSelectedLogId(null);
      }
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const openEditLog = (log: any) => {
    setSelectedLogId(log.id);
    setLogForm({
      date: log.data.date || '',
      weather: log.data.weather || '',
      temperature: log.data.temperature || '',
      activities: log.data.activities?.length > 0 ? log.data.activities : [''],
      laborCount: log.data.laborCount || '',
      equipment: log.data.equipment?.length > 0 ? log.data.equipment : [''],
      materials: log.data.materials?.length > 0 ? log.data.materials : [''],
      observations: log.data.observations || '',
      photos: log.data.photos || [],
      supervisor: log.data.supervisor || '',
    });
    setDailyLogTab('create');
  };

  const resetLogForm = () => {
    setLogForm({
      date: new Date().toISOString().split('T')[0],
      weather: '',
      temperature: '',
      activities: [''],
      laborCount: '',
      equipment: [''],
      materials: [''],
      observations: '',
      photos: [],
      supervisor: '',
    });
  };

  // ===== INVENTORY ACTIONS =====
  const getWarehouseStock = (product: any, warehouse: string) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') {
      return Number(product.data.warehouseStock[warehouse]) || 0;
    }
    // Backward compat: if no warehouseStock map, use single warehouse field
    return product.data.warehouse === warehouse ? (Number(product.data.stock) || 0) : 0;
  };

  const getTotalStock = (product: any) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') {
      return Object.values(product.data.warehouseStock).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    }
    return Number(product.data.stock) || 0;
  };

  const buildWarehouseStock = (product: any) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') {
      const ws = { ...product.data.warehouseStock };
      // Ensure all warehouses have entries
      INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
      return ws;
    }
    // Migrate old format
    const ws: Record<string, number> = {};
    INV_WAREHOUSES.forEach(w => { ws[w] = w === (product.data.warehouse || 'Almacén Principal') ? (Number(product.data.stock) || 0) : 0; });
    return ws;
  };

  const saveInvProduct = async () => {
    const name = forms.invProdName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const warehouseStock: Record<string, number> = {};
      INV_WAREHOUSES.forEach(w => { warehouseStock[w] = Number(forms[`invProdWS_${w.replace(/\s/g, '_')}`]) || 0; });
      const totalStock = Object.values(warehouseStock).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      const data = { name, sku: forms.invProdSku || '', categoryId: forms.invProdCat || '', unit: forms.invProdUnit || 'Unidad', price: Number(forms.invProdPrice) || 0, stock: totalStock, minStock: Number(forms.invProdMinStock) || 0, description: forms.invProdDesc || '', imageData: forms.invProdImage || '', warehouse: forms.invProdWarehouse || 'Almacén Principal', warehouseStock, updatedAt: ts, updatedBy: authUser?.uid };
      if (editingId) { await db.collection('invProducts').doc(editingId).update(data); showToast('Producto actualizado'); }
      else { await db.collection('invProducts').add({ ...data, createdAt: ts, createdBy: authUser?.uid }); showToast('Producto creado'); }
      closeModal('invProduct'); setEditingId(null);
      const resetForms: Record<string, any> = { invProdName: '', invProdSku: '', invProdCat: '', invProdUnit: 'Unidad', invProdPrice: '', invProdMinStock: '5', invProdDesc: '', invProdImage: '', invProdWarehouse: 'Almacén Principal' };
      INV_WAREHOUSES.forEach(w => { resetForms[`invProdWS_${w.replace(/\s/g, '_')}`] = '0'; });
      setForms(p => ({ ...p, ...resetForms }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteInvProduct = async (id: string) => { if (!confirm('¿Eliminar este producto del inventario?')) return; try { await getFirebase().firestore().collection('invProducts').doc(id).delete(); showToast('Producto eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const openEditInvProduct = (p: any) => {
    setEditingId(p.id);
    const ws = buildWarehouseStock(p);
    const f: Record<string, any> = { invProdName: p.data.name, invProdSku: p.data.sku || '', invProdCat: p.data.categoryId || '', invProdUnit: p.data.unit || 'Unidad', invProdPrice: String(p.data.price || ''), invProdMinStock: String(p.data.minStock || '5'), invProdDesc: p.data.description || '', invProdImage: p.data.imageData || '', invProdWarehouse: p.data.warehouse || 'Almacén Principal' };
    INV_WAREHOUSES.forEach(w => { f[`invProdWS_${w.replace(/\s/g, '_')}`] = String(ws[w] || 0); });
    setForms(prev => ({ ...prev, ...f }));
    openModal('invProduct');
  };

  const saveInvCategory = async () => {
    const name = forms.invCatName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const data = { name, color: forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length], description: forms.invCatDesc || '', createdAt: ts };
      if (editingId) { await db.collection('invCategories').doc(editingId).update(data); showToast('Categoría actualizada'); }
      else { await db.collection('invCategories').add(data); showToast('Categoría creada'); }
      closeModal('invCategory'); setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteInvCategory = async (id: string) => { if (!confirm('¿Eliminar categoría?')) return; try { await getFirebase().firestore().collection('invCategories').doc(id).delete(); showToast('Categoría eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };
  const openEditInvCategory = (c: any) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };

  const saveInvMovement = async () => {
    const productId = forms.invMovProduct || '';
    const qty = Number(forms.invMovQty) || 0;
    const warehouse = forms.invMovWarehouse || 'Almacén Principal';
    if (!productId || qty <= 0) { showToast('Selecciona producto, almacén y cantidad', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const type = forms.invMovType || 'Entrada';
      const data = { productId, type, quantity: qty, warehouse, reason: forms.invMovReason || '', reference: forms.invMovRef || '', date: forms.invMovDate || new Date().toISOString().split('T')[0], createdAt: ts, createdBy: authUser?.uid };
      await db.collection('invMovements').add(data);
      // Update warehouseStock map
      const product = invProducts.find(p => p.id === productId);
      if (product) {
        const ws = buildWarehouseStock(product);
        ws[warehouse] = type === 'Entrada' ? (ws[warehouse] || 0) + qty : Math.max(0, (ws[warehouse] || 0) - qty);
        const newTotal = Object.values(ws).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
        await db.collection('invProducts').doc(productId).update({ stock: newTotal, warehouseStock: ws, updatedAt: ts });
      }
      showToast(`${type === 'Entrada' ? 'Entrada' : 'Salida'} registrada en ${warehouse}: ${qty} uds`);
      closeModal('invMovement'); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Entrada', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' }));
    } catch { showToast('Error al registrar movimiento', 'error'); }
  };

  const deleteInvMovement = async (id: string) => { if (!confirm('¿Eliminar movimiento?')) return; try { await getFirebase().firestore().collection('invMovements').doc(id).delete(); showToast('Movimiento eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const saveInvTransfer = async () => {
    const productId = forms.invTrProduct || '';
    const qty = Number(forms.invTrQty) || 0;
    const from = forms.invTrFrom || '';
    const to = forms.invTrTo || '';
    if (!productId || !from || !to || from === to || qty <= 0) { showToast('Completa todos los campos y asegúrate que los almacenes sean diferentes', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const product = invProducts.find(p => p.id === productId);
      const ws = product ? buildWarehouseStock(product) : {};
      const fromStock = ws[from] || 0;
      if (qty > fromStock) { showToast(`Stock insuficiente en ${from}. Disponible: ${fromStock}`, 'error'); return; }
      // Execute transfer: update warehouseStock
      ws[from] = Math.max(0, fromStock - qty);
      ws[to] = (ws[to] || 0) + qty;
      const newTotal = Object.values(ws).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      await db.collection('invProducts').doc(productId).update({ stock: newTotal, warehouseStock: ws, updatedAt: ts });
      // Save transfer record
      await db.collection('invTransfers').add({
        productId, productName: product?.data.name || '', fromWarehouse: from, toWarehouse: to, quantity: qty,
        status: 'Completada', date: forms.invTrDate || new Date().toISOString().split('T')[0],
        notes: forms.invTrNotes || '', createdAt: ts, createdBy: authUser?.uid, completedAt: ts
      });
      showToast(`Transferencia completada: ${qty} uds de ${from} → ${to}`);
      closeModal('invTransfer'); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' }));
    } catch { showToast('Error en transferencia', 'error'); }
  };

  const deleteInvTransfer = async (id: string) => { if (!confirm('¿Eliminar registro de transferencia?')) return; try { await getFirebase().firestore().collection('invTransfers').doc(id).delete(); showToast('Transferencia eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const getInvCategoryName = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.name : 'Sin categoría'; };
  const getInvCategoryColor = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.color : '#6b7280'; };
  const getInvProductName = (prodId: string) => { const p = invProducts.find(x => x.id === prodId); return p ? p.data.name : 'Desconocido'; };
  const invTotalValue = invProducts.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
  const invLowStock = invProducts.filter(p => getTotalStock(p) <= (Number(p.data.minStock) || 0));
  const invTotalStock = invProducts.reduce((s, p) => s + getTotalStock(p), 0);
  const invPendingTransfers = invTransfers.filter(t => t.data.status === 'Pendiente' || t.data.status === 'En tránsito').length;
  const invAlerts = [
    ...(invLowStock.map(p => ({ type: 'low_stock' as const, msg: `${p.data.name}: stock ${getTotalStock(p)} (mín: ${p.data.minStock})`, severity: 'high' as const }))),
    ...(invTransfers.filter(t => t.data.status === 'Pendiente').map(t => ({ type: 'pending_transfer' as const, msg: `Transferencia pendiente: ${t.data.quantity} uds de ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, severity: 'medium' as const }))),
    ...(invProducts.filter(p => getTotalStock(p) === 0).map(p => ({ type: 'out_of_stock' as const, msg: `${p.data.name}: AGOTADO`, severity: 'critical' as const }))),
  ];

  // ===== ADMIN HELPERS =====
  const GANTT_DAYS = 14;
  const GANTT_DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const GANTT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    'Por hacer': { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
    'En progreso': { label: 'En Progreso', color: '#3b82f6', bg: '#eff6ff' },
    'Revision': { label: 'Revisión', color: '#8b5cf6', bg: '#f5f3ff' },
    'Completado': { label: 'Completado', color: '#10b981', bg: '#ecfdf5' },
  };
  const GANTT_PRIO_CFG: Record<string, { label: string; bg: string; color: string }> = {
    'Baja': { label: 'Baja', bg: '#f1f5f9', color: '#475569' },
    'Media': { label: 'Media', bg: '#e0f2fe', color: '#0369a1' },
    'Alta': { label: 'Alta', bg: '#ffedd5', color: '#c2410c' },
  };

  const getMonday = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff); };

  const getGanttDays = () => {
    const base = getMonday(new Date()); base.setHours(0,0,0,0);
    base.setDate(base.getDate() + adminWeekOffset * 7);
    const days = [];
    for (let i = 0; i < GANTT_DAYS; i++) { const day = new Date(base); day.setDate(day.getDate() + i); days.push(day); }
    return days;
  };

  const getTaskBar = (task: any, days: Date[]) => {
    if (!task.data.dueDate) return null;
    const tStart = task.data.dueDate ? new Date(task.data.startDate || task.data.dueDate) : new Date();
    const tEnd = new Date(task.data.dueDate);
    const rangeStart = days[0]; const rangeEnd = new Date(days[days.length - 1]); rangeEnd.setDate(rangeEnd.getDate() + 1);
    const DAY_MS = 86400000; const rangeSpan = (rangeEnd - rangeStart) / DAY_MS;
    const leftPct = Math.max(0, (tStart - rangeStart) / DAY_MS / rangeSpan) * 100;
    const widthPct = Math.max(2, ((tEnd - tStart) / DAY_MS + 1) / rangeSpan) * 100;
    return { left: leftPct, width: Math.min(widthPct, 100 - leftPct) };
  };

  const buildGanttRows = (memberTasks: any[]) => {
    const rows: any[][] = [];
    memberTasks.forEach((t: any) => {
      if (!t.data.dueDate) return;
      let placed = false;
      for (const row of rows) {
        const overlaps = row.some((r: any) => {
          if (!r.data.dueDate || !t.data.dueDate) return false;
          return new Date(r.data.startDate || r.data.dueDate) <= new Date(t.data.dueDate) && new Date(t.data.startDate || t.data.dueDate) <= new Date(r.data.dueDate);
        });
        if (!overlaps) { row.push(t); placed = true; break; }
      }
      if (!placed) rows.push([t]);
    });
    return rows;
  };

  const findOverlaps = (memberTasks: any[]) => {
    const overlapIds = new Set<string>();
    for (let i = 0; i < memberTasks.length; i++) {
      for (let j = i + 1; j < memberTasks.length; j++) {
        const a = memberTasks[i], b = memberTasks[j];
        if (!a.data.dueDate || !b.data.dueDate) continue;
        if (new Date(a.data.startDate || a.data.dueDate) <= new Date(b.data.dueDate) && new Date(b.data.startDate || b.data.dueDate) <= new Date(a.data.dueDate)) {
          overlapIds.add(a.id); overlapIds.add(b.id);
        }
      }
    }
    return overlapIds;
  };

  const getProjectColor = (projId: string) => {
    const colors = ['#3b82f6','#8b5cf6','#f43f5e','#10b981','#f59e0b','#06b6d4','#ec4899','#84cc16','#6366f1','#f97316'];
    const idx = projects.findIndex(p => p.id === projId);
    return colors[Math.abs(idx) % colors.length];
  };

  const getProjectColorLight = (projId: string) => {
    const map: Record<string, string> = { '#3b82f6':'#dbeafe','#8b5cf6':'#ede9fe','#f43f5e':'#ffe4e6','#10b981':'#d1fae5','#f59e0b':'#fef3c7','#06b6d4':'#cffafe','#ec4899':'#fce7f3','#84cc16':'#ecfccb','#6366f1':'#e0e7ff','#f97316':'#ffedd5' };
    return map[getProjectColor(projId)] || '#f5f5f4';
  };

  const getUserRole = (uid: string) => { const u = teamUsers.find(x => x.id === uid); return u?.data?.role || 'Miembro'; };
  const myRole = getUserRole(authUser?.uid || '');
  // Admin check: also consider ADMIN_EMAILS directly in case Firestore update hasn't propagated yet
  const isEmailAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;
  const isAdmin = myRole === 'Admin' || myRole === 'Director' || isEmailAdmin;

  // User display helpers
  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || '';
  const initials = getInitials(userName);
  const screenTitles = SCREEN_TITLES;

  const activeTasks = tasks.filter(t => t.data.status !== 'Completado');
  const completedTasks = tasks.filter(t => t.data.status === 'Completado');
  const overdueTasks = activeTasks.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString()));
  const urgentTasks = activeTasks.filter(t => t.data.priority === 'Alta');

  const adminFilteredTasks = activeTasks.filter(t => {
    const ms = !adminTaskSearch || t.data.title.toLowerCase().includes(adminTaskSearch.toLowerCase());
    const ma = adminFilterAssignee === 'all' || t.data.assigneeId === adminFilterAssignee;
    const mp = adminFilterProject === 'all' || t.data.projectId === adminFilterProject;
    const mpr = adminFilterPriority === 'all' || t.data.priority === adminFilterPriority;
    return ms && ma && mp && mpr;
  });

  const pendingCount = tasks.filter(t => t.data.status !== 'Completado').length;
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectExpenses = expenses.filter(e => e.data.projectId === selectedProjectId);
  const projectTasks = tasks.filter(t => t.data.projectId === selectedProjectId);
  const projectBudget = currentProject?.data.budget || 0;
  const projectSpent = projectExpenses.reduce((s, e) => s + (Number(e.data.amount) || 0), 0);

  // Actualizar contexto del proyecto para la IA cuando se selecciona uno
  useEffect(() => {
    if (currentProject) {
      const ctx = [
        `Proyecto: ${currentProject.data.name}`,
        currentProject.data.description ? `Descripción: ${currentProject.data.description}` : '',
        currentProject.data.client ? `Cliente: ${currentProject.data.client}` : '',
        currentProject.data.location ? `Ubicación: ${currentProject.data.location}` : '',
        currentProject.data.status ? `Estado: ${currentProject.data.status}` : '',
        currentProject.data.budget ? `Presupuesto: ${fmtCOP(currentProject.data.budget)}` : '',
        currentProject.data.progress !== undefined ? `Progreso: ${currentProject.data.progress}%` : '',
        projectTasks.length > 0 ? `Tareas: ${projectTasks.length} (${projectTasks.filter(t => t.data.status === 'Completado').length} completadas)` : '',
        projectExpenses.length > 0 ? `Gastos registrados: ${fmtCOP(projectSpent)} de ${fmtCOP(projectBudget)}` : '',
      ].filter(Boolean).join('\n');
      useUIStore.getState().setAIProjectContext(ctx);
    } else {
      useUIStore.getState().setAIProjectContext('');
    }
  }, [currentProject, projectTasks.length, projectSpent, projectBudget]);

  const navigateTo = (s: string, projId?: string | null) => {
    setScreen(s);
    setSelectedProjectId(projId ?? selectedProjectId);
    setSidebarOpen(false);
    if (s !== 'chat') { setChatMobileShow(false); setShowEmojiPicker(false); }
    useUIStore.getState().setCurrentScreen(s);
  };
  navigateToRef.current = navigateTo;

  // Meeting functions
  const saveMeeting = async () => {
    const title = forms.meetTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const data = { title, description: forms.meetDesc || '', projectId: forms.meetProject || '', date: forms.meetDate || '', time: forms.meetTime || '09:00', duration: Number(forms.meetDuration) || 60, attendees: forms.meetAttendees ? forms.meetAttendees.split(',').map((s: string) => s.trim()).filter(Boolean) : [], createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('meetings').doc(editingId).update(data); showToast('Reunión actualizada'); }
      else { await db.collection('meetings').add(data); showToast('Reunión creada'); }
      closeModal('meeting'); setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };
  const deleteMeeting = async (id: string) => { if (!confirm('¿Eliminar reunión?')) return; try { await getFirebase().firestore().collection('meetings').doc(id).delete(); showToast('Reunión eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };
  const openEditMeeting = (m: any) => { setEditingId(m.id); setForms(f => ({ ...f, meetTitle: m.data.title, meetProject: m.data.projectId || '', meetDate: m.data.date || '', meetTime: m.data.time || '09:00', meetDuration: String(m.data.duration || 60), meetDesc: m.data.description || '', meetAttendees: (m.data.attendees || []).join(', ') })); openModal('meeting'); };
  const openProject = (id: string) => { setSelectedProjectId(id); setScreen('projectDetail'); useUIStore.getState().setCurrentScreen('projectDetail'); };

  // Gallery functions
  const saveGalleryPhoto = async () => {
    const imageData = forms.galleryImageData || '';
    if (!imageData) { showToast('Selecciona una foto', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = getFirebase().firestore.FieldValue.serverTimestamp();
      const data = { projectId: forms.galleryProject || '', categoryName: forms.galleryCategory || 'Otro', caption: forms.galleryCaption || '', imageData, createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); }
      else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); }
      closeModal('gallery'); setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' }));
    } catch { showToast('Error al guardar foto', 'error'); }
  };

  const deleteGalleryPhoto = async (id: string) => { if (!confirm('¿Eliminar foto de la galería?')) return; try { await getFirebase().firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const handleGalleryImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setForms(p => ({ ...p, galleryImageData: base64 }));
    } catch { showToast('Error al procesar imagen', 'error'); }
  };

  const handleInvProductImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    if (file.size > 3 * 1024 * 1024) { showToast('Máx 3 MB', 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setForms(p => ({ ...p, invProdImage: base64 }));
    } catch { showToast('Error al procesar', 'error'); }
  };

  const openLightbox = (photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxPhoto(null); setLightboxIndex(0); };
  const lightboxPrev = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => {
      const next = (prev - 1 + filtered.length) % filtered.length;
      setLightboxPhoto(filtered[next]);
      return next;
    });
  };
  const lightboxNext = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => {
      const next = (prev + 1) % filtered.length;
      setLightboxPhoto(filtered[next]);
      return next;
    });
  };

  const getFilteredGalleryPhotos = () => {
    let photos = galleryPhotos;
    if (galleryFilterProject !== 'all') photos = photos.filter(p => p.data.projectId === galleryFilterProject);
    if (galleryFilterCat !== 'all') photos = photos.filter(p => p.data.categoryName === galleryFilterCat);
    return photos;
  };

  // Get platform info for install guide
  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows/.test(ua)) return 'windows';
    if (/Mac/.test(ua)) return 'mac';
    return 'other';
  };
  const platform = getPlatform();

  /* ===== TIME TRACKING FUNCTIONS ===== */
  const startTimeTracking = () => {
    if (timeSession.isRunning) return;
    const desc = forms.teDescription || forms.teQuickDesc || 'Trabajo en proyecto';
    const projId = forms.teProject || '';
    const phase = forms.tePhase || '';
    if (!projId) { showToast('Selecciona un proyecto', 'error'); return; }
    const entryId = 'temp-' + Date.now();
    setTimeSession({ entryId: null, startTime: Date.now(), description: desc, projectId: projId, phaseName: phase, isRunning: true });
    setTimeTimerMs(0);
  };

  const stopTimeTracking = async () => {
    if (!timeSession.isRunning || !timeSession.startTime) return;
    const endTime = new Date();
    const startTime = new Date(timeSession.startTime);
    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    if (durationMin < 1) { showToast('Mínimo 1 minuto', 'error'); return; }
    const dateStr = startTime.toISOString().split('T')[0];
    const startStr = startTime.toTimeString().substring(0, 5);
    const endStr = endTime.toTimeString().substring(0, 5);
    await fbActions.saveTimeEntry({
      teProject: timeSession.projectId,
      tePhase: timeSession.phaseName,
      teDescription: timeSession.description,
      teStartTime: startStr,
      teEndTime: endStr,
      teDuration: durationMin,
      teBillable: true,
      teRate: Number(forms.teRate) || 50000,
      teDate: dateStr,
    }, null, showToast, authUser);
    setTimeSession({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
    setTimeTimerMs(0);
  };

  const saveManualTimeEntry = () => {
    const dur = Number(forms.teManualDuration) || 0;
    if (dur < 1) { showToast('Mínimo 1 minuto', 'error'); return; }
    if (!forms.teProject) { showToast('Selecciona un proyecto', 'error'); return; }
    fbActions.saveTimeEntry({
      teProject: forms.teProject,
      tePhase: forms.tePhase || '',
      teDescription: forms.teDescription || '',
      teStartTime: forms.teStartTime || '08:00',
      teEndTime: forms.teEndTime || '17:00',
      teDuration: dur,
      teBillable: forms.teBillable !== false,
      teRate: Number(forms.teRate) || 50000,
      teDate: forms.teDate || new Date().toISOString().split('T')[0],
    }, editingId, showToast, authUser);
    closeModal('timeEntry');
  };

  /* ===== INVOICE FUNCTIONS ===== */
  const openNewInvoice = () => {
    setEditingId(null);
    setInvoiceItems([{ concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);
    setForms(p => ({ ...p, invProject: '', invNumber: '', invStatus: 'Borrador', invTax: 19, invNotes: '', invIssueDate: new Date().toISOString().split('T')[0], invDueDate: '' }));
    setInvoiceTab('create');
  };

  const updateInvoiceItem = (idx: number, field: string, value: any) => {
    setInvoiceItems(prev => {
      const items = [...prev];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'hours' || field === 'rate') {
        items[idx].amount = (Number(items[idx].hours) || 0) * (Number(items[idx].rate) || 0);
      }
      return items;
    });
  };

  const addInvoiceItem = () => setInvoiceItems(prev => [...prev, { concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);

  const removeInvoiceItem = (idx: number) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter((_, i) => i !== idx));
  };

  const saveInvoice = () => {
    if (!forms.invProject) { showToast('Selecciona un proyecto', 'error'); return; }
    const subtotal = invoiceItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const tax = Number(forms.invTax) || 19;
    const total = subtotal + (subtotal * tax / 100);
    fbActions.saveInvoice({
      invProject: forms.invProject,
      invNumber: forms.invNumber || '',
      invStatus: forms.invStatus || 'Borrador',
      invItems: invoiceItems,
      invSubtotal: subtotal,
      invTax: tax,
      invTotal: total,
      invNotes: forms.invNotes || '',
      invIssueDate: forms.invIssueDate || new Date().toISOString().split('T')[0],
      invDueDate: forms.invDueDate || '',
    }, editingId, showToast, authUser);
    setInvoiceTab('list');
  };

  /* ===== COMMENT FUNCTIONS ===== */
  const postComment = (taskId: string, projectId: string) => {
    if (!commentText.trim()) return;
    const mentions: string[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(commentText)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = teamUsers.find(u => u.data.name.toLowerCase().includes(mentionedName.toLowerCase()));
      if (mentionedUser) mentions.push(mentionedUser.id);
    }
    fbActions.saveComment({ taskId, projectId, text: commentText.trim(), mentions, parentId: replyingTo }, showToast, authUser);
    setCommentText('');
    setReplyingTo(null);
  };

  /* ===== GANTT HELPER ===== */
  const calcGanttDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  };

  const calcGanttOffset = (phaseStart: string, timelineStart: string): number => {
    if (!phaseStart || !timelineStart) return 0;
    return Math.max(0, Math.ceil((new Date(phaseStart).getTime() - new Date(timelineStart).getTime()) / (1000 * 60 * 60 * 24)));
  };


  // ===== CONTEXT VALUE =====
  const ctx = {
    screen,
    navigateTo,
    selectedProjectId,
    setSelectedProjectId,
    authUser,
    userName,
    initials,
    isAdmin,
    myRole,
    isEmailAdmin,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    openModal,
    closeModal,
    showToast,
    darkMode,
    toggleTheme,
    projects,
    tasks,
    teamUsers,
    expenses,
    suppliers,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    currentProject,
    pendingCount,
    doLogin,
    doRegister,
    doGoogleLogin,
    doMicrosoftLogin,
    doLogout,
    forms,
    setForms,
    modals,
    editingId,
    setEditingId,
    ready,
    loading,
    toast,
    messages,
    setMessages,
    chatProjectId,
    setChatProjectId,
    workPhases,
    setWorkPhases,
    projectFiles,
    setProjectFiles,
    approvals,
    setApprovals,
    chatMobileShow,
    setChatMobileShow,
    calMonth,
    setCalMonth,
    calYear,
    setCalYear,
    calSelectedDate,
    setCalSelectedDate,
    calFilterProject,
    setCalFilterProject,
    meetings,
    setMeetings,
    galleryPhotos,
    setGalleryPhotos,
    galleryFilterProject,
    setGalleryFilterProject,
    galleryFilterCat,
    setGalleryFilterCat,
    lightboxPhoto,
    setLightboxPhoto,
    lightboxIndex,
    setLightboxIndex,
    invProducts,
    invCategories,
    invMovements,
    invTransfers,
    invTab,
    setInvTab,
    invFilterCat,
    setInvFilterCat,
    invSearch,
    setInvSearch,
    invMovFilterType,
    setInvMovFilterType,
    invTransferFilterStatus,
    setInvTransferFilterStatus,
    invWarehouseFilter,
    setInvWarehouseFilter,
    timeEntries,
    timeTab,
    setTimeTab,
    timeFilterProject,
    setTimeFilterProject,
    timeFilterDate,
    setTimeFilterDate,
    timeSession,
    setTimeSession,
    timeTimerMs,
    setTimeTimerMs,
    invoices,
    invoiceTab,
    setInvoiceTab,
    invoiceItems,
    setInvoiceItems,
    invoiceFilterStatus,
    setInvoiceFilterStatus,
    comments,
    setComments,
    commentText,
    setCommentText,
    replyingTo,
    setReplyingTo,
    taskViewMode,
    setTaskViewMode,
    adminTab,
    setAdminTab,
    adminWeekOffset,
    setAdminWeekOffset,
    adminTaskSearch,
    setAdminTaskSearch,
    adminFilterAssignee,
    setAdminFilterAssignee,
    adminFilterProject,
    setAdminFilterProject,
    adminFilterPriority,
    setAdminFilterPriority,
    adminTooltipTask,
    setAdminTooltipTask,
    adminTooltipPos,
    setAdminTooltipPos,
    adminPermSection,
    setAdminPermSection,
    rolePerms,
    setRolePerms,
    toggleRolePerm,
    isRecording,
    setIsRecording,
    isSavingTask,
    setIsSavingTask,
    recDuration,
    setRecDuration,
    recVolume,
    setRecVolume,
    audioPreviewUrl,
    setAudioPreviewUrl,
    audioPreviewDuration,
    setAudioPreviewDuration,
    pendingFiles,
    setPendingFiles,
    chatDropActive,
    setChatDropActive,
    mediaRecRef,
    audioChunksRef,
    audioStreamRef,
    analyserRef,
    recTimerRef,
    recAnimRef,
    fileInputRef,
    audioPreviewBlobRef,
    playingAudioRef,
    playingAudio,
    setPlayingAudio,
    audioProgress,
    setAudioProgress,
    audioCurrentTime,
    setAudioCurrentTime,
    showEmojiPicker,
    setShowEmojiPicker,
    chatDmUser,
    setChatDmUser,
    chatReplyingTo,
    setChatReplyingTo,
    messageReactions,
    setMessageReactions,
    typingUsers,
    setTypingUsers,
    chatMenuMsg,
    setChatMenuMsg,
    chatMsgSearch,
    setChatMsgSearch,
    toggleReaction,
    deleteMessage,
    copyMessageText,
    installPrompt,
    setInstallPrompt,
    showInstallBanner,
    setShowInstallBanner,
    isInstalled,
    setIsInstalled,
    showInstallGuide,
    setShowInstallGuide,
    isStandalone,
    handleInstall,
    dismissInstallBanner,
    platform,
    notifPermission,
    setNotifPermission,
    notifHistory,
    setNotifHistory,
    notifPrefs,
    setNotifPrefs,
    showNotifPanel,
    setShowNotifPanel,
    unreadCount,
    notifSound,
    setNotifSound,
    inAppNotifs,
    setInAppNotifs,
    notifFilterCat,
    setNotifFilterCat,
    showNotifBanner,
    setShowNotifBanner,
    requestNotifPermission,
    dismissNotifBanner,
    markNotifRead,
    markAllNotifRead,
    clearNotifHistory,
    toggleNotifPref,
    sendNotif,
    sendBrowserNotif,
    msAccessToken,
    msConnected,
    msLoading,
    oneDriveFiles,
    odProjectFolder,
    showOneDrive,
    setShowOneDrive,
    msRefreshToken,
    msTokenExpiry,
    odSearchQuery,
    setOdSearchQuery,
    odSearchResults,
    setOdSearchResults,
    odSearching,
    setOdSearching,
    odBreadcrumbs,
    setOdBreadcrumbs,
    odCurrentFolder,
    setOdCurrentFolder,
    odViewMode,
    setOdViewMode,
    odRenaming,
    setOdRenaming,
    odRenameName,
    setOdRenameName,
    odUploading,
    setOdUploading,
    odUploadProgress,
    setOdUploadProgress,
    odUploadFile,
    setOdUploadFile,
    odDragOver,
    setOdDragOver,
    odTab,
    setOdTab,
    galleryLoading,
    setGalleryLoading,
    odGalleryPhotos,
    setOdGalleryPhotos,
    disconnectMicrosoft,
    refreshMsToken,
    graphApiGet,
    ensureProjectFolder,
    loadOneDriveFiles,
    uploadToOneDrive,
    deleteFromOneDrive,
    openOneDriveForProject,
    formatFileSize,
    timeAgo,
    getFileIcon,
    navigateToFolder,
    uploadFileWithProgress,
    handleFileUpload,
    handleDroppedFiles,
    renameOneDriveFile,
    downloadOneDriveFile,
    searchOneDriveFiles,
    loadGalleryPhotos,
    updateUserRole,
    updateUserCompany,
    getMyCompanyId,
    getMyRole,
    visibleProjects,
    getUserName,
    saveProject,
    deleteProject,
    openEditProject,
    saveTask,
    openEditTask,
    updateProjectProgress,
    updateUserName,
    toggleTask,
    deleteTask,
    sendMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    handleMicButton,
    sendVoiceNote,
    handleFileSelect,
    removePendingFile,
    sendPendingFiles,
    sendAll,
    toggleAudioPlay,
    fileIcon,
    saveExpense,
    deleteExpense,
    saveSupplier,
    deleteSupplier,
    saveCompany,
    uploadFile,
    deleteFile,
    initDefaultPhases,
    updatePhaseStatus,
    saveApproval,
    updateApproval,
    deleteApproval,
    getWarehouseStock,
    getTotalStock,
    buildWarehouseStock,
    saveInvProduct,
    deleteInvProduct,
    openEditInvProduct,
    saveInvCategory,
    deleteInvCategory,
    openEditInvCategory,
    saveInvMovement,
    deleteInvMovement,
    saveInvTransfer,
    deleteInvTransfer,
    getInvCategoryName,
    getInvCategoryColor,
    getInvProductName,
    invTotalValue,
    invLowStock,
    invTotalStock,
    invPendingTransfers,
    invAlerts,
    GANTT_DAYS,
    GANTT_DAY_NAMES,
    GANTT_STATUS_CFG,
    GANTT_PRIO_CFG,
    getMonday,
    getGanttDays,
    getTaskBar,
    buildGanttRows,
    findOverlaps,
    getProjectColor,
    getProjectColorLight,
    getUserRole,
    activeTasks,
    completedTasks,
    overdueTasks,
    urgentTasks,
    adminFilteredTasks,
    projectExpenses,
    projectTasks,
    projectBudget,
    projectSpent,
    saveMeeting,
    deleteMeeting,
    openEditMeeting,
    openProject,
    saveGalleryPhoto,
    deleteGalleryPhoto,
    handleGalleryImageSelect,
    handleInvProductImageSelect,
    openLightbox,
    closeLightbox,
    lightboxPrev,
    lightboxNext,
    getFilteredGalleryPhotos,
    startTimeTracking,
    stopTimeTracking,
    saveManualTimeEntry,
    openNewInvoice,
    updateInvoiceItem,
    addInvoiceItem,
    removeInvoiceItem,
    saveInvoice,
    postComment,
    calcGanttDays,
    calcGanttOffset,
    navigateToRef,
    screenTitles,
    dailyLogs,
    dailyLogTab,
    setDailyLogTab,
    selectedLogId,
    setSelectedLogId,
    logForm,
    setLogForm,
    saveDailyLog,
    deleteDailyLog,
    openEditLog,
    resetLogForm,
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
