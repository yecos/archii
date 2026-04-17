'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getFirebase, serverTimestamp, snapToDocs, type QuerySnapshot } from '@/lib/firebase-service';
import { useAuthContext } from './AuthContext';
import { useTenantContext } from './TenantContext';
import { useUIContext } from './UIContext';
import type { ProjectPhase, ProcessNode } from '@/lib/types';
import {
  getDefaultPhases,
  addProcessNode,
  removeProcessNode,
  updateProcessNode,
  findProcessNode,
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

  // ===== Load phases for all projects (singleton listener) =====
  useEffect(() => {
    if (!authUser || !currentTenantId) {
      setPhases([]);
      return;
    }

    setLoading(true);
    const db = getFirebase().firestore();

    // Listen to all phases via the projects collection
    // Each project's phases are in projects/{id}/phases subcollection
    // We load them project by project since Firestore doesn't support
    // collection group queries for subcollections easily with the compat SDK
    const unsub = db.collection('projects')
      .where('tenantId', '==', currentTenantId)
      .onSnapshot(async (projectSnap: QuerySnapshot) => {
        try {
          const allPhases: ProjectPhase[] = [];
          const promises = projectSnap.docs.map(async (projDoc) => {
            const phaseSnap = await projDoc.ref.collection('phases').get();
            phaseSnap.forEach((phaseDoc) => {
              const data = phaseDoc.data();
              allPhases.push({
                id: phaseDoc.id,
                data: {
                  name: (data.name as string) || 'Sin nombre',
                  type: (data.type as ProjectPhase['data']['type']) || 'custom',
                  order: (data.order as number) || 0,
                  processes: (data.processes as ProcessNode[]) || [],
                  createdAt: data.createdAt || null,
                  updatedAt: data.updatedAt || null,
                },
                _projectId: projDoc.id, // internal reference
              } as any);
            });
          });
          await Promise.all(promises);
          allPhases.sort((a, b) => a.data.order - b.data.order);
          setPhases(allPhases);
          setLoading(false);
        } catch (err) {
          console.error('[Phase] Error loading phases:', err);
          setLoading(false);
        }
      }, (err) => {
        console.error('[Phase] Projects listener error:', err);
        setLoading(false);
      });

    return () => unsub();
  }, [authUser, currentTenantId]);

  // ===== Helper: get phases for a project =====
  const getProjectPhases = useCallback((projectId: string): ProjectPhase[] => {
    return phases.filter((p: any) => p._projectId === projectId);
  }, [phases]);

  // ===== Init default phases =====
  const initDefaultPhases = useCallback(async (projectId: string) => {
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
      showToast('Fases inicializadas');
    } catch (err) {
      console.error('[Phase] Init failed:', err);
      showToast('Error al inicializar fases', 'error');
    }
  }, [showToast]);

  // ===== Update a single phase document =====
  const updatePhaseDoc = useCallback(async (projectId: string, phaseId: string, data: Record<string, unknown>) => {
    const db = getFirebase().firestore();
    await db.collection('projects').doc(projectId).collection('phases').doc(phaseId).update({
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ===== Add a process to a phase =====
  const addProcess = useCallback(async (projectId: string, phaseId: string, name: string, parentId: string | null = null) => {
    try {
      const projectPhases = getProjectPhases(projectId);
      const phase = projectPhases.find(p => p.id === phaseId);
      if (!phase) throw new Error('Fase no encontrada');

      const newNode: ProcessNode = { id: generateProcessId(), name, children: [] };
      const updated = addProcessNode(phase.data.processes, parentId, newNode);

      await updatePhaseDoc(projectId, phaseId, { processes: updated });
    } catch (err) {
      console.error('[Phase] Add process failed:', err);
      showToast('Error al agregar proceso', 'error');
    }
  }, [getProjectPhases, updatePhaseDoc, showToast]);

  // ===== Remove a process from a phase =====
  const removeProcess = useCallback(async (projectId: string, phaseId: string, processId: string) => {
    try {
      const projectPhases = getProjectPhases(projectId);
      const phase = projectPhases.find(p => p.id === phaseId);
      if (!phase) throw new Error('Fase no encontrada');

      const updated = removeProcessNode(phase.data.processes, processId);
      await updatePhaseDoc(projectId, phaseId, { processes: updated });
    } catch (err) {
      console.error('[Phase] Remove process failed:', err);
      showToast('Error al eliminar proceso', 'error');
    }
  }, [getProjectPhases, updatePhaseDoc, showToast]);

  // ===== Rename a process =====
  const renameProcess = useCallback(async (projectId: string, phaseId: string, processId: string, name: string) => {
    try {
      const projectPhases = getProjectPhases(projectId);
      const phase = projectPhases.find(p => p.id === phaseId);
      if (!phase) throw new Error('Fase no encontrada');

      const updated = updateProcessNode(phase.data.processes, processId, name);
      await updatePhaseDoc(projectId, phaseId, { processes: updated });
    } catch (err) {
      console.error('[Phase] Rename process failed:', err);
      showToast('Error al renombrar proceso', 'error');
    }
  }, [getProjectPhases, updatePhaseDoc, showToast]);

  // ===== Add a new phase =====
  const addPhase = useCallback(async (projectId: string, name: string, type: 'diseño' | 'ejecución' | 'custom') => {
    try {
      const db = getFirebase().firestore();
      const projectPhases = getProjectPhases(projectId);
      const maxOrder = projectPhases.length > 0
        ? Math.max(...projectPhases.map(p => p.data.order))
        : -1;

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
  }, [getProjectPhases, showToast]);

  // ===== Remove a phase =====
  const removePhase = useCallback(async (projectId: string, phaseId: string) => {
    try {
      const db = getFirebase().firestore();
      await db.collection('projects').doc(projectId).collection('phases').doc(phaseId).delete();
      showToast('Fase eliminada');
    } catch (err) {
      console.error('[Phase] Remove phase failed:', err);
      showToast('Error al eliminar fase', 'error');
    }
  }, [showToast]);

  // ===== Rename a phase =====
  const renamePhase = useCallback(async (projectId: string, phaseId: string, name: string) => {
    try {
      await updatePhaseDoc(projectId, phaseId, { name });
    } catch (err) {
      console.error('[Phase] Rename phase failed:', err);
      showToast('Error al renombrar fase', 'error');
    }
  }, [updatePhaseDoc, showToast]);

  // ===== Get phase by type =====
  const getPhase = useCallback((projectId: string, type: 'diseño' | 'ejecución'): ProjectPhase | undefined => {
    return getProjectPhases(projectId).find(p => p.data.type === type);
  }, [getProjectPhases]);

  // ===== Get all processes for a phase type =====
  const getPhaseProcesses = useCallback((projectId: string, type: 'diseño' | 'ejecución'): ProcessNode[] => {
    return getPhase(projectId, type)?.data.processes || [];
  }, [getPhase]);

  // ===== Get leaf processes (containers for tasks) =====
  const getLeafProcesses = useCallback((projectId: string, type: 'diseño' | 'ejecución'): ProcessNode[] => {
    const processes = getPhaseProcesses(projectId, type);
    return getLeafNodes(processes);
  }, [getPhaseProcesses]);

  const value: PhaseContextType = useMemo(() => ({
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
  }), [phases, loading, initDefaultPhases, addProcess, removeProcess, renameProcess, addPhase, removePhase, renamePhase, getPhase, getPhaseProcesses, getLeafProcesses]);

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
}

export function usePhaseContext() {
  const ctx = useContext(PhaseContext);
  if (!ctx) throw new Error('usePhaseContext must be used within PhaseProvider');
  return ctx;
}
