'use client';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestoreContext } from './FirestoreContext';
import * as _gantt from '@/lib/gantt-helpers';
import type { Task } from '@/lib/types';

/* ===== ADMIN CONTEXT ===== */
interface AdminContextType {
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

  // Computed values
  adminFilteredTasks: any[];

  // Gantt helpers (re-exported from @/lib/gantt-helpers)
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
}

const AdminContext = createContext<AdminContextType | null>(null);

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
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
};

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const { tasks, projects } = useFirestoreContext();

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
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(DEFAULT_ROLE_PERMS);

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

  // ===== COMPUTED VALUES =====

  const activeTasks = useMemo(() => tasks.filter(t => t.data?.status !== 'Completado'), [tasks]);

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

  // ===== PROVIDER =====

  const value: AdminContextType = useMemo(() => ({
    // Admin UI state
    adminTab, setAdminTab, adminWeekOffset, setAdminWeekOffset, adminTaskSearch, setAdminTaskSearch,
    adminFilterAssignee, setAdminFilterAssignee, adminFilterProject, setAdminFilterProject,
    adminFilterPriority, setAdminFilterPriority,
    adminTooltipTask, setAdminTooltipTask, adminTooltipPos, setAdminTooltipPos,
    adminPermSection, setAdminPermSection, rolePerms, setRolePerms, toggleRolePerm,
    // Computed
    adminFilteredTasks,
    // Gantt (re-exported from @/lib/gantt-helpers)
    GANTT_DAYS: _gantt.GANTT_DAYS, GANTT_DAY_NAMES: _gantt.GANTT_DAY_NAMES,
    GANTT_STATUS_CFG: _gantt.GANTT_STATUS_CFG, GANTT_PRIO_CFG: _gantt.GANTT_PRIO_CFG,
    getMonday: _gantt.getMonday, getGanttDays: () => _getGanttDays(adminWeekOffset),
    getTaskBar: _gantt.getTaskBar, buildGanttRows: _gantt.buildGanttRows, findOverlaps: _gantt.findOverlaps,
    getProjectColor: _getProjectColor, getProjectColorLight: _getProjectColorLight,
  }), [
    adminTab, adminWeekOffset, adminTaskSearch, adminFilterAssignee, adminFilterProject, adminFilterPriority,
    adminTooltipTask, adminTooltipPos, adminPermSection, rolePerms, toggleRolePerm,
    adminFilteredTasks,
    _getGanttDays, _getProjectColor, _getProjectColorLight,
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminContext must be used within AdminProvider');
  return ctx;
}
