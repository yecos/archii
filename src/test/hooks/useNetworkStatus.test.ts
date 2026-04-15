import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  let onlineListeners: Array<() => void> = [];
  let offlineListeners: Array<() => void> = [];

  beforeEach(() => {
    // Reset listener tracking
    onlineListeners = [];
    offlineListeners = [];

    // Mock navigator.onLine to true by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Track event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === 'online') onlineListeners.push(handler as () => void);
        if (event === 'offline') offlineListeners.push(handler as () => void);
      }
    );

    vi.spyOn(window, 'removeEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === 'online') onlineListeners = onlineListeners.filter(h => h !== handler);
        if (event === 'offline') offlineListeners = offlineListeners.filter(h => h !== handler);
      }
    );

    // Mock setTimeout for the "back online" banner auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    // Restore original navigator.onLine
    if (originalOnline) {
      Object.defineProperty(navigator, 'onLine', originalOnline);
    }
  });

  it('initial state matches navigator.onLine (true)', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const { result } = renderHook(() => useNetworkStatus());

    // After the useEffect runs, isOnline should be set to navigator.onLine
    expect(result.current.isOnline).toBe(true);
    expect(result.current.showBanner).toBe(false);
  });

  it('initial state matches navigator.onLine (false)', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('sets isOnline to true and shows banner when online event fires', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);

    // Go online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    act(() => {
      onlineListeners.forEach(listener => listener());
    });

    expect(result.current.isOnline).toBe(true);
    // Banner should show briefly when coming back online
    expect(result.current.showBanner).toBe(true);

    // After 3 seconds the banner auto-dismisses
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.showBanner).toBe(false);
  });

  it('sets isOnline to false and shows banner when offline event fires', () => {
    // Start online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.showBanner).toBe(false);

    // Go offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    act(() => {
      offlineListeners.forEach(listener => listener());
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.showBanner).toBe(true);
  });

  it('dismissBanner sets showBanner to false', () => {
    // Go offline to trigger banner
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => {
      offlineListeners.forEach(listener => listener());
    });
    expect(result.current.showBanner).toBe(true);

    act(() => {
      result.current.dismissBanner();
    });

    expect(result.current.showBanner).toBe(false);
  });

  it('removes event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    const addOnlineCalls = addSpy.mock.calls.filter(c => c[0] === 'online');
    const addOfflineCalls = addSpy.mock.calls.filter(c => c[0] === 'offline');

    unmount();

    const removeOnlineCalls = removeSpy.mock.calls.filter(c => c[0] === 'online');
    const removeOfflineCalls = removeSpy.mock.calls.filter(c => c[0] === 'offline');

    // Should have registered and cleaned up listeners
    expect(addOnlineCalls.length).toBeGreaterThan(0);
    expect(removeOnlineCalls.length).toBe(addOnlineCalls.length);
    expect(addOfflineCalls.length).toBeGreaterThan(0);
    expect(removeOfflineCalls.length).toBe(addOfflineCalls.length);
  });
});
