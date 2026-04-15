'use client';
import { Repeat } from 'lucide-react';
import { DIAS_SEMANA } from '@/lib/types';

interface CalendarWeeklyDesktopProps {
  weekDays: Date[];
  todayStr: string;
  todayOnly: Date;
  calSelectedDate: string | null;
  calTasks: Array<{ id: string; data: Record<string, any> }>;
  weeklyExpandedMeetings: Array<{ date: string; meeting: any; isRecurring: boolean }>;
  TIME_SLOTS: string[];
  SLOT_H: number;
  START_HOUR: number;
  formatTime12: (time24: string) => string;
  formatDateISO: (d: Date) => string;
  onSelectDate: (date: string) => void;
  openEditMeeting: (meeting: any) => void;
}

export default function CalendarWeeklyDesktop({
  weekDays,
  todayStr,
  todayOnly,
  calSelectedDate,
  calTasks,
  weeklyExpandedMeetings,
  TIME_SLOTS,
  SLOT_H,
  START_HOUR,
  formatTime12,
  formatDateISO,
  onSelectDate,
  openEditMeeting,
}: CalendarWeeklyDesktopProps) {
  return (
    <div className="card-elevated rounded-xl overflow-hidden">
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
                    : 'hover:bg-[var(--skeuo-raised)]'
              }`}
              onClick={() => onSelectDate(ds)}
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
          <div className="border-r border-[var(--border)] bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)]">
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
                            {isOverdue ? '' : ''}
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
                        className="absolute left-0.5 right-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 px-1 py-0.5 overflow-hidden cursor-pointer hover:bg-purple-500/30 transition-colors z-10 shadow-[var(--skeuo-shadow-raised-sm)]"
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
  );
}
