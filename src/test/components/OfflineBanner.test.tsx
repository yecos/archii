import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockDismissBanner = vi.fn();
let mockIsOnline = true;
let mockShowBanner = true;

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: mockIsOnline,
    showBanner: mockShowBanner,
    dismissBanner: mockDismissBanner,
  }),
}));

import OfflineBanner from '@/components/common/OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline = true;
    mockShowBanner = true;
  });

  it('renders banner when showBanner is true', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('does not render when showBanner is false', () => {
    mockShowBanner = false;
    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows online message when isOnline is true', () => {
    render(<OfflineBanner />);
    expect(screen.getByText('Conexión restablecida')).toBeDefined();
  });

  it('shows offline message when isOnline is false', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    expect(screen.getByText('Sin conexión a internet')).toBeDefined();
  });

  it('has green bg when online', () => {
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('bg-emerald-600');
  });

  it('has red bg when offline', () => {
    mockIsOnline = false;
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('bg-red-600');
  });

  it('calls dismissBanner when close button is clicked', () => {
    render(<OfflineBanner />);
    const closeBtn = screen.getByLabelText('Cerrar notificación');
    fireEvent.click(closeBtn);
    expect(mockDismissBanner).toHaveBeenCalledOnce();
  });

  it('has role="alert" for accessibility', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has aria-live="polite" for accessibility', () => {
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('fixed positioning at top z-[200]', () => {
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('fixed');
    expect(banner.className).toContain('z-[200]');
  });
});
