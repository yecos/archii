export function calculateInvoiceTotals(subtotal: number, rawTax: unknown) {
  const tax = rawTax === undefined || rawTax === null || rawTax === '' ? 19 : Number(rawTax);
  if (!Number.isFinite(subtotal) || subtotal < 0) throw new Error('Subtotal inválido');
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw new Error('El IVA debe estar entre 0 y 100');
  const taxAmount = subtotal * tax / 100;
  const total = subtotal + taxAmount;
  if (!Number.isFinite(total)) throw new Error('Total inválido');
  return { subtotal, tax, taxAmount, total };
}
