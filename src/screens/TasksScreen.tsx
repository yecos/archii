'use client';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useTimeTracking } from '@/hooks/useDomain';
import { confirm } from '@/hooks/useConfirmDialog';
import { SkeletonTasks } from '@/components/ui/SkeletonLoaders';
import { fmtDate, getInitials, prioColor, taskStColor, avatarColor } from '@/lib/helpers';
import { LayoutList, KanbanSquare, Plus, GripVertical, X, Search, Filter, Download, Calendar, User, CheckSquare, Upload, CheckCheck, Trash2, RotateCcw, SquareCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportTasksExcel } from '@/lib/export-excel';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerContainer';
import EmptyState from '@/components/ui/EmptyState';
import TimeProgressBar from '@/components/ui/TimeProgressBar';

const KANBAN_COLS = [
  { status: 'Por hacer', color: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30', dot: 'bg-slate-400' },
  { status: 'En progreso', color: 'bg-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { status: 'En revisión', color: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { status: 'Completado', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
];

function getSubtaskInfo(t: any): { total: number; completed: number } | null {
  const subs = t.data?.subtasks;
  if (!Array.isArray(subs) || subs.length === 0) return null;
  return { total: subs.length, completed: subs.filter((s: any) => s.completed).length };
}

function TaskCount({ count }: { count: number }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const timer = setTimeout(() => setDisplay(count), 100);
    return () => clearTimeout(timer);
  }, [count]);
  return <span className="font-tabular">{display}</span>;
}

function SubtaskBadge({ info }: { info: { total: number; completed: number } }) {
  const pct = info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;
  const allDone = info.completed === info.total;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${allDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
      <CheckSquare size={9} />
      {info.completed}/{info.total}
    </span>
  );
}

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
  const { forms, setForms, openModal, showToast } = useUI();
  const { loading, getUserName, teamUsers } = useAuth();
  const { tasks, projects, toggleTask, changeTaskStatus, deleteTask, openEditTask } = useFirestore();
  const { timeEntries } = useTimeTracking();

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedKanbanColumn, setSelectedKanbanColumn] = useState<string>(KANBAN_COLS[0].status);
  const dragCounterRef = useRef<Record<string, number>>({});

  const taskFilterProject = forms.taskFilterProject || '';

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    try { (e.target as HTMLElement).style.opacity = '0.4'; } catch (err) { console.error('[ArchiFlow] Tasks: set drag opacity failed:', err); }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragTaskId(null);
    setDragOverCol(null);
    dragCounterRef.current = {};
    try { (e.target as HTMLElement).style.opacity = '1'; } catch (err) { console.error('[ArchiFlow] Tasks: reset drag opacity failed:', err); }
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
    }
    setDragTaskId(null);
    setDragOverCol(null);
    dragCounterRef.current = {};
  }, [changeTaskStatus]);

  // Multi-filter
  const filteredTasks = useMemo(() => {
    let result = taskFilterProject ? tasks.filter((t: any) => t.data.projectId === taskFilterProject) : tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) => t.data.title.toLowerCase().includes(q));
    }
    if (filterPriority) result = result.filter((t: any) => t.data.priority === filterPriority);
    if (filterAssignee) result = result.filter((t: any) => getAssigneeIds(t).includes(filterAssignee));
    return result;
  }, [tasks, taskFilterProject, searchQuery, filterPriority, filterAssignee]);

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

  // Stats
  const taskStats = useMemo(() => ({
    total: filteredTasks.length,
    completed: filteredTasks.filter((t: any) => t.data.status === 'Completado').length,
    inProgress: filteredTasks.filter((t: any) => t.data.status === 'En progreso').length,
    overdue: filteredTasks.filter((t: any) => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < new Date()).length,
  }), [filteredTasks]);

  const viewMode = forms.taskView || 'list';

  // Batch operations
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t: any) => t.id)));
    }
  }, [filteredTasks, selectedIds.size]);

  const batchComplete = useCallback(() => {
    selectedIds.forEach(id => {
      const t = tasks.find((x: any) => x.id === id);
      if (t && t.data.status !== 'Completado') toggleTask(id, t.data.status);
    });
    showToast(`${selectedIds.size} tareas completadas`);
    setSelectedIds(new Set());
    setBatchMode(false);
  }, [selectedIds, tasks, toggleTask, showToast]);

  const batchReset = useCallback(() => {
    selectedIds.forEach(id => {
      const t = tasks.find((x: any) => x.id === id);
      if (t && t.data.status === 'Completado') toggleTask(id, t.data.status);
    });
    showToast(`${selectedIds.size} tareas reiniciadas`);
    setSelectedIds(new Set());
    setBatchMode(false);
  }, [selectedIds, tasks, toggleTask, showToast]);

  const batchDelete = useCallback(async () => {
    if (!(await confirm({ title: 'Eliminar tareas', description: `¿Eliminar ${selectedIds.size} tareas seleccionadas?`, confirmText: 'Eliminar', variant: 'destructive' }))) return;
    selectedIds.forEach(id => deleteTask(id));
    showToast(`${selectedIds.size} tareas eliminadas`);
    setSelectedIds(new Set());
    setBatchMode(false);
  }, [selectedIds, deleteTask, showToast]);

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

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-[13px] skeuo-input pl-8 pr-3 py-1.5 w-[120px] sm:w-[160px]"
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
            {(filterPriority || filterAssignee) && <span className="w-2 h-2 rounded-full bg-[var(--af-accent)]" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Batch mode toggle (list only) */}
          {viewMode === 'list' && (
            <button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${batchMode ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30' : 'bg-[var(--af-bg3)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`}
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            >
              <SquareCheck size={13} /> Seleccionar
            </button>
          )}
          {/* Import */}
          <button
            className="flex items-center gap-1.5 skeuo-btn text-[var(--foreground)] px-3 py-2 text-xs font-medium"
            onClick={() => openModal('importData')}
          >
            <Upload size={13} /> Importar
          </button>

          {/* Export Excel */}
          <button
            className="flex items-center gap-1.5 skeuo-btn text-[var(--foreground)] px-3 py-2 text-xs font-medium"
            onClick={() => {
              try {
                exportTasksExcel(tasks, projects, teamUsers);
                showToast('Tareas exportadas a Excel');
              } catch (err) { console.error('[ArchiFlow] Tasks: export tasks Excel failed:', err); showToast('Error al exportar', 'error'); }
            }}
          >
            <Download size={13} /> Excel
          </button>

          {/* New task */}
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => { setForms((p: any) => ({ ...p, taskTitle: '', taskAssignees: [], taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}
          >
            <Plus size={15} /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Filter bar (expandable) */}
      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 skeuo-panel animate-fadeIn">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
            <Filter size={13} /> Filtrar:
          </div>
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
          {(filterPriority || filterAssignee) && (
            <button className="text-[11px] text-red-400 cursor-pointer hover:underline" onClick={() => { setFilterPriority(''); setFilterAssignee(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4">
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

      {/* Batch Action Bar */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/30 rounded-xl animate-fadeIn">
          <span className="text-[13px] font-semibold text-[var(--af-accent)]">{selectedIds.size} seleccionadas</span>
          <button className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-colors" onClick={batchComplete}>
            <CheckCheck size={12} /> Completar
          </button>
          <button className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={batchReset}>
            <RotateCcw size={12} /> Reiniciar
          </button>
          <button className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20 transition-colors" onClick={batchDelete}>
            <Trash2 size={12} /> Eliminar
          </button>
          <div className="flex-1" />
          <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setSelectedIds(new Set())}>Deseleccionar</button>
        </div>
      )}
      {batchMode && selectedIds.size === 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 skeuo-panel animate-fadeIn">
          <span className="text-[12px] text-[var(--muted-foreground)]">Selecciona tareas para acciones en lote</span>
          <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={selectAll}>Seleccionar todas</button>
          <div className="flex-1" />
          <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setBatchMode(false)}>Cancelar</button>
        </div>
      )}

      {loading && <SkeletonTasks />}

      {!loading && viewMode === 'list' ? (
        /* LIST VIEW */
        filteredTasks.length === 0 ? (
          <EmptyState
            illustration={(searchQuery || filterPriority || filterAssignee) ? 'search' : 'tasks'}
            title={(searchQuery || filterPriority || filterAssignee) ? 'Sin resultados' : 'Sin tareas'}
            description={(searchQuery || filterPriority || filterAssignee) ? 'Intenta con otros filtros' : 'Las tareas aparecerán aquí cuando las crees'}
          />
        ) : (
          <StaggerContainer className="stagger-children">
          {['Alta', 'Media', 'Baja'].map(prio => {
            const group = filteredTasks.filter((t: any) => t.data.priority === prio);
            if (!group.length) return null;
            const prioColorBg = prio === 'Alta' ? 'bg-red-500/10 text-red-400' : prio === 'Media' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400';
            const prioDot = prio === 'Alta' ? 'bg-red-400' : prio === 'Media' ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <StaggerItem key={prio}><div className="card-glass p-4 mb-4 rounded-xl">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1 rounded-lg ${prioColorBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prioDot}`} />
                  Prioridad {prio}
                  <span className="text-[var(--af-text3)] ml-1">({group.length})</span>
                </div>
                {group.map((t: any) => {
                  const proj = projects.find((p: any) => p.id === t.data.projectId);
                  const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado';
                  return (
                    <div key={t.id} className={`card-glass-subtle rounded-lg p-3 mb-2 flex items-start gap-3 group transition-colors duration-150 hover:bg-[var(--af-bg3)] ${batchMode && selectedIds.has(t.id) ? 'bg-[var(--af-accent)]/5' : ''}`}>
                      {batchMode && (
                        <div
                          className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-all ${selectedIds.has(t.id) ? 'bg-[var(--af-accent)] border-[var(--af-accent)]' : 'border-[var(--input)] hover:border-[var(--af-accent)]'}`}
                          onClick={() => toggleSelect(t.id)}
                        >
                          {selectedIds.has(t.id) && <span className="text-background text-[10px] font-bold">✓</span>}
                        </div>
                      )}
                      <div
                        className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-all ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--input)] hover:border-[var(--af-accent)]'}`}
                        onClick={() => toggleTask(t.id, t.data.status)}
                      >
                        {t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
                        <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                          {proj && <span>{proj.data.name}</span>}
                          {t.data.dueDate && (
                            <span className={isOverdue ? 'text-red-400' : ''}>
                              <Calendar size={10} className="inline mr-0.5" />
                              {fmtDate(t.data.dueDate)}
                            </span>
                          )}
                          <AssigneeAvatars task={t} getUserName={getUserName} />
                          {(() => { const si = getSubtaskInfo(t); return si && <SubtaskBadge info={si} />; })()}
                        </div>
                        {/* Barra de progreso temporal */}
                        {t.data.dueDate && (
                          <div className="mt-2">
                            <TimeProgressBar
                              dueDate={t.data.dueDate}
                              createdAt={t.data.createdAt}
                              isCompleted={t.data.status === 'Completado'}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(() => { const si = getSubtaskInfo(t); return si && si.total > 0 && (
                          <div className="w-12 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full progress-animated ${si.completed === si.total ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`} style={{ width: `${(si.completed / si.total) * 100}%` }} />
                          </div>
                        ); })()}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 transition-opacity duration-150">
                        <button className="text-xs px-2.5 py-1.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>Editar</button>
                        <button className="text-xs px-2 py-1.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div></StaggerItem>
            );
          })
          }</StaggerContainer>
        )
      ) : (
        /* KANBAN VIEW */
        filteredTasks.length === 0 ? (
          <EmptyState
            illustration={(searchQuery || filterPriority || filterAssignee) ? 'search' : 'tasks'}
            title={(searchQuery || filterPriority || filterAssignee) ? 'Sin resultados' : 'Sin tareas'}
            description={(searchQuery || filterPriority || filterAssignee) ? 'Intenta con otros filtros' : 'Las tareas aparecerán aquí cuando las crees'}
            compact
          />
        ) : (
          <>
          {/* Mobile Kanban: column selector + single column view */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 mb-3">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors"
                onClick={() => {
                  const idx = KANBAN_COLS.findIndex(c => c.status === selectedKanbanColumn);
                  const prev = idx > 0 ? KANBAN_COLS[idx - 1].status : KANBAN_COLS[KANBAN_COLS.length - 1].status;
                  setSelectedKanbanColumn(prev);
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-none">
                {KANBAN_COLS.map(col => {
                  const count = filteredTasks.filter((t: any) => t.data.status === col.status).length;
                  return (
                    <button
                      key={col.status}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${
                        selectedKanbanColumn === col.status
                          ? `${col.bg} ${col.border} border font-medium`
                          : 'bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                      onClick={() => setSelectedKanbanColumn(col.status)}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      {col.status}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedKanbanColumn === col.status ? 'bg-[var(--card)]' : 'bg-[var(--af-bg4)]'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors"
                onClick={() => {
                  const idx = KANBAN_COLS.findIndex(c => c.status === selectedKanbanColumn);
                  const next = idx < KANBAN_COLS.length - 1 ? KANBAN_COLS[idx + 1].status : KANBAN_COLS[0].status;
                  setSelectedKanbanColumn(next);
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {(() => {
              const col = KANBAN_COLS.find(c => c.status === selectedKanbanColumn);
              if (!col) return null;
              const colTasks = filteredTasks.filter((t: any) => t.data.status === col.status);
              return (
                <div className="min-h-[60vh]">
                  {colTasks.length > 0 && (
                    <div className="h-0.5 bg-[var(--af-bg4)] rounded-full mb-3 overflow-hidden">
                      <div className={`h-full rounded-full ${col.dot}`} style={{ width: '100%' }} />
                    </div>
                  )}
                  {colTasks.length === 0 ? (
                    <div className="text-center py-12 text-[var(--af-text3)] text-sm">
                      Sin tareas en &quot;{col.status}&quot;
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {colTasks.map((t: any) => {
                        const proj = projects.find((p: any) => p.id === t.data.projectId);
                        const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado';
                        return (
                          <div
                            key={t.id}
                            className="card-glass-subtle tilt-hover p-3 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99]"
                            onClick={() => openEditTask(t)}
                          >
                            {proj && (
                              <div className="text-[10px] text-[var(--af-text3)] mb-1 truncate">{proj.data.name}</div>
                            )}
                            <div className={`text-[13px] font-medium leading-snug ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>
                              {t.data.title}
                            </div>
                            <div className="flex items-center justify-between mt-2 gap-1.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                                {(() => { const si = getSubtaskInfo(t); return si && <SubtaskBadge info={si} />; })()}
                                {t.data.dueDate && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                                    {isOverdue && <span className="w-1 h-1 rounded-full bg-red-400" />}
                                    {fmtDate(t.data.dueDate)}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                              <AssigneeAvatars task={t} getUserName={getUserName} size="md" />
                              <button className="text-[10px] text-[var(--af-text3)] hover:text-red-400 cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Desktop Kanban: horizontal scroll */}
          <div className="hidden md:flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ minHeight: 'calc(100vh - 280px)' }}>
            {KANBAN_COLS.map(col => {
              const colTasks = filteredTasks.filter((t: any) => t.data.status === col.status);
              const isDragOver = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-[270px] sm:w-[290px] xl:w-[320px] card-glass rounded-xl transition-all ${
                    isDragOver
                      ? `${col.bg} border-2 border-dashed ${col.border} ring-2 ring-[var(--af-accent)]/20`
                      : ''
                  } p-3 flex flex-col`}
                  onDragEnter={e => handleDragEnter(e, col.status)}
                  onDragLeave={e => handleDragLeave(e, col.status)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, col.status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="text-[13px] font-semibold flex-1 text-label">{col.status}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium badge-gradient ${
                      col.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' :
                      col.status === 'En progreso' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                    }`}>
                      <TaskCount count={colTasks.length} />
                    </span>
                  </div>

                  {/* Progress bar for column */}
                  {colTasks.length > 0 && (
                    <div className="h-0.5 bg-[var(--af-bg4)] rounded-full mb-3 overflow-hidden">
                      <div className={`h-full rounded-full ${col.dot}`} style={{ width: '100%' }} />
                    </div>
                  )}

                  {/* Task Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                    {colTasks.length === 0 && !isDragOver && (
                      <div className="text-center py-8 text-[var(--af-text3)] text-[11px]">
                        Sin tareas
                      </div>
                    )}
                    {colTasks.length === 0 && isDragOver && (
                      <div className={`text-center py-8 rounded-lg border-2 border-dashed ${col.border} text-[var(--af-text3)] text-[11px]`}>
                        Soltar aqui
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
                          className={`card-glass-subtle tilt-hover p-3 cursor-grab active:cursor-grabbing transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99] group/card ${
                            isDragging ? 'opacity-40 scale-95 border-[var(--af-accent)]' : ''
                          }`}
                          onClick={() => openEditTask(t)}
                        >
                          {/* Project tag */}
                          {proj && (
                            <div className="text-[10px] text-[var(--af-text3)] mb-1.5 truncate">
                              {proj.data.name}
                            </div>
                          )}

                          {/* Task title */}
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="text-[var(--af-text3)] flex-shrink-0 mt-0.5 transition-opacity" />
                            <div className={`text-[13px] font-medium flex-1 leading-snug ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>
                              {t.data.title}
                            </div>
                          </div>

                          {/* Tags row */}
                          <div className="flex items-center justify-between mt-2.5 gap-1.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>
                                {t.data.priority}
                              </span>
                              {(() => { const si = getSubtaskInfo(t); return si && <SubtaskBadge info={si} />; })()}
                              {t.data.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                                  {isOverdue && <span className="w-1 h-1 rounded-full bg-red-400" />}
                                  {fmtDate(t.data.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Barra de progreso temporal (compacta) */}
                          {t.data.dueDate && (
                            <div className="mt-2">
                              <TimeProgressBar
                                dueDate={t.data.dueDate}
                                createdAt={t.data.createdAt}
                                isCompleted={t.data.status === 'Completado'}
                                compact
                              />
                            </div>
                          )}

                          {/* Footer: assignees */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                            <AssigneeAvatars task={t} getUserName={getUserName} size="md" />
                            <button className="text-[10px] text-[var(--af-text3)] hover:text-red-400 cursor-pointer transition-opacity" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )
      )}
    </div>
  );
}
