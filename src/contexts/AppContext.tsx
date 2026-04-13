import { create } from 'zustand';

interface UIState {
  aiChatOpen: boolean;
  quickActionsOpen: boolean;
  setAIChatOpen: (open: boolean) => void;
  toggleAIChat: () => void;
  setQuickActionsOpen: (open: boolean) => void;
  toggleQuickActions: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  aiProjectContext: string;
  setAIProjectContext: (context: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  aiChatOpen: false,
  quickActionsOpen: false,
  setAIChatOpen: (open) => set({ aiChatOpen: open, quickActionsOpen: open ? false : undefined }),
  toggleAIChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen, quickActionsOpen: false })),
  setQuickActionsOpen: (open) => set({ quickActionsOpen: open, aiChatOpen: open ? false : undefined }),
  toggleQuickActions: () => set((state) => ({ quickActionsOpen: !state.quickActionsOpen, aiChatOpen: false })),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('archiflow-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  currentScreen: 'dashboard',
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  aiProjectContext: '',
  setAIProjectContext: (context) => set({ aiProjectContext: context }),
}));