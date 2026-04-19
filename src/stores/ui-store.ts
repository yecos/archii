import { create } from 'zustand';
import { THEME_REGISTRY, type ThemeDefinition } from '@/lib/theme-registry';

type ThemeId = string;

interface UIState {
  // AI Panel
  aiChatOpen: boolean;
  quickActionsOpen: boolean;
  setAIChatOpen: (open: boolean) => void;
  toggleAIChat: () => void;
  setQuickActionsOpen: (open: boolean) => void;
  toggleQuickActions: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Theme System — extensible
  /** Current theme ID (e.g., 'dark', 'light', or future custom themes) */
  theme: ThemeId;
  /** List of all registered themes */
  themes: ThemeDefinition[];
  /** Set theme by ID — applies CSS variables + class toggle + persists */
  setTheme: (themeId: ThemeId) => void;
  /** Toggle between first dark and first light theme */
  toggleTheme: () => void;
  /** Apply theme CSS variables to <html> element */
  applyThemeCSS: (themeId: ThemeId) => void;
  /** Initialize theme from localStorage on mount */
  initTheme: () => void;

  // Command palette
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;

  // Current screen (for mobile optimization)
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;

  // AI Project Context (passed from page.tsx when a project is selected)
  aiProjectContext: string;
  setAIProjectContext: (context: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // AI Panel
  aiChatOpen: false,
  quickActionsOpen: false,
  setAIChatOpen: (open) => set({ aiChatOpen: open, quickActionsOpen: open ? false : undefined }),
  toggleAIChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen, quickActionsOpen: false })),
  setQuickActionsOpen: (open) => set({ quickActionsOpen: open, aiChatOpen: open ? false : undefined }),
  toggleQuickActions: () => set((state) => ({ quickActionsOpen: !state.quickActionsOpen, aiChatOpen: false })),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Theme System
  theme: 'dark',
  themes: THEME_REGISTRY,

  initTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('archiflow-theme') || 'dark';
      set({ theme: saved });
      get().applyThemeCSS(saved);
    } catch {
      set({ theme: 'dark' });
      get().applyThemeCSS('dark');
    }
  },

  applyThemeCSS: (themeId: ThemeId) => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const themeDef = THEME_REGISTRY.find(t => t.id === themeId);

    // Remove all theme data attributes first
    THEME_REGISTRY.forEach(t => {
      html.removeAttribute(`data-theme-${t.id}`);
    });

    if (themeDef) {
      // Set data-theme attribute for the active theme
      html.setAttribute(`data-theme-${themeDef.id}`, '');
      // Apply all CSS variables
      Object.entries(themeDef.colors).forEach(([key, value]) => {
        html.style.setProperty(key, value);
      });
    }

    // Toggle .dark class for backwards compatibility with Tailwind dark: prefix
    const isDark = themeDef?.isDark ?? (themeId === 'dark');
    html.classList.toggle('dark', isDark);
  },

  setTheme: (themeId: ThemeId) => {
    set({ theme: themeId });
    if (typeof window !== 'undefined') {
      localStorage.setItem('archiflow-theme', themeId);
      get().applyThemeCSS(themeId);
    }
  },

  toggleTheme: () => {
    const { theme, themes } = get();
    const current = themes.find(t => t.id === theme);
    // Find first theme with opposite isDark value
    const opposite = themes.find(t => t.isDark !== (current?.isDark ?? true));
    const next = opposite || (theme === 'dark' ? 'light' : 'dark');
    get().setTheme(next);
  },

  // Command palette
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),

  // Notifications
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),

  // Current screen (for mobile optimization)
  currentScreen: 'dashboard',
  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  // AI Project Context
  aiProjectContext: '',
  setAIProjectContext: (context) => set({ aiProjectContext: context }),
}));
