import type { Invoice } from './types';

export function isIssuedInvoice(invoice: Invoice): boolean {
  return invoice.data.status === 'Enviada'
    || invoice.data.status === 'Pagada'
    || invoice.data.status === 'Vencida';
}
