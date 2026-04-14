'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { useOneDriveContext } from './OneDriveContext';
import { getFirebase } from '@/lib/firebase-service';
import type { Project, Task, Expense, Supplier, Approval, WorkPhase, ProjectFile, GalleryPhoto, TimeEntry, Invoice, Comment } from '@/lib/types';
import { DEFAULT_PHASES, INV_WAREHOUSES, CAT_COLORS } from '@/lib/types';
import { fmtCOP, fmtDate, fmtSize } from '@/lib/helpers';
import { useUIStore } from '@/stores/ui-store';
import { notifyWhatsApp } from '@/lib/whatsapp-notifications';
import * as fbActions from '@/lib/firestore-actions';
import { confirm } from '@/hooks/useConfirmDialog';
import * as _gantt from '@/lib/gantt-helpers';

/* ===== FIRESTORE CONTEXT ===== */
interface FirestoreContextType {
  // Collection state
  projects: any[];
  setProjects: React.Dispatch<React.SetStateAction<any[]>>;
  tasks: any[];
  setTasks: React.Dispatch<React.SetStateAction<any[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  workPhases: WorkPhase[];
  setWorkPhases: React.Dispatch<React.SetStateAction<WorkPhase[]>>;
  projectFiles: ProjectFile[];
  setProjectFiles: React.Dispatch<React.SetStateAction<ProjectFile[]>>;
  approvals: Approval[];
  setApprovals: React.Dispatch<React.SetStateAction<Approval[]>>;
  meetings: any[];
  setMeetings: React.Dispatch<React.SetStateAction<any[]>>;
  galleryPhotos: any[];
  setGalleryPhotos: React.Dispatch<React.SetStateAction<any[]>>;
  invProducts: any[];
  setInvProducts: React.Dispatch<React.SetStateAction<any[]>>;
  invCategories: any[];
  setInvCategories: React.Dispatch<React.SetStateAction<any[]>>;
  invMovements: any[];
  setInvMovements: React.Dispatch<React.SetStateAction<any[]>>;
  invTransfers: any[];
  setInvTransfers: React.Dispatch<React.SetStateAction<any[]>>;
  timeEntries: TimeEntry[];
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  dailyLogs: any[];
  setDailyLogs: React.Dispatch<React.SetStateAction<any[]>>;

  // Domain UI state — Calendar
  calMonth: number; setCalMonth: React.Dispatch<React.SetStateAction<number>>;
  calYear: number; setCalYear: React.Dispatch<React.SetStateAction<number>>;
  calSelectedDate: string | null; setCalSelectedDate: React.Dispatch<React.SetStateAction<string | null>>;
  calFilterProject: string; setCalFilterProject: React.Dispatch<React.SetStateAction<string>>;

  // Domain UI state — Gallery
  galleryFilterProject: string; setGalleryFilterProject: React.Dispatch<React.SetStateAction<string>>;
  galleryFilterCat: string; setGalleryFilterCat: React.Dispatch<React.SetStateAction<string>>;
  lightboxPhoto: any; setLightboxPhoto: React.Dispatch<React.SetStateAction<any>>;
  lightboxIndex: number; setLightboxIndex: React.Dispatch<React.SetStateAction<number>>;

  // Domain UI state — Inventory
  invTab: string; setInvTab: React.Dispatch<React.SetStateAction<string>>;
  invFilterCat: string; setInvFilterCat: React.Dispatch<React.SetStateAction<string>>;
  invSearch: string; setInvSearch: React.Dispatch<React.SetStateAction<string>>;
  invMovFilterType: string; setInvMovFilterType: React.Dispatch<React.SetStateAction<string>>;
  invTransferFilterStatus: string; setInvTransferFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  invWarehouseFilter: string; setInvWarehouseFilter: React.Dispatch<React.SetStateAction<string>>;

  // Domain UI state — Time Tracking
  timeTab: string; setTimeTab: React.Dispatch<React.SetStateAction<string>>;
  timeFilterProject: string; setTimeFilterProject: React.Dispatch<React.SetStateAction<string>>;
  timeFilterDate: string; setTimeFilterDate: React.Dispatch<React.SetStateAction<string>>;
  timeSession: any; setTimeSession: React.Dispatch<React.SetStateAction<any>>;
  timeTimerMs: number; setTimeTimerMs: React.Dispatch<React.SetStateAction<number>>;

  // Domain UI state — Invoices
  invoices2: Invoice[];
  invoiceTab: string; setInvoiceTab: React.Dispatch<React.SetStateAction<string>>;
  invoiceItems: any[]; setInvoiceItems: React.Dispatch<React.SetStateAction<any[]>>;
  invoiceFilterStatus: string; setInvoiceFilterStatus: React.Dispatch<React.SetStateAction<string>>;

  // Domain UI state — Comments
  commentText: string; setCommentText: React.Dispatch<React.SetStateAction<string>>;
  replyingTo: string | null; setReplyingTo: React.Dispatch<React.SetStateAction<string | null>>;

  // Domain UI state — Daily Logs
  dailyLogTab: string; setDailyLogTab: React.Dispatch<React.SetStateAction<string>>;
  selectedLogId: string | null; setSelectedLogId: React.Dispatch<React.SetStateAction<string | null>>;
  logForm: Record<string, any>; setLogForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  // Domain UI state — Admin
  adminTab: string; setAdminTab: React.Dispatch<React.SetStateAction<string>>;
  adminWeekOffset: number; setAdminWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  adminTaskSearch: string; setAdminTaskSearch: React.Dispatch<React.SetStateAction<string>>;
  adminFilterAssignee: string; setAdminFilterAssignee: React.Dispatch<React.SetStateAction<string>>;
  adminFilterProject: string; setAdminFilterProject: React.Dispatch<React.SetStateAction<string>>;
  adminFilterPriority: string; setAdminFilterPriority: React.Dispatch<React.SetStateAction<string>>;
  adminTooltipTask: any; setAdminTooltipTask: React.Dispatch<React.SetStateAction<any>>;
  adminTooltipPos: { x: number; y: number }; setAdminTooltipPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  adminPermSection: string; setAdminPermSection: React.Dispatch<React.SetStateAction<string>>;
  rolePerms: Record<string, string[]>; setRolePerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  toggleRolePerm: (permName: string, role: string) => void;

  // CRUD Functions — Projects
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openEditProject: (p: Project) => void;
  updateProjectProgress: (val: number) => Promise<void>;
  openProject: (id: string) => void;

  // CRUD Functions — Tasks
  saveTask: () => Promise<void>;
  openEditTask: (t: Task) => void;
  toggleTask: (id: string, status: string) => Promise<void>;
  changeTaskStatus: (id: string, newStatus: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // CRUD Functions — Expenses
  saveExpense: () => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // CRUD Functions — Suppliers
  saveSupplier: () => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // CRUD Functions — Companies
  saveCompany: () => Promise<void>;

  // CRUD Functions — Files
  uploadFile: (e: any) => Promise<void>;
  deleteFile: (file: ProjectFile) => Promise<void>;

  // CRUD Functions — Work Phases
  initDefaultPhases: () => Promise<void>;
  updatePhaseStatus: (phaseId: string, status: string) => Promise<void>;

  // CRUD Functions — Approvals
  saveApproval: () => Promise<void>;
  updateApproval: (id: string, status: string) => Promise<void>;
  deleteApproval: (id: string) => Promise<void>;

  // CRUD Functions — Daily Logs
  saveDailyLog: () => Promise<void>;
  deleteDailyLog: (logId: string) => Promise<void>;
  openEditLog: (log: any) => void;
  resetLogForm: () => void;

  // CRUD Functions — Inventory
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

  // CRUD Functions — Meetings
  saveMeeting: () => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  openEditMeeting: (m: any) => void;

  // CRUD Functions — Gallery
  saveGalleryPhoto: () => Promise<void>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  handleGalleryImageSelect: (e: any) => Promise<void>;
  handleInvProductImageSelect: (e: any) => Promise<void>;
  openLightbox: (photo: any, idx: number) => void;
  closeLightbox: () => void;
  lightboxPrev: () => void;
  lightboxNext: () => void;
  getFilteredGalleryPhotos: () => any[];

  // CRUD Functions — Time Tracking
  startTimeTracking: () => void;
  stopTimeTracking: () => Promise<void>;
  saveManualTimeEntry: () => void;

  // CRUD Functions — Invoices
  openNewInvoice: () => void;
  updateInvoiceItem: (idx: number, field: string, value: any) => void;
  addInvoiceItem: () => void;
  removeInvoiceItem: (idx: number) => void;
  saveInvoice: () => void;

  // CRUD Functions — Comments
  postComment: (taskId: string, projectId: string) => void;

  // CRUD Functions — User
  updateUserName: (newName: string) => Promise<void>;

  // Helper functions
  fileToBase64: (file: any) => Promise<string>;

  // Computed values
  currentProject: any;
  pendingCount: number;
  activeTasks: any[];
  completedTasks: any[];
  overdueTasks: any[];
  urgentTasks: any[];
  adminFilteredTasks: any[];
  projectExpenses: Expense[];
  projectTasks: any[];
  projectBudget: number;
  projectSpent: number;
  invTotalValue: number;
  invLowStock: any[];
  invTotalStock: number;
  invPendingTransfers: number;
  invAlerts: any[];

  // Gantt helpers
  GANTT_DAYS: number;
  GANTT_DAY_NAMES: string[];
  GANTT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }>;
  GANTT_PRIO_CFG: Record<string, { label: string; bg: string; color: string }>;
  getMonday: (d: Date) => Date;
  getGanttDays: () => Date[];
  getTaskBar: (task: any, days: Date[]) => { left: number; width: number } | null;
  buildGanttRows: (memberTasks: any[]) => any[][];
  findOverlaps: (memberTasks: any[]) => Set<string>;
  getProjectColor: (projId: string) => string;
  getProjectColorLight: (projId: string) => string;
  calcGanttDays: (startDate: string, endDate: string) => number;
  calcGanttOffset: (phaseStart: string, timelineStart: string) => number;
}

const FirestoreContext = createContext<FirestoreContextType | null>(null);

export default function FirestoreProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, openModal, closeModal, editingId, setEditingId, selectedProjectId, setSelectedProjectId, setScreen } = useUIContext();
  const { ready, authUser, teamUsers } = useAuthContext();
  const { msConnected, msAccessToken, ensureProjectFolder } = useOneDriveContext();

  // ===== COLLECTION STATE =====
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [workPhases, setWorkPhases] = useState<WorkPhase[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [invProducts, setInvProducts] = useState<any[]>([]);
  const [invCategories, setInvCategories] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [invTransfers, setInvTransfers] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  // ===== DOMAIN UI STATE — Calendar =====
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calFilterProject, setCalFilterProject] = useState<string>('all');

  // ===== DOMAIN UI STATE — Gallery =====
  const [galleryFilterProject, setGalleryFilterProject] = useState<string>('all');
  const [galleryFilterCat, setGalleryFilterCat] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // ===== DOMAIN UI STATE — Inventory =====
  const [invTab, setInvTab] = useState<string>('dashboard');
  const [invFilterCat, setInvFilterCat] = useState<string>('all');
  const [invSearch, setInvSearch] = useState<string>('');
  const [invMovFilterType, setInvMovFilterType] = useState<string>('all');
  const [invTransferFilterStatus, setInvTransferFilterStatus] = useState<string>('all');
  const [invWarehouseFilter, setInvWarehouseFilter] = useState<string>('all');

  // ===== DOMAIN UI STATE — Time Tracking =====
  const [timeTab, setTimeTab] = useState<string>('tracker');
  const [timeFilterProject, setTimeFilterProject] = useState<string>('all');
  const [timeFilterDate, setTimeFilterDate] = useState<string>('');
  const [timeSession, setTimeSession] = useState<{ entryId: string | null; startTime: number | null; description: string; projectId: string; phaseName: string; isRunning: boolean }>({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
  const [timeTimerMs, setTimeTimerMs] = useState<number>(0);

  // ===== DOMAIN UI STATE — Invoices =====
  const [invoiceTab, setInvoiceTab] = useState<string>('list');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<string>('all');

  // ===== DOMAIN UI STATE — Comments =====
  const [commentText, setCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // ===== DOMAIN UI STATE — Daily Logs =====
  const [dailyLogTab, setDailyLogTab] = useState<string>('list');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<Record<string, any>>({
    date: new Date().toISOString().split('T')[0], weather: '', temperature: '',
    activities: [''], laborCount: '', equipment: [''], materials: [''],
    observations: '', photos: [], supervisor: '',
  });

  // ===== DOMAIN UI STATE — Admin =====
  const [adminTab, setAdminTab] = useState<string>('timeline');
  const [adminWeekOffset, setAdminWeekOffset] = useState<number>(0);
  const [adminTaskSearch, setAdminTaskSearch] = useState<string>('');
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
      try { localStorage.setItem('archiflow-role-perms', JSON.stringify(updated)); } catch (err) { console.error("[ArchiFlow]", err); }
      return updated;
    });
  };

  // ===== EFFECTS =====

  // Load saved role permissions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archiflow-role-perms');
      if (saved) setRolePerms(JSON.parse(saved));
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  // Load projects
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setProjects(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando projects:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load tasks
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setTasks(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando tasks:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load expenses
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setExpenses(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando expenses:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load suppliers + companies
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsubs: any[] = [];
    unsubs.push(db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setSuppliers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando suppliers:', err); }));
    unsubs.push(db.collection('companies').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setCompanies(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando companies:', err); }));
    return () => unsubs.forEach(u => u());
  }, [ready, authUser]);

  // Load work phases
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot((snap: any) => {
      setWorkPhases(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando workPhases:', err); });
    return () => { unsub(); setWorkPhases([]); };
  }, [ready, selectedProjectId]);

  // Load project files
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setProjectFiles(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando files:', err); });
    return () => { unsub(); setProjectFiles([]); };
  }, [ready, selectedProjectId]);

  // Load approvals
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setApprovals(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando approvals:', err); });
    return () => { unsub(); setApprovals([]); };
  }, [ready, selectedProjectId]);

  // Load meetings
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot((snap: any) => {
      setMeetings(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando meetings:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load gallery photos
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setGalleryPhotos(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando galleryPhotos:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory products
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invProducts').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
      setInvProducts(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando invProducts:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory categories
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invCategories').orderBy('name', 'asc').onSnapshot((snap: any) => {
      setInvCategories(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando invCategories:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory movements
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invMovements').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: any) => {
      setInvMovements(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando invMovements:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load inventory transfers
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invTransfers').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: any) => {
      setInvTransfers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando invTransfers:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load time entries
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('timeEntries').orderBy('createdAt', 'desc').limit(200).onSnapshot((snap: any) => {
      setTimeEntries(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando timeEntries:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load invoices
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invoices').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: any) => {
      setInvoices(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando invoices:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load comments
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('comments').orderBy('createdAt', 'asc').limit(300).onSnapshot((snap: any) => {
      setComments(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando comments:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load daily logs
  useEffect(() => {
    if (!ready || !authUser || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('dailyLogs').orderBy('date', 'desc').limit(100).onSnapshot((snap: any) => {
      setDailyLogs(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando dailyLogs:', err); });
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

  // AI project context
  const currentProject = projects.find((p: any) => p.id === selectedProjectId);
  const projectTasks = tasks.filter((t: any) => t.data.projectId === selectedProjectId);
  const projectExpenses = expenses.filter((e: any) => e.data.projectId === selectedProjectId);
  const projectBudget = currentProject?.data.budget || 0;
  const projectSpent = projectExpenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);

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
        projectTasks.length > 0 ? `Tareas: ${projectTasks.length} (${projectTasks.filter((t: any) => t.data.status === 'Completado').length} completadas)` : '',
        projectExpenses.length > 0 ? `Gastos registrados: ${fmtCOP(projectSpent)} de ${fmtCOP(projectBudget)}` : '',
      ].filter(Boolean).join('\n');
      useUIStore.getState().setAIProjectContext(ctx);
    } else {
      useUIStore.getState().setAIProjectContext('');
    }
  }, [currentProject, projectTasks.length, projectSpent, projectBudget]);

  // ===== CRUD FUNCTIONS =====

  const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Projects ---
  const saveProject = async () => {
    const name = forms.projName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
    const data = { name, status: forms.projStatus || 'Concepto', client: forms.projClient || '', location: forms.projLocation || '', budget: Number(forms.projBudget) || 0, description: forms.projDesc || '', startDate: forms.projStart || '', endDate: forms.projEnd || '', companyId: forms.projCompany || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado'); }
      else {
        await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 });
        showToast('Proyecto creado');
        if (msConnected && msAccessToken) {
          ensureProjectFolder(name).then(folderId => {
            if (folderId) console.log('[ArchiFlow] Carpeta OneDrive creada para:', name);
            else console.warn('[ArchiFlow] No se pudo crear carpeta OneDrive para:', name);
          });
        }
      }
      closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto', projCompany: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteProject = async (id: string) => { if (!(await confirm({ title: 'Eliminar proyecto', description: '¿Eliminar este proyecto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('projects').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); } };

  const openEditProject = (p: Project) => {
    setEditingId(p.id);
    setForms(f => ({ ...f, projName: p.data.name, projStatus: p.data.status, projClient: p.data.client, projLocation: p.data.location, projBudget: p.data.budget, projDesc: p.data.description, projStart: p.data.startDate, projEnd: p.data.endDate, projCompany: p.data.companyId || '' }));
    openModal('project');
  };

  const updateProjectProgress = async (val: number) => {
    if (!selectedProjectId) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId).update({ progress: val, updatedAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp() }); showToast(`Progreso: ${val}%`); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const openProject = (id: string) => { setSelectedProjectId(id); setScreen('projectDetail'); useUIStore.getState().setCurrentScreen('projectDetail'); };

  // --- Tasks ---
  const saveTask = async () => {
    const title = forms.taskTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
    const assignees: string[] = Array.isArray(forms.taskAssignees) ? forms.taskAssignees : (forms.taskAssignee ? [forms.taskAssignee] : []);
    const data: any = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: assignees[0] || '', assigneeIds: assignees, priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('tasks').doc(editingId).update(data); showToast('Tarea actualizada'); }
      else {
        await db.collection('tasks').add({ ...data, createdAt: ts, createdBy: authUser?.uid });
        showToast('Tarea creada');
        if (assignees.length > 0 && forms.taskProject) {
          const proj = projects.find((p: any) => p.id === forms.taskProject);
          const projName = proj?.data?.name || 'Proyecto';
          assignees.forEach((uid: string) => { notifyWhatsApp.taskAssigned(uid, title, projName, forms.taskPriority || 'Media', forms.taskDue || undefined).catch(() => {}); });
        }
      }
      closeModal('task'); setEditingId(null); setForms((p: any) => ({ ...p, taskTitle: '', taskProject: '', taskAssignees: [], taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0] }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const openEditTask = (t: Task) => {
    setEditingId(t.id);
    const assignees: string[] = Array.isArray((t.data as any).assigneeIds) ? (t.data as any).assigneeIds : ((t.data as any).assigneeId ? [(t.data as any).assigneeId] : []);
    setForms((f: any) => ({ ...f, taskTitle: t.data.title, taskDescription: (t.data as any).description || '', taskProject: (t.data as any).projectId || '', taskAssignees: assignees, taskAssignee: (t.data as any).assigneeId || '', taskPriority: (t.data as any).priority || 'Media', taskStatus: (t.data as any).status || 'Por hacer', taskDue: (t.data as any).dueDate || '' }));
    openModal('task');
  };

  const updateUserName = async (newName: string) => {
    if (!newName || !authUser) return;
    try { await authUser.updateProfile({ displayName: newName }); await getFirebase().firestore().collection('users').doc(authUser.uid).update({ name: newName }); showToast('Nombre actualizado'); setForms(p => ({ ...p, editingName: false })); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const toggleTask = async (id: string, status: string) => {
    const ns = status === 'Completado' ? 'Por hacer' : 'Completado';
    try { await getFirebase().firestore().collection('tasks').doc(id).update({ status: ns, updatedAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp() }); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const changeTaskStatus = async (id: string, newStatus: string) => {
    try { await getFirebase().firestore().collection('tasks').doc(id).update({ status: newStatus, updatedAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp() }); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const deleteTask = async (id: string) => { if (!(await confirm({ title: 'Eliminar tarea', description: '¿Eliminar tarea?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('tasks').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // --- Expenses ---
  const saveExpense = async () => {
    const concept = forms.expConcept || '';
    if (!concept) { showToast('El concepto es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const amount = Number(forms.expAmount) || 0;
    const data = { concept, projectId: forms.expProject || '', category: forms.expCategory || 'Materiales', amount, date: forms.expDate || '', createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try {
      await db.collection('expenses').add(data);
      showToast('Gasto registrado');
      closeModal('expense'); setForms(p => ({ ...p, expConcept: '', expAmount: '', expDate: new Date().toISOString().split('T')[0] }));
      if (forms.expProject) {
        const proj = projects.find(p => p.id === forms.expProject);
        const projName = proj?.data.name || 'Proyecto';
        notifyWhatsApp.expenseCreated(authUser?.uid || '', concept, amount, projName, forms.expCategory || undefined).catch(() => {});
      }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const deleteExpense = async (id: string) => { if (!(await confirm({ title: 'Eliminar gasto', description: '¿Eliminar gasto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('expenses').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // --- Suppliers ---
  const saveSupplier = async () => {
    const name = forms.supName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado'); }
      else { await db.collection('suppliers').add(data); showToast('Proveedor creado'); }
      closeModal('supplier'); setForms(p => ({ ...p, supName: '', supCategory: '', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const deleteSupplier = async (id: string) => { if (!(await confirm({ title: 'Eliminar proveedor', description: '¿Eliminar proveedor?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // --- Companies ---
  const saveCompany = async () => {
    const name = forms.compName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const data = { name, nit: forms.compNit || '', legalName: forms.compLegal || '', address: forms.compAddress || '', phone: forms.compPhone || '', email: forms.compEmail || '', createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), updatedAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid };
      if (editingId) { await db.collection('companies').doc(editingId).update(data); showToast('Empresa actualizada'); }
      else { await db.collection('companies').add(data); showToast('Empresa creada'); }
      closeModal('company'); setEditingId(null);
    } catch { showToast('Error al guardar', 'error'); }
  };

  // --- Files ---
  const uploadFile = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file || !selectedProjectId) return;
    if (file.size > 10 * 1024 * 1024) { showToast('El archivo no puede superar 10 MB', 'error'); return; }
    showToast('Subiendo archivo...');
    try {
      const base64 = await fileToBase64(file);
      const db = getFirebase().firestore();
      await db.collection('projects').doc(selectedProjectId).collection('files').add({ name: file.name, type: file.type, size: file.size, data: base64, createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), uploadedBy: authUser?.uid });
      showToast('Archivo subido');
    } catch (err: any) { showToast('Error al subir: ' + (err.message || ''), 'error'); }
    e.target.value = '';
  };

  const deleteFile = async (file: ProjectFile) => {
    if (!(await confirm({ title: 'Eliminar archivo', description: '¿Eliminar archivo?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('files').doc(file.id).delete(); showToast('Archivo eliminado'); } catch { showToast('Error al eliminar', 'error'); }
  };

  // --- Work Phases ---
  const initDefaultPhases = async () => {
    if (workPhases.length > 0) return;
    const db = getFirebase().firestore();
    const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
    for (let i = 0; i < DEFAULT_PHASES.length; i++) {
      await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name: DEFAULT_PHASES[i], description: '', status: 'Pendiente', order: i, startDate: '', endDate: '', createdAt: ts });
    }
    showToast('Fases inicializadas');
  };

  const updatePhaseStatus = async (phaseId: string, status: string) => {
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ status }); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  // --- Approvals ---
  const saveApproval = async () => {
    const title = forms.appTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').add({ title, description: forms.appDesc || '', status: 'Pendiente', createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(), createdBy: authUser?.uid });
      showToast('Solicitud creada'); closeModal('approval'); setForms(p => ({ ...p, appTitle: '', appDesc: '' }));
      const projName = currentProject?.data.name || 'Proyecto';
      notifyWhatsApp.approvalPending(authUser?.uid || '', title, projName, authUser?.displayName || authUser?.email || 'Usuario').catch(() => {});
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const updateApproval = async (id: string, status: string) => {
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).update({ status });
      showToast('Estado actualizado');
      const approval = approvals.find(a => a.id === id);
      if ((approval?.data as any)?.createdBy) {
        const projName = currentProject?.data.name || 'Proyecto';
        notifyWhatsApp.approvalResolved((approval?.data as any).createdBy, (approval?.data as any).title, status, authUser?.displayName || undefined).catch(() => {});
      }
    } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const deleteApproval = async (id: string) => { if (!(await confirm({ title: 'Eliminar aprobación', description: '¿Eliminar aprobación?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  // --- Daily Logs ---
  const saveDailyLog = async () => {
    if (!selectedProjectId) { showToast('Selecciona un proyecto', 'error'); return; }
    const lf = logForm;
    if (!lf.date) { showToast('La fecha es obligatoria', 'error'); return; }
    const db = getFirebase().firestore();
    const data: Record<string, any> = {
      projectId: selectedProjectId, date: lf.date, weather: lf.weather || '', temperature: Number(lf.temperature) || 0,
      activities: (lf.activities || ['']).filter((a: string) => a.trim()), laborCount: Number(lf.laborCount) || 0,
      equipment: (lf.equipment || ['']).filter((e: string) => e.trim()), materials: (lf.materials || ['']).filter((m: string) => m.trim()),
      observations: lf.observations || '', photos: lf.photos || [], supervisor: lf.supervisor || authUser?.displayName || authUser?.email?.split('@')[0] || '',
      createdBy: authUser?.uid, updatedAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp(),
    };
    try {
      if (selectedLogId) { await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(selectedLogId).update(data); showToast('Bitácora actualizada'); }
      else { data.createdAt = (getFirebase() as any).firestore.FieldValue.serverTimestamp(); await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').add(data); showToast('Bitácora creada'); }
      setDailyLogTab('list'); setSelectedLogId(null); resetLogForm();
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al guardar', 'error'); }
  };

  const deleteDailyLog = async (logId: string) => {
    if (!selectedProjectId) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(logId).delete(); showToast('Bitácora eliminada'); if (selectedLogId === logId) { setDailyLogTab('list'); setSelectedLogId(null); } }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const openEditLog = (log: any) => {
    setSelectedLogId(log.id);
    setLogForm({ date: log.data.date || '', weather: log.data.weather || '', temperature: log.data.temperature || '', activities: log.data.activities?.length > 0 ? log.data.activities : [''], laborCount: log.data.laborCount || '', equipment: log.data.equipment?.length > 0 ? log.data.equipment : [''], materials: log.data.materials?.length > 0 ? log.data.materials : [''], observations: log.data.observations || '', photos: log.data.photos || [], supervisor: log.data.supervisor || '' });
    setDailyLogTab('create');
  };

  const resetLogForm = () => {
    setLogForm({ date: new Date().toISOString().split('T')[0], weather: '', temperature: '', activities: [''], laborCount: '', equipment: [''], materials: [''], observations: '', photos: [], supervisor: '' });
  };

  // --- Inventory Helpers ---
  const getWarehouseStock = (product: any, warehouse: string) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') return Number(product.data.warehouseStock[warehouse]) || 0;
    return product.data.warehouse === warehouse ? (Number(product.data.stock) || 0) : 0;
  };

  const getTotalStock = (product: any) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') return Object.values(product.data.warehouseStock).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    return Number(product.data.stock) || 0;
  };

  const buildWarehouseStock = (product: any) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') {
      const ws = { ...product.data.warehouseStock };
      INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
      return ws;
    }
    const ws: Record<string, number> = {};
    INV_WAREHOUSES.forEach(w => { ws[w] = w === (product.data.warehouse || 'Almacén Principal') ? (Number(product.data.stock) || 0) : 0; });
    return ws;
  };

  // --- Inventory CRUD ---
  const saveInvProduct = async () => {
    const name = forms.invProdName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
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

  const deleteInvProduct = async (id: string) => { if (!(await confirm({ title: 'Eliminar producto', description: '¿Eliminar este producto del inventario?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invProducts').doc(id).delete(); showToast('Producto eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

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
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
      const data = { name, color: forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length], description: forms.invCatDesc || '', createdAt: ts };
      if (editingId) { await db.collection('invCategories').doc(editingId).update(data); showToast('Categoría actualizada'); }
      else { await db.collection('invCategories').add(data); showToast('Categoría creada'); }
      closeModal('invCategory'); setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  };

  const deleteInvCategory = async (id: string) => { if (!(await confirm({ title: 'Eliminar categoría', description: '¿Eliminar categoría?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invCategories').doc(id).delete(); showToast('Categoría eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };
  const openEditInvCategory = (c: any) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };

  const saveInvMovement = async () => {
    const productId = forms.invMovProduct || '';
    const qty = Number(forms.invMovQty) || 0;
    const warehouse = forms.invMovWarehouse || 'Almacén Principal';
    if (!productId || qty <= 0) { showToast('Selecciona producto, almacén y cantidad', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
      const type = forms.invMovType || 'Entrada';
      const data = { productId, type, quantity: qty, warehouse, reason: forms.invMovReason || '', reference: forms.invMovRef || '', date: forms.invMovDate || new Date().toISOString().split('T')[0], createdAt: ts, createdBy: authUser?.uid };
      await db.collection('invMovements').add(data);
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

  const deleteInvMovement = async (id: string) => { if (!(await confirm({ title: 'Eliminar movimiento', description: '¿Eliminar movimiento?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invMovements').doc(id).delete(); showToast('Movimiento eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const saveInvTransfer = async () => {
    const productId = forms.invTrProduct || '';
    const qty = Number(forms.invTrQty) || 0;
    const from = forms.invTrFrom || '';
    const to = forms.invTrTo || '';
    if (!productId || !from || !to || from === to || qty <= 0) { showToast('Completa todos los campos y asegúrate que los almacenes sean diferentes', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
      const product = invProducts.find(p => p.id === productId);
      const ws = product ? buildWarehouseStock(product) : {};
      const fromStock = ws[from] || 0;
      if (qty > fromStock) { showToast(`Stock insuficiente en ${from}. Disponible: ${fromStock}`, 'error'); return; }
      ws[from] = Math.max(0, fromStock - qty); ws[to] = (ws[to] || 0) + qty;
      const newTotal = Object.values(ws).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      await db.collection('invProducts').doc(productId).update({ stock: newTotal, warehouseStock: ws, updatedAt: ts });
      await db.collection('invTransfers').add({ productId, productName: product?.data.name || '', fromWarehouse: from, toWarehouse: to, quantity: qty, status: 'Completada', date: forms.invTrDate || new Date().toISOString().split('T')[0], notes: forms.invTrNotes || '', createdAt: ts, createdBy: authUser?.uid, completedAt: ts });
      showToast(`Transferencia completada: ${qty} uds de ${from} → ${to}`);
      closeModal('invTransfer'); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' }));
    } catch { showToast('Error en transferencia', 'error'); }
  };

  const deleteInvTransfer = async (id: string) => { if (!(await confirm({ title: 'Eliminar transferencia', description: '¿Eliminar registro de transferencia?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invTransfers').doc(id).delete(); showToast('Transferencia eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const getInvCategoryName = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.name : 'Sin categoría'; };
  const getInvCategoryColor = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.color : '#6b7280'; };
  const getInvProductName = (prodId: string) => { const p = invProducts.find(x => x.id === prodId); return p ? p.data.name : 'Desconocido'; };

  // --- Meetings ---
  const saveMeeting = async () => {
    const title = forms.meetTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
      const data = { title, description: forms.meetDesc || '', projectId: forms.meetProject || '', date: forms.meetDate || '', time: forms.meetTime || '09:00', duration: Number(forms.meetDuration) || 60, attendees: forms.meetAttendees ? forms.meetAttendees.split(',').map((s: string) => s.trim()).filter(Boolean) : [], createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('meetings').doc(editingId).update(data); showToast('Reunión actualizada'); }
      else { await db.collection('meetings').add(data); showToast('Reunión creada'); }
      closeModal('meeting'); setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };
  const deleteMeeting = async (id: string) => { if (!(await confirm({ title: 'Eliminar reunión', description: '¿Eliminar reunión?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('meetings').doc(id).delete(); showToast('Reunión eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };
  const openEditMeeting = (m: any) => { setEditingId(m.id); setForms(f => ({ ...f, meetTitle: m.data.title, meetProject: m.data.projectId || '', meetDate: m.data.date || '', meetTime: m.data.time || '09:00', meetDuration: String(m.data.duration || 60), meetDesc: m.data.description || '', meetAttendees: (m.data.attendees || []).join(', ') })); openModal('meeting'); };

  // --- Gallery ---
  const saveGalleryPhoto = async () => {
    const imageData = forms.galleryImageData || '';
    if (!imageData) { showToast('Selecciona una foto', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = (getFirebase() as any).firestore.FieldValue.serverTimestamp();
      const data = { projectId: forms.galleryProject || '', categoryName: forms.galleryCategory || 'Otro', caption: forms.galleryCaption || '', imageData, createdAt: ts, createdBy: authUser?.uid };
      if (editingId) { await db.collection('galleryPhotos').doc(editingId).update(data); showToast('Foto actualizada'); }
      else { await db.collection('galleryPhotos').add(data); showToast('Foto agregada a galería'); }
      closeModal('gallery'); setEditingId(null); setForms(p => ({ ...p, galleryImageData: '', galleryProject: '', galleryCategory: 'Otro', galleryCaption: '' }));
    } catch { showToast('Error al guardar foto', 'error'); }
  };

  const deleteGalleryPhoto = async (id: string) => { if (!(await confirm({ title: 'Eliminar foto', description: '¿Eliminar foto de la galería?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('galleryPhotos').doc(id).delete(); showToast('Foto eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const handleGalleryImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', 'error'); return; }
    try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, galleryImageData: base64 })); }
    catch { showToast('Error al procesar imagen', 'error'); }
  };

  const handleInvProductImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    if (file.size > 3 * 1024 * 1024) { showToast('Máx 3 MB', 'error'); return; }
    try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, invProdImage: base64 })); }
    catch { showToast('Error al procesar', 'error'); }
  };

  const openLightbox = (photo: any, idx: number) => { setLightboxPhoto(photo); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxPhoto(null); setLightboxIndex(0); };
  const lightboxPrev = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev - 1 + filtered.length) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  };
  const lightboxNext = () => {
    const filtered = getFilteredGalleryPhotos();
    if (filtered.length === 0) return;
    setLightboxIndex(prev => { const next = (prev + 1) % filtered.length; setLightboxPhoto(filtered[next]); return next; });
  };

  const getFilteredGalleryPhotos = () => {
    let photos = galleryPhotos;
    if (galleryFilterProject !== 'all') photos = photos.filter(p => p.data.projectId === galleryFilterProject);
    if (galleryFilterCat !== 'all') photos = photos.filter(p => p.data.categoryName === galleryFilterCat);
    return photos;
  };

  // --- Time Tracking ---
  const startTimeTracking = () => {
    if (timeSession.isRunning) return;
    const desc = forms.teDescription || forms.teQuickDesc || 'Trabajo en proyecto';
    const projId = forms.teProject || '';
    const phase = forms.tePhase || '';
    if (!projId) { showToast('Selecciona un proyecto', 'error'); return; }
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
    await fbActions.saveTimeEntry({ teProject: timeSession.projectId, tePhase: timeSession.phaseName, teDescription: timeSession.description, teStartTime: startStr, teEndTime: endStr, teDuration: durationMin, teBillable: true, teRate: Number(forms.teRate) || 50000, teDate: dateStr }, null, showToast, authUser);
    setTimeSession({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
    setTimeTimerMs(0);
  };

  const saveManualTimeEntry = () => {
    const dur = Number(forms.teManualDuration) || 0;
    if (dur < 1) { showToast('Mínimo 1 minuto', 'error'); return; }
    if (!forms.teProject) { showToast('Selecciona un proyecto', 'error'); return; }
    fbActions.saveTimeEntry({ teProject: forms.teProject, tePhase: forms.tePhase || '', teDescription: forms.teDescription || '', teStartTime: forms.teStartTime || '08:00', teEndTime: forms.teEndTime || '17:00', teDuration: dur, teBillable: forms.teBillable !== false, teRate: Number(forms.teRate) || 50000, teDate: forms.teDate || new Date().toISOString().split('T')[0] }, editingId, showToast, authUser);
    closeModal('timeEntry');
  };

  // --- Invoices ---
  const openNewInvoice = () => {
    setEditingId(null);
    setInvoiceItems([{ concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);
    setForms(p => ({ ...p, invProject: '', invNumber: '', invStatus: 'Borrador', invTax: 19, invNotes: '', invIssueDate: new Date().toISOString().split('T')[0], invDueDate: '' }));
    setInvoiceTab('create');
  };

  const updateInvoiceItem = (idx: number, field: string, value: any) => {
    setInvoiceItems(prev => { const items = [...prev]; items[idx] = { ...items[idx], [field]: value }; if (field === 'hours' || field === 'rate') items[idx].amount = (Number(items[idx].hours) || 0) * (Number(items[idx].rate) || 0); return items; });
  };

  const addInvoiceItem = () => setInvoiceItems(prev => [...prev, { concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);
  const removeInvoiceItem = (idx: number) => { if (invoiceItems.length <= 1) return; setInvoiceItems(prev => prev.filter((_, i) => i !== idx)); };

  const saveInvoice = () => {
    if (!forms.invProject) { showToast('Selecciona un proyecto', 'error'); return; }
    const subtotal = invoiceItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const tax = Number(forms.invTax) || 19;
    const total = subtotal + (subtotal * tax / 100);
    fbActions.saveInvoice({ invProject: forms.invProject, invNumber: forms.invNumber || '', invStatus: forms.invStatus || 'Borrador', invItems: invoiceItems, invSubtotal: subtotal, invTax: tax, invTotal: total, invNotes: forms.invNotes || '', invIssueDate: forms.invIssueDate || new Date().toISOString().split('T')[0], invDueDate: forms.invDueDate || '' }, editingId, showToast, authUser);
    setInvoiceTab('list');
  };

  // --- Comments ---
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

  // ===== COMPUTED VALUES =====
  const activeTasks = tasks.filter(t => t.data?.status !== 'Completado');
  const completedTasks = tasks.filter(t => t.data?.status === 'Completado');
  const overdueTasks = activeTasks.filter(t => t.data?.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString()));
  const urgentTasks = activeTasks.filter(t => t.data?.priority === 'Alta');
  const pendingCount = tasks.filter(t => t.data?.status !== 'Completado').length;

  const adminFilteredTasks = activeTasks.filter(t => {
    const ms = !adminTaskSearch || (t.data?.title || '').toLowerCase().includes(adminTaskSearch.toLowerCase());
    const ma = adminFilterAssignee === 'all' || t.data?.assigneeId === adminFilterAssignee;
    const mp = adminFilterProject === 'all' || t.data?.projectId === adminFilterProject;
    const mpr = adminFilterPriority === 'all' || t.data?.priority === adminFilterPriority;
    return ms && ma && mp && mpr;
  });

  const invTotalValue = invProducts.reduce((s, p) => s + (Number(p.data?.price) || 0) * getTotalStock(p), 0);
  const invLowStock = invProducts.filter(p => getTotalStock(p) <= (Number(p.data?.minStock) || 0));
  const invTotalStock = invProducts.reduce((s, p) => s + getTotalStock(p), 0);
  const invPendingTransfers = invTransfers.filter(t => t.data?.status === 'Pendiente' || t.data?.status === 'En tránsito').length;
  const invAlerts = [
    ...(invLowStock.map(p => ({ type: 'low_stock' as const, msg: `${p.data?.name || 'Producto'}: stock ${getTotalStock(p)} (mín: ${p.data?.minStock || 0})`, severity: 'high' as const }))),
    ...(invTransfers.filter(t => t.data?.status === 'Pendiente').map(t => ({ type: 'pending_transfer' as const, msg: `Transferencia pendiente: ${t.data?.quantity || 0} uds de ${t.data?.fromWarehouse || '?'} → ${t.data?.toWarehouse || '?'}`, severity: 'medium' as const }))),
    ...(invProducts.filter(p => getTotalStock(p) === 0).map(p => ({ type: 'out_of_stock' as const, msg: `${p.data?.name || 'Producto'}: AGOTADO`, severity: 'critical' as const }))),
  ];

  // ===== GANTT HELPERS (re-exported from @/lib/gantt-helpers) =====
  const _getGanttDays = (weekOffset: number) => _gantt.getGanttDays(weekOffset);
  const _getProjectColor = (projId: string) => _gantt.getProjectColor(projId, projects);
  const _getProjectColorLight = (projId: string) => _gantt.getProjectColorLight(projId, projects);

  const value: FirestoreContextType = {
    // Collection state
    projects, setProjects, tasks, setTasks, expenses, setExpenses,
    suppliers, setSuppliers, companies, setCompanies,
    workPhases, setWorkPhases, projectFiles, setProjectFiles,
    approvals, setApprovals, meetings, setMeetings,
    galleryPhotos, setGalleryPhotos,
    invProducts, setInvProducts, invCategories, setInvCategories,
    invMovements, setInvMovements, invTransfers, setInvTransfers,
    timeEntries, setTimeEntries, invoices, setInvoices,
    comments, setComments, dailyLogs, setDailyLogs,
    // Calendar
    calMonth, setCalMonth, calYear, setCalYear, calSelectedDate, setCalSelectedDate, calFilterProject, setCalFilterProject,
    // Gallery
    galleryFilterProject, setGalleryFilterProject, galleryFilterCat, setGalleryFilterCat, lightboxPhoto, setLightboxPhoto, lightboxIndex, setLightboxIndex,
    // Inventory
    invTab, setInvTab, invFilterCat, setInvFilterCat, invSearch, setInvSearch, invMovFilterType, setInvMovFilterType, invTransferFilterStatus, setInvTransferFilterStatus, invWarehouseFilter, setInvWarehouseFilter,
    // Time Tracking
    timeTab, setTimeTab, timeFilterProject, setTimeFilterProject, timeFilterDate, setTimeFilterDate, timeSession, setTimeSession, timeTimerMs, setTimeTimerMs,
    // Invoices
    invoices2: invoices, invoiceTab, setInvoiceTab, invoiceItems, setInvoiceItems, invoiceFilterStatus, setInvoiceFilterStatus,
    // Comments
    commentText, setCommentText, replyingTo, setReplyingTo,
    // Daily Logs
    dailyLogTab, setDailyLogTab, selectedLogId, setSelectedLogId, logForm, setLogForm,
    // Admin
    adminTab, setAdminTab, adminWeekOffset, setAdminWeekOffset, adminTaskSearch, setAdminTaskSearch, adminFilterAssignee, setAdminFilterAssignee, adminFilterProject, setAdminFilterProject, adminFilterPriority, setAdminFilterPriority, adminTooltipTask, setAdminTooltipTask, adminTooltipPos, setAdminTooltipPos, adminPermSection, setAdminPermSection, rolePerms, setRolePerms, toggleRolePerm,
    // CRUD
    saveProject, deleteProject, openEditProject, updateProjectProgress, openProject,
    saveTask, openEditTask, toggleTask, changeTaskStatus, deleteTask,
    saveExpense, deleteExpense,
    saveSupplier, deleteSupplier,
    saveCompany,
    uploadFile, deleteFile,
    initDefaultPhases, updatePhaseStatus,
    saveApproval, updateApproval, deleteApproval,
    saveDailyLog, deleteDailyLog, openEditLog, resetLogForm,
    getWarehouseStock, getTotalStock, buildWarehouseStock,
    saveInvProduct, deleteInvProduct, openEditInvProduct,
    saveInvCategory, deleteInvCategory, openEditInvCategory,
    saveInvMovement, deleteInvMovement,
    saveInvTransfer, deleteInvTransfer,
    getInvCategoryName, getInvCategoryColor, getInvProductName,
    saveMeeting, deleteMeeting, openEditMeeting,
    saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect, handleInvProductImageSelect,
    openLightbox, closeLightbox, lightboxPrev, lightboxNext, getFilteredGalleryPhotos,
    startTimeTracking, stopTimeTracking, saveManualTimeEntry,
    openNewInvoice, updateInvoiceItem, addInvoiceItem, removeInvoiceItem, saveInvoice,
    postComment, updateUserName, fileToBase64,
    // Computed
    currentProject, pendingCount, activeTasks, completedTasks, overdueTasks, urgentTasks, adminFilteredTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
    invTotalValue, invLowStock, invTotalStock, invPendingTransfers, invAlerts,
    // Gantt (re-exported from @/lib/gantt-helpers)
    GANTT_DAYS: _gantt.GANTT_DAYS, GANTT_DAY_NAMES: _gantt.GANTT_DAY_NAMES,
    GANTT_STATUS_CFG: _gantt.GANTT_STATUS_CFG, GANTT_PRIO_CFG: _gantt.GANTT_PRIO_CFG,
    getMonday: _gantt.getMonday, getGanttDays: () => _getGanttDays(adminWeekOffset),
    getTaskBar: _gantt.getTaskBar, buildGanttRows: _gantt.buildGanttRows, findOverlaps: _gantt.findOverlaps,
    getProjectColor: _getProjectColor, getProjectColorLight: _getProjectColorLight,
    calcGanttDays: _gantt.calcGanttDays, calcGanttOffset: _gantt.calcGanttOffset,
  };

  return <FirestoreContext.Provider value={value}>{children}</FirestoreContext.Provider>;
}

export function useFirestoreContext() {
  const ctx = useContext(FirestoreContext);
  if (!ctx) throw new Error('useFirestoreContext must be used within FirestoreProvider');
  return ctx;
}
