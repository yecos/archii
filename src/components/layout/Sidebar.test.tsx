import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

vi.mock('@/components/ui/BottomSheet', () => ({ BottomSheet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/stores/ui-store', () => ({ useUIStore: (select: (state: unknown) => unknown) => select({ setSettingsOpen: vi.fn() }) }));

const props: React.ComponentProps<typeof Sidebar> = {
  screen: 'dashboard', navigateTo: vi.fn(), sidebarOpen: false, setSidebarOpen: vi.fn(),
  sidebarCollapsed: false, setSidebarCollapsed: vi.fn(), userName: 'QA', initials: 'QA',
  authUser: null, teamUsers: [], isEmailAdmin: false, projects: [], tasks: [], pendingCount: 0,
  galleryPhotos: [], invLowStock: [], isAdmin: false, activeTenantName: 'QA', activeTenantRole: 'Miembro', onSwitchTenant: vi.fn(),
};

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(() => { vi.unstubAllGlobals(); });

it.each(['Administración', 'Calidad', 'Otros'])('opens %s on the first click with no saved preference', async category => {
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Sidebar {...props} />));
    const header = [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith(category) && button.getAttribute('aria-label')?.endsWith('expandir'))!;
    expect(header.getAttribute('aria-expanded')).toBe('false');
    await act(async () => header.click());
    expect(header.getAttribute('aria-expanded')).toBe('true');
    const item = ({ 'Administración': 'Facturas', Calidad: 'RFIs', Otros: 'Calendario' } as Record<string, string>)[category];
    expect([...container.querySelectorAll('span')].some(span => span.textContent === item)).toBe(true);
    await act(async () => header.click());
    expect(header.getAttribute('aria-expanded')).toBe('false');
  } finally { await act(async () => root.unmount()); }
});

it('honors a saved expanded category and collapses it on the first click', async () => {
  localStorage.setItem('archii-sidebar-collapsed', JSON.stringify({ admin: false }));
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Sidebar {...props} />));
    const header = [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Administración') && button.getAttribute('aria-label')?.endsWith('colapsar'))!;
    await act(async () => header.click());
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(JSON.parse(localStorage.getItem('archii-sidebar-collapsed')!).admin).toBe(true);
  } finally { await act(async () => root.unmount()); }
});
