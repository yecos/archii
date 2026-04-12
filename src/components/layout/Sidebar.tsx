'use client';
import React from 'react';
import { getInitials, avatarColor } from '@/lib/helpers';
import { ROLE_ICONS } from '@/lib/types';

interface SidebarProps {
  screen: string;
  navigateTo: (s: string, projId?: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string;
  initials: string;
  authUser: any;
  teamUsers: any[];
  isEmailAdmin: boolean;
  projects: any[];
  tasks: any[];
  pendingCount: number;
  galleryPhotos: any[];
  invLowStock: any[];
  isAdmin: boolean;
}

export default function Sidebar({
  screen, navigateTo, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed,
  userName, initials, authUser, teamUsers, isEmailAdmin,
  projects, tasks, pendingCount, galleryPhotos, invLowStock, isAdmin,
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: 'profile', label: 'Mi Perfil', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'projects', label: 'Proyectos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, badge: projects.length },
    { id: 'tasks', label: 'Tareas', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'chat', label: 'Chat', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { divider: true },
    { id: 'budget', label: 'Presupuestos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg> },
    { id: 'files', label: 'Planos y archivos', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { id: 'obra', label: 'Seguimiento obra', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
    { id: 'gallery', label: 'Galería', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, badge: galleryPhotos.length > 0 ? galleryPhotos.length : undefined },
    { id: 'inventory', label: 'Inventario', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, badge: invLowStock.length > 0 ? invLowStock.length : undefined },
    { divider: true },
    { id: 'admin', label: 'Panel Admin', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="22"/></svg> },
    { id: 'suppliers', label: 'Proveedores', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
    { id: 'team', label: 'Equipo', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, badge: teamUsers.length },
    { id: 'calendar', label: 'Calendario', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, badge: tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length > 0 ? tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length : undefined },
    { id: 'portal', label: 'Portal cliente', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { divider: true },
    { id: 'companies', label: 'Empresas', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg> },
    { id: 'install', label: 'Instalar App', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
  ];

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full bg-[var(--card)] border-r border-[var(--border)] flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${sidebarCollapsed ? 'w-[68px]' : 'w-[270px]'} max-md:!w-[270px]`}>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:flex items-center justify-center h-8 w-8 self-end mr-2 mt-2 rounded-lg hover:bg-[var(--af-bg3)] text-[var(--muted-foreground)] transition-colors cursor-pointer" title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="p-4 pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--af-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div className={`transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}><div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg">ArchiFlow</div><div className="text-[10px] text-[var(--af-text3)]">v1.0</div></div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3">
          <div className={`text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mb-1 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:h-0' : 'md:block'}`}>Principal</div>
          {navItems.filter((n: any) => !n.divider).slice(0, 5).map((n: any) => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--accent)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span className={`flex-1 transition-all duration-200 ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.label}</span>
              {n.badge !== undefined && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-all duration-200 ${n.id === 'tasks' && pendingCount > 0 ? 'bg-red-500 text-white' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'} ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.badge}</span>}
            </div>
          ))}
          <div className={`text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mt-4 mb-1 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:h-0' : 'md:block'}`}>Gestión</div>
          {navItems.filter((n: any) => !n.divider).slice(5).map((n: any) => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--accent)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span className={`transition-all duration-200 ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-3 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => navigateTo('profile')}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${avatarColor(authUser?.uid)} ${authUser?.photoURL ? '' : ''}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
          <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}><div className="text-[13px] font-medium truncate">{userName}</div><div className="text-[11px] text-[var(--muted-foreground)]">{(() => { const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro'; const displayRole = isEmailAdmin ? 'Admin' : myRole; return `${ROLE_ICONS[displayRole] || '👤'} ${displayRole}`; })()}</div></div>
        </div>
      </aside>
    </>
  );
}
