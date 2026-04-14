'use client';
import React from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { USER_ROLES, ROLE_COLORS, ROLE_ICONS } from '@/lib/types';
import { getInitials, avatarColor } from '@/lib/helpers';

export default function TeamScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        {/* Company filter for team */}
        {(auth.getMyRole() === 'Admin' || auth.getMyRole() === 'Director') && fs.companies.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-1">
            <button className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${!ui.forms.teamCompanyFilter ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => ui.setForms(p => ({ ...p, teamCompanyFilter: '' }))}>
              👥 Todo el equipo
            </button>
            {fs.companies.map(c => (
              <button key={c.id} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${ui.forms.teamCompanyFilter === c.id ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => ui.setForms(p => ({ ...p, teamCompanyFilter: c.id }))}>
                🏢 {c.data.name}
              </button>
            ))}
          </div>
        )}
        <div className="text-sm text-[var(--muted-foreground)]">{auth.teamUsers.filter(u => !ui.forms.teamCompanyFilter || u.data.companyId === ui.forms.teamCompanyFilter).length} miembros</div>
      </div>
      {/* Role Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {USER_ROLES.slice(0, 4).map(role => {
          const filtered = auth.teamUsers.filter(u => !ui.forms.teamCompanyFilter || u.data.companyId === ui.forms.teamCompanyFilter);
          const count = filtered.filter(u => u.data.role === role).length;
          return (
            <div key={role} className={`border rounded-xl p-3 text-center ${ROLE_COLORS[role]}`}>
              <div className="text-lg mb-0.5">{ROLE_ICONS[role]}</div>
              <div className="text-lg font-bold">{count}</div>
              <div className="text-[10px] font-medium">{role}s</div>
            </div>
          );
        })}
      </div>
      {/* Team Members List */}
      <div className="space-y-2">
        {auth.teamUsers.filter(u => !ui.forms.teamCompanyFilter || u.data.companyId === ui.forms.teamCompanyFilter).map(user => {
          const role = user.data.role || 'Miembro';
          const isMe = user.id === auth.authUser?.uid;
          const myRole = auth.getMyRole();
          const canChangeRole = myRole === 'Admin' || myRole === 'Director';
          const canChangeCompany = myRole === 'Admin' || myRole === 'Director';
          const userTasks = fs.tasks.filter(t => t.data.assigneeId === user.id);
          const userPending = userTasks.filter(t => t.data.status !== 'Completado').length;
          const userCompName = fs.companies.find(c => c.id === user.data.companyId)?.data?.name;
          return (
            <div key={user.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all ${isMe ? 'ring-1 ring-[var(--af-accent)]/30' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold border-2 ${avatarColor(user.id)} flex-shrink-0`} style={user.data.photoURL ? { backgroundImage: `url(${user.data.photoURL})`, backgroundSize: 'cover' } : {}}>
                  {user.data.photoURL ? '' : getInitials(user.data.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold">{user.data.name}</span>
                    {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">Tú</span>}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>{ROLE_ICONS[role]} {role}</span>
                    {userCompName && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--af-text3)]">🏢 {userCompName}</span>}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)] truncate">{user.data.email}</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-[var(--af-text3)]">{userTasks.length} tareas</span>
                    <span className="text-[10px] text-[var(--af-text3)]">{userPending} pendientes</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                  {canChangeCompany && !isMe ? (
                    <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--foreground)] outline-none cursor-pointer max-w-[140px]" value={user.data.companyId || ''} onChange={e => auth.updateUserCompany(user.id, e.target.value)} title="Asignar empresa">
                      <option value="">Sin empresa</option>
                      {fs.companies.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}
                    </select>
                  ) : canChangeCompany && isMe ? (
                    <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--foreground)] outline-none cursor-pointer max-w-[140px]" value={user.data.companyId || ''} onChange={e => auth.updateUserCompany(user.id, e.target.value)} title="Tu empresa">
                      <option value="">Sin empresa</option>
                      {fs.companies.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}
                    </select>
                  ) : null}
                  {canChangeRole && !isMe ? (
                    <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--foreground)] outline-none cursor-pointer" value={role} onChange={e => auth.updateUserRole(user.id, e.target.value)}>
                      {USER_ROLES.map(r => <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>)}
                    </select>
                  ) : isMe ? (
                    <span className="text-[10px] text-[var(--af-text3)]">Tu rol</span>
                  ) : (
                    <span className="text-[10px] text-[var(--af-text3)]">{role}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
