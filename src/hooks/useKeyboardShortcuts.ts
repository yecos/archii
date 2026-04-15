'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

interface KeyboardShortcutsConfig {
  enabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig = {}): void {
  const { enabled = true } = config;

  const {
    toggleAIChat,
    toggleQuickActions,
    toggleSidebar,
    toggleCommand,
    setTheme,
    theme,
  } = useUIStore();

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cmd/Ctrl + K → Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommand();
        return;
      }

      // Cmd/Ctrl + / → Toggle shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleShortcutsHelp();
        return;
      }

      // Ignorar el resto de atajos si estamos en un input
      if (isInput) return;

      // Escape → Cerrar paneles
      if (e.key === 'Escape') {
        return; // Ya manejado por el componente correspondiente
      }

      // Alt + A → Abrir chat IA
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        toggleAIChat();
        return;
      }

      // Alt + Q → Acciones rápidas
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        toggleQuickActions();
        return;
      }

      // Alt + S → Toggle sidebar
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Alt + T → Toggle tema
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    enabled,
    toggleAIChat,
    toggleQuickActions,
    toggleSidebar,
    toggleCommand,
    setTheme,
    theme,
  ]);
}

/* ===== Shortcuts Help Overlay ===== */

let helpVisible = false;
let helpEl: HTMLDivElement | null = null;

const SHORTCUTS_LIST = [
  { keys: 'Ctrl/⌘ + K', description: 'Command palette', category: 'General' },
  { keys: 'Ctrl/⌘ + /', description: 'Atajos de teclado', category: 'General' },
  { keys: 'Alt + A', description: 'Chat IA', category: 'Paneles' },
  { keys: 'Alt + Q', description: 'Acciones rápidas', category: 'Paneles' },
  { keys: 'Alt + S', description: 'Sidebar', category: 'Paneles' },
  { keys: 'Alt + T', description: 'Tema claro/oscuro', category: 'General' },
  { keys: 'Escape', description: 'Cerrar panel/modal', category: 'General' },
];

function createHelpOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'af-shortcuts-help';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);opacity:0;transition:opacity 0.2s;cursor:pointer;';

  const isDark = document.documentElement.classList.contains('dark');
  const bg = isDark ? 'rgba(26,26,32,0.95)' : 'rgba(255,255,255,0.95)';
  const text = isDark ? '#e4e4e7' : '#27272a';
  const muted = isDark ? '#71717a' : '#a1a1aa';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // Group by category
  const categories: Record<string, typeof SHORTCUTS_LIST> = {};
  for (const s of SHORTCUTS_LIST) {
    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  }

  let html = `<div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:28px 32px;max-width:420px;width:90%;color:${text};font-family:'DM Sans',system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.3);cursor:default;">`;
  html += `<div style="font-size:16px;font-weight:600;margin-bottom:20px;">⌨️ Atajos de teclado</div>`;

  for (const [cat, items] of Object.entries(categories)) {
    html += `<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${muted};margin-bottom:8px;">${cat}</div>`;
    for (const item of items) {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid ${border};">`;
      html += `<span style="font-size:13px;">${item.description}</span>`;
      html += `<kbd style="background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};padding:3px 8px;border-radius:6px;font-size:12px;font-family:inherit;color:${muted};border:1px solid ${border};">${item.keys}</kbd>`;
      html += `</div>`;
    }
  }

  html += `<div style="font-size:11px;color:${muted};text-align:center;margin-top:16px;">Presiona Ctrl+/ o haz clic fuera para cerrar</div>`;
  html += `</div>`;

  el.innerHTML = html;

  // Close on click outside the inner card
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement) === el) toggleShortcutsHelp();
  });

  return el;
}

export function toggleShortcutsHelp() {
  helpVisible = !helpVisible;

  if (helpVisible) {
    if (!helpEl) {
      helpEl = createHelpOverlay();
      document.body.appendChild(helpEl);
    }
    requestAnimationFrame(() => {
      if (helpEl) helpEl.style.opacity = '1';
    });
  } else {
    if (helpEl) {
      helpEl.style.opacity = '0';
      setTimeout(() => {
        if (helpEl && helpEl.parentNode) {
          helpEl.parentNode.removeChild(helpEl);
          helpEl = null;
        }
      }, 200);
    }
  }
}
