import { expect, it } from 'vitest';
import { isIssuedInvoice } from './invoice-status';
import type { Invoice } from './types';

it.each([
  ['Borrador', false],
  ['Cancelada', false],
  ['Enviada', true],
  ['Pagada', true],
  ['Vencida', true],
] satisfies [Invoice['data']['status'], boolean][])(
  'includes a %s invoice in issued totals only when appropriate',
  (status, expected) => {
    expect(isIssuedInvoice({ data: { status } } as Invoice)).toBe(expected);
  },
);
