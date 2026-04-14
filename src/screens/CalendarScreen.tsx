'use client';
import React, { useState, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useCalendar } from '@/hooks/useDomain';
import { useIsMobile } from '@/hooks/use-mobile';
import { prioColor, taskStColor } from '@/lib/helpers';
import { MESES, DIAS_SEMANA } from '@/lib/types';
import { expandMeetingForMonth } from '@/lib/recurrence';
import { Repeat, ChevronLeft, ChevronRight, Clock, FolderOpen } from 'lucide-react';

/* ===== Helpers ===== */

function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime12(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/* ===== Constants ===== */

const SLOT_H = 40; // px per 30-min time slot
const START_HOUR = 7;
const END_HOUR = 21;

// Build time labels: 7:00, 7:30, 8:00, ..., 21:00
const TIME_SLOTS: string[] = [];
for (let h = START_HOUR; h <= END_HOUR; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < END_HOUR) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

/* ===== Component ===== */

export default function CalendarScreen() {
  const { openModal, setEditingId, setForms, calView, setCalView } = useUI();
  const { getUserName } = useAuth();
  const { projects, tasks } = useFirestore();
  const {
    calFilterProject, calMonth, calSelectedDate, calYear,
    setCalFilterProject, setCalMonth, setCalSelectedDate, setCalYear,
    meetings, expandedMeetings, deleteMeeting, openEditMeeting,
  } = useCalendar();

  /* ----- state ----- */
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const isMobile = useIsMobile();

  /* ----- common computed ----- */
  const today = new Date();
  const todayOnly = new Date(new Date().toDateString());
  const todayStr = today.toISOString().split('T')[0];

  const calTasks = tasks.filter(
    t =>
      t.data.dueDate &&
      t.data.status !== 'Completado' &&
      (calFilterProject === 'all' || t.data.projectId === calFilterProject),
  );

  /* ----- weekly view computed ----- */
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const weeklyExpandedMeetings = useMemo(() => {
    const weekDateStrs = weekDays.map(formatDateISO);
    // Collect unique month/year pairs covered by this week
    const monthYearSet = new Set<string>();
    for (const d of weekDays) {
      monthYearSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    const results: Array<{ date: string; meeting: any; isRecurring: boolean }> = [];
    for (const key of monthYearSet) {
      const [yStr, mStr] = key.split('-');
      const y = parseInt(yStr);
      const m = parseInt(mStr);
      for (const mt of meetings) {
        const expanded = expandMeetingForMonth(
          mt as { id: string; data: Record<string, any> },
          y,
          m,
        );
        results.push(...expanded);
      }
    }
    return results.filter(e => weekDateStrs.includes(e.date));
  }, [weekDays, meetings]);

  /* ----- weekly view label ----- */
  const weekEnd = weekDays[6];
  const weekLabel = (() => {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
    const ms = MESES[weekStart.getMonth()].substring(0, 3);
    const me = MESES[weekEnd.getMonth()].substring(0, 3);
    if (sameMonth) return `${weekStart.getDate()} – ${weekEnd.getDate()} ${ms} ${weekStart.getFullYear()}`;
    if (sameYear) return `${weekStart.getDate()} ${ms} – ${weekEnd.getDate()} ${me} ${weekStart.getFullYear()}`;
    return `${weekStart.getDate()} ${ms} ${weekStart.getFullYear()} – ${weekEnd.getDate()} ${me} ${weekEnd.getFullYear()}`;
  })();

  /* ----- monthly view computed ----- */
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getTasksForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calTasks.filter(t => t.data.dueDate === dateStr);
  };
  const getExpandedMeetingsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return expandedMeetings.filter(e => e.date === dateStr);
  };

  /* ----- selected day detail (shared) ----- */
  const selectedDayTasks = calSelectedDate
    ? calTasks.filter(t => t.data.dueDate === calSelectedDate)
    : [];
  const selectedDayMeetings = calSelectedDate
    ? (calView === 'weekly' ? weeklyExpandedMeetings : expandedMeetings).filter(
        e => e.date === calSelectedDate,
      )
    : [];

  /* ----- navigation handlers ----- */
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
    setCalSelectedDate(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
    setCalSelectedDate(null);
  };
  const prevWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setCalSelectedDate(null);
  };
  const nextWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setCalSelectedDate(null);
  };
  const goToday = () => {
    const now = new Date();
    if (calView === 'weekly') {
      setWeekStart(getMonday(now));
    } else {
      setCalMonth(now.getMonth());
      setCalYear(now.getFullYear());
    }
    setCalSelectedDate(formatDateISO(now));
  };

  /* ----- open new meeting with today / selected date ----- */
  const openNewMeeting = () => {
    setEditingId(null);
    setForms(p => ({
      ...p,
      meetTitle: '',
      meetProject: '',
      meetDate: calSelectedDate || todayStr,
      meetTime: '09:00',
      meetDuration: '60',
      meetDesc: '',
      meetAttendees: '',
      meetRecurrence: 'none',
      meetRecurrenceEnd: '',
    }));
    openModal('meeting');
  };

  /* ===== Render ===== */

  return (
    <div className="animate-fadeIn">
      {/* ===== Calendar Header ===== */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-colors"
            onClick={calView === 'weekly' ? prevWeek : prevMonth}
          >
            <ChevronLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
          <div className="text-[15px] font-semibold min-w-[120px] sm:min-w-[160px] text-center">
            {calView === 'weekly' ? weekLabel : `${MESES[calMonth]} ${calYear}`}
          </div>
          <button
            className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-colors"
            onClick={calView === 'weekly' ? nextWeek : nextMonth}
          >
            <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              className={`text-[11px] px-3 py-1.5 cursor-pointer transition-colors ${
                calView === 'monthly'
                  ? 'bg-[var(--af-accent)] text-background font-semibold'
                  : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
              }`}
              onClick={() => setCalView('monthly')}
            >
              Mensual
            </button>
            <button
              className={`text-[11px] px-3 py-1.5 cursor-pointer transition-colors border-l border-[var(--border)] ${
                calView === 'weekly'
                  ? 'bg-[var(--af-accent)] text-background font-semibold'
                  : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
              }`}
              onClick={() => setCalView('weekly')}
            >
              Semanal
            </button>
          </div>
          <select
            className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--foreground)] outline-none cursor-pointer"
            value={calFilterProject}
            onChange={e => setCalFilterProject(e.target.value)}
          >
            <option value="all">Todos los proyectos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.data.name}
              </option>
            ))}
          </select>
          <button
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors"
            onClick={goToday}
          >
            Hoy
          </button>
        </div>
      </div>

      {/* ===== Stats row ===== */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border border-purple-500/20"
            onClick={openNewMeeting}
          >
            + Reunión
          </button>
          <span className="text-[11px] text-purple-400/70">
            {expandedMeetings.length} este mes
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-red-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-red-400">
            {calTasks.filter(t => t.data.priority === 'Alta').length}
          </div>
          <div className="text-[9px] text-red-400/70">Urgentes</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-amber-400">
            {calTasks.filter(t => {
              const d = t.data.dueDate;
              return d && new Date(d) < todayOnly;
            }).length}
          </div>
          <div className="text-[9px] text-amber-400/70">Vencidas</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-blue-400">
            {calTasks.filter(t => {
              const d = t.data.dueDate;
              if (!d) return false;
              const diff = Math.ceil(
                (new Date(d).getTime() - today.getTime()) / 86400000,
              );
              return diff >= 0 && diff <= 7;
            }).length}
          </div>
          <div className="text-[9px] text-blue-400/70">Esta semana</div>
        </div>
      </div>

      {/* ===== Calendar Grid ===== */}
      {calView === 'weekly' ? (
        /* ========== WEEKLY VIEW ========== */
        isMobile ? (
          /* ----- Mobile: single-day agenda ----- */
          <div className="space-y-3">
            {/* Horizontal scrollable day chips */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {weekDays.map((day, i) => {
                  const ds = formatDateISO(day);
                  const isToday = ds === todayStr;
                  const isSelected = calSelectedDate === ds;
                  return (
                    <button
                      key={i}
                      className={`flex flex-col items-center min-w-[48px] px-2 py-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--af-accent)] text-background'
                          : isToday
                            ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30'
                            : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
                      }`}
                      onClick={() => setCalSelectedDate(ds)}
                    >
                      <span className="text-[9px] font-semibold uppercase leading-none">
                        {DIAS_SEMANA[i]}
                      </span>
                      <span className="text-base font-bold mt-1 leading-none">
                        {day.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda list for the selected day */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              {(() => {
                const selDate = calSelectedDate || todayStr;
                const selDayTasks = calTasks.filter(t => t.data.dueDate === selDate);
                const selDayMeetings = weeklyExpandedMeetings
                  .filter(e => e.date === selDate)
                  .sort((a, b) => (a.meeting.data.time || '').localeCompare(b.meeting.data.time || ''));
                const hasEvents = selDayTasks.length > 0 || selDayMeetings.length > 0;

                if (!hasEvents) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
                      <div className="text-3xl mb-2 opacity-50">📅</div>
                      <div className="text-[13px] font-medium">Sin eventos</div>
                      <div className="text-[11px] mt-0.5 opacity-70">
                        {(() => {
                          const parts = selDate.split('-');
                          return `${parseInt(parts[2])} de ${MESES[parseInt(parts[1]) - 1]}`;
                        })()}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-[var(--border)]">
                    {/* Meetings first, then tasks */}
                    {selDayMeetings.map((e, i) => {
                      const m = e.meeting;
                      const meetProj = projects.find(p => p.id === m.data.projectId);
                      const time = m.data.time || '09:00';
                      const duration = parseInt(String(m.data.duration || 60)) || 60;
                      const [h, startMin] = time.split(':').map(Number);
                      const totalEndMin = h * 60 + startMin + duration;
                      const endH = Math.floor(totalEndMin / 60);
                      const endM = totalEndMin % 60;
                      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                      return (
                        <div
                          key={`mob-meet-${m.id}-${e.date}-${i}`}
                          className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--af-bg3)]/50 transition-colors"
                          onClick={() => openEditMeeting(m)}
                        >
                          {/* Purple left indicator */}
                          <div className="w-1 rounded-full bg-purple-500 flex-shrink-0" />
                          {/* Time column */}
                          <div className="flex flex-col items-center w-12 flex-shrink-0">
                            <Clock size={12} className="text-purple-400/60 mb-0.5" />
                            <span className="text-[10px] font-semibold text-[var(--foreground)] leading-tight">
                              {formatTime12(time)}
                            </span>
                            <span className="text-[9px] text-[var(--muted-foreground)] leading-tight">
                              {formatTime12(endTime)}
                            </span>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {e.isRecurring && <Repeat size={11} className="text-purple-400/70 flex-shrink-0" />}
                              <span className="text-[13px] font-medium truncate">{m.data.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {meetProj && (
                                <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                                  <FolderOpen size={10} />{meetProj.data.name}
                                </span>
                              )}
                              <span className="text-[9px] text-purple-400/70">{duration} min</span>
                            </div>
                            {m.data.attendees && m.data.attendees.length > 0 && (
                              <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5">
                                👥 {Array.isArray(m.data.attendees) ? m.data.attendees.length : String(m.data.attendees).split(',').length} asistentes
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {selDayTasks.length > 0 && selDayMeetings.length > 0 && (
                      <div className="px-4 py-2 bg-[var(--af-bg3)]/20">
                        <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                          Tareas ({selDayTasks.length})
                        </span>
                      </div>
                    )}

                    {selDayTasks
                      .sort((a, b) => {
                        const pOrder = { Alta: 0, Media: 1, Baja: 2 };
                        return (pOrder[a.data.priority as keyof typeof pOrder] || 1) - (pOrder[b.data.priority as keyof typeof pOrder] || 1);
                      })
                      .map(t => {
                        const proj = projects.find(p => p.id === t.data.projectId);
                        const isOverdue = new Date(t.data.dueDate) < todayOnly;
                        const borderColor =
                          t.data.priority === 'Alta'
                            ? 'bg-red-500'
                            : t.data.priority === 'Media'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500';

                        return (
                          <div
                            key={`mob-task-${t.id}`}
                            className="flex gap-3 px-4 py-3"
                          >
                            {/* Priority-colored left indicator */}
                            <div className={`w-1 rounded-full ${borderColor} flex-shrink-0`} />
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isOverdue && <span className="text-[11px]">⚡</span>}
                                <span className="text-[13px] font-medium truncate">{t.data.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {proj && (
                                  <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                                    <FolderOpen size={10} />{proj.data.name}
                                  </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>
                                  {t.data.priority}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>
                                  {t.data.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-[var(--muted-foreground)]">
                                  👤 {getUserName(t.data.assigneeId)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
        /* ----- Desktop: 7-day grid ----- */
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Day header row */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)]">
            {/* Corner cell */}
            <div className="p-1.5 flex items-center justify-center">
              <span className="text-[9px] text-[var(--muted-foreground)] font-semibold uppercase">Hora</span>
            </div>
            {weekDays.map((day, i) => {
              const ds = formatDateISO(day);
              const isToday = ds === todayStr;
              const isSelected = calSelectedDate === ds;
              return (
                <div
                  key={i}
                  className={`py-2 text-center cursor-pointer transition-colors ${
                    isToday
                      ? 'bg-[var(--af-accent)]/10'
                      : isSelected
                        ? 'bg-[var(--af-accent)]/7'
                        : 'hover:bg-[var(--af-bg3)]'
                  }`}
                  onClick={() => setCalSelectedDate(ds)}
                >
                  <div className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    {DIAS_SEMANA[i]}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      isToday
                        ? 'w-8 h-8 rounded-full bg-[var(--af-accent)] text-background flex items-center justify-center mx-auto'
                        : 'text-[var(--foreground)]'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {/* Time labels column */}
              <div className="border-r border-[var(--border)] bg-[var(--af-bg3)]/30">
                {TIME_SLOTS.map(time => (
                  <div
                    key={time}
                    className="flex items-start justify-end pr-2 border-b border-[var(--border)]/40"
                    style={{ height: `${SLOT_H}px` }}
                  >
                    <span className="text-[9px] text-[var(--muted-foreground)] leading-none mt-1">
                      {formatTime12(time)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, i) => {
                const ds = formatDateISO(day);
                const isToday = ds === todayStr;
                const isSelected = calSelectedDate === ds;
                const dayTasks = calTasks.filter(t => t.data.dueDate === ds);
                const dayMeetings = weeklyExpandedMeetings.filter(e => e.date === ds);

                return (
                  <div
                    key={i}
                    className={`border-r border-[var(--border)] relative ${
                      isToday ? 'bg-[var(--af-accent)]/5' : ''
                    } ${isSelected && !isToday ? 'bg-[var(--af-bg3)]/30' : ''}`}
                  >
                    {/* All-day tasks section */}
                    <div className="border-b border-[var(--border)] px-0.5 py-0.5 bg-[var(--af-bg3)]/20" style={{ minHeight: '28px' }}>
                      {dayTasks.length > 0 && (
                        <div className="space-y-px">
                          {dayTasks.slice(0, 2).map(t => {
                            const isOverdue = new Date(t.data.dueDate) < todayOnly;
                            return (
                              <div
                                key={t.id}
                                className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate ${
                                  t.data.priority === 'Alta'
                                    ? 'bg-red-500/15 text-red-400'
                                    : t.data.priority === 'Media'
                                      ? 'bg-amber-500/15 text-amber-400'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                }`}
                                title={t.data.title}
                              >
                                {isOverdue ? '⚡ ' : ''}
                                {t.data.title}
                              </div>
                            );
                          })}
                          {dayTasks.length > 2 && (
                            <div className="text-[7px] text-[var(--muted-foreground)] pl-1">
                              +{dayTasks.length - 2} más
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Time grid with meeting blocks */}
                    <div className="relative">
                      {/* Horizontal grid lines */}
                      {TIME_SLOTS.map(time => (
                        <div
                          key={time}
                          className="border-b border-[var(--border)]/30"
                          style={{ height: `${SLOT_H}px` }}
                        />
                      ))}

                      {/* Meeting blocks */}
                      {dayMeetings.map((e, mi) => {
                        const time = e.meeting.data.time || '09:00';
                        const duration = e.meeting.data.duration || 60;
                        const [h, m] = time.split(':').map(Number);
                        const startMin = (h - START_HOUR) * 60 + m;
                        const top = Math.max(0, (startMin / 30) * SLOT_H);
                        const height = Math.max(20, (duration / 30) * SLOT_H);
                        const showTime = height >= 36;

                        return (
                          <div
                            key={`${e.meeting.id}-${e.date}-${mi}`}
                            className="absolute left-0.5 right-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 px-1 py-0.5 overflow-hidden cursor-pointer hover:bg-purple-500/30 transition-colors z-10"
                            style={{ top: `${top}px`, height: `${height}px` }}
                            title={`${e.meeting.data.title} (${time} · ${duration} min)`}
                            onClick={ev => {
                              ev.stopPropagation();
                              openEditMeeting(e.meeting);
                            }}
                          >
                            <div className="text-[9px] font-semibold text-purple-300 truncate leading-tight">
                              {e.isRecurring && <Repeat size={8} className="inline mr-0.5 -mt-px" />}
                              {e.meeting.data.title}
                            </div>
                            {showTime && (
                              <div className="text-[8px] text-purple-400/80 leading-tight">
                                {formatTime12(time)} · {duration}m
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Now indicator line */}
                      {isToday && (() => {
                        const now = new Date();
                        const nowMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
                        const nowTop = (nowMin / 30) * SLOT_H;
                        if (nowTop < 0 || nowTop > TIME_SLOTS.length * SLOT_H) return null;
                        return (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: `${nowTop}px` }}
                          >
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )
      ) : (
        /* ========== MONTHLY VIEW (unchanged) ========== */
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DIAS_SEMANA.map(d => (
              <div
                key={d}
                className="py-2.5 text-center text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null)
                return (
                  <div
                    key={`e-${idx}`}
                    className="min-h-[70px] sm:min-h-[90px] border-b border-r border-[var(--border)] bg-[var(--af-bg3)]/30"
                  />
                );
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday =
                day === today.getDate() &&
                calMonth === today.getMonth() &&
                calYear === today.getFullYear();
              const isSelected = calSelectedDate === dateStr;
              const dayTasks = getTasksForDay(day);
              const dayMeetings = getExpandedMeetingsForDay(day);
              const isPast = new Date(dateStr) < new Date(today.toISOString().split('T')[0]);
              return (
                <div
                  key={day}
                  className={`min-h-[70px] sm:min-h-[90px] border-b border-r border-[var(--border)] p-1 sm:p-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--af-accent)]/10'
                      : 'hover:bg-[var(--af-bg3)]'
                  } ${isPast && !isToday ? 'opacity-70' : ''}`}
                  onClick={() => setCalSelectedDate(dateStr)}
                >
                  <div
                    className={`text-[11px] sm:text-[13px] font-medium mb-0.5 ${
                      isToday
                        ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--af-accent)] text-background flex items-center justify-center'
                        : 'text-[var(--foreground)]'
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => {
                      const proj = projects.find(p => p.id === t.data.projectId);
                      const isOverdue = new Date(t.data.dueDate) < todayOnly;
                      return (
                        <div
                          key={t.id}
                          className={`text-[8px] sm:text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                            t.data.priority === 'Alta'
                              ? 'bg-red-500/15 text-red-400'
                              : t.data.priority === 'Media'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                          title={t.data.title}
                        >
                          {isOverdue ? '⚡ ' : ''}
                          {t.data.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[8px] text-[var(--muted-foreground)] pl-1">
                        +{dayTasks.length - 3} más
                      </div>
                    )}
                    {dayMeetings.slice(0, 2).map((e, i) => (
                      <div
                        key={`${e.meeting.id}-${e.date}-${i}`}
                        className="text-[8px] sm:text-[9px] leading-tight px-1 py-0.5 rounded truncate bg-purple-500/15 text-purple-400 flex items-center gap-0.5"
                        title={`📅 ${e.meeting.data.title} (${e.meeting.data.time})`}
                      >
                        {e.isRecurring ? (
                          <Repeat size={8} className="flex-shrink-0" />
                        ) : (
                          '📅'
                        )}{' '}
                        {e.meeting.data.time}
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div className="text-[8px] text-[var(--muted-foreground)] pl-1">
                        +{dayMeetings.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Selected day detail (shared between views) ===== */}
      {calSelectedDate && (
        <div className="mt-4 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold">
              {(() => {
                const parts = calSelectedDate.split('-');
                return `${parseInt(parts[2])} de ${MESES[parseInt(parts[1]) - 1]} ${parts[0]}`;
              })()}
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                selectedDayTasks.length === 0
                  ? 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                  : 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]'
              }`}
            >
              {selectedDayTasks.length} tarea{selectedDayTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedDayTasks.length === 0 ? (
            <div className="text-center py-6 text-[var(--af-text3)]">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-sm">Sin tareas pendientes para este día</div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayTasks
                .sort((a, b) => {
                  const pOrder = { Alta: 0, Media: 1, Baja: 2 };
                  return (
                    (pOrder[a.data.priority as keyof typeof pOrder] || 1) -
                    (pOrder[b.data.priority as keyof typeof pOrder] || 1)
                  );
                })
                .map(t => {
                  const proj = projects.find(p => p.id === t.data.projectId);
                  const isOverdue = new Date(t.data.dueDate) < todayOnly;
                  return (
                    <div
                      key={t.id}
                      className={`border rounded-lg p-3 ${
                        isOverdue
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-[var(--border)] bg-[var(--af-bg3)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-[13px] font-medium">{t.data.title}</div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${prioColor(t.data.priority)}`}
                        >
                          {t.data.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[var(--af-text3)]">
                        {proj && <span>📁 {proj.data.name}</span>}
                        <span>👤 {getUserName(t.data.assigneeId)}</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>
                          {t.data.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Meetings for selected day */}
          {(() => {
            if (selectedDayMeetings.length === 0) return null;
            return (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-semibold text-purple-400">
                    📅 Reuniones ({selectedDayMeetings.length})
                  </div>
                  <button
                    className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 cursor-pointer border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    onClick={openNewMeeting}
                  >
                    + Nueva
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedDayMeetings
                    .sort((a, b) =>
                      (a.meeting.data.time || '').localeCompare(b.meeting.data.time || ''),
                    )
                    .map((e, i) => {
                      const m = e.meeting;
                      const meetProj = projects.find(p => p.id === m.data.projectId);
                      return (
                        <div
                          key={`${m.id}-${e.date}-${i}`}
                          className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="text-[13px] font-medium flex items-center gap-1.5">
                              {e.isRecurring && (
                                <Repeat
                                  size={13}
                                  className="text-purple-400/70 flex-shrink-0"
                                />
                              )}
                              {m.data.title}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)]"
                                onClick={() => openEditMeeting(m)}
                              >
                                ✏️
                              </button>
                              <button
                                className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer"
                                onClick={() => deleteMeeting(m.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[var(--af-text3)]">
                            <span>
                              🕐 {m.data.time || '09:00'} · {m.data.duration || 60} min
                            </span>
                            {meetProj && <span>📁 {meetProj.data.name}</span>}
                          </div>
                          {m.data.attendees && m.data.attendees.length > 0 && (
                            <div className="text-[10px] text-[var(--af-text3)] mt-1">
                              👥{' '}
                              {Array.isArray(m.data.attendees)
                                ? m.data.attendees.join(', ')
                                : m.data.attendees}
                            </div>
                          )}
                          {m.data.description && (
                            <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
                              {m.data.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
