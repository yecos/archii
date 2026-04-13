/**
 * useFirestoreData.ts
 * Hook centralizado para TODOS los listeners de Firestore en tiempo real.
 * Reemplaza los 15 useEffect de carga de datos en page.tsx.
 * Usa getFirebase() en vez de (window as any).firebase.
 */

import { useEffect, useState } from 'react';
import { getFirebase } from '@/lib/firebase-service';
import type { TeamUser, Project, Task, Expense, Supplier, Approval, WorkPhase, ProjectFile, InvProduct, InvCategory, InvMovement, InvTransfer, GalleryPhoto } from '@/lib/types';

interface FirestoreDataState {
  ready: boolean;
  setReady: (v: boolean) => void;
  teamUsers: TeamUser[];
  projects: Project[];
  tasks: Task[];
  expenses: Expense[];
  suppliers: Supplier[];
  companies: any[];
  messages: any[];
  workPhases: WorkPhase[];
  projectFiles: ProjectFile[];
  approvals: Approval[];
  meetings: any[];
  galleryPhotos: GalleryPhoto[];
  invProducts: InvProduct[];
  invCategories: InvCategory[];
  invMovements: InvMovement[];
  invTransfers: InvTransfer[];
}

export function useFirestoreData(
  authUser: any,
  chatProjectId: string | null,
  selectedProjectId: string | null,
): FirestoreDataState {
  const [ready, setReady] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [workPhases, setWorkPhases] = useState<WorkPhase[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);
  const [invCategories, setInvCategories] = useState<InvCategory[]>([]);
  const [invMovements, setInvMovements] = useState<InvMovement[]>([]);
  const [invTransfers, setInvTransfers] = useState<InvTransfer[]>([]);

  /* ===== Poll for Firebase readiness ===== */
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const fb = getFirebase();
        if (fb && fb.apps && fb.apps.length > 0) {
          clearInterval(iv);
          setReady(true);
        }
      } catch {
        // Firebase not loaded yet, keep waiting
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  /* ===== Auth state listener ===== */
  useEffect(() => {
    if (!ready) return;
    try {
      const fb = getFirebase();
      const auth = fb.auth();
      const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
        // Auth state is handled by parent via setAuthUser
        if (user) {
          try {
            const db = fb.firestore();
            const ref = db.collection('users').doc(user.uid);
            const snap = await ref.get();
            // Ensure user document exists
            const ADMIN_EMAILS = ['yecos11@gmail.com'];
            const isAdminEmail = ADMIN_EMAILS.includes(user.email);
            if (!snap.exists) {
              await ref.set({
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL || '',
                role: isAdminEmail ? 'Admin' : 'Miembro',
                createdAt: fb.firestore.FieldValue.serverTimestamp(),
              });
            } else if (isAdminEmail) {
              const current = snap.data()?.role;
              if (current !== 'Admin') {
                await ref.update({ role: 'Admin' });
              }
            }
          } catch (err) {
            console.error('[ArchiFlow] Error syncing user profile:', err);
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up auth listener:', err);
    }
  }, [ready]);

  /* ===== Global data listeners (need auth) ===== */

  // Team users
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('users').onSnapshot(
        snap => setTeamUsers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Team listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up team listener:', err);
    }
  }, [ready, authUser]);

  // Projects
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('projects').orderBy('createdAt', 'desc').onSnapshot(
        snap => setProjects(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Projects listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up projects listener:', err);
    }
  }, [ready, authUser]);

  // Tasks
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(
        snap => setTasks(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Tasks listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up tasks listener:', err);
    }
  }, [ready, authUser]);

  // Expenses
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot(
        snap => setExpenses(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Expenses listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up expenses listener:', err);
    }
  }, [ready, authUser]);

  // Suppliers + Companies (combined for efficiency)
  useEffect(() => {
    if (!ready || !authUser) return;
    const unsubs: (() => void)[] = [];
    try {
      const db = getFirebase().firestore();
      unsubs.push(db.collection('suppliers').orderBy('createdAt', 'desc').onSnapshot(
        snap => setSuppliers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Suppliers listener error:', err),
      ));
      unsubs.push(db.collection('companies').orderBy('createdAt', 'desc').onSnapshot(
        snap => setCompanies(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Companies listener error:', err),
      ));
    } catch (err) {
      console.error('[ArchiFlow] Error setting up suppliers/companies listener:', err);
    }
    return () => unsubs.forEach(u => u());
  }, [ready, authUser]);

  // Meetings
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot(
        snap => setMeetings(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Meetings listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up meetings listener:', err);
    }
  }, [ready, authUser]);

  // Gallery photos
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('galleryPhotos').orderBy('createdAt', 'desc').onSnapshot(
        snap => setGalleryPhotos(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Gallery listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up gallery listener:', err);
    }
  }, [ready, authUser]);

  // Inventory products
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('invProducts').orderBy('createdAt', 'desc').onSnapshot(
        snap => setInvProducts(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Inventory products listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up inv products listener:', err);
    }
  }, [ready, authUser]);

  // Inventory categories
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('invCategories').orderBy('name', 'asc').onSnapshot(
        snap => setInvCategories(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Inv categories listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up inv categories listener:', err);
    }
  }, [ready, authUser]);

  // Inventory movements
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('invMovements').orderBy('createdAt', 'desc').limit(100).onSnapshot(
        snap => setInvMovements(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Inv movements listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up inv movements listener:', err);
    }
  }, [ready, authUser]);

  // Inventory transfers
  useEffect(() => {
    if (!ready || !authUser) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('invTransfers').orderBy('createdAt', 'desc').limit(100).onSnapshot(
        snap => setInvTransfers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Inv transfers listener error:', err),
      );
      return () => unsub();
    } catch (err) {
      console.error('[ArchiFlow] Error setting up inv transfers listener:', err);
    }
  }, [ready, authUser]);

  /* ===== Project-scoped listeners ===== */

  // Chat messages
  useEffect(() => {
    if (!ready || !chatProjectId) return;
    try {
      const db = getFirebase().firestore();
      let unsub: any;
      if (chatProjectId === '__general__') {
        unsub = db.collection('generalMessages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(
          snap => setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
          err => console.error('[ArchiFlow] Chat listener error:', err),
        );
      } else {
        unsub = db.collection('projects').doc(chatProjectId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(
          snap => setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
          err => console.error('[ArchiFlow] Chat listener error:', err),
        );
      }
      return () => { unsub(); setMessages([]); };
    } catch (err) {
      console.error('[ArchiFlow] Error setting up chat listener:', err);
    }
  }, [ready, chatProjectId]);

  // Work phases
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('projects').doc(selectedProjectId).collection('workPhases').orderBy('order', 'asc').onSnapshot(
        snap => setWorkPhases(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Work phases listener error:', err),
      );
      return () => { unsub(); setWorkPhases([]); };
    } catch (err) {
      console.error('[ArchiFlow] Error setting up work phases listener:', err);
    }
  }, [ready, selectedProjectId]);

  // Project files
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('projects').doc(selectedProjectId).collection('files').orderBy('createdAt', 'desc').onSnapshot(
        snap => setProjectFiles(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
        err => console.error('[ArchiFlow] Project files listener error:', err),
      );
      return () => { unsub(); setProjectFiles([]); };
    } catch (err) {
      console.error('[ArchiFlow] Error setting up project files listener:', err);
    }
  }, [ready, selectedProjectId]);

  // Approvals
  useEffect(() => {
    if (!ready || !selectedProjectId) return;
    try {
      const db = getFirebase().firestore();
      const unsub = db.collection('projects').doc(selectedProjectId).collection('approvals').orderBy('createdAt', 'desc').onSnapshot(
        snap => setApprovals(snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))),
        err => console.error('[ArchiFlow] Approvals listener error:', err),
      );
      return () => { unsub(); setApprovals([]); };
    } catch (err) {
      console.error('[ArchiFlow] Error setting up approvals listener:', err);
    }
  }, [ready, selectedProjectId]);

  return {
    ready, setReady,
    teamUsers, projects, tasks, expenses, suppliers, companies,
    messages, workPhases, projectFiles, approvals, meetings,
    galleryPhotos, invProducts, invCategories, invMovements, invTransfers,
  };
}
