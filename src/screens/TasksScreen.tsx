'use client';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonTasks } from '@/components/ui/SkeletonLoaders';
import { fmtDate, getInitials, prioColor, taskStColor, avatarColor, fmtDuration } from '@/lib/helpers';
import { LayoutList, KanbanSquare, Plus, GripVertical, X, Search, Filter, Download, Calendar, User, ChevronDown } from 'lucide-react';
import { exportTasksExcel } from '@/lib/export-excel';

const KANBAN_COLS = [
  { status: 'Por hacer', color: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30', dot: 'bg-slate-400' },
  { status: 'En progreso', color: 'bg-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { status: 'Revision', color: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { status: 'Completado', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
];

export default function TasksScreen() {
  const {
    changeTaskStatus, deleteTask, forms, getUserName, loading, openEditTask,
    openModal, projects, setForms, tasks, toggleTask, timeEntries, showToast,
  } = useApp();

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const dragCounterRef = useRef<Record<string, number>>({});

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
    }
    setDragTaskId(null);
    setDragOverCol(null);
    dragCounterRef.current = {};
  }, [changeTaskStatus]);

  // Multi-filter
  const filteredTasks = useMemo(() => {
    let result = taskFilterProject ? tasks.filter(t => t.data.projectId === taskFilterProject) : tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.data.title.toLowerCase().includes(q));
    }
    if (filterPriority) result = result.filter(t => t.data.priority === filterPriority);
    if (filterAssignee) result = result.filter(t => t.data.assigneeId === filterAssignee);
    return result;
  }, [tasks, taskFilterProject, searchQuery, filterPriority, filterAssignee]);

  const taskFilterProject = forms.taskFilterProject || '';

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach(t => {
      if (t.data.assigneeId) {
        const name = getUserName(t.data.assigneeId);
        map.set(t.data.assigneeId, { id: t.data.assigneeId, name });
      }
    });
    return Array.from(map.values());
  }, [tasks, getUserName]);

  // Stats
  const taskStats = useMemo(() => ({
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => t.data.status === 'Completado').length,
    inProgress: filteredTasks.filter(t => t.data.status === 'En progreso').length,
    overdue: filteredTasks.filter(t => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < new Date()).length,
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
              onClick={() => setForms(p => ({ ...p, taskView: 'list' }))}
            >
              <LayoutList size={14} /> Lista
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${viewMode === 'kanban' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}
              onClick={() => setForms(p => ({ ...p, taskView: 'kanban' }))}
            >
              <KanbanSquare size={14} /> Kanban
            </button>
          </div>

          {/* Project filter */}
          <select
            className="text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer"
            value={taskFilterProject}
            onChange={e => setForms(p => ({ ...p, taskFilterProject: e.target.value }))}
          >
            <option value="">Todos los proyectos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
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
            {(filterPriority || filterAssignee) && <span className="w-2 h-2 rounded-full bg-[var(--af-accent)]" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Excel */}
          <button
            className="flex items-center gap-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border border-[var(--border)] hover:border-[var(--af-accent)]/30 transition-colors"
            onClick={() => {
              try {
                exportTasksExcel(tasks, projects, useApp().teamUsers);
                showToast('Tareas exportadas a Excel');
              } catch (err) { showToast('Error al exportar', 'error'); }
            }}
          >
            <Download size={13} /> Excel
          </button>

          {/* New task */}
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}
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

      {loading && <SkeletonTasks />}

      {!loading && viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
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
            const group = filteredTasks.filter(t => t.data.priority === prio);
            if (!group.length) return null;
            const prioColorBg = prio === 'Alta' ? 'bg-red-500/10 text-red-400' : prio === 'Media' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400';
            const prioDot = prio === 'Alta' ? 'bg-red-400' : prio === 'Media' ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div key={prio} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1 rounded-lg ${prioColorBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prioDot}`} />
                  Prioridad {prio}
                  <span className="text-[var(--af-text3)] ml-1">({group.length})</span>
                </div>
                {group.map(t => {
                  const proj = projects.find(p => p.id === t.data.projectId);
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
                        <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                          {proj && <span>{proj.data.name}</span>}
                          {t.data.dueDate && (
                            <span className={isOverdue ? 'text-red-400' : ''}>
                              <Calendar size={10} className="inline mr-0.5" />
                              {fmtDate(t.data.dueDate)}
                            </span>
                          )}
                          {t.data.assigneeId && (
                            <span className="flex items-center gap-1">
                              <span className={`w-4 h-4 rounded-full text-[7px] font-semibold flex items-center justify-center ${avatarColor(t.data.assigneeId)}`}>
                                {getInitials(getUserName(t.data.assigneeId))}
                              </span>
                              {getUserName(t.data.assigneeId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs px-2.5 py-1.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>Editar</button>
                        <button className="text-xs px-2 py-1.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )
      ) : (
        /* ─── KANBAN VIEW ─── */
        filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-[var(--af-text3)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
              <KanbanSquare size={24} className="text-[var(--af-text3)]" />
            </div>
            <div className="text-[15px] font-medium text-[var(--muted-foreground)]">
              {searchQuery || filterPriority || filterAssignee ? 'Sin resultados' : 'Sin tareas'}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ minHeight: 'calc(100vh - 280px)' }}>
            {KANBAN_COLS.map(col => {
              const colTasks = filteredTasks.filter(t => t.data.status === col.status);
              const isDragOver = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-[270px] sm:w-[290px] rounded-xl transition-all ${
                    isDragOver
                      ? `${col.bg} border-2 border-dashed ${col.border} ring-2 ring-[var(--af-accent)]/20`
                      : 'bg-[var(--af-bg3)] border border-[var(--border)]'
                  } p-3 flex flex-col`}
                  onDragEnter={e => handleDragEnter(e, col.status)}
                  onDragLeave={e => handleDragLeave(e, col.status)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, col.status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="text-[13px] font-semibold flex-1">{col.status}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      col.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' :
                      col.status === 'En progreso' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                    }`}>
                      {colTasks.length}
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
                    {colTasks.map(t => {
                      const proj = projects.find(p => p.id === t.data.projectId);
                      const isDragging = dragTaskId === t.id;
                      const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado';
                      const taskComments = 0; // Placeholder
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={e => handleDragStart(e, t.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-[var(--card)] border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 group/card ${
                            isDragging ? 'opacity-40 scale-95 border-[var(--af-accent)]' : 'border-[var(--border)] hover:border-[var(--input)]'
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
                            <GripVertical size={14} className="text-[var(--af-text3)] flex-shrink-0 mt-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
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
                              {t.data.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                                  {isOverdue && <span className="w-1 h-1 rounded-full bg-red-400" />}
                                  {fmtDate(t.data.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Footer: assignee + count */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                            {t.data.assigneeId ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center ${avatarColor(t.data.assigneeId)}`}>
                                  {getInitials(getUserName(t.data.assigneeId))}
                                </span>
                                <span className="text-[11px] text-[var(--af-text3)] truncate max-w-[90px]">{getUserName(t.data.assigneeId)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-[var(--af-text3)]">
                                <User size={10} /> Sin asignar
                              </div>
                            )}
                            <button className="text-[10px] text-[var(--af-text3)] hover:text-red-400 cursor-pointer opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>
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
        )
      )}
    </div>
  );
}
