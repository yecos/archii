'use client';

import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { USER_ROLES, ROLE_COLORS, ROLE_ICONS, avatarColor } from '@/lib/constants';
import { getInitials } from '@/lib/utils';

export default function TeamScreen() {
  const teamUsers = useAppStore(s => s.teamUsers);
  const tasks = useAppStore(s => s.tasks);
  const authUser = useAppStore(s => s.authUser);
  const showToast = useAppStore(s => s.showToast);

  // TODO: connect to updateUserRole (defined in page.tsx)
  const updateUserRole = async (uid: string, newRole: string) => {
    try {
      await (window as any).firebase.firestore().collection('team').doc(uid).update({ role: newRole });
      showToast(`Rol actualizado a ${newRole}`);
    } catch {
      showToast('Error al actualizar rol', 'error');
    }
  };

  return (<div className="animate-fadeIn">
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div className="text-sm text-[var(--muted-foreground)]">{teamUsers.length} miembros en el equipo</div>
    </div>
    {/* Role Summary */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
      {USER_ROLES.slice(0, 4).map(role => {
        const count = teamUsers.filter(u => u.data.role === role).length;
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
      {teamUsers.map(user => {
        const role = user.data.role || 'Miembro';
        const isMe = user.id === authUser?.uid;
        const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro';
        const canChangeRole = myRole === 'Admin' || myRole === 'Director';
        const userTasks = tasks.filter(t => t.data.assigneeId === user.id);
        const userPending = userTasks.filter(t => t.data.status !== 'Completado').length;
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
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] truncate">{user.data.email}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-[var(--af-text3)]">{userTasks.length} tareas</span>
                  <span className="text-[10px] text-[var(--af-text3)]">{userPending} pendientes</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {canChangeRole && !isMe ? (
                  <select className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--foreground)] outline-none cursor-pointer" value={role} onChange={e => updateUserRole(user.id, e.target.value)}>
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
  </div>);
}
