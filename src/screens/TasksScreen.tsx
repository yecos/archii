'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonTasks } from '@/components/ui/SkeletonLoaders';
import { fmtDate, getInitials, prioColor, taskStColor, avatarColor } from '@/lib/helpers';
import { LayoutList, KanbanSquare, Plus, GripVertical, X } from 'lucide-react';

const KANBAN_COLS = [
  { status: 'Por hacer', color: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  { status: 'En progreso', color: 'bg-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { status: 'Revision', color: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { status: 'Completado', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
];

export default function TasksScreen() {
  const {
    changeTaskStatus, deleteTask, forms, getUserName, loading, openEditTask,
    openModal, projects, setForms, tasks, toggleTask,
  } = useApp();

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
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

  const taskFilterProject = forms.taskFilterProject || '';
  const filteredTasks = taskFilterProject
    ? tasks.filter(t => t.data.projectId === taskFilterProject)
    : tasks;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${(forms.taskView || 'list') === 'list' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}
              onClick={() => setForms(p => ({ ...p, taskView: 'list' }))}
            >
              <LayoutList size={14} /> Lista
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${(forms.taskView || 'list') === 'kanban' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'}`}
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
        </div>
        <button
          className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
          onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}
        >
          <Plus size={15} /> Nueva tarea
        </button>
      </div>

      {loading && <SkeletonTasks />}

      {!loading && (forms.taskView || 'list') === 'list' ? (
        /* ─── LIST VIEW ─── */
        filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-[var(--af-text3)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-3">
              <KanbanSquare size={24} className="text-[var(--af-text3)]" />
            </div>
            <div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin tareas</div>
            <div className="text-xs mt-1">Crea tu primera tarea para empezar</div>
          </div>
        ) : (
          ['Alta', 'Media', 'Baja'].map(prio => {
            const group = filteredTasks.filter(t => t.data.priority === prio);
            if (!group.length) return null;
            const prioColorBg = prio === 'Alta' ? 'bg-red-500/10 text-red-400' : prio === 'Media' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400';
            return (
              <div key={prio} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1 rounded-lg ${prioColorBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prio === 'Alta' ? 'bg-red-400' : prio === 'Media' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  Prioridad {prio}
                  <span className="text-[var(--af-text3)] ml-1">({group.length})</span>
                </div>
                {group.map(t => {
                  const proj = projects.find(p => p.id === t.data.projectId);
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
                          {t.data.dueDate && <span>{fmtDate(t.data.dueDate)}</span>}
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                      <div className="flex items-center gap-1 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
            <div className="text-[15px] font-medium text-[var(--muted-foreground)]">Sin tareas</div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ minHeight: 'calc(100vh - 220px)' }}>
            {KANBAN_COLS.map(col => {
              const colTasks = filteredTasks.filter(t => t.data.status === col.status);
              const isDragOver = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-[260px] sm:w-[280px] rounded-xl transition-all ${
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
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-[13px] font-semibold flex-1">{col.status}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] font-medium">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
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
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={e => handleDragStart(e, t.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-[var(--card)] border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 ${
                            isDragging ? 'opacity-40 scale-95 border-[var(--af-accent)]' : 'border-[var(--border)] hover:border-[var(--input)]'
                          }`}
                          onClick={() => openEditTask(t)}
                        >
                          {/* Task title */}
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="text-[var(--af-text3)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                            <div className={`text-[13px] font-medium flex-1 ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>
                              {t.data.title}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="text-[11px] text-[var(--af-text3)] truncate max-w-[140px]">
                              {proj?.data.name || ''}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {t.data.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                                  {fmtDate(t.data.dueDate)}
                                </span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>
                                {t.data.priority}
                              </span>
                            </div>
                          </div>

                          {/* Assignee */}
                          {t.data.assigneeId && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border)]">
                              <span className={`w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center ${avatarColor(t.data.assigneeId)}`}>
                                {getInitials(getUserName(t.data.assigneeId))}
                              </span>
                              <span className="text-[11px] text-[var(--af-text3)]">{getUserName(t.data.assigneeId)}</span>
                            </div>
                          )}
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
