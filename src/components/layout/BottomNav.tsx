'use client';

import { useApp } from '@/context/AppContext';

export default function BottomNav() {
  const { screen, navigateTo, sidebarOpen, setSidebarOpen, projects, pendingCount } = useApp();

  const items = [
    { id: 'dashboard', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: 'Inicio' },
    { id: 'projects', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Proyectos', badge: projects.length > 0 ? projects.length : undefined },
    { id: 'tasks', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: 'Tareas', badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'chat', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat' },
    { id: '_more', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>, label: 'Más' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)]/95 backdrop-blur-md border-t border-[var(--border)] flex z-40 safe-bottom"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
    >
      {items.map(item => {
        const isActive = item.id !== '_more' && screen === item.id;
        const badge = item.badge;
        return (
          <button
            key={item.id}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-all relative ${item.id === '_more' ? (sidebarOpen ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]') : isActive ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`}
            onClick={() => item.id === '_more' ? setSidebarOpen(true) : navigateTo(item.id, null)}
          >
            {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--af-accent)] rounded-full" />}
            <div className="relative">
              {item.icon}
              {badge && <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold bg-[var(--af-accent)] text-background rounded-full px-0.5">{badge > 99 ? '99' : badge}</span>}
            </div>
            <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
