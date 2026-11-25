import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { TimeTrackingProvider, useTimeTrackingContext, type TimeTrackingContextValue } from './useTimeTracking';

const app = vi.hoisted(() => ({
  authUser: { uid: 'qa-user' }, activeTenantId: 'company-a', ready: false,
  forms: { invProject: 'qa-project', invTax: 0, invNumber: 'QA-001' },
  setForms: vi.fn(), editingId: null, setEditingId: vi.fn(), closeModal: vi.fn(), showToast: vi.fn(),
}));
const actions = vi.hoisted(() => ({ saveInvoice: vi.fn() }));
vi.mock('@/contexts/AppContext', () => ({ useApp: () => app }));
vi.mock('@/lib/firestore-actions', () => actions);

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('blocks duplicate saves, keeps a failed draft open and reuses its ID on retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let context: TimeTrackingContextValue;
  function Probe() { context = useTimeTrackingContext(); return null; }
  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => root.render(<TimeTrackingProvider><Probe /></TimeTrackingProvider>));
    await act(async () => {
      context.setInvoiceTab('create');
      context.addInvoiceItem();
      context.updateInvoiceItem(0, 'hours', 2);
      context.updateInvoiceItem(0, 'rate', 100000);
    });
    let fail!: (reason: Error) => void;
    actions.saveInvoice.mockReturnValue(new Promise<void>((_, reject) => { fail = reject; }));
    await act(async () => { void context.saveInvoice(); void context.saveInvoice(); });
    expect(actions.saveInvoice).toHaveBeenCalledTimes(1);
    expect(context!.isSavingInvoice).toBe(true);
    const documentId = actions.saveInvoice.mock.calls[0][5];
    expect(documentId).toEqual(expect.any(String));
    expect(actions.saveInvoice.mock.calls[0][0]).toMatchObject({ invTax: 0, invSubtotal: 200000, invTotal: 200000 });

    await act(async () => fail(new Error('Simulated network failure')));
    expect(context!.invoiceTab).toBe('create');
    expect(context!.invoiceItems).toHaveLength(1);
    expect(context!.isSavingInvoice).toBe(false);
    actions.saveInvoice.mockResolvedValue(undefined);
    await act(async () => { await context.saveInvoice(); });
    expect(actions.saveInvoice.mock.calls[1][5]).toBe(documentId);
    expect(context!.invoiceTab).toBe('list');
  } finally { await act(async () => root.unmount()); }
});
