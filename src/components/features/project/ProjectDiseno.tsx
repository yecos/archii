'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Palette,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fmtDate, prioColor, taskStColor } from '@/lib/helpers';
import type { Task, Subtask, ProcessNode } from '@/lib/types';
import ProcessTree from './ProcessTree';
import { usePhaseContext } from '@/contexts/PhaseContext';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ProjectDisenoProps {
  project: { id: string; data: { name: string; [key: string]: any } };
  projectTasks: Array<{ id: string; data: Record<string, any> }>;
  selectedProjectId: string | null;
  getUserName: (userId: string) => string;
  toggleTask: (taskId: string, status: string) => void;
  openEditTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Recursively collect every process id (including children) from the tree. */
function collectAllProcessIds(nodes: ProcessNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children?.length) {
      ids.push(...collectAllProcessIds(node.children));
    }
  }
  return ids;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ProjectDiseno({
  project,
  projectTasks,
  selectedProjectId,
  getUserName,
  toggleTask,
  openEditTask,
  deleteTask,
  setForms,
  openModal,
}: ProjectDisenoProps) {
  /* ---- Phase context ---- */
  const {
    initDefaultPhases,
    addProcess,
    removeProcess,
    renameProcess,
    getPhase,
  } = usePhaseContext();

  /* ---- Local state ---- */
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- Derived: diseño phase ---- */
  const diseñoPhase = useMemo(
    () => getPhase(project.id, 'diseño'),
    [getPhase, project.id],
  );

  const diseñoProcesses = useMemo(
    () => diseñoPhase?.data.processes ?? [],
    [diseñoPhase],
  );

  const diseñoPhaseId = useMemo(
    () => diseñoPhase?.id ?? null,
    [diseñoPhase],
  );

  /* ---- Collect all process ids from the diseño tree ---- */
  const allProcessIds = useMemo(
    () => collectAllProcessIds(diseñoProcesses),
    [diseñoProcesses],
  );

  /* ---- Task counts per process ---- */
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of projectTasks) {
      const pid = t.data.processId as string | undefined;
      if (pid) {
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }
    return counts;
  }, [projectTasks]);

  const completedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of projectTasks) {
      const pid = t.data.processId as string | undefined;
      if (pid && t.data.status === 'Completado') {
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }
    return counts;
  }, [projectTasks]);

  /* ---- Auto-select the first leaf process when processes load ---- */
  useEffect(() => {
    if (!selectedProcessId && diseñoProcesses.length > 0) {
      const firstLeaf = findFirstLeaf(diseñoProcesses);
      if (firstLeaf) setSelectedProcessId(firstLeaf.id);
    }
  }, [diseñoProcesses, selectedProcessId]);

  /* ---- Filtered tasks for the selected process ---- */
  const filteredTasks = useMemo(() => {
    if (!diseñoPhaseId) return [];
    if (selectedProcessId) {
      return projectTasks.filter(
        (t) => t.data.processId === selectedProcessId,
      );
    }
    // No process selected → show all tasks belonging to the diseño phase
    return projectTasks.filter((t) => t.data.phaseId === diseñoPhaseId);
  }, [projectTasks, selectedProcessId, diseñoPhaseId]);

  /* ---- Total diseño tasks for the "all" view ---- */
  const allDiseñoTasks = useMemo(() => {
    if (!diseñoPhaseId) return [];
    return projectTasks.filter((t) => t.data.phaseId === diseñoPhaseId);
  }, [projectTasks, diseñoPhaseId]);

  /* ---- Handlers ---- */

  const handleSelectProcess = useCallback(
    (processId: string | null) => {
      setSelectedProcessId(processId);
      // On mobile, close sidebar after selection
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    [],
  );

  const handleAddProcess = useCallback(
    (parentId: string | null, name: string) => {
      if (!diseñoPhaseId) return;
      addProcess(project.id, diseñoPhaseId, name, parentId);
    },
    [project.id, diseñoPhaseId, addProcess],
  );

  const handleRemoveProcess = useCallback(
    (processId: string) => {
      if (!diseñoPhaseId) return;
      removeProcess(project.id, diseñoPhaseId, processId);
      if (selectedProcessId === processId) {
        setSelectedProcessId(null);
      }
    },
    [project.id, diseñoPhaseId, removeProcess, selectedProcessId],
  );

  const handleRenameProcess = useCallback(
    (processId: string, name: string) => {
      if (!diseñoPhaseId) return;
      renameProcess(project.id, diseñoPhaseId, processId, name);
    },
    [project.id, diseñoPhaseId, renameProcess],
  );

  const handleInitPhases = useCallback(async () => {
    await initDefaultPhases(project.id);
  }, [initDefaultPhases, project.id]);

  const handleNewTask = useCallback(() => {
    setForms((prev) => ({
      ...prev,
      taskTitle: '',
      taskProject: selectedProjectId,
      taskDue: new Date().toISOString().split('T')[0],
      taskProcessId: selectedProcessId,
      taskPhaseId: diseñoPhaseId,
    }));
    openModal('task');
  }, [setForms, openModal, selectedProjectId, selectedProcessId, diseñoPhaseId]);

  /* ---- Get the selected process name for the header ---- */
  const selectedProcessName = useMemo(() => {
    if (!selectedProcessId) return null;
    return findProcessName(diseñoProcesses, selectedProcessId);
  }, [selectedProcessId, diseñoProcesses]);

  /* ---- Render ---- */

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-0">
      {/* ================================================================ */}
      {/*  LEFT PANEL — Process Tree                                       */}
      {/* ================================================================ */}
      <aside
        className={`
          w-full md:w-72 flex-shrink-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'block' : 'hidden md:block'}
        `}
      >
        <div
          className="
            rounded-xl border border-[var(--border)]
            bg-[var(--af-bg3)]/40 p-4
            h-full
          "
        >
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[var(--af-accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Procesos de Diseño
                </h3>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {allDiseñoTasks.length} tarea{allDiseñoTasks.length !== 1 ? 's' : ''} total
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              className="md:hidden w-7 h-7 rounded-md flex items-center justify-center
                         hover:bg-[var(--af-bg4)] transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar panel"
            >
              <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
          </div>

          {/* Show button to init phases when diseño phase doesn't exist */}
          {!diseñoPhase ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Layers className="w-10 h-10 text-[var(--muted-foreground)]/30 mb-3" />
              <p className="text-[13px] text-[var(--muted-foreground)] mb-1">
                Sin fases de diseño
              </p>
              <p className="text-[11px] text-[var(--af-text3)] mb-4">
                Inicializa las fases para organizar el diseño
              </p>
              <button
                type="button"
                className="
                  flex items-center gap-1.5
                  bg-[var(--af-accent)] text-[var(--background)]
                  px-4 py-2 rounded-lg text-xs font-semibold
                  cursor-pointer border-none
                  hover:opacity-90 transition-opacity
                "
                onClick={handleInitPhases}
              >
                <Layers className="w-3.5 h-3.5" />
                Inicializar fases de diseño
              </button>
            </div>
          ) : (
            <ProcessTree
              processes={diseñoProcesses}
              selectedProcessId={selectedProcessId}
              onSelectProcess={handleSelectProcess}
              onAddProcess={handleAddProcess}
              onRemoveProcess={handleRemoveProcess}
              onRenameProcess={handleRenameProcess}
              taskCounts={taskCounts}
              completedCounts={completedCounts}
              label="Diseño"
            />
          )}
        </div>
      </aside>

      {/* ================================================================ */}
      {/*  RIGHT PANEL — Tasks                                              */}
      {/* ================================================================ */}
      <section className="flex-1 min-w-0">
        {/* Mobile sidebar toggle */}
        {!sidebarOpen && (
          <button
            type="button"
            className="
              md:hidden mb-3 inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-lg text-xs font-medium
              text-[var(--muted-foreground)]
              hover:text-[var(--foreground)]
              border border-[var(--border)]
              hover:border-[var(--input)]
              bg-[var(--card)] cursor-pointer
              transition-colors
            "
            onClick={() => setSidebarOpen(true)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Mostrar procesos
          </button>
        )}

        {/* ---- No diseño phase state ---- */}
        {!diseñoPhase && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
            <div className="text-4xl mb-3 opacity-40">
              <Palette className="w-12 h-12 mx-auto text-[var(--muted-foreground)]/30" />
            </div>
            <h4 className="text-sm font-medium text-[var(--foreground)] mb-1">
              Fase de diseño no inicializada
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Inicializa las fases del proyecto desde el panel izquierdo para
              comenzar a gestionar los procesos de diseño y sus tareas.
            </p>
          </div>
        )}

        {/* ---- Diseño phase exists ---- */}
        {diseñoPhase && (
          <>
            {/* Tasks header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {selectedProcessId && selectedProcessName
                    ? selectedProcessName
                    : 'Todas las tareas de diseño'}
                </h3>
                <span className="text-[11px] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--af-bg4)]">
                  {filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {selectedProcessId && (
                <button
                  className="
                    flex items-center gap-1.5
                    bg-[var(--af-accent)] text-[var(--background)]
                    px-3 py-1.5 rounded-lg text-xs font-semibold
                    cursor-pointer border-none
                    hover:opacity-90 transition-opacity
                  "
                  onClick={handleNewTask}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Nueva tarea
                </button>
              )}
            </div>

            {/* ---- Task list ---- */}
            {filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-10 text-center">
                <div className="text-4xl mb-3 opacity-40">✏️</div>
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-1">
                  {selectedProcessId
                    ? 'Sin tareas en este proceso'
                    : 'Sin tareas de diseño'}
                </h4>
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                  {selectedProcessId
                    ? 'Crea la primera tarea para este proceso de diseño.'
                    : 'Selecciona un proceso del árbol o crea tareas para comenzar.'}
                </p>
                {selectedProcessId && (
                  <button
                    className="
                      inline-flex items-center gap-1.5
                      text-xs px-4 py-2 rounded-lg
                      bg-[var(--af-accent)]/10 text-[var(--af-accent)]
                      hover:bg-[var(--af-accent)]/20
                      cursor-pointer border-none
                      font-medium transition-colors
                    "
                    onClick={handleNewTask}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear tarea
                  </button>
                )}
              </div>
            ) : (
              <div
                className="
                  rounded-xl border border-[var(--border)] bg-[var(--card)]
                  overflow-hidden
                "
              >
                <div className="divide-y divide-[var(--border)]">
                  {filteredTasks.map((t) => {
                    const subs = t.data?.subtasks;
                    const subtaskInfo =
                      Array.isArray(subs) && subs.length > 0
                        ? {
                            total: subs.length,
                            completed: subs.filter(
                              (s: Subtask) => s.completed,
                            ).length,
                          }
                        : null;
                    const isCompleted = t.data.status === 'Completado';

                    return (
                      <div
                        key={t.id}
                        className="
                          flex items-start gap-3 px-4 py-3
                          hover:bg-[var(--af-bg3)]/30
                          transition-colors group
                        "
                      >
                        {/* Priority dot */}
                        <div
                          className={`
                            w-2 h-2 rounded-full mt-2 flex-shrink-0
                            ${
                              t.data.priority === 'Alta'
                                ? 'bg-red-500'
                                : t.data.priority === 'Media'
                                  ? 'bg-amber-500'
                                  : t.data.priority === 'Urgente'
                                    ? 'bg-rose-600'
                                    : 'bg-emerald-500'
                            }
                          `}
                        />

                        {/* Checkbox */}
                        <button
                          type="button"
                          className={`
                            w-[18px] h-[18px] rounded border-2 flex-shrink-0 mt-0.5
                            flex items-center justify-center
                            transition-all cursor-pointer
                            ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-[var(--input)] hover:border-[var(--af-accent)]'
                            }
                          `}
                          onClick={() => toggleTask(t.id, t.data.status)}
                          aria-label={
                            isCompleted
                              ? 'Marcar como pendiente'
                              : 'Marcar como completada'
                          }
                        >
                          {isCompleted && (
                            <span className="text-white text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div
                            className={`
                              text-[13px] font-medium leading-snug
                              ${isCompleted ? 'line-through text-[var(--af-text3)]' : 'text-[var(--foreground)]'}
                            `}
                          >
                            {t.data.title}
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            {/* Priority badge */}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prioColor(t.data.priority)}`}
                            >
                              {t.data.priority}
                            </span>

                            {/* Subtask progress */}
                            {subtaskInfo && (
                              <span
                                className={`
                                  inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full
                                  ${
                                    subtaskInfo.completed === subtaskInfo.total
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                                  }
                                `}
                              >
                                <CheckSquare size={9} />
                                {subtaskInfo.completed}/{subtaskInfo.total}
                              </span>
                            )}

                            {/* Due date */}
                            {t.data.dueDate && (
                              <span className="text-[11px] text-[var(--af-text3)]">
                                📅 {fmtDate(t.data.dueDate)}
                              </span>
                            )}

                            {/* Assignee */}
                            {t.data.assigneeId && (
                              <span className="text-[11px] text-[var(--af-text3)]">
                                👤 {getUserName(t.data.assigneeId)}
                              </span>
                            )}
                          </div>

                          {/* Subtask progress bar */}
                          {subtaskInfo && subtaskInfo.total > 0 && (
                            <div className="mt-2 w-28 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  subtaskInfo.completed === subtaskInfo.total
                                    ? 'bg-emerald-500'
                                    : 'bg-[var(--af-accent)]'
                                }`}
                                style={{
                                  width: `${(subtaskInfo.completed / subtaskInfo.total) * 100}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <span
                          className={`
                            text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5
                            ${taskStColor(t.data.status)}
                          `}
                        >
                          {t.data.status}
                        </span>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                          <button
                            type="button"
                            className="
                              w-7 h-7 rounded-md flex items-center justify-center
                              bg-[var(--af-accent)]/10 text-[var(--af-accent)]
                              hover:bg-[var(--af-accent)]/20
                              cursor-pointer border-none transition-colors
                            "
                            onClick={() => openEditTask(t as unknown as Task)}
                            aria-label="Editar tarea"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            className="
                              w-7 h-7 rounded-md flex items-center justify-center
                              bg-red-500/10 text-red-400
                              hover:bg-red-500/20
                              cursor-pointer border-none transition-colors
                            "
                            onClick={() => deleteTask(t.id)}
                            aria-label="Eliminar tarea"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utility: find first leaf process                                          */
/* -------------------------------------------------------------------------- */

function findFirstLeaf(nodes: ProcessNode[]): ProcessNode | null {
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) return node;
    const leaf = findFirstLeaf(node.children);
    if (leaf) return leaf;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Utility: find process name by id in the tree                              */
/* -------------------------------------------------------------------------- */

function findProcessName(nodes: ProcessNode[], targetId: string): string | null {
  for (const node of nodes) {
    if (node.id === targetId) return node.name;
    if (node.children?.length) {
      const found = findProcessName(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}
