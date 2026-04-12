'use client';
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtCOP, fmtDate, statusColor } from '@/lib/helpers';

export default function DashboardScreen() {
  const {
    loading, projects, tasks, pendingCount, navigateTo, toggleTask, openProject, getUserName,
    activeTasks, completedTasks, unreadCount, notifHistory,
  } = useApp();

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Skeleton while loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5">
                <div className="af-skeleton h-3 w-24 mb-3" />
                <div className="af-skeleton h-7 w-12 mb-1" />
                <div className="af-skeleton h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="af-skeleton h-4 w-32 mb-4" />
              {[1,2,3].map(i => <div key={i} className="af-skeleton h-12 w-full mb-2 rounded-lg" />)}
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="af-skeleton h-4 w-32 mb-4" />
              {[1,2,3].map(i => <div key={i} className="af-skeleton h-12 w-full mb-2 rounded-lg" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="af-skeleton h-4 w-24 mb-3" />
                <div className="af-skeleton h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && (<>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[{ val: projects.length, lbl: 'Proyectos totales', color: '' }, { val: projects.filter(p => p.data.status === 'Ejecucion').length, lbl: 'En ejecución', color: '' }, { val: pendingCount, lbl: 'Tareas pendientes', color: '' }, { val: tasks.filter(t => t.data.status === 'Completado').length, lbl: 'Completadas', color: 'text-emerald-400' }].map((m, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5"><div className={`text-2xl md:text-[28px] font-semibold ${m.color}`}>{m.val}</div><div className="text-xs text-[var(--muted-foreground)]">{m.lbl}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">Proyectos recientes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('projects')}>Ver todos</button></div>
          {projects.length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">Crea tu primer proyecto</div> : projects.slice(0, 3).map(p => {
            const prog = p.data.progress || 0;
            return (<div key={p.id} className="p-3 bg-[var(--af-bg3)] rounded-lg mb-2 cursor-pointer" onClick={() => openProject(p.id)}>
              <div className="flex justify-between mb-2"><div className="text-sm font-semibold">{p.data.name}</div><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(p.data.status)}`}>{p.data.status}</span></div>
              <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} /></div>
              <div className="flex justify-between mt-1.5"><span className="text-[11px] text-[var(--af-text3)]">{prog}%</span>{p.data.endDate && <span className="text-[11px] text-[var(--af-text3)]">{fmtDate(p.data.endDate)}</span>}</div>
            </div>);
          })}
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">Tareas urgentes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('tasks')}>Ver todas</button></div>
          {tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas urgentes</div> : tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').slice(0, 4).map(t => {
            const proj = projects.find(p => p.id === t.data.projectId);
            return (<div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer hover:border-[var(--af-accent)]" onClick={() => toggleTask(t.id, t.data.status)} />
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium">{t.data.title}</div><div className="text-[11px] text-[var(--af-text3)] mt-0.5">{proj?.data.name || '—'}{t.data.assigneeId ? ' · ' + getUserName(t.data.assigneeId) : ''}</div></div>
            </div>);
          })}
        </div>
      </div>

      {/* Row 3: Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Widget: Progreso Sprint */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 col-span-1">
          <div className="text-[15px] font-semibold mb-3">Progreso Sprint</div>
          <div className="flex items-center justify-center">
            <div className="relative w-[80px] h-[80px]">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tasks.length > 0 ? (completedTasks.length / tasks.length) >= 0.8 ? '#10b981' : (completedTasks.length / tasks.length) >= 0.4 ? 'var(--af-accent)' : '#f59e0b' : 'var(--af-bg4)'} strokeWidth="3" strokeDasharray={`${tasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(1) : 0}, 100`} strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[17px] font-bold">{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-[12px] text-[var(--muted-foreground)]">{completedTasks.length} de {tasks.length} tareas</div>
            <div className="text-[11px] text-emerald-400 mt-1">{activeTasks.length} en progreso</div>
          </div>
        </div>

        {/* Widget: Asistencia del Día */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 col-span-1">
          <div className="text-[15px] font-semibold mb-3">Asistencia del Día</div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center"><span className="text-emerald-400 text-[14px]">✓</span></div>
              <div className="flex-1"><div className="text-[13px] font-medium">Activos hoy</div><div className="text-[11px] text-[var(--muted-foreground)]">Con tareas en progreso</div></div>
              <span className="text-[18px] font-bold text-emerald-400">{[...new Set(tasks.filter(t => t.data.status === 'En progreso' || t.data.status === 'Revision').map(t => t.data.assigneeId).filter(Boolean))].length}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center"><span className="text-amber-400 text-[14px]">⏳</span></div>
              <div className="flex-1"><div className="text-[13px] font-medium">Con asignaciones</div><div className="text-[11px] text-[var(--muted-foreground)]">Tareas pendientes</div></div>
              <span className="text-[18px] font-bold text-amber-400">{[...new Set(tasks.filter(t => t.data.status === 'Por hacer' && t.data.assigneeId).map(t => t.data.assigneeId))].length}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--af-bg3)] flex items-center justify-center"><span className="text-[var(--muted-foreground)] text-[14px]">●</span></div>
              <div className="flex-1"><div className="text-[13px] font-medium">Sin asignar</div><div className="text-[11px] text-[var(--muted-foreground)]">Tareas sin responsable</div></div>
              <span className="text-[18px] font-bold">{tasks.filter(t => !t.data.assigneeId && t.data.status !== 'Completado').length}</span>
            </div>
          </div>
        </div>

        {/* Widget: Notificaciones */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Notificaciones</div>
            {unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          <div className="flex flex-col gap-2 max-h-[130px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {notifHistory.length === 0 ? <div className="text-center py-4 text-[var(--af-text3)] text-[12px]">Sin notificaciones</div> :
            notifHistory.slice(0, 5).map(n => (
              <div key={n.id} className={`flex items-start gap-2 p-2 rounded-lg ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}>
                <span className="text-[14px] mt-0.5 flex-shrink-0">{n.icon || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{n.title}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">{n.body}</div>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Widget: Mini Burndown */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 col-span-2 lg:col-span-1">
          <div className="text-[15px] font-semibold mb-3">Burndown Semanal</div>
          <div className="flex items-end gap-[6px] h-[90px]">
            {(() => {
              const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
              const today = new Date();
              const dayOfWeek = today.getDay();
              const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
              const weekData = days.map((label, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() + mondayOffset + i);
                const dayStr = d.toISOString().split('T')[0];
                const done = tasks.filter(t => {
                  if (t.data.status !== 'Completado' || !t.data.updatedAt) return false;
                  try { return t.data.updatedAt.toDate ? t.data.updatedAt.toDate().toISOString().split('T')[0] === dayStr : false; } catch { return false; }
                }).length;
                return { label, count: done, isToday: i === (dayOfWeek === 0 ? 6 : dayOfWeek - 1), isFuture: i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1) };
              });
              const total = pendingCount + completedTasks.length;
              return weekData.map((d, i) => {
                let doneSoFar = 0;
                for (let j = 0; j <= i; j++) doneSoFar += weekData[j].count;
                const rem = Math.max(total - doneSoFar, 0);
                const pct = total > 0 ? (rem / total) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] text-[var(--muted-foreground)]">{rem}</div>
                    <div className="w-full bg-[var(--af-bg4)] rounded-sm overflow-hidden" style={{ height: '70px' }}>
                      <div className="w-full rounded-sm transition-all duration-500" style={{ height: pct > 0 ? Math.max(pct, 4) + '%' : '0%', background: d.isToday ? 'var(--af-accent)' : d.isFuture ? 'var(--af-bg3)' : 'rgba(200,169,110,0.4)' }} />
                    </div>
                    <span className={`text-[9px] ${d.isToday ? 'font-bold text-[var(--af-accent)]' : 'text-[var(--muted-foreground)]'}`}>{d.label}</span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-[var(--muted-foreground)]">{pendingCount} pendientes</span>
            <span className="text-[10px] text-emerald-400">{completedTasks.length} completadas</span>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
