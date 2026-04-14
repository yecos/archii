'use client';
import React from 'react';
import { useTheme } from 'next-themes';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import { avatarColor } from '@/lib/helpers';
import { Home, ChevronLeft, ChevronRight, Bell, Sun, Moon, Monitor, Plus, Menu, LayoutGrid, MoreHorizontal, ClipboardList, Folder } from 'lucide-react';

export default React.memo(function TopBar() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const notif = useNotif();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Theme toggle: cycles light → dark → system → light
  const cycleTheme = React.useCallback(() => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  // Show loading placeholder until theme is hydrated
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true; // default to dark to match FOUC script

  // Local screen title overrides (dynamic titles like projectDetail)
  const localScreenTitles: Record<string, string> = {
    dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes',
    budget: 'Presupuestos', files: 'Planos y archivos', gallery: 'Galería', inventory: 'Inventario',
    admin: 'Panel Admin', obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo',
    calendar: 'Calendario', portal: 'Portal cliente', profile: 'Mi Perfil', install: 'Instalar App',
    companies: 'Empresas', projectDetail: fs.currentProject?.data.name || 'Proyecto',
  };

  return (
    <header className="h-[60px] bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
      <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] items-center justify-center cursor-pointer md:hidden flex" onClick={() => ui.setSidebarOpen(true)}>
        <Menu size={18} className="stroke-[var(--muted-foreground)]" />
      </button>
      {ui.screen === 'projectDetail' ? (
        <button className="flex items-center gap-1.5 text-[var(--af-accent)] text-sm font-medium cursor-pointer hover:underline mr-2" onClick={() => ui.navigateTo('projects')}>
          <ChevronLeft size={16} className="stroke-current" />
          Proyectos
        </button>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium truncate af-heading-responsive">{localScreenTitles[ui.screen] || ui.screenTitles[ui.screen] || ''}</div>
        <div className="text-xs text-[var(--muted-foreground)] hidden md:block">
          {ui.screen === 'dashboard' ? `Bienvenido, ${auth.userName.split(' ')[0]}` : ui.screen === 'projectDetail' ? fs.currentProject?.data.status || '' : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell */}
        <button
          className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all relative"
          onClick={() => notif.setShowNotifPanel(!notif.showNotifPanel)}
          title="Notificaciones"
        >
          <Bell size={18} className="stroke-[var(--muted-foreground)]" />
          {notif.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
              {notif.unreadCount > 99 ? '99+' : notif.unreadCount}
            </span>
          )}
          {notif.notifPermission === 'default' && (
            <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>
        {/* Theme toggle — 3-state cycle: light / dark / system */}
        <button
          className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all"
          onClick={cycleTheme}
          title={(() => {
            if (theme === 'system') return 'Seguir sistema (clic: claro)';
            if (theme === 'dark') return 'Modo nocturno (clic: sistema)';
            return 'Modo diurno (clic: nocturno)';
          })()}
        >
          {!mounted ? (
            /* placeholder — avoids hydration mismatch */
            <Moon size={18} className="stroke-[var(--muted-foreground)]" />
          ) : theme === 'system' ? (
            <Monitor size={18} className="stroke-[var(--muted-foreground)]" />
          ) : isDark ? (
            <Sun size={18} className="stroke-[var(--muted-foreground)]" />
          ) : (
            <Moon size={18} className="stroke-[var(--muted-foreground)]" />
          )}
        </button>
        {ui.screen === 'projects' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' })); ui.openModal('project'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nuevo proyecto
          </button>
        )}
        {ui.screen === 'tasks' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { ui.setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); ui.openModal('task'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nueva tarea
          </button>
        )}
        {ui.screen === 'suppliers' && (
          <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { ui.setEditingId(null); ui.setForms(p => ({ ...p, supName: '', supCategory: 'Otro', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' })); ui.openModal('supplier'); }}>
            <Plus size={14} className="stroke-current" strokeWidth={2.5} />
            Nuevo proveedor
          </button>
        )}
        <div className={`w-9 h-9 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border flex-shrink-0 ${avatarColor(auth.authUser?.uid)}`} style={auth.authUser?.photoURL ? { backgroundImage: `url(${auth.authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{auth.authUser?.photoURL ? '' : auth.initials}</div>
      </div>
    </header>
  );
});
