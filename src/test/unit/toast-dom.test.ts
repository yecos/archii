import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  domToast,
  dismissDomToast,
  dismissAllDomToasts,
} from '@/lib/toast-dom';

/* ── Mock requestAnimationFrame (jsdom doesn't provide it) ── */

function mockRAF() {
  const mockRAF = (cb: FrameRequestCallback) => {
    // Execute callback immediately with a dummy timestamp
    return setTimeout(() => cb(0), 0);
  };
  const mockCAF = (id: number) => clearTimeout(id);
  vi.stubGlobal('requestAnimationFrame', mockRAF);
  vi.stubGlobal('cancelAnimationFrame', mockCAF);
}

/* ── Cleanup helpers ────────────────────────────────────── */

function cleanupToastContainer() {
  const existing = document.getElementById('af-dom-toast-container');
  if (existing) {
    existing.remove();
  }
  // Dismiss all active toasts to clear internal state and timeouts
  dismissAllDomToasts();
}

beforeEach(() => {
  mockRAF();
  cleanupToastContainer();
});

afterEach(() => {
  cleanupToastContainer();
  vi.useRealTimers();
});

/* ── Tests ─────────────────────────────────────────────── */

describe('toast-dom', () => {
  describe('domToast', () => {
    it('creates a toast container div in the document body', () => {
      domToast('Hello world');

      const container = document.getElementById('af-dom-toast-container');
      expect(container).not.toBeNull();
      expect(container!.tagName).toBe('DIV');
      expect(container!.id).toBe('af-dom-toast-container');
    });

    it('returns an id starting with "dom-"', () => {
      const id = domToast('Test message');
      expect(id).toMatch(/^dom-\d+$/);
    });

    it('appends a toast element to the container', () => {
      const id = domToast('Visible toast');
      const container = document.getElementById('af-dom-toast-container');

      const toastEl = document.getElementById(`af-toast-${id}`);
      expect(toastEl).not.toBeNull();
      expect(container!.contains(toastEl!)).toBe(true);
    });

    it('displays the message text in the toast element', () => {
      const id = domToast('My custom message');
      const toastEl = document.getElementById(`af-toast-${id}`)!;

      expect(toastEl.textContent).toContain('My custom message');
    });

    it('creates success toast with success colors', () => {
      const id = domToast('Success!', 'success');
      const toastEl = document.getElementById(`af-toast-${id}`)!;
      const style = toastEl.getAttribute('style') || '';

      // Success colors: green tones (jsdom normalizes spaces in rgba)
      expect(style).toContain('rgba(16, 185, 129');
      expect(toastEl.textContent).toContain('✓');
    });

    it('creates error toast with error colors', () => {
      const id = domToast('Error occurred', 'error');
      const toastEl = document.getElementById(`af-toast-${id}`)!;
      const style = toastEl.getAttribute('style') || '';

      // Error colors: red tones (jsdom normalizes spaces in rgba)
      expect(style).toContain('rgba(239, 68, 68');
      expect(toastEl.textContent).toContain('✕');
    });

    it('creates warning toast with warning colors', () => {
      const id = domToast('Warning!', 'warning');
      const toastEl = document.getElementById(`af-toast-${id}`)!;

      expect(toastEl.textContent).toContain('⚠');
    });

    it('creates info toast by default', () => {
      const id = domToast('Info message');
      const toastEl = document.getElementById(`af-toast-${id}`)!;

      expect(toastEl.textContent).toContain('ℹ');
    });

    it('increments id counter across multiple calls', () => {
      const id1 = domToast('First');
      const id2 = domToast('Second');
      const id3 = domToast('Third');

      // All ids start with 'dom-' and increment
      expect(id1).toMatch(/^dom-\d+$/);
      expect(id2).toMatch(/^dom-\d+$/);
      expect(id3).toMatch(/^dom-\d+$/);
      // Extract numeric parts and verify they increment
      const n1 = parseInt(id1.replace('dom-', ''));
      const n2 = parseInt(id2.replace('dom-', ''));
      const n3 = parseInt(id3.replace('dom-', ''));
      expect(n2).toBe(n1 + 1);
      expect(n3).toBe(n2 + 1);
    });

    it('auto-dismisses after the specified duration', () => {
      vi.useFakeTimers();
      const id = domToast('Auto dismiss', 'info', 2000);

      // Toast should still be present before duration
      let toastEl = document.getElementById(`af-toast-${id}`);
      expect(toastEl).not.toBeNull();

      // Advance past the duration + the 300ms animation fade-out
      vi.advanceTimersByTime(2500);

      // Toast element should be removed
      toastEl = document.getElementById(`af-toast-${id}`);
      expect(toastEl).toBeNull();
    });
  });

  describe('dismissDomToast', () => {
    it('removes the toast element from the DOM', () => {
      vi.useFakeTimers();
      const id = domToast('To be dismissed');

      let toastEl = document.getElementById(`af-toast-${id}`);
      expect(toastEl).not.toBeNull();

      dismissDomToast(id);

      // Advance past the 300ms animation fade-out
      vi.advanceTimersByTime(400);

      toastEl = document.getElementById(`af-toast-${id}`);
      expect(toastEl).toBeNull();
    });

    it('does not throw when dismissing a non-existent toast', () => {
      expect(() => dismissDomToast('dom-nonexistent')).not.toThrow();
    });
  });

  describe('dismissAllDomToasts', () => {
    it('clears all active toasts', () => {
      vi.useFakeTimers();
      domToast('Toast 1', 'success');
      domToast('Toast 2', 'error');
      domToast('Toast 3', 'info');

      // All three should be in the DOM
      const container = document.getElementById('af-dom-toast-container')!;
      expect(container.children.length).toBe(3);

      dismissAllDomToasts();

      // Advance past the 300ms animation fade-out
      vi.advanceTimersByTime(400);

      expect(container.children.length).toBe(0);
    });

    it('does not throw when no toasts are active', () => {
      expect(() => dismissAllDomToasts()).not.toThrow();
    });
  });

  describe('SSR guard', () => {
    it('returns "ssr-skip" when document is undefined', () => {
      // Temporarily remove document from global scope
      const originalDoc = globalThis.document;
      // @ts-expect-error Intentionally setting document to undefined for SSR test
      delete globalThis.document;

      const result = domToast('SSR test');

      expect(result).toBe('ssr-skip');

      // Restore document
      globalThis.document = originalDoc;
    });
  });
});
