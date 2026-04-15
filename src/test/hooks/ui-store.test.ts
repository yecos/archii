import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useUIStore.setState({
      aiChatOpen: false,
      quickActionsOpen: false,
      sidebarOpen: true,
      theme: 'dark',
      commandOpen: false,
      aiAgentOpen: false,
      unreadCount: 0,
      currentScreen: 'dashboard',
      aiProjectContext: '',
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useUIStore.getState();
      expect(state.aiChatOpen).toBe(false);
      expect(state.quickActionsOpen).toBe(false);
      expect(state.sidebarOpen).toBe(true);
      expect(state.theme).toBe('dark');
      expect(state.commandOpen).toBe(false);
      expect(state.aiAgentOpen).toBe(false);
      expect(state.unreadCount).toBe(0);
      expect(state.currentScreen).toBe('dashboard');
      expect(state.aiProjectContext).toBe('');
    });
  });

  describe('AI Chat panel', () => {
    it('setAIChatOpen opens the panel and closes quickActions', () => {
      useUIStore.getState().setQuickActionsOpen(true);
      expect(useUIStore.getState().quickActionsOpen).toBe(true);

      useUIStore.getState().setAIChatOpen(true);
      expect(useUIStore.getState().aiChatOpen).toBe(true);
      expect(useUIStore.getState().quickActionsOpen).toBe(false);
    });

    it('toggleAIChat toggles the panel', () => {
      expect(useUIStore.getState().aiChatOpen).toBe(false);

      useUIStore.getState().toggleAIChat();
      expect(useUIStore.getState().aiChatOpen).toBe(true);

      useUIStore.getState().toggleAIChat();
      expect(useUIStore.getState().aiChatOpen).toBe(false);
    });

    it('toggleAIChat closes quickActions when opening', () => {
      useUIStore.getState().setQuickActionsOpen(true);
      useUIStore.getState().toggleAIChat();
      expect(useUIStore.getState().quickActionsOpen).toBe(false);
    });
  });

  describe('Quick Actions panel', () => {
    it('setQuickActionsOpen opens the panel and closes aiChat', () => {
      useUIStore.getState().setAIChatOpen(true);
      expect(useUIStore.getState().aiChatOpen).toBe(true);

      useUIStore.getState().setQuickActionsOpen(true);
      expect(useUIStore.getState().quickActionsOpen).toBe(true);
      expect(useUIStore.getState().aiChatOpen).toBe(false);
    });

    it('toggleQuickActions toggles the panel', () => {
      expect(useUIStore.getState().quickActionsOpen).toBe(false);

      useUIStore.getState().toggleQuickActions();
      expect(useUIStore.getState().quickActionsOpen).toBe(true);

      useUIStore.getState().toggleQuickActions();
      expect(useUIStore.getState().quickActionsOpen).toBe(false);
    });

    it('toggleQuickActions closes aiChat when opening', () => {
      useUIStore.getState().setAIChatOpen(true);
      useUIStore.getState().toggleQuickActions();
      expect(useUIStore.getState().aiChatOpen).toBe(false);
    });
  });

  describe('Sidebar', () => {
    it('toggleSidebar toggles sidebar state', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('setSidebarOpen sets explicit value', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('Theme', () => {
    it('setTheme updates the theme', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');

      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });
  });

  describe('Command palette', () => {
    it('toggleCommand toggles command palette', () => {
      expect(useUIStore.getState().commandOpen).toBe(false);

      useUIStore.getState().toggleCommand();
      expect(useUIStore.getState().commandOpen).toBe(true);

      useUIStore.getState().toggleCommand();
      expect(useUIStore.getState().commandOpen).toBe(false);
    });

    it('setCommandOpen sets explicit value', () => {
      useUIStore.getState().setCommandOpen(true);
      expect(useUIStore.getState().commandOpen).toBe(true);
    });
  });

  describe('AI Agent panel', () => {
    it('toggleAIAgent toggles the panel', () => {
      expect(useUIStore.getState().aiAgentOpen).toBe(false);

      useUIStore.getState().toggleAIAgent();
      expect(useUIStore.getState().aiAgentOpen).toBe(true);

      useUIStore.getState().toggleAIAgent();
      expect(useUIStore.getState().aiAgentOpen).toBe(false);
    });

    it('setAIAgentOpen sets explicit value', () => {
      useUIStore.getState().setAIAgentOpen(true);
      expect(useUIStore.getState().aiAgentOpen).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('setUnreadCount sets explicit count', () => {
      useUIStore.getState().setUnreadCount(5);
      expect(useUIStore.getState().unreadCount).toBe(5);
    });

    it('incrementUnread increments the count', () => {
      useUIStore.getState().setUnreadCount(3);
      useUIStore.getState().incrementUnread();
      expect(useUIStore.getState().unreadCount).toBe(4);
    });

    it('clearUnread resets to 0', () => {
      useUIStore.getState().setUnreadCount(10);
      useUIStore.getState().clearUnread();
      expect(useUIStore.getState().unreadCount).toBe(0);
    });
  });

  describe('Current screen', () => {
    it('setCurrentScreen changes the active screen', () => {
      useUIStore.getState().setCurrentScreen('tasks');
      expect(useUIStore.getState().currentScreen).toBe('tasks');

      useUIStore.getState().setCurrentScreen('projects');
      expect(useUIStore.getState().currentScreen).toBe('projects');
    });
  });

  describe('AI Project Context', () => {
    it('setAIProjectContext sets the context string', () => {
      useUIStore.getState().setAIProjectContext('proj-123');
      expect(useUIStore.getState().aiProjectContext).toBe('proj-123');

      useUIStore.getState().setAIProjectContext('');
      expect(useUIStore.getState().aiProjectContext).toBe('');
    });
  });
});
