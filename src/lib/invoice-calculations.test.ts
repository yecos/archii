import { expect, it } from 'vitest';
import { calculateInvoiceTotals } from './invoice-calculations';

it.each([0, '0'])('keeps an explicitly configured zero tax rate (%s)', tax => {
  expect(calculateInvoiceTotals(200000, tax)).toEqual({ subtotal: 200000, tax: 0, taxAmount: 0, total: 200000 });
});

it('calculates the tax amount separately from the percentage', () => {
  expect(calculateInvoiceTotals(200000, 19)).toEqual({ subtotal: 200000, tax: 19, taxAmount: 38000, total: 238000 });
  expect(calculateInvoiceTotals(200000, 5).total).toBe(210000);
});

it.each([undefined, null, ''])('defaults a missing tax rate to 19 (%s)', tax => {
  expect(calculateInvoiceTotals(200000, tax).tax).toBe(19);
});

it.each([-1, 101, Infinity, 'invalid'])('rejects an invalid rate (%s)', tax => {
  expect(() => calculateInvoiceTotals(200000, tax)).toThrow('IVA');
});

it.each([-1, NaN, Infinity])('rejects an invalid subtotal (%s)', subtotal => {
  expect(() => calculateInvoiceTotals(subtotal, 19)).toThrow('Subtotal');
});
