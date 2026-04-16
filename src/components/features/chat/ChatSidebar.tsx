'use client';
import { Search } from 'lucide-react';
import { getAvatarHSL } from './chat-helpers';
import type { TeamUser, Project } from '@/lib/types';

interface ChatSidebarProps {
  chatMobileShow: boolean;
  chatSearch: string;
  onChatSearchChange: (value: string) => void;
  chatProjectId: string | null;
  chatDmUser: string | null;
  authUserUid: string | undefined;
  teamUsers: TeamUser[];
  projects: Project[];
  onSelectGeneral: () => void;
  onSelectDm: (userId: string) => void;
  onSelectProject: (projectId: string) => void;
}

export default function ChatSidebar({
  chatMobileShow,
  chatSearch,
  onChatSearchChange,
  chatProjectId,
  chatDmUser,
  authUserUid,
  teamUsers,
  projects,
  onSelectGeneral,
  onSelectDm,
  onSelectProject,
}: ChatSidebarProps) {
  return (
    <div className={`${chatMobileShow ? 'hidden md:flex' : 'flex'} flex-col flex-1 md:w-[280px] md:flex-shrink-0 border-r border-[var(--border)] overflow-hidden bg-[var(--card)] md:bg-transparent md:border-r-0 md:border-l md:border-l-[var(--skeuo-edge-light)]`}>
      {/* Search */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="relative">
          <Search className="w-4 h-4 flex-shrink-0 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input className="skeuo-input w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl placeholder:text-[var(--af-text3)]" placeholder="Buscar conversaciones..." value={chatSearch || ''} onChange={e => onChatSearchChange(e.target.value)} />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* Chat General */}
        <div
          className={`flex items-center gap-3 px-3 py-3.5 cursor-pointer transition-all duration-200 border-l-[3px] ${chatProjectId === '__general__' ? 'bg-[var(--skeuo-raised)] border-l-[var(--af-accent)] shadow-[var(--skeuo-shadow-raised-sm)]' : 'border-l-transparent hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)]'}`}
          onClick={onSelectGeneral}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-lg flex-shrink-0 shadow-md">💬</div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[var(--foreground)]">Chat General</div>
            <div className="text-[11px] text-[var(--af-text3)] truncate">Canal de todo el equipo</div>
          </div>
        </div>

        {/* Colaboradores (DM) */}
        {teamUsers.length > 0 && (
          <div className="mt-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Colaboradores ({teamUsers.length})</div>
            {teamUsers
              .filter(u => u.id !== authUserUid && (!chatSearch || u.data.name.toLowerCase().includes((chatSearch || '').toLowerCase()) || (u.data.email || '').toLowerCase().includes((chatSearch || '').toLowerCase())))
              .map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 border-l-[3px] ${chatDmUser === u.id && chatProjectId === '__dm__' ? 'bg-[var(--skeuo-raised)] border-l-[var(--af-accent)] shadow-[var(--skeuo-shadow-raised-sm)]' : 'border-l-transparent hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)]'}`}
                  onClick={() => onSelectDm(u.id)}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold"
                      style={{ background: u.data.photoURL ? undefined : getAvatarHSL(u.id), color: '#fff' }}
                    >
                      {u.data.photoURL ? <img src={u.data.photoURL} alt={u.data.name || "Avatar"} className="w-full h-full rounded-full object-cover" loading="lazy" /> : (u.data.name || u.data.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--card)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate text-[var(--foreground)]">{u.data.name || u.data.email}</div>
                    <div className="text-[11px] text-[var(--af-text3)] truncate">{u.data.role || 'Miembro'}</div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Project chats */}
        {projects.length > 0 && (
          <div className="mt-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Proyectos ({projects.length})</div>
            {projects
              .filter(p => !chatSearch || p.data.name.toLowerCase().includes((chatSearch || '').toLowerCase()))
              .map(p => {
                const projColor = p.data.color || 'var(--af-accent)';
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 border-l-[3px] ${p.id === chatProjectId && chatProjectId !== '__general__' && chatProjectId !== '__dm__' ? 'bg-[var(--skeuo-raised)] border-l-[var(--af-accent)] shadow-[var(--skeuo-shadow-raised-sm)]' : 'border-l-transparent hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)]'}`}
                    onClick={() => onSelectProject(p.id)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: projColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate text-[var(--foreground)]">{p.data.name}</div>
                      <div className="text-[11px] text-[var(--af-text3)] truncate">{p.data.client ? `Cliente: ${p.data.client}` : 'Canal del equipo'}</div>
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
