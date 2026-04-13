'use client';
import React from 'react';
import { getInitials, avatarColor } from '@/lib/helpers';
import { ROLE_ICONS } from '@/lib/types';
import { LayoutGrid, User, Folder, ClipboardCheck, MessageCircle, DollarSign, FileText, Camera, Image, Package, Settings, Store, Users, Calendar, Globe, Building2, Download, ChevronLeft, ChevronRight, Home, Bell, LogOut, Check, Columns3, BarChart3, BookOpen, ListChecks, Hammer, StickyNote } from 'lucide-react';

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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={18} className="stroke-current" /> },
    { id: 'profile', label: 'Mi Perfil', icon: <User size={18} className="stroke-current" /> },
    { id: 'projects', label: 'Proyectos', icon: <Folder size={18} className="stroke-current" />, badge: projects.length },
    { id: 'tasks', label: 'Tareas', icon: <ClipboardCheck size={18} className="stroke-current" />, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={18} className="stroke-current" /> },
    { divider: true },
    { id: 'budget', label: 'Presupuestos', icon: <DollarSign size={18} className="stroke-current" /> },
    { id: 'files', label: 'Planos y archivos', icon: <FileText size={18} className="stroke-current" /> },
    { id: 'obra', label: 'Seguimiento obra', icon: <Camera size={18} className="stroke-current" /> },
    { id: 'gallery', label: 'Galería', icon: <Image size={18} className="stroke-current" />, badge: galleryPhotos.length > 0 ? galleryPhotos.length : undefined },
    { id: 'inventory', label: 'Inventario', icon: <Package size={18} className="stroke-current" />, badge: invLowStock.length > 0 ? invLowStock.length : undefined },
    { divider: true },
    { id: 'admin', label: 'Panel Admin', icon: <Settings size={18} className="stroke-current" /> },
    { id: 'suppliers', label: 'Proveedores', icon: <Store size={18} className="stroke-current" /> },
    { id: 'team', label: 'Equipo', icon: <Users size={18} className="stroke-current" />, badge: teamUsers.length },
    { id: 'calendar', label: 'Calendario', icon: <Calendar size={18} className="stroke-current" />, badge: tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length > 0 ? tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado').length : undefined },
    { id: 'portal', label: 'Portal cliente', icon: <Globe size={18} className="stroke-current" /> },
    { divider: true },
    { id: 'kanbanAvanzado', label: 'Tablero Kanban', icon: <Columns3 size={18} className="stroke-current" /> },
    { id: 'gantt', label: 'Diagrama Gantt', icon: <BarChart3 size={18} className="stroke-current" /> },
    { id: 'bitacora', label: 'Bitácora de Obra', icon: <BookOpen size={18} className="stroke-current" /> },
    { id: 'checklists', label: 'Checklists de Obra', icon: <ListChecks size={18} className="stroke-current" /> },
    { id: 'punchList', label: 'Punch List', icon: <Hammer size={18} className="stroke-current" /> },
    { id: 'notas', label: 'Notas Rápidas', icon: <StickyNote size={18} className="stroke-current" /> },
    { divider: true },
    { id: 'companies', label: 'Empresas', icon: <Building2 size={18} className="stroke-current" /> },
    { id: 'install', label: 'Instalar App', icon: <Download size={18} className="stroke-current" /> },
  ];

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full bg-[var(--card)] border-r border-[var(--border)] flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${sidebarCollapsed ? 'w-[68px]' : 'w-[270px]'} max-md:!w-[270px]`}>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:flex items-center justify-center h-8 w-8 self-end mr-2 mt-2 rounded-lg hover:bg-[var(--af-bg3)] text-[var(--muted-foreground)] transition-colors cursor-pointer" title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          <ChevronLeft size={16} className="transition-transform" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} />
        </button>
        <div className="p-4 pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--af-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <Home size={20} strokeWidth={2} className="stroke-background" />
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
