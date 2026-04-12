'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { fmtCOP, fmtDate, avatarColor, getInitials, statusColor } from '@/lib/helpers';
import { MESES, ALL_PHASE_NAMES } from '@/lib/constants';

export default function DashboardScreen() {
  const {
    meetings,
    projects,
    expenses,
    tasks,
    invProducts,
    teamUsers,
    messages,
    authUser,
    userName,
    initials,
    pendingCount,
    setEditingId,
    openModal,
    setForms,
    navigateTo,
    openProject,
    toggleTask,
    getUserName,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.data.date === todayStr);
  const upcomingMeetings = meetings.filter(m => m.data.date >= todayStr).sort((a,b) => (a.data.date > b.data.date ? 1 : a.data.date < b.data.date ? -1 : (a.data.time || '').localeCompare(b.data.time || ''))).slice(0, 4);
  const totalBudget = projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (e.data.amount || 0), 0);
  const overdueTasks = tasks.filter(t => t.data.dueDate && t.data.dueDate < todayStr && t.data.status !== 'Completado');
  const lowStockItems = invProducts.filter(p => (p.data.stock || 0) <= (p.data.minStock || 0));
  const activeMembers = teamUsers.length;
  const recentMsgs = (messages.length > 0 ? messages.slice(-3).reverse() : []);
  const myTasks = tasks.filter(t => t.data.assigneeId === authUser?.uid && t.data.status !== 'Completado');
  const executionProjects = projects.filter(p => p.data.status === 'Ejecucion');

  return (<div className="animate-fadeIn space-y-5">
    {/* Welcome banner */}
    <div className="bg-gradient-to-r from-[var(--af-accent)]/15 via-[var(--af-accent)]/5 to-transparent border border-[var(--af-accent)]/20 rounded-xl p-4 md:p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 flex-shrink-0 ${avatarColor(authUser?.uid)}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-base md:text-lg font-semibold">Bienvenido, {userName.split(' ')[0]} 👋</div>
        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{todayMeetings.length > 0 ? `📅 ${todayMeetings.length} reunión(es) hoy` : overdueTasks.length > 0 ? `⚠️ ${overdueTasks.length} tarea(s) vencida(s)` : `${myTasks.length} tarea(s) pendiente(s) · ${executionProjects.length} proyecto(s) activo(s)`}</div>
      </div>
      {overdueTasks.length > 0 && <div className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-full text-[11px] font-semibold hidden sm:block">{overdueTasks.length} vencida(s)</div>}
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {[
        { val: projects.length, lbl: 'Proyectos', icon: '📁', color: 'border-l-blue-500' },
        { val: executionProjects.length, lbl: 'En ejecución', icon: '🏗️', color: 'border-l-amber-500' },
        { val: pendingCount, lbl: 'Pendientes', icon: '📋', color: 'border-l-orange-500' },
        { val: tasks.filter(t => t.data.status === 'Completado').length, lbl: 'Completadas', icon: '✅', color: 'border-l-emerald-500' },
        { val: fmtCOP(totalBudget), lbl: 'Presupuesto total', icon: '💰', color: 'border-l-purple-500' },
      ].map((m, i) => (
        <div key={i} className={`bg-[var(--card)] border border-[var(--border)] border-l-4 ${m.color} rounded-xl p-3.5 md:p-4 flex items-center gap-3`}>
          <div className="text-xl md:text-2xl">{m.icon}</div>
          <div><div className="text-xl md:text-2xl font-bold">{m.val}</div><div className="text-[11px] text-[var(--muted-foreground)]">{m.lbl}</div></div>
        </div>
      ))}
    </div>

    {/* Quick Actions */}
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {[
        { icon: '➕', label: 'Proyecto', action: () => { setEditingId(null); openModal('project'); } },
        { icon: '📋', label: 'Tarea', action: () => { setForms(p => ({ ...p, taskTitle: '', taskProject: projects[0]?.id || '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); } },
        { icon: '📅', label: 'Reunión', action: () => openModal('meeting') },
        { icon: '💰', label: 'Gasto', action: () => openModal('expense') },
        { icon: '📦', label: 'Producto', action: () => navigateTo('inventory') },
        { icon: '📸', label: 'Foto', action: () => navigateTo('gallery') },
        { icon: '👥', label: 'Equipo', action: () => navigateTo('team') },
        { icon: '📊', label: 'Informe', action: () => navigateTo('profile') },
      ].map((a, i) => (
        <button key={i} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/30 transition-all whitespace-nowrap flex-shrink-0" onClick={a.action}>
          <span>{a.icon}</span>{a.label}
        </button>
      ))}
    </div>

    {/* Row 2: Budget + Upcoming Meetings */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Budget Widget */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">💰 Resumen financiero</div>
          <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('budget')}>Ver todos</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[var(--af-bg3)] rounded-lg p-3"><div className="text-[11px] text-[var(--muted-foreground)]">Presupuesto total</div><div className="text-lg font-bold text-[var(--af-accent)] mt-1">{fmtCOP(totalBudget)}</div></div>
          <div className="bg-[var(--af-bg3)] rounded-lg p-3"><div className="text-[11px] text-[var(--muted-foreground)]">Gastado</div><div className={`text-lg font-bold mt-1 ${totalSpent > totalBudget && totalBudget > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtCOP(totalSpent)}</div></div>
        </div>
        {totalBudget > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-[var(--muted-foreground)]">Utilizado</span><span className="font-semibold">{Math.round((totalSpent / totalBudget) * 100)}%</span></div>
            <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${totalSpent > totalBudget ? 'bg-red-500' : totalSpent > totalBudget * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: Math.min(100, (totalSpent / totalBudget) * 100) + '%' }} /></div>
          </div>
        )}
        {expenses.length > 0 && <div className="mt-3 space-y-1.5">{expenses.slice(0, 3).map(e => (
          <div key={e.id} className="flex items-center justify-between text-[12px]"><span className="truncate flex-1 mr-2">{e.data.concept}</span><span className="text-[var(--af-accent)] font-medium flex-shrink-0">{fmtCOP(e.data.amount)}</span></div>
        ))}</div>}
      </div>

      {/* Upcoming Meetings Widget */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">📅 Próximas reuniones</div>
          <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('calendar')}>Ver calendario</button>
        </div>
        {upcomingMeetings.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)] text-sm"><div className="text-2xl mb-2">📅</div>Sin reuniones programadas</div>
        ) : (
          <div className="space-y-2">
            {upcomingMeetings.map(m => {
              const proj = projects.find(p => p.id === m.data.projectId);
              const isToday = m.data.date === todayStr;
              return (<div key={m.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${isToday ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-[var(--af-bg3)]'} cursor-pointer`} onClick={() => navigateTo('calendar')}>
                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-[10px] font-semibold ${isToday ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                  <div className="text-base leading-none">{new Date(m.data.date + 'T12:00:00').getDate()}</div>
                  <div>{MESES[new Date(m.data.date + 'T12:00:00').getMonth()]?.substring(0, 3)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{m.data.title}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{m.data.time || 'Sin hora'}{m.data.duration ? ` · ${m.data.duration} min` : ''}{proj ? ` · ${proj.data.name}` : ''}</div>
                </div>
                {isToday && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-semibold flex-shrink-0">Hoy</span>}
              </div>);
            })}
          </div>
        )}
      </div>
    </div>

    {/* Row 3: Recent Projects + Urgent Tasks */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">📁 Proyectos recientes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('projects')}>Ver todos</button></div>
        {projects.length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">Crea tu primer proyecto</div> : projects.slice(0, 3).map(p => {
          const prog = p.data.progress || 0;
          return (<div key={p.id} className="p-3 bg-[var(--af-bg3)] rounded-lg mb-2 cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => openProject(p.id)}>
            <div className="flex justify-between mb-2"><div className="text-sm font-semibold">{p.data.name}</div><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(p.data.status)}`}>{p.data.status}</span></div>
            <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} /></div>
            <div className="flex justify-between mt-1.5"><span className="text-[11px] text-[var(--af-text3)]">{prog}%</span>{p.data.endDate && <span className="text-[11px] text-[var(--af-text3)]">{fmtDate(p.data.endDate)}</span>}</div>
          </div>);
        })}
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4"><div className="text-[15px] font-semibold">🔴 Tareas urgentes</div><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('tasks')}>Ver todas</button></div>
        {tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').length === 0 ? <div className="text-center py-8 text-[var(--af-text3)] text-sm">🎉 Sin tareas urgentes</div> : tasks.filter(t => t.data.priority === 'Alta' && t.data.status !== 'Completado').slice(0, 4).map(t => {
          const proj = projects.find(p => p.id === t.data.projectId);
          const isOverdue = t.data.dueDate && t.data.dueDate < todayStr;
          return (<div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`} />
            <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer hover:border-[var(--af-accent)]" onClick={() => toggleTask(t.id, t.data.status)} />
            <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium">{t.data.title}</div><div className="text-[11px] text-[var(--af-text3)] mt-0.5">{proj?.data.name || '—'}{t.data.assigneeId ? ' · ' + getUserName(t.data.assigneeId) : ''}</div></div>
            {isOverdue && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full flex-shrink-0">Vencida</span>}
          </div>);
        })}
      </div>
    </div>

    {/* Row 4: Inventory Alerts + Team + Recent Chat */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Low Stock Alerts */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">📦 Alertas inventario</div>
          {lowStockItems.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full font-semibold">{lowStockItems.length}</span>}
        </div>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)] text-sm"><div className="text-2xl mb-2">✅</div>Stock OK</div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center gap-2.5 p-2 bg-amber-500/5 rounded-lg cursor-pointer" onClick={() => navigateTo('inventory')}>
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">{p.data.stock || 0}</div>
                <div className="flex-1 min-w-0"><div className="text-[12px] font-medium truncate">{p.data.name}</div><div className="text-[10px] text-[var(--muted-foreground)]">Mín: {p.data.minStock || 0}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Team */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">👥 Equipo</div>
          <span className="text-[11px] text-[var(--muted-foreground)]">{activeMembers} miembro(s)</span>
        </div>
        <div className="space-y-2">
          {teamUsers.slice(0, 5).map(u => {
            const memberTasks = tasks.filter(t => t.data.assigneeId === u.id && t.data.status !== 'Completado').length;
            return (<div key={u.id} className="flex items-center gap-2.5 p-1.5 cursor-pointer hover:bg-[var(--af-bg3)] rounded-lg transition-colors" onClick={() => navigateTo('team')}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold border flex-shrink-0 ${avatarColor(u.id)}`} style={u.data.photoURL ? { backgroundImage: `url(${u.data.photoURL})`, backgroundSize: 'cover' } : {}}>{u.data.photoURL ? '' : getInitials(u.data.name)}</div>
              <div className="flex-1 min-w-0"><div className="text-[12px] font-medium truncate">{u.data.name}</div><div className="text-[10px] text-[var(--muted-foreground)]">{u.data.role || 'Miembro'}</div></div>
              {memberTasks > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">{memberTasks}</span>}
            </div>);
          })}
        </div>
      </div>

      {/* Recent Chat */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">💬 Chat reciente</div>
          <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('chat')}>Ir al chat</button>
        </div>
        {recentMsgs.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)] text-sm"><div className="text-2xl mb-2">💬</div>Sin mensajes</div>
        ) : (
          <div className="space-y-2">
            {recentMsgs.map(m => (
              <div key={m.id} className="p-2 bg-[var(--af-bg3)] rounded-lg">
                <div className="flex items-center justify-between mb-0.5"><span className="text-[11px] font-semibold text-[var(--af-accent)]">{m.userName || 'Usuario'}</span>{m.createdAt && <span className="text-[10px] text-[var(--af-text3)]">{fmtDate(m.createdAt)}</span>}</div>
                <div className="text-[12px] text-[var(--muted-foreground)] truncate">{m.type === 'AUDIO' ? '🎤 Nota de voz' : m.type === 'IMAGE' ? '📷 Foto' : m.type === 'FILE' ? `📎 ${m.fileName || 'Archivo'}` : (m.text || '').substring(0, 60)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Row 5: Construction Phases Overview */}
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-semibold flex items-center gap-2">🏗️ Fases de obra</div>
          <span className="text-[11px] text-[var(--muted-foreground)]">{executionProjects.length} proyecto(s) activo(s)</span>
        </div>
        {executionProjects.length === 0 ? (
          <div className="text-center py-8 text-[var(--af-text3)] text-sm"><div className="text-2xl mb-2">🏗️</div>No hay proyectos en ejecución</div>
        ) : (
          <div className="space-y-3">
            {executionProjects.slice(0, 5).map(p => {
              const prog = p.data.progress || 0;
              const hasDesign = p.data.status !== undefined;
              return (
                <div key={p.id} className="cursor-pointer hover:bg-[var(--af-bg3)] rounded-xl p-3.5 transition-colors" onClick={() => openProject(p.id)}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[13px] font-semibold">{p.data.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} />
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--af-accent)] w-10 text-right">{prog}%</span>
                    </div>
                  </div>
                  {/* Mini phase groups */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--af-bg3)] rounded-lg p-2">
                      <div className="text-[10px] text-[var(--muted-foreground)] mb-1">📐 Diseño</div>
                      <div className="flex gap-0.5">
                        {['Concept.', 'Antep.', 'Proy.', 'Inter.'].map((lbl, i) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full ${prog > (i + 1) * 10 ? 'bg-emerald-500' : prog > i * 10 ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} title={lbl} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-0.5">
                        {['Con.', 'Ant.', 'Proy.', 'Int.'].map((l, i) => <div key={i} className="text-[7px] text-[var(--af-text3)] text-center flex-1 truncate">{l}</div>)}
                      </div>
                    </div>
                    <div className="bg-[var(--af-bg3)] rounded-lg p-2">
                      <div className="text-[10px] text-[var(--muted-foreground)] mb-1">🏗️ Construcción</div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full ${prog > ((i + 1) / 14 * 100) ? 'bg-emerald-500' : prog > (i / 14 * 100) ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} title={ALL_PHASE_NAMES[i + 4] || ''} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>);
}
