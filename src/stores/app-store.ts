/* ===== ARCHIFLOW APP STORE (Zustand) ===== */
// Shared state for all screens - replaces 100+ useState in page.tsx

import { create } from 'zustand';
import type { Project, Task, TeamUser, Expense, Supplier, Approval, WorkPhase, ProjectFile, GalleryPhoto, InvProduct, InvCategory, InvMovement, InvTransfer, WorkLogEntry, Acta } from '@/lib/types';

interface AppDataState {
  // ===== AUTH =====
  authUser: any;
  setAuthUser: (user: any) => void;
  ready: boolean;
  setReady: (r: boolean) => void;

  // ===== NAVIGATION =====
  screen: string;
  setScreen: (s: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  chatMobileShow: boolean;
  setChatMobileShow: (v: boolean) => void;

  // ===== CORE DATA =====
  projects: Project[];
  setProjects: (p: Project[]) => void;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  teamUsers: TeamUser[];
  setTeamUsers: (u: TeamUser[]) => void;
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;

  // ===== PROJECT DETAIL =====
  workPhases: WorkPhase[];
  setWorkPhases: (p: WorkPhase[]) => void;
  projectFiles: ProjectFile[];
  setProjectFiles: (f: ProjectFile[]) => void;
  approvals: Approval[];
  setApprovals: (a: Approval[]) => void;
  workLogs: WorkLogEntry[];
  setWorkLogs: (w: WorkLogEntry[]) => void;

  // ===== GALLERY =====
  galleryPhotos: GalleryPhoto[];
  setGalleryPhotos: (p: GalleryPhoto[]) => void;

  // ===== INVENTORY =====
  invProducts: InvProduct[];
  setInvProducts: (p: InvProduct[]) => void;
  invCategories: InvCategory[];
  setInvCategories: (c: InvCategory[]) => void;
  invMovements: InvMovement[];
  setInvMovements: (m: InvMovement[]) => void;
  invTransfers: InvTransfer[];
  setInvTransfers: (t: InvTransfer[]) => void;
  invTab: 'dashboard' | 'products' | 'categories' | 'warehouse' | 'movements' | 'transfers' | 'reports';
  setInvTab: (t: any) => void;
  invFilterCat: string;
  setInvFilterCat: (v: string) => void;
  invSearch: string;
  setInvSearch: (v: string) => void;
  invMovFilterType: string;
  setInvMovFilterType: (v: string) => void;
  invTransferFilterStatus: string;
  setInvTransferFilterStatus: (v: string) => void;
  invWarehouseFilter: string;
  setInvWarehouseFilter: (v: string) => void;

  // ===== ACTAS =====
  actas: Acta[];
  setActas: (a: Acta[]) => void;

  // ===== CALENDAR =====
  meetings: any[];
  setMeetings: (m: any[]) => void;
  calMonth: number;
  setCalMonth: (m: number) => void;
  calYear: number;
  setCalYear: (y: number) => void;
  calSelectedDate: string | null;
  setCalSelectedDate: (d: string | null) => void;
  calFilterProject: string;
  setCalFilterProject: (p: string) => void;

  // ===== CHAT =====
  messages: any[];
  setMessages: (m: any[]) => void;
  chatProjectId: string | null;
  setChatProjectId: (id: string | null) => void;
  chatTab: 'channels' | 'direct' | 'ai';
  setChatTab: (t: any) => void;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  chatSearchMsg: string;
  setChatSearchMsg: (v: string) => void;
  onlineUsers: string[];
  setOnlineUsers: (u: string[]) => void;
  aiChatHistory: { role: string; content: string }[];
  setAiChatHistory: (h: any[]) => void;
  aiLoading: boolean;
  setAiLoading: (v: boolean) => void;
  reactionPickerMsg: string | null;
  setReactionPickerMsg: (v: string | null) => void;
  unreadCounts: Record<string, number>;
  setUnreadCounts: (u: Record<string, number>) => void;
  directChatId: string | null;
  setDirectChatId: (id: string | null) => void;
  dmChats: any[];
  setDmChats: (c: any[]) => void;
  lastReadPerChat: Record<string, string>;
  setLastReadPerChat: (r: Record<string, string>) => void;
  showNewDMModal: boolean;
  setShowNewDMModal: (v: boolean) => void;
  playingAudio: string | null;
  setPlayingAudio: (v: string | null) => void;
  audioProgress: number;
  setAudioProgress: (v: number) => void;
  audioCurrentTime: number;
  setAudioCurrentTime: (v: number) => void;

  // ===== ADMIN =====
  adminTab: string;
  setAdminTab: (t: string) => void;
  adminWeekOffset: number;
  setAdminWeekOffset: (v: number) => void;
  adminTaskSearch: string;
  setAdminTaskSearch: (v: string) => void;
  adminFilterAssignee: string;
  setAdminFilterAssignee: (v: string) => void;
  adminFilterProject: string;
  setAdminFilterProject: (v: string) => void;
  adminFilterPriority: string;
  setAdminFilterPriority: (v: string) => void;

  // ===== UI =====
  loading: boolean;
  setLoading: (v: boolean) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  toast: { msg: string; type: string } | null;
  showToast: (msg: string, type?: string) => void;

  // ===== MODALS =====
  modals: Record<string, boolean>;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;

  // ===== FORMS =====
  forms: Record<string, any>;
  setForms: (updater: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;

  // ===== GALLERY FILTERS =====
  galleryFilterProject: string;
  setGalleryFilterProject: (v: string) => void;
  galleryFilterCat: string;
  setGalleryFilterCat: (v: string) => void;
  lightboxPhoto: any;
  setLightboxPhoto: (v: any) => void;
  lightboxIndex: number;
  setLightboxIndex: (v: number) => void;

  // ===== MICROSOFT / ONEDRIVE =====
  msAccessToken: string | null;
  setMsAccessToken: (v: string | null) => void;
  msConnected: boolean;
  setMsConnected: (v: boolean) => void;
  msLoading: boolean;
  setMsLoading: (v: boolean) => void;
  oneDriveFiles: any[];
  setOneDriveFiles: (f: any[]) => void;
  odProjectFolder: string | null;
  setOdProjectFolder: (id: string | null) => void;
  showOneDrive: boolean;
  setShowOneDrive: (v: boolean) => void;
}

export const useAppStore = create<AppDataState>((set, get) => ({
  // Auth
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  ready: false,
  setReady: (r) => set({ ready: r }),

  // Navigation
  screen: 'dashboard',
  setScreen: (s) => set({ screen: s }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  chatMobileShow: false,
  setChatMobileShow: (v) => set({ chatMobileShow: v }),

  // Core Data
  projects: [],
  setProjects: (p) => set({ projects: p }),
  tasks: [],
  setTasks: (t) => set({ tasks: t }),
  teamUsers: [],
  setTeamUsers: (u) => set({ teamUsers: u }),
  expenses: [],
  setExpenses: (e) => set({ expenses: e }),
  suppliers: [],
  setSuppliers: (s) => set({ suppliers: s }),

  // Project Detail
  workPhases: [],
  setWorkPhases: (p) => set({ workPhases: p }),
  projectFiles: [],
  setProjectFiles: (f) => set({ projectFiles: f }),
  approvals: [],
  setApprovals: (a) => set({ approvals: a }),
  workLogs: [],
  setWorkLogs: (w) => set({ workLogs: w }),

  // Gallery
  galleryPhotos: [],
  setGalleryPhotos: (p) => set({ galleryPhotos: p }),

  // Inventory
  invProducts: [],
  setInvProducts: (p) => set({ invProducts: p }),
  invCategories: [],
  setInvCategories: (c) => set({ invCategories: c }),
  invMovements: [],
  setInvMovements: (m) => set({ invMovements: m }),
  invTransfers: [],
  setInvTransfers: (t) => set({ invTransfers: t }),
  invTab: 'dashboard',
  setInvTab: (t) => set({ invTab: t }),
  invFilterCat: 'all',
  setInvFilterCat: (v) => set({ invFilterCat: v }),
  invSearch: '',
  setInvSearch: (v) => set({ invSearch: v }),
  invMovFilterType: 'all',
  setInvMovFilterType: (v) => set({ invMovFilterType: v }),
  invTransferFilterStatus: 'all',
  setInvTransferFilterStatus: (v) => set({ invTransferFilterStatus: v }),
  invWarehouseFilter: 'all',
  setInvWarehouseFilter: (v) => set({ invWarehouseFilter: v }),

  // Actas
  actas: [],
  setActas: (a) => set({ actas: a }),

  // Calendar
  meetings: [],
  setMeetings: (m) => set({ meetings: m }),
  calMonth: new Date().getMonth(),
  setCalMonth: (m) => set({ calMonth: m }),
  calYear: new Date().getFullYear(),
  setCalYear: (y) => set({ calYear: y }),
  calSelectedDate: null,
  setCalSelectedDate: (d) => set({ calSelectedDate: d }),
  calFilterProject: 'all',
  setCalFilterProject: (p) => set({ calFilterProject: p }),

  // Chat
  messages: [],
  setMessages: (m) => set({ messages: m }),
  chatProjectId: null,
  setChatProjectId: (id) => set({ chatProjectId: id }),
  chatTab: 'channels',
  setChatTab: (t) => set({ chatTab: t }),
  replyingTo: null,
  setReplyingTo: (v) => set({ replyingTo: v }),
  chatSearchMsg: '',
  setChatSearchMsg: (v) => set({ chatSearchMsg: v }),
  onlineUsers: [],
  setOnlineUsers: (u) => set({ onlineUsers: u }),
  aiChatHistory: [],
  setAiChatHistory: (h) => set({ aiChatHistory: h }),
  aiLoading: false,
  setAiLoading: (v) => set({ aiLoading: v }),
  reactionPickerMsg: null,
  setReactionPickerMsg: (v) => set({ reactionPickerMsg: v }),
  unreadCounts: {},
  setUnreadCounts: (u) => set({ unreadCounts: u }),
  directChatId: null,
  setDirectChatId: (id) => set({ directChatId: id }),
  dmChats: [],
  setDmChats: (c) => set({ dmChats: c }),
  lastReadPerChat: {},
  setLastReadPerChat: (r) => set({ lastReadPerChat: r }),
  showNewDMModal: false,
  setShowNewDMModal: (v) => set({ showNewDMModal: v }),
  playingAudio: null,
  setPlayingAudio: (v) => set({ playingAudio: v }),
  audioProgress: 0,
  setAudioProgress: (v) => set({ audioProgress: v }),
  audioCurrentTime: 0,
  setAudioCurrentTime: (v) => set({ audioCurrentTime: v }),

  // Admin
  adminTab: 'timeline',
  setAdminTab: (t) => set({ adminTab: t }),
  adminWeekOffset: 0,
  setAdminWeekOffset: (v) => set({ adminWeekOffset: v }),
  adminTaskSearch: '',
  setAdminTaskSearch: (v) => set({ adminTaskSearch: v }),
  adminFilterAssignee: 'all',
  setAdminFilterAssignee: (v) => set({ adminFilterAssignee: v }),
  adminFilterProject: 'all',
  setAdminFilterProject: (v) => set({ adminFilterProject: v }),
  adminFilterPriority: 'all',
  setAdminFilterPriority: (v) => set({ adminFilterPriority: v }),

  // UI
  loading: true,
  setLoading: (v) => set({ loading: v }),
  editingId: null,
  setEditingId: (id) => set({ editingId: id }),
  toast: null,
  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  // Modals
  modals: {},
  openModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: true } })),
  closeModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: false } })),

  // Forms
  forms: {},
  setForms: (updater) => {
    if (typeof updater === 'function') {
      set((s) => ({ forms: updater(s.forms) }));
    } else {
      set({ forms: updater });
    }
  },

  // Gallery
  galleryFilterProject: 'all',
  setGalleryFilterProject: (v) => set({ galleryFilterProject: v }),
  galleryFilterCat: 'all',
  setGalleryFilterCat: (v) => set({ galleryFilterCat: v }),
  lightboxPhoto: null,
  setLightboxPhoto: (v) => set({ lightboxPhoto: v }),
  lightboxIndex: 0,
  setLightboxIndex: (v) => set({ lightboxIndex: v }),

  // Microsoft / OneDrive
  msAccessToken: null,
  setMsAccessToken: (v) => set({ msAccessToken: v }),
  msConnected: false,
  setMsConnected: (v) => set({ msConnected: v }),
  msLoading: false,
  setMsLoading: (v) => set({ msLoading: v }),
  oneDriveFiles: [],
  setOneDriveFiles: (f) => set({ oneDriveFiles: f }),
  odProjectFolder: null,
  setOdProjectFolder: (id) => set({ odProjectFolder: id }),
  showOneDrive: false,
  setShowOneDrive: (v) => set({ showOneDrive: v }),
}));
