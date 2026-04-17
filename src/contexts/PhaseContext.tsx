'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFirebase, serverTimestamp } from '@/lib/firebase-service';
import { useAuthContext } from './AuthContext';
import { useTenantContext } from './TenantContext';
import { useUIContext } from './UIContext';
import type { ProjectPhase, ProcessNode } from '@/lib/types';
import {
  getDefaultPhases,
  addProcessNode,
  removeProcessNode,
  updateProcessNode,
  getLeafNodes,
  generateProcessId,
} from '@/lib/phase-service';

/* ===== PHASE CONTEXT ===== */
interface PhaseContextType {
  phases: ProjectPhase[];
  loading: boolean;
  // CRUD
  initDefaultPhases: (projectId: string) => Promise<void>;
  addProcess: (projectId: string, phaseId: string, name: string, parentId?: string | null) => Promise<void>;
  removeProcess: (projectId: string, phaseId: string, processId: string) => Promise<void>;
  renameProcess: (projectId: string, phaseId: string, processId: string, name: string) => Promise<void>;
  addPhase: (projectId: string, name: string, type: 'diseño' | 'ejecución' | 'custom') => Promise<void>;
  removePhase: (projectId: string, phaseId: string) => Promise<void>;
  renamePhase: (projectId: string, phaseId: string, name: string) => Promise<void>;
  // Helpers
  getPhase: (projectId: string, type: 'diseño' | 'ejecución') => ProjectPhase | undefined;
  getPhaseProcesses: (projectId: string, type: 'diseño' | 'ejecución') => ProcessNode[];
  getLeafProcesses: (projectId: string, type: 'diseño' | 'ejecución') => ProcessNode[];
}

const PhaseContext = createContext<PhaseContextType | null>(null);

export default function PhaseProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuthContext();
  const { currentTenantId } = useTenantContext();
  const { showToast } = useUIContext();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(false);

  /* Refs to track listeners across renders */
  const projectIdsRef = useRef<Set<string>>(new Set());
  const phaseUnsubsRef = useRef<Record<string, () => void>>({});

  // ===== Helper: set up a real-time listener on a project's phases subcollection =====
  const setupPhaseListener = useCallback((projectId: string) => {
    // Don't set up duplicate listeners
    if (phaseUnsubsRef.current[projectId]) return;

    const db = getFirebase().firestore();
    const unsub = db
      .collection('projects')
      .doc(projectId)
      .collection('phases')
      .onSnapshot(
        (phaseSnap) => {
          const projectPhases: ProjectPhase[] = phaseSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              data: {
                name: (data.name as string) || 'Sin nombre',
                type: (data.type as ProjectPhase['data']['type']) || 'custom',
                order: (data.order as number) || 0,
                processes: (data.processes as ProcessNode[]) || [],
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null,
              },
              _projectId: projectId,
            } as any;
          });

          setPhases((prev) => {
            const other = prev.filter((p: any) => p._projectId !== projectId);
            return [...other, ...projectPhases].sort((a, b) => a.data.order - b.data.order);
          });
          setLoading(false);
        },
        (err) => {
          console.error(`[Phase] Listener error for project ${projectId}:`, err);
          setLoading(false);
        },
      );

    phaseUnsubsRef.current[projectId] = unsub;
  }, []);

  // ===== Main effect: listen to projects → set up phase subcollection listeners =====
  useEffect(() => {
    if (!authUser || !currentTenantId) {
      setPhases([]);
      setLoading(false);
      // Clean up all phase listeners
      Object.values(phaseUnsubsRef.current).forEach((fn) => fn());
      phaseUnsubsRef.current = {};
      projectIdsRef.current.clear();
      return;
    }

    setLoading(true);
    const db = getFirebase().firestore();

    // Listen to projects to detect additions/deletions
    const unsub = db
      .collection('projects')
      .where('tenantId', '==', currentTenantId)
      .onSnapshot(
        (projectSnap) => {
          const currentIds = new Set(projectSnap.docs.map((d) => d.id));

          // Set up phase listeners for newly discovered projects
          projectSnap.docs.forEach((projDoc) => {
            if (!projectIdsRef.current.has(projDoc.id)) {
              projectIdsRef.current.add(projDoc.id);
              setupPhaseListener(projDoc.id);
            }
          });

          // Clean up phase listeners for deleted projects
          for (const id of projectIdsRef.current) {
            if (!currentIds.has(id)) {
              projectIdsRef.current.delete(id);
              if (phaseUnsubsRef.current[id]) {
                phaseUnsubsRef.current[id]();
                delete phaseUnsubsRef.current[id];
              }
              setPhases((prev) => prev.filter((p: any) => p._projectId !== id));
            }
          }

          // If no projects at all, stop loading
          if (projectSnap.empty) {
            setPhases([]);
            setLoading(false);
          }
        },
        (err) => {
          console.error('[Phase] Projects listener error:', err);
          setLoading(false);
        },
      );

    return () => {
      unsub();
      Object.values(phaseUnsubsRef.current).forEach((fn) => fn());
      phaseUnsubsRef.current = {};
      projectIdsRef.current.clear();
    };
  }, [authUser, currentTenantId, setupPhaseListener]);

  // ===== Helper: get phases for a project =====
  const getProjectPhases = useCallback(
    (projectId: string): ProjectPhase[] => {
      return phases.filter((p: any) => p._projectId === projectId);
    },
    [phases],
  );

  // ===== Init default phases =====
  const initDefaultPhases = useCallback(
    async (projectId: string) => {
      try {
        const db = getFirebase().firestore();
        const defaults = getDefaultPhases();
        const batch = db.batch();
        const phasesRef = db.collection('projects').doc(projectId).collection('phases');

        for (const phase of defaults) {
          const ref = phasesRef.doc();
          batch.set(ref, {
            ...phase,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
        // The real-time listener on the phases subcollection will automatically
        // update the local state — no manual refresh needed.
        showToast('Fases inicializadas');
      } catch (err) {
        console.error('[Phase] Init failed:', err);
        showToast('Error al inicializar fases', 'error');
      }
    },
    [showToast],
  );

  // ===== Update a single phase document =====
  const updatePhaseDoc = useCallback(async (projectId: string, phaseId: string, data: Record<string, unknown>) => {
    const db = getFirebase().firestore();
    await db.collection('projects').doc(projectId).collection('phases').doc(phaseId).update({
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ===== Add a process to a phase =====
  const addProcess = useCallback(
    async (projectId: string, phaseId: string, name: string, parentId: string | null = null) => {
      try {
        const projectPhases = getProjectPhases(projectId);
        const phase = projectPhases.find((p) => p.id === phaseId);
        if (!phase) throw new Error('Fase no encontrada');

        const newNode: ProcessNode = { id: generateProcessId(), name, children: [] };
        const updated = addProcessNode(phase.data.processes, parentId, newNode);

        await updatePhaseDoc(projectId, phaseId, { processes: updated });
      } catch (err) {
        console.error('[Phase] Add process failed:', err);
        showToast('Error al agregar proceso', 'error');
      }
    },
    [getProjectPhases, updatePhaseDoc, showToast],
  );

  // ===== Remove a process from a phase =====
  const removeProcess = useCallback(
    async (projectId: string, phaseId: string, processId: string) => {
      try {
        const projectPhases = getProjectPhases(projectId);
        const phase = projectPhases.find((p) => p.id === phaseId);
        if (!phase) throw new Error('Fase no encontrada');

        const updated = removeProcessNode(phase.data.processes, processId);
        await updatePhaseDoc(projectId, phaseId, { processes: updated });
      } catch (err) {
        console.error('[Phase] Remove process failed:', err);
        showToast('Error al eliminar proceso', 'error');
      }
    },
    [getProjectPhases, updatePhaseDoc, showToast],
  );

  // ===== Rename a process =====
  const renameProcess = useCallback(
    async (projectId: string, phaseId: string, processId: string, name: string) => {
      try {
        const projectPhases = getProjectPhases(projectId);
        const phase = projectPhases.find((p) => p.id === phaseId);
        if (!phase) throw new Error('Fase no encontrada');

        const updated = updateProcessNode(phase.data.processes, processId, name);
        await updatePhaseDoc(projectId, phaseId, { processes: updated });
      } catch (err) {
        console.error('[Phase] Rename process failed:', err);
        showToast('Error al renombrar proceso', 'error');
      }
    },
    [getProjectPhases, updatePhaseDoc, showToast],
  );

  // ===== Add a new phase =====
  const addPhase = useCallback(
    async (projectId: string, name: string, type: 'diseño' | 'ejecución' | 'custom') => {
      try {
        const db = getFirebase().firestore();
        const projectPhases = getProjectPhases(projectId);
        const maxOrder =
          projectPhases.length > 0 ? Math.max(...projectPhases.map((p) => p.data.order)) : -1;

        await db.collection('projects').doc(projectId).collection('phases').doc().set({
          name,
          type,
          order: maxOrder + 1,
          processes: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Fase agregada');
      } catch (err) {
        console.error('[Phase] Add phase failed:', err);
        showToast('Error al agregar fase', 'error');
      }
    },
    [getProjectPhases, showToast],
  );

  // ===== Remove a phase =====
  const removePhase = useCallback(
    async (projectId: string, phaseId: string) => {
      try {
        const db = getFirebase().firestore();
        await db.collection('projects').doc(projectId).collection('phases').doc(phaseId).delete();
        showToast('Fase eliminada');
      } catch (err) {
        console.error('[Phase] Remove phase failed:', err);
        showToast('Error al eliminar fase', 'error');
      }
    },
    [showToast],
  );

  // ===== Rename a phase =====
  const renamePhase = useCallback(
    async (projectId: string, phaseId: string, name: string) => {
      try {
        await updatePhaseDoc(projectId, phaseId, { name });
      } catch (err) {
        console.error('[Phase] Rename phase failed:', err);
        showToast('Error al renombrar fase', 'error');
      }
    },
    [updatePhaseDoc, showToast],
  );

  // ===== Get phase by type =====
  const getPhase = useCallback(
    (projectId: string, type: 'diseño' | 'ejecución'): ProjectPhase | undefined => {
      return getProjectPhases(projectId).find((p) => p.data.type === type);
    },
    [getProjectPhases],
  );

  // ===== Get all processes for a phase type =====
  const getPhaseProcesses = useCallback(
    (projectId: string, type: 'diseño' | 'ejecución'): ProcessNode[] => {
      return getPhase(projectId, type)?.data.processes || [];
    },
    [getPhase],
  );

  // ===== Get leaf processes (containers for tasks) =====
  const getLeafProcesses = useCallback(
    (projectId: string, type: 'diseño' | 'ejecución'): ProcessNode[] => {
      const processes = getPhaseProcesses(projectId, type);
      return getLeafNodes(processes);
    },
    [getPhaseProcesses],
  );

  const value: PhaseContextType = useMemo(
    () => ({
      phases,
      loading,
      initDefaultPhases,
      addProcess,
      removeProcess,
      renameProcess,
      addPhase,
      removePhase,
      renamePhase,
      getPhase,
      getPhaseProcesses,
      getLeafProcesses,
    }),
    [phases, loading, initDefaultPhases, addProcess, removeProcess, renameProcess, addPhase, removePhase, renamePhase, getPhase, getPhaseProcesses, getLeafProcesses],
  );

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
}

export function usePhaseContext() {
  const ctx = useContext(PhaseContext);
  if (!ctx) throw new Error('usePhaseContext must be used within PhaseProvider');
  return ctx;
}
