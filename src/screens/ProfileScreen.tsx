'use client';
import React, { useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { useCalendar } from '@/hooks/useDomain';
import { useNotifPreferences } from '@/hooks/useDomain';
import { fmtCOP, fmtDate, prioColor, taskStColor, avatarColor } from '@/lib/helpers';
import { ROLE_COLORS, ROLE_ICONS, NOTIF_EVENT_TYPES, NOTIF_EVENT_CONFIG } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

export default function ProfileScreen() {
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const cal = useCalendar();
  const notifPrefs = useNotifPreferences();

  const myTasks = useMemo(() =>
    fs.tasks.filter(t => t.data.assigneeId === auth.authUser?.uid || !t.data.assigneeId),
    [fs.tasks, auth.authUser?.uid]
  );

  const myPending = useMemo(() =>
    myTasks.filter(t => t.data.status !== 'Completado'),
    [myTasks]
  );

  const myCompleted = useMemo(() =>
    myTasks.filter(t => t.data.status === 'Completado'),
    [myTasks]
  );

  const myInProgress = useMemo(() =>
    myTasks.filter(t => t.data.status === 'En progreso'),
    [myTasks]
  );

  const myHighPrio = useMemo(() =>
    myPending.filter(t => t.data.priority === 'Alta'),
    [myPending]
  );

  const myOverdue = useMemo(() =>
    myPending.filter(t => t.data.dueDate && new Date(t.data.dueDate) < new Date()),
    [myPending]
  );

  const totalRate = useMemo(() =>
    myTasks.length > 0 ? Math.round((myCompleted.length / myTasks.length) * 100) : 0,
    [myCompleted, myTasks]
  );

  const myProjects = useMemo(() =>
    fs.projects.filter(p => p.data.createdBy === auth.authUser?.uid || myTasks.some(t => t.data.projectId === p.id)),
    [fs.projects, auth.authUser?.uid, myTasks]
  );

  const myExpenses = useMemo(() =>
    fs.expenses.filter(e => e.data.createdBy === auth.authUser?.uid),
    [fs.expenses, auth.authUser?.uid]
  );

  const totalSpent = useMemo(() =>
    myExpenses.reduce((s, e) => s + (Number(e.data.amount) || 0), 0),
    [myExpenses]
  );

  // Weekly activity (last 7 days)
  const weeklyData = useMemo(() => {
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return weekDays.map((label, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const completed = myTasks.filter(t => t.data.status === 'Completado').filter(t => {
        const cd = (t.data.createdAt as any)?.toDate ? (t.data.createdAt as any).toDate() : new Date(t.data.createdAt as any);
        return cd >= dayStart && cd < dayEnd;
      }).length;
      return { label, count: completed, max: 5 };
    });
  }, [myTasks]);

  const weekMax = useMemo(() =>
    Math.max(...weeklyData.map(w => w.count), 1),
    [weeklyData]
  );

  // Tasks by project
  const tasksByProject = useMemo((): Record<string, { name: string; total: number; done: number }> => {
    const result: Record<string, { name: string; total: number; done: number }> = {};
    myProjects.forEach(p => {
      const pTasks = myTasks.filter(t => t.data.projectId === p.id);
      if (pTasks.length > 0) {
        result[p.id] = { name: p.data.name, total: pTasks.length, done: pTasks.filter(t => t.data.status === 'Completado').length };
      }
    });
    return result;
  }, [myProjects, myTasks]);

  // Tasks by priority
  const prioData = useMemo(() => [
    { label: 'Alta', count: myTasks.filter(t => t.data.priority === 'Alta').length, color: '#e05555' },
    { label: 'Media', count: myTasks.filter(t => t.data.priority === 'Media').length, color: '#e09855' },
    { label: 'Baja', count: myTasks.filter(t => t.data.priority === 'Baja').length, color: '#4caf7d' },
  ], [myTasks]);

  const prioMax = useMemo(() =>
    Math.max(...prioData.map(p => p.count), 1),
    [prioData]
  );

  // Notifications
  const notifications = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekLater = new Date(today.getTime() + 7 * 86400000);
    const result: { icon: string; text: string; time: string; urgent: boolean }[] = [];

    // Overdue tasks (urgent)
    myOverdue.forEach(t => {
      const proj = fs.projects.find(p => p.id === t.data.projectId);
      const daysOverdue = Math.floor((today.getTime() - new Date(t.data.dueDate).getTime()) / 86400000);
      result.push({ icon: '⚡', text: `"${t.data.title}" venció hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}${proj ? ` — ${proj.data.name}` : ''}`, time: `Venció ${fmtDate(t.data.dueDate)}`, urgent: true });
    });

    // High priority pending tasks
    if (myHighPrio.length > 0) {
      myHighPrio.forEach(t => {
        const proj = fs.projects.find(p => p.id === t.data.projectId);
        result.push({ icon: '🔴', text: `Tarea urgente: "${t.data.title}"${proj ? ` — ${proj.data.name}` : ''}`, time: `Prioridad Alta · ${t.data.status}`, urgent: true });
      });
    }

    // Meetings today or this week
    cal.meetings.forEach(m => {
      if (m.data.date && (m.data.date === todayStr || (m.data.date > todayStr && m.data.date <= weekLater.toISOString().split('T')[0]))) {
        const proj = fs.projects.find(p => p.id === m.data.projectId);
        const isToday = m.data.date === todayStr;
        result.push({ icon: '📅', text: `Reunión "${m.data.title}"${isToday ? ' hoy' : ''} a las ${m.data.time || '09:00'}${proj ? ` — ${proj.data.name}` : ''}`, time: `${fmtDate(m.data.date)} · ${m.data.duration || 60} min`, urgent: isToday });
      }
    });

    // Pending approvals in my projects
    const myProjectIds = myProjects.map(p => p.id);
    const pendingApprovals = fs.approvals.filter(a => a.data.status === 'Pendiente');
    if (pendingApprovals.length > 0) {
      result.push({ icon: '📋', text: `${pendingApprovals.length} aprobación${pendingApprovals.length > 1 ? 'es' : ''} pendiente${pendingApprovals.length > 1 ? 's' : ''}`, time: 'Requiere atención', urgent: false });
    }

    // Recent new projects (last 7 days)
    const recentProjects = fs.projects.filter(p => {
      const cd = (p.data.createdAt as any)?.toDate ? (p.data.createdAt as any).toDate() : new Date(p.data.createdAt as any);
      return cd >= new Date(today.getTime() - 7 * 86400000);
    });
    recentProjects.slice(0, 3).forEach(p => {
      result.push({ icon: '📁', text: `Proyecto "${p.data.name}" — ${p.data.status}${p.data.client ? ` · Cliente: ${p.data.client}` : ''}`, time: fmtDate(p.data.createdAt), urgent: false });
    });

    // Tasks in progress
    if (myInProgress.length > 0) {
      myInProgress.slice(0, 3).forEach(t => {
        const proj = fs.projects.find(p => p.id === t.data.projectId);
        result.push({ icon: '🔄', text: `"${t.data.title}" en progreso${proj ? ` — ${proj.data.name}` : ''}${t.data.dueDate ? ` · Vence: ${fmtDate(t.data.dueDate)}` : ''}`, time: t.data.status, urgent: false });
      });
    }

    // Sort: urgent first
    result.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

    return result;
  }, [myOverdue, myHighPrio, myInProgress, myProjects, fs.projects, cal.meetings, fs.approvals]);

  return (
    <div className="animate-fadeIn space-y-4">
              {/* Profile Header Card */}
              <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden">
                <div className="flex items-center gap-3 relative">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-bold border-2 ${avatarColor(auth.authUser?.uid)} flex-shrink-0`} style={auth.authUser?.photoURL ? { backgroundImage: `url(${auth.authUser.photoURL})`, backgroundSize: 'cover' } : {}}>
                    {auth.authUser?.photoURL ? '' : auth.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-base sm:text-xl">{auth.userName}</div>
                    <div className="text-[11px] sm:text-sm text-[var(--muted-foreground)] truncate">{auth.authUser?.email}</div>
                    <div className="flex gap-1.5 mt-1">
                      {(() => { const myRole = auth.teamUsers.find(u => u.id === auth.authUser?.uid)?.data?.role || 'Miembro'; return <span className={`text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[myRole]}`}>{ROLE_ICONS[myRole]} {myRole}</span>; })()}
                      <span className="text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{myProjects.length} proyectos</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 mt-3">
                  {[
                    { val: myPending.length, lbl: 'Pendientes', c: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { val: myInProgress.length, lbl: 'En progreso', c: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { val: myCompleted.length, lbl: 'Listas', c: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { val: totalRate + '%', lbl: 'Cumplimiento', c: 'text-[var(--af-accent)]', bg: 'bg-[var(--af-accent)]/10' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-lg p-2 text-center`}>
                      <div className={`text-base sm:text-xl font-bold ${s.c}`}>{s.val}</div>
                      <div className="text-[8px] sm:text-[11px] text-[var(--muted-foreground)] leading-tight">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notificaciones */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] sm:text-[15px] font-semibold">Notificaciones Recientes</div>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{notifications.length} actividad{notifications.length !== 1 ? 'es' : ''}</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-[var(--af-text3)]">
                    <div className="text-3xl mb-2">🔔</div>
                    <div className="text-sm">Sin notificaciones nuevas</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Las alertas aparecerán aquí cuando haya actividad</div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {notifications.slice(0, 15).map((n, i) => (
                      <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${n.urgent ? 'bg-red-500/5 border border-red-500/20' : 'bg-[var(--af-bg3)] hover:bg-[var(--af-bg4)]'}`}>
                            <div className="text-base flex-shrink-0 mt-0.5">{n.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] sm:text-[13px] leading-snug">{n.text}</div>
                              <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{n.time}</div>
                            </div>
                          </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configuración de notificaciones por evento */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-base">⚙️</div>
                    <div className="text-[13px] sm:text-[15px] font-semibold">Configurar Notificaciones</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)]">
                      {NOTIF_EVENT_TYPES.filter(e => notifPrefs.preferences[e]).length}/{NOTIF_EVENT_TYPES.length} activas
                    </span>
                    <button
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
                      onClick={notifPrefs.resetDefaults}
                    >
                      Restablecer
                    </button>
                  </div>
                </div>
                {notifPrefs.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {NOTIF_EVENT_TYPES.map(eventType => {
                      const config = NOTIF_EVENT_CONFIG[eventType];
                      const enabled = notifPrefs.preferences[eventType];
                      return (
                        <div
                          key={eventType}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-[var(--af-bg3)] transition-colors group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-base flex-shrink-0 w-6 text-center">{config.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] sm:text-[13px] font-medium leading-tight">{config.label}</div>
                              <div className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] leading-tight mt-0.5">{config.description}</div>
                            </div>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => notifPrefs.updatePreference(eventType, checked)}
                            className="flex-shrink-0 data-[state=checked]:bg-[var(--af-accent)]"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Charts row - stacked on mobile, 3-col on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-2 sm:mb-3">Cumplimiento</div>
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--af-bg4)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={totalRate >= 80 ? '#4caf7d' : totalRate >= 50 ? '#c8a96e' : '#e05555'} strokeWidth="3" strokeDasharray={`${totalRate}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg sm:text-2xl font-bold">{totalRate}%</span>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-[var(--af-text3)] mt-1.5">{myCompleted.length} de {myTasks.length}</div>
                </div>

                {/* Priority */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-3">Prioridad</div>
                  <div className="space-y-2.5">
                    {prioData.map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[11px] sm:text-[12px] mb-1"><span>{p.label}</span><span className="text-[var(--muted-foreground)]">{p.count}</span></div>
                        <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: Math.round((p.count / prioMax) * 100) + '%', backgroundColor: p.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {myHighPrio.length > 0 && <div className="mt-3 p-2 bg-red-500/10 rounded-lg flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[11px] text-red-400">{myHighPrio.length} urgente{myHighPrio.length > 1 ? 's' : ''}</span></div>}
                </div>

                {/* Weekly */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                  <div className="text-[11px] sm:text-[13px] font-semibold text-[var(--muted-foreground)] mb-3">Actividad Semanal</div>
                  <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-24">
                    {weeklyData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full bg-[var(--af-bg4)] rounded-sm overflow-hidden flex flex-col-reverse" style={{ height: '50px' }}>
                          <div className="w-full bg-[var(--af-accent)] rounded-sm transition-all" style={{ height: d.count > 0 ? Math.max(Math.round((d.count / weekMax) * 100), 10) + '%' : '0%' }} />
                        </div>
                        <span className="text-[7px] sm:text-[9px] text-[var(--af-text3)]">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progreso por Proyecto */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] sm:text-[15px] font-semibold">Progreso por Proyecto</div>
                  <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)]">{Object.keys(tasksByProject).length} proyectos</span>
                </div>
                {Object.keys(tasksByProject).length === 0 ? (
                  <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas asignadas aún</div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(tasksByProject).map((p, i) => {
                      const rate = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                      return (
                        <div key={i} className="cursor-pointer hover:bg-[var(--af-bg3)] rounded-lg p-3 -mx-1 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-medium">{p.name}</span>
                            <span className={`text-[12px] font-semibold ${rate >= 80 ? 'text-emerald-400' : rate >= 40 ? 'text-[var(--af-accent)]' : 'text-amber-400'}`}>{rate}%</span>
                          </div>
                          <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${rate >= 80 ? 'bg-emerald-500' : rate >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: rate + '%' }} />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-[var(--af-text3)]">{p.done} completadas</span>
                            <span className="text-[10px] text-[var(--af-text3)]">{p.total - p.done} pendientes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mis Tareas Pendientes */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] sm:text-[15px] font-semibold">Tareas Pendientes</div>
                  <div className="flex gap-1.5">
                    {myOverdue.length > 0 && <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{myOverdue.length} vencidas</span>}
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">{myPending.length} pendientes</span>
                  </div>
                </div>
                {myPending.length === 0 ? (
                  <div className="text-center py-10 text-[var(--af-text3)]"><div className="text-3xl mb-2">🎉</div><div className="text-sm">¡Todas tus tareas están al día!</div></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myPending.slice(0, 10).map(t => {
                      const proj = fs.projects.find(p => p.id === t.data.projectId);
                      const isOverdue = t.data.dueDate && new Date(t.data.dueDate) < new Date();
                      return (
                        <div key={t.id} className={`border border-[var(--border)] rounded-xl p-3.5 transition-all hover:border-[var(--input)] ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--af-bg3)]'}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium leading-snug">{t.data.title}</div>
                              <div className="text-[11px] text-[var(--af-text3)] mt-1">{proj?.data.name || 'Sin proyecto'}</div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
                            {t.data.dueDate && (
                              <span className={`text-[10px] ${isOverdue ? 'text-red-400 font-medium' : 'text-[var(--af-text3)]'}`}>
                                {isOverdue ? '⚡ ' : '📅 '}{fmtDate(t.data.dueDate)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${t.data.status === 'En progreso' ? 'bg-blue-500 w-1/2' : (t.data.status as string) === 'Revision' ? 'bg-amber-500 w-3/4' : 'w-0'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Microsoft / OneDrive */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 21 21" className="w-5 h-5"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                    <div className="text-[13px] sm:text-[15px] font-semibold">Microsoft OneDrive</div>
                  </div>
                  {od.msConnected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Conectado</span>}
                </div>
                {!od.msConnected ? (
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)] mb-3">Conecta tu cuenta de Microsoft para gestionar archivos de proyectos directamente en OneDrive. Cada proyecto tendrá su propia carpeta en la nube.</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                      {[
                        { icon: '☁️', title: 'Almacenamiento en la nube', desc: 'Sin límite de tamaño en OneDrive' },
                        { icon: '📂', title: 'Carpetas por proyecto', desc: 'Organización automática' },
                        { icon: '🔗', title: 'Compartir archivos', desc: 'Enlaces seguros para el equipo' },
                      ].map((f, i) => (
                        <div key={i} className="bg-[var(--af-bg3)] rounded-lg p-3 text-center">
                          <div className="text-lg mb-1">{f.icon}</div>
                          <div className="text-[11px] font-semibold">{f.title}</div>
                          <div className="text-[10px] text-[var(--af-text3)]">{f.desc}</div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full bg-[#00a4ef] text-white border-none rounded-lg py-2.5 text-sm font-semibold cursor-pointer hover:bg-[#0091d5] transition-colors flex items-center justify-center gap-2" onClick={auth.doMicrosoftLogin}>
                      <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
                      Conectar con Microsoft
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)] mb-3">Tu cuenta está vinculada. Los archivos de cada proyecto se guardan en <strong>OneDrive/ArchiFlow/[Nombre del proyecto]/</strong></div>
                    {fs.projects.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2">Abrir carpeta de proyecto:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {fs.projects.slice(0, 6).map(p => (
                            <button key={p.id} className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg p-2.5 text-left cursor-pointer hover:border-[#00a4ef] transition-all" onClick={() => od.openOneDriveForProject(p.data.name)}>
                              <div className="text-[11px] font-medium truncate">{p.data.name}</div>
                              <div className="text-[9px] text-[var(--af-text3)]">{p.data.status}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/10 transition-colors" onClick={od.disconnectMicrosoft}>
                      Desconectar Microsoft
                    </button>
                  </div>
                )}
              </div>

              {/* Mi Actividad Financiera */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5">
                <div className="text-[13px] sm:text-[15px] font-semibold mb-3">Actividad Financiera</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[var(--af-bg3)] rounded-lg p-3.5 text-center">
                    <div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(totalSpent)}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Gastos registrados</div>
                  </div>
                  <div className="bg-[var(--af-bg3)] rounded-lg p-3.5 text-center">
                    <div className="text-lg font-bold text-emerald-400">{myExpenses.length}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Registros realizados</div>
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <div className="pt-2 pb-4">
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-[13px] font-medium cursor-pointer hover:bg-red-500/10 transition-colors flex items-center gap-2 justify-center" onClick={auth.doLogout}>
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
  );
}
