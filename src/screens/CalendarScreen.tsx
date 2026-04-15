'use client';
import React, { useState, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useCalendar } from '@/hooks/useDomain';
import { useIsMobile } from '@/hooks/use-mobile';
import { MESES } from '@/lib/types';
import { expandMeetingForMonth } from '@/lib/recurrence';
import CalendarHeader from '@/components/features/calendar/CalendarHeader';
import CalendarStats from '@/components/features/calendar/CalendarStats';
import CalendarWeeklyMobile from '@/components/features/calendar/CalendarWeeklyMobile';
import CalendarWeeklyDesktop from '@/components/features/calendar/CalendarWeeklyDesktop';
import CalendarMonthlyView from '@/components/features/calendar/CalendarMonthlyView';
import SelectedDayDetail from '@/components/features/calendar/SelectedDayDetail';

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
      <CalendarHeader
        calView={calView}
        weekLabel={weekLabel}
        calMonth={calMonth}
        calYear={calYear}
        calFilterProject={calFilterProject}
        projects={projects}
        onPrev={calView === 'weekly' ? prevWeek : prevMonth}
        onNext={calView === 'weekly' ? nextWeek : nextMonth}
        onViewChange={setCalView}
        onFilterProjectChange={setCalFilterProject}
        onGoToday={goToday}
      />

      <CalendarStats
        calTasks={calTasks}
        today={today}
        todayOnly={todayOnly}
        expandedMeetingsCount={expandedMeetings.length}
        openNewMeeting={openNewMeeting}
      />

      {/* ===== Calendar Grid ===== */}
      {calView === 'weekly' ? (
        isMobile ? (
          <CalendarWeeklyMobile
            weekDays={weekDays}
            todayStr={todayStr}
            todayOnly={todayOnly}
            calSelectedDate={calSelectedDate}
            calTasks={calTasks}
            weeklyExpandedMeetings={weeklyExpandedMeetings}
            projects={projects}
            getUserName={getUserName}
            formatTime12={formatTime12}
            formatDateISO={formatDateISO}
            onSelectDate={setCalSelectedDate}
            openEditMeeting={openEditMeeting}
          />
        ) : (
          <CalendarWeeklyDesktop
            weekDays={weekDays}
            todayStr={todayStr}
            todayOnly={todayOnly}
            calSelectedDate={calSelectedDate}
            calTasks={calTasks}
            weeklyExpandedMeetings={weeklyExpandedMeetings}
            TIME_SLOTS={TIME_SLOTS}
            SLOT_H={SLOT_H}
            START_HOUR={START_HOUR}
            formatTime12={formatTime12}
            formatDateISO={formatDateISO}
            onSelectDate={setCalSelectedDate}
            openEditMeeting={openEditMeeting}
          />
        )
      ) : (
        <CalendarMonthlyView
          cells={cells}
          calYear={calYear}
          calMonth={calMonth}
          calSelectedDate={calSelectedDate}
          today={today}
          todayOnly={todayOnly}
          getTasksForDay={getTasksForDay}
          getExpandedMeetingsForDay={getExpandedMeetingsForDay}
          onSelectDate={setCalSelectedDate}
        />
      )}

      {/* ===== Selected day detail (shared between views) ===== */}
      {calSelectedDate && (
        <SelectedDayDetail
          calSelectedDate={calSelectedDate}
          selectedDayTasks={selectedDayTasks}
          selectedDayMeetings={selectedDayMeetings}
          todayOnly={todayOnly}
          projects={projects}
          getUserName={getUserName}
          openNewMeeting={openNewMeeting}
          openEditMeeting={openEditMeeting}
          deleteMeeting={deleteMeeting}
        />
      )}
    </div>
  );
}
