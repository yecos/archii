'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { getFirebase, snapToDocs } from '@/lib/firebase-service';
import {
  GANTT_DAY_NAMES,
  GANTT_MONTH_NAMES,
  type GanttZoom,
  GANTT_ZOOM_DAYS,
  getTimelineDays,
  getFullProjectRange,
  getTaskBarPx,
  groupTasksByPhase,
  calculateCriticalPath,
  isMilestone,
  getTaskDependencies,
  generateDependencyArrows,
  getProjectColor,
  getProjectColorLight,
  isToday,
  parseDate,
  formatDateISO,
  addDays,
  GANTT_STATUS_CFG,
} from '@/lib/gantt-helpers';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ZoomIn,
  ZoomOut,
  Link2,
  Link2Off,
  ChevronDown,
  Unlink,
} from 'lucide-react';
import type { Task } from '@/lib/types';

/* ===== CONSTANTS ===== */
const LABEL_WIDTH = 200;
const ROW_HEIGHT = 40;
const MINI_HEIGHT = 32;

/* ===== DRAG STATE ===== */
interface DragState {
  taskId: string;
  startX: number;
  startY: number;
  origStartDate: Date;
  origDueDate: Date;
  moved: boolean;
}

export default function GanttScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const miniTimelineRef = useRef<HTMLDivElement>(null);
  const rowContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(ui.selectedProjectId);
  const [zoom, setZoom] = useState<GanttZoom>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('archiflow-gantt-zoom') as GanttZoom) || 'week';
    }
    return 'week';
  });
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [ghostPos, setGhostPos] = useState<{ left: number; width: number } | null>(null);

  // Load tasks from Firestore
  useEffect(() => {
    const fb = getFirebase();
    const db = fb.firestore();
    const unsub = db.collection('tasks').orderBy('dueDate', 'asc').onSnapshot((snap) => {
      setTasks(snapToDocs(snap) as Task[]);
    }, (err: unknown) => console.error('[ArchiFlow] Gantt: task listen error:', err instanceof Error ? err.message : String(err)));
    return () => unsub();
  }, []);

  // Persist zoom
  useEffect(() => {
    localStorage.setItem('archiflow-gantt-zoom', zoom);
  }, [zoom]);

  // Timeline days
  const timelineDays = useMemo(() => getTimelineDays(zoom, timelineOffset), [zoom, timelineOffset]);

  // Column width: min 30px per day, scales with zoom
  const colWidth = useMemo(() => {
    if (zoom === 'day') return 48;
    if (zoom === 'week') return 28;
    return 8;
  }, [zoom]);

  const totalTimelineWidth = colWidth * timelineDays.length;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    const withDates = tasks.filter(t => t.data?.dueDate);
    if (selectedProjectId) return withDates.filter(t => t.data.projectId === selectedProjectId);
    return withDates;
  }, [tasks, selectedProjectId]);

  // Phase grouping
  const phaseGroups = useMemo(() => groupTasksByPhase(filteredTasks), [filteredTasks]);

  // All visible tasks (respecting collapsed)
  const visibleTasks = useMemo(() => {
    const result: Task[] = [];
    for (const group of phaseGroups) {
      if (!collapsedPhases.has(group.phase)) {
        result.push(...group.tasks);
      }
    }
    return result;
  }, [phaseGroups, collapsedPhases]);

  // Critical path
  const criticalPath = useMemo(() => calculateCriticalPath(visibleTasks), [visibleTasks]);

  // Build flat task list with row indices for dependency arrows
  const taskRowIndex = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const group of phaseGroups) {
      if (!collapsedPhases.has(group.phase)) {
        idx++; // phase header row
        for (const t of group.tasks) {
          map.set(t.id, idx);
          idx++;
        }
      } else {
        idx++; // collapsed phase header still counts
      }
    }
    return map;
  }, [phaseGroups, collapsedPhases]);

  // Compute bar positions for dependency arrows
  const barPositions = useMemo(() => {
    const map = new Map<string, { left: number; width: number; rowIndex: number; rowHeight: number }>();
    for (const t of visibleTasks) {
      const bar = getTaskBarPx(t, timelineDays, colWidth);
      const ri = taskRowIndex.get(t.id);
      if (bar && ri !== undefined) {
        map.set(t.id, { left: bar.left, width: bar.width, rowIndex: ri, rowHeight: ROW_HEIGHT });
      }
    }
    return map;
  }, [visibleTasks, timelineDays, colWidth, taskRowIndex]);

  // Dependency arrows
  const depArrows = useMemo(
    () => generateDependencyArrows(visibleTasks, barPositions),
    [visibleTasks, barPositions],
  );

  // Today position (pixel-based)
  const todayPixel = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const offset = Math.round((Number(now) - Number(timelineDays[0])) / 86400000);
    return offset * colWidth;
  }, [timelineDays, colWidth]);

  // Full project range for mini-timeline
  const projectRange = useMemo(() => getFullProjectRange(filteredTasks), [filteredTasks]);
  const projectTotalDays = Math.max(1, Math.round((Number(projectRange.end) - Number(projectRange.start)) / 86400000));

  // Mini-timeline viewport
  const miniViewport = useMemo(() => {
    const viewStart = timelineDays[0];
    const viewEnd = timelineDays[timelineDays.length - 1];
    const leftPct = Math.max(0, (Number(viewStart) - Number(projectRange.start)) / (Number(projectRange.end) - Number(projectRange.start)) * 100);
    const widthPct = Math.min(100, (Number(viewEnd) - Number(viewStart) + 86400000) / (Number(projectRange.end) - Number(projectRange.start)) * 100);
    return { left: leftPct, width: widthPct };
  }, [timelineDays, projectRange]);

  // Navigation
  const goToday = () => setTimelineOffset(0);
  const prevPeriod = () => {
    const jump = zoom === 'day' ? 14 : zoom === 'week' ? 28 : 90;
    setTimelineOffset(o => o - jump);
  };
  const nextPeriod = () => {
    const jump = zoom === 'day' ? 14 : zoom === 'week' ? 28 : 90;
    setTimelineOffset(o => o + jump);
  };

  // Task click → navigate
  const handleTaskClick = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      ui.setSelectedProjectId(task.data.projectId);
      ui.navigateTo('tasks', task.data.projectId);
    }
  }, [tasks, ui]);

  // Connect mode: click task to set source, click again to create dependency
  const handleTaskConnectClick = useCallback((taskId: string) => {
    if (!connectMode) return;
    if (!connectSource) {
      setConnectSource(taskId);
      ui.showToast('Selecciona la tarea destino');
    } else if (connectSource === taskId) {
      setConnectSource(null);
      ui.showToast('Misma tarea, cancelado');
    } else {
      // Create dependency: connectSource → taskId
      const sourceTask = tasks.find(t => t.id === connectSource);
      if (!sourceTask) return;
      const currentDeps = getTaskDependencies(sourceTask);
      if (currentDeps.includes(taskId)) {
        // Remove dependency
        getFirebase().firestore().collection('tasks').doc(connectSource).update({
          dependencies: currentDeps.filter(d => d !== taskId),
          updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
        });
        ui.showToast('Dependencia eliminada');
      } else {
        // Add dependency
        getFirebase().firestore().collection('tasks').doc(connectSource).update({
          dependencies: [...currentDeps, taskId],
          updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
        });
        ui.showToast('Dependencia creada');
      }
      setConnectSource(null);
    }
  }, [connectMode, connectSource, tasks, ui]);

  // ===== DRAG HANDLERS (PointerEvents) =====
  const handlePointerDown = useCallback((e: React.PointerEvent, task: Task) => {
    if (connectMode) return;
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const startDate = parseDate(task.data.startDate || task.data.dueDate);
    const dueDate = parseDate(task.data.dueDate);
    if (!startDate || !dueDate) return;

    setDragState({
      taskId: task.id,
      startX: e.clientX,
      startY: e.clientY,
      origStartDate: startDate,
      origDueDate: dueDate,
      moved: false,
    });
  }, [connectMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    if (Math.abs(dx) < 4 && !dragState.moved) return;
    if (!dragState.moved) {
      setDragState(prev => prev ? { ...prev, moved: true } : null);
    }

    const daysDragged = Math.round(dx / colWidth);
    if (daysDragged === 0) {
      setGhostPos(null);
      return;
    }

    const newStart = addDays(dragState.origStartDate, daysDragged);
    const newEnd = addDays(dragState.origDueDate, daysDragged);
    const rangeStart = timelineDays[0];
    const startOffset = Math.round((Number(newStart) - Number(rangeStart)) / 86400000);
    const endOffset = Math.round((Number(newEnd) - Number(rangeStart)) / 86400000);
    const left = startOffset * colWidth;
    const width = Math.max(colWidth * 0.5, (endOffset - startOffset + 1) * colWidth);

    setGhostPos({ left, width });
  }, [dragState, colWidth, timelineDays]);

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    if (!dragState || !dragState.moved) {
      setDragState(null);
      setGhostPos(null);
      return;
    }

    const dx = e.clientX - dragState.startX;
    const daysDragged = Math.round(dx / colWidth);
    if (daysDragged !== 0) {
      const newStart = addDays(dragState.origStartDate, daysDragged);
      const newEnd = addDays(dragState.origDueDate, daysDragged);
      try {
        await getFirebase().firestore().collection('tasks').doc(dragState.taskId).update({
          startDate: formatDateISO(newStart),
          dueDate: formatDateISO(newEnd),
          updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
        });
        ui.showToast('Fechas actualizadas');
      } catch (err) {
        console.error('[ArchiFlow] Gantt: drag update failed:', err);
        ui.showToast('Error al actualizar', 'error');
      }
    }

    setDragState(null);
    setGhostPos(null);
  }, [dragState, colWidth, ui]);

  // Mini-timeline drag to scroll
  const [miniDragging, setMiniDragging] = useState(false);
  const handleMiniPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setMiniDragging(true);
    const handleMove = (ev: PointerEvent) => {
      const rect = miniTimelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ev.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      // Convert to offset
      const totalDays = projectTotalDays;
      const viewDays = GANTT_ZOOM_DAYS[zoom];
      const centerDay = Math.round((pct / 100) * totalDays);
      const base = getFullProjectRange(filteredTasks).start;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOffset = Math.round((Number(today) - Number(base)) / 86400000);
      setTimelineOffset(centerDay - Math.round(viewDays / 2) - todayOffset);
    };
    const handleUp = () => {
      setMiniDragging(false);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [zoom, projectTotalDays, filteredTasks]);

  // Synchronized horizontal scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  // Zoom controls
  const zoomIn = () => {
    const levels: GanttZoom[] = ['month', 'week', 'day'];
    const idx = levels.indexOf(zoom);
    if (idx < levels.length - 1) setZoom(levels[idx + 1]);
  };
  const zoomOut = () => {
    const levels: GanttZoom[] = ['month', 'week', 'day'];
    const idx = levels.indexOf(zoom);
    if (idx > 0) setZoom(levels[idx - 1]);
  };

  const zoomLabels: Record<GanttZoom, string> = { day: 'Dia', week: 'Semana', month: 'Mes' };

  // Unique project IDs for legend
  const uniqueProjectIds = useMemo(() => [...new Set(filteredTasks.map(t => t.data.projectId))], [filteredTasks]);

  // Timeline header cells
  const timelineHeaders = useMemo(() => {
    if (zoom === 'day') {
      return timelineDays.map((d, i) => ({
        key: i,
        label: String(d.getDate()),
        subLabel: GANTT_DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1],
        isToday: isToday(d),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        monthStart: d.getDate() === 1 ? GANTT_MONTH_NAMES[d.getMonth()] : null,
      }));
    }
    if (zoom === 'week') {
      // Group by week
      const weeks: { key: number; label: string; subLabel: string; days: Date[]; isToday: boolean }[] = [];
      let currentWeek: Date[] = [];
      for (const d of timelineDays) {
        if (currentWeek.length === 0 || d.getDay() === 1 && currentWeek.length > 0) {
          if (currentWeek.length > 0) {
            weeks.push({
              key: weeks.length,
              label: `${currentWeek[0].getDate()}`,
              subLabel: currentWeek[0].getMonth() !== currentWeek[currentWeek.length - 1].getMonth()
                ? `${GANTT_MONTH_NAMES[currentWeek[0].getMonth()]} - ${GANTT_MONTH_NAMES[currentWeek[currentWeek.length - 1].getMonth()]}`
                : GANTT_MONTH_NAMES[currentWeek[0].getMonth()],
              days: currentWeek,
              isToday: currentWeek.some(isToday),
            });
          }
          currentWeek = [];
        }
        currentWeek.push(d);
      }
      if (currentWeek.length > 0) {
        weeks.push({
          key: weeks.length,
          label: `${currentWeek[0].getDate()}`,
          subLabel: currentWeek[0].getMonth() !== currentWeek[currentWeek.length - 1].getMonth()
            ? `${GANTT_MONTH_NAMES[currentWeek[0].getMonth()]} - ${GANTT_MONTH_NAMES[currentWeek[currentWeek.length - 1].getMonth()]}`
            : GANTT_MONTH_NAMES[currentWeek[0].getMonth()],
          days: currentWeek,
          isToday: currentWeek.some(isToday),
        });
      }
      return weeks;
    }
    // month
    const months: { key: number; label: string; subLabel: string; days: Date[]; isToday: boolean }[] = [];
    let currentMonth: Date[] = [];
    for (const d of timelineDays) {
      if (currentMonth.length === 0 || d.getMonth() !== currentMonth[0].getMonth()) {
        if (currentMonth.length > 0) {
          months.push({
            key: months.length,
            label: GANTT_MONTH_NAMES[currentMonth[0].getMonth()],
            subLabel: String(currentMonth[0].getFullYear()),
            days: currentMonth,
            isToday: currentMonth.some(isToday),
          });
        }
        currentMonth = [];
      }
      currentMonth.push(d);
    }
    if (currentMonth.length > 0) {
      months.push({
        key: months.length,
        label: GANTT_MONTH_NAMES[currentMonth[0].getMonth()],
        subLabel: String(currentMonth[0].getFullYear()),
        days: currentMonth,
        isToday: currentMonth.some(isToday),
      });
    }
    return months;
  }, [timelineDays, zoom]);

  // Remove dependency
  const handleRemoveDep = useCallback((taskId: string, depId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const deps = getTaskDependencies(task);
    getFirebase().firestore().collection('tasks').doc(taskId).update({
      dependencies: deps.filter(d => d !== depId),
      updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
    });
  }, [tasks]);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* ===== HEADER ===== */}
      <div className="card-elevated rounded-xl p-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-semibold mb-1">Diagrama de Gantt</div>
            <div className="text-sm text-[var(--muted-foreground)]">Visualizacion cronologica interactiva de tareas</div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Project selector */}
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

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={prevPeriod}>
              <ChevronLeft size={14} />
            </button>
            <button className="skeuo-badge px-2.5 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80" onClick={goToday}>
              <Calendar size={14} /> Hoy
            </button>
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={nextPeriod}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={zoomOut}>
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-medium text-[var(--af-accent)] min-w-[52px] text-center">{zoomLabels[zoom]}</span>
            <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={zoomIn}>
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Connect mode toggle */}
          <button
            className={`skeuo-badge px-3 py-1.5 rounded text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
              connectMode
                ? 'bg-[var(--af-accent)] text-white shadow-lg'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => { setConnectMode(!connectMode); setConnectSource(null); }}
          >
            {connectMode ? <Link2Off size={14} /> : <Link2 size={14} />}
            {connectMode ? 'Desconectar' : 'Dependencias'}
          </button>

          {/* Date range */}
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {timelineDays[0]?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} —
            {timelineDays[timelineDays.length - 1]?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Connect mode hint */}
        {connectMode && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20 text-xs text-[var(--af-accent)]">
            {connectSource
              ? 'Haz clic en la tarea destino para crear la dependencia (o la misma tarea para cancelar)'
              : 'Haz clic en la tarea origen para crear una dependencia'
            }
          </div>
        )}
      </div>

      {/* ===== LEGEND ===== */}
      {uniqueProjectIds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-1">
          <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Proyectos:</span>
          {uniqueProjectIds.map(pid => {
            const proj = projects.find(p => p.id === pid);
            const color = getProjectColor(pid, projects);
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
          {/* Critical path legend */}
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-3 h-0.5 bg-red-500 rounded" />
            <span className="text-[11px] text-[var(--muted-foreground)]">Ruta critica</span>
          </div>
          {/* Milestone legend */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-500 rotate-45 rounded-[1px]" />
            <span className="text-[11px] text-[var(--muted-foreground)]">Hito</span>
          </div>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📅</div>
          <div className="text-sm">Sin tareas con fecha</div>
          <div className="text-xs mt-1">Las tareas con fecha de vencimiento apareceran en el diagrama</div>
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          {/* ===== MINI TIMELINE ===== */}
          <div
            ref={miniTimelineRef}
            className="px-3 py-2 border-b border-[var(--border)] bg-[var(--skeuo-raised)] cursor-pointer select-none"
            onPointerDown={handleMiniPointerDown}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[var(--muted-foreground)]">VISTA GENERAL</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{filteredTasks.length} tareas</span>
            </div>
            <div className="relative h-3 rounded-full bg-[var(--card)] overflow-hidden">
              {/* Mini task bars */}
              {filteredTasks.map(t => {
                const s = parseDate(t.data.startDate || t.data.dueDate);
                const e = parseDate(t.data.dueDate);
                if (!s || !e) return null;
                const startPct = Math.max(0, (Number(s) - Number(projectRange.start)) / (Number(projectRange.end) - Number(projectRange.start)) * 100);
                const widthPct = Math.max(0.3, ((Number(e) - Number(s)) / 86400000 + 1) / projectTotalDays * 100);
                const color = getProjectColor(t.data.projectId, projects);
                return (
                  <div
                    key={t.id}
                    className="absolute top-0.5 h-2 rounded-sm opacity-70"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: color,
                    }}
                  />
                );
              })}
              {/* Viewport indicator */}
              <div
                className="absolute top-0 h-full border-2 border-[var(--af-accent)] rounded-full bg-[var(--af-accent)]/10 transition-all"
                style={{
                  left: `${miniViewport.left}%`,
                  width: `${miniViewport.width}%`,
                }}
              />
            </div>
          </div>

          {/* ===== TIMELINE HEADER ===== */}
          <div className="flex border-b border-[var(--border)] sticky top-0 z-20 bg-[var(--card)]">
            {/* Labels column header */}
            <div className="shrink-0 px-3 py-2 border-r border-[var(--border)] bg-[var(--skeuo-raised)] flex items-center" style={{ width: LABEL_WIDTH }}>
              <span className="text-[11px] font-medium text-[var(--muted-foreground)]">TAREAS ({filteredTasks.length})</span>
            </div>
            {/* Timeline header */}
            <div ref={timelineRef} className="flex-1 overflow-hidden">
              <div className="flex" style={{ width: totalTimelineWidth }}>
                {zoom === 'week' || zoom === 'month' ? (
                  // Grouped headers
                  timelineHeaders.map(h => {
                    const w = (h as { days: Date[] }).days.length * colWidth;
                    return (
                      <div
                        key={h.key}
                        className={`shrink-0 text-center py-2 border-r border-[var(--border)] last:border-r-0 ${
                          h.isToday ? 'bg-[var(--af-accent)]/5' : ''
                        }`}
                        style={{ width: w }}
                      >
                        <div className={`text-[10px] ${h.isToday ? 'text-[var(--af-accent)] font-semibold' : 'text-[var(--muted-foreground)]'}`}>
                          {h.subLabel}
                        </div>
                        <div className={`text-[13px] font-semibold ${h.isToday ? 'text-[var(--af-accent)]' : 'text-[var(--foreground)]'}`}>
                          {h.label}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Day-level headers
                  timelineDays.map((d, i) => (
                    <div
                      key={i}
                      className={`shrink-0 text-center py-2 border-r border-[var(--border)] last:border-r-0 ${
                        isToday(d) ? 'bg-[var(--af-accent)]/5' : ''
                      } ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-[var(--muted-foreground)]/[0.03]' : ''}`}
                      style={{ width: colWidth }}
                    >
                      <div className={`text-[9px] ${isToday(d) ? 'text-[var(--af-accent)] font-semibold' : 'text-[var(--muted-foreground)]'}`}>
                        {GANTT_DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                      </div>
                      <div className={`text-[12px] font-semibold ${isToday(d) ? 'text-[var(--af-accent)]' : 'text-[var(--foreground)]'}`}>
                        {d.getDate()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ===== GANTT ROWS ===== */}
          <div
            ref={rowContainerRef}
            className="max-h-[60vh] overflow-y-auto overflow-x-auto"
            onScroll={handleScroll}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="flex" style={{ minWidth: totalTimelineWidth + LABEL_WIDTH }}>
              {/* Labels column */}
              <div className="shrink-0 border-r border-[var(--border)] bg-[var(--card)]" style={{ width: LABEL_WIDTH }}>
                {phaseGroups.map(group => (
                  <div key={group.phase}>
                    {/* Phase header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--af-accent)]/[0.03] transition-colors"
                      style={{ borderLeft: `3px solid ${group.color}`, height: ROW_HEIGHT }}
                      onClick={() => {
                        setCollapsedPhases(prev => {
                          const next = new Set(prev);
                          if (next.has(group.phase)) next.delete(group.phase);
                          else next.add(group.phase);
                          return next;
                        });
                      }}
                    >
                      {collapsedPhases.has(group.phase) ? (
                        <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                      )}
                      <span className="text-[12px] font-semibold text-[var(--foreground)] truncate">{group.phase}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto shrink-0">{group.progress}%</span>
                    </div>
                    {/* Phase progress bar (collapsed state shows summary) */}
                    {collapsedPhases.has(group.phase) && (
                      <div className="px-3 py-1 border-b border-[var(--border)]">
                        <div className="h-1 rounded-full bg-[var(--muted-foreground)]/10 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${group.progress}%`, backgroundColor: group.color }} />
                        </div>
                      </div>
                    )}
                    {/* Task labels */}
                    {!collapsedPhases.has(group.phase) && group.tasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--af-accent)]/[0.03] transition-colors cursor-pointer"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => connectMode ? handleTaskConnectClick(task.id) : handleTaskClick(task.id)}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(task.data.projectId, projects) }} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] font-medium truncate ${
                            connectSource === task.id ? 'text-[var(--af-accent)]' :
                            criticalPath.has(task.id) ? 'text-red-400' :
                            'text-[var(--foreground)]'
                          }`}>
                            {task.data.title}
                          </div>
                          {connectMode && getTaskDependencies(task).length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Link2 size={9} className="text-[var(--af-accent)]" />
                              <span className="text-[9px] text-[var(--af-accent)]">{getTaskDependencies(task).length} dep</span>
                            </div>
                          )}
                        </div>
                        {/* Dependency indicator */}
                        {getTaskDependencies(task).length > 0 && !connectMode && (
                          <Link2 size={11} className="text-[var(--af-accent)]/50 shrink-0" />
                        )}
                        {isMilestone(task) && (
                          <div className="w-2.5 h-2.5 bg-amber-500 rotate-45 rounded-[1px] shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative" style={{ width: totalTimelineWidth }}>
                {/* Dependency arrows SVG layer */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: totalTimelineWidth, height: (phaseGroups.reduce((s, g) => s + 1 + (collapsedPhases.has(g.phase) ? 0 : g.tasks.length), 0)) * ROW_HEIGHT + 100 }}>
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="var(--af-accent)" opacity="0.6" />
                    </marker>
                    <marker id="arrowhead-critical" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#ef4444" opacity="0.8" />
                    </marker>
                  </defs>
                  {depArrows.map(arrow => {
                    const isCritical = criticalPath.has(arrow.fromTaskId) && criticalPath.has(arrow.toTaskId);
                    return (
                      <path
                        key={`${arrow.fromTaskId}-${arrow.toTaskId}`}
                        d={arrow.path}
                        fill="none"
                        stroke={isCritical ? '#ef4444' : 'var(--af-accent)'}
                        strokeWidth={isCritical ? 2 : 1.5}
                        strokeDasharray={isCritical ? 'none' : '4 3'}
                        opacity={isCritical ? 0.8 : 0.5}
                        markerEnd={isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
                      />
                    );
                  })}
                </svg>

                {/* Today line */}
                {todayPixel >= 0 && todayPixel <= totalTimelineWidth && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] z-10 pointer-events-none"
                    style={{
                      left: todayPixel,
                      background: 'repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 6px, transparent 6px, transparent 10px)',
                    }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                  </div>
                )}

                {/* Phase rows and task bars */}
                {phaseGroups.map(group => (
                  <div key={group.phase}>
                    {/* Phase header row (timeline area - shows phase bar) */}
                    <div
                      className="relative border-b border-[var(--border)]"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Phase aggregate bar */}
                      {!collapsedPhases.has(group.phase) && (() => {
                        const phaseTasks = group.tasks;
                        if (phaseTasks.length === 0) return null;
                        let minLeft = Infinity, maxRight = -Infinity;
                        for (const t of phaseTasks) {
                          const bar = getTaskBarPx(t, timelineDays, colWidth);
                          if (bar) {
                            if (bar.left < minLeft) minLeft = bar.left;
                            if (bar.left + bar.width > maxRight) maxRight = bar.left + bar.width;
                          }
                        }
                        if (minLeft === Infinity) return null;
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-30"
                            style={{
                              left: minLeft,
                              width: maxRight - minLeft,
                              backgroundColor: group.color,
                            }}
                          />
                        );
                      })()}
                      {/* Phase progress bar (in timeline area) */}
                      {!collapsedPhases.has(group.phase) && (() => {
                        const phaseTasks = group.tasks;
                        if (phaseTasks.length === 0) return null;
                        const completedTasks = phaseTasks.filter(t => t.data.status === 'Completado');
                        let minLeft = Infinity, maxRight = -Infinity;
                        for (const t of phaseTasks) {
                          const bar = getTaskBarPx(t, timelineDays, colWidth);
                          if (bar) {
                            if (bar.left < minLeft) minLeft = bar.left;
                            if (bar.left + bar.width > maxRight) maxRight = bar.left + bar.width;
                          }
                        }
                        if (minLeft === Infinity) return null;
                        const fullWidth = maxRight - minLeft;
                        const completedWidth = fullWidth * (completedTasks.length / phaseTasks.length);
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full"
                            style={{
                              left: minLeft,
                              width: completedWidth,
                              backgroundColor: group.color,
                              opacity: 0.5,
                            }}
                          />
                        );
                      })()}
                    </div>

                    {/* Task rows */}
                    {!collapsedPhases.has(group.phase) && group.tasks.map(task => {
                      const bar = getTaskBarPx(task, timelineDays, colWidth);
                      const color = getProjectColor(task.data.projectId, projects);
                      const lightColor = getProjectColorLight(task.data.projectId, projects);
                      const isCrit = criticalPath.has(task.id);
                      const isMile = isMilestone(task);
                      const isDragTarget = dragState?.taskId === task.id;
                      const isConnectTarget = connectSource === task.id;
                      const statusCfg = GANTT_STATUS_CFG[task.data.status];
                      const taskDeps = getTaskDependencies(task);

                      return (
                        <div
                          key={task.id}
                          className={`relative border-b border-[var(--border)] last:border-b-0 transition-colors ${
                            hoveredTask === task.id ? 'bg-[var(--af-accent)]/[0.04]' : ''
                          } ${isConnectTarget ? 'bg-[var(--af-accent)]/[0.08]' : ''}`}
                          style={{ height: ROW_HEIGHT }}
                          onMouseEnter={() => setHoveredTask(task.id)}
                          onMouseLeave={() => setHoveredTask(null)}
                        >
                          {/* Progress fill behind bar */}
                          {bar && task.data.progress && task.data.progress > 0 && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md opacity-30"
                              style={{
                                left: bar.left,
                                width: bar.width * (task.data.progress / 100),
                                backgroundColor: color,
                              }}
                            />
                          )}

                          {/* Task bar */}
                          {bar && !isMile && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-md select-none flex items-center gap-1 transition-shadow ${
                                connectMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                              } ${isDragTarget ? 'opacity-40' : ''}`}
                              style={{
                                left: bar.left,
                                width: bar.width,
                                backgroundColor: statusCfg?.bg || lightColor,
                                borderLeft: `3px solid ${color}`,
                                borderWidth: isCrit ? '0' : undefined,
                                border: isCrit
                                  ? `2px solid #ef4444`
                                  : `undefined`,
                                borderLeftWidth: isCrit ? '3px' : '3px',
                                borderLeftColor: isCrit ? '#ef4444' : color,
                                boxShadow: isCrit ? '0 0 8px rgba(239,68,68,0.15)' : undefined,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (connectMode) handleTaskConnectClick(task.id);
                                else handleTaskClick(task.id);
                              }}
                              onPointerDown={(e) => handlePointerDown(e, task)}
                              title={`${task.data.title}\n${task.data.startDate || ''} → ${task.data.dueDate}\n${task.data.status}${isCrit ? '\nRuta critica' : ''}${taskDeps.length > 0 ? `\n${taskDeps.length} dependencia(s)` : ''}`}
                            >
                              {bar.width > 60 && (
                                <span className="text-[10px] font-medium truncate text-[var(--foreground)] px-1" style={{ color }}>
                                  {task.data.title}
                                </span>
                              )}
                              {/* Status dot */}
                              {statusCfg && (
                                <div
                                  className="w-2 h-2 rounded-full shrink-0 mr-1"
                                  style={{ backgroundColor: statusCfg.color }}
                                />
                              )}
                            </div>
                          )}

                          {/* Milestone diamond */}
                          {isMile && bar && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rotate-45 rounded-[2px] cursor-pointer ${
                                connectMode ? 'cursor-crosshair' : ''
                              } ${isCrit ? 'ring-2 ring-red-400/50' : ''}`}
                              style={{
                                left: bar.left + bar.width / 2 - 10,
                                backgroundColor: task.data.priority === 'Urgente' ? '#ef4444' : '#f59e0b',
                                border: '2px solid white',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (connectMode) handleTaskConnectClick(task.id);
                                else handleTaskClick(task.id);
                              }}
                              title={`${task.data.title}\nHito${task.data.priority === 'Urgente' ? ' (Urgente)' : ''}`}
                            />
                          )}

                          {/* Dependency source indicator (pulsing ring) */}
                          {isConnectTarget && bar && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 rounded-md border-2 border-[var(--af-accent)] animate-pulse pointer-events-none"
                              style={{
                                left: (bar?.left || 0) - 2,
                                width: (bar?.width || 20) + 4,
                                height: 32,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Ghost bar (drag preview) */}
                {ghostPos && dragState && (
                  <div
                    className="absolute top-0 h-full pointer-events-none z-30"
                    style={{ left: ghostPos.left, width: ghostPos.width }}
                  >
                    <div
                      className="absolute top-0 h-full bg-[var(--af-accent)]/20 border-2 border-dashed border-[var(--af-accent)] rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK DETAIL POPUP (hovered task) ===== */}
      {hoveredTask && !connectMode && !dragState && (() => {
        const task = filteredTasks.find(t => t.id === hoveredTask);
        if (!task) return null;
        const taskDeps = getTaskDependencies(task);
        return (
          <div className="card-glass-subtle rounded-xl p-3 max-w-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--foreground)]">{task.data.title}</div>
              <div className="flex items-center gap-1">
                {criticalPath.has(task.id) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Ruta critica</span>
                )}
                {isMilestone(task) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">Hito</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[var(--muted-foreground)]">Estado:</span>
                <span className="ml-1 font-medium" style={{ color: GANTT_STATUS_CFG[task.data.status]?.color }}>
                  {GANTT_STATUS_CFG[task.data.status]?.label || task.data.status}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Prioridad:</span>
                <span className="ml-1 font-medium">{task.data.priority}</span>
              </div>
              {task.data.startDate && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Inicio:</span>
                  <span className="ml-1">{task.data.startDate}</span>
                </div>
              )}
              {task.data.dueDate && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Fin:</span>
                  <span className="ml-1">{task.data.dueDate}</span>
                </div>
              )}
              {task.data.progress !== undefined && task.data.progress > 0 && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted-foreground)]">Progreso:</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--muted-foreground)]/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: `${task.data.progress}%` }} />
                    </div>
                    <span className="font-medium">{task.data.progress}%</span>
                  </div>
                </div>
              )}
            </div>
            {/* Dependencies list */}
            {taskDeps.length > 0 && (
              <div className="border-t border-[var(--border)] pt-2">
                <div className="text-[10px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                  <Link2 size={10} /> Dependencias ({taskDeps.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {taskDeps.map(depId => {
                    const depTask = tasks.find(t => t.id === depId);
                    return depTask ? (
                      <span key={depId} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">
                        {depTask.data.title}
                        <button
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                          onClick={() => handleRemoveDep(task.id, depId)}
                        >
                          <Unlink size={10} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== SUMMARY STATS ===== */}
      {filteredTasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(() => {
            const total = filteredTasks.length;
            const completed = filteredTasks.filter(t => t.data.status === 'Completado').length;
            const inProgress = filteredTasks.filter(t => t.data.status === 'En progreso' || t.data.status === 'En revisión').length;
            const overdue = filteredTasks.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date() && t.data.status !== 'Completado').length;
            const critical = criticalPath.size;
            return [
              { label: 'Total Tareas', value: total, icon: '📋', color: 'text-[var(--af-accent)]' },
              { label: 'En Progreso', value: inProgress, icon: '⚡', color: 'text-blue-400' },
              { label: 'Completadas', value: completed, icon: '✅', color: 'text-emerald-400' },
              { label: 'Vencidas', value: overdue, icon: '⚠️', color: 'text-red-400' },
              { label: 'Ruta Critica', value: critical, icon: '🔥', color: 'text-orange-400' },
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

      {/* Empty state for no tasks at all */}
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
