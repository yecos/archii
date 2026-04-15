'use client';
import React from 'react';
import { CalendarDays, Repeat, Folder, User, Users, Pencil } from 'lucide-react';
import { prioColor, taskStColor } from '@/lib/helpers';
import { MESES } from '@/lib/types';

interface SelectedDayDetailProps {
  calSelectedDate: string;
  selectedDayTasks: Array<{ id: string; data: Record<string, any> }>;
  selectedDayMeetings: Array<{ date: string; meeting: any; isRecurring: boolean }>;
  todayOnly: Date;
  projects: Array<{ id: string; data: { name: string } }>;
  getUserName: (id: string) => string;
  openNewMeeting: () => void;
  openEditMeeting: (meeting: any) => void;
  deleteMeeting: (id: string) => void;
}

export default function SelectedDayDetail({
  calSelectedDate,
  selectedDayTasks,
  selectedDayMeetings,
  todayOnly,
  projects,
  getUserName,
  openNewMeeting,
  openEditMeeting,
  deleteMeeting,
}: SelectedDayDetailProps) {
  return (
    <div className="mt-4 card-elevated rounded-xl p-4">
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
          <CalendarDays size={20} className="text-[var(--muted-foreground)]" />
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
                      : 'border-[var(--skeuo-edge-light)] bg-[var(--skeuo-raised)]'
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
                    {proj && <span><Folder size={10} className="inline mr-0.5" />{proj.data.name}</span>}
                    <span><User size={9} className="inline mr-0.5" />{getUserName(t.data.assigneeId)}</span>
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
      {selectedDayMeetings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-semibold text-purple-400">
              <CalendarDays size={12} className="inline mr-1" /> Reuniones ({selectedDayMeetings.length})
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
                          <Pencil size={12} />
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
                      {meetProj && <span><Folder size={10} className="inline mr-0.5" />{meetProj.data.name}</span>}
                    </div>
                    {m.data.attendees && m.data.attendees.length > 0 && (
                      <div className="text-[10px] text-[var(--af-text3)] mt-1">
                        <Users size={10} className="inline" />
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
      )}
    </div>
  );
}
