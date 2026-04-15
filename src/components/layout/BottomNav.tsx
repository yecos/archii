'use client';
import React from 'react';
import { useUIContext as useUI } from '@/contexts/UIContext';
import { LayoutGrid, Folder, ClipboardList, MessageCircle, MoreHorizontal } from 'lucide-react';

export default React.memo(function BottomNav() {
  const ui = useUI();
  const { screen, navigateTo, setSidebarOpen, sidebarOpen } = ui;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--skeuo-raised)]/90 backdrop-blur-xl border-t border-[var(--skeuo-edge-light)] shadow-[0_-2px_8px_var(--skeuo-shadow)] flex z-40 safe-bottom" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
      {[
        { id: 'dashboard', icon: <LayoutGrid size={20} />, label: 'Inicio' },
        { id: 'projects', icon: <Folder size={20} />, label: 'Proyectos' },
        { id: 'tasks', icon: <ClipboardList size={20} />, label: 'Tareas' },
        { id: 'chat', icon: <MessageCircle size={20} />, label: 'Chat' },
        { id: '_more', icon: <MoreHorizontal size={20} />, label: 'Más' },
      ].map(item => {
        const isActive = item.id === '_more' ? sidebarOpen : screen === item.id;
        return (
          <button key={item.id} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-all relative ${isActive ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`} onClick={() => item.id === '_more' ? setSidebarOpen(true) : navigateTo(item.id, null)}>
            {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--skeuo-inset)]" style={{ boxShadow: 'inset 0 1px 2px var(--skeuo-shadow-inset)' }} />}
            {item.icon}
            <span className={`text-[10px] leading-tight font-medium ${isActive ? 'bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] px-2 py-0.5 rounded-md' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
});
