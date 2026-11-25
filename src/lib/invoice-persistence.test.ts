import { afterEach, expect, it, vi } from 'vitest';
import type { FirebaseUser } from './firebase-service';
import { saveInvoice } from './firestore-actions';

const db = vi.hoisted(() => ({
  getProject: vi.fn(), set: vi.fn(), update: vi.fn(), invoiceDoc: vi.fn(),
}));
vi.mock('./firebase-service', () => ({
  getFirebase: () => ({ firestore: Object.assign(() => ({
    collection: (name: string) => name === 'projects'
      ? { doc: () => ({ get: db.getProject }) }
      : { doc: (id: string) => { db.invoiceDoc(id); return { set: db.set, update: db.update }; } },
  }), { FieldValue: { serverTimestamp: () => 'server-time' } }) }),
  getFirebaseIdToken: vi.fn(),
}));

afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); });
const user = { uid: 'qa-user' } as FirebaseUser;
const data = { invProject: 'qa-project', invSubtotal: 200000, invTax: 0, invTotal: 999999 };

it('stores zero tax and a consistent total using the stable draft ID', async () => {
  db.getProject.mockResolvedValue({ exists: true, data: () => ({ tenantId: 'company-a', name: 'QA' }) });
  await saveInvoice(data, null, vi.fn(), user, 'company-a', 'stable-draft-id');
  expect(db.invoiceDoc).toHaveBeenCalledWith('stable-draft-id');
  expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ tax: 0, subtotal: 200000, total: 200000, tenantId: 'company-a' }));
});

it('rejects a project from another workspace before writing an invoice', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db.getProject.mockResolvedValue({ exists: true, data: () => ({ tenantId: 'company-b' }) });
  await expect(saveInvoice(data, null, vi.fn(), user, 'company-a', 'draft')).rejects.toThrow('espacio activo');
  expect(db.set).not.toHaveBeenCalled();
  expect(db.update).not.toHaveBeenCalled();
});
