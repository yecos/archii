'use client';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonTasks } from '@/components/ui/SkeletonLoaders';
import { fmtDate, getInitials, prioColor, taskStColor, avatarColor } from '@/lib/helpers';
import { LayoutList, KanbanSquare, Plus, GripVertical, X, Search, Filter, Download, Calendar, User, Pencil, Trash2, ChevronDown, Layers } from 'lucide-react';
import { exportTasksExcel } from '@/lib/export-excel';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

const KANBAN_COLS = [
  { status: 'Por hacer', color: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30', dot: 'bg-slate-400' },
  { status: 'En progreso', color: 'bg-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { status: 'Revision', color: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { status: 'Completado', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
];

function getAssigneeIds(t: any): string[] {
  if (Array.isArray(t.data.assigneeIds) && t.data.assigneeIds.length > 0) return t.data.assigneeIds;
  if (t.data.assigneeId) return [t.data.assigneeId];
  return [];
}

function AssigneeAvatars({ task, getUserName, size = 'sm' }: { task: any; getUserName: (uid: string) => string; size?: 'sm' | 'md' }) {
  const ids = getAssigneeIds(task);
  if (ids.length === 0) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-[var(--af-text3)]">
        <User size={10} /> Sin asignar
      </div>
    );
  }
  const isSmall = size === 'sm';
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {ids.slice(0, 3).map((uid: string) => (
          <span
            key={uid}
            className={`${isSmall ? 'w-4 h-4 text-[7px]' : 'w-5 h-5 text-[8px]'} rounded-full font-semibold flex items-center justify-center ring-1 ring-[var(--card)] ${avatarColor(uid)}`}
            title={getUserName(uid)}
          >
            {getInitials(getUserName(uid))}
          </span>
        ))}
      </div>
      {ids.length > 3 && (
        <span className={`text-[var(--af-text3)] ${isSmall ? 'text-[10px]' : 'text-[11px]'}`}>
          +{ids.length - 3}
        </span>
      )}
      {ids.length <= 3 && (
        <span className={`text-[var(--af-text3)] truncate ${isSmall ? 'text-[10px] max-w-[80px]' : 'text-[11px] max-w-[100px]'}`}>
          {ids.map((uid: string) => getUserName(uid)).join(', ')}
        </span>
      )}
    </div>
  );
}

export default function TasksScreen() {
  const {
    changeTaskStatus, deleteTask, forms, getUserName, loading,
    openEditTask, openModal, projects, setForms, tasks,
    timeEntries, showToast, teamUsers, toggleTask,
    getPhaseName, loadPhasesForProject, projectPhasesCache,
  } = useApp() as any;

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPhase, setFilterPhase] = useState('');

  // Pick up incoming status/assignee filter set by navigation (e.g. from ProfileScreen)
  React.useEffect(() => {
    const incoming = forms.taskFilterStatus;
    if (incoming) { setFilterStatus(incoming); setForms((p: any) => ({ ...p, taskFilterStatus: '' })); }
    const incomingAssignee = forms.taskFilterAssignee;
    if (incomingAssignee) { setFilterAssignee(incomingAssignee); setForms((p: any) => ({ ...p, taskFilterAssignee: '' })); }
  }, []);
  const dragCounterRef = useRef<Record<string, number>>({});

  const taskFilterProject = forms.taskFilterProject || '';

  const handleNewTask = () => {
    setForms((p: any) => ({ ...p, taskTitle: '', taskAssignees: [], taskDue: new Date().toISOString().split('T')[0], taskStatus: 'Por hacer' }));
    openModal('task');
  };

  const handleNewTaskInColumn = (status: string) => {
    setForms((p: any) => ({ ...p, taskTitle: '', taskAssignees: [], taskDue: new Date().toISOString().split('T')[0], taskStatus: status, taskProject: taskFilterProject }));
    openModal('task');
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    try { (e.target as HTMLElement).style.opacity = '0.4'; } catch {}
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragTaskId(null);
    setDragOverCol(null);
    dragCounterRef.current = {};
    try { (e.target as HTMLElement).style.opacity = '1'; } catch {}
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    dragCounterRef.current[colStatus] = (dragCounterRef.current[colStatus] || 0) + 1;
    setDragOverCol(colStatus);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    dragCounterRef.current[colStatus] = (dragCounterRef.current[colStatus] || 0) - 1;
    if (dragCounterRef.current[colStatus] <= 0) {
      dragCounterRef.current[colStatus] = 0;
      if (dragOverCol === colStatus) setDragOverCol(null);
    }
  }, [dragOverCol]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && newStatus) {
      changeTaskStatus(taskId, newStatus);
      showToast(`Tarea movida a ${newStatus}`);
    }
    setDragTaskId(null);
    setDragOverCol(null);
    dragCounterRef.current = {};
  }, [changeTaskStatus, showToast]);

  // Multi-filter
  const filteredTasks = useMemo(() => {
    let result = taskFilterProject ? tasks.filter((t: any) => t.data.projectId === taskFilterProject) : tasks;
    if (filterStatus) result = result.filter((t: any) => t.data.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) => t.data.title.toLowerCase().includes(q));
    }
    if (filterPriority) result = result.filter((t: any) => t.data.priority === filterPriority);
    if (filterAssignee) result = result.filter((t: any) => getAssigneeIds(t).includes(filterAssignee));
    if (filterPhase) result = result.filter((t: any) => t.data.phaseId === filterPhase);
    return result;
  }, [tasks, taskFilterProject, filterStatus, searchQuery, filterPriority, filterAssignee, filterPhase]);

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t: any) => {
      getAssigneeIds(t).forEach((uid: string) => {
        if (uid) {
          const name = getUserName(uid);
          map.set(uid, { id: uid, name });
        }
      });
    });
    return Array.from(map.values());
  }, [tasks, getUserName]);

  // Get unique phases for filter (from tasks with phaseId)
  const phaseOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    const sourceTasks = taskFilterProject ? tasks.filter((t: any) => t.data.projectId === taskFilterProject) : tasks;
    sourceTasks.forEach((t: any) => {
      if (t.data.phaseId && t.data.projectId) {
        const name = getPhaseName(t.data.phaseId, t.data.projectId);
        if (name) map.set(t.data.phaseId, { id: t.data.phaseId, name });
      }
    });
    return Array.from(map.values());
  }, [tasks, taskFilterProject, getPhaseName, projectPhasesCache]);

  // Stats
  const taskStats = useMemo(() => ({
    total: filteredTasks.length,
    completed: filteredTasks.filter((t: any) => t.data.status === 'Completado').length,
    inProgress: filteredTasks.filter((t: any) => t.data.status === 'En progreso').length,
    overdue: filteredTasks.filter((t: any) => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < new Date()).length,
  }), [filteredTasks]);

  const viewMode = forms.taskView || 'list';

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${viewMode === 'list' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}
              onClick={() => setForms((p: any) => ({ ...p, taskView: 'list' }))}
            >
              <LayoutList size={14} /> Lista
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${viewMode === 'kanban' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}
              onClick={() => setForms((p: any) => ({ ...p, taskView: 'kanban' }))}
            >
              <KanbanSquare size={14} /> Kanban
            </button>
          </div>

          {/* Project filter */}
          <select
            className="text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={taskFilterProject}
            onChange={e => setForms((p: any) => ({ ...p, taskFilterProject: e.target.value }))}
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>

          {/* Search - hidden on very small screens */}
          <div className="relative flex-1 max-w-[160px] sm:max-w-none sm:flex-none">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 w-[160px] transition-all"
            />
            {searchQuery && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--af-text3)] cursor-pointer" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all ${showFilters ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filtros
            {(filterPriority || filterAssignee || filterStatus || filterPhase) && <span className="w-2 h-2 rounded-full bg-[var(--af-accent)]" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Excel - desktop only */}
          <button
            className="hidden md:flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border border-[var(--border)] hover:border-[var(--af-accent)]/30 transition-colors"
            onClick={() => {
              try {
                exportTasksExcel(tasks, projects, useApp().teamUsers);
                showToast('Tareas exportadas a Excel');
              } catch (err) { showToast('Error al exportar', 'error'); }
            }}
          >
            <Download size={13} /> Excel
          </button>

          {/* New task - desktop only */}
          <button
            className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={handleNewTask}
          >
            <Plus size={15} /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Filter bar (expandable) */}
      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[var(--af-bg3)] border border-[var(--border)] rounded-xl animate-fadeIn">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
            <Filter size={13} /> Filtrar:
          </div>
          <select
            className="text-[12px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="Por hacer">Por hacer</option>
            <option value="En progreso">En progreso</option>
            <option value="Revision">En revision</option>
            <option value="Completado">Completado</option>
          </select>
          <select
            className="text-[12px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">Todas las prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
          <select
            className="text-[12px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="">Todos los asignados</option>
            {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            className="text-[12px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={filterPhase}
            onChange={e => setFilterPhase(e.target.value)}
          >
            <option value="">Todas las fases</option>
            {phaseOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(filterPriority || filterAssignee || filterStatus || filterPhase) && (
            <button className="text-[11px] text-red-400 cursor-pointer hover:underline" onClick={() => { setFilterPriority(''); setFilterAssignee(''); setFilterStatus(''); setFilterPhase(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{taskStats.total}</span> tareas
        </div>
        <div className="w-px h-3 bg-[var(--border)]" />
        <div className="flex items-center gap-1.5 text-[12px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold">{taskStats.completed}</span> completadas
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-semibold">{taskStats.inProgress}</span> en progreso
        </div>
        {taskStats.overdue > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-semibold">{taskStats.overdue}</span> vencidas
          </div>
        )}
      </div>

      {loading && <SkeletonTasks />}

      {!loading && viewMode === 'list' ? (
        /* LIST VIEW */
        filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-[var(--af-text3)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
              <KanbanSquare size={24} className="text-[var(--af-text3)]" />
            </div>
            <div className="text-[15px] font-medium text-[var(--muted-foreground)]">
              {searchQuery || filterPriority || filterAssignee ? 'Sin resultados' : 'Sin tareas'}
            </div>
            <div className="text-xs mt-1">
              {searchQuery || filterPriority || filterAssignee ? 'Intenta con otros filtros' : 'Crea tu primera tarea para empezar'}
            </div>
          </div>
        ) : (
          ['Alta', 'Media', 'Baja'].map(prio => {
            const group = filteredTasks.filter((t: any) => t.data.priority === prio);
            if (!group.length) return null;
            const prioColorBg = prio === 'Alta' ? 'bg-red-500/10 text-red-400' : prio === 'Media' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400';
            const prioDot = prio === 'Alta' ? 'bg-red-400' : prio === 'Media' ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div key={prio} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 mb-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1 rounded-lg ${prioColorBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prioDot}`} />
                  Prioridad {prio}
                  <span className="text-[var(--af-text3)] ml-1">({group.length})</span>
                </div>
                {group.map((t: any) => {
                  const proj = projects.find((p: any) => p.id === t.data.projectId);
                  const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado';
                  return (
                    <div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0 group">
                      <div
                        className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-all ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--input)] hover:border-[var(--af-accent)]'}`}
                        onClick={() => toggleTask(t.id, t.data.status)}
                      >
                        {t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
                        {(() => {
                          const sts = Array.isArray((t.data as any).subtasks) ? (t.data as any).subtasks as { text: string; done: boolean }[] : [];
                          if (sts.length === 0) return null;
                          const done = sts.filter(s => s.done).length;
                          const pct = Math.round((done / sts.length) * 100);
                          return (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`} style={{ width: pct + '%' }} />
                              </div>
                              <span className="text-[9px] text-[var(--af-text3)] flex-shrink-0">{done}/{sts.length} subtareas</span>
                            </div>
                          );
                        })()}
                        <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                          {proj && <span>{proj.data.name}</span>}
                          {t.data.phaseId && (() => {
                            const phaseName = getPhaseName(t.data.phaseId, t.data.projectId);
                            if (!phaseName) return null;
                            return (
                              <span className="inline-flex items-center gap-0.5 text-violet-400">
                                <Layers size={9} className="flex-shrink-0" />
                                {phaseName}
                              </span>
                            );
                          })()}
                          {t.data.dueDate && (
                            <span className={isOverdue ? 'text-red-400' : ''}>
                              <Calendar size={10} className="inline mr-0.5" />
                              {fmtDate(t.data.dueDate)}
                            </span>
                          )}
                          <AssigneeAvatars task={t} getUserName={getUserName} />
                        </div>
                      </div>
                      {/* Status badge - desktop only */}
                      <span className={`hidden md:flex text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                      {/* Desktop hover actions */}
                      <div className="hidden md:flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs px-2.5 py-1.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>Editar</button>
                        <button className="text-xs px-2 py-1.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}>
                          <X size={12} />
                        </button>
                      </div>
                      {/* Mobile overflow menu - always visible on mobile */}
                      <div className="md:hidden flex-shrink-0">
                        <OverflowMenu
                          actions={[
                            {
                              label: 'Editar tarea',
                              icon: <Pencil size={14} />,
                              onClick: () => openEditTask(t),
                            },
                            {
                              label: 'Eliminar tarea',
                              icon: <Trash2 size={14} />,
                              onClick: () => deleteTask(t.id),
                              variant: 'danger',
                              separator: true,
                            },
                          ]}
                          side="left"
                          align="end"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )
      ) : (
        /* KANBAN VIEW */
        filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-[var(--af-text3)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
              <KanbanSquare size={24} className="text-[var(--af-text3)]" />
            </div>
            <div className="text-[15px] font-medium text-[var(--muted-foreground)]">
              {searchQuery || filterPriority || filterAssignee ? 'Sin resultados' : 'Sin tareas'}
            </div>
            <div className="text-xs mt-1">
              {searchQuery || filterPriority || filterAssignee ? 'Intenta con otros filtros' : 'Crea tu primera tarea para empezar'}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ minHeight: 'calc(100vh - 280px)' }}>
            {KANBAN_COLS.map(col => {
              const colTasks = filteredTasks.filter((t: any) => t.data.status === col.status);
              const isDragOver = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-[270px] sm:w-[290px] rounded-xl transition-all ${
                    isDragOver
                      ? `${col.bg} border-2 border-dashed ${col.border} ring-2 ring-[var(--af-accent)]/20 scale-[1.01]`
                      : 'bg-[var(--af-bg3)] border border-[var(--border)]'
                  } flex flex-col overflow-hidden`}
                  onDragEnter={e => handleDragEnter(e, col.status)}
                  onDragLeave={e => handleDragLeave(e, col.status)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, col.status)}
                >
                  {/* Colored top border */}
                  <div className={`h-[3px] w-full ${col.color} transition-all ${isDragOver ? 'h-[4px]' : ''}`} />

                  <div className="p-3 flex flex-col flex-1">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className="text-[13px] font-semibold flex-1">{col.status}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        col.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' :
                        col.status === 'En progreso' ? 'bg-blue-500/10 text-blue-400' :
                        col.status === 'Revision' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                      }`}>
                        {colTasks.length}
                      </span>
                      <button
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--af-text3)] hover:text-[var(--af-accent)] hover:bg-[var(--af-accent)]/10 cursor-pointer transition-all opacity-60 hover:opacity-100"
                        onClick={() => handleNewTaskInColumn(col.status)}
                        title={`Agregar tarea en ${col.status}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Task Cards */}
                    <div className="flex-1 space-y-2 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                      {colTasks.length === 0 && !isDragOver && (
                        <div className="text-center py-10 border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--af-text3)]">
                          <div className="text-[11px] mb-1.5">Arrastra tareas aquí</div>
                          <button
                            className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--af-accent)]/30 hover:text-[var(--af-accent)] transition-all"
                            onClick={() => handleNewTaskInColumn(col.status)}
                          >
                            <Plus size={10} className="inline mr-0.5" /> Crear tarea
                          </button>
                        </div>
                      )}
                      {colTasks.length === 0 && isDragOver && (
                        <div className={`text-center py-10 rounded-lg border-2 border-dashed ${col.border} text-[var(--af-text3)] text-[11px] animate-pulse`}>
                          <div className="text-base mb-1">↓</div>
                          Soltar aquí
                        </div>
                      )}
                      {colTasks.map((t: any) => {
                        const proj = projects.find((p: any) => p.id === t.data.projectId);
                        const isDragging = dragTaskId === t.id;
                        const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado';
                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={e => handleDragStart(e, t.id)}
                            onDragEnd={handleDragEnd}
                            className={`relative bg-[var(--card)] border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 group/card ${
                              isDragging ? 'opacity-40 scale-95 border-[var(--af-accent)]' : 'border-[var(--border)] hover:border-[var(--input)]'
                            }`}
                            onClick={() => openEditTask(t)}
                          >
                            {/* Hover actions - top right */}
                            <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--card)]/90 backdrop-blur-sm text-[var(--af-text3)] hover:text-[var(--af-accent)] hover:bg-[var(--af-accent)]/10 cursor-pointer transition-colors border border-[var(--border)]"
                                onClick={e => { e.stopPropagation(); openEditTask(t); }}
                                title="Editar"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--card)]/90 backdrop-blur-sm text-[var(--af-text3)] hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors border border-[var(--border)]"
                                onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                                title="Eliminar"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {/* Project tag */}
                            {proj && (
                              <div className="text-[10px] text-[var(--af-text3)] mb-1 truncate pr-16">
                                {proj.data.name}
                                {t.data.phaseId && (() => {
                                  const phaseName = getPhaseName(t.data.phaseId, t.data.projectId);
                                  return phaseName ? (
                                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-violet-400">
                                      <Layers size={8} className="flex-shrink-0" />
                                      {phaseName}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            )}

                          {/* Task title */}
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="text-[var(--af-text3)] flex-shrink-0 mt-0.5 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity" />
                            <div className={`text-[13px] font-medium flex-1 leading-snug ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>
                              {t.data.title}
                            </div>

                            {/* Tags row */}
                            <div className="flex items-center mt-2.5 gap-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>
                                {t.data.priority}
                              </span>
                              {t.data.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                                  <Calendar size={9} className="flex-shrink-0" />
                                  {fmtDate(t.data.dueDate)}
                                </span>
                              )}
                            </div>
                            {/* Subtask progress pill */}
                            {(() => {
                              const sts = Array.isArray((t.data as any).subtasks) ? (t.data as any).subtasks as { text: string; done: boolean }[] : [];
                              if (sts.length === 0) return null;
                              const done = sts.filter(s => s.done).length;
                              const pct = Math.round((done / sts.length) * 100);
                              return (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${pct === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]'}`}>
                                  {done}/{sts.length}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Footer: assignees */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                            <AssigneeAvatars task={t} getUserName={getUserName} size="md" />
                            <button className="text-[10px] text-[var(--af-text3)] hover:text-red-400 cursor-pointer md:opacity-0 md:group-hover/card:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>
                              <X size={12} />
                            </button>
                          </div>
                          {/* Mobile: Status change dropdown */}
                          <select
                            className="md:hidden w-full mt-2 text-[10px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)] outline-none cursor-pointer appearance-none"
                            value={t.data.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { if (e.target.value !== t.data.status) changeTaskStatus(t.id, e.target.value); }}
                          >
                            {KANBAN_COLS.map(col => (
                              <option key={col.status} value={col.status}>{col.status}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Mobile FAB */}
      <FloatingActionButton
        onClick={handleNewTask}
        ariaLabel="Nueva tarea"
      />
    </div>
  );
}
