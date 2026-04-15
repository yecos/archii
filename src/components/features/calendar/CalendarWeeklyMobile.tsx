'use client';
import { CalendarDays, Repeat, Clock, FolderOpen, Users, Zap, User } from 'lucide-react';
import { prioColor, taskStColor } from '@/lib/helpers';
import { MESES, DIAS_SEMANA } from '@/lib/types';

interface CalendarWeeklyMobileProps {
  weekDays: Date[];
  todayStr: string;
  todayOnly: Date;
  calSelectedDate: string | null;
  calTasks: Array<{ id: string; data: Record<string, any> }>;
  weeklyExpandedMeetings: Array<{ date: string; meeting: any; isRecurring: boolean }>;
  projects: Array<{ id: string; data: { name: string } }>;
  getUserName: (id: string) => string;
  formatTime12: (time24: string) => string;
  formatDateISO: (d: Date) => string;
  onSelectDate: (date: string) => void;
  openEditMeeting: (meeting: any) => void;
}

export default function CalendarWeeklyMobile({
  weekDays,
  todayStr,
  todayOnly,
  calSelectedDate,
  calTasks,
  weeklyExpandedMeetings,
  projects,
  getUserName,
  formatTime12,
  formatDateISO,
  onSelectDate,
  openEditMeeting,
}: CalendarWeeklyMobileProps) {
  const selDate = calSelectedDate || todayStr;
  const selDayTasks = calTasks.filter(t => t.data.dueDate === selDate);
  const selDayMeetings = weeklyExpandedMeetings
    .filter(e => e.date === selDate)
    .sort((a, b) => (a.meeting.data.time || '').localeCompare(b.meeting.data.time || ''));
  const hasEvents = selDayTasks.length > 0 || selDayMeetings.length > 0;

  return (
    <div className="space-y-3">
      {/* Horizontal scrollable day chips */}
      <div className="card-elevated rounded-xl p-2">
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
                onClick={() => onSelectDate(ds)}
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
      <div className="card-elevated rounded-xl overflow-hidden">
        {!hasEvents ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <CalendarDays size={30} className="text-[var(--muted-foreground)]" />
            <div className="text-[13px] font-medium">Sin eventos</div>
            <div className="text-[11px] mt-0.5 opacity-70">
              {(() => {
                const parts = selDate.split('-');
                return `${parseInt(parts[2])} de ${MESES[parseInt(parts[1]) - 1]}`;
              })()}
            </div>
          </div>
        ) : (
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
                  className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--skeuo-raised)] transition-colors"
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
                        <Users size={10} className="inline mr-0.5" />{Array.isArray(m.data.attendees) ? m.data.attendees.length : String(m.data.attendees).split(',').length} asistentes
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
                        {isOverdue && <Zap size={11} className="text-red-400" />}
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
                          <User size={9} className="inline mr-0.5" />{getUserName(t.data.assigneeId)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
