import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let mockIsOnline = true;
let mockPendingCount = 0;
let mockIsSyncing = false;

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueue: () => ({
    isOnline: mockIsOnline,
    isOfflineMode: !mockIsOnline,
    isSyncing: mockIsSyncing,
    syncProgress: 50,
    pendingCount: mockPendingCount,
    syncedCount: 0,
    failedCount: 0,
    triggerSync: vi.fn(),
  }),
}));

import OfflineBanner from '@/components/common/OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline = true;
    mockPendingCount = 0;
    mockIsSyncing = false;
  });

  it('renders banner when back online (default state)', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Conexión restablecida')).toBeDefined();
  });

  it('shows offline message when isOnline is false', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    expect(screen.getByText('Sin conexión a internet')).toBeDefined();
  });

  it('does not render when online, no pending ops, and visible is false after close', () => {
    render(<OfflineBanner />);
    // Click the close button to hide the "back online" banner
    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    // Banner should disappear since there is no offline/syncing/pending state
    const alert = screen.queryByRole('alert');
    expect(alert).toBeNull();
  });

  it('has green bg when online (back online banner)', () => {
    render(<OfflineBanner />);
    const el = screen.getByText('Conexión restablecida').closest('div');
    expect(el?.className).toContain('bg-emerald-600');
  });

  it('has red bg when offline', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    const el = screen.getByText('Sin conexión a internet').closest('div');
    expect(el?.className).toContain('bg-red-600');
  });

  it('shows pending sync banner when online with pending count', () => {
    mockPendingCount = 3;
    render(<OfflineBanner />);
    expect(screen.getByText(/cambios pendientes de sincronizar/)).toBeDefined();
  });

  it('shows pending count in offline banner', () => {
    mockIsOnline = false;
    mockPendingCount = 2;
    render(<OfflineBanner />);
    expect(screen.getByText('2 operaciones pendientes')).toBeDefined();
  });

  it('shows singular form when 1 pending operation offline', () => {
    mockIsOnline = false;
    mockPendingCount = 1;
    render(<OfflineBanner />);
    expect(screen.getByText('1 operación pendiente')).toBeDefined();
  });

  it('shows syncing banner when isSyncing is true', () => {
    mockIsSyncing = true;
    render(<OfflineBanner />);
    expect(screen.getByText('Sincronizando cambios...')).toBeDefined();
  });

  it('has role="alert" for accessibility', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has aria-live="polite" for accessibility', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('fixed positioning at top z-[200]', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('fixed');
    expect(banner.className).toContain('z-[200]');
  });
});
