'use client';
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { useOneDriveContext } from './OneDriveContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import type { Project, Task, Expense, Supplier, Approval, WorkPhase, ProjectFile, Company, Subtask } from '@/lib/types';
import { DEFAULT_PHASES } from '@/lib/types';
import { fmtCOP, fmtDate, fmtSize } from '@/lib/helpers';
import { useUIStore } from '@/stores/ui-store';
import { notifyWhatsApp } from '@/lib/whatsapp-notifications';

import { confirm } from '@/hooks/useConfirmDialog';
import * as _gantt from '@/lib/gantt-helpers';
import InventoryProvider from './InventoryContext';
import GalleryProvider from './GalleryContext';
import TimeTrackingProvider from './TimeTrackingContext';
import CalendarProvider from './CalendarContext';
import InvoiceProvider from './InvoiceContext';
import CommentsProvider from './CommentsContext';

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
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

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
  const { ready, authUser } = useAuthContext();
  const { msConnected, msAccessToken, ensureProjectFolder } = useOneDriveContext();

  // ===== COLLECTION STATE =====
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workPhases, setWorkPhases] = useState<WorkPhase[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  // ===== DOMAIN UI STATE — Admin =====
  const [adminTab, setAdminTab] = useState<string>('timeline');
  const [adminWeekOffset, setAdminWeekOffset] = useState<number>(0);
  const [adminTaskSearch, setAdminTaskSearch] = useState<string>('');
  const [adminFilterAssignee, setAdminFilterAssignee] = useState<string>('all');
  const [adminFilterProject, setAdminFilterProject] = useState<string>('all');
  const [adminFilterPriority, setAdminFilterPriority] = useState<string>('all');
  const [adminTooltipTask, setAdminTooltipTask] = useState<Task | null>(null);
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
    const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setProjects(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando projects:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load tasks
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setTasks(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando tasks:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load expenses
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setExpenses(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando expenses:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load suppliers + companies
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsubs: any[] = [];
    unsubs.push(db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setSuppliers(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando suppliers:', err); }));
    unsubs.push(db.collection('companies').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setCompanies(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando companies:', err); }));
    return () => unsubs.forEach(u => u());
  }, [ready, authUser]);

  // Load work phases
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot((snap: QuerySnapshot) => {
      setWorkPhases(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando workPhases:', err); });
    return () => { unsub(); setWorkPhases([]); };
  }, [ready, selectedProjectId]);

  // Load project files
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setProjectFiles(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando files:', err); });
    return () => { unsub(); setProjectFiles([]); };
  }, [ready, selectedProjectId]);

  // Load approvals
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setApprovals(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando approvals:', err); });
    return () => { unsub(); setApprovals([]); };
  }, [ready, selectedProjectId]);

  // AI project context
  const currentProject = useMemo(() => projects.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectTasks = useMemo(() => tasks.filter((t: any) => t.data.projectId === selectedProjectId), [tasks, selectedProjectId]);
  const projectExpenses = useMemo(() => expenses.filter((e: any) => e.data.projectId === selectedProjectId), [expenses, selectedProjectId]);
  const projectBudget = useMemo(() => currentProject?.data.budget || 0, [currentProject]);
  const projectSpent = useMemo(() => projectExpenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0), [projectExpenses]);

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

  const fileToBase64 = useCallback((file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // --- Projects ---
  const saveProject = useCallback(async () => {
    const name = forms.projName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const ts = serverTimestamp();
    const data = { name, status: forms.projStatus || 'Concepto', client: forms.projClient || '', location: forms.projLocation || '', budget: Number(forms.projBudget) || 0, description: forms.projDesc || '', startDate: forms.projStart || '', endDate: forms.projEnd || '', companyId: forms.projCompany || '', updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado'); }
      else {
        await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 });
        showToast('Proyecto creado');
        if (msConnected && msAccessToken) {
          ensureProjectFolder(name).then(folderId => {
            if (!folderId) console.warn('[ArchiFlow] No se pudo crear carpeta OneDrive para:', name);
          });
        }
      }
      closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto', projCompany: '' }));
    } catch { showToast('Error al guardar', 'error'); }
  }, [editingId, forms, authUser, msConnected, msAccessToken, showToast, closeModal, setForms]);

  const deleteProject = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar proyecto', description: '¿Eliminar este proyecto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('projects').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); } }, [confirm, showToast]);

  const openEditProject = useCallback((p: Project) => {
    setEditingId(p.id);
    setForms(f => ({ ...f, projName: p.data.name, projStatus: p.data.status, projClient: p.data.client, projLocation: p.data.location, projBudget: p.data.budget, projDesc: p.data.description, projStart: p.data.startDate, projEnd: p.data.endDate, projCompany: p.data.companyId || '' }));
    openModal('project');
  }, [setEditingId, setForms, openModal]);

  const updateProjectProgress = useCallback(async (val: number) => {
    if (!selectedProjectId) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId).update({ progress: val, updatedAt: serverTimestamp() }); showToast(`Progreso: ${val}%`); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [selectedProjectId, showToast]);

  const openProject = useCallback((id: string) => { setSelectedProjectId(id); setScreen('projectDetail'); useUIStore.getState().setCurrentScreen('projectDetail'); }, [setSelectedProjectId, setScreen]);

  // --- Tasks ---
  const saveTask = useCallback(async () => {
    const title = forms.taskTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const ts = serverTimestamp();
    const assignees: string[] = Array.isArray(forms.taskAssignees) ? forms.taskAssignees : (forms.taskAssignee ? [forms.taskAssignee] : []);
    const subtasks: Subtask[] = Array.isArray(forms.taskSubtasks) ? forms.taskSubtasks : [];
    const data: any = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: assignees[0] || '', assigneeIds: assignees, priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', subtasks, updatedAt: ts, updatedBy: authUser?.uid };
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
      closeModal('task'); setEditingId(null); setForms((p: any) => ({ ...p, taskTitle: '', taskProject: '', taskAssignees: [], taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0], taskSubtasks: [] }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [editingId, forms, authUser, projects, showToast, closeModal, setEditingId, setForms]);

  const openEditTask = useCallback((t: Task) => {
    setEditingId(t.id);
    const assignees: string[] = Array.isArray((t.data as any).assigneeIds) ? (t.data as any).assigneeIds : ((t.data as any).assigneeId ? [(t.data as any).assigneeId] : []);
    const subtasks: Subtask[] = Array.isArray((t.data as any).subtasks) ? (t.data as any).subtasks : [];
    setForms((f: any) => ({ ...f, taskTitle: t.data.title, taskDescription: (t.data as any).description || '', taskProject: (t.data as any).projectId || '', taskAssignees: assignees, taskAssignee: (t.data as any).assigneeId || '', taskPriority: (t.data as any).priority || 'Media', taskStatus: (t.data as any).status || 'Por hacer', taskDue: (t.data as any).dueDate || '', taskSubtasks: subtasks }));
    openModal('task');
  }, [setEditingId, setForms, openModal]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!newName || !authUser) return;
    try { await authUser.updateProfile({ displayName: newName }); await getFirebase().firestore().collection('users').doc(authUser.uid).update({ name: newName }); showToast('Nombre actualizado'); setForms(p => ({ ...p, editingName: false })); } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [authUser, showToast, setForms]);

  const toggleTask = useCallback(async (id: string, status: string) => {
    const ns = status === 'Completado' ? 'Por hacer' : 'Completado';
    try { await getFirebase().firestore().collection('tasks').doc(id).update({ status: ns, updatedAt: serverTimestamp() }); } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  const changeTaskStatus = useCallback(async (id: string, newStatus: string) => {
    try { await getFirebase().firestore().collection('tasks').doc(id).update({ status: newStatus, updatedAt: serverTimestamp() }); } catch (err) { console.error("[ArchiFlow]", err); }
  }, []);

  const deleteTask = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar tarea', description: '¿Eliminar tarea?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('tasks').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find((t: any) => t.id === taskId);
      if (!task) return;
      const subtasks: Subtask[] = Array.isArray((task.data as any).subtasks) ? (task.data as any).subtasks : [];
      const updated = subtasks.map((s: Subtask) => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
      await getFirebase().firestore().collection('tasks').doc(taskId).update({ subtasks: updated, updatedAt: serverTimestamp() });
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [tasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find((t: any) => t.id === taskId);
      if (!task) return;
      const subtasks: Subtask[] = Array.isArray((task.data as any).subtasks) ? (task.data as any).subtasks : [];
      const updated = subtasks.filter((s: Subtask) => s.id !== subtaskId);
      await getFirebase().firestore().collection('tasks').doc(taskId).update({ subtasks: updated, updatedAt: serverTimestamp() });
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [tasks]);

  // --- Expenses ---
  const saveExpense = useCallback(async () => {
    const concept = forms.expConcept || '';
    if (!concept) { showToast('El concepto es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const amount = Number(forms.expAmount) || 0;
    const data = { concept, projectId: forms.expProject || '', category: forms.expCategory || 'Materiales', amount, date: forms.expDate || '', createdAt: serverTimestamp(), createdBy: authUser?.uid };
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
  }, [forms, authUser, projects, showToast, closeModal, setForms]);

  const deleteExpense = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar gasto', description: '¿Eliminar gasto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('expenses').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm, showToast]);

  // --- Suppliers ---
  const saveSupplier = useCallback(async () => {
    const name = forms.supName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: serverTimestamp(), createdBy: authUser?.uid };
    try {
      if (editingId) { await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado'); }
      else { await db.collection('suppliers').add(data); showToast('Proveedor creado'); }
      closeModal('supplier'); setForms(p => ({ ...p, supName: '', supCategory: '', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [editingId, forms, showToast, closeModal, setForms]);

  const deleteSupplier = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar proveedor', description: '¿Eliminar proveedor?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm]);

  // --- Companies ---
  const saveCompany = useCallback(async () => {
    const name = forms.compName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const data = { name, nit: forms.compNit || '', legalName: forms.compLegal || '', address: forms.compAddress || '', phone: forms.compPhone || '', email: forms.compEmail || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: authUser?.uid };
      if (editingId) { await db.collection('companies').doc(editingId).update(data); showToast('Empresa actualizada'); }
      else { await db.collection('companies').add(data); showToast('Empresa creada'); }
      closeModal('company'); setEditingId(null);
    } catch { showToast('Error al guardar', 'error'); }
  }, [editingId, forms, showToast, closeModal, setEditingId]);

  // --- Files ---
  const uploadFile = useCallback(async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file || !selectedProjectId) return;
    if (file.size > 10 * 1024 * 1024) { showToast('El archivo no puede superar 10 MB', 'error'); return; }
    showToast('Subiendo archivo...');
    try {
      const base64 = await fileToBase64(file);
      const db = getFirebase().firestore();
      await db.collection('projects').doc(selectedProjectId).collection('files').add({ name: file.name, type: file.type, size: file.size, data: base64, createdAt: serverTimestamp(), uploadedBy: authUser?.uid });
      showToast('Archivo subido');
    } catch (err: unknown) { showToast('Error al subir: ' + (err instanceof Error ? err.message : ''), 'error'); }
    e.target.value = '';
  }, [selectedProjectId, authUser, showToast, fileToBase64]);

  const deleteFile = useCallback(async (file: ProjectFile) => {
    if (!(await confirm({ title: 'Eliminar archivo', description: '¿Eliminar archivo?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('files').doc(file.id).delete(); showToast('Archivo eliminado'); } catch { showToast('Error al eliminar', 'error'); }
  }, [selectedProjectId, confirm, showToast]);

  // --- Work Phases ---
  const initDefaultPhases = useCallback(async () => {
    if (workPhases.length > 0) return;
    const db = getFirebase().firestore();
    const ts = serverTimestamp();
    for (let i = 0; i < DEFAULT_PHASES.length; i++) {
      await db.collection('projects').doc(selectedProjectId!).collection('workPhases').add({ name: DEFAULT_PHASES[i], description: '', status: 'Pendiente', order: i, startDate: '', endDate: '', createdAt: ts });
    }
    showToast('Fases inicializadas');
  }, [workPhases, selectedProjectId, showToast]);

  const updatePhaseStatus = useCallback(async (phaseId: string, status: string) => {
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('workPhases').doc(phaseId).update({ status }); } catch (err) { console.error("[ArchiFlow]", err); }
  }, [selectedProjectId]);

  // --- Approvals ---
  const saveApproval = useCallback(async () => {
    const title = forms.appTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').add({ title, description: forms.appDesc || '', status: 'Pendiente', createdAt: serverTimestamp(), createdBy: authUser?.uid });
      showToast('Solicitud creada'); closeModal('approval'); setForms(p => ({ ...p, appTitle: '', appDesc: '' }));
      const projName = currentProject?.data.name || 'Proyecto';
      notifyWhatsApp.approvalPending(authUser?.uid || '', title, projName, authUser?.displayName || authUser?.email || 'Usuario').catch(() => {});
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [forms, selectedProjectId, currentProject, authUser, showToast, closeModal, setForms]);

  const updateApproval = useCallback(async (id: string, status: string) => {
    try {
      await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).update({ status });
      showToast('Estado actualizado');
      const approval = approvals.find(a => a.id === id);
      if ((approval?.data as any)?.createdBy) {
        const projName = currentProject?.data.name || 'Proyecto';
        notifyWhatsApp.approvalResolved((approval?.data as any).createdBy, (approval?.data as any).title, status, authUser?.displayName || undefined).catch(() => {});
      }
    } catch (err) { console.error("[ArchiFlow]", err); }
  }, [selectedProjectId, approvals, currentProject, authUser, showToast]);

  const deleteApproval = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar aprobación', description: '¿Eliminar aprobación?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('approvals').doc(id).delete(); showToast('Eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm]);

  // ===== COMPUTED VALUES =====
  const activeTasks = useMemo(() => tasks.filter(t => t.data?.status !== 'Completado'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.data?.status === 'Completado'), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter(t => t.data?.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString())), [activeTasks]);
  const urgentTasks = useMemo(() => activeTasks.filter(t => t.data?.priority === 'Alta'), [activeTasks]);
  const pendingCount = useMemo(() => tasks.filter(t => t.data?.status !== 'Completado').length, [tasks]);

  const adminFilteredTasks = useMemo(() => activeTasks.filter(t => {
    const ms = !adminTaskSearch || (t.data?.title || '').toLowerCase().includes(adminTaskSearch.toLowerCase());
    const ma = adminFilterAssignee === 'all' || t.data?.assigneeId === adminFilterAssignee;
    const mp = adminFilterProject === 'all' || t.data?.projectId === adminFilterProject;
    const mpr = adminFilterPriority === 'all' || t.data?.priority === adminFilterPriority;
    return ms && ma && mp && mpr;
  }), [activeTasks, adminTaskSearch, adminFilterAssignee, adminFilterProject, adminFilterPriority]);

  // ===== GANTT HELPERS (re-exported from @/lib/gantt-helpers) =====
  const _getGanttDays = (weekOffset: number) => _gantt.getGanttDays(weekOffset);
  const _getProjectColor = (projId: string) => _gantt.getProjectColor(projId, projects);
  const _getProjectColorLight = (projId: string) => _gantt.getProjectColorLight(projId, projects);

  const value: FirestoreContextType = useMemo(() => ({
    // Collection state
    projects, setProjects, tasks, setTasks, expenses, setExpenses,
    suppliers, setSuppliers, companies, setCompanies,
    workPhases, setWorkPhases, projectFiles, setProjectFiles,
    approvals, setApprovals,
    // Admin
    adminTab, setAdminTab, adminWeekOffset, setAdminWeekOffset, adminTaskSearch, setAdminTaskSearch, adminFilterAssignee, setAdminFilterAssignee, adminFilterProject, setAdminFilterProject, adminFilterPriority, setAdminFilterPriority, adminTooltipTask, setAdminTooltipTask, adminTooltipPos, setAdminTooltipPos, adminPermSection, setAdminPermSection, rolePerms, setRolePerms, toggleRolePerm,
    // CRUD
    saveProject, deleteProject, openEditProject, updateProjectProgress, openProject,
    saveTask, openEditTask, toggleTask, changeTaskStatus, deleteTask, toggleSubtask, deleteSubtask,
    saveExpense, deleteExpense,
    saveSupplier, deleteSupplier,
    saveCompany,
    uploadFile, deleteFile,
    initDefaultPhases, updatePhaseStatus,
    saveApproval, updateApproval, deleteApproval,
    updateUserName, fileToBase64,
    // Computed
    currentProject, pendingCount, activeTasks, completedTasks, overdueTasks, urgentTasks, adminFilteredTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
    // Gantt (re-exported from @/lib/gantt-helpers)
    GANTT_DAYS: _gantt.GANTT_DAYS, GANTT_DAY_NAMES: _gantt.GANTT_DAY_NAMES,
    GANTT_STATUS_CFG: _gantt.GANTT_STATUS_CFG, GANTT_PRIO_CFG: _gantt.GANTT_PRIO_CFG,
    getMonday: _gantt.getMonday, getGanttDays: () => _getGanttDays(adminWeekOffset),
    getTaskBar: _gantt.getTaskBar, buildGanttRows: _gantt.buildGanttRows, findOverlaps: _gantt.findOverlaps,
    getProjectColor: _getProjectColor, getProjectColorLight: _getProjectColorLight,
    calcGanttDays: _gantt.calcGanttDays, calcGanttOffset: _gantt.calcGanttOffset,
  }), [
    // Collection state
    projects, tasks, expenses, suppliers, companies, workPhases, projectFiles, approvals,
    // Admin state
    adminTab, adminWeekOffset, adminTaskSearch, adminFilterAssignee, adminFilterProject, adminFilterPriority, adminTooltipTask, adminTooltipPos, adminPermSection, rolePerms,
    // CRUD functions
    toggleRolePerm, saveProject, deleteProject, openEditProject, updateProjectProgress, openProject,
    saveTask, openEditTask, toggleTask, changeTaskStatus, deleteTask, toggleSubtask, deleteSubtask,
    saveExpense, deleteExpense, saveSupplier, deleteSupplier, saveCompany,
    uploadFile, deleteFile, initDefaultPhases, updatePhaseStatus,
    saveApproval, updateApproval, deleteApproval, updateUserName, fileToBase64,
    // Computed values
    currentProject, pendingCount, activeTasks, completedTasks, overdueTasks, urgentTasks, adminFilteredTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
    // Gantt helper wrappers
    _getGanttDays, _getProjectColor, _getProjectColorLight,
  ]);

  return <FirestoreContext.Provider value={value}><CommentsProvider><InvoiceProvider><InventoryProvider><GalleryProvider><TimeTrackingProvider><CalendarProvider>{children}</CalendarProvider></TimeTrackingProvider></GalleryProvider></InventoryProvider></InvoiceProvider></CommentsProvider></FirestoreContext.Provider>;
}

export function useFirestoreContext() {
  const ctx = useContext(FirestoreContext);
  if (!ctx) throw new Error('useFirestoreContext must be used within FirestoreProvider');
  return ctx;
}
