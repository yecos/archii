'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';

/* ===== TYPES ===== */
interface User { uid: string; displayName: string; email: string; photoURL?: string }
interface TeamUser { id: string; data: { name: string; email: string; role?: string; photoURL?: string } }
interface Project { id: string; data: { name: string; status: string; client: string; location: string; budget: number; description: string; startDate: string; endDate: string; progress: number; createdAt: any; updatedAt?: any; createdBy?: string } }
interface Task { id: string; data: { title: string; projectId: string; assigneeId: string; priority: string; status: string; dueDate: string; createdAt: any; createdBy?: string } }
interface Expense { id: string; data: { concept: string; projectId: string; category: string; amount: number; date: string; createdAt: any } }
interface Supplier { id: string; data: { name: string; category: string; phone: string; email: string; address: string; website: string; notes: string; rating: number; createdAt: any } }
interface Approval { id: string; data: { title: string; description: string; status: string; createdAt: any } }
interface WorkPhase { id: string; data: { name: string; description: string; status: string; order: number; startDate: string; endDate: string; createdAt: any } }
interface ProjectFile { id: string; name: string; type: string; size: number; url: string; createdAt: any }
interface OneDriveFile { id: string; name: string; size: number; mimeType: string; webUrl: string; createdDateTime: string; '@microsoft.graph.downloadUrl'?: string }
interface GalleryPhoto { id: string; data: { projectId: string; categoryName: string; caption: string; imageData: string; createdAt: any; createdBy: string } }
interface InvProduct { id: string; data: { name: string; sku: string; categoryId: string; unit: string; price: number; stock: number; minStock: number; description: string; imageData: string; warehouse: string; warehouseStock: Record<string, number>; createdAt: any; createdBy: string; updatedAt?: any } }
interface InvCategory { id: string; data: { name: string; color: string; description: string; createdAt: any } }
interface InvMovement { id: string; data: { productId: string; type: 'Entrada' | 'Salida'; quantity: number; reason: string; reference: string; date: string; createdAt: any; createdBy: string } }
interface InvTransfer { id: string; data: { productId: string; productName: string; fromWarehouse: string; toWarehouse: string; quantity: number; status: string; date: string; notes: string; createdAt: any; createdBy: string; completedAt?: any } }

/* ===== HELPERS ===== */
const fmtCOP = (n: number) => { if (!n) return '$0'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; return '$' + Number(n).toLocaleString('es-CO'); };
const fmtDate = (ts: any) => { if (!ts) return '—'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtSize = (b: number) => { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };
const getInitials = (n: string) => n ? n.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?';
const statusColor = (s: string) => ({ Concepto: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]', Diseno: 'bg-blue-500/10 text-blue-400', Ejecucion: 'bg-amber-500/10 text-amber-400', Terminado: 'bg-emerald-500/10 text-emerald-400' }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
const prioColor = (p: string) => ({ Alta: 'bg-red-500/10 text-red-400', Media: 'bg-amber-500/10 text-amber-400', Baja: 'bg-emerald-500/10 text-emerald-400' }[p] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
const taskStColor = (s: string) => ({ 'Por hacer': 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]', 'En progreso': 'bg-blue-500/10 text-blue-400', Revision: 'bg-amber-500/10 text-amber-400', Completado: 'bg-emerald-500/10 text-emerald-400' }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
const avatarColors = ['bg-emerald-500/15 text-emerald-400 border-emerald-500/30', 'bg-blue-500/15 text-blue-400 border-blue-500/30', 'bg-purple-500/15 text-purple-400 border-purple-500/30', 'bg-amber-500/15 text-amber-400 border-amber-500/30'];
const avatarColor = (id: string) => { let h = 0; for (let i = 0; i < (id || '').length; i++) h = id.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const DEFAULT_PHASES = ['Planos', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'];
const EXPENSE_CATS = ['Materiales', 'Mano de obra', 'Mobiliario', 'Acabados', 'Imprevistos'];
const SUPPLIER_CATS = ['Materiales', 'Mobiliario', 'Iluminación', 'Acabados', 'Eléctrico', 'Plomería', 'Otro'];
const PHOTO_CATS = ['Fachada', 'Interior', 'Obra', 'Planos', 'Renders', 'Otro'];
const INV_UNITS = ['Unidad', 'Metro', 'Metro²', 'Metro³', 'Kilogramo', 'Litro', 'Galon', 'Rollo', 'Saco', 'Caja', 'Paquete', 'Pieza', 'Par', 'Set', 'Otro'] as const;
const INV_WAREHOUSES = ['Almacén Principal', 'Obra en Curso', 'Bodega Reserva'] as const;
const TRANSFER_STATUSES = ['Pendiente', 'En tránsito', 'Completada', 'Cancelada'] as const;
const CAT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1'];
const ADMIN_EMAILS = ['yecos11@gmail.com'];
const USER_ROLES = ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Contratista', 'Cliente', 'Miembro'] as const;
const ROLE_COLORS: Record<string, string> = { Admin: 'bg-red-500/10 text-red-400 border-red-500/30', Director: 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30', Arquitecto: 'bg-blue-500/10 text-blue-400 border-blue-500/30', Interventor: 'bg-purple-500/10 text-purple-400 border-purple-500/30', Contratista: 'bg-amber-500/10 text-amber-400 border-amber-500/30', Cliente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', Miembro: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]' };
const ROLE_ICONS: Record<string, string> = { Admin: '👑', Director: '🎯', Arquitecto: '📐', Interventor: '🔍', Contratista: '🏗️', Cliente: '🤝', Miembro: '👤' };
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/* ===== MAIN COMPONENT ===== */
export default function Home() {
  const [ready, setReady] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [screen, setScreen] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatProjectId, setChatProjectId] = useState<string | null>(null);
  const [workPhases, setWorkPhases] = useState<WorkPhase[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Chat voice & files state
  const [isRecording, setIsRecording] = useState(false);
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
    } catch {}
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
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch {}
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
    } catch {}
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
        const fb = (window as any).firebase;
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
    const fb = (window as any).firebase;
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
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('users').onSnapshot(snap => {
      setTeamUsers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load projects
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setProjects(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load tasks
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setTasks(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load expenses
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setExpenses(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load suppliers
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setSuppliers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load chat messages
  useEffect(() => {
    if (!ready || !chatProjectId) return;
    const db = (window as any).firebase.firestore();
    let unsub: any;
    if (chatProjectId === '__general__') {
      unsub = db.collection('generalMessages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    } else {
      unsub = db.collection('projects').doc(chatProjectId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    }
    return () => { unsub(); setMessages([]); };
  }, [ready, chatProjectId]);

  // Load work phases
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot(snap => {
      setWorkPhases(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => { unsub(); setWorkPhases([]); };
  }, [ready, selectedProjectId]);

  // Load project files
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setProjectFiles(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => { unsub(); setProjectFiles([]); };
  }, [ready, selectedProjectId]);

  // Load approvals
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setApprovals(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => { unsub(); setApprovals([]); };
  }, [ready, selectedProjectId]);

  // Load meetings
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot(snap => {
      setMeetings(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load gallery photos
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setGalleryPhotos(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory products
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('invProducts').orderBy('createdAt', 'desc').onSnapshot(snap => {
      setInvProducts(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory categories
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('invCategories').orderBy('name', 'asc').onSnapshot(snap => {
      setInvCategories(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory movements
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('invMovements').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => {
      setInvMovements(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory transfers
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = (window as any).firebase.firestore();
    const unsub = db.collection('invTransfers').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => {
      setInvTransfers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

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
    } catch {}
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
    try { localStorage.setItem('archiflow-notif-sound', String(notifSound)); } catch {}
  }, [notifSound]);

  // Save notification preferences
  useEffect(() => {
    try { localStorage.setItem('archiflow-notif-prefs', JSON.stringify(notifPrefs)); } catch {};
  }, [notifPrefs]);

  // Calculate unread notification count
  useEffect(() => {
    setUnreadCount(notifHistory.filter(n => !n.read).length);
  }, [notifHistory]);

  // Detect new chat messages and notify
  useEffect(() => {
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
    try { await (window as any).firebase.auth().signInWithEmailAndPassword(email, pass); } catch (e: any) { showToast(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos' : e.code === 'auth/user-not-found' ? 'No existe cuenta con ese correo' : 'Error al iniciar sesión', 'error'); }
  };

  const doRegister = async () => {
    const name = forms.regName || '', email = forms.regEmail || '', pass = forms.regPass || '';
    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      const cred = await (window as any).firebase.auth().createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      const db = (window as any).firebase.firestore();
      await db.collection('users').doc(cred.user.uid).set({ name, email, photoURL: '', role: 'Miembro', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e: any) { showToast(e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado' : e.code === 'auth/weak-password' ? 'Mínimo 6 caracteres' : 'Error al registrar', 'error'); }
  };

  const doGoogleLogin = async () => {
    try { await (window as any).firebase.auth().signInWithPopup(new ((window as any).firebase.auth).GoogleAuthProvider()); } catch (e: any) { showToast('Error al iniciar con Google', 'error'); }
  };

  const doMicrosoftLogin = async () => {
    try {
      const provider = new ((window as any).firebase.auth).OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await (window as any).firebase.auth().signInWithPopup(provider);
      // Get OAuth access token for Microsoft Graph
      const credential = result.credential as any;
      if (credential?.accessToken) {
        setMsAccessToken(credential.accessToken);
        setMsConnected(true);
        localStorage.setItem('msAccessToken', credential.accessToken);
        localStorage.setItem('msConnected', 'true');
        showToast('Conectado con Microsoft');
      }
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        showToast('Error al conectar con Microsoft', 'error');
      }
    }
  };

  const disconnectMicrosoft = () => {
    setMsAccessToken(null);
    setMsConnected(false);
    setOneDriveFiles([]);
    setOdProjectFolder(null);
    localStorage.removeItem('msAccessToken');
    localStorage.removeItem('msConnected');
    showToast('Microsoft desconectado');
  };

  // Restore Microsoft session
  useEffect(() => {
    const saved = localStorage.getItem('msConnected');
    const token = localStorage.getItem('msAccessToken');
    if (saved === 'true' && token) {
      setMsConnected(true);
      setMsAccessToken(token);
    }
  }, []);

  // OneDrive API helpers
  const graphApiGet = async (endpoint: string) => {
    if (!msAccessToken) return null;
    const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' }
    });
    if (res.status === 401) { disconnectMicrosoft(); return null; }
    if (!res.ok) return null;
    return res.json();
  };

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
    } catch { showToast('Error', 'error'); }
    setMsLoading(false);
  };

  const openOneDriveForProject = async (projectName: string) => {
    const folderId = await ensureProjectFolder(projectName);
    if (folderId) {
      await loadOneDriveFiles(folderId);
      setShowOneDrive(true);
    } else {
      showToast('No se pudo crear la carpeta del proyecto', 'error');
    }
  };

  // Change user role (admin only)
  const updateUserRole = async (uid: string, newRole: string) => {
    try {
      await (window as any).firebase.firestore().collection('users').doc(uid).update({ role: newRole });
      showToast(`Rol actualizado a ${newRole}`);
    } catch { showToast('Error al cambiar rol', 'error'); }
  };

  const doLogout = () => { if (!confirm('¿Cerrar sesión?')) return; (window as any).firebase.auth().signOut(); };

  const getUserName = (uid: string) => { if (!uid) return 'Sin asignar'; const u = teamUsers.find(x => x.id === uid); return u ? u.data.name : uid.substring(0, 8) + '...'; };

  const saveProject = async () => {
    const name = forms.projName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = (window as any).firebase.firestore();
    const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
    const data = { name, status: forms.projStatus || 'Concepto', client: forms.projClient || '', location: forms.projLocation || '', budget: Number(forms.projBudget) || 0, description: forms.projDesc || '', startDate: forms.projStart || '', endDate: forms.projEnd || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado'); }
      else { await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 }); showToast('Proyecto creado'); }
      closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteProject = async (id: string) => { if (!confirm('¿Eliminar este proyecto?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(id).delete(); showToast('Eliminado'); } catch { showToast('Error', 'error'); } };

  const openEditProject = (p: Project) => {
    setEditingId(p.id);
    setForms(f => ({ ...f, projName: p.data.name, projStatus: p.data.status, projClient: p.data.client, projLocation: p.data.location, projBudget: p.data.budget, projDesc: p.data.description, projStart: p.data.startDate, projEnd: p.data.endDate }));
    openModal('project');
  };

  const saveTask = async () => {
    const title = forms.taskTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    const db = (window as any).firebase.firestore();
    const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
    const data = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: forms.taskAssignee || '', priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('tasks').doc(editingId).update(data); showToast('Tarea actualizada'); }
      else { await db.collection('tasks').add({ ...data, createdAt: ts, createdBy: authUser?.uid }); showToast('Tarea creada'); }
      closeModal('task'); setEditingId(null); setForms(p => ({ ...p, taskTitle: '', taskProject: '', taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0] }));
    } catch { showToast('Error', 'error'); }
  };

  const openEditTask = (t: Task) => {
    setEditingId(t.id);
    setForms(f => ({ ...f, taskTitle: t.data.title, taskDescription: t.data.description || '', taskProject: t.data.projectId || '', taskAssignee: t.data.assigneeId || '', taskPriority: t.data.priority || 'Media', taskStatus: t.data.status || 'Por hacer', taskDue: t.data.dueDate || '' }));
    openModal('task');
  };

  const updateProjectProgress = async (val: number) => {
    if (!selectedProjectId) return;
    try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId).update({ progress: val, updatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); showToast(`Progreso: ${val}%`); } catch { showToast('Error', 'error'); }
  };

  const updateUserName = async (newName: string) => {
    if (!newName || !authUser) return;
    try { await authUser.updateProfile({ displayName: newName }); await (window as any).firebase.firestore().collection('users').doc(authUser.uid).update({ name: newName }); showToast('Nombre actualizado'); setForms(p => ({ ...p, editingName: false })); } catch { showToast('Error', 'error'); }
  };

  const toggleTask = async (id: string, status: string) => {
    const ns = status === 'Completado' ? 'Por hacer' : 'Completado';
    try { await (window as any).firebase.firestore().collection('tasks').doc(id).update({ status: ns, updatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); } catch {}
  };

  const deleteTask = async (id: string) => { if (!confirm('¿Eliminar tarea?')) return; try { await (window as any).firebase.firestore().collection('tasks').doc(id).delete(); showToast('Eliminada'); } catch {} };

  const sendMessage = async (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => {
    const text = textOverride || forms.chatInput || '';
    if (!text && !audioData && !fileData) return;
    if (!chatProjectId) return;
    try {
      const db = (window as any).firebase.firestore();
      const msgData: any = { text, uid: authUser?.uid, userName: authUser?.displayName || authUser?.email.split('@')[0], createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() };
      if (audioData) { msgData.audioData = audioData; msgData.audioDuration = audioDur || 0; msgData.type = 'AUDIO'; }
      if (fileData) { msgData.fileData = fileData.data; msgData.fileName = fileData.name; msgData.fileType = fileData.type; msgData.fileSize = fileData.size; msgData.type = fileData.type.startsWith('image/') ? 'IMAGE' : 'FILE'; }
      if (!msgData.type) msgData.type = 'TEXT';
      if (chatProjectId === '__general__') { await db.collection('generalMessages').add(msgData); }
      else { await db.collection('projects').doc(chatProjectId).collection('messages').add(msgData); }
      setForms(p => ({ ...p, chatInput: '' }));
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
    if (pendingFiles.length > 0) { await sendPendingFiles(); }
    if (forms.chatInput?.trim()) { await sendMessage(); }
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
    const db = (window as any).firebase.firestore();
    const data = { concept, projectId: forms.expProject || '', category: forms.expCategory || 'Materiales', amount: Number(forms.expAmount) || 0, date: forms.expDate || '', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try { await db.collection('expenses').add(data); showToast('Gasto registrado'); closeModal('expense'); setForms(p => ({ ...p, expConcept: '', expAmount: '', expDate: new Date().toISOString().split('T')[0] })); } catch { showToast('Error', 'error'); }
  };

  const deleteExpense = async (id: string) => { if (!confirm('¿Eliminar gasto?')) return; try { await (window as any).firebase.firestore().collection('expenses').doc(id).delete(); showToast('Eliminado'); } catch {} };

  const saveSupplier = async () => {
    const name = forms.supName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = (window as any).firebase.firestore();
    const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado'); }
      else { await db.collection('suppliers').add(data); showToast('Proveedor creado'); }
      closeModal('supplier'); setForms(p => ({ ...p, supName: '', supCategory: '', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' }));
    } catch { showToast('Error', 'error'); }
  };

  const deleteSupplier = async (id: string) => { if (!confirm('¿Eliminar proveedor?')) return; try { await (window as any).firebase.firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado'); } catch {} };

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
      const db = (window as any).firebase.firestore();
      await db.collection('projects').doc(selectedProjectId).collection('files').add({ name: file.name, type: file.type, size: file.size, data: base64, createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), uploadedBy: authUser?.uid });
      showToast('Archivo subido');
    } catch (err: any) { showToast('Error al subir: ' + (err.message || ''), 'error'); }
    e.target.value = '';
  };

  const deleteFile = async (file: ProjectFile) => {
    if (!confirm('¿Eliminar archivo?')) return;
    try {
      await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId).collection('files').doc(file.id).delete();
      showToast('Archivo eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const initDefaultPhases = async () => {
    if (workPhases.length > 0) return;
    const db = (window as any).firebase.firestore();
    const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
    for (let i = 0; i < DEFAULT_PHASES.length; i++) {
      await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name: DEFAULT_PHASES[i], description: '', status: 'Pendiente', order: i, startDate: '', endDate: '', createdAt: ts });
    }
    showToast('Fases inicializadas');
  };

  const updatePhaseStatus = async (phaseId: string, status: string) => {
    try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ status }); } catch {}
  };

  const saveApproval = async () => {
    const title = forms.appTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').add({ title, description: forms.appDesc || '', status: 'Pendiente', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid });
      showToast('Solicitud creada'); closeModal('approval'); setForms(p => ({ ...p, appTitle: '', appDesc: '' }));
    } catch { showToast('Error', 'error'); }
  };

  const updateApproval = async (id: string, status: string) => {
    try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).update({ status }); showToast('Estado actualizado'); } catch {}
  };

  const deleteApproval = async (id: string) => { if (!confirm('¿Eliminar aprobación?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).delete(); showToast('Eliminada'); } catch {} };

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
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
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

  const deleteInvProduct = async (id: string) => { if (!confirm('¿Eliminar este producto del inventario?')) return; try { await (window as any).firebase.firestore().collection('invProducts').doc(id).delete(); showToast('Producto eliminado'); } catch {} };

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
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
      const data = { name, color: forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length], description: forms.invCatDesc || '', createdAt: ts };
      if (editingId) { await db.collection('invCategories').doc(editingId).update(data); showToast('Categoría actualizada'); }
      else { await db.collection('invCategories').add(data); showToast('Categoría creada'); }
      closeModal('invCategory'); setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteInvCategory = async (id: string) => { if (!confirm('¿Eliminar categoría?')) return; try { await (window as any).firebase.firestore().collection('invCategories').doc(id).delete(); showToast('Categoría eliminada'); } catch {} };
  const openEditInvCategory = (c: any) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };

  const saveInvMovement = async () => {
    const productId = forms.invMovProduct || '';
    const qty = Number(forms.invMovQty) || 0;
    const warehouse = forms.invMovWarehouse || 'Almacén Principal';
    if (!productId || qty <= 0) { showToast('Selecciona producto, almacén y cantidad', 'error'); return; }
    try {
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
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

  const deleteInvMovement = async (id: string) => { if (!confirm('¿Eliminar movimiento?')) return; try { await (window as any).firebase.firestore().collection('invMovements').doc(id).delete(); showToast('Movimiento eliminado'); } catch {} };

  const saveInvTransfer = async () => {
    const productId = forms.invTrProduct || '';
    const qty = Number(forms.invTrQty) || 0;
    const from = forms.invTrFrom || '';
    const to = forms.invTrTo || '';
    if (!productId || !from || !to || from === to || qty <= 0) { showToast('Completa todos los campos y asegúrate que los almacenes sean diferentes', 'error'); return; }
    try {
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
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

  const deleteInvTransfer = async (id: string) => { if (!confirm('¿Eliminar registro de transferencia?')) return; try { await (window as any).firebase.firestore().collection('invTransfers').doc(id).delete(); showToast('Transferencia eliminada'); } catch {} };

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

  const navigateTo = (s: string, projId?: string | null) => {
    setScreen(s);
    setSelectedProjectId(projId ?? selectedProjectId);
    setSidebarOpen(false);
    if (s !== 'chat') setChatMobileShow(false);
    useUIStore.getState().setCurrentScreen(s);
  };
  navigateToRef.current = navigateTo;

  // Meeting functions
  const saveMeeting = async () => {
    const title = forms.meetTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
      const data = { title, description: forms.meetDesc || '', projectId: forms.meetProject || '', date: forms.meetDate || '', time: forms.meetTime || '09:00', duration: Number(forms.meetDuration) || 60, attendees: forms.meetAttendees ? forms.meetAttendees.split(',').map((s: string) => s.trim()).filter(Boolean) : [], createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('meetings').doc(editingId).update(data); showToast('Reunión actualizada'); }
      else { await db.collection('meetings').add(data); showToast('Reunión creada'); }
      closeModal('meeting'); setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' }));
    } catch { showToast('Error', 'error'); }
  };
  const deleteMeeting = async (id: string) => { if (!confirm('¿Eliminar reunión?')) return; try { await (window as any).firebase.firestore().collection('meetings').doc(id).delete(); showToast('Reunión eliminada'); } catch {} };
  const openEditMeeting = (m: any) => { setEditingId(m.id); setForms(f => ({ ...f, meetTitle: m.data.title, meetProject: m.data.projectId || '', meetDate: m.data.date || '', meetTime: m.data.time || '09:00', meetDuration: String(m.data.duration || 60), meetDesc: m.data.description || '', meetAttendees: (m.data.attendees || []).join(', ') })); openModal('meeting'); };
  const openProject = (id: string) => { setSelectedProjectId(id); setScreen('projectDetail'); useUIStore.getState().setCurrentScreen('projectDetail'); };

  // Gallery functions
  const saveGalleryPhoto = async () => {
    const imageData = forms.galleryImageData || '';
    if (!imageData) { showToast('Selecciona una foto', 'error'); return; }
    try {
      const db = (window as any).firebase.firestore();
      const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp();
      const data = { projectId: forms.galleryProject || '', categoryName: forms.galleryCategory || 'Otro', caption: forms.galleryCaption || '', imageData, createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); }
      else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); }
      closeModal('gallery'); setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' }));
    } catch { showToast('Error al guardar foto', 'error'); }
  };

  const deleteGalleryPhoto = async (id: string) => { if (!confirm('¿Eliminar foto de la galería?')) return; try { await (window as any).firebase.firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch {} };

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

  /* ===== LOADING SCREEN ===== */
  if (!ready || loading) return (
    <div className="flex items-center justify-center h-dvh bg-background" style={{ height: '100dvh' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[var(--af-accent)]/30 border-t-[var(--af-accent)] rounded-full animate-spin" />
        <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-[var(--af-accent)]">ArchiFlow</div>
      </div>
    </div>
  );

  /* ===== AUTH SCREEN ===== */
  if (!authUser) return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6">
      <div className="bg-[var(--card)] border border-[var(--input)] rounded-2xl p-8 w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-[var(--af-accent)] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">ArchiFlow</span>
        </div>
        {!forms.showRegister ? (<>
          <div className="text-xl font-semibold mb-1">Bienvenido de vuelta</div>
          <div className="text-sm text-[var(--muted-foreground)] mb-7">Ingresa con tu cuenta para continuar</div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Correo electrónico</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="tu@correo.com" value={forms.loginEmail || ''} onChange={e => setForms(p => ({ ...p, loginEmail: e.target.value }))} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Contraseña</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="password" placeholder="Mínimo 6 caracteres" value={forms.loginPass || ''} onChange={e => setForms(p => ({ ...p, loginPass: e.target.value }))} />
          </div>
          <button className="w-full bg-[var(--af-accent)] text-background border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors" onClick={doLogin}>Ingresar</button>
          <div className="flex items-center gap-3 my-4 text-xs text-[var(--af-text3)]"><div className="flex-1 h-px bg-[var(--border)]" />o<div className="flex-1 h-px bg-[var(--border)]" /></div>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5" onClick={doGoogleLogin}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar con Google
          </button>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5 mt-2" onClick={doMicrosoftLogin}>
            <svg viewBox="0 0 21 21" className="w-[18px] h-[18px]"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Continuar con Microsoft
          </button>
          <div className="text-center mt-5 text-sm text-[var(--af-text3)]">¿No tienes cuenta? <a className="text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => setForms(p => ({ ...p, showRegister: true }))}>Regístrate</a></div>
        </>) : (<>
          <div className="text-xl font-semibold mb-1">Crear cuenta</div>
          <div className="text-sm text-[var(--muted-foreground)] mb-7">Únete a tu equipo en ArchiFlow</div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre completo</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Tu nombre" value={forms.regName || ''} onChange={e => setForms(p => ({ ...p, regName: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Correo electrónico</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="email" placeholder="tu@correo.com" value={forms.regEmail || ''} onChange={e => setForms(p => ({ ...p, regEmail: e.target.value }))} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Contraseña</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="password" placeholder="Mínimo 6 caracteres" value={forms.regPass || ''} onChange={e => setForms(p => ({ ...p, regPass: e.target.value }))} onKeyDown={e => e.key === 'Enter' && doRegister()} />
          </div>
          <button className="w-full bg-[var(--af-accent)] text-background border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors" onClick={doRegister}>Crear cuenta</button>
          <div className="flex items-center gap-3 my-4 text-xs text-[var(--af-text3)]"><div className="flex-1 h-px bg-[var(--border)]" />o<div className="flex-1 h-px bg-[var(--border)]" /></div>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5" onClick={doGoogleLogin}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Registrarse con Google
          </button>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5 mt-2" onClick={doMicrosoftLogin}>
            <svg viewBox="0 0 21 21" className="w-[18px] h-[18px]"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Registrarse con Microsoft
          </button>
          <div className="text-center mt-5 text-sm text-[var(--af-text3)]">¿Ya tienes cuenta? <a className="text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => setForms(p => ({ ...p, showRegister: false }))}>Ingresar</a></div>
        </>)}
      </div>
    </div>
  );

  /* ===== MAIN APP ===== */
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: 'projects', label: 'Proyectos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, badge: projects.length },
    { id: 'tasks', label: 'Tareas', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'chat', label: 'Chat', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { divider: true },
    { id: 'budget', label: 'Presupuestos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg> },
    { id: 'files', label: 'Planos y archivos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { id: 'obra', label: 'Seguimiento obra', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
    { id: 'gallery', label: 'Galería', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, badge: galleryPhotos.length > 0 ? galleryPhotos.length : undefined },
    { id: 'inventory', label: 'Inventario', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, badge: invLowStock.length > 0 ? invLowStock.length : undefined },
    { divider: true },
    { id: 'admin', label: 'Panel Admin', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="22"/></svg> },
    { id: 'suppliers', label: 'Proveedores', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
    { id: 'team', label: 'Equipo', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, badge: teamUsers.length },
    { id: 'calendar', label: 'Calendario', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, badge: tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length > 0 ? tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length : undefined },
    { id: 'portal', label: 'Portal cliente', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { divider: true },
    { id: 'profile', label: 'Mi Perfil', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'install', label: 'Instalar App', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
  ];

  const screenTitles: Record<string, string> = { dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes', budget: 'Presupuestos', files: 'Planos y archivos', gallery: 'Galería', inventory: 'Inventario', admin: 'Panel Admin', obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo', calendar: 'Calendario', portal: 'Portal cliente', profile: 'Mi Perfil', install: 'Instalar App', projectDetail: currentProject?.data.name || 'Proyecto' };

  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Usuario';
  const initials = getInitials(userName);

  /* ===== RENDER ===== */
  return (
    <div className="flex h-dvh overflow-hidden" style={{ height: '100dvh' }}>
      {/* Toast */}
      {toast && <div className={`af-toast ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white`}>{toast.msg}</div>}

      {/* Install Banner (Android/Chrome Desktop) */}
      {showInstallBanner && installPrompt && !isStandalone && (
        <div className="fixed top-0 left-0 right-0 z-[200] p-3 sm:p-4 animate-slideIn" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
          <div className="max-w-lg mx-auto bg-[var(--card)] border border-[var(--af-accent)]/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-[var(--af-accent)] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">Instalar ArchiFlow</div>
                <div className="text-[12.5px] text-[var(--muted-foreground)] mt-0.5">Accede más rápido desde tu pantalla de inicio o escritorio</div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={handleInstall}>
                    Instalar app
                  </button>
                  <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[var(--af-bg3)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors" onClick={dismissInstallBanner}>
                    Ahora no
                  </button>
                </div>
              </div>
              <button className="w-9 h-9 flex items-center justify-center text-[var(--af-text3)] cursor-pointer hover:text-[var(--foreground)] flex-shrink-0" onClick={dismissInstallBanner}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full w-[270px] bg-[var(--card)] border-r border-[var(--border)] flex flex-col flex-shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--af-accent)] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div><div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg">ArchiFlow</div><div className="text-[10px] text-[var(--af-text3)]">v1.0</div></div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3">
          <div className="text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mb-1">Principal</div>
          {navItems.filter(n => !n.divider).slice(0, 4).map(n => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--accent)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span className="flex-1">{n.label}</span>
              {n.badge !== undefined && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${n.id === 'tasks' && pendingCount > 0 ? 'bg-red-500 text-white' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{n.badge}</span>}
            </div>
          ))}
          <div className="text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mt-4 mb-1">Gestión</div>
          {navItems.filter(n => !n.divider).slice(4).map(n => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--accent)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span>{n.label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-3 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => navigateTo('profile')}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${avatarColor(authUser?.uid)} ${authUser?.photoURL ? '' : ''}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
          <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{userName}</div><div className="text-[11px] text-[var(--muted-foreground)]">{(() => { const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro'; const displayRole = isEmailAdmin ? 'Admin' : myRole; return `${ROLE_ICONS[displayRole] || '👤'} ${displayRole}`; })()}</div></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
          <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] items-center justify-center cursor-pointer md:hidden flex" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {screen === 'projectDetail' ? (
            <button className="flex items-center gap-1.5 text-[var(--af-accent)] text-sm font-medium cursor-pointer hover:underline mr-2" onClick={() => navigateTo('projects')}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Proyectos
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium truncate">{screenTitles[screen] || ''}</div>
            <div className="text-xs text-[var(--muted-foreground)] hidden md:block">
              {screen === 'dashboard' ? `Bienvenido, ${userName.split(' ')[0]}` : screen === 'projectDetail' ? currentProject?.data.status || '' : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button
              className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all relative"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              title="Notificaciones"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {notifPermission === 'default' && (
                <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
            {/* Theme toggle */}
            <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all" onClick={toggleTheme} title={(darkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche') + ' (Ctrl+D)'}>
              {darkMode ? (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            {screen === 'projects' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' })); openModal('project'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo proyecto
              </button>
            )}
            {screen === 'tasks' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nueva tarea
              </button>
            )}
            {screen === 'suppliers' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, supName: '', supCategory: 'Otro', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' })); openModal('supplier'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo proveedor
              </button>
            )}
            <div className={`w-9 h-9 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border flex-shrink-0 ${avatarColor(authUser?.uid)}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
          </div>
        </header>

        {/* Auto Notification Permission Banner */}
        {showNotifBanner && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[var(--af-accent)]/10 via-[var(--af-accent)]/5 to-transparent border-b border-[var(--af-accent)]/20 animate-fadeIn">
            <div className="text-xl flex-shrink-0">🔔</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">Activar notificaciones</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Recibe alertas de chat, tareas, reuniones, inventario y más — incluso cuando la app esté cerrada</div>
            </div>
            <button className="px-4 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>
              Activar ahora
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer flex-shrink-0 border-none bg-transparent" onClick={dismissNotifBanner}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* In-App Notification Toasts (bottom-right) */}
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
          {inAppNotifs.map(n => (
            <div key={n.id} className="pointer-events-auto bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-2xl flex items-start gap-3 animate-slideUp cursor-pointer hover:border-[var(--af-accent)]/30 transition-all" style={{ width: '340px', maxWidth: 'calc(100vw - 32px)' }} onClick={() => { markNotifRead(n.id); if (n.screen) navigateTo(n.screen, n.itemId); }}>
              <div className="text-lg flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight">{n.title}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2 leading-snug">{n.body}</div>
              </div>
              <button className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0 bg-transparent border-none cursor-pointer mt-0.5" onClick={(e) => { e.stopPropagation(); setInAppNotifs(prev => prev.filter(x => x.id !== n.id)); }}>
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Notification Dropdown Panel */}
        {showNotifPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
            <div className="absolute right-2 sm:right-4 top-[60px] z-[60] w-[calc(100vw-16px)] sm:w-[400px] max-h-[85dvh] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col" style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold">Notificaciones</div>
                    {unreadCount > 0 && <span className="min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{unreadCount}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={markAllNotifRead}>
                        Leer todas
                      </button>
                    )}
                    <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:text-red-400" onClick={clearNotifHistory}>
                      Limpiar
                    </button>
                  </div>
                </div>
                {/* Category filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  {[
                    { key: 'all', label: 'Todo', emoji: '🔔' },
                    { key: 'chat', label: 'Chat', emoji: '💬' },
                    { key: 'task', label: 'Tareas', emoji: '📋' },
                    { key: 'meeting', label: 'Reuniones', emoji: '📅' },
                    { key: 'inventory', label: 'Inventario', emoji: '📦' },
                    { key: 'project', label: 'Proyectos', emoji: '📁' },
                    { key: 'approval', label: 'Aprob.', emoji: '✅' },
                    { key: 'reminder', label: 'Record.', emoji: '⏰' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${notifFilterCat === f.key ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                      onClick={() => setNotifFilterCat(f.key)}
                    >{f.emoji} {f.label}</button>
                  ))}
                </div>
              </div>

              {/* Permission prompt */}
              {notifPermission !== 'granted' && (
                <div className="p-4 bg-amber-500/5 border-b border-[var(--border)] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">🔔</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">Activar notificaciones del sistema</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">Para recibir alertas incluso con la app cerrada</div>
                    </div>
                    <button className="px-3 py-1.5 bg-[var(--af-accent)] text-background rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>
                      Activar
                    </button>
                  </div>
                </div>
              )}

              {/* Notification list */}
              <div className="overflow-y-auto flex-1 min-h-0">
                {(() => {
                  const filtered = notifFilterCat === 'all' ? notifHistory : notifHistory.filter(n => n.type === notifFilterCat);
                  if (filtered.length === 0) return (
                    <div className="p-8 text-center">
                      <div className="text-3xl mb-2">🔔</div>
                      <div className="text-sm text-[var(--muted-foreground)]">{notifFilterCat === 'all' ? 'Sin notificaciones' : 'Sin notificaciones de esta categoría'}</div>
                      <div className="text-[11px] text-[var(--af-text3)] mt-1">Las alertas aparecerán aquí</div>
                    </div>
                  );
                  return filtered.slice(0, 50).map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[var(--af-bg3)] border-b border-[var(--border)]/50 ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}
                      onClick={() => {
                        markNotifRead(n.id);
                        if (n.screen) {
                          navigateTo(n.screen, n.itemId);
                          setShowNotifPanel(false);
                        }
                      }}
                    >
                      <div className="text-base flex-shrink-0 mt-0.5">{n.icon || '🔔'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`text-[13px] leading-snug ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</div>
                          {n.type && <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${({chat:'bg-blue-500/10 text-blue-400',task:'bg-purple-500/10 text-purple-400',meeting:'bg-amber-500/10 text-amber-400',inventory:'bg-emerald-500/10 text-emerald-400',project:'bg-cyan-500/10 text-cyan-400',approval:'bg-pink-500/10 text-pink-400',reminder:'bg-red-500/10 text-red-400'} as any)[n.type] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{n.type}</span>}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="text-[10px] text-[var(--af-text3)] mt-1">
                          {(() => {
                            const d = new Date(n.timestamp);
                            const now = new Date();
                            const diff = now.getTime() - d.getTime();
                            if (diff < 60000) return 'Ahora mismo';
                            if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
                            if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
                            return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                          })()}
                        </div>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--af-accent)] flex-shrink-0 mt-2" />}
                    </div>
                  ));
                })()}
              </div>

              {/* Settings footer */}
              <div className="p-3 border-t border-[var(--border)] bg-[var(--af-bg3)] flex-shrink-0">
                <div className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Configurar alertas</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'chat', label: '💬 Chat' },
                    { key: 'tasks', label: '📋 Tareas' },
                    { key: 'meetings', label: '📅 Reuniones' },
                    { key: 'approvals', label: '✅ Aprobaciones' },
                    { key: 'inventory', label: '📦 Inventario' },
                    { key: 'projects', label: '📁 Proyectos' },
                  ].map(p => (
                    <button
                      key={p.key}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifPrefs[p.key] ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                      onClick={() => toggleNotifPref(p.key)}
                    >
                      {p.label}
                      {notifPrefs[p.key] && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifSound ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                      onClick={() => setNotifSound(!notifSound)}
                    >🔊 Sonido</button>
                    <span className="text-[10px] text-[var(--af-text3)]">
                      {notifPermission === 'granted' ? '✅ OS activas' : notifPermission === 'denied' ? '❌ OS bloqueadas' : '⏳ Sin activar OS'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--af-text3)]">
                    {notifHistory.length} total
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <main id="main-content" className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`} style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}>

          {/* ===== DASHBOARD ===== */}
          {screen === 'dashboard' && (<div className="animate-fadeIn space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[{ val: projects.length, lbl: 'Proyectos totales', color: '' }, { val: projects.filter(p => p.data.status === 'Ejecucion').length, lbl: 'En ejecución', color: '' }, { val: pendingCount, lbl: 'Tareas pendientes', color: '' }, { val: tasks.filter(t => t.data.status === 'Completado').length, lbl: 'Completadas', color: 'text-emerald-400' }].map((m, i) => (
                <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5"><div className={`text-2xl md:text-[28px] font-semibold ${m.color}`}>{m.val}</div><div className="text-xs text-[var(--muted-foreground)]">{m.lbl}</div></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">Proyectos recientes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('projects')}>Ver todos</button></div>
                {projects.length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">Crea tu primer proyecto</div> : projects.slice(0, 3).map(p => {
                  const prog = p.data.progress || 0;
                  return (<div key={p.id} className="p-3 bg-[var(--af-bg3)] rounded-lg mb-2 cursor-pointer" onClick={() => openProject(p.id)}>
                    <div className="flex justify-between mb-2"><div className="text-sm font-semibold">{p.data.name}</div><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(p.data.status)}`}>{p.data.status}</span></div>
                    <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} /></div>
                    <div className="flex justify-between mt-1.5"><span className="text-[11px] text-[var(--af-text3)]">{prog}%</span>{p.data.endDate && <span className="text-[11px] text-[var(--af-text3)]">{fmtDate(p.data.endDate)}</span>}</div>
                  </div>);
                })}
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">Tareas urgentes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('tasks')}>Ver todas</button></div>
                {tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas urgentes</div> : tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').slice(0, 4).map(t => {
                  const proj = projects.find(p => p.id === t.data.projectId);
                  return (<div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer hover:border-[var(--af-accent)]" onClick={() => toggleTask(t.id, t.data.status)} />
                    <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium">{t.data.title}</div><div className="text-[11px] text-[var(--af-text3)] mt-0.5">{proj?.data.name || '—'}{t.data.assigneeId ? ' · ' + getUserName(t.data.assigneeId) : ''}</div></div>
                  </div>);
                })}
              </div>
            </div>
          </div>)}

          {/* ===== PROJECTS ===== */}
          {screen === 'projects' && (<div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 overflow-x-auto">
                {[{ k: 'Todos', v: '' }, { k: 'Concepto', v: 'Concepto' }, { k: 'Diseño', v: 'Diseno' }, { k: 'Ejecución', v: 'Ejecucion' }, { k: 'Terminados', v: 'Terminado' }].map((tab, i) => {
                  const count = tab.v ? projects.filter(p => p.data.status === tab.v).length : projects.length;
                  return (<button key={tab.k} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${(forms.projFilter || '') === tab.v ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, projFilter: tab.v }))}>{tab.k} ({count})</button>);
                })}
              </div>
              <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { setEditingId(null); openModal('project'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo proyecto
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">📁</div><div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proyectos</div><div className="text-[13px]">Crea tu primer proyecto</div></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.filter(p => !forms.projFilter || p.data.status === forms.projFilter).map(p => {
                  const d = p.data, prog = d.progress || 0;
                  return (<div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 cursor-pointer transition-all hover:border-[var(--input)] hover:-translate-y-0.5 relative overflow-hidden" onClick={() => openProject(p.id)}>
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--af-accent)] opacity-0 transition-opacity hover:!opacity-100" />
                    <div className="flex justify-between items-start mb-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>{d.status || 'Concepto'}</span>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button className="px-2.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => openEditProject(p)}>✏️</button>
                        <button className="px-2.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer hover:bg-red-500/20" onClick={() => deleteProject(p.id)}>🗑</button>
                      </div>
                    </div>
                    <div className="text-[15px] font-semibold mb-1">{d.name}</div>
                    <div className="text-xs text-[var(--af-text3)] mb-3">{d.location ? '📍 ' + d.location : ''}{d.client ? ' · ' + d.client : ''}</div>
                    <div className="flex gap-4 mb-3">
                      <div><div className="text-lg font-semibold">{prog}%</div><div className="text-[10px] text-[var(--af-text3)]">Progreso</div></div>
                      <div><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(d.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
                    </div>
                    <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} /></div>
                  </div>);
                })}
              </div>
            )}
          </div>)}

          {/* ===== PROJECT DETAIL ===== */}
          {screen === 'projectDetail' && currentProject && (<div className="animate-fadeIn space-y-4">
            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(currentProject.data.status)}`}>{currentProject.data.status}</span>
                  <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl mt-2">{currentProject.data.name}</div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">{currentProject.data.location && '📍 ' + currentProject.data.location}{currentProject.data.client ? ' · ' + currentProject.data.client : ''}</div>
                  {currentProject.data.description && <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">{currentProject.data.description}</div>}
                </div>
                <div className="flex gap-3">
                  <div className="text-center"><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(currentProject.data.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
                  <div className="text-center"><div className="text-lg font-semibold text-emerald-400">{fmtCOP(projectSpent)}</div><div className="text-[10px] text-[var(--af-text3)]">Gastado</div></div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${(currentProject.data.progress || 0) >= 80 ? 'bg-emerald-500' : (currentProject.data.progress || 0) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: (currentProject.data.progress || 0) + '%' }} /></div>
                <input type="number" min="0" max="100" className="w-14 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--foreground)] outline-none text-center focus:border-[var(--af-accent)]" value={currentProject.data.progress || 0} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); updateProjectProgress(v); }} />
                <span className="text-sm font-medium text-[var(--muted-foreground)]">%</span>
              </div>
              {projectBudget > 0 && <div className="mt-3 text-xs text-[var(--muted-foreground)]">{projectSpent > projectBudget ? <span className="text-red-400 font-medium">⚠️ Excedido por {fmtCOP(projectSpent - projectBudget)}</span> : `Restante: ${fmtCOP(projectBudget - projectSpent)} (${Math.round((projectSpent / projectBudget) * 100)}% del presupuesto)`}</div>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
              {['Resumen', 'Tareas', 'Presupuesto', 'Archivos', 'Obra', 'Portal'].map(tab => (
                <button key={tab} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${forms.detailTab === tab ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, detailTab: tab }))}>{tab}</button>
              ))}
            </div>

            {/* Tab: Resumen */}
            {forms.detailTab === 'Resumen' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-4">Información</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Cliente</span><span>{currentProject.data.client || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Ubicación</span><span>{currentProject.data.location || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Inicio</span><span>{currentProject.data.startDate || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Entrega</span><span>{currentProject.data.endDate || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Presupuesto</span><span className="text-[var(--af-accent)] font-semibold">{fmtCOP(currentProject.data.budget)}</span></div>
                </div>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-4">Actividad reciente</div>
                {projectTasks.filter(t => t.data.status !== 'Completado').slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <div className={`w-2 h-2 rounded-full ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 text-sm truncate">{t.data.title}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                  </div>
                ))}
                {projectTasks.filter(t => t.data.status !== 'Completado').length === 0 && <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin tareas pendientes</div>}
              </div>
            </div>)}

            {/* Tab: Tareas */}
            {forms.detailTab === 'Tareas' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{projectTasks.length} tareas en este proyecto</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskProject: selectedProjectId, taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>+ Nueva tarea</button>
              </div>
              {projectTasks.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">✅</div><div className="text-sm">Sin tareas en este proyecto</div></div> :
              projectTasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center hover:border-[var(--af-accent)] ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : ''}" onClick={() => toggleTask(t.id, t.data.status)}>{t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
                    <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                      {t.data.dueDate && <span>📅 {fmtDate(t.data.dueDate)}</span>}
                      {t.data.assigneeId && <span>👤 {getUserName(t.data.assigneeId)}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>✎</button>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}>✕</button>
                </div>
              ))}
            </div>)}

            {/* Tab: Presupuesto */}
            {forms.detailTab === 'Presupuesto' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{projectExpenses.length} gastos · Total: <span className="text-[var(--af-accent)] font-semibold">{fmtCOP(projectSpent)}</span> {projectBudget > 0 && <span>de {fmtCOP(projectBudget)}</span>}</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, expConcept: '', expProject: selectedProjectId, expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); openModal('expense'); }}>+ Registrar gasto</button>
              </div>
              {projectBudget > 0 && <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-2"><span className="text-[var(--muted-foreground)]">Presupuesto utilizado</span><span className="font-semibold">{Math.min(100, Math.round((projectSpent / projectBudget) * 100))}%</span></div>
                <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${projectSpent > projectBudget ? 'bg-red-500' : projectSpent > projectBudget * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: Math.min(100, (projectSpent / projectBudget) * 100) + '%' }} /></div>
              </div>}
              {projectExpenses.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">💰</div><div className="text-sm">Sin gastos registrados</div></div> :
              <div className="space-y-2">
                {projectExpenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.data.concept}</div><div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div></div>
                    <div className="text-sm font-semibold text-[var(--af-accent)]">{fmtCOP(e.data.amount)}</div>
                    <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteExpense(e.id)}>✕</button>
                  </div>
                ))}
              </div>}
            </div>)}

            {/* Tab: Archivos */}
            {forms.detailTab === 'Archivos' && (<div>
              {/* OneDrive Section */}
              {msConnected && (
                <div className="mb-4">
                  {!showOneDrive ? (
                    <button className="w-full bg-gradient-to-r from-[#00a4ef] to-[#7fba00] text-white border-none rounded-xl py-3 text-sm font-semibold cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2" onClick={() => currentProject && openOneDriveForProject(currentProject.data.name)}>
                      <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
                      Abrir en OneDrive — {currentProject?.data.name}
                    </button>
                  ) : (
                    <div className="bg-[#00a4ef]/5 border border-[#00a4ef]/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#00a4ef"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#00a4ef"/></svg>
                          <span className="text-sm font-semibold text-[#00a4ef]">OneDrive — {currentProject?.data.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 bg-[#00a4ef] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#0091d5] transition-colors">
                            + Subir a OneDrive
                            <input type="file" className="hidden" onChange={async (e) => {
                              const file = e.target?.files?.[0];
                              if (file && odProjectFolder) {
                                await uploadToOneDrive(file, odProjectFolder);
                                e.target.value = '';
                              }
                            }} />
                          </label>
                          <button className="text-xs px-2 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { setShowOneDrive(false); setOneDriveFiles([]); }}>✕ Cerrar</button>
                        </div>
                      </div>
                      {msLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-[#00a4ef]/30 border-t-[#00a4ef] rounded-full animate-spin mr-2" />
                          <span className="text-xs text-[var(--muted-foreground)]">Cargando...</span>
                        </div>
                      ) : oneDriveFiles.length === 0 ? (
                        <div className="text-center py-8 text-[var(--af-text3)]">
                          <div className="text-3xl mb-2">☁️</div>
                          <div className="text-sm">Carpeta vacía en OneDrive</div>
                          <div className="text-xs mt-1">Sube archivos para sincronizarlos con este proyecto</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {oneDriveFiles.filter((f: any) => !f.folder).map((f: any) => (
                            <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 hover:border-[#00a4ef]/30 transition-all group flex items-center gap-3">
                              <div className="w-9 h-9 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-base flex-shrink-0">
                                {f.name?.endsWith('.pdf') ? '📄' : f.name?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? '🖼️' : f.name?.match(/\.(doc|docx)$/i) ? '📝' : f.name?.match(/\.(xls|xlsx)$/i) ? '📊' : f.name?.match(/\.(dwg|dxf)$/i) ? '📐' : f.name?.match(/\.(zip|rar)$/i) ? '📦' : '📎'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{f.name}</div>
                                <div className="text-[10px] text-[var(--af-text3)]">{fmtSize(f.size || 0)}</div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {f.webUrl && <a href={f.webUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#00a4ef] px-1.5 py-0.5 rounded hover:underline">Abrir</a>}
                                <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => odProjectFolder && deleteFromOneDrive(f.id, odProjectFolder)}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{projectFiles.length} archivos locales</div>
                <div>
                  <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => document.getElementById('file-upload-input')?.click()}>
                    + Subir archivo
                  </button>
                  <input id="file-upload-input" type="file" style={{ display: 'none' }} onChange={uploadFile} />
                </div>
              </div>
              {projectFiles.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">📂</div><div className="text-sm">Sin archivos subidos</div></div> :
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectFiles.map(f => (
                  <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-lg">
                        {f.type?.startsWith('image/') ? '🖼️' : f.type === 'application/pdf' ? '📄' : f.type?.includes('video') ? '🎬' : '📎'}
                      </div>
                      <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => deleteFile(f)}>✕</button>
                    </div>
                    <div className="text-sm font-medium truncate mb-0.5">{f.name}</div>
                    <div className="text-[11px] text-[var(--af-text3)]">{fmtSize(f.size)}</div>
                    {f.type?.startsWith('image/') && f.data && <div className="mt-2"><img src={f.data} alt={f.name} className="w-full h-24 object-cover rounded-lg border border-[var(--border)]" /></div>}
                    {f.data && <a href={f.data} download={f.name} className="text-[11px] text-[var(--af-accent)] mt-2 inline-block hover:underline">Descargar archivo</a>}
                  </div>
                ))}
              </div>}
            </div>)}

            {/* Tab: Obra */}
            {forms.detailTab === 'Obra' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">{workPhases.length} fases de obra</div>
                {workPhases.length === 0 && <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={initDefaultPhases}>Inicializar fases</button>}
              </div>
              {workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Haz clic en &quot;Inicializar fases&quot; para comenzar el seguimiento</div></div> :
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--input)]" />
                {workPhases.map(phase => {
                  const isActive = phase.data.status === 'En progreso', isDone = phase.data.status === 'Completado';
                  return (<div key={phase.id} className="relative mb-5">
                    <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--card)] ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)] shadow-[0_0_0_3px_rgba(200,169,110,0.2)]' : 'bg-[var(--af-bg4)] border-[var(--input)]'}`} />
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="text-sm font-semibold">{phase.data.name}</div>
                        <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-md px-2 py-1 text-xs text-[var(--foreground)] outline-none cursor-pointer" value={phase.data.status} onChange={e => updatePhaseStatus(phase.id, e.target.value)}>
                          <option value="Pendiente">Pendiente</option><option value="En progreso">En progreso</option><option value="Completado">Completado</option>
                        </select>
                      </div>
                      {phase.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{phase.data.description}</div>}
                      <div className="flex items-center gap-3 text-[11px] text-[var(--af-text3)]">
                        {phase.data.startDate && <span>Inicio: {phase.data.startDate}</span>}
                        {phase.data.endDate && <span>Fin: {phase.data.endDate}</span>}
                      </div>
                    </div>
                  </div>);
                })}
              </div>}
            </div>)}

            {/* Tab: Portal */}
            {forms.detailTab === 'Portal' && (<div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--muted-foreground)]">Vista del cliente</div>
                <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, appTitle: '', appDesc: '' })); openModal('approval'); }}>+ Nueva aprobación</button>
              </div>
              {/* Client summary */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl mb-2">{currentProject.data.name}</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-3">{currentProject.data.description || 'Sin descripción'}</div>
                <div className="flex items-center gap-3 mb-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(currentProject.data.status)}`}>{currentProject.data.status}</span><span className="text-sm font-medium">{currentProject.data.progress || 0}% completado</span></div>
                <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: (currentProject.data.progress || 0) + '%' }} /></div>
              </div>
              {/* Work phases for client */}
              {workPhases.length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div className="text-[15px] font-semibold mb-3">Fases del proyecto</div>
                <div className="space-y-2">
                  {workPhases.map(ph => (
                    <div key={ph.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-3 h-3 rounded-full ${ph.data.status === 'Completado' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
                      <span className="text-sm flex-1">{ph.data.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ph.data.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{ph.data.status}</span>
                    </div>
                  ))}
                </div>
              </div>)}
              {/* Files gallery */}
              {projectFiles.filter(f => f.type?.startsWith('image/')).length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                <div className="text-[15px] font-semibold mb-3">Galería</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {projectFiles.filter(f => f.type?.startsWith('image/')).map(f => (
                    <a key={f.id} href={f.data} download={f.name}><img src={f.data} alt={f.name} className="w-full aspect-square object-cover rounded-lg border border-[var(--border)] hover:border-[var(--af-accent)] transition-all" /></a>
                  ))}
                </div>
              </div>)}
              {/* Approvals */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[15px] font-semibold mb-3">Aprobaciones</div>
                {approvals.length === 0 ? <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin solicitudes de aprobación</div> :
                approvals.map(a => (
                  <div key={a.id} className="border border-[var(--border)] rounded-lg p-3 mb-2">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-semibold">{a.data.title}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.data.status === 'Aprobado' ? 'bg-emerald-500/10 text-emerald-400' : a.data.status === 'Rechazado' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.data.status}</span>
                    </div>
                    {a.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{a.data.description}</div>}
                    {a.data.status === 'Pendiente' && (
                      <div className="flex gap-2 mt-2">
                        <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-emerald-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Aprobado')}>✓ Aprobar</button>
                        <button className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-red-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Rechazado')}>✕ Rechazar</button>
                        <button className="ml-auto text-xs text-[var(--af-text3)] cursor-pointer hover:text-red-400" onClick={() => deleteApproval(a.id)}>Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>)}
          </div>)}

          {/* ===== TASKS ===== */}
          {screen === 'tasks' && (<div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1">
                <button className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${(forms.taskView || 'list') === 'list' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, taskView: 'list' }))}>Lista</button>
                <button className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${(forms.taskView || 'list') === 'kanban' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, taskView: 'kanban' }))}>Kanban</button>
              </div>
              <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva tarea
              </button>
            </div>
            {(forms.taskView || 'list') === 'list' ? (
              tasks.length === 0 ? <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">✅</div><div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin tareas</div></div> :
              ['Alta', 'Media', 'Baja'].map(prio => {
                const group = tasks.filter(t => t.data.priority === prio);
                if (!group.length) return null;
                return (<div key={prio} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
                  <div className={`text-xs font-semibold mb-3 ${prio === 'Alta' ? 'text-red-400' : prio === 'Media' ? 'text-amber-400' : 'text-emerald-400'}`}>{prio === 'Alta' ? '🔴' : prio === 'Media' ? '🟡' : '🟢'} Prioridad {prio}</div>
                  {group.map(t => {
                    const proj = projects.find(p => p.id === t.data.projectId);
                    return (<div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center hover:border-[var(--af-accent)] ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : ''}" onClick={() => toggleTask(t.id, t.data.status)}>{t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
                        <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                          {proj && <span>{proj.data.name}</span>}
                          {t.data.dueDate && <span>📅 {fmtDate(t.data.dueDate)}</span>}
                          {t.data.assigneeId && <span className="flex items-center gap-1"><span className={`w-4 h-4 rounded-full text-[7px] font-semibold flex items-center justify-center ${avatarColor(t.data.assigneeId)}`}>{getInitials(getUserName(t.data.assigneeId))}</span>{getUserName(t.data.assigneeId)}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button className="text-xs px-2.5 py-1.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>✎</button>
                        <button className="text-xs px-2.5 py-1.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteTask(t.id)}>✕</button>
                      </div>
                    </div>);
                  })}
                </div>);
              })
            ) : (
              <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory">
                {['Por hacer', 'En progreso', 'Revision', 'Completado'].map(status => {
                  const col = tasks.filter(t => t.data.status === status);
                  const dot = status === 'Completado' ? 'bg-emerald-500' : status === 'En progreso' ? 'bg-blue-500' : status === 'Revision' ? 'bg-amber-500' : 'bg-[var(--af-text3)]';
                  return (<div key={status} className="flex-shrink-0 w-[240px] snap-start bg-[var(--af-bg3)] rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${dot}`} /><span className="text-[13px] font-semibold">{status}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{col.length}</span></div>
                    {col.map(t => {
                      const proj = projects.find(p => p.id === t.data.projectId);
                      return (<div key={t.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 mb-2 cursor-pointer hover:border-[var(--input)] hover:-translate-y-0.5 transition-all" onClick={() => openEditTask(t)}>
                        <div className="text-[13px] font-medium mb-1">{t.data.title}</div>
                        <div className="text-[11px] text-[var(--af-text3)] mb-2">{proj?.data.name || '—'}</div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                          {t.data.assigneeId && <span className={`w-4 h-4 rounded-full text-[7px] font-semibold flex items-center justify-center ${avatarColor(t.data.assigneeId)}`}>{getInitials(getUserName(t.data.assigneeId))}</span>}
                        </div>
                      </div>);
                    })}
                  </div>);
                })}
              </div>
            )}
          </div>)}

          {/* ===== CHAT ===== */}
          {screen === 'chat' && (<div className="animate-fadeIn flex flex-col md:h-full pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0" style={{ minHeight: 0, flex: 1 }}>

            {/* Lista de conversaciones */}
            <div className={`${chatMobileShow ? 'hidden' : 'flex'} flex-col flex-1 md:w-[260px] md:flex-shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--card)] md:bg-transparent`}>
              <div className="p-3 border-b border-[var(--border)]">
                <div className="relative">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none flex-shrink-0 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Buscar conversaciones..." value={forms.chatSearch || ''} onChange={e => setForms(p => ({ ...p, chatSearch: e.target.value }))} />
                </div>
              </div>
              {/* Chat General */}
              <div className={`p-3.5 border-b border-[var(--border)] cursor-pointer transition-colors ${chatProjectId === '__general__' ? 'bg-[var(--accent)] border-r-2 border-r-[var(--af-accent)]' : 'hover:bg-[var(--af-bg3)]'}`} onClick={() => { setChatProjectId('__general__'); setChatMobileShow(true); }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-base flex-shrink-0">💬</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">Chat General</div>
                    <div className="text-[11px] text-[var(--af-text3)] truncate">Canal de todo el equipo</div>
                  </div>
                </div>
              </div>
              {/* Project chats */}
              {projects.length === 0 ? <div className="p-6 text-center text-[var(--af-text3)] text-sm">Crea un proyecto primero</div> :
              projects.filter(p => !forms.chatSearch || p.data.name.toLowerCase().includes((forms.chatSearch || '').toLowerCase())).map(p => (
                <div key={p.id} className={`p-3.5 border-b border-[var(--border)] cursor-pointer transition-colors ${p.id === chatProjectId ? 'bg-[var(--accent)] border-r-2 border-r-[var(--af-accent)]' : 'hover:bg-[var(--af-bg3)]'}`} onClick={() => { setChatProjectId(p.id); setChatMobileShow(true); }}>
                  <div className="text-[13px] font-medium">{p.data.name}</div>
                  <div className="text-[11px] text-[var(--af-text3)] truncate">{p.data.client ? 'Cliente: ' + p.data.client : 'Canal del equipo'}</div>
                </div>
              ))}
            </div>

            {/* Area de mensajes */}
            <div className={`${chatMobileShow ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-background`}>
              <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] flex-shrink-0 bg-[var(--card)]">
                <button className="w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => setChatMobileShow(false)}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" style={{stroke:'currentColor',fill:'none'}} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{chatProjectId === '__general__' ? '💬 Chat General' : projects.find(p => p.id === chatProjectId)?.data.name || 'Selecciona un proyecto'}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{chatProjectId === '__general__' ? 'Canal de todo el equipo' : chatProjectId ? 'Canal del equipo' : ''}</div>
                </div>
              </div>

              <div id="chat-msgs" className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3"
                onDragOver={(e) => { e.preventDefault(); setChatDropActive(true); }}
                onDragLeave={() => setChatDropActive(false)}
                onDrop={(e) => { e.preventDefault(); setChatDropActive(false); if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files); }}
                onPaste={(e) => { const items = e.clipboardData?.items; if (items) { const imgs: File[] = []; for (let i = 0; i < items.length; i++) { if (items[i].type.startsWith('image/')) { const f = items[i].getAsFile(); if (f) imgs.push(f); } } if (imgs.length > 0) { e.preventDefault(); handleFileSelect(imgs as unknown as FileList); } } }}
              >
                {chatDropActive && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--af-accent)]/5 border-2 border-dashed border-[var(--af-accent)]/40 rounded-xl m-4"><div className="text-center"><div className="text-4xl mb-2">📎</div><div className="text-sm font-medium text-[var(--af-accent)]">Suelta archivos aquí</div></div></div>)}
                {messages.length === 0 ? <div className="text-center py-10 text-[var(--af-text3)] text-[13px]">Sin mensajes. ¡Saluda al equipo!</div> :
                messages.map(m => {
                  const isMe = m.uid === authUser?.uid;
                  const ts = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
                  const msgType = m.type || 'TEXT';
                  return (<div key={m.id} className={`max-w-[80%] ${isMe ? 'self-end' : ''}`}>
                    <div className={`text-[10px] text-[var(--af-text3)] mb-1 ${isMe ? 'text-right' : ''}`}>{isMe ? 'Tú' : (m.userName || 'Equipo')} · {ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    {msgType === 'TEXT' && m.text && (<div className={`px-3 py-2.5 text-[13px] leading-relaxed ${isMe ? 'bg-[var(--accent)] text-[var(--af-accent2)] border border-[var(--af-accent)]/20 rounded-xl rounded-br-sm' : 'bg-[var(--af-bg3)] text-[var(--foreground)] rounded-xl rounded-bl-sm'}`}>{m.text.split('\n').map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</div>)}
                    {msgType === 'AUDIO' && m.audioData && (<div className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? 'bg-[var(--accent)] border border-[var(--af-accent)]/20 rounded-xl rounded-br-sm' : 'bg-[var(--af-bg3)] rounded-xl rounded-bl-sm'}`}>
                      <audio id={'audio-' + m.id} src={m.audioData} preload="metadata" className="hidden" />
                      <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer border-none transition-transform active:scale-95" style={{ background: playingAudio === m.id ? 'var(--af-accent)' : 'var(--af-bg4)' }} onClick={() => toggleAudioPlay(m.id)}>
                        {playingAudio === m.id ? (<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>) : (<svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>)}
                      </button>
                      <div className="flex-1 min-w-0"><div className="flex gap-0.5 items-end h-5">{Array.from({ length: 28 }).map((_, i) => (<div key={i} className="w-[3px] rounded-full transition-all duration-100" style={{ height: (i % 3 === 0 ? '6px' : i % 3 === 1 ? '12px' : '18px'), backgroundColor: playingAudio === m.id && ((i / 28) * 100 <= audioProgress) ? 'var(--af-accent)' : 'var(--border)' }} />))}</div><div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{m.audioDuration ? fmtRecTime(m.audioDuration) : '0:00'}</div></div>
                      <div className="text-[9px]">🎙️</div>
                    </div>)}
                    {msgType === 'IMAGE' && m.fileData && (<div className={`rounded-xl overflow-hidden ${isMe ? 'border border-[var(--af-accent)]/20' : 'border border-[var(--border)]'}`}><img src={m.fileData} alt={m.fileName || 'Imagen'} className="max-w-full max-h-[300px] object-cover cursor-pointer rounded-xl" onClick={() => { if (m.fileData) { const w = window.open(''); if (w) w.document.write(`<img src="${m.fileData}" style="max-width:100vw;max-height:100vh;" />`); } }} />{m.fileName && <div className="text-[10px] text-[var(--muted-foreground)] px-2 py-1 bg-[var(--af-bg3)]">{m.fileName}{m.fileSize ? ` · ${fmtFileSize(m.fileSize)}` : ''}</div>}</div>)}
                    {msgType === 'FILE' && m.fileData && (<div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? 'bg-[var(--accent)] border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)] border border-[var(--border)]'}`}>
                      <div className="text-2xl flex-shrink-0">{fileIcon(m.fileType || '')}</div>
                      <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{m.fileName || 'Archivo'}</div>{m.fileSize && <div className="text-[10px] text-[var(--muted-foreground)]">{fmtFileSize(m.fileSize)}</div>}</div>
                      <a href={m.fileData} download={m.fileName || 'archivo'} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--af-bg4)] hover:bg-[var(--af-accent)]/10 transition-colors flex-shrink-0" title="Descargar"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
                    </div>)}
                  </div>);
                })}
              </div>
              {isRecording && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-red-500/5 flex items-center gap-3"><div className="flex items-end gap-[3px]">{[recVolume * 28 + 4, recVolume * 22 + 6, recVolume * 32 + 3, recVolume * 18 + 5].map((h, i) => (<div key={i} className="w-[3px] bg-red-500 rounded-full animate-pulse" style={{ height: `${Math.max(h, 4)}px` }} />))}</div><span className="text-[13px] text-red-500 font-mono font-medium">{fmtRecTime(recDuration)}</span><button className="ml-auto text-[11px] px-3 py-1 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent" onClick={cancelRecording}>Cancelar</button></div>)}
              {audioPreviewUrl && !isRecording && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-accent)]/5 flex items-center gap-3"><div className="text-[20px]">🎙️</div><div className="flex-1 min-w-0"><div className="text-[12px] font-medium text-[var(--muted-foreground)]">Nota de voz</div><div className="text-[10px] text-[var(--af-text3)]">{fmtRecTime(audioPreviewDuration)}</div></div><button className="text-[11px] px-3 py-1 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent" onClick={() => { setAudioPreviewUrl(null); audioPreviewBlobRef.current = null; }}>Descartar</button><button className="text-[11px] px-3 py-1 rounded-full bg-[var(--af-accent)] text-background font-semibold cursor-pointer border-none" onClick={sendVoiceNote}>Enviar</button></div>)}
              {pendingFiles.length > 0 && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-bg3)]"><div className="flex gap-2 overflow-x-auto pb-1">{pendingFiles.map(f => (<div key={f.id} className="flex-shrink-0 w-[72px] h-[72px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 relative overflow-hidden">{f.preview ? <img src={f.preview} className="w-full h-full object-cover rounded" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{fileIcon(f.type)}</div>}<button className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full text-[11px] flex items-center justify-center cursor-pointer border-none leading-none" onClick={() => removePendingFile(f.id)}>✕</button><div className="absolute bottom-0 inset-x-0 bg-black/50 text-[8px] text-white truncate px-0.5 py-px">{f.name}</div></div>))}</div></div>)}
              <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card)]">
                <div className="flex gap-1.5 items-end px-2.5 py-2.5 safe-bottom">
                  <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => handleFileSelect(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.dwg,.txt,.csv" />
                  <button className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49 0L2 12.05"/><circle cx="17" cy="5" r="3"/></svg></button>
                  <input id="chat-input-field" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-full px-4 py-2.5 text-[16px] text-[var(--foreground)] outline-none focus:border-[var(--input)] min-w-0" placeholder="Escribe un mensaje..." value={forms.chatInput || ''} onChange={e => setForms(p => ({ ...p, chatInput: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAll(); } }} />
                  <button className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none flex-shrink-0 transition-all ${isRecording ? 'bg-red-500 animate-pulse' : audioPreviewUrl ? 'bg-[var(--af-accent)]' : 'bg-transparent hover:bg-[var(--af-bg3)]'}`} onClick={handleMicButton} title={isRecording ? 'Detener grabación' : audioPreviewUrl ? 'Descartar nota' : 'Grabar nota de voz'}>
                    {isRecording ? (<div className="w-3 h-3 bg-white rounded-sm" />) : (<svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={audioPreviewUrl ? 'var(--background)' : 'none'} stroke={audioPreviewUrl ? 'none' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>)}
                  </button>
                  <button className="w-9 h-9 rounded-full bg-[var(--af-accent)] flex items-center justify-center cursor-pointer border-none flex-shrink-0 active:scale-95 transition-transform" onClick={sendAll} title="Enviar"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-background fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                </div>
              </div>
            </div>
          </div>)}

          {/* ===== GLOBAL BUDGET ===== */}
          {screen === 'budget' && (<div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="text-sm text-[var(--muted-foreground)]">{expenses.length} gastos registrados</div>
              <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, expConcept: '', expProject: '', expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); openModal('expense'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Registrar gasto
              </button>
                <button className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors" onClick={() => {
                  const q = '"';
                  const dq = '""';
                  const headers = ['Concepto', 'Proyecto', 'Categoría', 'Monto', 'Fecha'];
                  const esc = (v: string) => q + String(v).split(q).join(dq) + q;
                  const rows = expenses.map(e => [e.data.concept, projects.find(p => p.id === e.data.projectId)?.data?.name || '—', e.data.category, e.data.amount, e.data.date]);
                  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'presupuesto_' + new Date().toISOString().split('T')[0] + '.csv'; a.click(); URL.revokeObjectURL(url);
                  showToast('Presupuesto exportado a CSV');
                }}>
                  📥 Exportar CSV
                </button>
            </div>
            {expenses.length === 0 ? <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">💰</div><div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin gastos</div></div> :
            (() => {
              const byProject: Record<string, Expense[]> = {};
              expenses.forEach(e => { const k = e.data.projectId || '_none'; if (!byProject[k]) byProject[k] = []; byProject[k].push(e); });
              return Object.entries(byProject).map(([pid, exps]) => {
                const proj = projects.find(p => p.id === pid);
                const total = exps.reduce((s, e) => s + (Number(e.data.amount) || 0), 0);
                return (<div key={pid} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
                  <div className="flex justify-between items-center mb-3"><div className="text-[15px] font-semibold">{proj?.data.name || 'Sin proyecto'}</div><div className="text-[13px] font-semibold text-[var(--af-accent)]">{fmtCOP(total)} total</div></div>
                  {exps.map(e => (
                    <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.data.concept}</div><div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div></div>
                      <div className="text-sm font-semibold text-[var(--af-accent)]">{fmtCOP(e.data.amount)}</div>
                      <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteExpense(e.id)}>✕</button>
                    </div>
                  ))}
                </div>);
              });
            })()}
          </div>)}

          {/* ===== GLOBAL FILES ===== */}
          {screen === 'files' && (<div className="animate-fadeIn">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[15px] font-semibold mb-3">Planos y archivos</div>
              <div className="text-center py-12 text-[var(--af-text3)]">
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm mb-3">Sube archivos desde la vista de cada proyecto</div>
                <div className="text-xs">Selecciona un proyecto para ver y gestionar sus archivos</div>
                {projects.length > 0 && (<div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {projects.map(p => (<button key={p.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] hover:border-[var(--input)] transition-all" onClick={() => { setSelectedProjectId(p.id); setForms(p => ({ ...p, detailTab: 'Archivos' })); navigateTo('projectDetail', p.id); }}>{p.data.name}</button>))}
                </div>)}
              </div>
            </div>
          </div>)}

          {/* ===== GLOBAL OBRA ===== */}
          {screen === 'obra' && (<div className="animate-fadeIn">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[15px] font-semibold mb-3">Seguimiento de obra</div>
              <div className="text-center py-12 text-[var(--af-text3)]">
                <div className="text-3xl mb-2">🏗️</div>
                <div className="text-sm mb-3">Selecciona un proyecto en ejecución para ver su seguimiento</div>
                {projects.filter(p => p.data.status === 'Ejecucion').length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {projects.filter(p => p.data.status === 'Ejecucion').map(p => (<button key={p.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] hover:border-[var(--input)] transition-all" onClick={() => { setSelectedProjectId(p.id); setForms(p => ({ ...p, detailTab: 'Obra' })); navigateTo('projectDetail', p.id); }}>{p.data.name}</button>))}
                  </div>
                ) : <div className="text-xs mt-2">No hay proyectos en ejecución</div>}
              </div>
            </div>
          </div>)}

          {/* ===== SUPPLIERS ===== */}
          {screen === 'suppliers' && (<div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="text-sm text-[var(--muted-foreground)]">{suppliers.length} proveedores</div>
              <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { setEditingId(null); openModal('supplier'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo proveedor
              </button>
            </div>
            {suppliers.length === 0 ? (
              <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">🏪</div><div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proveedores</div><div className="text-[13px]">Agrega tu primer proveedor</div></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map(s => (
                  <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-11 h-11 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg flex items-center justify-center text-lg">🏪</div>
                      <div className="flex gap-1.5">
                        <button className="px-1.5 py-0.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer" onClick={() => { setEditingId(s.id); setForms(p => ({ ...p, supName: s.data.name, supCategory: s.data.category, supPhone: s.data.phone, supEmail: s.data.email, supAddress: s.data.address, supWebsite: s.data.website, supNotes: s.data.notes, supRating: String(s.data.rating) })); openModal('supplier'); }}>✏️</button>
                        <button className="px-1.5 py-0.5 rounded bg-red-500/10 text-xs cursor-pointer" onClick={() => deleteSupplier(s.id)}>🗑</button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold mb-0.5">{s.data.name}</div>
                    <div className="text-[11px] text-[var(--af-text3)] mb-2">{s.data.category}</div>
                    <div className="text-[11px] text-[var(--af-accent)] mb-2">{'★'.repeat(s.data.rating || 5)}{'☆'.repeat(5 - (s.data.rating || 5))}</div>
                    <div className="text-xs text-[var(--muted-foreground)] space-y-0.5">
                      {s.data.phone && <div>📞 {s.data.phone}</div>}
                      {s.data.email && <div>✉️ {s.data.email}</div>}
                      {s.data.address && <div>📍 {s.data.address}</div>}
                      {s.data.website && <div>🌐 {s.data.website}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}

          {/* ===== TEAM MANAGEMENT ===== */}
          {screen === 'team' && (<div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="text-sm text-[var(--muted-foreground)]">{teamUsers.length} miembros en el equipo</div>
            </div>
            {/* Role Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {USER_ROLES.slice(0, 4).map(role => {
                const count = teamUsers.filter(u => u.data.role === role).length;
                return (
                  <div key={role} className={`border rounded-xl p-3 text-center ${ROLE_COLORS[role]}`}>
                    <div className="text-lg mb-0.5">{ROLE_ICONS[role]}</div>
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-[10px] font-medium">{role}s</div>
                  </div>
                );
              })}
            </div>
            {/* Team Members List */}
            <div className="space-y-2">
              {teamUsers.map(user => {
                const role = user.data.role || 'Miembro';
                const isMe = user.id === authUser?.uid;
                const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro';
                const canChangeRole = myRole === 'Admin' || myRole === 'Director';
                const userTasks = tasks.filter(t => t.data.assigneeId === user.id);
                const userPending = userTasks.filter(t => t.data.status !== 'Completado').length;
                return (
                  <div key={user.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all ${isMe ? 'ring-1 ring-[var(--af-accent)]/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold border-2 ${avatarColor(user.id)} flex-shrink-0`} style={user.data.photoURL ? { backgroundImage: `url(${user.data.photoURL})`, backgroundSize: 'cover' } : {}}>
                        {user.data.photoURL ? '' : getInitials(user.data.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold">{user.data.name}</span>
                          {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">Tú</span>}
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>{ROLE_ICONS[role]} {role}</span>
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] truncate">{user.data.email}</div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-[var(--af-text3)]">{userTasks.length} tareas</span>
                          <span className="text-[10px] text-[var(--af-text3)]">{userPending} pendientes</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {canChangeRole && !isMe ? (
                          <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--foreground)] outline-none cursor-pointer" value={role} onChange={e => updateUserRole(user.id, e.target.value)}>
                            {USER_ROLES.map(r => <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>)}
                          </select>
                        ) : isMe ? (
                          <span className="text-[10px] text-[var(--af-text3)]">Tu rol</span>
                        ) : (
                          <span className="text-[10px] text-[var(--af-text3)]">{role}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>)}

          {/* ===== CALENDAR ===== */}
          {screen === 'calendar' && (() => {
            const today = new Date();
            const firstDay = new Date(calYear, calMonth, 1);
            const lastDay = new Date(calYear, calMonth + 1, 0);
            const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
            const daysInMonth = lastDay.getDate();
            const calTasks = tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado' && (calFilterProject === 'all' || t.data.projectId === calFilterProject));
            const todayStr = today.toISOString().split('T')[0];
            const getTasksForDay = (day: number) => {
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return calTasks.filter(t => t.data.dueDate === dateStr);
            };
            const selectedDayTasks = calSelectedDate ? calTasks.filter(t => t.data.dueDate === calSelectedDate) : [];
            const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } setCalSelectedDate(null); };
            const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } setCalSelectedDate(null); };

            // Build calendar grid
            const cells: (number | null)[] = [];
            for (let i = 0; i < startDow; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);

            return (<div className="animate-fadeIn">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={prevMonth}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--muted-foreground)] fill-none" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div className="text-[15px] font-semibold min-w-[120px] sm:min-w-[160px] text-center">{MESES[calMonth]} {calYear}</div>
                  <button className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={nextMonth}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--muted-foreground)] fill-none" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--foreground)] outline-none cursor-pointer" value={calFilterProject} onChange={e => setCalFilterProject(e.target.value)}>
                    <option value="all">Todos los proyectos</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
                  </select>
                  <button className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); setCalSelectedDate(today.toISOString().split('T')[0]); }}>Hoy</button>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2"><button className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border border-purple-500/20" onClick={() => { setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: calSelectedDate || new Date().toISOString().split('T')[0], meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' })); openModal('meeting'); }}>+ Reunión</button><span className="text-[11px] text-purple-400/70">{meetings.filter(m => m.data.date && m.data.date.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`)).length} este mes</span></div>
                <button className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); setCalSelectedDate(today.toISOString().split('T')[0]); }}>Hoy</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-red-500/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-red-400">{calTasks.filter(t => t.data.priority === 'Alta').length}</div>
                  <div className="text-[9px] text-red-400/70">Urgentes</div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-amber-400">{calTasks.filter(t => { const d = t.data.dueDate; return d && new Date(d) < today; }).length}</div>
                  <div className="text-[9px] text-amber-400/70">Vencidas</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-blue-400">{calTasks.filter(t => { const d = t.data.dueDate; if (!d) return false; const diff = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000); return diff >= 0 && diff <= 7; }).length}</div>
                  <div className="text-[9px] text-blue-400/70">Esta semana</div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-[var(--border)]">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{d}</div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7">
                  {cells.map((day, idx) => {
                    if (day === null) return <div key={`e-${idx}`} className="min-h-[70px] sm:min-h-[90px] border-b border-r border-[var(--border)] bg-[var(--af-bg3)]/30" />;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    const isSelected = calSelectedDate === dateStr;
                    const dayTasks = getTasksForDay(day);
                    const isPast = new Date(dateStr) < new Date(today.toISOString().split('T')[0]);
                    return (
                      <div key={day} className={`min-h-[70px] sm:min-h-[90px] border-b border-r border-[var(--border)] p-1 sm:p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--af-accent)]/10' : 'hover:bg-[var(--af-bg3)]'} ${isPast && !isToday ? 'opacity-70' : ''}`} onClick={() => setCalSelectedDate(dateStr)}>
                        <div className={`text-[11px] sm:text-[13px] font-medium mb-0.5 ${isToday ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--af-accent)] text-background flex items-center justify-center' : 'text-[var(--foreground)]'}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 3).map(t => {
                            const proj = projects.find(p => p.id === t.data.projectId);
                            const isOverdue = new Date(t.data.dueDate) < today;
                            return (
                              <div key={t.id} className={`text-[8px] sm:text-[9px] leading-tight px-1 py-0.5 rounded truncate ${t.data.priority === 'Alta' ? 'bg-red-500/15 text-red-400' : t.data.priority === 'Media' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`} title={t.data.title}>
                                {isOverdue ? '⚡ ' : ''}{t.data.title}
                              </div>
                            );
                          })}
                          {dayTasks.length > 3 && <div className="text-[8px] text-[var(--muted-foreground)] pl-1">+{dayTasks.length - 3} más</div>}
                          {meetings.filter(m => m.data.date === dateStr).map(m => <div key={m.id} className="text-[8px] sm:text-[9px] leading-tight px-1 py-0.5 rounded truncate bg-purple-500/15 text-purple-400" title={`📅 ${m.data.title} (${m.data.time})`}>📅 {m.data.time}</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected day detail */}
              {calSelectedDate && (
                <div className="mt-4 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[14px] font-semibold">
                      {(() => { const parts = calSelectedDate.split('-'); return `${parseInt(parts[2])} de ${MESES[parseInt(parts[1]) - 1]} ${parts[0]}`; })()}
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedDayTasks.length === 0 ? 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]' : 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]'}`}>
                      {selectedDayTasks.length} tarea{selectedDayTasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {selectedDayTasks.length === 0 ? (
                    <div className="text-center py-6 text-[var(--af-text3)]"><div className="text-2xl mb-1">📅</div><div className="text-sm">Sin tareas pendientes para este día</div></div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayTasks.sort((a, b) => {
                        const pOrder = { Alta: 0, Media: 1, Baja: 2 };
                        return (pOrder[a.data.priority as keyof typeof pOrder] || 1) - (pOrder[b.data.priority as keyof typeof pOrder] || 1);
                      }).map(t => {
                        const proj = projects.find(p => p.id === t.data.projectId);
                        const isOverdue = new Date(t.data.dueDate) < today;
                        return (
                          <div key={t.id} className={`border rounded-lg p-3 ${isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-[var(--border)] bg-[var(--af-bg3)]'}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="text-[13px] font-medium">{t.data.title}</div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-[var(--af-text3)]">
                              {proj && <span>📁 {proj.data.name}</span>}
                              <span>👤 {getUserName(t.data.assigneeId)}</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reuniones del día seleccionado */}
                  {(() => {
                    const dayMeetings = meetings.filter(m => m.data.date === calSelectedDate);
                    if (dayMeetings.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[12px] font-semibold text-purple-400">📅 Reuniones ({dayMeetings.length})</div>
                          <button className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 cursor-pointer border border-purple-500/20 hover:bg-purple-500/20 transition-colors" onClick={() => { setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: calSelectedDate || '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' })); openModal('meeting'); }}>+ Nueva</button>
                        </div>
                        <div className="space-y-2">
                          {dayMeetings.sort((a, b) => (a.data.time || '').localeCompare(b.data.time || '')).map(m => {
                            const meetProj = projects.find(p => p.id === m.data.projectId);
                            return (
                              <div key={m.id} className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="text-[13px] font-medium">{m.data.title}</div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)]" onClick={() => openEditMeeting(m)}>✏️</button>
                                    <button className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteMeeting(m.id)}>✕</button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-[var(--af-text3)]">
                                  <span>🕐 {m.data.time || '09:00'} · {m.data.duration || 60} min</span>
                                  {meetProj && <span>📁 {meetProj.data.name}</span>}
                                </div>
                                {m.data.attendees && m.data.attendees.length > 0 && (
                                  <div className="text-[10px] text-[var(--af-text3)] mt-1">👥 {Array.isArray(m.data.attendees) ? m.data.attendees.join(', ') : m.data.attendees}</div>
                                )}
                                {m.data.description && <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">{m.data.description}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>);
          })()}

          {/* ===== GLOBAL PORTAL ===== */}
          {screen === 'portal' && (<div className="animate-fadeIn">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[15px] font-semibold mb-3">Portal del cliente</div>
              <div className="text-center py-12 text-[var(--af-text3)]">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-sm mb-3">Comparte actualizaciones con tus clientes desde cada proyecto</div>
                {projects.length > 0 && (<div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {projects.map(p => (<button key={p.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] hover:border-[var(--input)] transition-all" onClick={() => { setSelectedProjectId(p.id); setForms(p => ({ ...p, detailTab: 'Portal' })); navigateTo('projectDetail', p.id); }}>{p.data.name}</button>))}
                </div>)}
              </div>
            </div>
          </div>)}


              {/* ===== GALLERY ===== */}
          {screen === 'gallery' && (<div className="animate-fadeIn p-4 sm:p-6 space-y-4">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold">📸 Galería de proyectos</h2>
      <p className="text-sm text-[var(--muted-foreground)]">{getFilteredGalleryPhotos().length} foto{getFilteredGalleryPhotos().length !== 1 ? 's' : ''}</p>
    </div>
    <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' })); openModal('gallery'); }}>
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Agregar foto
    </button>
  </div>

  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-2">
    <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={galleryFilterProject} onChange={e => setGalleryFilterProject(e.target.value)}>
      <option value="all">Todos los proyectos</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
    </select>
    <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={galleryFilterCat} onChange={e => setGalleryFilterCat(e.target.value)}>
      <option value="all">Todas las categorías</option>
      {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>

  {/* Photo Grid */}
  {getFilteredGalleryPhotos().length === 0 ? (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🖼️</div>
      <div className="text-[var(--muted-foreground)]">No hay fotos en la galería</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">Agrega fotos de tus proyectos para documentar el progreso</div>
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
      {getFilteredGalleryPhotos().map((photo, idx) => {
        const proj = projects.find(p => p.id === photo.data.projectId);
        return (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)]/50 transition-all" onClick={() => openLightbox(photo, idx)}>
            <img src={photo.data.imageData} alt={photo.data.caption || 'Foto'} className="w-full h-full object-cover" loading="lazy" />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                {photo.data.caption && <div className="text-xs text-white font-medium truncate">{photo.data.caption}</div>}
                <div className="flex items-center gap-1 mt-0.5">
                  {proj && <span className="text-[10px] text-white/70 truncate">{proj.data.name}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white/90">{photo.data.categoryName}</span>
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <button className="w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs hover:bg-red-500 transition-colors" onClick={e => { e.stopPropagation(); deleteGalleryPhoto(photo.id); }}>✕</button>
              </div>
            </div>
            {/* Category badge always visible */}
            <div className="absolute top-1.5 left-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/40 text-white/90 backdrop-blur-sm">{photo.data.categoryName}</span>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>)}


          {/* ===== INVENTORY SECTION ===== */}
          {screen === 'inventory' && (<div className="animate-fadeIn p-4 sm:p-6">
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {[{ id: 'dashboard' as const, label: '📊 Panel' }, { id: 'products' as const, label: '📦 Productos' }, { id: 'categories' as const, label: '🏷️ Categorías' }, { id: 'warehouse' as const, label: '🏢 Almacén' }, { id: 'movements' as const, label: '📋 Movimientos' }, { id: 'transfers' as const, label: '🔄 Transferencias' }, { id: 'reports' as const, label: '📊 Reportes' }].map(tab => (
                <button key={tab.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${invTab === tab.id ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setInvTab(tab.id)}>
                  {tab.label}
                  {tab.id === 'dashboard' && invAlerts.length > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center">{invAlerts.length}</span>}
                  {tab.id === 'transfers' && invPendingTransfers > 0 && <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center">{invPendingTransfers}</span>}
                </button>
              ))}
            </div>

            {/* ===== Dashboard Tab ===== */}
            {invTab === 'dashboard' && (<div className="space-y-4">
              <h3 className="text-lg font-semibold">📊 Panel de Inventario</h3>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-2xl font-bold text-[var(--af-accent)]">{invProducts.length}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Productos totales</div>
                </div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-2xl font-bold text-blue-400">{fmtCOP(invTotalValue)}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Valor total</div>
                </div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-2xl font-bold text-emerald-400">{invTotalStock.toLocaleString('es-CO')}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Unidades en stock</div>
                </div>
                <div className={`rounded-xl p-4 border ${invAlerts.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
                  <div className={`text-2xl font-bold ${invAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{invAlerts.length}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Alertas activas</div>
                </div>
              </div>
              {/* Alerts Section */}
              {invAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-400">⚠️ Alertas activas</h4>
                  {invAlerts.map((alert, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2.5 border flex items-center gap-2 ${alert.severity === 'critical' ? 'bg-red-500/15 border-red-500/30' : alert.severity === 'high' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{alert.severity === 'critical' ? 'CRÍTICO' : alert.severity === 'high' ? 'ALTO' : 'MEDIO'}</span>
                      <span className="text-sm">{alert.msg}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Warehouse Overview */}
              <div>
                <h4 className="text-sm font-semibold mb-2">🏢 Stock por almacén</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {INV_WAREHOUSES.map(wh => {
                    const whStock = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh), 0);
                    const whValue = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh) * (Number(p.data.price) || 0), 0);
                    const whProducts = invProducts.filter(p => getWarehouseStock(p, wh) > 0).length;
                    return (
                      <div key={wh} className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                        <div className="text-sm font-semibold">{wh}</div>
                        <div className="text-xl font-bold text-[var(--af-accent)] mt-1">{whStock.toLocaleString('es-CO')}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{whProducts} productos · {fmtCOP(whValue)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Recent Movements */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Últimos movimientos</h4>
                {invMovements.length === 0 ? (
                  <div className="text-center py-6 text-[var(--muted-foreground)] text-sm">Sin movimientos</div>
                ) : (
                  <div className="space-y-1.5">
                    {invMovements.slice(0, 6).map(m => (
                      <div key={m.id} className="flex items-center justify-between bg-[var(--af-bg3)] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '↓' : '↑'}</span>
                          <div>
                            <div className="text-sm font-medium">{getInvProductName(m.data.productId)}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">{m.data.warehouse || '—'}{m.data.reason ? ` · ${m.data.reason}` : ''}</div>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '+' : '-'}{m.data.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Categories */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Por categoría</h4>
                {invCategories.length === 0 ? (
                  <div className="text-center py-4 text-[var(--muted-foreground)] text-sm">Sin categorías</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {invCategories.map(c => {
                      const cp = invProducts.filter(p => p.data.categoryId === c.id);
                      const cv = cp.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
                      return (
                        <div key={c.id} className="bg-[var(--af-bg3)] rounded-lg p-3 border border-[var(--border)]">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.data.color }} />
                            <span className="text-xs font-medium truncate">{c.data.name}</span>
                          </div>
                          <div className="text-lg font-bold">{cp.length}</div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">{fmtCOP(cv)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>)}

            {/* ===== Products Tab ===== */}
            {invTab === 'products' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">📦 Productos ({invProducts.length})</h3>
                <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); const rf: Record<string,any> = { invProdName: '', invProdSku: '', invProdCat: '', invProdUnit: 'Unidad', invProdPrice: '', invProdMinStock: '5', invProdDesc: '', invProdImage: '', invProdWarehouse: 'Almacén Principal' }; INV_WAREHOUSES.forEach(w => { rf[`invProdWS_${w.replace(/\s/g,'_')}`] = '0'; }); setForms(p => ({ ...p, ...rf })); openModal('invProduct'); }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nuevo producto
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Buscar producto..." value={invSearch} onChange={e => setInvSearch(e.target.value)} />
                </div>
                <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={invFilterCat} onChange={e => setInvFilterCat(e.target.value)}>
                  <option value="all">Todas las categorías</option>
                  {invCategories.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}
                </select>
              </div>
              {invProducts.filter(p => {
                const ms = !invSearch || p.data.name.toLowerCase().includes(invSearch.toLowerCase()) || (p.data.sku || '').toLowerCase().includes(invSearch.toLowerCase());
                const mc = invFilterCat === 'all' || p.data.categoryId === invFilterCat;
                return ms && mc;
              }).length === 0 ? (
                <div className="text-center py-12"><div className="text-4xl mb-2">📦</div><div className="text-[var(--muted-foreground)]">No hay productos</div></div>
              ) : (
                <div className="space-y-2">
                  {invProducts.filter(p => {
                    const ms = !invSearch || p.data.name.toLowerCase().includes(invSearch.toLowerCase()) || (p.data.sku || '').toLowerCase().includes(invSearch.toLowerCase());
                    const mc = invFilterCat === 'all' || p.data.categoryId === invFilterCat;
                    return ms && mc;
                  }).map(p => {
                    const totalSt = getTotalStock(p);
                    const isLow = totalSt <= (Number(p.data.minStock) || 0);
                    const isOut = totalSt === 0;
                    return (
                      <div key={p.id} className={`bg-[var(--af-bg3)] rounded-xl p-3 sm:p-4 border ${isOut ? 'border-red-500/40' : isLow ? 'border-amber-500/30' : 'border-[var(--border)]'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            {p.data.imageData ? <img src={p.data.imageData} alt={p.data.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: (getInvCategoryColor(p.data.categoryId) || '#6b7280') + '20' }}><div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getInvCategoryColor(p.data.categoryId) }} /></div>}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold truncate">{p.data.name}</span>
                                {p.data.sku && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--muted-foreground)]">{p.data.sku}</span>}
                                {isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">AGOTADO</span>}
                                {isLow && !isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">⚠ Bajo</span>}
                              </div>
                              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{getInvCategoryName(p.data.categoryId)} · {p.data.unit}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button className="w-8 h-8 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer" onClick={() => openEditInvProduct(p)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvProduct(p.id)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                          </div>
                        </div>
                        {/* Per-warehouse stock breakdown */}
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {INV_WAREHOUSES.map(wh => {
                              const ws = getWarehouseStock(p, wh);
                              return (
                                <div key={wh} className="text-center">
                                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">{wh}</div>
                                  <div className={`text-sm font-bold ${ws === 0 ? 'text-red-400' : ws <= (Number(p.data.minStock) || 0) ? 'text-amber-400' : 'text-[var(--foreground)]'}`}>{ws}</div>
                                </div>
                              );
                            })}
                            <div className="text-center">
                              <div className="text-[10px] text-[var(--muted-foreground)]">Total</div>
                              <div className="text-sm font-bold text-[var(--af-accent)]">{totalSt}</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div><div className="text-[10px] text-[var(--muted-foreground)]">Precio unit.</div><div className="text-sm font-medium">{fmtCOP(Number(p.data.price) || 0)}</div></div>
                          <div><div className="text-[10px] text-[var(--muted-foreground)]">Valor total</div><div className="text-sm font-medium">{fmtCOP((Number(p.data.price) || 0) * totalSt)}</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>)}

            {/* ===== Categories Tab ===== */}
            {invTab === 'categories' && (<div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🏷️ Categorías ({invCategories.length})</h3>
                <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' })); openModal('invCategory'); }}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva categoría</button>
              </div>
              {invCategories.length === 0 ? (<div className="text-center py-12"><div className="text-4xl mb-2">🏷️</div><div className="text-[var(--muted-foreground)]">No hay categorías</div></div>) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {invCategories.map(c => {
                    const count = invProducts.filter(p => p.data.categoryId === c.id).length;
                    return (
                      <div key={c.id} className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (c.data.color || '#6b7280') + '20' }}><div className="w-5 h-5 rounded" style={{ backgroundColor: c.data.color }} /></div>
                            <div><div className="text-sm font-semibold">{c.data.name}</div><div className="text-xs text-[var(--muted-foreground)]">{count} producto{count !== 1 ? 's' : ''}</div>{c.data.description && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{c.data.description}</div>}</div>
                          </div>
                          <div className="flex gap-1">
                            <button className="w-8 h-8 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer" onClick={() => openEditInvCategory(c)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvCategory(c.id)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>)}

            {/* ===== Warehouse Tab ===== */}
            {invTab === 'warehouse' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">🏢 Almacenes</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-emerald-600 text-white border-none hover:bg-emerald-700" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Entrada', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' })); openModal('invMovement'); }}>+ Entrada</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-red-500 text-white border-none hover:bg-red-600" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Salida', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' })); openModal('invMovement'); }}>- Salida</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-blue-600 text-white border-none hover:bg-blue-700" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' })); openModal('invTransfer'); }}>🔄 Transferir</button>
                </div>
              </div>
              {/* Warehouse filter */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${invWarehouseFilter === 'all' ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)]'}`} onClick={() => setInvWarehouseFilter('all')}>Todos</button>
                {INV_WAREHOUSES.map(wh => <button key={wh} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${invWarehouseFilter === wh ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)]'}`} onClick={() => setInvWarehouseFilter(wh)}>{wh}</button>)}
              </div>
              {/* Warehouse cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {INV_WAREHOUSES.map(wh => {
                  if (invWarehouseFilter !== 'all' && invWarehouseFilter !== wh) return null;
                  const ws = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh), 0);
                  const wv = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh) * (Number(p.data.price) || 0), 0);
                  const wp = invProducts.filter(p => getWarehouseStock(p, wh) > 0).length;
                  return (
                    <div key={wh} className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                      <div className="text-sm font-semibold">{wh}</div>
                      <div className="text-2xl font-bold text-[var(--af-accent)] mt-1">{ws.toLocaleString('es-CO')}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{wp} productos · {fmtCOP(wv)}</div>
                    </div>
                  );
                })}
              </div>
              {/* Product stock by warehouse */}
              {(invWarehouseFilter === 'all' ? INV_WAREHOUSES : [invWarehouseFilter]).map(wh => (
                <div key={wh}>
                  <h4 className="text-sm font-semibold mb-2 mt-2">{wh}</h4>
                  <div className="space-y-1.5">
                    {invProducts.filter(p => getWarehouseStock(p, wh) > 0).sort((a, b) => getWarehouseStock(b, wh) - getWarehouseStock(a, wh)).map(p => {
                      const maxS = Math.max(...invProducts.map(x => getWarehouseStock(x, wh)), 1);
                      const pct = (getWarehouseStock(p, wh) / maxS) * 100;
                      return (
                        <div key={p.id} className="bg-[var(--af-bg3)] rounded-lg px-3 py-2.5 border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getInvCategoryColor(p.data.categoryId) }} />
                              <span className="text-sm">{p.data.name}</span>
                            </div>
                            <span className="text-sm font-bold">{getWarehouseStock(p, wh)} {p.data.unit}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                    {invProducts.filter(p => getWarehouseStock(p, wh) > 0).length === 0 && <div className="text-center py-4 text-sm text-[var(--muted-foreground)]">Sin stock en este almacén</div>}
                  </div>
                </div>
              ))}
            </div>)}

            {/* ===== Movements Tab ===== */}
            {invTab === 'movements' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">📋 Movimientos ({invMovements.length})</h3>
                <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-emerald-600 text-white border-none hover:bg-emerald-700 transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Entrada', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' })); openModal('invMovement'); }}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Registrar movimiento</button>
              </div>
              <div className="flex gap-2">
                <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={invMovFilterType} onChange={e => setInvMovFilterType(e.target.value)}><option value="all">Todos</option><option value="Entrada">Entradas</option><option value="Salida">Salidas</option></select>
                <select className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={invWarehouseFilter} onChange={e => setInvWarehouseFilter(e.target.value)}><option value="all">Todos los almacenes</option>{INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select>
              </div>
              {invMovements.filter(m => {
                const mt = invMovFilterType === 'all' || m.data.type === invMovFilterType;
                const mw = invWarehouseFilter === 'all' || m.data.warehouse === invWarehouseFilter;
                return mt && mw;
              }).length === 0 ? (<div className="text-center py-12"><div className="text-4xl mb-2">📋</div><div className="text-[var(--muted-foreground)]">Sin movimientos</div></div>) : (
                <div className="space-y-2">
                  {invMovements.filter(m => {
                    const mt = invMovFilterType === 'all' || m.data.type === invMovFilterType;
                    const mw = invWarehouseFilter === 'all' || m.data.warehouse === invWarehouseFilter;
                    return mt && mw;
                  }).map(m => (
                    <div key={m.id} className={`bg-[var(--af-bg3)] rounded-xl p-3 sm:p-4 border ${m.data.type === 'Entrada' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.data.type === 'Entrada' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}><span className={`text-lg font-bold ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '↓' : '↑'}</span></div>
                          <div>
                            <div className="text-sm font-semibold">{getInvProductName(m.data.productId)}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">{m.data.warehouse || '—'} · {m.data.quantity} uds{m.data.reference ? ` · Ref: ${m.data.reference}` : ''}</div>
                            {m.data.reason && <div className="text-[11px] text-[var(--muted-foreground)]">{m.data.reason}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right"><div className={`text-sm font-bold ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '+' : '-'}{m.data.quantity}</div><div className="text-[10px] text-[var(--muted-foreground)]">{m.data.date || ''}</div></div>
                          <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvMovement(m.id)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>)}

            {/* ===== Transfers Tab ===== */}
            {invTab === 'transfers' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">🔄 Transferencias ({invTransfers.length})</h3>
                <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-blue-600 text-white border-none hover:bg-blue-700 transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' })); openModal('invTransfer'); }}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>Nueva transferencia</button>
              </div>
              <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={invTransferFilterStatus} onChange={e => setInvTransferFilterStatus(e.target.value)}><option value="all">Todos los estados</option>{TRANSFER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              {invTransfers.filter(t => invTransferFilterStatus === 'all' || t.data.status === invTransferFilterStatus).length === 0 ? (
                <div className="text-center py-12"><div className="text-4xl mb-2">🔄</div><div className="text-[var(--muted-foreground)]">Sin transferencias</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Mueve productos entre almacenes</div></div>
              ) : (
                <div className="space-y-2">
                  {invTransfers.filter(t => invTransferFilterStatus === 'all' || t.data.status === invTransferFilterStatus).map(t => (
                    <div key={t.id} className="bg-[var(--af-bg3)] rounded-xl p-3 sm:p-4 border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center"><span className="text-lg">🔄</span></div>
                          <div>
                            <div className="text-sm font-semibold">{t.data.productName || getInvProductName(t.data.productId)}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              <span className="text-blue-400">{t.data.fromWarehouse}</span>
                              <span className="mx-1">→</span>
                              <span className="text-emerald-400">{t.data.toWarehouse}</span>
                              <span className="ml-1">· {t.data.quantity} uds</span>
                            </div>
                            {t.data.notes && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{t.data.notes}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.data.status === 'Completada' ? 'bg-emerald-500/15 text-emerald-400' : t.data.status === 'En tránsito' ? 'bg-blue-500/15 text-blue-400' : t.data.status === 'Cancelada' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{t.data.status}</span>
                          <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvTransfer(t.id)}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>)}

            {/* ===== Reports Tab ===== */}
            {invTab === 'reports' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">📊 Reportes</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)]" onClick={() => {
                    // Export products CSV
                    const headers = ['Nombre', 'SKU', 'Categoría', 'Unidad', 'Precio', 'Stock Total', 'Mín Stock', 'Valor Total'];
                    const rows = invProducts.map(p => [p.data.name, p.data.sku || '', getInvCategoryName(p.data.categoryId), p.data.unit, Number(p.data.price) || 0, getTotalStock(p), Number(p.data.minStock) || 0, (Number(p.data.price) || 0) * getTotalStock(p)]);
                    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `inventario_productos_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                    showToast('CSV de productos exportado');
                  }}>📥 Exportar productos CSV</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-blue-600 text-white border-none hover:bg-blue-700" onClick={() => {
                    // Export movements CSV
                    const headers = ['Fecha', 'Tipo', 'Producto', 'Almacén', 'Cantidad', 'Motivo', 'Referencia'];
                    const rows = invMovements.map(m => [m.data.date || '', m.data.type, getInvProductName(m.data.productId), m.data.warehouse || '', m.data.quantity, m.data.reason || '', m.data.reference || '']);
                    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                    showToast('CSV de movimientos exportado');
                  }}>📥 Exportar movimientos CSV</button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-xs text-[var(--muted-foreground)]">Valor total inventario</div>
                  <div className="text-xl font-bold text-[var(--af-accent)] mt-1">{fmtCOP(invTotalValue)}</div>
                </div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-xs text-[var(--muted-foreground)]">Productos con stock</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{invProducts.filter(p => getTotalStock(p) > 0).length}</div>
                </div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-xs text-[var(--muted-foreground)]">Agotados</div>
                  <div className="text-xl font-bold text-red-400 mt-1">{invProducts.filter(p => getTotalStock(p) === 0).length}</div>
                </div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-xs text-[var(--muted-foreground)]">Total movimientos</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">{invMovements.length}</div>
                </div>
              </div>

              {/* Stock by Category - horizontal bar chart */}
              <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-semibold mb-3">📦 Stock por categoría</h4>
                {invCategories.length === 0 ? (<div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Sin categorías</div>) : (
                  <div className="space-y-2.5">
                    {invCategories.map(c => {
                      const catProducts = invProducts.filter(p => p.data.categoryId === c.id);
                      const catStock = catProducts.reduce((s, p) => s + getTotalStock(p), 0);
                      const catValue = catProducts.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
                      const maxStock = Math.max(...invCategories.map(cc => invProducts.filter(pp => pp.data.categoryId === cc.id).reduce((s, p) => s + getTotalStock(p), 0)), 1);
                      const pct = (catStock / maxStock) * 100;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.data.color }} />
                              <span className="text-sm font-medium">{c.data.name}</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">{catProducts.length} prod.</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">{catStock.toLocaleString('es-CO')} uds</span>
                              <span className="text-[10px] text-[var(--muted-foreground)] ml-2">{fmtCOP(catValue)}</span>
                            </div>
                          </div>
                          <div className="w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.data.color }} />
                          </div>
                        </div>
                      );
                    })}
                    {invProducts.filter(p => !p.data.categoryId).length > 0 && (() => {
                      const uncat = invProducts.filter(p => !p.data.categoryId);
                      const stock = uncat.reduce((s, p) => s + getTotalStock(p), 0);
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                              <span className="text-sm font-medium">Sin categoría</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">{uncat.length} prod.</span>
                            </div>
                            <span className="text-sm font-bold">{stock.toLocaleString('es-CO')} uds</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Stock by Warehouse */}
              <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-semibold mb-3">🏢 Stock por almacén</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INV_WAREHOUSES.map(wh => {
                    const whStock = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh), 0);
                    const whValue = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh) * (Number(p.data.price) || 0), 0);
                    const maxWh = Math.max(...INV_WAREHOUSES.map(w => invProducts.reduce((s, p) => s + getWarehouseStock(p, w), 0)), 1);
                    return (
                      <div key={wh} className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                        <div className="text-xs font-medium mb-1">{wh}</div>
                        <div className="text-lg font-bold text-[var(--af-accent)]">{whStock.toLocaleString('es-CO')}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)] mb-2">{fmtCOP(whValue)}</div>
                        <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: `${(whStock / maxWh) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top products by value */}
              <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-semibold mb-3">💎 Top 10 productos por valor</h4>
                {invProducts.length === 0 ? (<div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Sin productos</div>) : (
                  <div className="space-y-2">
                    {[...invProducts].sort((a, b) => ((Number(b.data.price) || 0) * getTotalStock(b)) - ((Number(a.data.price) || 0) * getTotalStock(a))).slice(0, 10).map((p, i) => {
                      const val = (Number(p.data.price) || 0) * getTotalStock(p);
                      const maxVal = Math.max((Number(invProducts[0]?.data.price) || 0) * getTotalStock(invProducts[0]), 1);
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[var(--muted-foreground)] w-5 text-right">{i + 1}</span>
                          {p.data.imageData ? <img src={p.data.imageData} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (getInvCategoryColor(p.data.categoryId) || '#6b7280') + '20' }}><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getInvCategoryColor(p.data.categoryId) }} /></div>}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.data.name}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">{getTotalStock(p)} {p.data.unit} × {fmtCOP(Number(p.data.price) || 0)}</div>
                          </div>
                          <span className="text-sm font-bold text-[var(--af-accent)] whitespace-nowrap">{fmtCOP(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Movements summary */}
              <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-semibold mb-3">📈 Resumen de movimientos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-400">{invMovements.filter(m => m.data.type === 'Entrada').length}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Entradas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{invMovements.filter(m => m.data.type === 'Salida').length}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Salidas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{invTransfers.length}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Transferencias</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[var(--foreground)]">{invTotalStock.toLocaleString('es-CO')}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Stock actual</div>
                  </div>
                </div>
                {/* Movement by warehouse bars */}
                <div className="space-y-2">
                  {INV_WAREHOUSES.map(wh => {
                    const entries = invMovements.filter(m => m.data.warehouse === wh && m.data.type === 'Entrada').reduce((s, m) => s + m.data.quantity, 0);
                    const exits = invMovements.filter(m => m.data.warehouse === wh && m.data.type === 'Salida').reduce((s, m) => s + m.data.quantity, 0);
                    return (
                      <div key={wh} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)] w-36 truncate">{wh}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 h-5 bg-[var(--border)] rounded-l-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500/70 flex items-center justify-center" style={{ width: entries + exits > 0 ? `${(entries / (entries + exits)) * 100}%` : '50%' }}>
                              {entries > 0 && <span className="text-[9px] text-white font-medium px-1">+{entries}</span>}
                            </div>
                            <div className="h-full bg-red-500/70 flex items-center justify-center" style={{ width: entries + exits > 0 ? `${(exits / (entries + exits)) * 100}%` : '50%' }}>
                              {exits > 0 && <span className="text-[9px] text-white font-medium px-1">-{exits}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Products table (detailed) */}
              <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-semibold mb-3">📋 Tabla detallada de productos</h4>
                {/* Mobile card view */}
                <div className="md:hidden space-y-3">
                  {invProducts.map(p => {
                    const ts = getTotalStock(p);
                    const isOut = ts === 0;
                    const isLow = ts > 0 && ts <= (Number(p.data.minStock) || 0);
                    return (
                      <div key={p.id} className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                        <div className="flex items-start gap-3">
                          {p.data.imageData ? <img src={p.data.imageData} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-[var(--af-bg4)] flex items-center justify-center flex-shrink-0">📦</div>}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{p.data.name}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">{getInvCategoryName(p.data.categoryId)}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-bold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : ''}`}>{ts}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">uds</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border)]">
                          <span className="text-xs text-[var(--muted-foreground)]">Precio: {fmtCOP(Number(p.data.price) || 0)}</span>
                          <span className="text-xs font-medium text-[var(--af-accent)]">Valor: {fmtCOP((Number(p.data.price) || 0) * ts)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-2 text-[var(--muted-foreground)] font-medium">Producto</th>
                        <th className="text-left py-2 px-2 text-[var(--muted-foreground)] font-medium">Categoría</th>
                        <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Precio</th>
                        {INV_WAREHOUSES.map(wh => <th key={wh} className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium whitespace-nowrap">{wh.split(' ')[0]}</th>)}
                        <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Total</th>
                        <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invProducts.map(p => {
                        const ts = getTotalStock(p);
                        return (
                          <tr key={p.id} className="border-b border-[var(--border)]/50">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                {p.data.imageData ? <img src={p.data.imageData} alt="" className="w-6 h-6 rounded object-cover" /> : null}
                                <div>
                                  <div className="font-medium">{p.data.name}</div>
                                  {p.data.sku && <div className="text-[10px] text-[var(--muted-foreground)]">{p.data.sku}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2"><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: getInvCategoryColor(p.data.categoryId) }} /><span>{getInvCategoryName(p.data.categoryId)}</span></div></td>
                            <td className="py-2 px-2 text-right">{fmtCOP(Number(p.data.price) || 0)}</td>
                            {INV_WAREHOUSES.map(wh => { const ws = getWarehouseStock(p, wh); return <td key={wh} className={`py-2 px-2 text-right ${ws === 0 ? 'text-red-400' : ''}`}>{ws}</td>; })}
                            <td className="py-2 px-2 text-right font-bold">{ts}</td>
                            <td className="py-2 px-2 text-right font-medium text-[var(--af-accent)]">{fmtCOP((Number(p.data.price) || 0) * ts)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border)] font-bold">
                        <td className="py-2 px-2" colSpan={2}>{invProducts.length} productos</td>
                        <td className="py-2 px-2"></td>
                        {INV_WAREHOUSES.map(wh => <td key={wh} className="py-2 px-2 text-right">{invProducts.reduce((s, p) => s + getWarehouseStock(p, wh), 0).toLocaleString('es-CO')}</td>)}
                        <td className="py-2 px-2 text-right">{invTotalStock.toLocaleString('es-CO')}</td>
                        <td className="py-2 px-2 text-right text-[var(--af-accent)]">{fmtCOP(invTotalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>)}
          </div>)}


          {/* ===== ADMIN PANEL ===== */}
          {screen === 'admin' && !isAdmin && (<div className="animate-fadeIn p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-lg font-semibold">Acceso restringido</div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">Solo administradores y directores pueden acceder a este panel</div>
          </div>)}

          {screen === 'admin' && isAdmin && (<div className="animate-fadeIn p-4 sm:p-6">
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
              {[{ id: 'timeline' as const, label: '📊 Timeline' }, { id: 'dashboard' as const, label: '📈 Dashboard' }, { id: 'permissions' as const, label: '🔐 Permisos' }, { id: 'team' as const, label: '👥 Equipo' }].map(tab => (
                <button key={tab.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${adminTab === tab.id ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setAdminTab(tab.id)}>{tab.label}</button>
              ))}
            </div>

            {/* ===== TIMELINE TAB ===== */}
            {adminTab === 'timeline' && (() => {
              const days = getGanttDays();
              const todayOffset = Math.round((new Date(new Date().toDateString()) - days[0]) / 86400000);
              const teamWithTasks = teamUsers.map(m => {
                const mt = tasks.filter(t => t.data.assigneeId === m.id && t.data.status !== 'Completado' && t.data.dueDate).sort((a,b) => new Date(a.data.dueDate || 0) - new Date(b.data.dueDate || 0));
                return { ...m, tasks: mt };
              });
              const totalActive = teamWithTasks.reduce((s,m) => s + m.tasks.length, 0);
              const totalHours = activeTasks.length; // simplified
              const membersWithOverlaps = teamWithTasks.filter(m => findOverlaps(m.tasks).size > 0);
              const uniqueProjs = [...new Set(activeTasks.map(t => t.data.projectId).filter(Boolean))];

              return (<div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">📊 Admin Timeline</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">Vista de tareas del equipo en el tiempo</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-[var(--af-bg3)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-all" onClick={() => setAdminWeekOffset(p => p - 1)}>◀ Anterior</button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-[var(--af-bg3)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-all" onClick={() => setAdminWeekOffset(0)}>Hoy</button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-[var(--af-bg3)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-all" onClick={() => setAdminWeekOffset(p => p + 1)}>Siguiente ▶</button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Colaboradores</div><div className="text-2xl font-bold mt-1">{teamWithTasks.length}</div></div>
                  <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Tareas Activas</div><div className="text-2xl font-bold text-blue-400 mt-1">{totalActive}</div></div>
                  <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Con Traslapes</div><div className="text-2xl font-bold text-red-400 mt-1">{membersWithOverlaps.length}</div></div>
                  <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Proyectos</div><div className="text-2xl font-bold text-amber-400 mt-1">{uniqueProjs.length}</div></div>
                </div>

                {/* Legend */}
                <div className="bg-[var(--af-bg3)] rounded-xl p-3 border border-[var(--border)] flex flex-wrap items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--muted-foreground)] mr-1">Proyectos:</span>
                  {projects.slice(0, 6).map(p => (<div key={p.id} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getProjectColor(p.id) }} /><span className="text-[11px] text-[var(--foreground)]">{p.data.name.substring(0, 20)}</span></div>))}
                  <div className="w-px h-4 bg-[var(--border)]" />
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[var(--foreground)]" /><span className="text-[11px]">Hoy</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400/30 border border-red-400" /><span className="text-[11px]">Traslape</span></div>
                </div>

                {/* Gantt Chart */}
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="md:hidden text-center py-8 text-sm text-[var(--muted-foreground)]">El cronograma detallado está disponible en vista de escritorio.</div>
                  <div className="hidden md:block overflow-x-auto">
                    <div className="min-w-[1200px]">
                      {/* Header */}
                      <div className="flex border-b-2 border-[var(--border)] bg-[var(--card)]" style={{ height: 48 }}>
                        <div className="w-[180px] min-w-[180px] flex items-center px-3 text-[10px] uppercase tracking-wide font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Equipo</div>
                        <div className="flex-1 flex">
                          {days.map((day, i) => {
                            const isWknd = day.getDay() === 0 || day.getDay() === 6;
                            const isToday = day.toDateString() === new Date().toDateString();
                            return (<div key={i} className={`w-[72px] min-w-[72px] flex flex-col items-center justify-center border-r border-[var(--border)]/50 ${isWknd ? 'bg-[var(--af-bg4)]' : ''}`}>
                              <span className={`text-[9px] ${isWknd ? 'text-[var(--muted-foreground)]/50' : 'text-[var(--muted-foreground)]'}`}>{GANTT_DAY_NAMES[(day.getDay() + 6) % 7]}</span>
                              {isToday ? <span className="text-[11px] font-bold bg-[var(--foreground)] text-[var(--card)] w-5 h-5 rounded-full flex items-center justify-center">{day.getDate()}</span> : <span className={`text-[11px] font-semibold ${isWknd ? 'text-[var(--muted-foreground)]/50' : 'text-[var(--foreground)]'}`}>{day.getDate()}</span>}
                            </div>);
                          })}
                        </div>
                      </div>
                      {/* Rows */}
                      {teamWithTasks.map(member => {
                        const rows = buildGanttRows(member.tasks);
                        const overlapIds = findOverlaps(member.tasks);
                        const hasOverlap = overlapIds.size > 0;
                        const rowH = rows.length > 1 ? rows.length * 40 + 8 : 40;
                        return (<div key={member.id} className="flex border-b border-[var(--border)]/50 hover:bg-[var(--af-bg4)]/30">
                          <div className="w-[180px] min-w-[180px] flex items-center gap-2 px-3 border-r border-[var(--border)]" style={{ minHeight: rowH }}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 ${avatarColor(member.id)}`}>{getInitials(member.data?.name || '?')}</div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold truncate">{member.data?.name || 'Sin nombre'}</div>
                              <div className="text-[9px] text-[var(--muted-foreground)]">{member.data?.role || 'Miembro'} · {member.tasks.length} tareas</div>
                            </div>
                            {hasOverlap && <span className="ml-auto text-[10px] text-red-400">⚠</span>}
                          </div>
                          <div className="flex-1 relative" style={{ minHeight: rowH }}>
                            {/* Weekend backgrounds */}
                            {days.map((day, i) => { if (day.getDay() === 0 || day.getDay() === 6) return <div key={i} className="absolute top-0 bottom-0 bg-[var(--af-bg4)]/50" style={{ left: `${(i/GANTT_DAYS)*100}%`, width: `${(1/GANTT_DAYS)*100}%` }} />; return null; })}
                            {/* Today line */}
                            {todayOffset >= 0 && todayOffset <= GANTT_DAYS && <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--foreground)] z-20" style={{ left: `${((todayOffset + 0.5) / GANTT_DAYS) * 100}%` }} />}
                            {/* Task bars */}
                            {rows.map((row, rIdx) => row.map(task => {
                              const pos = getTaskBar(task, days);
                              if (!pos) return null;
                              const isOvlp = overlapIds.has(task.id);
                              const proj = projects.find(p => p.id === task.data.projectId);
                              const pColor = proj ? getProjectColor(task.data.projectId) : '#6b7280';
                              const top = rIdx * 40 + 4;
                              return (<div key={task.id} className="absolute h-[28px] rounded-md flex items-center gap-1 px-1.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:z-30 z-10 overflow-hidden" style={{ left: `${pos.left}%`, width: `${pos.width}%`, top, backgroundColor: isOvlp ? getProjectColorLight(task.data.projectId) : pColor, border: isOvlp ? `1.5px solid ${pColor}` : 'none', color: isOvlp ? pColor : 'white' }} onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setAdminTooltipPos({ x: Math.min(r.left, window.innerWidth - 280), y: r.top }); setAdminTooltipTask(task); }} onMouseLeave={() => setAdminTooltipTask(null)}>
                                <div className="w-[3px] h-full flex-shrink-0 rounded-sm" style={{ backgroundColor: isOvlp ? pColor : 'rgba(255,255,255,0.3)' }} />
                                <span className="text-[9px] font-medium truncate flex-1">{task.data.title}</span>
                              </div>);
                            }))}
                            {member.tasks.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--muted-foreground)]/50 italic">Sin tareas</div>}
                          </div>
                        </div>);
                      })}
                    </div>
                  </div>
                </div>

                {/* Tooltip */}
                {adminTooltipTask && (() => {
                  const t = adminTooltipTask;
                  const proj = projects.find(p => p.id === t.data.projectId);
                  const sc = GANTT_STATUS_CFG[t.data.status] || { label: t.data.status, color: '#6b7280' };
                  const pc = GANTT_PRIO_CFG[t.data.priority] || { label: t.data.priority || '', bg: '#f1f5f9', color: '#475569' };
                  return (<div className="fixed z-[200] bg-[var(--foreground)] text-[var(--card)] rounded-lg p-3 text-[11px] max-w-[280px] shadow-xl pointer-events-none" style={{ left: adminTooltipPos.x, top: adminTooltipPos.y - 10, transform: 'translateY(-100%)' }}>
                    <div className="flex gap-2"><span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: pc.bg + '33', color: pc.color }}>{pc.label}</span><span className="text-[9px] text-[var(--muted-foreground)]">{sc.label}</span></div>
                    <div className="text-[12px] font-semibold mt-1">{t.data.title}</div>
                    {proj && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{proj.data.name}</div>}
                    <div className="flex gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                      {t.data.startDate && <span>{fmtDate(t.data.startDate)}</span>}
                      {t.data.dueDate && <span>→ {fmtDate(t.data.dueDate)}</span>}
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">👤 {getUserName(t.data.assigneeId)}</div>
                  </div>);
                })()}

                {/* Overlap Alerts */}
                {membersWithOverlaps.length > 0 && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3"><span className="text-sm font-semibold text-red-400">⚠️ Alertas de Carga</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {membersWithOverlaps.map(m => {
                      const ovlTasks = m.tasks.filter(t => findOverlaps(m.tasks).has(t.id));
                      return (<div key={m.id} className="bg-[var(--card)] rounded-lg p-3 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold ${avatarColor(m.id)}`}>{getInitials(m.data?.name || '?')}</div>
                          <span className="text-xs font-semibold">{m.data?.name}</span>
                          <span className="ml-auto text-[10px] text-red-400 font-semibold">{ovlTasks.length} traslape{ovlTasks.length > 1 ? 's' : ''}</span>
                        </div>
                        {ovlTasks.map(t => (<div key={t.id} className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: getProjectColor(t.data.projectId) }} />
                          <span className="text-[10px] truncate flex-1">{t.data.title}</span>
                        </div>))}
                      </div>);
                    })}
                  </div>
                </div>)}
              </div>);
            })()}

            {/* ===== DASHBOARD TAB ===== */}
            {adminTab === 'dashboard' && (<div className="space-y-4">
              <h3 className="text-lg font-semibold">📈 Dashboard Admin</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-xs text-[var(--muted-foreground)]">Total Tareas</div><div className="text-2xl font-bold mt-1">{tasks.length}</div></div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-xs text-[var(--muted-foreground)]">En Progreso</div><div className="text-2xl font-bold text-blue-400 mt-1">{tasks.filter(t => t.data.status === 'En progreso').length}</div></div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-xs text-[var(--muted-foreground)]">Completadas</div><div className="text-2xl font-bold text-emerald-400 mt-1">{completedTasks.length}</div></div>
                <div className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)]"><div className="text-xs text-[var(--muted-foreground)]">Vencidas</div><div className="text-2xl font-bold text-red-400 mt-1">{overdueTasks.length}</div></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Upcoming */}
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                  <h4 className="text-sm font-semibold mb-3">📅 Próximas Entregas</h4>
                  {activeTasks.filter(t => t.data.dueDate).sort((a,b) => new Date(a.data.dueDate) - new Date(b.data.dueDate)).slice(0, 8).map(t => {
                    const proj = projects.find(p => p.id === t.data.projectId);
                    const sc = GANTT_STATUS_CFG[t.data.status] || { color: '#6b7280', label: t.data.status };
                    const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString());
                    return (<div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)]/50 last:border-b-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0`} style={{ backgroundColor: sc.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{t.data.title}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{proj?.data.name || '—'} · {getUserName(t.data.assigneeId)}</div>
                      </div>
                      <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-400 font-semibold' : 'text-[var(--muted-foreground)]'}`}>{t.data.dueDate ? fmtDate(t.data.dueDate) : ''}</span>
                    </div>);
                  })}
                </div>
                {/* Projects overview */}
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                  <h4 className="text-sm font-semibold mb-3">🏗️ Proyectos</h4>
                  {projects.map(p => {
                    const pTasks = tasks.filter(t => t.data.projectId === p.id);
                    const done = pTasks.filter(t => t.data.status === 'Completado').length;
                    return (<div key={p.id} className="py-2.5 border-b border-[var(--border)]/50 last:border-b-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getProjectColor(p.id) }} /><span className="text-xs font-medium">{p.data.name}</span></div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(p.data.status)}`}>{p.data.status}</span>
                      </div>
                      <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.data.progress || 0}%`, backgroundColor: getProjectColor(p.id) }} /></div><span className="text-[10px] text-[var(--muted-foreground)]">{p.data.progress || 0}%</span></div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{done}/{pTasks.length} tareas</div>
                    </div>);
                  })}
                </div>
              </div>
              {/* Team productivity */}
              <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                <h4 className="text-sm font-semibold mb-3">👥 Productividad del Equipo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamUsers.map(m => {
                    const mTasks = tasks.filter(t => t.data.assigneeId === m.id);
                    const mActive = mTasks.filter(t => t.data.status !== 'Completado');
                    const mDone = mTasks.filter(t => t.data.status === 'Completado');
                    const pct = mTasks.length > 0 ? Math.round((mDone.length / mTasks.length) * 100) : 0;
                    return (<div key={m.id} className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(m.id)}`}>{getInitials(m.data?.name || '?')}</div>
                        <div className="min-w-0"><div className="text-xs font-semibold truncate">{m.data?.name}</div><div className="text-[10px] text-[var(--muted-foreground)]">{m.data?.role || 'Miembro'}</div></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><div className="text-sm font-bold text-blue-400">{mActive.length}</div><div className="text-[9px] text-[var(--muted-foreground)]">Activas</div></div>
                        <div><div className="text-sm font-bold text-emerald-400">{mDone.length}</div><div className="text-[9px] text-[var(--muted-foreground)]">Hechas</div></div>
                        <div><div className="text-sm font-bold">{pct}%</div><div className="text-[9px] text-[var(--muted-foreground)]">Completado</div></div>
                      </div>
                    </div>);
                  })}
                </div>
              </div>
            </div>)}

            {/* ===== PERMISSIONS TAB ===== */}
            {adminTab === 'permissions' && (<div className="space-y-4">
              <h3 className="text-lg font-semibold">🔐 Permisos y Roles</h3>
              <div className="flex gap-1 mb-4">
                {[{ id: 'roles', label: '👥 Roles' }, { id: 'permissions', label: '🔑 Permisos por rol' }].map(tab => (
                  <button key={tab.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${adminPermSection === tab.id ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)]'}`} onClick={() => setAdminPermSection(tab.id)}>{tab.label}</button>
                ))}
              </div>

              {adminPermSection === 'roles' && (<div className="space-y-4">
                {/* Role description */}
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                  <h4 className="text-sm font-semibold mb-3">Roles del Sistema</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {USER_ROLES.map(role => {
                      const count = teamUsers.filter(u => u.data?.role === role).length;
                      return (<div key={role} className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ROLE_ICONS[role]}</span>
                            <div><div className="text-xs font-semibold">{role}</div><div className="text-[10px] text-[var(--muted-foreground)]">{count} usuario{count !== 1 ? 's' : ''}</div></div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>{role}</span>
                        </div>
                      </div>);
                    })}
                  </div>
                </div>
                {/* Team members with role management */}
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                  <h4 className="text-sm font-semibold mb-3">Gestionar Roles</h4>
                  <div className="space-y-2">
                    {teamUsers.map(u => {
                      const canChange = isAdmin && u.id !== authUser?.uid;
                      return (<div key={u.id} className="flex items-center gap-3 bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(u.id)}`}>{getInitials(u.data?.name || '?')}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{u.data?.name}{u.id === authUser?.uid && <span className="text-[9px] text-[var(--muted-foreground)] ml-1">(Tú)</span>}</div>
                          <div className="text-[10px] text-[var(--muted-foreground)] truncate">{u.data?.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: 'var(--border)' }}>
                            <span>{ROLE_ICONS[u.data?.role || 'Miembro']}</span>
                            {u.data?.role || 'Miembro'}
                          </span>
                          {canChange && (<select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-2 py-1 text-[10px] text-[var(--foreground)] outline-none cursor-pointer" value={u.data?.role || 'Miembro'} onChange={e => updateUserRole(u.id, e.target.value)}>
                            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>)}
                        </div>
                      </div>);
                    })}
                  </div>
                </div>
              </div>)}

              {adminPermSection === 'permissions' && (<div className="space-y-4">
                <div className="bg-[var(--af-bg3)] rounded-xl border border-[var(--border)] p-4">
                  <h4 className="text-sm font-semibold mb-3">Permisos por Rol</h4>
                  <div className="md:hidden text-center py-8 text-sm text-[var(--muted-foreground)]">La tabla de permisos está disponible en vista de escritorio.</div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead><tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-2 text-[var(--muted-foreground)] font-medium">Permiso</th>
                        {USER_ROLES.map(r => <th key={r} className="text-center py-2 px-2 text-[var(--muted-foreground)] font-medium whitespace-nowrap">{ROLE_ICONS[r]} {r}</th>)}
                      </tr></thead>
                      <tbody>
                        {[
                          { name: 'Ver Dashboard', perms: ['Admin','Director','Arquitecto','Interventor','Contratista','Cliente','Miembro'] },
                          { name: 'Crear proyectos', perms: ['Admin','Director','Arquitecto'] },
                          { name: 'Editar proyectos', perms: ['Admin','Director','Arquitecto'] },
                          { name: 'Eliminar proyectos', perms: ['Admin','Director'] },
                          { name: 'Crear tareas', perms: ['Admin','Director','Arquitecto','Interventor','Contratista'] },
                          { name: 'Asignar tareas', perms: ['Admin','Director','Arquitecto'] },
                          { name: 'Gestionar equipo', perms: ['Admin','Director'] },
                          { name: 'Cambiar roles', perms: ['Admin'] },
                          { name: 'Ver presupuestos', perms: ['Admin','Director','Arquitecto','Interventor','Cliente'] },
                          { name: 'Ver inventario', perms: ['Admin','Director','Arquitecto','Contratista','Interventor'] },
                          { name: 'Gestionar inventario', perms: ['Admin','Director','Contratista'] },
                          { name: 'Panel Admin', perms: ['Admin','Director'] },
                          { name: 'Chat general', perms: ['Admin','Director','Arquitecto','Interventor','Contratista','Cliente','Miembro'] },
                          { name: 'Portal cliente', perms: ['Admin','Director','Cliente'] },
                        ].map((perm, i) => (<tr key={i} className="border-b border-[var(--border)]/50">
                          <td className="py-2 px-2 font-medium">{perm.name}</td>
                          {USER_ROLES.map(r => (<td key={r} className="py-2 px-2 text-center">{perm.perms.includes(r) ? <span className="text-emerald-400">✓</span> : <span className="text-red-400/40">✕</span>}</td>))}
                        </tr>))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>)}
            </div>)}

            {/* ===== TEAM TAB ===== */}
            {adminTab === 'team' && (<div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">👥 Equipo ({teamUsers.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamUsers.map(m => {
                  const mTasks = activeTasks.filter(t => t.data.assigneeId === m.id);
                  const mOverdue = mTasks.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString()));
                  const isSelf = m.id === authUser?.uid;
                  const mIsAdmin = (m.data?.role === 'Admin') || ADMIN_EMAILS.includes(m.data?.email || '');
                  return (<div key={m.id} className="bg-[var(--af-bg3)] rounded-xl p-4 border border-[var(--border)] relative group">
                    {/* Delete button */}
                    {isAdmin && !isSelf && (
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar a ${m.data?.name || m.data?.email}? Esta acción no se puede deshacer.`)) return;
                          try {
                            const db = (window as any).firebase.firestore();
                            await db.collection('users').doc(m.id).delete();
                            showToast(`${m.data?.name || m.data?.email} eliminado del equipo`);
                          } catch (err) { showToast('Error al eliminar usuario', 'error'); }
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                        title="Eliminar del equipo"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    )}
                    {isSelf && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-[var(--card)] text-[var(--muted-foreground)] flex items-center justify-center" title="No puedes eliminarte a ti mismo">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(m.id)}`}>{getInitials(m.data?.name || '?')}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{m.data?.name}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{m.data?.role || 'Miembro'}{m.data?.email ? ` · ${m.data.email}` : ''}</div>
                      </div>
                      <span className="text-[10px] bg-[var(--card)] px-2 py-0.5 rounded-full border border-[var(--border)]">{mTasks.length} tareas</span>
                    </div>
                    {mOverdue.length > 0 && (<div className="text-[10px] text-red-400 mb-2">⚠ {mOverdue.length} vencida{mOverdue.length > 1 ? 's' : ''}</div>)}
                    {mTasks.length > 0 ? (<div className="space-y-1.5">
                      {mTasks.slice(0, 4).map(t => {
                        const proj = projects.find(p => p.id === t.data.projectId);
                        const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString());
                        const sc = GANTT_STATUS_CFG[t.data.status] || { color: '#6b7280' };
                        const pc = GANTT_PRIO_CFG[t.data.priority] || { bg: '#f1f5f9', color: '#475569', label: '' };
                        return (<div key={t.id} className="flex items-center gap-2 bg-[var(--card)] rounded-lg px-2.5 py-2">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: sc.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">{t.data.title}</div>
                            {proj && <div className="text-[9px] text-[var(--muted-foreground)]">{proj.data.name}</div>}
                          </div>
                          <span className={`text-[9px] flex-shrink-0 ${isOverdue ? 'text-red-400 font-semibold' : 'text-[var(--muted-foreground)]'}`}>{t.data.dueDate ? fmtDate(t.data.dueDate) : ''}</span>
                        </div>);
                      })}
                      {mTasks.length > 4 && <div className="text-[10px] text-[var(--muted-foreground)] text-center pt-1">+{mTasks.length - 4} más</div>}
                    </div>) : (<div className="text-center py-4 text-[11px] text-[var(--muted-foreground)]">Sin tareas activas</div>)}
                  </div>);
                })}
              </div>
            </div>)}
          </div>)}

              {/* ===== PROFILE ===== */}
          {screen === 'profile' && (() => {
            const myTasks = tasks.filter(t => t.data.assigneeId === authUser?.uid || !t.data.assigneeId);
            const myPending = myTasks.filter(t => t.data.status !== 'Completado');
            const myCompleted = myTasks.filter(t => t.data.status === 'Completado');
            const myInProgress = myTasks.filter(t => t.data.status === 'En progreso');
            const myHighPrio = myPending.filter(t => t.data.priority === 'Alta');
            const myOverdue = myPending.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date());
            const totalRate = myTasks.length > 0 ? Math.round((myCompleted.length / myTasks.length) * 100) : 0;
            const myProjects = projects.filter(p => p.data.createdBy === authUser?.uid || myTasks.some(t => t.data.projectId === p.id));
            const myExpenses = expenses.filter(e => e.data.createdBy === authUser?.uid);
            const totalSpent = myExpenses.reduce((s, e) => s + (Number(e.data.amount) || 0), 0);

            // Weekly activity (last 7 days)
            const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const weeklyData = weekDays.map((label, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              const dayEnd = new Date(dayStart.getTime() + 86400000);
              const completed = myTasks.filter(t => t.data.status === 'Completado').filter(t => {
                const cd = t.data.createdAt?.toDate ? t.data.createdAt.toDate() : new Date(t.data.createdAt);
                return cd >= dayStart && cd < dayEnd;
              }).length;
              return { label, count: completed, max: 5 };
            });
            const weekMax = Math.max(...weeklyData.map(w => w.count), 1);

            // Tasks by project
            const tasksByProject: Record<string, { name: string; total: number; done: number }> = {};
            myProjects.forEach(p => {
              const pTasks = myTasks.filter(t => t.data.projectId === p.id);
              if (pTasks.length > 0) {
                tasksByProject[p.id] = { name: p.data.name, total: pTasks.length, done: pTasks.filter(t => t.data.status === 'Completado').length };
              }
            });

            // Tasks by priority
            const prioData = [
              { label: 'Alta', count: myTasks.filter(t => t.data.priority === 'Alta').length, color: '#e05555' },
              { label: 'Media', count: myTasks.filter(t => t.data.priority === 'Media').length, color: '#e09855' },
              { label: 'Baja', count: myTasks.filter(t => t.data.priority === 'Baja').length, color: '#4caf7d' },
            ];
            const prioMax = Math.max(...prioData.map(p => p.count), 1);

            return (<div className="animate-fadeIn space-y-4">
              {/* Profile Header Card */}
              <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden">
                <div className="flex items-center gap-3 relative">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-bold border-2 ${avatarColor(authUser?.uid)} flex-shrink-0`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>
                    {authUser?.photoURL ? '' : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-base sm:text-xl">{userName}</div>
                    <div className="text-[11px] sm:text-sm text-[var(--muted-foreground)] truncate">{authUser?.email}</div>
                    <div className="flex gap-1.5 mt-1">
                      {(() => { const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro'; return <span className={`text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[myRole]}`}>{ROLE_ICONS[myRole]} {myRole}</span>; })()}
                      <span className="text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{myProjects.length} proyectos</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mt-3">
                  {[
                    { val: myPending.length, lbl: 'Pendientes', c: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { val: myInProgress.length, lbl: 'En progreso', c: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { val: myCompleted.length, lbl: 'Listas', c: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { val: totalRate + '%', lbl: 'Cumplimiento', c: 'text-[var(--af-accent)]', bg: 'bg-[var(--af-accent)]/10' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-lg p-2 text-center`}>
                      <div className={`text-base sm:text-xl font-bold ${s.c}`}>{s.val}</div>
                      <div className="text-[8px] sm:text-[11px] text-[var(--muted-foreground)] leading-tight">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notificaciones */}
              {(() => {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const weekLater = new Date(today.getTime() + 7 * 86400000);
                const notifications: { icon: string; text: string; time: string; urgent: boolean }[] = [];

                // Overdue tasks (urgent)
                myOverdue.forEach(t => {
                  const proj = projects.find(p => p.id === t.data.projectId);
                  const daysOverdue = Math.floor((today.getTime() - new Date(t.data.dueDate).getTime()) / 86400000);
                  notifications.push({ icon: '⚡', text: `"${t.data.title}" venció hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}${proj ? ` — ${proj.data.name}` : ''}`, time: `Venció ${fmtDate(t.data.dueDate)}`, urgent: true });
                });

                // High priority pending tasks
                if (myHighPrio.length > 0) {
                  myHighPrio.forEach(t => {
                    const proj = projects.find(p => p.id === t.data.projectId);
                    notifications.push({ icon: '🔴', text: `Tarea urgente: "${t.data.title}"${proj ? ` — ${proj.data.name}` : ''}`, time: `Prioridad Alta · ${t.data.status}`, urgent: true });
                  });
                }

                // Meetings today or this week
                meetings.forEach(m => {
                  if (m.data.date && (m.data.date === todayStr || (m.data.date > todayStr && m.data.date <= weekLater.toISOString().split('T')[0]))) {
                    const proj = projects.find(p => p.id === m.data.projectId);
                    const isToday = m.data.date === todayStr;
                    notifications.push({ icon: '📅', text: `Reunión "${m.data.title}"${isToday ? ' hoy' : ''} a las ${m.data.time || '09:00'}${proj ? ` — ${proj.data.name}` : ''}`, time: `${fmtDate(m.data.date)} · ${m.data.duration || 60} min`, urgent: isToday });
                  }
                });

                // Pending approvals in my projects
                const myProjectIds = myProjects.map(p => p.id);
                const pendingApprovals = approvals.filter(a => a.data.status === 'Pendiente');
                if (pendingApprovals.length > 0) {
                  notifications.push({ icon: '📋', text: `${pendingApprovals.length} aprobación${pendingApprovals.length > 1 ? 'es' : ''} pendiente${pendingApprovals.length > 1 ? 's' : ''}`, time: 'Requiere atención', urgent: false });
                }

                // Recent new projects (last 7 days)
                const recentProjects = projects.filter(p => {
                  const cd = p.data.createdAt?.toDate ? p.data.createdAt.toDate() : new Date(p.data.createdAt);
                  return cd >= new Date(today.getTime() - 7 * 86400000);
                });
                recentProjects.slice(0, 3).forEach(p => {
                  notifications.push({ icon: '📁', text: `Proyecto "${p.data.name}" — ${p.data.status}${p.data.client ? ` · Cliente: ${p.data.client}` : ''}`, time: fmtDate(p.data.createdAt), urgent: false });
                });

                // Tasks in progress
                if (myInProgress.length > 0) {
                  myInProgress.slice(0, 3).forEach(t => {
                    const proj = projects.find(p => p.id === t.data.projectId);
                    notifications.push({ icon: '🔄', text: `"${t.data.title}" en progreso${proj ? ` — ${proj.data.name}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`, time: t.data.status, urgent: false });
                  });
                }

                // Sort: urgent first
                notifications.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

                return (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[13px] sm:text-[15px] font-semibold">Notificaciones Recientes</div>
                      <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{notifications.length} actividad{notifications.length !== 1 ? 'es' : ''}</span>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-[var(--af-text3)]">
                        <div className="text-3xl mb-2">🔔</div>
                        <div className="text-sm">Sin notificaciones nuevas</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">Las alertas aparecerán aquí cuando haya actividad</div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {notifications.slice(0, 15).map((n, i) => (
                          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${n.urgent ? 'bg-red-500/5 border border-red-500/20' : 'bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)]'}`}>
                            <div className="text-base flex-shrink-0 mt-0.5">{n.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] sm:text-[13px] leading-snug">{n.text}</div>
                              <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{n.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Charts row - stacked on mobile, 3-col on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-2 sm:mb-3">Cumplimiento</div>
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={totalRate >= 80 ? '#4caf7d' : totalRate >= 50 ? '#c8a96e' : '#e05555'} strokeWidth="3" strokeDasharray={`${totalRate}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg sm:text-2xl font-bold">{totalRate}%</span>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-[var(--af-text3)] mt-1.5">{myCompleted.length} de {myTasks.length}</div>
                </div>

                {/* Priority */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-3">Prioridad</div>
                  <div className="space-y-2.5">
                    {prioData.map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[11px] sm:text-[12px] mb-1"><span>{p.label}</span><span className="text-[var(--muted-foreground)]">{p.count}</span></div>
                        <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: Math.round((p.count / prioMax) * 100) + '%', backgroundColor: p.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {myHighPrio.length > 0 && <div className="mt-3 p-2 bg-red-500/10 rounded-lg flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[11px] text-red-400">{myHighPrio.length} urgente{myHighPrio.length > 1 ? 's' : ''}</span></div>}
                </div>

                {/* Weekly */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-3">Actividad Semanal</div>
                  <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-24">
                    {weeklyData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full bg-[var(--af-bg4)] rounded-sm overflow-hidden flex flex-col-reverse" style={{ height: '50px' }}>
                          <div className="w-full bg-[var(--af-accent)] rounded-sm transition-all" style={{ height: d.count > 0 ? Math.max(Math.round((d.count / weekMax) * 100), 10) + '%' : '0%' }} />
                        </div>
                        <span className="text-[7px] sm:text-[9px] text-[var(--af-text3)]">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progreso por Proyecto */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] sm:text-[15px] font-semibold">Progreso por Proyecto</div>
                  <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)]">{Object.keys(tasksByProject).length} proyectos</span>
                </div>
                {Object.keys(tasksByProject).length === 0 ? (
                  <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas asignadas aún</div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(tasksByProject).map((p, i) => {
                      const rate = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                      return (
                        <div key={i} className="cursor-pointer hover:bg-[var(--af-bg3)] rounded-lg p-3 -mx-1 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-medium">{p.name}</span>
                            <span className={`text-[12px] font-semibold ${rate >= 80 ? 'text-emerald-400' : rate >= 40 ? 'text-[var(--af-accent)]' : 'text-amber-400'}`}>{rate}%</span>
                          </div>
                          <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${rate >= 80 ? 'bg-emerald-500' : rate >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: rate + '%' }} />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-[var(--af-text3)]">{p.done} completadas</span>
                            <span className="text-[10px] text-[var(--af-text3)]">{p.total - p.done} pendientes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mis Tareas Pendientes */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] sm:text-[15px] font-semibold">Tareas Pendientes</div>
                  <div className="flex gap-1.5">
                    {myOverdue.length > 0 && <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{myOverdue.length} vencidas</span>}
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{myPending.length} pendientes</span>
                  </div>
                </div>
                {myPending.length === 0 ? (
                  <div className="text-center py-10 text-[var(--af-text3)]"><div className="text-3xl mb-2">🎉</div><div className="text-sm">¡Todas tus tareas están al día!</div></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myPending.slice(0, 10).map(t => {
                      const proj = projects.find(p => p.id === t.data.projectId);
                      const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date();
                      return (
                        <div key={t.id} className={`border border-[var(--border)] rounded-xl p-3.5 transition-all hover:border-[var(--input)] ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--af-bg3)]'}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium leading-snug">{t.data.title}</div>
                              <div className="text-[11px] text-[var(--af-text3)] mt-1">{proj?.data.name || 'Sin proyecto'}</div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                            {t.data.dueDate && (
                              <span className={`text-[10px] ${isOverdue ? 'text-red-400 font-medium' : 'text-[var(--af-text3)]'}`}>
                                {isOverdue ? '⚡ ' : '📅 '}{fmtDate(t.data.dueDate)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${t.data.status === 'En progreso' ? 'bg-blue-500 w-1/2' : t.data.status === 'Revision' ? 'bg-amber-500 w-3/4' : 'w-0'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Microsoft / OneDrive */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 21 21" className="w-5 h-5"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                    <div className="text-[13px] sm:text-[15px] font-semibold">Microsoft OneDrive</div>
                  </div>
                  {msConnected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Conectado</span>}
                </div>
                {!msConnected ? (
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)] mb-3">Conecta tu cuenta de Microsoft para gestionar archivos de proyectos directamente en OneDrive. Cada proyecto tendrá su propia carpeta en la nube.</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                      {[
                        { icon: '☁️', title: 'Almacenamiento en la nube', desc: 'Sin límite de tamaño en OneDrive' },
                        { icon: '📂', title: 'Carpetas por proyecto', desc: 'Organización automática' },
                        { icon: '🔗', title: 'Compartir archivos', desc: 'Enlaces seguros para el equipo' },
                      ].map((f, i) => (
                        <div key={i} className="bg-[var(--af-bg3)] rounded-lg p-3 text-center">
                          <div className="text-lg mb-1">{f.icon}</div>
                          <div className="text-[11px] font-semibold">{f.title}</div>
                          <div className="text-[10px] text-[var(--af-text3)]">{f.desc}</div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full bg-[#00a4ef] text-white border-none rounded-lg py-2.5 text-sm font-semibold cursor-pointer hover:bg-[#0091d5] transition-colors flex items-center justify-center gap-2" onClick={doMicrosoftLogin}>
                      <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
                      Conectar con Microsoft
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)] mb-3">Tu cuenta está vinculada. Los archivos de cada proyecto se guardan en <strong>OneDrive/ArchiFlow/[Nombre del proyecto]/</strong></div>
                    {projects.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2">Abrir carpeta de proyecto:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {projects.slice(0, 6).map(p => (
                            <button key={p.id} className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg p-2.5 text-left cursor-pointer hover:border-[#00a4ef] transition-all" onClick={() => openOneDriveForProject(p.data.name)}>
                              <div className="text-[11px] font-medium truncate">{p.data.name}</div>
                              <div className="text-[9px] text-[var(--af-text3)]">{p.data.status}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/10 transition-colors" onClick={disconnectMicrosoft}>
                      Desconectar Microsoft
                    </button>
                  </div>
                )}
              </div>

              {/* Mi Actividad Financiera */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="text-[13px] sm:text-[15px] font-semibold mb-3">Actividad Financiera</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--af-bg3)] rounded-lg p-3.5 text-center">
                    <div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(totalSpent)}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Gastos registrados</div>
                  </div>
                  <div className="bg-[var(--af-bg3)] rounded-lg p-3.5 text-center">
                    <div className="text-lg font-bold text-emerald-400">{myExpenses.length}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Registros realizados</div>
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <div className="pt-2 pb-4">
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-[13px] font-medium cursor-pointer hover:bg-red-500/10 transition-colors flex items-center gap-2 justify-center" onClick={doLogout}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>);
          })()}

          {/* ===== INSTALL APP GUIDE ===== */}
          {screen === 'install' && (<div className="animate-fadeIn space-y-5">
            {/* Status Banner */}
            {isStandalone ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-emerald-400 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-400">App instalada correctamente</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">ArchiFlow se está ejecutando como aplicación instalada. Puedes cerrar esta guía.</div>
                </div>
              </div>
            ) : installPrompt ? (
              <div className="bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--af-accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--af-accent)] fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Listo para instalar</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Tu navegador soporta la instalación directa</div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-[var(--af-accent)] text-background text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={handleInstall}>
                  Instalar ahora
                </button>
              </div>
            ) : (
              <div className="bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--af-accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--af-accent)] fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Instalación manual</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Sigue las instrucciones de abajo según tu dispositivo</div>
                </div>
              </div>
            )}

            {/* Quick Install Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">En tu teléfono</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">Acceso rápido como app nativa</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${platform === 'android' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🤖</span>
                      <span className="text-[13px] font-semibold">Android (Chrome)</span>
                      {platform === 'android' && <span className="text-[10px] bg-[var(--af-accent)]/20 text-[var(--af-accent)] px-1.5 py-0.5 rounded-full">Tu dispositivo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en Chrome</li>
                      <li>Toca el menú (⋮) arriba a la derecha</li>
                      <li>Selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                      <li>Confirma tocando <strong>"Instalar"</strong></li>
                    </ol>
                  </div>
                  <div className={`p-3 rounded-lg ${platform === 'ios' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🍎</span>
                      <span className="text-[13px] font-semibold">iPhone / iPad (Safari)</span>
                      {platform === 'ios' && <span className="text-[10px] bg-[var(--af-accent)]/20 text-[var(--af-accent)] px-1.5 py-0.5 rounded-full">Tu dispositivo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en <strong>Safari</strong> (no funciona en Chrome)</li>
                      <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha ↑)</li>
                      <li>Desliza y selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                      <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center">
                    <span className="text-xl">💻</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">En tu computador</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">Widget de escritorio / App independiente</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${platform === 'windows' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🪟</span>
                      <span className="text-[13px] font-semibold">Windows (Chrome / Edge)</span>
                      {platform === 'windows' && <span className="text-[10px] bg-[var(--af-accent)]/20 text-[var(--af-accent)] px-1.5 py-0.5 rounded-full">Tu equipo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en Chrome o Edge</li>
                      <li>Haz clic en el <strong>ícono de instalar</strong> en la barra de direcciones ( junto al candado), o menú ⋮ → <strong>"Instalar ArchiFlow"</strong></li>
                      <li>Confirma la instalación</li>
                      <li>Se crea un acceso directo en escritorio y menú inicio</li>
                    </ol>
                  </div>
                  <div className={`p-3 rounded-lg ${platform === 'mac' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🍏</span>
                      <span className="text-[13px] font-semibold">Mac (Chrome / Safari)</span>
                      {platform === 'mac' && <span className="text-[10px] bg-[var(--af-accent)]/20 text-[var(--af-accent)] px-1.5 py-0.5 rounded-full">Tu equipo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li><strong>Chrome:</strong> Menú ⋮ → <strong>"Instalar ArchiFlow"</strong> → Crear acceso directo</li>
                      <li><strong>Safari:</strong> Archivo → <strong>"Agregar al Dock"</strong></li>
                      <li>Se abre como ventana independiente sin barra de navegación</li>
                      <li>Funciona offline para datos en caché</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[14px] font-semibold mb-4">¿Qué obtienes al instalar?</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '⚡', title: 'Acceso rápido', desc: 'Icono en pantalla de inicio o escritorio' },
                  { icon: '📱', title: 'App nativa', desc: 'Sin barra de navegador, pantalla completa' },
                  { icon: '📴', title: 'Funciona offline', desc: 'Accede a tus datos sin conexión a internet' },
                  { icon: '🔔', title: 'Notificaciones', desc: 'Recibe alertas de tareas y mensajes nuevos' },
                ].map((f, i) => (
                  <div key={i} className="bg-[var(--af-bg3)] rounded-lg p-3 text-center">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="text-[12px] font-semibold mb-0.5">{f.title}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] leading-tight">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual clear cache */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[14px] font-semibold mb-3">Herramientas de instalación</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[13px] text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center gap-2" onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(reg => {
                      if (reg) reg.update();
                      showToast('Service Worker actualizado');
                    });
                  }
                }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Actualizar cache
                </button>
                <button className="px-4 py-2 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] text-[13px] text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center gap-2" onClick={() => {
                  localStorage.removeItem('archiflow-install-dismissed');
                  localStorage.removeItem('archiflow-installed');
                  setIsInstalled(false);
                  setShowInstallBanner(true);
                  showToast('Recordatorio de instalación restablecido');
                }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Mostrar prompt
                </button>
                <button className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 cursor-pointer hover:bg-red-500/20 transition-colors flex items-center gap-2" onClick={() => {
                  if (confirm('¿Borrar todo el caché offline? Esto recargará la app completamente.')) {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
                    }
                    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                    showToast('Caché borrado, recargando...');
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  Borrar caché
                </button>
              </div>
            </div>
          </div>)}

        </main>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] flex z-40 safe-bottom" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
        {[
          { id: 'dashboard', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: 'Inicio' },
          { id: 'projects', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Proyectos' },
          { id: 'tasks', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: 'Tareas' },
          { id: 'chat', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat' },
          { id: '_more', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>, label: 'Más' },
        ].map(item => (
          <button key={item.id} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-colors ${item.id === '_more' ? (sidebarOpen ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]') : screen === item.id ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`} onClick={() => item.id === '_more' ? setSidebarOpen(true) : navigateTo(item.id, null)}>
            {item.icon}
            <span className="text-[10px] leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== MODALS ===== */}

      {/* Project Modal */}
      {modals.project && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('project')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Casa Pérez" value={forms.projName || ''} onChange={e => setForms(p => ({ ...p, projName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Estado</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.projStatus || 'Concepto'} onChange={e => setForms(p => ({ ...p, projStatus: e.target.value }))}><option value="Concepto">Concepto</option><option value="Diseno">Diseño</option><option value="Ejecucion">Ejecución</option><option value="Terminado">Terminado</option></select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cliente</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre del cliente" value={forms.projClient || ''} onChange={e => setForms(p => ({ ...p, projClient: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Ubicación</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Barrio, Ciudad" value={forms.projLocation || ''} onChange={e => setForms(p => ({ ...p, projLocation: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha inicio</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.projStart || ''} onChange={e => setForms(p => ({ ...p, projStart: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha entrega</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.projEnd || ''} onChange={e => setForms(p => ({ ...p, projEnd: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Presupuesto (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="48000000" value={forms.projBudget || ''} onChange={e => setForms(p => ({ ...p, projBudget: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.projDesc || ''} onChange={e => setForms(p => ({ ...p, projDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('project')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveProject}>{editingId ? 'Guardar' : 'Crear proyecto'}</button>
          </div>
        </div>
      </div>)}

      {/* Task Modal */}
      {modals.task && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('task')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar tarea' : 'Nueva tarea'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="¿Qué hay que hacer?" value={forms.taskTitle || ''} onChange={e => setForms(p => ({ ...p, taskTitle: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Detalles adicionales..." value={forms.taskDescription || ''} onChange={e => setForms(p => ({ ...p, taskDescription: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskProject || ''} onChange={e => setForms(p => ({ ...p, taskProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Responsable</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskAssignee || ''} onChange={e => setForms(p => ({ ...p, taskAssignee: e.target.value }))}><option value="">Sin asignar</option>{teamUsers.map(u => <option key={u.id} value={u.id}>{u.data.name}{u.id === authUser?.uid ? ' (Tú)' : ''}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Prioridad</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskPriority || 'Media'} onChange={e => setForms(p => ({ ...p, taskPriority: e.target.value }))}><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Estado</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskStatus || 'Por hacer'} onChange={e => setForms(p => ({ ...p, taskStatus: e.target.value }))}><option value="Por hacer">Por hacer</option><option value="En progreso">En progreso</option><option value="Revision">Revisión</option><option value="Completado">Completado</option></select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha límite</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.taskDue || ''} onChange={e => setForms(p => ({ ...p, taskDue: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('task')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveTask}>{editingId ? 'Guardar cambios' : 'Crear tarea'}</button>
          </div>
        </div>
      </div>)}

      {/* Expense Modal */}
      {modals.expense && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('expense')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">Registrar gasto</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Concepto *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Descripción del gasto" value={forms.expConcept || ''} onChange={e => setForms(p => ({ ...p, expConcept: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.expProject || ''} onChange={e => setForms(p => ({ ...p, expProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.expCategory || 'Materiales'} onChange={e => setForms(p => ({ ...p, expCategory: e.target.value }))}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Monto (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="0" value={forms.expAmount || ''} onChange={e => setForms(p => ({ ...p, expAmount: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.expDate || ''} onChange={e => setForms(p => ({ ...p, expDate: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('expense')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveExpense}>Registrar</button>
          </div>
        </div>
      </div>)}

      {/* Supplier Modal */}
      {modals.supplier && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('supplier')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre del proveedor" value={forms.supName || ''} onChange={e => setForms(p => ({ ...p, supName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.supCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, supCategory: e.target.value }))}>{SUPPLIER_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Teléfono</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="+57 300..." value={forms.supPhone || ''} onChange={e => setForms(p => ({ ...p, supPhone: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Email</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="contacto@empresa.com" value={forms.supEmail || ''} onChange={e => setForms(p => ({ ...p, supEmail: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Dirección</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Dirección" value={forms.supAddress || ''} onChange={e => setForms(p => ({ ...p, supAddress: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Sitio web</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="www.empresa.com" value={forms.supWebsite || ''} onChange={e => setForms(p => ({ ...p, supWebsite: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Calificación (1-5)</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.supRating || '5'} onChange={e => setForms(p => ({ ...p, supRating: e.target.value }))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} ({n})</option>)}</select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Notas</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Notas..." value={forms.supNotes || ''} onChange={e => setForms(p => ({ ...p, supNotes: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('supplier')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveSupplier}>{editingId ? 'Guardar' : 'Crear proveedor'}</button>
          </div>
        </div>
      </div>)}

      {/* Approval Modal */}
      {modals.approval && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('approval')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">Nueva aprobación</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="¿Qué necesita aprobación?" value={forms.appTitle || ''} onChange={e => setForms(p => ({ ...p, appTitle: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="3" placeholder="Detalles..." value={forms.appDesc || ''} onChange={e => setForms(p => ({ ...p, appDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('approval')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveApproval}>Crear</button>
          </div>
        </div>
      </div>)}

      {/* Meeting Modal */}
      {modals.meeting && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('meeting')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar reunión' : 'Nueva reunión'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Junta de obra" value={forms.meetTitle || ''} onChange={e => setForms(p => ({ ...p, meetTitle: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.meetProject || ''} onChange={e => setForms(p => ({ ...p, meetProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.meetDate || ''} onChange={e => setForms(p => ({ ...p, meetDate: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hora</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="time" value={forms.meetTime || '09:00'} onChange={e => setForms(p => ({ ...p, meetTime: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Duración</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.meetDuration || '60'} onChange={e => setForms(p => ({ ...p, meetDuration: e.target.value }))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1.5 horas</option><option value="120">2 horas</option></select></div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Participantes (separados por coma)</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre 1, Nombre 2, ..." value={forms.meetAttendees || ''} onChange={e => setForms(p => ({ ...p, meetAttendees: e.target.value }))} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {teamUsers.slice(0, 8).map(u => {
                const currentAttendees = (forms.meetAttendees || '').split(',').map((s: string) => s.trim().toLowerCase());
                const isSelected = currentAttendees.includes(u.data.name.toLowerCase());
                return (
                  <button key={u.id} type="button" className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-all border ${isSelected ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--input)]'}`} onClick={() => {
                    const current = (forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    if (isSelected) { setForms(p => ({ ...p, meetAttendees: current.filter((n: string) => n.toLowerCase() !== u.data.name.toLowerCase()).join(', ') })); }
                    else { setForms(p => ({ ...p, meetAttendees: [...current, u.data.name].join(', ') })); }
                  }}>{u.data.name}</button>
                );
              })}
            </div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Agenda o notas de la reunión..." value={forms.meetDesc || ''} onChange={e => setForms(p => ({ ...p, meetDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('meeting')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveMeeting}>{editingId ? 'Guardar' : 'Crear reunión'}</button>
          </div>
        </div>
      </div>)}

      {/* Gallery Photo Modal */}
      {modals.gallery && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('gallery')}>
  <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
    <div className="text-lg font-semibold mb-5">{editingId ? 'Editar foto' : '📸 Agregar foto'}</div>
    
    {/* Image preview / upload area */}
    <div className="mb-4">
      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Foto *</label>
      {forms.galleryImageData ? (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
          <img src={forms.galleryImageData} alt="Preview" className="w-full max-h-[200px] object-contain bg-[var(--af-bg3)]" />
          <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors" onClick={() => setForms(p => ({ ...p, galleryImageData: '' }))}>✕</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--muted-foreground)]" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span className="text-sm text-[var(--muted-foreground)]">Toca para seleccionar una imagen</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG, WebP — máx. 5 MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleGalleryImageSelect} />
        </label>
      )}
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
      <div>
        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label>
        <select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryProject || ''} onChange={e => setForms(p => ({ ...p, galleryProject: e.target.value }))}>
          <option value="">Sin proyecto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label>
        <select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, galleryCategory: e.target.value }))}>
          {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
    <div className="mb-3">
      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label>
      <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Vista frontal del proyecto" value={forms.galleryCaption || ''} onChange={e => setForms(p => ({ ...p, galleryCaption: e.target.value }))} />
    </div>
    <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
      <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('gallery')}>Cancelar</button>
      <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveGalleryPhoto}>{editingId ? 'Guardar' : 'Subir foto'}</button>
    </div>
  </div>
</div>)}

      {/* Inventory Product Modal */}
      {modals.invProduct && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invProduct')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[520px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar producto' : '📦 Nuevo producto'}</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Cemento Portland" value={forms.invProdName || ''} onChange={e => setForms(p => ({ ...p, invProdName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">SKU</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="CMP-001" value={forms.invProdSku || ''} onChange={e => setForms(p => ({ ...p, invProdSku: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdCat || ''} onChange={e => setForms(p => ({ ...p, invProdCat: e.target.value }))}><option value="">Sin categoría</option>{invCategories.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Unidad</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdUnit || 'Unidad'} onChange={e => setForms(p => ({ ...p, invProdUnit: e.target.value }))}>{INV_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Precio unit. (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="50000" value={forms.invProdPrice || ''} onChange={e => setForms(p => ({ ...p, invProdPrice: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Stock por almacén</label>
            <div className="space-y-2">
              {INV_WAREHOUSES.map(wh => (
                <div key={wh} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] w-36 sm:w-44 flex-shrink-0 truncate">{wh}</span>
                  <input className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="0" value={forms[`invProdWS_${wh.replace(/\s/g, '_')}`] || '0'} onChange={e => setForms(p => ({ ...p, [`invProdWS_${wh.replace(/\s/g, '_')}`]: e.target.value }))} />
                  <span className="text-xs text-[var(--muted-foreground)] w-8">{forms.invProdUnit || 'Unidad'}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Product Image */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Foto del producto</label>
            {forms.invProdImage ? (
              <div className="relative rounded-xl overflow-hidden border border-[var(--border)] inline-block">
                <img src={forms.invProdImage} alt="Preview" className="w-full max-h-[140px] object-contain bg-[var(--af-bg3)]" />
                <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors cursor-pointer" onClick={() => setForms(p => ({ ...p, invProdImage: '' }))}>✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--muted-foreground)]" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="text-xs text-[var(--muted-foreground)]">Toca para agregar foto</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG — máx 3 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleInvProductImageSelect} />
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Stock mínimo (total)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="5" value={forms.invProdMinStock || '5'} onChange={e => setForms(p => ({ ...p, invProdMinStock: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Almacén principal</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdWarehouse || 'Almacén Principal'} onChange={e => setForms(p => ({ ...p, invProdWarehouse: e.target.value }))}>{INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.invProdDesc || ''} onChange={e => setForms(p => ({ ...p, invProdDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invProduct')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveInvProduct}>{editingId ? 'Guardar' : 'Crear producto'}</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Category Modal */}
      {modals.invCategory && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invCategory')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[420px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar categoría' : '🏷️ Nueva categoría'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Materiales" value={forms.invCatName || ''} onChange={e => setForms(p => ({ ...p, invCatName: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Color</label><div className="flex flex-wrap gap-2">{CAT_COLORS.map(color => (<button key={color} className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${forms.invCatColor === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setForms(p => ({ ...p, invCatColor: color }))} />))}</div></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.invCatDesc || ''} onChange={e => setForms(p => ({ ...p, invCatDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invCategory')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveInvCategory}>{editingId ? 'Guardar' : 'Crear categoría'}</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Movement Modal */}
      {modals.invMovement && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invMovement')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">📋 Registrar movimiento</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              <button className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Entrada' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, invMovType: 'Entrada' }))}>↓ Entrada</button>
              <button className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Salida' ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, invMovType: 'Salida' }))}>↑ Salida</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Producto *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invMovProduct || ''} onChange={e => setForms(p => ({ ...p, invMovProduct: e.target.value }))}><option value="">Seleccionar producto</option>{invProducts.map(p => <option key={p.id} value={p.id}>{p.data.name} (Total: {getTotalStock(p)})</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Almacén *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invMovWarehouse || 'Almacén Principal'} onChange={e => setForms(p => ({ ...p, invMovWarehouse: e.target.value }))}>{INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cantidad *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="10" min="1" value={forms.invMovQty || ''} onChange={e => setForms(p => ({ ...p, invMovQty: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.invMovDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invMovDate: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Referencia</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Factura #..." value={forms.invMovRef || ''} onChange={e => setForms(p => ({ ...p, invMovRef: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Motivo</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Compra proveedor, Uso en obra..." value={forms.invMovReason || ''} onChange={e => setForms(p => ({ ...p, invMovReason: e.target.value }))} /></div>
          {forms.invMovProduct && (() => { const prod = invProducts.find(p => p.id === forms.invMovProduct); if (!prod) return null; const wh = forms.invMovWarehouse || 'Almacén Principal'; const curStock = getWarehouseStock(prod, wh); const qty = Number(forms.invMovQty || 0); return (
            <div className={`rounded-lg p-3 mb-3 text-sm border ${forms.invMovType === 'Salida' && qty > curStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {wh}:</span><span className="font-medium">{curStock} {prod.data.unit}</span></div>
              {qty > 0 && (<div className="flex justify-between mt-1"><span className="text-[var(--muted-foreground)]">Después:</span><span className={`font-bold ${forms.invMovType === 'Salida' && qty > curStock ? 'text-red-400' : 'text-[var(--foreground)]'}`}>{forms.invMovType === 'Entrada' ? curStock + qty : Math.max(0, curStock - qty)} {prod.data.unit}</span></div>)}
              {forms.invMovType === 'Salida' && qty > curStock && (<div className="text-red-400 text-xs mt-1">⚠ Excede stock disponible en {wh}</div>)}
            </div>
          ); })()}
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invMovement')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-emerald-600 text-white border-none hover:bg-emerald-700 transition-colors" onClick={saveInvMovement}>Registrar</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Transfer Modal */}
      {modals.invTransfer && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invTransfer')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">🔄 Nueva transferencia</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Producto *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrProduct || ''} onChange={e => setForms(p => ({ ...p, invTrProduct: e.target.value }))}><option value="">Seleccionar producto</option>{invProducts.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Desde (origen) *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrFrom || ''} onChange={e => setForms(p => ({ ...p, invTrFrom: e.target.value }))}><option value="">Seleccionar</option>{INV_WAREHOUSES.map(w => <option key={w} value={w} disabled={w === forms.invTrTo}>{w}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hasta (destino) *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrTo || ''} onChange={e => setForms(p => ({ ...p, invTrTo: e.target.value }))}><option value="">Seleccionar</option>{INV_WAREHOUSES.map(w => <option key={w} value={w} disabled={w === forms.invTrFrom}>{w}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cantidad *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="10" min="1" value={forms.invTrQty || ''} onChange={e => setForms(p => ({ ...p, invTrQty: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.invTrDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invTrDate: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Notas</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Motivo de la transferencia..." value={forms.invTrNotes || ''} onChange={e => setForms(p => ({ ...p, invTrNotes: e.target.value }))} /></div>
          {/* Live preview */}
          {forms.invTrProduct && forms.invTrFrom && (() => { const prod = invProducts.find(p => p.id === forms.invTrProduct); if (!prod) return null; const fromStock = getWarehouseStock(prod, forms.invTrFrom); const toStock = getWarehouseStock(prod, forms.invTrTo); const qty = Number(forms.invTrQty || 0); return (
            <div className={`rounded-lg p-3 mb-3 text-sm border space-y-1 ${qty > fromStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {forms.invTrFrom}:</span><span className="font-medium">{fromStock} → {qty > fromStock ? '❌' : fromStock - qty} {prod.data.unit}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {forms.invTrTo}:</span><span className="font-medium">{toStock} → {toStock + qty} {prod.data.unit}</span></div>
              {qty > fromStock && (<div className="text-red-400 text-xs">⚠ Stock insuficiente en origen</div>)}
            </div>
          ); })()}
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invTransfer')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-blue-600 text-white border-none hover:bg-blue-700 transition-colors" onClick={saveInvTransfer}>Transferir</button>
          </div>
        </div>
      </div>)}

      {/* Lightbox Viewer */}
      {lightboxPhoto && (<div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn" onClick={closeLightbox}>
  <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
    {/* Close button */}
    <button className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors" onClick={closeLightbox}>✕</button>
    {/* Photo info */}
    <div className="absolute top-3 left-3 z-10 text-left">
      {lightboxPhoto.data.caption && <div className="text-white text-sm font-medium">{lightboxPhoto.data.caption}</div>}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs px-2 py-0.5 rounded bg-white/15 text-white/80">{lightboxPhoto.data.categoryName}</span>
        {(() => { const proj = projects.find(p => p.id === lightboxPhoto.data.projectId); return proj ? <span className="text-xs text-white/60">{proj.data.name}</span> : null; })()}
      </div>
    </div>
    {/* Image */}
    <img src={lightboxPhoto.data.imageData} alt={lightboxPhoto.data.caption || 'Foto'} className="max-w-full max-h-[80dvh] object-contain rounded-lg" />
    {/* Navigation */}
    <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
      <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxPrev}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span className="text-white/60 text-sm">{lightboxIndex + 1} / {getFilteredGalleryPhotos().length}</span>
      <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxNext}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</div>)}

      {/* Escape key handler */}
      <div style={{ display: 'none' }} aria-hidden="true" ref={() => {
        if (typeof window === 'undefined') return;
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            if (lightboxPhoto) closeLightbox();
            else if (Object.values(modals).some(Boolean)) { Object.keys(modals).forEach(k => closeModal(k)); }
          }
          if (lightboxPhoto) {
            if (e.key === 'ArrowLeft') lightboxPrev();
            if (e.key === 'ArrowRight') lightboxNext();
          }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }} />
    </div>
  );
}
