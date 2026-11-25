import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('reads Firestore write helpers from the compat namespace used by Kanban', async () => {
  const serverTimestamp = vi.fn(() => 'test-timestamp');
  const firestore = Object.assign(vi.fn(), { FieldValue: { serverTimestamp } });
  vi.stubGlobal('firebase', { apps: [{}], firestore });

  const { FieldValue } = await import('./firebase-service');

  expect(FieldValue().serverTimestamp()).toBe('test-timestamp');
});
