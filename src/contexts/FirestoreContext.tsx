'use client';
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { useOneDriveContext } from './OneDriveContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { findTemplateById, flattenTemplateTasks } from '@/lib/templates';
import type { Project, Task, Expense, Supplier, Approval, WorkPhase, ProjectFile, Company, Subtask } from '@/lib/types';
import { DEFAULT_PHASES } from '@/lib/types';
import { fmtCOP, fmtDate, fmtSize } from '@/lib/helpers';
import { useUIStore } from '@/stores/ui-store';
import { notifyWhatsApp } from '@/lib/whatsapp-notifications';

import { confirm } from '@/hooks/useConfirmDialog';
import { logAudit, extractChanges } from '@/lib/audit-trail';
import type { AuditEntityType } from '@/lib/audit-trail';
import * as _gantt from '@/lib/gantt-helpers';

/* ===== FIRESTORE CONTEXT ===== */
interface FirestoreContextType {
  // Collection state
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  workPhases: WorkPhase[];
  setWorkPhases: React.Dispatch<React.SetStateAction<WorkPhase[]>>;
  projectFiles: ProjectFile[];
  setProjectFiles: React.Dispatch<React.SetStateAction<ProjectFile[]>>;
  approvals: Approval[];
  setApprovals: React.Dispatch<React.SetStateAction<Approval[]>>;
  allApprovals: Approval[];

  // CRUD Functions — Projects
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openEditProject: (p: Project) => void;
  updateProjectProgress: (val: number) => Promise<void>;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => Promise<void>;

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
  uploadFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  deleteFile: (file: ProjectFile) => Promise<void>;

  // CRUD Functions — Work Phases
  initDefaultPhases: () => Promise<void>;
  updatePhaseStatus: (phaseId: string, status: string) => Promise<void>;

  // CRUD Functions — Approvals
  createApproval: (data?: { type?: string; projectId?: string; amount?: number; title?: string; description?: string }) => Promise<void>;
  saveApproval: () => Promise<void>;
  approveApproval: (id: string, comments?: string) => Promise<void>;
  rejectApproval: (id: string, comments?: string) => Promise<void>;
  updateApproval: (id: string, status: string) => Promise<void>;
  deleteApproval: (id: string) => Promise<void>;

  // CRUD Functions — User
  updateUserName: (newName: string) => Promise<void>;

  // Helper functions
  fileToBase64: (file: File) => Promise<string>;

  // Computed values
  currentProject: Project | undefined;
  pendingCount: number;
  pendingApprovals: Approval[];
  activeTasks: Task[];
  completedTasks: Task[];
  overdueTasks: Task[];
  urgentTasks: Task[];
  projectExpenses: Expense[];
  projectTasks: Task[];
  projectBudget: number;
  projectSpent: number;
  // Gantt helpers (project-detail specific)
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
  const [allApprovals, setAllApprovals] = useState<Approval[]>([]);

  // ===== EFFECTS =====

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
    const unsubs: (() => void)[] = [];
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

  // Load approvals (per-project)
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setApprovals(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando approvals:', err); });
    return () => { unsub(); setApprovals([]); };
  }, [ready, selectedProjectId]);

  // Load ALL approvals (top-level listener for admin/dashboard)
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collectionGroup('approvals').orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setAllApprovals(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando allApprovals:', err); });
    return () => { unsub(); setAllApprovals([]); };
  }, [ready, authUser]);

  // AI project context
  const currentProject = useMemo(() => projects.find((p: Project) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectTasks = useMemo(() => tasks.filter((t: Task) => t.data.projectId === selectedProjectId), [tasks, selectedProjectId]);
  const projectExpenses = useMemo(() => expenses.filter((e: Expense) => e.data.projectId === selectedProjectId), [expenses, selectedProjectId]);
  const projectBudget = useMemo(() => currentProject?.data.budget || 0, [currentProject]);
  const projectSpent = useMemo(() => projectExpenses.reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0), [projectExpenses]);

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
        projectTasks.length > 0 ? `Tareas: ${projectTasks.length} (${projectTasks.filter((t: Task) => t.data.status === 'Completado').length} completadas)` : '',
        projectExpenses.length > 0 ? `Gastos registrados: ${fmtCOP(projectSpent)} de ${fmtCOP(projectBudget)}` : '',
      ].filter(Boolean).join('\n');
      useUIStore.getState().setAIProjectContext(ctx);
    } else {
      useUIStore.getState().setAIProjectContext('');
    }
  }, [currentProject, projectTasks.length, projectSpent, projectBudget]);

  // ===== CRUD FUNCTIONS =====

  const fileToBase64 = useCallback((file: File): Promise<string> => {
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
      if (editingId) {
        const existing = projects.find((p: Project) => p.id === editingId);
        await db.collection('projects').doc(editingId).update(data); showToast('Proyecto actualizado');
        // Audit: update
        if (existing) {
          const changes = extractChanges('project' as AuditEntityType, existing.data, data);
          logAudit('update', 'project' as AuditEntityType, editingId, name, changes, editingId, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        }
      }
      else {
        const ref = await db.collection('projects').add({ ...data, createdAt: ts, createdBy: authUser?.uid, progress: 0 });
        showToast('Proyecto creado');
        // Audit: create
        logAudit('create', 'project' as AuditEntityType, ref.id, name, undefined, ref.id, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        if (msConnected && msAccessToken) {
          ensureProjectFolder(name).then(folderId => {
            if (!folderId) console.warn('[ArchiFlow] No se pudo crear carpeta OneDrive para:', name);
          });
        }
        // Create template tasks + phases if template selected
        const tplId = forms.projTemplate;
        if (tplId) {
          const tpl = findTemplateById(tplId);
          if (tpl) {
            const flatTasks = flattenTemplateTasks(tpl);
            if (flatTasks.length > 0) {
              const batch = db.batch();
              // Create tasks with phase association
              flatTasks.forEach(({ phase, task, order }) => {
                batch.set(db.collection('tasks').doc(), {
                  projectId: ref.id, title: task, status: 'Por hacer', priority: 'Media',
                  assigneeId: '', dueDate: '', description: '', progress: 0, phase: phase || '',
                  createdAt: ts, updatedAt: ts, createdBy: authUser?.uid, order,
                });
              });
              // Create work phases
              if (tpl.phasesData?.length) {
                tpl.phasesData.forEach((phaseData, idx: number) => {
                  batch.set(db.collection('workPhases').doc(), {
                    projectId: ref.id, name: phaseData.name, status: 'Pendiente', order: idx,
                    startDate: '', endDate: '', description: '',
                    createdAt: ts, updatedAt: ts,
                  });
                });
              } else if (tpl.phases?.length) {
                tpl.phases.forEach((phaseName: string, idx: number) => {
                  batch.set(db.collection('workPhases').doc(), {
                    projectId: ref.id, name: phaseName, status: 'Pendiente', order: idx,
                    startDate: '', endDate: '', description: '',
                    createdAt: ts, updatedAt: ts,
                  });
                });
              }
              await batch.commit();
            }
          }
        }
      }
      closeModal('project'); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto', projCompany: '', projTemplate: '' }));
    } catch (err) { console.error('[ArchiFlow] Firestore: save project failed:', err); showToast('Error al guardar', 'error'); }
  }, [editingId, forms, authUser, projects, msConnected, msAccessToken, showToast, closeModal, setForms]);

  const deleteProject = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar proyecto', description: '¿Eliminar este proyecto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try {
    const existing = projects.find((p: Project) => p.id === id);
    const projName = existing?.data?.name || 'Proyecto';
    await getFirebase().firestore().collection('projects').doc(id).delete(); showToast('Eliminado');
    // Audit: delete
    logAudit('delete', 'project' as AuditEntityType, id, projName, undefined, id, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
  } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); } }, [confirm, showToast, projects, authUser]);

  const duplicateProject = useCallback(async (id: string) => {
    const source = projects.find((p: Project) => p.id === id);
    if (!source) return;
    const src = source.data;
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const newName = `${src.name} (Copia)`;
      const ref = await db.collection('projects').add({
        name: newName, status: 'Concepto', client: src.client || '', location: src.location || '',
        budget: 0, description: src.description || '', startDate: '', endDate: '',
        companyId: src.companyId || '', progress: 0,
        createdAt: ts, createdBy: authUser?.uid, updatedAt: ts, updatedBy: authUser?.uid,
      });
      // Copy tasks (without completion data)
      const srcTasks = tasks.filter((t: Task) => t.data.projectId === id);
      if (srcTasks.length > 0) {
        const batch = db.batch();
        srcTasks.forEach((t: Task) => {
          const { createdAt: _ca, updatedAt: _ua, ...taskData } = t.data;
          batch.set(db.collection('tasks').doc(), { ...taskData, projectId: ref.id, status: 'Pendiente', progress: 0, completedAt: null, createdAt: ts, updatedAt: ts });
        });
        await batch.commit();
      }
      showToast(`Proyecto duplicado: ${newName}`);
      logAudit('create', 'project' as AuditEntityType, ref.id, newName, undefined, ref.id, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
    } catch (err: unknown) { console.error('[ArchiFlow]', err); showToast('Error al duplicar', 'error'); }
  }, [projects, tasks, authUser, showToast]);

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
    const data: Record<string, any> = { title, description: forms.taskDescription || '', projectId: forms.taskProject || '', assigneeId: assignees[0] || '', assigneeIds: assignees, priority: forms.taskPriority || 'Media', status: forms.taskStatus || 'Por hacer', dueDate: forms.taskDue || '', subtasks, updatedAt: ts, updatedBy: authUser?.uid };
    try {
      if (editingId) {
        const existing = tasks.find((t: Task) => t.id === editingId);
        await db.collection('tasks').doc(editingId).update(data); showToast('Tarea actualizada');
        // Audit: update
        if (existing) {
          const changes = extractChanges('task' as AuditEntityType, existing.data, data);
          logAudit('update', 'task' as AuditEntityType, editingId, title, changes, data.projectId || undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        }
      }
      else {
        const ref = await db.collection('tasks').add({ ...data, createdAt: ts, createdBy: authUser?.uid });
        showToast('Tarea creada');
        // Audit: create
        logAudit('create', 'task' as AuditEntityType, ref.id, title, undefined, data.projectId || undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        if (assignees.length > 0 && forms.taskProject) {
          const proj = projects.find((p: Project) => p.id === forms.taskProject);
          const projName = proj?.data?.name || 'Proyecto';
          assignees.forEach((uid: string) => { notifyWhatsApp.taskAssigned(uid, title, projName, forms.taskPriority || 'Media', forms.taskDue || undefined).catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp taskAssigned notification failed:', err)); });
        }
      }
      closeModal('task'); setEditingId(null); setForms((p: Record<string, any>) => ({ ...p, taskTitle: '', taskProject: '', taskAssignees: [], taskAssignee: '', taskPriority: 'Media', taskStatus: 'Por hacer', taskDue: new Date().toISOString().split('T')[0], taskSubtasks: [] }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [editingId, forms, authUser, projects, tasks, showToast, closeModal, setEditingId, setForms]);

  const openEditTask = useCallback((t: Task) => {
    setEditingId(t.id);
    const assignees: string[] = Array.isArray(t.data.assigneeIds) ? t.data.assigneeIds : (t.data.assigneeId ? [t.data.assigneeId] : []);
    const subtasks: Subtask[] = Array.isArray(t.data.subtasks) ? t.data.subtasks : [];
    setForms((f: Record<string, any>) => ({ ...f, taskTitle: t.data.title, taskDescription: t.data.description || '', taskProject: t.data.projectId || '', taskAssignees: assignees, taskAssignee: t.data.assigneeId || '', taskPriority: t.data.priority || 'Media', taskStatus: t.data.status || 'Por hacer', taskDue: t.data.dueDate || '', taskSubtasks: subtasks }));
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

  const deleteTask = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar tarea', description: '¿Eliminar tarea?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try {
    const existing = tasks.find((t: Task) => t.id === id);
    const taskName = existing?.data?.title || 'Tarea';
    await getFirebase().firestore().collection('tasks').doc(id).delete(); showToast('Eliminada');
    // Audit: delete
    logAudit('delete', 'task' as AuditEntityType, id, taskName, undefined, existing?.data?.projectId || undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
  } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm, tasks, authUser]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find((t: Task) => t.id === taskId);
      if (!task) return;
      const subtasks: Subtask[] = Array.isArray(task.data.subtasks) ? task.data.subtasks : [];
      const updated = subtasks.map((s: Subtask) => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
      await getFirebase().firestore().collection('tasks').doc(taskId).update({ subtasks: updated, updatedAt: serverTimestamp() });
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [tasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find((t: Task) => t.id === taskId);
      if (!task) return;
      const subtasks: Subtask[] = Array.isArray(task.data.subtasks) ? task.data.subtasks : [];
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
      const ref = await db.collection('expenses').add(data);
      showToast('Gasto registrado');
      // Audit: create (expenses are only created, not updated in this flow)
      logAudit('create', 'expense' as AuditEntityType, ref.id, concept, undefined, data.projectId || undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
      closeModal('expense'); setForms(p => ({ ...p, expConcept: '', expAmount: '', expDate: new Date().toISOString().split('T')[0] }));
      if (forms.expProject) {
        const proj = projects.find(p => p.id === forms.expProject);
        const projName = proj?.data.name || 'Proyecto';
        notifyWhatsApp.expenseCreated(authUser?.uid || '', concept, amount, projName, forms.expCategory || undefined).catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp expenseCreated notification failed:', err));
      }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [forms, authUser, projects, showToast, closeModal, setForms]);

  const deleteExpense = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar gasto', description: '¿Eliminar gasto?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try {
    const existing = expenses.find(e => e.id === id);
    const expName = existing?.data?.concept || 'Gasto';
    await getFirebase().firestore().collection('expenses').doc(id).delete(); showToast('Eliminado');
    // Audit: delete
    logAudit('delete', 'expense' as AuditEntityType, id, expName, undefined, existing?.data?.projectId || undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
  } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm, showToast, expenses, authUser]);

  // --- Suppliers ---
  const saveSupplier = useCallback(async () => {
    const name = forms.supName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    const db = getFirebase().firestore();
    const data = { name, category: forms.supCategory || 'Otro', phone: forms.supPhone || '', email: forms.supEmail || '', address: forms.supAddress || '', website: forms.supWebsite || '', notes: forms.supNotes || '', rating: Number(forms.supRating) || 5, createdAt: serverTimestamp(), createdBy: authUser?.uid };
    try {
      if (editingId) {
        const existing = suppliers.find(s => s.id === editingId);
        await db.collection('suppliers').doc(editingId).update(data); showToast('Proveedor actualizado');
        // Audit: update
        if (existing) {
          const changes = extractChanges('supplier' as AuditEntityType, existing.data, data);
          logAudit('update', 'supplier' as AuditEntityType, editingId, name, changes, undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        }
      }
      else {
        const ref = await db.collection('suppliers').add(data); showToast('Proveedor creado');
        // Audit: create
        logAudit('create', 'supplier' as AuditEntityType, ref.id, name, undefined, undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
      }
      closeModal('supplier'); setForms(p => ({ ...p, supName: '', supCategory: '', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [editingId, forms, showToast, closeModal, setForms, suppliers, authUser]);

  const deleteSupplier = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar proveedor', description: '¿Eliminar proveedor?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try {
    const existing = suppliers.find(s => s.id === id);
    const supName = existing?.data?.name || 'Proveedor';
    await getFirebase().firestore().collection('suppliers').doc(id).delete(); showToast('Eliminado');
    // Audit: delete
    logAudit('delete', 'supplier' as AuditEntityType, id, supName, undefined, undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
  } catch (err) { console.error("[ArchiFlow]", err); } }, [confirm, suppliers, authUser]);

  // --- Companies ---
  const saveCompany = useCallback(async () => {
    const name = forms.compName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const data = { name, nit: forms.compNit || '', legalName: forms.compLegal || '', address: forms.compAddress || '', phone: forms.compPhone || '', email: forms.compEmail || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: authUser?.uid };
      if (editingId) {
        const existing = companies.find(c => c.id === editingId);
        await db.collection('companies').doc(editingId).update(data); showToast('Empresa actualizada');
        // Audit: update
        if (existing) {
          const changes = extractChanges('company' as AuditEntityType, existing.data, data);
          logAudit('update', 'company' as AuditEntityType, editingId, name, changes, undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
        }
      }
      else {
        const ref = await db.collection('companies').add(data); showToast('Empresa creada');
        // Audit: create
        logAudit('create', 'company' as AuditEntityType, ref.id, name, undefined, undefined, authUser?.uid, authUser?.displayName || authUser?.email || 'Usuario');
      }
      closeModal('company'); setEditingId(null);
    } catch (err) { console.error('[ArchiFlow] Firestore: save company failed:', err); showToast('Error al guardar', 'error'); }
  }, [editingId, forms, showToast, closeModal, setEditingId, companies, authUser]);

  // --- Files ---
  const uploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file || !selectedProjectId) return;
    if (file.size > 10 * 1024 * 1024) { showToast('El archivo no puede superar 10 MB', 'error'); return; }
    showToast('Subiendo archivo...');
    try {
      const base64 = await fileToBase64(file);
      const db = getFirebase().firestore();
      await db.collection('projects').doc(selectedProjectId).collection('files').add({ name: file.name, type: file.type, size: file.size, data: base64, createdAt: serverTimestamp(), uploadedBy: authUser?.uid });
      showToast('Archivo subido');
    } catch (err: unknown) { console.error('[ArchiFlow] Firestore: upload file failed:', err); showToast('Error al subir: ' + (err instanceof Error ? err.message : ''), 'error'); }
    e.target.value = '';
  }, [selectedProjectId, authUser, showToast, fileToBase64]);

  const deleteFile = useCallback(async (file: ProjectFile) => {
    if (!(await confirm({ title: 'Eliminar archivo', description: '¿Eliminar archivo?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId!).collection('files').doc(file.id).delete(); showToast('Archivo eliminado'); } catch (err) { console.error('[ArchiFlow] Firestore: delete file failed:', err); showToast('Error al eliminar', 'error'); }
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
  const createApproval = useCallback(async (data?: { type?: string; projectId?: string; amount?: number; title?: string; description?: string }) => {
    const targetProjectId = data?.projectId || selectedProjectId;
    if (!targetProjectId) { showToast('Selecciona un proyecto primero', 'error'); return; }
    const title = data?.title || forms.appTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    const appType = data?.type || forms.appType || 'general';
    const proj = projects.find(p => p.id === targetProjectId);
    try {
      const ts = serverTimestamp();
      await getFirebase().firestore().collection('projects').doc(targetProjectId).collection('approvals').add({
        title,
        description: data?.description || forms.appDesc || '',
        status: 'Pendiente',
        type: appType,
        requestedBy: authUser?.uid || '',
        requestedByName: authUser?.displayName || authUser?.email || 'Usuario',
        projectId: targetProjectId,
        projectName: proj?.data?.name || 'Proyecto',
        amount: data?.amount || (Number(forms.appAmount) || undefined),
        createdAt: ts,
        createdBy: authUser?.uid || '',
        updatedAt: ts,
      });
      showToast('Solicitud de aprobación creada');
      closeModal('approval');
      setForms(p => ({ ...p, appTitle: '', appDesc: '', appType: 'general', appAmount: '', appProject: '' }));
      const projName = proj?.data?.name || 'Proyecto';
      notifyWhatsApp.approvalPending(authUser?.uid || '', title, projName, authUser?.displayName || authUser?.email || 'Usuario').catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp approvalPending notification failed:', err));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al crear aprobación', 'error'); }
  }, [forms, selectedProjectId, projects, authUser, showToast, closeModal, setForms]);

  const saveApproval = useCallback(async () => {
    await createApproval();
  }, [createApproval]);

  const approveApproval = useCallback(async (id: string, comments?: string) => {
    try {
      const approval = allApprovals.find(a => a.id === id) || approvals.find(a => a.id === id);
      const projectId = approval?.data?.projectId || selectedProjectId;
      if (!projectId) return;
      const ts = serverTimestamp();
      const updateData: Record<string, any> = { status: 'Aprobada', reviewedBy: authUser?.uid || '', reviewedByName: authUser?.displayName || authUser?.email || 'Admin', reviewedAt: ts, updatedAt: ts };
      if (comments) updateData.comments = comments;
      await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(id).update(updateData);
      showToast('✅ Aprobación aceptada');
      const projName = approval?.data?.projectName || currentProject?.data?.name || 'Proyecto';
      if (approval?.data?.requestedBy) {
        notifyWhatsApp.approvalResolved(approval?.data?.requestedBy, approval?.data?.title, 'Aprobada', authUser?.displayName || undefined).catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp approvalResolved (Aprobada) notification failed:', err));
      }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [allApprovals, approvals, selectedProjectId, currentProject, authUser, showToast]);

  const rejectApproval = useCallback(async (id: string, comments?: string) => {
    try {
      const approval = allApprovals.find(a => a.id === id) || approvals.find(a => a.id === id);
      const projectId = approval?.data?.projectId || selectedProjectId;
      if (!projectId) return;
      const ts = serverTimestamp();
      const updateData: Record<string, any> = { status: 'Rechazada', reviewedBy: authUser?.uid || '', reviewedByName: authUser?.displayName || authUser?.email || 'Admin', reviewedAt: ts, updatedAt: ts };
      if (comments) updateData.comments = comments;
      await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(id).update(updateData);
      showToast('❌ Aprobación rechazada');
      if (approval?.data?.requestedBy) {
        notifyWhatsApp.approvalResolved(approval?.data?.requestedBy, approval?.data?.title, 'Rechazada', authUser?.displayName || undefined).catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp approvalResolved (Rechazada) notification failed:', err));
      }
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  }, [allApprovals, approvals, selectedProjectId, authUser, showToast]);

  const updateApproval = useCallback(async (id: string, status: string) => {
    try {
      const approval = allApprovals.find(a => a.id === id) || approvals.find(a => a.id === id);
      const projectId = approval?.data?.projectId || selectedProjectId;
      if (!projectId) return;
      await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(id).update({ status, updatedAt: serverTimestamp() });
      showToast('Estado actualizado');
      const projName = approval?.data?.projectName || currentProject?.data?.name || 'Proyecto';
      if (approval?.data?.requestedBy) {
        notifyWhatsApp.approvalResolved(approval?.data?.requestedBy, approval?.data?.title, status, authUser?.displayName || undefined).catch(err => console.warn('[ArchiFlow] Firestore: WhatsApp approvalResolved notification failed:', err));
      }
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [allApprovals, approvals, selectedProjectId, currentProject, authUser, showToast]);

  const deleteApproval = useCallback(async (id: string) => { if (!(await confirm({ title: 'Eliminar aprobación', description: '¿Eliminar aprobación?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try {
    const approval = allApprovals.find(a => a.id === id) || approvals.find(a => a.id === id);
    const projectId = approval?.data?.projectId || selectedProjectId;
    if (!projectId) return;
    await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(id).delete(); showToast('Eliminada');
  } catch (err) { console.error('[ArchiFlow]', err); } }, [confirm, allApprovals, approvals, selectedProjectId]);

  // ===== COMPUTED VALUES =====
  const pendingApprovals = useMemo(() => allApprovals.filter(a => a.data?.status === 'Pendiente'), [allApprovals]);
  const activeTasks = useMemo(() => tasks.filter(t => t.data?.status !== 'Completado'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.data?.status === 'Completado'), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter(t => t.data?.dueDate && new Date(t.data.dueDate) < new Date(new Date().toDateString())), [activeTasks]);
  const urgentTasks = useMemo(() => activeTasks.filter(t => t.data?.priority === 'Alta'), [activeTasks]);
  const pendingCount = useMemo(() => tasks.filter(t => t.data?.status !== 'Completado').length, [tasks]);

  // ===== GANTT HELPERS (project-detail specific, re-exported from @/lib/gantt-helpers) =====

  const value: FirestoreContextType = useMemo(() => ({
    // Collection state
    projects, setProjects, tasks, setTasks, expenses, setExpenses,
    suppliers, setSuppliers, companies, setCompanies,
    workPhases, setWorkPhases, projectFiles, setProjectFiles,
    approvals, setApprovals, allApprovals,
    // CRUD
    saveProject, deleteProject, duplicateProject, openEditProject, updateProjectProgress, openProject,
    saveTask, openEditTask, toggleTask, changeTaskStatus, deleteTask, toggleSubtask, deleteSubtask,
    saveExpense, deleteExpense,
    saveSupplier, deleteSupplier,
    saveCompany,
    uploadFile, deleteFile,
    initDefaultPhases, updatePhaseStatus,
    createApproval, saveApproval, approveApproval, rejectApproval, updateApproval, deleteApproval,
    updateUserName, fileToBase64,
    // Computed
    currentProject, pendingCount, pendingApprovals, activeTasks, completedTasks, overdueTasks, urgentTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
    // Gantt (project-detail specific, re-exported from @/lib/gantt-helpers)
    calcGanttDays: _gantt.calcGanttDays, calcGanttOffset: _gantt.calcGanttOffset,
  }), [
    // Collection state
    projects, tasks, expenses, suppliers, companies, workPhases, projectFiles, approvals, allApprovals,
    // CRUD functions
    saveProject, deleteProject, duplicateProject, openEditProject, updateProjectProgress, openProject,
    saveTask, openEditTask, toggleTask, changeTaskStatus, deleteTask, toggleSubtask, deleteSubtask,
    saveExpense, deleteExpense, saveSupplier, deleteSupplier, saveCompany,
    uploadFile, deleteFile, initDefaultPhases, updatePhaseStatus,
    createApproval, saveApproval, approveApproval, rejectApproval, updateApproval, deleteApproval, updateUserName, fileToBase64,
    // Computed values
    currentProject, pendingCount, pendingApprovals, activeTasks, completedTasks, overdueTasks, urgentTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
  ]);

  return <FirestoreContext.Provider value={value}>{children}</FirestoreContext.Provider>;
}

export function useFirestoreContext() {
  const ctx = useContext(FirestoreContext);
  if (!ctx) throw new Error('useFirestoreContext must be used within FirestoreProvider');
  return ctx;
}
