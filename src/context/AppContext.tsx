'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { ADMIN_EMAILS, INV_WAREHOUSES, CAT_COLORS, REACTION_EMOJIS } from '@/lib/constants';
import { fileToBase64, fmtDate } from '@/lib/helpers';
import type { Project, Task, TeamUser, Expense, Supplier, Approval, WorkPhase, ProjectFile, OneDriveFile } from '@/lib/types';

/* ===== CONTEXT TYPE ===== */
interface AppContextType {
  // Core state
  ready: boolean;
  authUser: any;
  screen: string;
  selectedProjectId: string | null;
  projects: Project[];
  tasks: Task[];
  teamUsers: TeamUser[];
  expenses: Expense[];
  suppliers: Supplier[];
  messages: any[];
  chatProjectId: string | null;
  workPhases: WorkPhase[];
  projectFiles: ProjectFile[];
  approvals: Approval[];
  sidebarOpen: boolean;
  chatMobileShow: boolean;
  loading: boolean;
  toast: { msg: string; type: string } | null;
  darkMode: boolean;

  // MS/OneDrive
  msAccessToken: string | null;
  msConnected: boolean;
  msLoading: boolean;
  oneDriveFiles: OneDriveFile[];
  odProjectFolder: string | null;
  showOneDrive: boolean;

  // Calendar
  calMonth: number;
  calYear: number;
  calSelectedDate: string | null;
  calFilterProject: string;
  meetings: any[];

  // Gallery
  galleryPhotos: any[];
  galleryFilterProject: string;
  galleryFilterCat: string;
  lightboxPhoto: any;
  lightboxIndex: number;

  // Inventory
  invProducts: any[];
  invCategories: any[];
  invMovements: any[];
  invTab: string;
  invFilterCat: string;
  invSearch: string;
  invMovFilterType: string;
  invTransfers: any[];
  invTransferFilterStatus: string;
  invWarehouseFilter: string;

  // Work Logs
  workLogs: any[];
  workLogForm: any;
  expandedLog: string | null;

  // Actas
  actas: any[];
  expandedActa: string | null;
  selectedActa: any;
  actaFilterProject: string;

  // Admin
  adminTab: string;
  adminWeekOffset: number;
  adminTaskSearch: string;
  adminFilterAssignee: string;
  adminFilterProject: string;
  adminFilterPriority: string;
  adminTooltipTask: any;
  adminTooltipPos: { x: number; y: number };
  adminPermSection: string;

  // Chat voice & files
  isRecording: boolean;
  recDuration: number;
  recVolume: number;
  audioPreviewUrl: string | null;
  audioPreviewDuration: number;
  pendingFiles: any[];
  chatDropActive: boolean;
  playingAudio: string | null;
  audioProgress: number;
  audioCurrentTime: number;

  // Enhanced chat
  chatTab: string;
  replyingTo: any;
  chatSearchMsg: string;
  onlineUsers: string[];
  aiChatHistory: { role: string; content: string }[];
  aiLoading: boolean;
  reactionPickerMsg: string | null;
  unreadCounts: Record<string, number>;
  directChatId: string | null;
  dmChats: any[];
  lastReadPerChat: Record<string, string>;
  showNewDMModal: boolean;

  // PWA
  installPrompt: any;
  showInstallBanner: boolean;
  isInstalled: boolean;
  showInstallGuide: boolean;
  isStandalone: boolean;
  platform: string;

  // Notifications
  notifPermission: NotificationPermission;
  notifHistory: any[];
  notifPrefs: Record<string, boolean>;
  showNotifPanel: boolean;
  unreadCount: number;
  notifSound: boolean;
  inAppNotifs: any[];
  notifFilterCat: string;
  showNotifBanner: boolean;

  // Modals & Forms
  modals: Record<string, boolean>;
  editingId: string | null;
  forms: Record<string, any>;

  // Derived values
  myRole: string;
  isEmailAdmin: boolean;
  isAdmin: boolean;
  activeTasks: Task[];
  completedTasks: Task[];
  overdueTasks: Task[];
  urgentTasks: Task[];
  adminFilteredTasks: Task[];
  pendingCount: number;
  currentProject: Project | undefined;
  projectExpenses: Expense[];
  projectTasks: Task[];
  projectBudget: number;
  projectSpent: number;
  invTotalValue: number;
  invLowStock: any[];
  invTotalStock: number;
  invPendingTransfers: number;
  invAlerts: any[];
  userName: string;
  initials: string;

  // Setters — Core
  setScreen: (s: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSidebarOpen: (v: boolean) => void;
  setChatMobileShow: (v: boolean) => void;
  setForms: (updater: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  setEditingId: (id: string | null) => void;
  setDarkMode: (v: boolean) => void;
  setLoading: (v: boolean) => void;

  // Setters — Chat
  setChatProjectId: (id: string | null) => void;
  setChatTab: (t: 'channels' | 'direct' | 'ai') => void;
  setReplyingTo: (v: any) => void;
  setChatSearchMsg: (v: string) => void;
  setReactionPickerMsg: (v: string | null) => void;
  setDirectChatId: (id: string | null) => void;
  setShowNewDMModal: (v: boolean) => void;
  setChatDropActive: (v: boolean) => void;
  setAudioPreviewUrl: (v: string | null) => void;
  setAudioPreviewDuration: (v: number) => void;
  setAiChatHistory: (v: { role: string; content: string }[]) => void;

  // Setters — Calendar
  setCalMonth: (m: number) => void;
  setCalYear: (y: number) => void;
  setCalSelectedDate: (d: string | null) => void;
  setCalFilterProject: (p: string) => void;

  // Setters — Gallery
  setGalleryFilterProject: (v: string) => void;
  setGalleryFilterCat: (v: string) => void;
  setLightboxPhoto: (v: any) => void;
  setLightboxIndex: (v: number) => void;

  // Setters — Inventory
  setInvTab: (t: string) => void;
  setInvFilterCat: (v: string) => void;
  setInvSearch: (v: string) => void;
  setInvMovFilterType: (v: string) => void;
  setInvTransferFilterStatus: (v: string) => void;
  setInvWarehouseFilter: (v: string) => void;

  // Setters — Admin
  setAdminTab: (t: string) => void;
  setAdminWeekOffset: (v: number) => void;
  setAdminTaskSearch: (v: string) => void;
  setAdminFilterAssignee: (v: string) => void;
  setAdminFilterProject: (v: string) => void;
  setAdminFilterPriority: (v: string) => void;
  setAdminTooltipTask: (v: any) => void;
  setAdminTooltipPos: (v: { x: number; y: number }) => void;
  setAdminPermSection: (v: string) => void;

  // Setters — Work Logs & Actas
  setWorkLogForm: (v: any) => void;
  setExpandedLog: (v: string | null) => void;
  setExpandedActa: (v: string | null) => void;
  setSelectedActa: (v: any) => void;
  setActaFilterProject: (v: string) => void;

  // Setters — PWA
  setIsInstalled: (v: boolean) => void;
  setShowInstallBanner: (v: boolean) => void;
  setShowInstallGuide: (v: boolean) => void;

  // Setters — Notifications
  setShowNotifPanel: (v: boolean) => void;
  setNotifFilterCat: (v: string) => void;
  setNotifPrefs: (v: Record<string, boolean>) => void;
  setNotifSound: (v: boolean) => void;

  // Setters — Microsoft
  setShowOneDrive: (v: boolean) => void;

  // Actions
  showToast: (msg: string, type?: string) => void;
  navigateTo: (s: string, projId?: string | null) => void;
  openModal: (n: string) => void;
  closeModal: (n: string) => void;
  openProject: (id: string) => void;
  toggleTheme: () => void;
  handleInstall: () => Promise<void>;
  dismissInstallBanner: () => void;

  // Auth
  doLogin: () => Promise<void>;
  doRegister: () => Promise<void>;
  doGoogleLogin: () => Promise<void>;
  doMicrosoftLogin: (isRefresh?: boolean) => Promise<boolean>;
  doLogout: () => void;

  // Firebase CRUD
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openEditProject: (p: Project) => void;
  saveTask: () => Promise<void>;
  openEditTask: (t: Task) => void;
  toggleTask: (id: string, status: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  saveExpense: () => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveSupplier: () => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  updateProjectProgress: (val: number) => Promise<void>;
  updateUserName: (newName: string) => Promise<void>;
  updateUserRole: (uid: string, newRole: string) => Promise<void>;

  // File & phase management
  uploadFile: (e: any) => Promise<void>;
  deleteFile: (file: ProjectFile) => Promise<void>;
  initDefaultPhases: () => Promise<void>;
  togglePhaseActive: (phaseId: string, active: boolean) => Promise<void>;
  deletePhase: (phaseId: string) => Promise<void>;
  addCustomPhase: () => Promise<void>;
  toggleGroupActive: (groupName: string, enable: boolean) => Promise<void>;
  addPhaseEntry: (phaseId: string) => Promise<void>;
  toggleEntryConfirmed: (phaseId: string, entryId: string) => Promise<void>;
  deletePhaseEntry: (phaseId: string, entryId: string) => Promise<void>;
  updatePhaseStatus: (phaseId: string, status: string) => Promise<void>;

  // Approvals
  saveApproval: () => Promise<void>;
  updateApproval: (id: string, status: string) => Promise<void>;
  deleteApproval: (id: string) => Promise<void>;

  // Chat
  sendMessage: (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  handleMicButton: () => Promise<void>;
  sendVoiceNote: () => Promise<void>;
  handleFileSelect: (files: FileList | null) => void;
  removePendingFile: (id: string) => void;
  sendPendingFiles: () => Promise<void>;
  sendAll: () => Promise<void>;
  toggleReaction: (msgId: string, emoji: string) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  startDM: (otherUserId: string) => Promise<void>;
  sendAIChat: () => Promise<void>;
  markConvAsRead: (convId: string) => Promise<void>;
  toggleAudioPlay: (msgId: string) => void;

  // Gallery
  saveGalleryPhoto: () => Promise<void>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  handleGalleryImageSelect: (e: any) => Promise<void>;
  openLightbox: (photo: any, idx: number) => void;
  closeLightbox: () => void;
  lightboxPrev: () => void;
  lightboxNext: () => void;
  getFilteredGalleryPhotos: () => any[];

  // Meetings
  saveMeeting: () => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  openEditMeeting: (m: any) => void;

  // Inventory
  getWarehouseStock: (product: any, warehouse: string) => number;
  getTotalStock: (product: any) => number;
  buildWarehouseStock: (product: any) => Record<string, number>;
  saveInvProduct: () => Promise<void>;
  deleteInvProduct: (id: string) => Promise<void>;
  openEditInvProduct: (p: any) => void;
  saveInvCategory: () => Promise<void>;
  deleteInvCategory: (id: string) => Promise<void>;
  openEditInvCategory: (c: any) => void;
  saveInvMovement: () => Promise<void>;
  deleteInvMovement: (id: string) => Promise<void>;
  saveInvTransfer: () => Promise<void>;
  deleteInvTransfer: (id: string) => Promise<void>;
  getInvCategoryName: (catId: string) => string;
  getInvCategoryColor: (catId: string) => string;
  getInvProductName: (prodId: string) => string;
  handleInvProductImageSelect: (e: any) => Promise<void>;

  // Notifications
  sendNotif: (title: string, body: string, icon?: string, tag?: string, data?: any) => void;
  sendBrowserNotif: (title: string, body: string, icon?: string, tag?: string, data?: any) => void;
  requestNotifPermission: () => Promise<void>;
  dismissNotifBanner: () => void;
  toggleNotifPref: (key: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifRead: () => void;
  clearNotifHistory: () => void;

  // Microsoft
  disconnectMicrosoft: () => void;
  graphApiGet: (endpoint: string) => Promise<any | null>;
  graphApiPost: (endpoint: string, body: any) => Promise<any | null>;
  ensureProjectFolder: (projectName: string) => Promise<string | null>;
  loadOneDriveFiles: (folderId: string) => Promise<void>;
  uploadToOneDrive: (file: File, folderId: string) => Promise<void>;
  deleteFromOneDrive: (fileId: string, folderId: string) => Promise<void>;
  openOneDriveForProject: (projectName: string) => Promise<void>;

  // Helpers
  getUserName: (uid: string) => string;
  getUserRole: (uid: string) => string;
  getProjectColor: (projId: string) => string;
  getProjectColorLight: (projId: string) => string;
  getMonday: (d: Date) => Date;
  getGanttDays: () => Date[];
  getTaskBar: (task: any, days: Date[]) => { left: number; width: number } | null;
  buildGanttRows: (memberTasks: any[]) => any[][];
  findOverlaps: (memberTasks: any[]) => Set<string>;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  mediaRecRef: React.MutableRefObject<any>;
  audioChunksRef: React.MutableRefObject<any[]>;
  audioStreamRef: React.MutableRefObject<any>;
  analyserRef: React.MutableRefObject<any>;
  recTimerRef: React.MutableRefObject<any>;
  recAnimRef: React.MutableRefObject<any>;
  audioPreviewBlobRef: React.MutableRefObject<Blob | null>;
  playingAudioRef: React.MutableRefObject<string | null>;
  navigateToRef: React.MutableRefObject<(s: string, projId?: string | null) => void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/* ===== APP PROVIDER ===== */
export function AppProvider({ children }: { children: React.ReactNode }) {
  // ===== CORE STATE =====
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
  const [darkMode, setDarkMode] = useState(true);

  // MS/OneDrive
  const [msAccessToken, setMsAccessToken] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFile[]>([]);
  const [odProjectFolder, setOdProjectFolder] = useState<string | null>(null);
  const [showOneDrive, setShowOneDrive] = useState(false);
  const [msTokenTime, setMsTokenTime] = useState<number>(0);
  const msRefreshLockRef = useRef(false);

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calFilterProject, setCalFilterProject] = useState<string>('all');
  const [meetings, setMeetings] = useState<any[]>([]);

  // Gallery
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [galleryFilterProject, setGalleryFilterProject] = useState<string>('all');
  const [galleryFilterCat, setGalleryFilterCat] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Inventory
  const [invProducts, setInvProducts] = useState<any[]>([]);
  const [invCategories, setInvCategories] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [invTab, setInvTab] = useState<string>('dashboard');
  const [invFilterCat, setInvFilterCat] = useState<string>('all');
  const [invSearch, setInvSearch] = useState('');
  const [invMovFilterType, setInvMovFilterType] = useState<string>('all');
  const [invTransfers, setInvTransfers] = useState<any[]>([]);
  const [invTransferFilterStatus, setInvTransferFilterStatus] = useState<string>('all');
  const [invWarehouseFilter, setInvWarehouseFilter] = useState<string>('all');

  // Work Logs
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [workLogForm, setWorkLogForm] = useState<any>({});
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Actas
  const [actas, setActas] = useState<any[]>([]);
  const [expandedActa, setExpandedActa] = useState<string | null>(null);
  const [selectedActa, setSelectedActa] = useState<any>(null);
  const [actaFilterProject, setActaFilterProject] = useState<string>('all');

  // Admin
  const [adminTab, setAdminTab] = useState<string>('timeline');
  const [adminWeekOffset, setAdminWeekOffset] = useState(0);
  const [adminTaskSearch, setAdminTaskSearch] = useState('');
  const [adminFilterAssignee, setAdminFilterAssignee] = useState<string>('all');
  const [adminFilterProject, setAdminFilterProject] = useState<string>('all');
  const [adminFilterPriority, setAdminFilterPriority] = useState<string>('all');
  const [adminTooltipTask, setAdminTooltipTask] = useState<any>(null);
  const [adminTooltipPos, setAdminTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [adminPermSection, setAdminPermSection] = useState<string>('roles');

  // Chat voice & files
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

  // Enhanced chat
  const [chatTab, setChatTab] = useState<string>('channels');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [chatSearchMsg, setChatSearchMsg] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [aiChatHistory, setAiChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [reactionPickerMsg, setReactionPickerMsg] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [directChatId, setDirectChatId] = useState<string | null>(null);
  const [dmChats, setDmChats] = useState<any[]>([]);
  const [lastReadPerChat, setLastReadPerChat] = useState<Record<string, string>>({});
  const [showNewDMModal, setShowNewDMModal] = useState(false);

  // PWA
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ chat: true, tasks: true, meetings: true, approvals: true, inventory: true, projects: true });
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

  // Modals & Forms
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const openModal = useCallback((n: string) => setModals(p => ({ ...p, [n]: true })), []);
  const closeModal = useCallback((n: string) => { setModals(p => ({ ...p, [n]: false })); setEditingId(null); }, []);
  const [forms, setForms] = useState<Record<string, any>>({});

  // ===== TOAST =====
  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ===== THEME =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archiflow-theme');
      const isDark = saved ? saved === 'dark' : true;
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch {}
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('archiflow-theme', next ? 'dark' : 'light');
    showToast(next ? 'Modo nocturno activado' : 'Modo diurno activado');
  };

  // ===== PWA =====
  useEffect(() => {
    const isDismissed = localStorage.getItem('archiflow-install-dismissed');
    const alreadyInstalled = localStorage.getItem('archiflow-installed');
    if (alreadyInstalled) { setIsInstalled(true); return; }
    if (isDismissed) { const t = parseInt(isDismissed); if (Date.now() - t < 7 * 24 * 60 * 60 * 1000) return; }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setTimeout(() => setShowInstallBanner(true), 2000); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstallPrompt(null); setShowInstallBanner(false); setIsInstalled(true); localStorage.setItem('archiflow-installed', 'true'); showToast('ArchiFlow instalado correctamente'); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => { if (!installPrompt) return; installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') { setInstallPrompt(null); setShowInstallBanner(false); } };
  const dismissInstallBanner = () => { setShowInstallBanner(false); localStorage.setItem('archiflow-install-dismissed', String(Date.now())); };

  const getPlatform = () => { const ua = navigator.userAgent; if (/iPhone|iPad|iPod/.test(ua)) return 'ios'; if (/Android/.test(ua)) return 'android'; if (/Windows/.test(ua)) return 'windows'; if (/Mac/.test(ua)) return 'mac'; return 'other'; };
  const platform = getPlatform();

  // ===== NOTIFICATION ENGINE =====
  useEffect(() => { const h = () => { isTabVisibleRef.current = document.visibilityState === 'visible'; }; document.addEventListener('visibilitychange', h); isTabVisibleRef.current = document.visibilityState === 'visible'; return () => document.removeEventListener('visibilitychange', h); }, []);
  const vibrateNotif = useCallback(() => { try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch {} }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) { showToast('Tu navegador no soporta notificaciones', 'error'); return; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm); setShowNotifBanner(false);
    if (perm === 'granted') { showToast('🔔 Notificaciones activadas'); localStorage.setItem('archiflow-notif-perm', 'granted'); localStorage.setItem('archiflow-notif-dismissed', String(Date.now())); }
    else { showToast('Notificaciones bloqueadas por el navegador', 'error'); }
  };
  const dismissNotifBanner = () => { setShowNotifBanner(false); localStorage.setItem('archiflow-notif-dismissed', String(Date.now())); };

  const playNotifSound = useCallback((type?: string) => {
    if (!notifSound) return;
    try {
      const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.07;
      const tones: Record<string, [number, number]> = { chat: [587.33, 880], task: [659.25, 783.99], meeting: [523.25, 659.25], approval: [698.46, 880], inventory: [440, 554.37], project: [493.88, 659.25], reminder: [880, 1046.5] };
      const [f1, f2] = tones[type || ''] || [587.33, 880];
      osc.frequency.value = f1; osc.start();
      setTimeout(() => { osc.frequency.value = f2; }, 100);
      setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.stop(ctx.currentTime + 0.25); }, 200);
    } catch {}
  }, [notifSound]);

  const sendNotif = useCallback((title: string, body: string, icon?: string, tag?: string, data?: any) => {
    const type = data?.type || 'info';
    const notifEntry = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, body, icon: icon || '🔔', type, read: false, timestamp: new Date(), screen: data?.screen || null, itemId: data?.itemId || null };
    setNotifHistory(prev => [notifEntry, ...prev].slice(0, 100));
    setInAppNotifs(prev => [...prev, { ...notifEntry, ts: Date.now() }]);
    setTimeout(() => setInAppNotifs(prev => prev.filter(n => Date.now() - n.ts < 5000)), 5500);
    playNotifSound(type); vibrateNotif();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: icon || '/icon-192.png', badge: '/icon-192.png', tag: tag || `archiflow-${Date.now()}`, requireInteraction: false, silent: true, data });
        n.onclick = () => { window.focus(); n.close(); if (data?.screen) navigateToRef.current(data.screen, data.itemId); };
        setTimeout(() => n.close(), 8000);
      } catch (e: any) { console.warn('OS Notification error:', e); }
    }
  }, [playNotifSound, vibrateNotif]);

  const sendBrowserNotif = sendNotif;
  const toggleNotifPref = (key: string) => { setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] })); };
  const markNotifRead = (id: string) => { setNotifHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); };
  const markAllNotifRead = () => { setNotifHistory(prev => prev.map(n => ({ ...n, read: true }))); };
  const clearNotifHistory = () => { setNotifHistory([]); setInAppNotifs([]); showToast('Historial de notificaciones limpiado'); };

  // ===== FIREBASE READY =====
  useEffect(() => {
    const iv = setInterval(() => { try { const fb = (window as any).firebase; if (fb && fb.apps && fb.apps.length > 0) { clearInterval(iv); setReady(true); } } catch {} }, 100);
    return () => clearInterval(iv);
  }, []);

  // ===== AUTH =====
  useEffect(() => {
    if (!ready) return;
    const fb = (window as any).firebase; const auth = fb.auth();
    auth.setPersistence(fb.auth.Auth.Persistence.LOCAL).catch(() => {});
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      try {
        setAuthUser(user || null);
        if (user) {
          await fb.auth().currentUser;
          const db = fb.firestore(); const ref = db.collection('users').doc(user.uid);
          const snap = await ref.get();
          const isAdminEmail = ADMIN_EMAILS.includes(user.email);
          if (!snap.exists) { try { await ref.set({ name: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || '', role: isAdminEmail ? 'Admin' : 'Miembro', createdAt: fb.firestore.FieldValue.serverTimestamp() }); } catch {} }
          else if (isAdminEmail) { const current = snap.data()?.role; if (current !== 'Admin') { try { await ref.update({ role: 'Admin' }); } catch {} } }
        }
      } catch (err: any) { if (user) setAuthUser(user); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ready]);

  // ===== FIREBASE LISTENERS =====
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('users').onSnapshot(snap => { setTeamUsers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot(snap => { setProjects(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(snap => { setTasks(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot(snap => { setExpenses(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot(snap => { setSuppliers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !selectedProjectId) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot(snap => { setWorkPhases(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => { unsub(); setWorkPhases([]); }; }, [ready, selectedProjectId]);
  useEffect(() => { if (!ready || !selectedProjectId) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot(snap => { setProjectFiles(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))); }, () => {}); return () => { unsub(); setProjectFiles([]); }; }, [ready, selectedProjectId]);
  useEffect(() => { if (!ready || !selectedProjectId) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot(snap => { setApprovals(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => { unsub(); setApprovals([]); }; }, [ready, selectedProjectId]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot(snap => { setMeetings(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !selectedProjectId) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('projects').doc(selectedProjectId).collection('workLogs').orderBy('date', 'desc').onSnapshot(snap => { setWorkLogs(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => { unsub(); setWorkLogs([]); }; }, [ready, selectedProjectId]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('actas').orderBy('date', 'desc').onSnapshot(snap => { setActas(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot(snap => { setGalleryPhotos(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('invProducts').orderBy('createdAt', 'desc').onSnapshot(snap => { setInvProducts(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('invCategories').orderBy('name', 'asc').onSnapshot(snap => { setInvCategories(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('invMovements').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => { setInvMovements(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('invTransfers').orderBy('createdAt', 'desc').limit(100).onSnapshot(snap => { setInvTransfers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);

  // ===== CHAT LISTENERS =====
  const chatProjectInitRef = useRef(false);
  useEffect(() => { if (projects.length > 0 && !chatProjectId && !chatProjectInitRef.current) { chatProjectInitRef.current = true; setChatProjectId('__general__'); } }, [projects, chatProjectId]);
  useEffect(() => { const el = document.getElementById('chat-msgs'); if (el) el.scrollTop = el.scrollHeight; }, [messages]);
  useEffect(() => { if (!ready || !authUser) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('dmChats').where('participants', 'array-contains', authUser.uid).orderBy('updatedAt', 'desc').onSnapshot(snap => { setDmChats(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))); }, () => {}); return () => unsub(); }, [ready, authUser]);
  useEffect(() => { if (!ready || !directChatId) return; const db = (window as any).firebase.firestore(); const unsub = db.collection('dmChats').doc(directChatId).collection('messages').orderBy('createdAt', 'asc').limitToLast(80).onSnapshot(snap => { setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))); }, () => {}); return () => { unsub(); setMessages([]); }; }, [ready, directChatId]);
  useEffect(() => { if (!ready) return; if (chatTab === 'direct' || !chatProjectId) return; const db = (window as any).firebase.firestore(); let unsub: any; if (chatProjectId === '__general__') { unsub = db.collection('generalMessages').orderBy('createdAt', 'asc').limitToLast(80).onSnapshot(snap => { setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))); }, () => {}); } else { unsub = db.collection('projects').doc(chatProjectId).collection('messages').orderBy('createdAt', 'asc').limitToLast(80).onSnapshot(snap => { setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))); }, () => {}); } return () => { if (unsub) unsub(); setMessages([]); }; }, [ready, chatProjectId, chatTab]);

  // Online presence
  useEffect(() => { if (!ready || !authUser) return; try { const db = (window as any).firebase.firestore(); const userStatusRef = db.collection('userStatus').doc(authUser.uid); const connectedRef = db.collection('.info/connected'); const unsubConnected = connectedRef.onSnapshot((snap: any) => { try { if (snap.data()?.connected === true) { userStatusRef.set({ online: true, lastSeen: (window as any).firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {}); userStatusRef.onDisconnect().set({ online: false, lastSeen: (window as any).firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {}); } } catch {} }, () => {}); const unsubStatus = db.collection('userStatus').onSnapshot(snap => { const onlines: string[] = []; snap.docs.forEach((d: any) => { if (d.data()?.online) onlines.push(d.id); }); setOnlineUsers(onlines); }, () => {}); return () => { try { unsubConnected(); unsubStatus(); } catch {} }; } catch {} }, [ready, authUser]);

  // Unread tracking
  useEffect(() => { if (messages.length === 0) return; const convId = chatTab === 'direct' && directChatId ? `dm_${directChatId}` : chatProjectId || ''; if (!convId) return; setLastReadPerChat(prev => ({ ...prev, [convId]: messages[messages.length - 1]?.id || '' })); setUnreadCounts(prev => { const next = { ...prev }; next[convId] = 0; return next; }); }, [messages, chatProjectId, directChatId, chatTab]);
  const prevMsgLenRef = useRef(0);
  useEffect(() => { if (!ready || !authUser) return; const prevLen = prevMsgLenRef.current; const curLen = messages.length; prevMsgLenRef.current = curLen; if (curLen <= prevLen) return; const newMsgs = messages.slice(prevLen); const activeConvId = chatTab === 'direct' ? `dm_${directChatId}` : chatProjectId || ''; let delta: Record<string, number> = {}; newMsgs.forEach(m => { if (m.uid === authUser?.uid) return; const cId = m._isDM ? `dm_${directChatId}` : chatProjectId || ''; if (cId && cId !== activeConvId) { delta[cId] = (delta[cId] || 0) + 1; } }); if (Object.keys(delta).length > 0) { setUnreadCounts(prev => { const next = { ...prev }; Object.entries(delta).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; }); return next; }); } }, [messages.length, ready, authUser, chatTab, chatProjectId, directChatId]);

  // ===== NOTIFICATION EFFECTS =====
  useEffect(() => { if (!('Notification' in window)) return; setNotifPermission(Notification.permission); try { const savedPrefs = localStorage.getItem('archiflow-notif-prefs'); if (savedPrefs) setNotifPrefs(JSON.parse(savedPrefs)); const savedSound = localStorage.getItem('archiflow-notif-sound'); if (savedSound !== null) setNotifSound(savedSound === 'true'); } catch {} if (Notification.permission === 'default') { const dismissed = localStorage.getItem('archiflow-notif-dismissed'); if (dismissed) { if (Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000) return; } const timer = setTimeout(() => { if (Notification.permission === 'default') setShowNotifBanner(true); }, 5000); return () => clearTimeout(timer); } }, []);
  useEffect(() => { try { localStorage.setItem('archiflow-notif-sound', String(notifSound)); } catch {} }, [notifSound]);
  useEffect(() => { try { localStorage.setItem('archiflow-notif-prefs', JSON.stringify(notifPrefs)); } catch {} }, [notifPrefs]);
  useEffect(() => { setUnreadCount(notifHistory.filter(n => !n.read).length); }, [notifHistory]);

  // Chat message notifications
  useEffect(() => { if (messages.length === 0) { prevMessagesRef.current = []; return; } const prev = prevMessagesRef.current; const newMsgs = messages.filter(m => !prev.find(p => p.id === m.id)); if (newMsgs.length > 0 && notifPrefs.chat) { const otherMsgs = newMsgs.filter(m => m.uid !== authUser?.uid); if (otherMsgs.length > 0) { const lastMsg = otherMsgs[otherMsgs.length - 1]; const projName = chatProjectId === '__general__' ? 'Chat General' : projects.find(p => p.id === chatProjectId)?.data?.name || 'Chat'; const senderName = lastMsg.userName || 'Alguien'; const msgType = lastMsg.type || 'TEXT'; const typeLabel = msgType === 'AUDIO' ? '🎤 Nota de voz' : msgType === 'IMAGE' ? '🖼️ Imagen' : msgType === 'FILE' ? '📎 Archivo' : ''; const bodyText = lastMsg.text?.substring(0, 120) || (msgType === 'AUDIO' ? '🎵 Nota de voz' : msgType === 'IMAGE' ? '📷 Foto' : msgType === 'FILE' ? `📎 ${lastMsg.fileName || 'Archivo'}` : ''); sendBrowserNotif(`${senderName} en ${projName}`, `${typeLabel}${bodyText}`, undefined, `chat-${chatProjectId}`, { type: 'chat', screen: 'chat', itemId: chatProjectId }); } } prevMessagesRef.current = messages; }, [messages, notifPrefs.chat, authUser, chatProjectId, projects, sendBrowserNotif]);

  // Task notifications
  useEffect(() => { if (tasks.length === 0) { prevTasksRef.current = []; return; } const prev = prevTasksRef.current; const newTasks = tasks.filter(t => !prev.find(p => p.id === t.id)); const changedTasks = tasks.filter(t => { const p = prev.find(pp => pp.id === t.id); return p && (p.data.status !== t.data.status || p.data.priority !== t.data.priority || p.data.assigneeId !== t.data.assigneeId); }); if (notifPrefs.tasks) { newTasks.forEach(t => { if (t.data.assigneeId === authUser?.uid) { const proj = projects.find(p => p.id === t.data.projectId); sendBrowserNotif('📋 Nueva tarea asignada', `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id }); } }); changedTasks.forEach(t => { if (t.data.assigneeId === authUser?.uid) { const proj = projects.find(p => p.id === t.data.projectId); sendBrowserNotif(t.data.status === 'Completado' ? '✅ Tarea completada' : t.data.status === 'En progreso' ? '🔄 Tarea en progreso' : '📝 Tarea actualizada', `"${t.data.title}"${proj ? ` — ${proj.data.name}` : ''} · ${t.data.status}`, undefined, `task-${t.id}`, { type: 'task', screen: 'tasks', itemId: t.id }); } }); } prevTasksRef.current = tasks; }, [tasks, notifPrefs.tasks, authUser, projects, sendBrowserNotif]);

  // Meeting notifications
  useEffect(() => { if (meetings.length === 0) { prevMeetingsRef.current = []; return; } const prev = prevMeetingsRef.current; const newMeetings = meetings.filter(m => !prev.find(p => p.id === m.id)); if (newMeetings.length > 0 && notifPrefs.meetings) { newMeetings.forEach(m => { const proj = projects.find(p => p.id === m.data.projectId); sendBrowserNotif('📅 Nueva reunión programada', `"${m.data.title}"${m.data.time ? ` a las ${m.data.time}` : ''}${m.data.date ? ` · ${fmtDate(m.data.date)}` : ''}${proj ? ` — ${proj.data.name}` : ''}`, undefined, `meeting-${m.id}`, { type: 'meeting', screen: 'calendar', itemId: m.id }); }); } prevMeetingsRef.current = meetings; }, [meetings, notifPrefs.meetings, projects, sendBrowserNotif]);

  // Approval notifications
  useEffect(() => { if (approvals.length === 0) { prevApprovalsRef.current = []; return; } const prev = prevApprovalsRef.current; const newApprovals = approvals.filter(a => !prev.find(p => p.id === a.id)); const changedApprovals = approvals.filter(a => { const p = prev.find(pp => pp.id === a.id); return p && p.data.status !== a.data.status; }); if (notifPrefs.approvals) { newApprovals.forEach(a => { sendBrowserNotif('📋 Nueva solicitud de aprobación', `"${a.data.title}" · Pendiente de revisión`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId }); }); changedApprovals.forEach(a => { sendBrowserNotif(a.data.status === 'Aprobada' ? '✅ Aprobación aceptada' : a.data.status === 'Rechazada' ? '❌ Aprobación rechazada' : '📝 Aprobación actualizada', `"${a.data.title}" · ${a.data.status}`, undefined, `approval-${a.id}`, { type: 'approval', screen: 'projectDetail', itemId: selectedProjectId }); }); } prevApprovalsRef.current = approvals; }, [approvals, notifPrefs.approvals, selectedProjectId, sendBrowserNotif]);

  // Inventory notifications
  useEffect(() => { if (!notifPrefs.inventory) return; const prevMov = prevMovementsRef.current; const prevTrans = prevTransfersRef.current; const newMovs = invMovements.filter(m => !prevMov.find(p => p.id === m.id)); newMovs.forEach(m => { const prod = invProducts.find(p => p.id === m.data.productId); sendNotif(m.data.type === 'Entrada' ? '📥 Entrada de inventario' : '📤 Salida de inventario', `${prod?.data?.name || 'Producto'} · ${m.data.quantity} ${prod?.data?.unit || 'uds'}${m.data.reason ? ` — ${m.data.reason}` : ''}`, undefined, `mov-${m.id}`, { type: 'inventory', screen: 'inventory' }); }); const newTrans = invTransfers.filter(t => !prevTrans.find(p => p.id === t.id)); newTrans.forEach(t => { sendNotif('🚚 Nueva transferencia', `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse} (${t.data.quantity})`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' }); }); const changedTrans = invTransfers.filter(t => { const p = prevTrans.find(pp => pp.id === t.id); return p && p.data.status !== t.data.status; }); changedTrans.forEach(t => { const statusEmoji = t.data.status === 'Completada' ? '✅' : t.data.status === 'En tránsito' ? '🚛' : t.data.status === 'Cancelada' ? '❌' : '📦'; sendNotif(`${statusEmoji} Transferencia ${t.data.status.toLowerCase()}`, `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' }); }); prevMovementsRef.current = invMovements; prevTransfersRef.current = invTransfers; }, [invMovements, invTransfers, invProducts, notifPrefs.inventory, sendNotif]);

  // Meeting reminder check
  useEffect(() => { if (!notifPrefs.meetings || !authUser) return; const check = () => { const now = new Date(); const todayStr = now.toISOString().split('T')[0]; const nowMinutes = now.getHours() * 60 + now.getMinutes(); meetings.forEach(m => { if (m.data.date === todayStr && m.data.time) { const [h, min] = m.data.time.split(':').map(Number); const meetingMinutes = h * 60 + min; const diff = meetingMinutes - nowMinutes; if (diff === 15 || diff === 5) { const proj = projects.find(p => p.id === m.data.projectId); sendBrowserNotif(`⏰ Reunión en ${diff} minutos`, `"${m.data.title}" a las ${m.data.time}${proj ? ` — ${proj.data.name}` : ''}`, undefined, `reminder-${m.id}-${diff}`, { type: 'meeting', screen: 'calendar' }); } } }); }; check(); const iv = setInterval(check, 60000); return () => clearInterval(iv); }, [meetings, notifPrefs.meetings, authUser, projects, sendBrowserNotif]);

  // Project status change notifications
  useEffect(() => { if (projects.length === 0) { prevProjectsRef.current = []; return; } const prev = prevProjectsRef.current; const changedProjects = projects.filter(p => { const pr = prev.find(pp => pp.id === p.id); return pr && (pr.data.status !== p.data.status); }); if (notifPrefs.projects) { changedProjects.forEach(p => { const statusEmoji = p.data.status === 'Ejecucion' ? '🏗️' : p.data.status === 'Terminado' ? '🎉' : p.data.status === 'Diseno' ? '🎨' : '📁'; sendNotif(`${statusEmoji} Proyecto actualizado`, `"${p.data.name}" cambió a: ${p.data.status}`, undefined, `proj-${p.id}`, { type: 'project', screen: 'projects', itemId: p.id }); }); } prevProjectsRef.current = projects; }, [projects, notifPrefs.projects, sendNotif]);

  // Overdue tasks reminder
  useEffect(() => { if (!notifPrefs.tasks || !authUser) return; const check = () => { const today = new Date().toISOString().split('T')[0]; const checkKey = `overdue-${today}`; if (overdueCheckedRef.current === checkKey) return; overdueCheckedRef.current = checkKey; const myOverdue = tasks.filter(t => t.data.assigneeId === authUser?.uid && t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today); if (myOverdue.length > 0) { sendNotif(`⚠️ ${myOverdue.length} tarea${myOverdue.length > 1 ? 's' : ''} vencida${myOverdue.length > 1 ? 's' : ''}`, myOverdue.slice(0, 3).map(t => `"${t.data.title}"`).join(', '), undefined, 'overdue-daily', { type: 'reminder', screen: 'tasks' }); } }; check(); const iv = setInterval(check, 30 * 60 * 1000); return () => clearInterval(iv); }, [tasks, notifPrefs.tasks, authUser, sendNotif]);

  // Low stock periodic check
  useEffect(() => { if (!notifPrefs.inventory) return; let lastLowStockCount = -1; const check = () => { const lowStock = invProducts.filter(p => { const stock = p.data.warehouseStock ? Object.values(p.data.warehouseStock).reduce((a: number, b: number) => a + b, 0) : p.data.stock; return stock > 0 && stock <= (p.data.minStock || 5); }); const outOfStock = invProducts.filter(p => { const stock = p.data.warehouseStock ? Object.values(p.data.warehouseStock).reduce((a: number, b: number) => a + b, 0) : p.data.stock; return stock <= 0; }); const total = lowStock.length + outOfStock.length; if (total > 0 && total !== lastLowStockCount) { lastLowStockCount = total; sendNotif(outOfStock.length > 0 ? '🚨 Alerta de inventario' : '⚠️ Stock bajo', outOfStock.length > 0 ? `${outOfStock.length} sin stock${lowStock.length > 0 ? `, ${lowStock.length} bajo mínimo` : ''}: ${outOfStock.map(p => p.data.name).slice(0, 3).join(', ')}` : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} bajo mínimo: ${lowStock.map(p => p.data.name).slice(0, 3).join(', ')}`, undefined, 'inv-lowstock-check', { type: 'inventory', screen: 'inventory' }); } }; const initTimer = setTimeout(check, 10000); const iv = setInterval(check, 10 * 60 * 1000); return () => { clearTimeout(initTimer); clearInterval(iv); }; }, [invProducts, notifPrefs.inventory, sendNotif]);

  // ===== FIREBASE ACTIONS =====
  const doLogin = async () => { const email = forms.loginEmail || '', pass = forms.loginPass || ''; if (!email || !pass) { showToast('Completa todos los campos', 'error'); return; } try { await (window as any).firebase.auth().signInWithEmailAndPassword(email, pass); } catch (e: any) { showToast(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos' : e.code === 'auth/user-not-found' ? 'No existe cuenta con ese correo' : 'Error al iniciar sesión', 'error'); } };
  const doRegister = async () => { const name = forms.regName || '', email = forms.regEmail || '', pass = forms.regPass || ''; if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; } try { const cred = await (window as any).firebase.auth().createUserWithEmailAndPassword(email, pass); await cred.user.updateProfile({ displayName: name }); const db = (window as any).firebase.firestore(); await db.collection('users').doc(cred.user.uid).set({ name, email, photoURL: '', role: 'Miembro', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); } catch (e: any) { showToast(e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado' : e.code === 'auth/weak-password' ? 'Mínimo 6 caracteres' : 'Error al registrar', 'error'); } };
  const doGoogleLogin = async () => { try { await (window as any).firebase.auth().signInWithPopup(new ((window as any).firebase.auth).GoogleAuthProvider()); } catch (e: any) { showToast('Error al iniciar con Google', 'error'); } };
  const doMicrosoftLogin = async (isRefresh = false) => { try { const provider = new ((window as any).firebase.auth).OAuthProvider('microsoft.com'); provider.addScope('Files.ReadWrite'); provider.addScope('offline_access'); provider.setCustomParameters({ prompt: isRefresh ? 'none' : 'select_account' }); const result = await (window as any).firebase.auth().signInWithPopup(provider); const credential = result.credential as any; if (credential?.accessToken) { setMsAccessToken(credential.accessToken); setMsConnected(true); setMsTokenTime(Date.now()); localStorage.setItem('msAccessToken', credential.accessToken); localStorage.setItem('msConnected', 'true'); localStorage.setItem('msTokenTime', String(Date.now())); if (!isRefresh) showToast('Conectado con Microsoft'); return true; } } catch (e: any) { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/popup-blocked') { showToast(isRefresh ? 'Sesión de Microsoft expirada — reconecta manualmente' : 'Error al conectar con Microsoft', 'error'); } } return false; };
  const disconnectMicrosoft = () => { setMsAccessToken(null); setMsConnected(false); setOneDriveFiles([]); setOdProjectFolder(null); setMsTokenTime(0); localStorage.removeItem('msAccessToken'); localStorage.removeItem('msConnected'); localStorage.removeItem('msTokenTime'); showToast('Microsoft desconectado'); };
  const doLogout = () => { if (!confirm('¿Cerrar sesión?')) return; (window as any).firebase.auth().signOut(); };

  // Restore MS session
  useEffect(() => { const saved = localStorage.getItem('msConnected'); const token = localStorage.getItem('msAccessToken'); const tokenTime = parseInt(localStorage.getItem('msTokenTime') || '0'); if (saved === 'true' && token) { setMsConnected(true); setMsAccessToken(token); setMsTokenTime(tokenTime || Date.now()); } }, []);

  const isMsTokenExpired = useCallback(() => { if (!msTokenTime) return true; return Date.now() - msTokenTime > 55 * 60 * 1000; }, [msTokenTime]);
  const refreshMsToken = useCallback(async (): Promise<boolean> => { if (msRefreshLockRef.current) return false; msRefreshLockRef.current = true; try { return await doMicrosoftLogin(true); } finally { msRefreshLockRef.current = false; } }, []);

  // OneDrive API
  const graphApiGet = async (endpoint: string): Promise<any | null> => { if (!msAccessToken) return null; try { const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, { headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' } }); if (res.status === 401) { const refreshed = await refreshMsToken(); if (refreshed && msAccessToken) { const retry = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, { headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' } }); if (retry.ok) return retry.json(); } disconnectMicrosoft(); return null; } if (!res.ok) return null; return res.json(); } catch { return null; } };
  const graphApiPost = async (endpoint: string, body: any): Promise<any | null> => { if (!msAccessToken) return null; try { const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (res.status === 401) { const refreshed = await refreshMsToken(); if (refreshed && msAccessToken) { const retry = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${msAccessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (retry.ok) return retry.json(); } disconnectMicrosoft(); return null; } if (!res.ok) return null; return res.json(); } catch { return null; } };
  const ensureProjectFolder = async (projectName: string) => { if (!msAccessToken) return null; setMsLoading(true); try { const root = await graphApiGet('/me/drive/root/children'); if (!root) { setMsLoading(false); return null; } const archiFolder = root.value?.find((f: any) => f.name === 'ArchiFlow' && f.folder); let archiFolderId: string; if (archiFolder) { archiFolderId = archiFolder.id; } else { const createdData = await graphApiPost('/me/drive/root/children', { name: 'ArchiFlow', folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }); if (!createdData) { setMsLoading(false); return null; } archiFolderId = createdData.id; } const projChildren = await graphApiGet(`/me/drive/items/${archiFolderId}/children`); if (!projChildren) { setMsLoading(false); return null; } const projFolder = projChildren.value?.find((f: any) => f.name === projectName && f.folder); let projFolderId: string; if (projFolder) { projFolderId = projFolder.id; } else { const pCreatedData = await graphApiPost(`/me/drive/items/${archiFolderId}/children`, { name: projectName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }); if (!pCreatedData) { setMsLoading(false); return null; } projFolderId = pCreatedData.id; } setOdProjectFolder(projFolderId); setMsLoading(false); return projFolderId; } catch { setMsLoading(false); return null; } };
  const loadOneDriveFiles = async (folderId: string) => { if (!msAccessToken) return; setMsLoading(true); try { const data = await graphApiGet(`/me/drive/items/${folderId}/children?$top=50&orderby=name`); if (data?.value) setOneDriveFiles(data.value); } catch { showToast('Error al cargar archivos', 'error'); } setMsLoading(false); };
  const uploadToOneDrive = async (file: File, folderId: string) => { if (!msAccessToken) return; setMsLoading(true); try { const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(file.name)}:/content`; const res = await fetch(graphUrl, { method: 'PUT', headers: { Authorization: `Bearer ${msAccessToken}` }, body: file }); if (res.status === 401) { const refreshed = await refreshMsToken(); if (refreshed && msAccessToken) { const retry = await fetch(graphUrl, { method: 'PUT', headers: { Authorization: `Bearer ${msAccessToken}` }, body: file }); if (retry.ok) { showToast('Archivo subido a OneDrive'); loadOneDriveFiles(folderId); setMsLoading(false); return; } } disconnectMicrosoft(); showToast('Sesión expirada — reconecta Microsoft', 'error'); } else if (res.ok) { showToast('Archivo subido a OneDrive'); loadOneDriveFiles(folderId); } else { showToast('Error al subir archivo', 'error'); } } catch { showToast('Error al subir', 'error'); } setMsLoading(false); };
  const deleteFromOneDrive = async (fileId: string, folderId: string) => { if (!confirm('¿Eliminar archivo de OneDrive?')) return; setMsLoading(true); try { const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`; const res = await fetch(graphUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${msAccessToken}` } }); if (res.status === 401) { const refreshed = await refreshMsToken(); if (refreshed && msAccessToken) { const retry = await fetch(graphUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${msAccessToken}` } }); if (retry.ok) { showToast('Eliminado de OneDrive'); loadOneDriveFiles(folderId); setMsLoading(false); return; } } disconnectMicrosoft(); showToast('Sesión expirada', 'error'); } else if (res.ok) { showToast('Eliminado de OneDrive'); loadOneDriveFiles(folderId); } else { showToast('Error al eliminar', 'error'); } } catch { showToast('Error', 'error'); } setMsLoading(false); };
  const openOneDriveForProject = async (projectName: string) => { const folderId = await ensureProjectFolder(projectName); if (folderId) { await loadOneDriveFiles(folderId); setShowOneDrive(true); } else { showToast('No se pudo crear la carpeta del proyecto', 'error'); } };

  // ===== USER & NAVIGATION =====
  const updateUserRole = async (uid: string, newRole: string) => { try { await (window as any).firebase.firestore().collection('users').doc(uid).update({ role: newRole }); showToast(`Rol actualizado a ${newRole}`); } catch { showToast('Error al cambiar rol', 'error'); } };
  const getUserName = (uid: string) => { if (!uid) return 'Sin asignar'; const u = teamUsers.find(x => x.id === uid); return u ? u.data.name : uid.substring(0, 8) + '...'; };
  const getUserRole = (uid: string) => { const u = teamUsers.find(x => x.id === uid); return u?.data?.role || 'Miembro'; };

  const navigateTo = (s: string, projId?: string | null) => { setScreen(s); setSelectedProjectId(projId ?? selectedProjectId); setSidebarOpen(false); if (s !== 'chat') setChatMobileShow(false); useUIStore.getState().setCurrentScreen(s); };
  navigateToRef.current = navigateTo;

  const openProject = (id: string) => { setSelectedProjectId(id); setScreen('projectDetail'); useUIStore.getState().setCurrentScreen('projectDetail'); };

  // ===== CRUD OPERATIONS =====
  const saveProject = async () => { const name = forms.projName || ''; if (!name) { showToast('El nombre es obligatorio', 'error'); return; } const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { name, status: forms.projStatus || 'Concepto', client: forms.projClient || '', location: forms.projLocation || '', budget: Number(forms.projBudget) || 0, description: forms.projDesc || '', startDate: forms.projStart || '', endDate: forms.projEnd || '', updatedAt: ts, updatedBy: authUser?.uid }; try { if (editingId) { await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado'); } else { await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 }); showToast('Proyecto creado'); } closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' })); } catch { showToast('Error al guardar', 'error'); } };
  const deleteProject = async (id: string) => { if (!confirm('¿Eliminar este proyecto?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(id).delete(); showToast('Eliminado'); } catch { showToast('Error', 'error'); } };
  const openEditProject = (p: Project) => { setEditingId(p.id); setForms(f => ({ ...f, projName: p.data.name, projStatus: p.data.status, projClient: p.data.client, projLocation: p.data.location, projBudget: p.data.budget, projDesc: p.data.description, projStart: p.data.startDate, projEnd: p.data.endDate })); openModal('project'); };

  const saveTask = async () => { const title = forms.taskTitle || ''; if (!title) { showToast('El título es obligatorio', 'error'); return; } const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: forms.taskAssignee || '', priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', updatedAt: ts, updatedBy: authUser?.uid }; try { if (editingId) { await db.collection('tasks').doc(editingId).update(data); showToast('Tarea actualizada'); } else { await db.collection('tasks').add({ ...data, createdAt: ts, createdBy: authUser?.uid }); showToast('Tarea creada'); } closeModal('task'); setEditingId(null); setForms(p => ({ ...p, taskTitle: '', taskProject: '', taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0] })); } catch { showToast('Error', 'error'); } };
  const openEditTask = (t: Task) => { setEditingId(t.id); setForms(f => ({ ...f, taskTitle: t.data.title, taskDescription: t.data.description || '', taskProject: t.data.projectId || '', taskAssignee: t.data.assigneeId || '', taskPriority: t.data.priority || 'Media', taskStatus: t.data.status || 'Por hacer', taskDue: t.data.dueDate || '' })); openModal('task'); };
  const toggleTask = async (id: string, status: string) => { const ns = status === 'Completado' ? 'Por hacer' : 'Completado'; try { await (window as any).firebase.firestore().collection('tasks').doc(id).update({ status: ns, updatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); } catch {} };
  const deleteTask = async (id: string) => { if (!confirm('¿Eliminar tarea?')) return; try { await (window as any).firebase.firestore().collection('tasks').doc(id).delete(); showToast('Eliminada'); } catch {} };

  const updateProjectProgress = async (val: number) => { if (!selectedProjectId) return; try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId).update({ progress: val, updatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); showToast(`Progreso: ${val}%`); } catch { showToast('Error', 'error'); } };
  const updateUserName = async (newName: string) => { if (!newName || !authUser) return; try { await authUser.updateProfile({ displayName: newName }); await (window as any).firebase.firestore().collection('users').doc(authUser.uid).update({ name: newName }); showToast('Nombre actualizado'); setForms(p => ({ ...p, editingName: false })); } catch { showToast('Error', 'error'); } };

  const saveExpense = async () => { const concept = forms.expConcept || ''; if (!concept) { showToast('El concepto es obligatorio', 'error'); return; } const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { concept, projectId: forms.expProject || selectedProjectId || '', category: forms.expCategory || 'Materiales', amount: Number(forms.expAmount) || 0, date: forms.expDate || new Date().toISOString().split('T')[0], createdAt: ts, createdBy: authUser?.uid }; try { if (editingId) { await db.collection('expenses').doc(editingId).update(data); showToast('Gasto actualizado'); } else { await db.collection('expenses').add(data); showToast('Gasto registrado'); } closeModal('expense'); setEditingId(null); setForms(p => ({ ...p, expConcept: '', expProject: '', expCategory: 'Materiales', expAmount: '', expDate: '' })); } catch { showToast('Error', 'error'); } };
  const deleteExpense = async (id: string) => { if (!confirm('¿Eliminar gasto?')) return; try { await (window as any).firebase.firestore().collection('expenses').doc(id).delete(); showToast('Eliminado'); } catch {} };

  const saveSupplier = async () => { const name = forms.supName || ''; if (!name) { showToast('El nombre es obligatorio', 'error'); return; } const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: ts }; try { if (editingId) { await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado'); } else { await db.collection('suppliers').add(data); showToast('Proveedor creado'); } closeModal('supplier'); setEditingId(null); setForms(p => ({ ...p, supName: '', supCategory: 'Otro', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' })); } catch { showToast('Error', 'error'); } };
  const deleteSupplier = async (id: string) => { if (!confirm('¿Eliminar proveedor?')) return; try { await (window as any).firebase.firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado'); } catch {} };

  const uploadFile = async (e: any) => { const file = e.target?.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { showToast('Máximo 10 MB', 'error'); return; } try { const base64 = await fileToBase64(file); const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); await db.collection('projects').doc(selectedProjectId!).collection('files').add({ name: file.name, type: file.type, size: file.size, url: base64, createdAt: ts, uploadedBy: authUser?.uid }); showToast('Archivo subido'); } catch { showToast('Error al subir', 'error'); } };
  const deleteFile = async (file: ProjectFile) => { if (!confirm('¿Eliminar archivo?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('files').doc(file.id).delete(); showToast('Eliminado'); } catch {} };

  // Phase management
  const initDefaultPhases = async () => { try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); for (const group of [{ g: 'Diseño', phases: ['Conceptualización', 'Anteproyecto', 'Proyecto', 'Interiorismo'] }, { g: 'Construcción', phases: ['Preliminares', 'Demoliciones', 'Excavaciones', 'Fundaciones', 'Estructura', 'Redes', 'Obra gris', 'Acabados', 'Carpintería', 'Mobiliario'] }]) { for (const name of group.phases) { const existing = await db.collection('projects').doc(selectedProjectId!).collection('workPhases').where('name', '==', name).get(); if (existing.empty) { await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name, description: '', status: 'Pendiente', order: 0, startDate: '', endDate: '', group: group.g, active: false, entries: [], createdAt: ts }); } } } showToast('Fases inicializadas'); } catch { showToast('Error', 'error'); } };
  const togglePhaseActive = async (phaseId: string, active: boolean) => { try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ active }); } catch {} };
  const deletePhase = async (phaseId: string) => { if (!confirm('¿Eliminar fase?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).delete(); showToast('Fase eliminada'); } catch {} };
  const addCustomPhase = async () => { const name = forms.customPhaseName || ''; if (!name) { showToast('Nombre obligatorio', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const count = await db.collection('projects').doc(selectedProjectId!).collection('workPhases').get(); await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name, description: forms.customPhaseDesc || '', status: 'Pendiente', order: count.size, startDate: '', endDate: '', group: 'Construcción', active: false, entries: [], createdAt: ts }); showToast('Fase creada'); closeModal('customPhase'); setForms(p => ({ ...p, customPhaseName: '', customPhaseDesc: '' })); } catch { showToast('Error', 'error'); } };
  const toggleGroupActive = async (groupName: string, enable: boolean) => { const phasesInGroup = workPhases.filter(p => p.data.group === groupName); for (const phase of phasesInGroup) { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phase.id).update({ active: enable }); } };
  const addPhaseEntry = async (phaseId: string) => { const text = forms[`phaseEntry_${phaseId}`] || ''; if (!text.trim()) { showToast('Escribe una entrada', 'error'); return; } try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ entries: (window as any).firebase.firestore.FieldValue.arrayUnion({ id: Date.now().toString(), text, confirmed: false, createdAt: new Date().toISOString(), createdBy: authUser?.uid }) }); setForms(p => ({ ...p, [`phaseEntry_${phaseId}`]: '' })); } catch {} };
  const toggleEntryConfirmed = async (phaseId: string, entryId: string) => { const phase = workPhases.find(p => p.id === phaseId); if (!phase) return; const entries = phase.data.entries.map((e: any) => e.id === entryId ? { ...e, confirmed: !e.confirmed } : e); try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ entries }); } catch {} };
  const deletePhaseEntry = async (phaseId: string, entryId: string) => { const phase = workPhases.find(p => p.id === phaseId); if (!phase) return; const entries = phase.data.entries.filter((e: any) => e.id !== entryId); try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ entries }); } catch {} };
  const updatePhaseStatus = async (phaseId: string, status: string) => { try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ status }); } catch {} };

  // Approvals
  const saveApproval = async () => { const title = forms.appTitle || ''; if (!title) { showToast('El título es obligatorio', 'error'); return; } try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').add({ title, description: forms.appDesc || '', status: 'Pendiente', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid }); showToast('Solicitud creada'); closeModal('approval'); setForms(p => ({ ...p, appTitle: '', appDesc: '' })); } catch { showToast('Error', 'error'); } };
  const updateApproval = async (id: string, status: string) => { try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).update({ status }); showToast('Estado actualizado'); } catch {} };
  const deleteApproval = async (id: string) => { if (!confirm('¿Eliminar aprobación?')) return; try { await (window as any).firebase.firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).delete(); showToast('Eliminada'); } catch {} };

  // Meetings
  const saveMeeting = async () => { const title = forms.meetTitle || ''; if (!title) { showToast('El título es obligatorio', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { title, description: forms.meetDesc || '', projectId: forms.meetProject || '', date: forms.meetDate || '', time: forms.meetTime || '09:00', duration: Number(forms.meetDuration) || 60, attendees: forms.meetAttendees ? forms.meetAttendees.split(',').map((s: string) => s.trim()).filter(Boolean) : [], createdAt: ts, createdBy: authUser?.uid }; if (editingId) { await db.collection('meetings').doc(editingId).update(data); showToast('Reunión actualizada'); } else { await db.collection('meetings').add(data); showToast('Reunión creada'); } closeModal('meeting'); setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' })); } catch { showToast('Error', 'error'); } };
  const deleteMeeting = async (id: string) => { if (!confirm('¿Eliminar reunión?')) return; try { await (window as any).firebase.firestore().collection('meetings').doc(id).delete(); showToast('Reunión eliminada'); } catch {} };
  const openEditMeeting = (m: any) => { setEditingId(m.id); setForms(f => ({ ...f, meetTitle: m.data.title, meetProject: m.data.projectId || '', meetDate: m.data.date || '', meetTime: m.data.time || '09:00', meetDuration: String(m.data.duration || 60), meetDesc: m.data.description || '', meetAttendees: (m.data.attendees || []).join(', ') })); openModal('meeting'); };

  // Gallery
  const saveGalleryPhoto = async () => { const imageData = forms.galleryImageData || ''; if (!imageData) { showToast('Selecciona una foto', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { projectId: forms.galleryProject || '', categoryName: forms.galleryCategory || 'Otro', caption: forms.galleryCaption || '', imageData, createdAt: ts, createdBy: authUser?.uid }; if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); } else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); } closeModal('gallery'); setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' })); } catch { showToast('Error al guardar foto', 'error'); } };
  const deleteGalleryPhoto = async (id: string) => { if (!confirm('¿Eliminar foto de la galería?')) return; try { await (window as any).firebase.firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch {} };
  const handleGalleryImageSelect = async (e: any) => { const file = e.target?.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; } if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', 'error'); return; } try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, galleryImageData: base64 })); } catch { showToast('Error al procesar imagen', 'error'); } };
  const openLightbox = (photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxPhoto(null); setLightboxIndex(0); };
  const lightboxPrev = () => { const filtered = getFilteredGalleryPhotos(); if (filtered.length === 0) return; setLightboxIndex(prev => { const next = (prev - 1 + filtered.length) % filtered.length; setLightboxPhoto(filtered[next]); return next; }); };
  const lightboxNext = () => { const filtered = getFilteredGalleryPhotos(); if (filtered.length === 0) return; setLightboxIndex(prev => { const next = (prev + 1) % filtered.length; setLightboxPhoto(filtered[next]); return next; }); };
  const getFilteredGalleryPhotos = () => { let photos = galleryPhotos; if (galleryFilterProject !== 'all') photos = photos.filter(p => p.data.projectId === galleryFilterProject); if (galleryFilterCat !== 'all') photos = photos.filter(p => p.data.categoryName === galleryFilterCat); return photos; };

  // ===== CHAT ACTIONS =====
  const sendMessage = async (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => { const text = textOverride || forms.chatInput || ''; if (!text && !audioData && !fileData) return; const targetId = chatTab === 'direct' && directChatId ? directChatId : chatProjectId; if (!targetId) return; try { const db = (window as any).firebase.firestore(); const msgData: any = { text, uid: authUser?.uid, userName: authUser?.displayName || authUser?.email.split('@')[0], userPhoto: authUser?.photoURL || '', createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), readBy: { [authUser?.uid]: true } }; if (replyingTo) { msgData.replyTo = { id: replyingTo.id, text: replyingTo.text?.substring(0, 100) || '', userName: replyingTo.userName || '', uid: replyingTo.uid }; setReplyingTo(null); } if (audioData) { msgData.audioData = audioData; msgData.audioDuration = audioDur || 0; msgData.type = 'AUDIO'; } if (fileData) { msgData.fileData = fileData.data; msgData.fileName = fileData.name; msgData.fileType = fileData.type; msgData.fileSize = fileData.size; msgData.type = fileData.type.startsWith('image/') ? 'IMAGE' : 'FILE'; } if (!msgData.type) msgData.type = 'TEXT'; if (chatTab === 'direct' && directChatId) { await db.collection('dmChats').doc(directChatId).collection('messages').add(msgData); await db.collection('dmChats').doc(directChatId).update({ lastMessage: { text: text.substring(0, 60), userName: msgData.userName, createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(), type: msgData.type }, updatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); } else if (targetId === '__general__') { await db.collection('generalMessages').add(msgData); } else { await db.collection('projects').doc(targetId).collection('messages').add(msgData); } setForms(p => ({ ...p, chatInput: '' })); } catch { showToast('Error al enviar', 'error'); } };

  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } }); audioStreamRef.current = stream; audioChunksRef.current = []; const audioCtx = new AudioContext(); const source = audioCtx.createMediaStreamSource(stream); const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); analyserRef.current = analyser; const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'; const recorder = new MediaRecorder(stream, { mimeType }); recorder.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; recorder.start(100); mediaRecRef.current = recorder; setIsRecording(true); let sec = 0; recTimerRef.current = setInterval(() => setRecDuration(++sec), 1000); const monitorVol = () => { if (!analyserRef.current) return; const data = new Uint8Array(analyserRef.current.frequencyBinCount); analyserRef.current.getByteTimeDomainData(data); let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; } setRecVolume(Math.min(Math.sqrt(sum / data.length) * 4, 1)); recAnimRef.current = requestAnimationFrame(monitorVol); }; monitorVol(); } catch { showToast('No se pudo acceder al microfono', 'error'); } };
  const stopRecording = (): Promise<Blob | null> => { return new Promise((resolve) => { const recorder = mediaRecRef.current; if (!recorder) { resolve(null); return; } recorder.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); audioStreamRef.current?.getTracks().forEach((t: any) => t.stop()); if (recTimerRef.current) clearInterval(recTimerRef.current); if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current); setIsRecording(false); setRecDuration(0); setRecVolume(0); resolve(blob); }; recorder.stop(); }); };
  const cancelRecording = () => { mediaRecRef.current?.stop(); audioStreamRef.current?.getTracks().forEach((t: any) => t.stop()); if (recTimerRef.current) clearInterval(recTimerRef.current); if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current); setIsRecording(false); setRecDuration(0); setRecVolume(0); };
  const handleMicButton = async () => { if (isRecording) { const blob = await stopRecording(); if (!blob) return; const url = URL.createObjectURL(blob); setAudioPreviewUrl(url); setAudioPreviewDuration(recDuration); audioPreviewBlobRef.current = blob; } else if (audioPreviewUrl) { setAudioPreviewUrl(null); setAudioPreviewDuration(0); audioPreviewBlobRef.current = null; } else { await startRecording(); } };
  const sendVoiceNote = async () => { if (!audioPreviewBlobRef.current) return; showToast('Enviando nota de voz...'); const reader = new FileReader(); reader.onload = async () => { const base64 = reader.result as string; await sendMessage('', base64, audioPreviewDuration); setAudioPreviewUrl(null); setAudioPreviewDuration(0); audioPreviewBlobRef.current = null; }; reader.readAsDataURL(audioPreviewBlobRef.current); };
  const handleFileSelect = (files: FileList | null) => { if (!files) return; Array.from(files).forEach(file => { if (file.size > 25 * 1024 * 1024) { showToast(`${file.name} excede 25MB`, 'error'); return; } const reader = new FileReader(); reader.onload = () => { const newFile = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: file.name, type: file.type, size: file.size, data: reader.result as string, preview: file.type.startsWith('image/') ? reader.result as string : null }; setPendingFiles(prev => [...prev, newFile]); }; reader.readAsDataURL(file); }); };
  const removePendingFile = (id: string) => { setPendingFiles(prev => prev.filter(f => f.id !== id)); };
  const sendPendingFiles = async () => { for (const f of pendingFiles) { await sendMessage('', undefined, undefined, { name: f.name, type: f.type, size: f.size, data: f.data }); } setPendingFiles([]); };
  const sendAll = async () => { if (pendingFiles.length > 0) { await sendPendingFiles(); } if (forms.chatInput?.trim()) { await sendMessage(); } };

  const toggleReaction = async (msgId: string, emoji: string) => { setReactionPickerMsg(null); const db = (window as any).firebase.firestore(); const coll = chatTab === 'direct' && directChatId ? db.collection('dmChats').doc(directChatId).collection('messages') : chatProjectId === '__general__' ? db.collection('generalMessages') : db.collection('projects').doc(chatProjectId || '').collection('messages'); try { const snap = await coll.doc(msgId).get(); if (!snap.exists) return; const data = snap.data(); const reactions: Record<string, string[]> = data.reactions || {}; if (reactions[emoji]?.includes(authUser?.uid)) { reactions[emoji] = reactions[emoji].filter((u: string) => u !== authUser?.uid); if (reactions[emoji].length === 0) delete reactions[emoji]; } else { if (!reactions[emoji]) reactions[emoji] = []; reactions[emoji].push(authUser?.uid); } await coll.doc(msgId).update({ reactions }); } catch {} };
  const deleteMessage = async (msgId: string) => { if (!confirm('¿Eliminar este mensaje?')) return; const db = (window as any).firebase.firestore(); const coll = chatTab === 'direct' && directChatId ? db.collection('dmChats').doc(directChatId).collection('messages') : chatProjectId === '__general__' ? db.collection('generalMessages') : db.collection('projects').doc(chatProjectId || '').collection('messages'); try { await coll.doc(msgId).delete(); showToast('Mensaje eliminado'); } catch { showToast('Error al eliminar', 'error'); } };
  const startDM = async (otherUserId: string) => { const myUid = authUser?.uid; if (!myUid || otherUserId === myUid) return; const ids = [myUid, otherUserId].sort(); const chatId = ids.join('_'); const db = (window as any).firebase.firestore(); const ref = db.collection('dmChats').doc(chatId); const snap = await ref.get(); if (!snap.exists) { const otherUser = teamUsers.find(u => u.id === otherUserId); await ref.set({ participants: ids, participantNames: { [myUid]: authUser?.displayName || authUser?.email?.split('@')[0], [otherUserId]: otherUser?.data?.name || 'Usuario' }, participantPhotos: { [myUid]: authUser?.photoURL || '', [otherUserId]: otherUser?.data?.photoURL || '' }, lastMessage: null, createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp() }); } setDirectChatId(chatId); setChatTab('direct'); setChatMobileShow(true); setShowNewDMModal(false); };
  const sendAIChat = async () => { const text = forms.chatInput?.trim(); if (!text || aiLoading) return; const userMsg = { role: 'user', content: text }; const newHistory = [...aiChatHistory, userMsg]; setAiChatHistory(newHistory); setAiLoading(true); setForms(p => ({ ...p, chatInput: '' })); try { const res = await fetch('/api/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newHistory.slice(-20) }), }); const data = await res.json(); if (data.message) { setAiChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]); } else { setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Lo siento, no pude generar una respuesta.' }]); } } catch { setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }]); } setAiLoading(false); };
  const markConvAsRead = async (convId: string) => { setLastReadPerChat(prev => ({ ...prev, [convId]: messages[messages.length - 1]?.id || '' })); setUnreadCounts(prev => ({ ...prev, [convId]: 0 })); };
  const toggleAudioPlay = (msgId: string) => { const audioEl = document.getElementById('audio-' + msgId) as HTMLAudioElement; if (!audioEl) return; if (playingAudio === msgId) { audioEl.pause(); setPlayingAudio(null); setAudioProgress(0); } else { if (playingAudio) { const prev = document.getElementById('audio-' + playingAudio) as HTMLAudioElement; if (prev) prev.pause(); } audioEl.play(); setPlayingAudio(msgId); const onTime = () => { if (audioEl.duration) { setAudioProgress((audioEl.currentTime / audioEl.duration) * 100); setAudioCurrentTime(audioEl.currentTime); } }; const onEnd = () => { setPlayingAudio(null); setAudioProgress(0); }; audioEl.addEventListener('timeupdate', onTime); audioEl.addEventListener('ended', onEnd); audioEl.addEventListener('pause', onEnd); } };

  // ===== INVENTORY =====
  const getWarehouseStock = (product: any, warehouse: string) => { if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') { return Number(product.data.warehouseStock[warehouse]) || 0; } return product.data.warehouse === warehouse ? (Number(product.data.stock) || 0) : 0; };
  const getTotalStock = (product: any) => { if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') { return Object.values(product.data.warehouseStock).reduce((s: number, v: any) => s + (Number(v) || 0), 0); } return Number(product.data.stock) || 0; };
  const buildWarehouseStock = (product: any) => { if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') { const ws = { ...product.data.warehouseStock }; INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; }); return ws; } const ws: Record<string, number> = {}; INV_WAREHOUSES.forEach(w => { ws[w] = w === (product.data.warehouse || 'Almacén Principal') ? (Number(product.data.stock) || 0) : 0; }); return ws; };
  const saveInvProduct = async () => { const name = forms.invProdName || ''; if (!name) { showToast('El nombre es obligatorio', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const warehouseStock: Record<string, number> = {}; INV_WAREHOUSES.forEach(w => { warehouseStock[w] = Number(forms[`invProdWS_${w.replace(/\s/g, '_')}`]) || 0; }); const totalStock = Object.values(warehouseStock).reduce((s: number, v: any) => s + (Number(v) || 0), 0); const data = { name, sku: forms.invProdSku || '', categoryId: forms.invProdCat || '', unit: forms.invProdUnit || 'Unidad', price: Number(forms.invProdPrice) || 0, stock: totalStock, minStock: Number(forms.invProdMinStock) || 0, description: forms.invProdDesc || '', imageData: forms.invProdImage || '', warehouse: forms.invProdWarehouse || 'Almacén Principal', warehouseStock, updatedAt: ts, updatedBy: authUser?.uid }; if (editingId) { await db.collection('invProducts').doc(editingId).update(data); showToast('Producto actualizado'); } else { await db.collection('invProducts').add({ ...data, createdAt: ts, createdBy: authUser?.uid }); showToast('Producto creado'); } closeModal('invProduct'); setEditingId(null); const resetForms: Record<string, any> = { invProdName: '', invProdSku: '', invProdCat: '', invProdUnit: 'Unidad', invProdPrice: '', invProdMinStock: '5', invProdDesc: '', invProdImage: '', invProdWarehouse: 'Almacén Principal' }; INV_WAREHOUSES.forEach(w => { resetForms[`invProdWS_${w.replace(/\s/g, '_')}`] = '0'; }); setForms(p => ({ ...p, ...resetForms })); } catch { showToast('Error al guardar', 'error'); } };
  const deleteInvProduct = async (id: string) => { if (!confirm('¿Eliminar este producto del inventario?')) return; try { await (window as any).firebase.firestore().collection('invProducts').doc(id).delete(); showToast('Producto eliminado'); } catch {} };
  const openEditInvProduct = (p: any) => { setEditingId(p.id); const ws = buildWarehouseStock(p); const f: Record<string, any> = { invProdName: p.data.name, invProdSku: p.data.sku || '', invProdCat: p.data.categoryId || '', invProdUnit: p.data.unit || 'Unidad', invProdPrice: String(p.data.price || ''), invProdMinStock: String(p.data.minStock || '5'), invProdDesc: p.data.description || '', invProdImage: p.data.imageData || '', invProdWarehouse: p.data.warehouse || 'Almacén Principal' }; INV_WAREHOUSES.forEach(w => { f[`invProdWS_${w.replace(/\s/g, '_')}`] = String(ws[w] || 0); }); setForms(prev => ({ ...prev, ...f })); openModal('invProduct'); };
  const saveInvCategory = async () => { const name = forms.invCatName || ''; if (!name) { showToast('El nombre es obligatorio', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const data = { name, color: forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length], description: forms.invCatDesc || '', createdAt: ts }; if (editingId) { await db.collection('invCategories').doc(editingId).update(data); showToast('Categoría actualizada'); } else { await db.collection('invCategories').add(data); showToast('Categoría creada'); } closeModal('invCategory'); setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' })); } catch { showToast('Error al guardar', 'error'); } };
  const deleteInvCategory = async (id: string) => { if (!confirm('¿Eliminar categoría?')) return; try { await (window as any).firebase.firestore().collection('invCategories').doc(id).delete(); showToast('Categoría eliminada'); } catch {} };
  const openEditInvCategory = (c: any) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };
  const saveInvMovement = async () => { const productId = forms.invMovProduct || ''; const qty = Number(forms.invMovQty) || 0; const warehouse = forms.invMovWarehouse || 'Almacén Principal'; if (!productId || qty <= 0) { showToast('Selecciona producto, almacén y cantidad', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const type = forms.invMovType || 'Entrada'; const data = { productId, type, quantity: qty, warehouse, reason: forms.invMovReason || '', reference: forms.invMovRef || '', date: forms.invMovDate || new Date().toISOString().split('T')[0], createdAt: ts, createdBy: authUser?.uid }; await db.collection('invMovements').add(data); const product = invProducts.find(p => p.id === productId); if (product) { const ws = buildWarehouseStock(product); ws[warehouse] = type === 'Entrada' ? (ws[warehouse] || 0) + qty : Math.max(0, (ws[warehouse] || 0) - qty); const newTotal = Object.values(ws).reduce((s: number, v: any) => s + (Number(v) || 0), 0); await db.collection('invProducts').doc(productId).update({ stock: newTotal, warehouseStock: ws, updatedAt: ts }); } showToast(`${type === 'Entrada' ? 'Entrada' : 'Salida'} registrada en ${warehouse}: ${qty} uds`); closeModal('invMovement'); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Entrada', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' })); } catch { showToast('Error al registrar movimiento', 'error'); } };
  const deleteInvMovement = async (id: string) => { if (!confirm('¿Eliminar movimiento?')) return; try { await (window as any).firebase.firestore().collection('invMovements').doc(id).delete(); showToast('Movimiento eliminado'); } catch {} };
  const saveInvTransfer = async () => { const productId = forms.invTrProduct || ''; const qty = Number(forms.invTrQty) || 0; const from = forms.invTrFrom || ''; const to = forms.invTrTo || ''; if (!productId || !from || !to || from === to || qty <= 0) { showToast('Completa todos los campos y asegúrate que los almacenes sean diferentes', 'error'); return; } try { const db = (window as any).firebase.firestore(); const ts = (window as any).firebase.firestore.FieldValue.serverTimestamp(); const product = invProducts.find(p => p.id === productId); const ws = product ? buildWarehouseStock(product) : {}; const fromStock = ws[from] || 0; if (qty > fromStock) { showToast(`Stock insuficiente en ${from}. Disponible: ${fromStock}`, 'error'); return; } ws[from] = Math.max(0, fromStock - qty); ws[to] = (ws[to] || 0) + qty; const newTotal = Object.values(ws).reduce((s: number, v: any) => s + (Number(v) || 0), 0); await db.collection('invProducts').doc(productId).update({ stock: newTotal, warehouseStock: ws, updatedAt: ts }); await db.collection('invTransfers').add({ productId, productName: product?.data.name || '', fromWarehouse: from, toWarehouse: to, quantity: qty, status: 'Completada', date: forms.invTrDate || new Date().toISOString().split('T')[0], notes: forms.invTrNotes || '', createdAt: ts, createdBy: authUser?.uid, completedAt: ts }); showToast(`Transferencia completada: ${qty} uds de ${from} → ${to}`); closeModal('invTransfer'); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' })); } catch { showToast('Error en transferencia', 'error'); } };
  const deleteInvTransfer = async (id: string) => { if (!confirm('¿Eliminar registro de transferencia?')) return; try { await (window as any).firebase.firestore().collection('invTransfers').doc(id).delete(); showToast('Transferencia eliminada'); } catch {} };
  const getInvCategoryName = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.name : 'Sin categoría'; };
  const getInvCategoryColor = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.color : '#6b7280'; };
  const getInvProductName = (prodId: string) => { const p = invProducts.find(x => x.id === prodId); return p ? p.data.name : 'Desconocido'; };
  const handleInvProductImageSelect = async (e: any) => { const file = e.target?.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; } if (file.size > 3 * 1024 * 1024) { showToast('Máx 3 MB', 'error'); return; } try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, invProdImage: base64 })); } catch { showToast('Error al procesar', 'error'); } };

  // ===== GANTT HELPERS =====
  const getMonday = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff); };
  const getGanttDays = () => { const base = getMonday(new Date()); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() + adminWeekOffset * 7); const days = []; for (let i = 0; i < 14; i++) { const day = new Date(base); day.setDate(day.getDate() + i); days.push(day); } return days; };
  const getTaskBar = (task: any, days: Date[]) => { if (!task.data.dueDate) return null; const tStart = task.data.dueDate ? new Date(task.data.startDate || task.data.dueDate) : new Date(); const tEnd = new Date(task.data.dueDate); const rangeStart = days[0]; const rangeEnd = new Date(days[days.length - 1]); rangeEnd.setDate(rangeEnd.getDate() + 1); const DAY_MS = 86400000; const rangeSpan = (rangeEnd - rangeStart) / DAY_MS; const leftPct = Math.max(0, (tStart - rangeStart) / DAY_MS / rangeSpan) * 100; const widthPct = Math.max(2, ((tEnd - tStart) / DAY_MS + 1) / rangeSpan) * 100; return { left: leftPct, width: Math.min(widthPct, 100 - leftPct) }; };
  const buildGanttRows = (memberTasks: any[]) => { const rows: any[][] = []; memberTasks.forEach((t: any) => { if (!t.data.dueDate) return; let placed = false; for (const row of rows) { const overlaps = row.some((r: any) => { if (!r.data.dueDate || !t.data.dueDate) return false; return new Date(r.data.startDate || r.data.dueDate) <= new Date(t.data.dueDate) && new Date(t.data.startDate || t.data.dueDate) <= new Date(r.data.dueDate); }); if (!overlaps) { row.push(t); placed = true; break; } } if (!placed) rows.push([t]); }); return rows; };
  const findOverlaps = (memberTasks: any[]) => { const overlapIds = new Set<string>(); for (let i = 0; i < memberTasks.length; i++) { for (let j = i + 1; j < memberTasks.length; j++) { const a = memberTasks[i], b = memberTasks[j]; if (!a.data.dueDate || !b.data.dueDate) continue; if (new Date(a.data.startDate || a.data.dueDate) <= new Date(b.data.dueDate) && new Date(b.data.startDate || b.data.dueDate) <= new Date(a.data.dueDate)) { overlapIds.add(a.id); overlapIds.add(b.id); } } } return overlapIds; };
  const getProjectColor = (projId: string) => { const colors = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#f97316']; const idx = projects.findIndex(p => p.id === projId); return colors[Math.abs(idx) % colors.length]; };
  const getProjectColorLight = (projId: string) => { const map: Record<string, string> = { '#3b82f6': '#dbeafe', '#8b5cf6': '#ede9fe', '#f43f5e': '#ffe4e6', '#10b981': '#d1fae5', '#f59e0b': '#fef3c7', '#06b6d4': '#cffafe', '#ec4899': '#fce7f3', '#84cc16': '#ecfccb', '#6366f1': '#e0e7ff', '#f97316': '#ffedd5' }; return map[getProjectColor(projId)] || '#f5f5f4'; };

  // ===== DERIVED VALUES =====
  const myRole = getUserRole(authUser?.uid || '');
  const isEmailAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;
  const isAdmin = myRole === 'Admin' || myRole === 'Director' || isEmailAdmin;
  const activeTasks = tasks.filter(t => t.data.status !== 'Completado');
  const completedTasks = tasks.filter(t => t.data.status === 'Completado');
  const overdueTasks = activeTasks.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString()));
  const urgentTasks = activeTasks.filter(t => t.data.priority === 'Alta');
  const adminFilteredTasks = activeTasks.filter(t => { const ms = !adminTaskSearch || t.data.title.toLowerCase().includes(adminTaskSearch.toLowerCase()); const ma = adminFilterAssignee === 'all' || t.data.assigneeId === adminFilterAssignee; const mp = adminFilterProject === 'all' || t.data.projectId === adminFilterProject; const mpr = adminFilterPriority === 'all' || t.data.priority === adminFilterPriority; return ms && ma && mp && mpr; });
  const pendingCount = tasks.filter(t => t.data.status !== 'Completado').length;
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectExpenses = expenses.filter(e => e.data.projectId === selectedProjectId);
  const projectTasks = tasks.filter(t => t.data.projectId === selectedProjectId);
  const projectBudget = currentProject?.data.budget || 0;
  const projectSpent = projectExpenses.reduce((s, e) => s + (Number(e.data.amount) || 0), 0);
  const invTotalValue = invProducts.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
  const invLowStock = invProducts.filter(p => getTotalStock(p) <= (Number(p.data.minStock) || 0));
  const invTotalStock = invProducts.reduce((s, p) => s + getTotalStock(p), 0);
  const invPendingTransfers = invTransfers.filter(t => t.data.status === 'Pendiente' || t.data.status === 'En tránsito').length;
  const invAlerts = [...(invLowStock.map(p => ({ type: 'low_stock' as const, msg: `${p.data.name}: stock ${getTotalStock(p)} (mín: ${p.data.minStock})`, severity: 'high' as const }))), ...(invTransfers.filter(t => t.data.status === 'Pendiente').map(t => ({ type: 'pending_transfer' as const, msg: `Transferencia pendiente: ${t.data.quantity} uds de ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, severity: 'medium' as const }))), ...(invProducts.filter(p => getTotalStock(p) === 0).map(p => ({ type: 'out_of_stock' as const, msg: `${p.data.name}: AGOTADO`, severity: 'critical' as const })))];
  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Usuario';
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?';

  // ===== CONTEXT VALUE =====
  const value: AppContextType = {
    // State
    ready, authUser, screen, selectedProjectId, projects, tasks, teamUsers, expenses, suppliers, messages, chatProjectId, workPhases, projectFiles, approvals, sidebarOpen, chatMobileShow, loading, toast, darkMode,
    msAccessToken, msConnected, msLoading, oneDriveFiles, odProjectFolder, showOneDrive,
    calMonth, calYear, calSelectedDate, calFilterProject, meetings,
    galleryPhotos, galleryFilterProject, galleryFilterCat, lightboxPhoto, lightboxIndex,
    invProducts, invCategories, invMovements, invTab, invFilterCat, invSearch, invMovFilterType, invTransfers, invTransferFilterStatus, invWarehouseFilter,
    workLogs, workLogForm, expandedLog,
    actas, expandedActa, selectedActa, actaFilterProject,
    adminTab, adminWeekOffset, adminTaskSearch, adminFilterAssignee, adminFilterProject, adminFilterPriority, adminTooltipTask, adminTooltipPos, adminPermSection,
    isRecording, recDuration, recVolume, audioPreviewUrl, audioPreviewDuration, pendingFiles, chatDropActive, playingAudio, audioProgress, audioCurrentTime,
    chatTab, replyingTo, chatSearchMsg, onlineUsers, aiChatHistory, aiLoading, reactionPickerMsg, unreadCounts, directChatId, dmChats, lastReadPerChat, showNewDMModal, setAiChatHistory,
    installPrompt, showInstallBanner, isInstalled, showInstallGuide, isStandalone, platform,
    notifPermission, notifHistory, notifPrefs, showNotifPanel, unreadCount, notifSound, inAppNotifs, notifFilterCat, showNotifBanner,
    modals, editingId, forms,
    myRole, isEmailAdmin, isAdmin, activeTasks, completedTasks, overdueTasks, urgentTasks, adminFilteredTasks, pendingCount, currentProject, projectExpenses, projectTasks, projectBudget, projectSpent, invTotalValue, invLowStock, invTotalStock, invPendingTransfers, invAlerts, userName, initials,
    // Setters — Core
    setScreen, setSelectedProjectId, setSidebarOpen, setChatMobileShow, setForms, setEditingId, setDarkMode, setLoading,
    // Setters — Chat
    setChatProjectId, setChatTab, setReplyingTo, setChatSearchMsg, setReactionPickerMsg, setDirectChatId, setShowNewDMModal, setChatDropActive, setAudioPreviewUrl, setAudioPreviewDuration,
    // Setters — Calendar
    setCalMonth, setCalYear, setCalSelectedDate, setCalFilterProject,
    // Setters — Gallery
    setGalleryFilterProject, setGalleryFilterCat, setLightboxPhoto, setLightboxIndex,
    // Setters — Inventory
    setInvTab, setInvFilterCat, setInvSearch, setInvMovFilterType, setInvTransferFilterStatus, setInvWarehouseFilter,
    // Setters — Admin
    setAdminTab, setAdminWeekOffset, setAdminTaskSearch, setAdminFilterAssignee, setAdminFilterProject, setAdminFilterPriority, setAdminTooltipTask, setAdminTooltipPos, setAdminPermSection,
    // Setters — Work Logs & Actas
    setWorkLogForm, setExpandedLog, setExpandedActa, setSelectedActa, setActaFilterProject,
    // Setters — PWA
    setIsInstalled, setShowInstallBanner, setShowInstallGuide,
    // Setters — Notifications
    setShowNotifPanel, setNotifFilterCat, setNotifPrefs, setNotifSound,
    // Setters — Microsoft
    setShowOneDrive,
    // Actions
    showToast, navigateTo, openModal, closeModal, openProject, toggleTheme, handleInstall, dismissInstallBanner,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doLogout,
    saveProject, deleteProject, openEditProject, saveTask, openEditTask, toggleTask, deleteTask, saveExpense, deleteExpense, saveSupplier, deleteSupplier, updateProjectProgress, updateUserName, updateUserRole,
    uploadFile, deleteFile, initDefaultPhases, togglePhaseActive, deletePhase, addCustomPhase, toggleGroupActive, addPhaseEntry, toggleEntryConfirmed, deletePhaseEntry, updatePhaseStatus,
    saveApproval, updateApproval, deleteApproval,
    sendMessage, startRecording, stopRecording, cancelRecording, handleMicButton, sendVoiceNote, handleFileSelect, removePendingFile, sendPendingFiles, sendAll, toggleReaction, deleteMessage, startDM, sendAIChat, markConvAsRead, toggleAudioPlay,
    saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect, openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos,
    saveMeeting, deleteMeeting, openEditMeeting,
    getWarehouseStock, getTotalStock, buildWarehouseStock, saveInvProduct, deleteInvProduct, openEditInvProduct, saveInvCategory, deleteInvCategory, openEditInvCategory, saveInvMovement, deleteInvMovement, saveInvTransfer, deleteInvTransfer, getInvCategoryName, getInvCategoryColor, getInvProductName, handleInvProductImageSelect,
    sendNotif, sendBrowserNotif, requestNotifPermission, dismissNotifBanner, toggleNotifPref, markNotifRead, markAllNotifRead, clearNotifHistory,
    disconnectMicrosoft, graphApiGet, graphApiPost, ensureProjectFolder, loadOneDriveFiles, uploadToOneDrive, deleteFromOneDrive, openOneDriveForProject,
    getUserName, getUserRole, getProjectColor, getProjectColorLight, getMonday, getGanttDays, getTaskBar, buildGanttRows, findOverlaps,
    fileInputRef, mediaRecRef, audioChunksRef, audioStreamRef, analyserRef, recTimerRef, recAnimRef, audioPreviewBlobRef, playingAudioRef, navigateToRef,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
