import { create } from 'zustand';

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

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Command palette
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  // AI Agent Panel
  aiAgentOpen: boolean;
  setAIAgentOpen: (open: boolean) => void;
  toggleAIAgent: () => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;

  // Current screen (for mobile optimization)
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;

  // Chat unread count (for floating bubble)
  chatUnread: number;
  setChatUnread: (count: number) => void;
  incrementChatUnread: () => void;
  clearChatUnread: () => void;

  // AI Project Context (passed from page.tsx when a project is selected)
  aiProjectContext: string;
  setAIProjectContext: (context: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
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

  // Theme
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('archiflow-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },

  // Command palette
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),

  // AI Agent Panel
  aiAgentOpen: false,
  setAIAgentOpen: (open) => set({ aiAgentOpen: open }),
  toggleAIAgent: () => set((state) => ({ aiAgentOpen: !state.aiAgentOpen })),

  // Notifications
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),

  // Current screen (for mobile optimization)
  currentScreen: 'dashboard',
  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  // Chat unread count (for floating bubble)
  chatUnread: 0,
  setChatUnread: (count) => set({ chatUnread: count }),
  incrementChatUnread: () => set((state) => ({ chatUnread: state.chatUnread + 1 })),
  clearChatUnread: () => set({ chatUnread: 0 }),

  // AI Project Context
  aiProjectContext: '',
  setAIProjectContext: (context) => set({ aiProjectContext: context }),
}));
