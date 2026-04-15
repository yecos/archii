'use client';
import React from 'react';
import { getInitials, avatarColor } from '@/lib/helpers';
import { ROLE_ICONS } from '@/lib/types';
import type { TeamUser, Project, Task, GalleryPhoto, InvProduct } from '@/lib/types';
import { LayoutGrid, User, Folder, ClipboardCheck, MessageCircle, DollarSign, FileText, Camera, Image, Package, Settings, Store, Users, Calendar, Globe, Building2, Download, ChevronLeft, ChevronRight, Home, Bell, LogOut, Check, Palette, Sparkles } from 'lucide-react';

/** Firebase auth user — loaded via CDN, so no npm type available. */
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/** Sidebar navigation item — either a clickable nav entry or a visual divider. */
type NavItem =
  | { id: string; label: string; icon: React.ReactNode; badge?: number }
  | { divider: true };

interface SidebarProps {
  screen: string;
  navigateTo: (s: string, projId?: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string;
  initials: string;
  authUser: FirebaseUser | null;
  teamUsers: TeamUser[];
  isEmailAdmin: boolean;
  projects: Project[];
  tasks: Task[];
  pendingCount: number;
  galleryPhotos: GalleryPhoto[];
  invLowStock: InvProduct[];
  isAdmin: boolean;
}

export default React.memo(function Sidebar({
  screen, navigateTo, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed,
  userName, initials, authUser, teamUsers, isEmailAdmin,
  projects, tasks, pendingCount, galleryPhotos, invLowStock, isAdmin,
}: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={18} className="stroke-current" /> },
    { id: 'profile', label: 'Mi Perfil', icon: <User size={18} className="stroke-current" /> },
    { id: 'projects', label: 'Proyectos', icon: <Folder size={18} className="stroke-current" />, badge: projects.length },
    { id: 'tasks', label: 'Tareas', icon: <ClipboardCheck size={18} className="stroke-current" />, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={18} className="stroke-current" /> },
    { id: 'settings', label: 'Configuración', icon: <Palette size={18} className="stroke-current" /> },
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
    { id: 'companies', label: 'Empresas', icon: <Building2 size={18} className="stroke-current" /> },
    { id: 'install', label: 'Instalar App', icon: <Download size={18} className="stroke-current" /> },
  ];

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px] md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full bg-[var(--skeuo-raised)] border-r border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised)] flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${sidebarCollapsed ? 'w-[68px]' : 'w-[270px]'} max-md:!w-[270px]`}>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="skeuo-btn hidden md:flex items-center justify-center h-8 w-8 self-end mr-2 mt-2 rounded-lg text-[var(--muted-foreground)] transition-colors cursor-pointer" title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          <ChevronLeft size={16} className="transition-transform" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} />
        </button>
        <div className="skeuo-panel p-4 pb-3 border-b border-[var(--skeuo-edge-light)] flex items-center gap-2.5" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--skeuo-edge-light)', boxShadow: 'inset 0 -1px 0 var(--skeuo-edge-dark), 0 1px 0 var(--skeuo-edge-light)' }}>
          <div className="w-8 h-8 bg-[var(--af-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <Home size={20} strokeWidth={2} className="stroke-background" />
          </div>
          <div className={`transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}><div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg flex items-center gap-1.5">ArchiFlow <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/15 text-[var(--af-accent)]" style={{ fontFamily: 'system-ui, sans-serif' }}>2.0</span></div><div className="text-[10px] text-[var(--af-text3)]">Premium</div></div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3">
          <div className={`text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mb-1 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:h-0' : 'md:block'}`}>Principal</div>
          {navItems.filter((n): n is Extract<NavItem, { id: string }> => !('divider' in n)).slice(0, 6).map((n) => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span className={`flex-1 transition-all duration-200 ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.label}</span>
              {n.badge !== undefined && <span className={`skeuo-badge text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-all duration-200 ${n.id === 'tasks' && pendingCount > 0 ? 'bg-red-500 text-white' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'} ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.badge}</span>}
            </div>
          ))}
          <div className={`text-[10px] font-semibold tracking-wider text-[var(--af-text3)] uppercase px-2 mt-4 mb-1 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:h-0' : 'md:block'}`}>Gestión</div>
          {navItems.filter((n): n is Extract<NavItem, { id: string }> => !('divider' in n)).slice(6).map((n) => (
            <div key={n.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${screen === n.id ? 'bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)] hover:text-[var(--foreground)]'}`} onClick={() => { navigateTo(n.id, null); if (window.innerWidth < 768) setSidebarOpen(false); }}>
              {n.icon}
              <span className={`transition-all duration-200 ${sidebarCollapsed ? 'md:hidden' : ''}`}>{n.label}</span>
            </div>
          ))}
        </div>
        {/* AI Agent Button */}
        <div className="px-3 pb-2">
          <button
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] hover:bg-[var(--af-accent)]/20 transition-all font-medium"
            onClick={() => {
              const { useUIStore } = require('@/stores/ui-store');
              const store = useUIStore.getState();
              store.setAIAgentOpen(true);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
          >
            <Sparkles size={16} className="stroke-current" />
            <span>Agente IA</span>
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/20">FREE</span>
          </button>
        </div>
        <div className="skeuo-divider border-t border-[var(--skeuo-edge-light)] p-3 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)] transition-all" onClick={() => navigateTo('profile')}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${avatarColor(authUser?.uid ?? '')} ${authUser?.photoURL ? '' : ''}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
          <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}><div className="text-[13px] font-medium truncate">{userName}</div><div className="text-[11px] text-[var(--muted-foreground)]">{(() => { const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro'; const displayRole = isEmailAdmin ? 'Admin' : myRole; return <>{ROLE_ICONS[displayRole] || <User size={14} className="inline" />} {displayRole}</>; })()}</div></div>
        </div>
      </aside>
    </>
  );
});
