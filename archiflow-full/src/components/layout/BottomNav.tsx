'use client';
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { LayoutGrid, Folder, ClipboardList, MessageCircle, MoreHorizontal } from 'lucide-react';

export default function BottomNav() {
  const { screen, navigateTo, setSidebarOpen, sidebarOpen } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-lg border-t border-[var(--border)] flex z-40 safe-bottom" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
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
            {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--af-accent)]" />}
            {item.icon}
            <span className="text-[10px] leading-tight font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
