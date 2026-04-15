'use client';
import React from 'react';
import { toSafeDate } from '@/lib/date-utils';

interface CalendarStatsProps {
  calTasks: Array<{ data: { dueDate?: string; priority: string } }>;
  today: Date;
  todayOnly: Date;
  expandedMeetingsCount: number;
  openNewMeeting: () => void;
}

export default function CalendarStats({
  calTasks,
  today,
  todayOnly,
  expandedMeetingsCount,
  openNewMeeting,
}: CalendarStatsProps) {
  const urgentCount = calTasks.filter(t => t.data.priority === 'Alta').length;
  const overdueCount = calTasks.filter(t => {
    const d = t.data.dueDate;
    return d && new Date(d) < todayOnly;
  }).length;
  const thisWeekCount = calTasks.filter(t => {
    const d = t.data.dueDate;
    if (!d) return false;
    const dd = toSafeDate(d);
    const diff = Math.ceil(
      (dd.getTime() - today.getTime()) / 86400000,
    );
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border border-purple-500/20"
            onClick={openNewMeeting}
          >
            + Reunión
          </button>
          <span className="text-[11px] text-purple-400/70">
            {expandedMeetingsCount} este mes
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-red-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-red-400">{urgentCount}</div>
          <div className="text-[9px] text-red-400/70">Urgentes</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-amber-400">{overdueCount}</div>
          <div className="text-[9px] text-amber-400/70">Vencidas</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-blue-400">{thisWeekCount}</div>
          <div className="text-[9px] text-blue-400/70">Esta semana</div>
        </div>
      </div>
    </>
  );
}
