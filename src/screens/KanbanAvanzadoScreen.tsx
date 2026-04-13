'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate, getInitials, prioColor, avatarColor } from '@/lib/helpers';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, X, Search, Filter, Calendar, User, GripVertical, MoreHorizontal,
  ChevronDown, MessageSquare, Paperclip, AlertCircle, CheckCircle2, Clock, Layers, Eye, Download,
} from 'lucide-react';
import { exportTasksExcel } from '@/lib/export-excel';

const KANBAN_COLS = [
  { id: 'backlog', status: 'Por hacer', color: '#64748b', lightColor: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
  { id: 'progress', status: 'En progreso', color: '#3b82f6', lightColor: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { id: 'review', status: 'Revision', color: '#f59e0b', lightColor: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { id: 'done', status: 'Completado', color: '#10b981', lightColor: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
];

const WIP_LIMITS: Record<string, number> = { backlog: 99, progress: 5, review: 3, done: 99 };

/* ─── Sortable Task Card ─── */
function TaskCard({ task, projects, getUserName, openEditTask, deleteTask, toggleTask, comments }: {
  task: any; projects: any[]; getUserName: (id: string) => string; openEditTask: (t: any) => void;
  deleteTask: (id: string) => void; toggleTask: (id: string, status: string) => void; comments: any[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };
  const proj = projects.find((p: any) => p.id === task.data.projectId);
  const isOverdue = task.data.dueDate && new Date(task.data.dueDate) < new Date() && task.data.status !== 'Completado';
  const taskComments = comments.filter((c: any) => c.data?.taskId === task.id);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      ref={setNodeRef} style={style}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group/card mb-2"
      onClick={() => openEditTask(task)}
    >
      {/* Drag handle + Project tag */}
      <div className="flex items-center gap-2 mb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 rounded hover:bg-[var(--af-bg4)] transition-colors">
          <GripVertical size={14} className="text-[var(--af-text3)]" />
        </div>
        {proj && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.data.progress >= 80 ? '#10b981' : '#c8a96e' }} />
            <span className="text-[10px] text-[var(--af-text3)] truncate font-medium">{proj.data.name}</span>
          </div>
        )}
        <div className="relative">
          <button className="p-1 rounded hover:bg-[var(--af-bg4)] text-[var(--af-text3)] cursor-pointer border-none bg-transparent" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-6 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-[140px] animate-fadeIn">
                <button className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--af-bg3)] cursor-pointer flex items-center gap-2 border-none bg-transparent text-[var(--foreground)]" onClick={(e) => { e.stopPropagation(); openEditTask(task); setShowMenu(false); }}>
                  <Eye size={12} /> Ver detalle
                </button>
                {task.data.status !== 'Completado' && (
                  <button className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-emerald-500/10 text-emerald-400 cursor-pointer flex items-center gap-2 border-none bg-transparent" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.data.status); setShowMenu(false); }}>
                    <CheckCircle2 size={12} /> Completar
                  </button>
                )}
                <button className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-red-500/10 text-red-400 cursor-pointer flex items-center gap-2 border-none bg-transparent" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); setShowMenu(false); }}>
                  <X size={12} /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className={`text-[13px] font-medium leading-snug mb-2 ${task.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>
        {task.data.title}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prioColor(task.data.priority)}`}>
          {task.data.priority}
        </span>
        {isOverdue && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
            <AlertCircle size={9} /> Vencida
          </span>
        )}
        {task.data.dueDate && !isOverdue && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] flex items-center gap-0.5">
            <Calendar size={9} /> {fmtDate(task.data.dueDate)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          {task.data.assigneeId ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center ${avatarColor(task.data.assigneeId)}`}>
                {getInitials(getUserName(task.data.assigneeId))}
              </span>
              <span className="text-[11px] text-[var(--af-text3)] truncate max-w-[80px]">{getUserName(task.data.assigneeId)}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--af-text3)] flex items-center gap-1">
              <User size={10} /> Sin asignar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[var(--af-text3)]">
          {taskComments.length > 0 && (
            <span className="text-[10px] flex items-center gap-0.5"><MessageSquare size={10} />{taskComments.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Column Component ─── */
function KanbanColumn({ col, tasks, projects, getUserName, openEditTask, deleteTask, toggleTask, comments, onChangeStatus }: {
  col: typeof KANBAN_COLS[0]; tasks: any[]; projects: any[]; getUserName: (id: string) => string;
  openEditTask: (t: any) => void; deleteTask: (id: string) => void; toggleTask: (id: string, status: string) => void;
  comments: any[]; onChangeStatus: (taskId: string, status: string) => void;
}) {
  const wipLimit = WIP_LIMITS[col.id] || 99;
  const isOverWip = tasks.length > wipLimit && wipLimit < 99;
  const [quickTask, setQuickTask] = useState('');
  const { openModal, setForms } = useApp();

  const handleQuickAdd = () => {
    if (!quickTask.trim()) return;
    setForms((p: any) => ({ ...p, taskTitle: quickTask.trim(), taskDue: new Date().toISOString().split('T')[0] }));
    openModal('task');
    setQuickTask('');
  };

  return (
    <div
      className="flex-shrink-0 w-[300px] sm:w-[320px] flex flex-col rounded-2xl transition-all"
      style={{ backgroundColor: col.lightColor, border: `1px solid ${col.border}` }}
      data-column-id={col.id}
    >
      {/* Column Header */}
      <div className="p-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
          <span className="text-[14px] font-semibold flex-1">{col.status}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: col.lightColor, color: col.color }}>
            {tasks.length}
          </span>
        </div>
        {isOverWip && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-400">
            <AlertCircle size={10} /> WIP limit excedido ({wipLimit})
          </div>
        )}
        {!isOverWip && wipLimit < 99 && (
          <div className="h-1 bg-[var(--af-bg4)]/50 rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((tasks.length / wipLimit) * 100, 100)}%`, backgroundColor: col.color }} />
          </div>
        )}
        {/* Quick add */}
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="Nueva tarea..."
            value={quickTask}
            onChange={e => setQuickTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            className="w-full bg-[var(--card)]/80 border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 placeholder:text-[var(--af-text3)] transition-colors"
          />
          {quickTask && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer border-none bg-transparent" onClick={handleQuickAdd}>
                <Plus size={12} />
              </button>
              <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 text-red-400 cursor-pointer border-none bg-transparent" onClick={() => setQuickTask('')}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-[100px]" style={{ scrollbarWidth: 'thin' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id} task={task} projects={projects} getUserName={getUserName}
              openEditTask={openEditTask} deleteTask={deleteTask} toggleTask={toggleTask} comments={comments}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-[var(--af-text3)] text-[12px] rounded-xl border-2 border-dashed border-[var(--border)]/50">
            Arrastra tareas aquí
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Kanban Screen ─── */
export default function KanbanAvanzadoScreen() {
  const {
    tasks, projects, getUserName, openEditTask, deleteTask, toggleTask, forms, setForms,
    openModal, showToast, comments, changeTaskStatus, loading, teamUsers,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [swimlanes, setSwimlanes] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = filterProject ? tasks.filter((t: any) => t.data.projectId === filterProject) : tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) => t.data.title.toLowerCase().includes(q));
    }
    if (filterPriority) result = result.filter((t: any) => t.data.priority === filterPriority);
    if (filterAssignee) result = result.filter((t: any) => t.data.assigneeId === filterAssignee);
    return result;
  }, [tasks, filterProject, searchQuery, filterPriority, filterAssignee]);

  // Assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t: any) => {
      if (t.data.assigneeId) {
        map.set(t.data.assigneeId, { id: t.data.assigneeId, name: getUserName(t.data.assigneeId) });
      }
    });
    return Array.from(map.values());
  }, [tasks, getUserName]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, any[]> = { backlog: [], progress: [], review: [], done: [] };
    filteredTasks.forEach((t: any) => {
      const s = t.data.status;
      if (s === 'Por hacer') grouped.backlog.push(t);
      else if (s === 'En progreso') grouped.progress.push(t);
      else if (s === 'Revision') grouped.review.push(t);
      else if (s === 'Completado') grouped.done.push(t);
      else grouped.backlog.push(t);
    });
    return grouped;
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t: any) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    // Determine which column was dropped on
    const overId = over.id as string;
    let targetCol = KANBAN_COLS.find(col => col.status === overId)?.id;
    if (!targetCol) {
      // Check if dropped on a task within a column
      const targetTask = tasks.find((t: any) => t.id === overId);
      if (targetTask) {
        const s = targetTask.data.status;
        if (s === 'Por hacer') targetCol = 'backlog';
        else if (s === 'En progreso') targetCol = 'progress';
        else if (s === 'Revision') targetCol = 'review';
        else if (s === 'Completado') targetCol = 'done';
      }
    }
    if (targetCol) {
      const newStatus = KANBAN_COLS.find(c => c.id === targetCol)?.status;
      if (newStatus) changeTaskStatus(taskId, newStatus);
    }
  };

  // Stats
  const totalTasks = filteredTasks.length;
  const completedPct = totalTasks > 0 ? Math.round((tasksByColumn.done.length / totalTasks) * 100) : 0;

  return (
    <div className="animate-fadeIn flex flex-col h-full -m-3 sm:-m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-[var(--card)] border-b border-[var(--border)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[16px] font-semibold flex items-center gap-2">
                <Layers size={18} className="text-[var(--af-accent)]" />
                Tablero Kanban
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">v2.0</span>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                {totalTasks} tareas · {completedPct}% completado
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
              <input
                type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 w-[140px] transition-all"
              />
            </div>
            {/* Project filter */}
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer">
              <option value="">Todos los proyectos</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
            {/* Filters */}
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${showFilters ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={13} /> Filtros
              {(filterPriority || filterAssignee) && <span className="w-2 h-2 rounded-full bg-[var(--af-accent)]" />}
            </button>
            {/* Export */}
            <button className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border border-[var(--border)] hover:border-[var(--af-accent)]/30 transition-colors" onClick={() => { try { exportTasksExcel(tasks, projects, teamUsers); showToast('Excel exportado'); } catch { showToast('Error', 'error'); } }}>
              <Download size={13} /> Excel
            </button>
            {/* New task */}
            <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { setForms((p: any) => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>
              <Plus size={14} /> Nueva tarea
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 p-2.5 bg-[var(--af-bg3)] rounded-lg animate-fadeIn">
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-[11px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)] outline-none">
              <option value="">Prioridad</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="text-[11px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)] outline-none">
              <option value="">Asignado</option>
              {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {(filterPriority || filterAssignee) && (
              <button className="text-[11px] text-red-400 cursor-pointer hover:underline" onClick={() => { setFilterPriority(''); setFilterAssignee(''); }}>Limpiar</button>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          {KANBAN_COLS.map(col => (
            <div key={col.id} className="flex items-center gap-1.5 flex-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
              <div className="h-1 bg-[var(--af-bg4)] rounded-full flex-1 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: totalTasks > 0 ? `${(tasksByColumn[col.id].length / totalTasks) * 100}%` : '0%', backgroundColor: col.color }} />
              </div>
              <span className="text-[10px] text-[var(--muted-foreground)] w-6 text-right">{tasksByColumn[col.id].length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-[var(--af-bg3)]">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {KANBAN_COLS.map(col => (
              <KanbanColumn
                key={col.id} col={col} tasks={tasksByColumn[col.id]}
                projects={projects} getUserName={getUserName}
                openEditTask={openEditTask} deleteTask={deleteTask} toggleTask={toggleTask}
                comments={comments} onChangeStatus={changeTaskStatus}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="w-[300px] bg-[var(--card)] border-2 border-[var(--af-accent)] rounded-xl p-3 shadow-2xl rotate-2 opacity-90">
                <div className="text-[13px] font-semibold">{activeTask.data.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{activeTask.data.priority}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
