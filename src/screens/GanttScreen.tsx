'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { getFirebase, snapToDocs } from '@/lib/firebase-service';
import { GANTT_DAY_NAMES, GANTT_DAYS, getGanttDays, getTaskBar, buildGanttRows, getProjectColor, getProjectColorLight } from '@/lib/gantt-helpers';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { Task } from '@/lib/types';

export default function GanttScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(ui.selectedProjectId);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);

  // Load tasks from Firestore
  useEffect(() => {
    const fb = getFirebase();
    const db = fb.firestore();
    let query = db.collection('tasks').orderBy('dueDate', 'asc');
    const unsub = query.onSnapshot((snap: any) => {
      setTasks(snapToDocs(snap) as Task[]);
    }, (err: any) => console.error('[ArchiFlow] Gantt: task listen error:', err));
    return () => unsub();
  }, []);

  const days = useMemo(() => getGanttDays(weekOffset), [weekOffset]);

  const filteredTasks = useMemo(() => {
    const withDates = tasks.filter(t => t.data?.dueDate);
    if (selectedProjectId) return withDates.filter(t => t.data.projectId === selectedProjectId);
    return withDates;
  }, [tasks, selectedProjectId]);

  const ganttRows = useMemo(() => buildGanttRows(filteredTasks as any[]), [filteredTasks]);

  const uniqueProjectIds = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.data.projectId));
    return [...ids];
  }, [filteredTasks]);

  // Week navigation
  const goToToday = () => setWeekOffset(0);
  const prevWeek = () => setWeekOffset(w => Math.max(0, w - 1));
  const nextWeek = () => setWeekOffset(w => w + 1);

  // Navigate to task detail
  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      ui.setSelectedProjectId(task.data.projectId);
      ui.navigateTo('tasks', task.data.projectId);
    }
  };

  // Drag handlers for resizing
  const handleDragStart = (e: React.MouseEvent, taskId: string) => {
    setDragTask(taskId);
    setDragStartX(e.clientX);
  };

  const handleDragEnd = async (e: React.MouseEvent) => {
    if (!dragTask) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) < 5) return;

    // Calculate new due date based on drag distance
    const dayWidth = (scrollRef.current?.scrollWidth || 900) / GANTT_DAYS;
    const daysDiff = Math.round(dx / dayWidth);
    if (daysDiff === 0) return;

    const task = tasks.find(t => t.id === dragTask);
    if (!task?.data?.dueDate) return;

    const newEnd = new Date(task.data.dueDate);
    newEnd.setDate(newEnd.getDate() + daysDiff);
    const newStart = new Date(task.data.startDate || task.data.dueDate);
    newStart.setDate(newStart.getDate() + daysDiff);

    try {
      await getFirebase().firestore().collection('tasks').doc(dragTask).update({
        dueDate: newEnd.toISOString().split('T')[0],
        startDate: newStart.toISOString().split('T')[0],
        updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
      });
      ui.showToast('Fecha actualizada');
    } catch (err) {
      console.error('[ArchiFlow] Gantt: drag update failed:', err);
      ui.showToast('Error al actualizar fecha', 'error');
    }

    setDragTask(null);
    setDragStartX(0);
  };

  // Today marker position
  const todayPct = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = days[0];
    const rangeEnd = new Date(days[days.length - 1]);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const DAY_MS = 86400000;
    const rangeSpan = (Number(rangeEnd) - Number(rangeStart)) / DAY_MS;
    if (rangeSpan <= 0) return -1;
    return ((Number(today) - Number(rangeStart)) / DAY_MS / rangeSpan) * 100;
  }, [days]);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="card-elevated rounded-xl p-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-semibold mb-1">Diagrama de Gantt</div>
            <div className="text-sm text-[var(--muted-foreground)]">Visualización cronológica de tareas por proyecto</div>
          </div>
        </div>

        {/* Project selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none min-w-[200px]"
            value={selectedProjectId || ''}
            onChange={e => setSelectedProjectId(e.target.value || null)}
          >
            <option value="">Todos los proyectos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.data.name}</option>
            ))}
          </select>

          {/* Week nav */}
          <div className="flex items-center gap-1">
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={prevWeek}>
              <ChevronLeft size={14} />
            </button>
            <button className="skeuo-badge px-2.5 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80" onClick={goToToday}>
              <Calendar size={14} /> Hoy
            </button>
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={nextWeek}>
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {days[0]?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} — {days[days.length - 1]?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Legend */}
      {uniqueProjectIds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-1">
          <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Proyectos:</span>
          {uniqueProjectIds.map(pid => {
            const proj = projects.find(p => p.id === pid);
            const color = getProjectColor(pid, projects as any[]);
            return (
              <div key={pid} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSelectedProjectId(pid)}>
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-[var(--foreground)]">{proj?.data.name || 'Sin nombre'}</span>
              </div>
            );
          })}
          {selectedProjectId && (
            <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline ml-2" onClick={() => setSelectedProjectId(null)}>
              Ver todos
            </button>
          )}
        </div>
      )}

      {/* Gantt Chart */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📅</div>
          <div className="text-sm">Sin tareas con fecha</div>
          <div className="text-xs mt-1">Las tareas con fecha de vencimiento aparecerán en el diagrama</div>
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b border-[var(--border)]" ref={scrollRef}>
            <div className="w-[180px] lg:w-[220px] shrink-0 px-3 py-2 border-r border-[var(--border)] bg-[var(--skeuo-raised)]">
              <span className="text-[11px] font-medium text-[var(--muted-foreground)]">TAREAS ({filteredTasks.length})</span>
            </div>
            <div className="flex-1 min-w-[600px] overflow-x-auto">
              <div className="flex" style={{ width: `${(100 / GANTT_DAYS) * GANTT_DAYS}%` }}>
                {days.map((day, i) => (
                  <div key={i} className={`flex-1 text-center py-2 border-r border-[var(--border)] last:border-r-0 ${isToday(day) ? 'bg-[var(--af-accent)]/5' : ''}`}>
                    <div className={`text-[10px] ${isToday(day) ? 'text-[var(--af-accent)] font-semibold' : 'text-[var(--muted-foreground)]'}`}>
                      {GANTT_DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                    </div>
                    <div className={`text-[13px] font-semibold ${isToday(day) ? 'text-[var(--af-accent)]' : 'text-[var(--foreground)]'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt rows */}
          <div className="max-h-[500px] overflow-y-auto">
            {ganttRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--af-accent)]/[0.02] transition-colors">
                {/* Task name */}
                <div className="w-[180px] lg:w-[220px] shrink-0 px-3 py-2.5 border-r border-[var(--border)]">
                  {row.map(task => {
                    const proj = projects.find(p => p.id === task.data.projectId);
                    const color = getProjectColor(task.data.projectId, projects as any[]);
                    return (
                      <div key={task.id} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-[var(--foreground)] truncate cursor-pointer hover:text-[var(--af-accent)] transition-colors" onClick={() => handleTaskClick(task.id)}>
                            {task.data.title}
                          </div>
                          {proj && (
                            <div className="text-[10px] text-[var(--muted-foreground)] truncate">{proj.data.name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline bars */}
                <div className="flex-1 min-w-[600px] relative">
                  {/* Today marker */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 w-[2px] bg-[var(--af-accent)]/40 z-10" style={{ left: `${todayPct}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--af-accent)]" />
                    </div>
                  )}

                  {row.map(task => {
                    const bar = getTaskBar(task as any, days);
                    if (!bar) return null;
                    const color = getProjectColor(task.data.projectId, projects as any[]);
                    const lightColor = getProjectColorLight(task.data.projectId, projects as any[]);
                    return (
                      <div key={task.id} className="relative py-1.5 mb-1 last:mb-0">
                        {/* Task bar */}
                        <div
                          className="absolute h-7 rounded-md cursor-pointer flex items-center px-2 transition-all hover:opacity-90 hover:shadow-lg select-none"
                          style={{
                            left: `${bar.left}%`,
                            width: `${bar.width}%`,
                            backgroundColor: lightColor,
                            borderLeft: `3px solid ${color}`,
                          }}
                          onClick={() => handleTaskClick(task.id)}
                          onMouseDown={e => handleDragStart(e, task.id)}
                          onMouseUp={handleDragEnd}
                          onMouseLeave={() => setDragTask(null)}
                          title={`${task.data.title} — ${task.data.startDate || ''} → ${task.data.dueDate}`}
                        >
                          <span className="text-[10px] font-medium truncate text-[var(--foreground)]" style={{ color }}>
                            {task.data.title}
                          </span>
                        </div>

                        {/* Milestone marker for due date */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-0 h-0 z-[5] cursor-pointer"
                          style={{
                            left: `calc(${bar.left + bar.width}% - 6px)`,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `8px solid ${task.data.status === 'Completado' ? '#10b981' : color}`,
                          }}
                          title={`Vencimiento: ${task.data.dueDate}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {filteredTasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(() => {
            const total = filteredTasks.length;
            const completed = filteredTasks.filter(t => t.data.status === 'Completado').length;
            const inProgress = filteredTasks.filter(t => t.data.status === 'En progreso').length;
            const overdue = filteredTasks.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado').length;
            return [
              { label: 'Total Tareas', value: total, icon: '📋', color: 'text-[var(--af-accent)]' },
              { label: 'En Progreso', value: inProgress, icon: '⚡', color: 'text-blue-400' },
              { label: 'Completadas', value: completed, icon: '✅', color: 'text-emerald-400' },
              { label: 'Vencidas', value: overdue, icon: '⚠️', color: 'text-red-400' },
            ].map((stat, i) => (
              <div key={i} className="card-elevated rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{stat.icon}</span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">{stat.label}</span>
                </div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="card-elevated rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <div className="text-sm text-[var(--muted-foreground)]">No hay tareas registradas</div>
          <div className="text-xs text-[var(--af-text3)] mt-1">Crea tareas con fechas para verlas en el diagrama de Gantt</div>
        </div>
      )}
    </div>
  );
}
