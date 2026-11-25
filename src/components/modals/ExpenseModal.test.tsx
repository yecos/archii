import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import ExpenseModal from './ExpenseModal';

const app = vi.hoisted(() => ({
  forms: { expConcept: 'Material QA', expAmount: '125000' },
  setForms: vi.fn(),
  saveExpense: vi.fn(),
  projects: [],
}));

vi.mock('@/contexts/AppContext', () => ({ useApp: () => app }));
vi.mock('@/components/common/CenterModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('blocks a second submit while saving and reuses the document id on retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let finish: (saved: boolean) => void = () => {};
  app.saveExpense.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ExpenseModal open onClose={vi.fn()} />));
    const submit = [...container.querySelectorAll('button')].find(button => button.textContent === 'Registrar');
    expect(submit).toBeDefined();
    await act(async () => {
      submit?.click();
      submit?.click();
    });
    expect(app.saveExpense).toHaveBeenCalledTimes(1);
    expect(submit?.disabled).toBe(true);
    const requestId = app.saveExpense.mock.calls[0][0];

    await act(async () => finish(false));
    expect(submit?.disabled).toBe(false);
    app.saveExpense.mockResolvedValue(true);
    await act(async () => submit?.click());
    expect(app.saveExpense.mock.calls).toEqual([[requestId], [requestId]]);
  } finally {
    await act(async () => root.unmount());
  }
});
