/**
 * setup.ts
 * Global test setup: jest-dom matchers, MSW initialization, global mocks.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Firebase CDN modules (browser SDK loaded via script tags)
vi.mock('@/lib/firebase-service', () => ({
  getDb: vi.fn(() => ({
    collection: vi.fn(() => ({
      add: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
      get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
          get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
        })),
        get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
      })),
      orderBy: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
          get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
        })),
        limit: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
        get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
      })),
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ data: () => ({}) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
  serverTimestamp: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
  snapToDocs: vi.fn(() => []),
}));

// Mock Firebase Admin (server-side)
vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      add: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
      get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
          get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
        })),
        get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
      })),
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ data: () => ({}) })),
        update: vi.fn(() => Promise.resolve()),
        set: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@test.com' })),
  },
}));

// Mock navigator.userAgent for platform detection tests
Object.defineProperty(globalThis.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  writable: true,
});

// Suppress console.error in tests (except for intentional error testing)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('act(') ||
       args[0].includes('Not implemented'))
    ) return;
    originalError.apply(console, args);
  };
});
afterAll(() => {
  console.error = originalError;
});
