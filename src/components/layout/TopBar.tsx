'use client';
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Home, ChevronLeft, ChevronRight, Bell, Sun, Moon, Plus, Menu, LayoutGrid, MoreHorizontal, ClipboardList, Folder } from 'lucide-react';

export default function TopBar() {
  const {
    screen, navigateTo, setSidebarOpen, currentProject, darkMode, toggleTheme,
    modals, setForms, setEditingId, openModal, editingId, authUser, isAdmin,
    initials, avatarColor, pendingCount, setShowNotifPanel, unreadCount, notifPermission,
    projects, userName, companies, showNotifPanel, screenTitles,
  } = useApp();

  // Local screen title overrides (dynamic titles like projectDetail)
  const localScreenTitles: Record<string, string> = {
    dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes',
    budget: 'Presupuestos', files: 'Planos y archivos', gallery: 'Galería', inventory: 'Inventario',
    admin: 'Panel Admin', obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo',
    calendar: 'Calendario', portal: 'Portal cliente', profile: 'Mi Perfil', install: 'Instalar App',
    companies: 'Empresas', projectDetail: currentProject?.data.name || 'Proyecto',
  };

  return (
    <header className="h-[60px] bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
      <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] items-center justify-center cursor-pointer md:hidden flex" onClick={() => setSidebarOpen(true)}>
        <Menu size={18} className="stroke-[var(--muted-foreground)]" />
      </button>
      {screen === 'projectDetail' ? (
        <button className="flex items-center gap-1.5 text-[var(--af-accent)] text-sm font-medium cursor-pointer hover:underline mr-2" onClick={() => navigateTo('projects')}>
          <ChevronLeft size={16} className="stroke-current" />
          Proyectos
        </button>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium truncate af-heading-responsive">{localScreenTitles[screen] || screenTitles[screen] || ''}</div>
        <div className="text-xs text-[var(--muted-foreground)] hidden md:block">
          {screen === 'dashboard' ? `Bienvenido, ${userName.split(' ')[0]}` : screen === 'projectDetail' ? currentProject?.data.status || '' : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell */}
        <button
          className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all relative"
          onClick={() => setShowNotifPanel(!showNotifPanel)}
          title="Notificaciones"
        >
          <Bell size={18} className="stroke-[var(--muted-foreground)]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {notifPermission === 'default' && (
            <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>
        {/* Theme toggle */}
        <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all" onClick={toggleTheme} title={(darkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche') + ' (Ctrl+D)'}>
          {darkMode ? (
            <Sun size={18} className="stroke-[var(--muted-foreground)]" />
          ) : (
            <Moon size={18} className="stroke-[var(--muted-foreground)]" />
          )}
        </button>
        {screen === 'projects' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' })); openModal('project'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nuevo proyecto
          </button>
        )}
        {screen === 'tasks' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nueva tarea
          </button>
        )}
        {screen === 'suppliers' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, supName: '', supCategory: 'Otro', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' })); openModal('supplier'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nuevo proveedor
          </button>
        )}
        <div className={`w-9 h-9 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border flex-shrink-0 ${avatarColor(authUser?.uid)}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
      </div>
    </header>
  );
}
