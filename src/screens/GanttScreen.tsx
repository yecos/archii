'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getInitials, avatarColor, fmtDate } from '@/lib/helpers';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Layers, Calendar, Milestone, AlertTriangle, CheckCircle } from 'lucide-react';

const PROJECT_COLORS = ['#c8a96e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

export default function GanttScreen() {
  const { tasks, projects, getUserName, loading, openEditTask, navigateTo } = useApp();

  const [zoomLevel, setZoomLevel] = useState(1); // 1 = day width 40px
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedProject, setSelectedProject] = useState('');
  const [tooltipTask, setTooltipTask] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate date range
  const { startDate, endDate, totalDays, dayWidth, dates } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1); // First of current month
    start.setDate(start.getDate() - 14); // Go back 2 weeks
    const end = new Date(start);
    end.setDate(end.getDate() + 60); // 60 days forward
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dw = Math.max(30, 40 * zoomLevel);
    const dts: Date[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dts.push(d);
    }
    return { startDate: start, endDate: end, totalDays, dayWidth: dw, dates: dts };
  }, [zoomLevel]);

  // Filter and group tasks
  const displayTasks = useMemo(() => {
    let result = selectedProject
      ? tasks.filter((t: any) => t.data.projectId === selectedProject)
      : tasks;
    return result.filter((t: any) => t.data.dueDate || t.data.status !== 'Completado').slice(0, 50);
  }, [tasks, selectedProject]);

  // Build gantt rows
  const ganttRows = useMemo(() => {
    const rows: { task: any; startDay: number; duration: number; projColor: string; projName: string }[] = [];
    displayTasks.forEach((task: any, idx: number) => {
      const proj = projects.find((p: any) => p.id === task.data.projectId);
      const colorIdx = proj ? projects.indexOf(proj) % PROJECT_COLORS.length : idx % PROJECT_COLORS.length;

      // Calculate task position
      let taskStart: Date;
      let taskEnd: Date;

      if (task.data.dueDate) {
        // Use created date or 7 days before due as start
        let created: Date;
        try {
          created = task.data.createdAt?.toDate?.() ? task.data.createdAt.toDate() : new Date(task.data.createdAt);
        } catch {
          created = new Date();
        }
        taskStart = created;
        taskEnd = new Date(task.data.dueDate);
        // If start is after end, fix it
        if (taskStart > taskEnd) {
          taskStart = new Date(taskEnd);
          taskStart.setDate(taskStart.getDate() - 3);
        }
      } else {
        // No dates, put it starting from today
        taskStart = new Date();
        taskEnd = new Date();
        taskEnd.setDate(taskEnd.getDate() + 7);
      }

      const startDay = Math.max(0, Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const duration = Math.max(2, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)));
      const isCompleted = task.data.status === 'Completado';
      const progressPct = isCompleted ? 100 : task.data.status === 'En progreso' ? 60 : task.data.status === 'Revision' ? 85 : 0;

      rows.push({
        task,
        startDay,
        duration,
        projColor: PROJECT_COLORS[colorIdx],
        projName: proj?.data?.name || 'Sin proyecto',
      });
    });
    return rows.sort((a, b) => {
      // Sort by project, then by start day
      if (a.projName !== b.projName) return a.projName.localeCompare(b.projName);
      return a.startDay - b.startDay;
    });
  }, [displayTasks, projects, startDate]);

  // Weekend detection
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Today position
  const todayDay = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleTaskClick = useCallback((task: any, e: React.MouseEvent) => {
    openEditTask(task);
  }, [openEditTask]);

  const handleTaskHover = useCallback((task: any, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipTask(task);
    setTooltipPos({ x: rect.left, y: rect.top - 10 });
  }, []);

  // Navigate
  const scrollByDays = useCallback((days: number) => {
    setScrollOffset(prev => Math.max(0, prev + days * dayWidth));
  }, [dayWidth]);

  return (
    <div className="animate-fadeIn flex flex-col h-full -m-3 sm:-m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-[var(--card)] border-b border-[var(--border)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[16px] font-semibold flex items-center gap-2">
                <Layers size={18} className="text-[var(--af-accent)]" />
                Diagrama Gantt
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">v2.0</span>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                {ganttRows.length} tareas en timeline · {totalDays} días
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Project filter */}
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] outline-none cursor-pointer">
              <option value="">Todos los proyectos</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 bg-[var(--af-bg3)] rounded-lg p-0.5">
              <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] text-[var(--muted-foreground)] px-1.5 min-w-[35px] text-center">{Math.round(zoomLevel * 100)}%</span>
              <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent" onClick={() => setZoomLevel(z => Math.min(2, z + 0.25))}>
                <ZoomIn size={14} />
              </button>
            </div>
            {/* Nav */}
            <button className="p-1.5 rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border border-[var(--border)] bg-transparent" onClick={() => scrollByDays(-7)}>
              <ChevronLeft size={14} />
            </button>
            <button className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--af-bg4)] text-[12px] text-[var(--muted-foreground)] cursor-pointer border border-[var(--border)] bg-transparent font-medium" onClick={() => {
              const todayPx = todayDay * dayWidth;
              setScrollOffset(Math.max(0, todayPx - 300));
            }}>
              Hoy
            </button>
            <button className="p-1.5 rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border border-[var(--border)] bg-transparent" onClick={() => scrollByDays(7)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {['Por hacer', 'En progreso', 'Revision', 'Completado'].map(status => {
            const color = status === 'Completado' ? '#10b981' : status === 'En progreso' ? '#3b82f6' : status === 'Revision' ? '#f59e0b' : '#64748b';
            return (
              <div key={status} className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                <div className="w-3 h-2 rounded-full" style={{ backgroundColor: color }} />
                {status}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 text-[10px] text-red-400">
            <AlertTriangle size={10} /> Vencida
          </div>
          <div className="w-px h-3 bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
            <Calendar size={10} /> Haga click en una tarea para editar
          </div>
        </div>
      </div>

      {/* Gantt Content */}
      <div className="flex-1 overflow-auto bg-[var(--af-bg3)]" ref={containerRef}>
        <div style={{ minWidth: 180 + totalDays * dayWidth }}>
          {/* Header Row: Months + Days */}
          <div className="flex sticky top-0 z-20 bg-[var(--card)] border-b border-[var(--border)]">
            {/* Task name column */}
            <div className="w-[180px] flex-shrink-0 p-2 border-r border-[var(--border)]">
              <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tarea</div>
            </div>
            {/* Timeline header */}
            <div className="flex-1 flex overflow-hidden">
              {dates.map((date, i) => {
                const isFirstOfMonth = date.getDate() === 1;
                const isWeekendDay = isWeekend(date);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r flex flex-col items-center justify-end pb-1 ${isWeekendDay ? 'bg-[var(--af-bg4)]/30' : ''} ${isToday ? 'bg-[var(--af-accent)]/10' : ''}`}
                    style={{ width: dayWidth, borderRight: '1px solid var(--border)' }}
                  >
                    {isFirstOfMonth && (
                      <div className="text-[9px] text-[var(--af-accent)] font-semibold mb-0.5">
                        {date.toLocaleDateString('es-CO', { month: 'short' })}
                      </div>
                    )}
                    {(zoomLevel >= 0.75 || date.getDate() % (zoomLevel < 0.75 ? 3 : 1) === 1) && (
                      <span className={`text-[8px] ${isToday ? 'text-[var(--af-accent)] font-bold' : 'text-[var(--af-text3)]'}`}>
                        {date.getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          {ganttRows.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[var(--af-text3)]">
              <div className="text-center">
                <Layers size={32} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm">Sin tareas con fechas</div>
                <div className="text-[11px] mt-1">Asigna fechas a tus tareas para verlas aquí</div>
              </div>
            </div>
          ) : (
            ganttRows.map((row, idx) => {
              const isCompleted = row.task.data.status === 'Completado';
              const isOverdue = !isCompleted && row.task.data.dueDate && new Date(row.task.data.dueDate) < new Date();
              const progressPct = isCompleted ? 100 : row.task.data.status === 'En progreso' ? 60 : row.task.data.status === 'Revision' ? 85 : 0;
              const barColor = isCompleted ? '#10b981' : isOverdue ? '#ef4444' : row.task.data.status === 'En progreso' ? '#3b82f6' : row.task.data.status === 'Revision' ? '#f59e0b' : row.projColor;
              const barStartX = row.startDay * dayWidth;
              const barWidth = row.duration * dayWidth;

              return (
                <div
                  key={row.task.id}
                  className={`flex items-center border-b transition-colors hover:bg-[var(--af-bg4)]/30 ${idx % 2 === 0 ? 'bg-[var(--card)]/30' : ''}`}
                  style={{ minHeight: 36 }}
                >
                  {/* Task name */}
                  <div className="w-[180px] flex-shrink-0 px-2 py-1.5 border-r border-[var(--border)] flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: row.projColor }} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-medium truncate ${isCompleted ? 'line-through text-[var(--af-text3)]' : ''}`}>
                        {row.task.data.title}
                      </div>
                      <div className="text-[9px] text-[var(--af-text3)] truncate">{row.projName}</div>
                    </div>
                    {row.task.data.assigneeId && (
                      <span className={`w-4 h-4 rounded-full text-[7px] font-semibold flex items-center justify-center flex-shrink-0 ${avatarColor(row.task.data.assigneeId)}`}>
                        {getInitials(getUserName(row.task.data.assigneeId))}
                      </span>
                    )}
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative py-1.5">
                    {/* Weekend backgrounds */}
                    {dates.map((date, i) => isWeekend(date) && (
                      <div key={i} className="absolute top-0 bottom-0 bg-[var(--af-bg4)]/20" style={{ left: i * dayWidth, width: dayWidth }} />
                    ))}

                    {/* Today line */}
                    {todayDay >= 0 && todayDay <= totalDays && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: todayDay * dayWidth + dayWidth / 2 }}>
                        <div className="absolute -top-0 -left-1 w-2 h-2 bg-red-400 rounded-full" />
                      </div>
                    )}

                    {/* Task bar */}
                    {barWidth > 0 && (
                      <div
                        className={`absolute top-[6px] h-[22px] rounded-md cursor-pointer transition-all hover:h-[26px] hover:top-[4px] hover:shadow-lg group/bar ${isOverdue ? 'animate-pulse' : ''}`}
                        style={{
                          left: barStartX,
                          width: Math.max(barWidth, 4),
                          backgroundColor: `${barColor}20`,
                          borderLeft: `3px solid ${barColor}`,
                        }}
                        onClick={(e) => handleTaskClick(row.task, e)}
                        onMouseEnter={(e) => handleTaskHover(row.task, e)}
                        onMouseLeave={() => setTooltipTask(null)}
                      >
                        {/* Progress fill */}
                        <div className="h-full rounded-md transition-all" style={{ width: `${progressPct}%`, backgroundColor: `${barColor}40` }} />
                        {/* Label */}
                        {barWidth > 60 && (
                          <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                            <span className="text-[9px] font-medium truncate" style={{ color: barColor }}>
                              {row.task.data.title}
                            </span>
                          </div>
                        )}
                        {/* Overdue icon */}
                        {isOverdue && barWidth > 20 && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2">
                            <AlertTriangle size={10} className="text-red-400" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltipTask && (
        <div className="fixed z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl p-3 animate-fadeIn pointer-events-none" style={{ left: tooltipPos.x, top: tooltipPos.y - 80 }}>
          <div className="text-[12px] font-semibold max-w-[200px]">{tooltipTask.data.title}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
            {tooltipTask.data.dueDate ? fmtDate(tooltipTask.data.dueDate) : 'Sin fecha'}
            {' · '}
            {tooltipTask.data.priority}
          </div>
          {tooltipTask.data.assigneeId && (
            <div className="text-[10px] text-[var(--af-text3)] mt-0.5">
              {getUserName(tooltipTask.data.assigneeId)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
