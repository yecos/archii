import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from './route';

const database = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  update: vi.fn(),
}));

vi.mock('@/lib/api-auth', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api-auth')>(),
  requireAuth: vi.fn(async () => ({ uid: 'qa-user', email: 'qa@example.test' })),
  isPlatformAdminEmail: () => false,
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => ({
    collection: (collection: string) => ({ doc: (id: string) => `${collection}/${id}` }),
    runTransaction: async (run: (transaction: unknown) => Promise<void>) => run({
      get: async (key: string) => ({ data: () => database.docs.get(key) }),
      update: database.update,
    }),
  }),
  getAdminFieldValue: () => ({ arrayUnion: (entry: unknown) => [entry] }),
}));

beforeEach(() => {
  database.update.mockClear();
  database.docs.clear();
  database.docs.set('tenants/qa-horizonte', { members: ['qa-user'], createdBy: 'qa-user' });
  database.docs.set('users/qa-user', { name: 'Responsable QA' });
  database.docs.set('projects/qa-project', { tenantId: 'qa-horizonte', budget: 100, endDate: '2026-11-30' });
  database.docs.set('changeOrders/qa-order', {
    tenantId: 'qa-horizonte',
    projectId: 'qa-project',
    status: 'pendiente_aprobacion',
    costImpact: { newBudget: 0 },
    scheduleImpact: { daysExtension: 2 },
  });
});

function review() {
  return POST(new NextRequest('http://localhost/api/change-orders/approve', {
    method: 'POST',
    body: JSON.stringify({ coId: 'qa-order', action: 'approve' }),
  }));
}

it('records the authenticated reviewer and applies both approved impacts in one transaction', async () => {
  const response = await review();
  expect(response.status).toBe(200);
  expect(database.update).toHaveBeenNthCalledWith(1, 'projects/qa-project',
    expect.objectContaining({ budget: 0, endDate: '2026-12-02' }));
  expect(database.update).toHaveBeenNthCalledWith(2, 'changeOrders/qa-order',
    expect.objectContaining({ status: 'aprobada', approvedBy: 'qa-user', approvedByName: 'Responsable QA' }));
});

it('keeps the project and order unchanged when the current role cannot review them', async () => {
  database.docs.set('tenants/qa-horizonte', { members: ['qa-user'], createdBy: 'qa-owner' });
  const response = await review();
  expect(response.status).toBe(403);
  expect(database.update).not.toHaveBeenCalled();
});
