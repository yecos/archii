import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import TenantSelectionScreen from './TenantSelectionScreen';

const app = vi.hoisted(() => ({
  authUser: { uid: 'qa-user' },
  switchTenant: vi.fn(),
  showToast: vi.fn(),
  userName: 'Usuario QA',
  showTenantSelector: true,
  tenantReady: true,
  setShowTenantSelector: vi.fn(),
}));

vi.mock('@/contexts/AppContext', () => ({ useApp: () => app }));
vi.mock('@/lib/firebase-service', () => ({ getAuthHeaders: async () => ({}) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('keeps the explicit workspace selector open and starts a new workspace without migration', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: async () => ({ tenants: [{ id: 'qa', name: 'Horizonte QA', role: 'Super Admin' }] }),
  }));
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<TenantSelectionScreen />));
    expect(app.switchTenant).not.toHaveBeenCalled();
    const createButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.includes('Crear nuevo espacio'),
    );
    expect(createButton).toBeDefined();
    await act(async () => createButton?.click());
    expect(container.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed')).toBe('false');
  } finally {
    await act(async () => root.unmount());
  }
});
