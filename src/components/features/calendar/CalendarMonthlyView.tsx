'use client';
import { Repeat, CalendarDays } from 'lucide-react';
import { DIAS_SEMANA } from '@/lib/types';

interface CalendarMonthlyViewProps {
  cells: (number | null)[];
  calYear: number;
  calMonth: number;
  calSelectedDate: string | null;
  today: Date;
  todayOnly: Date;
  getTasksForDay: (day: number) => Array<{ id: string; data: Record<string, any> }>;
  getExpandedMeetingsForDay: (day: number) => Array<{ date: string; meeting: any; isRecurring: boolean }>;
  onSelectDate: (date: string) => void;
}

export default function CalendarMonthlyView({
  cells,
  calYear,
  calMonth,
  calSelectedDate,
  today,
  todayOnly,
  getTasksForDay,
  getExpandedMeetingsForDay,
  onSelectDate,
}: CalendarMonthlyViewProps) {
  return (
    <div className="card-elevated rounded-xl overflow-hidden">
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
                  : 'hover:bg-[var(--skeuo-raised)]'
              } ${isPast && !isToday ? 'opacity-70' : ''}`}
              onClick={() => onSelectDate(dateStr)}
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
                  const proj = t.data.projectId; // needed for type consistency
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
                      {isOverdue ? '' : ''}
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
                    title={`${e.meeting.data.title} (${e.meeting.data.time})`}
                  >
                    {e.isRecurring ? (
                      <Repeat size={8} className="flex-shrink-0" />
                    ) : (
                      <CalendarDays size={8} className="flex-shrink-0" />
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
  );
}
