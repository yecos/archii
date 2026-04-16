import { fmtCOP } from '@/lib/helpers';
import { invoiceStatusColor } from './statusHelpers';
import type { Invoice } from '@/lib/types';

interface FacturasTabProps {
  invoices: Invoice[];
}

export default function FacturasTab({ invoices }: FacturasTabProps) {
  const totalInvoiced = invoices
    .filter((i) => i.data.status !== 'Cancelada')
    .reduce((s: number, i: Invoice) => s + (i.data.total || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.data.status === 'Pagada')
    .reduce((s: number, i: Invoice) => s + (i.data.total || 0), 0);
  const totalPending = invoices
    .filter((i) => i.data.status === 'Enviada' || i.data.status === 'Borrador')
    .reduce((s: number, i: Invoice) => s + (i.data.total || 0), 0);
  const totalOverdue = invoices
    .filter((i) => i.data.status === 'Vencida')
    .reduce((s: number, i: Invoice) => s + (i.data.total || 0), 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { lbl: 'Facturado', val: fmtCOP(totalInvoiced), color: 'text-[var(--af-accent)]' },
          { lbl: 'Pagado', val: fmtCOP(totalPaid), color: 'text-emerald-400' },
          { lbl: 'Pendiente', val: fmtCOP(totalPending), color: 'text-blue-400' },
          { lbl: 'Vencido', val: fmtCOP(totalOverdue), color: 'text-red-400' },
        ].map((c, i) => (
          <div key={i} className="card-elevated rounded-xl p-3">
            <div className={`text-lg font-bold ${c.color}`}>{c.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
          </div>
        ))}
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">🧾</div>
          <div className="text-sm">Sin facturas para este proyecto</div>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="card-elevated rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{inv.data.number}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${invoiceStatusColor(inv.data.status)}`}
                  >
                    {inv.data.status}
                  </span>
                  {(inv.data.status === 'Enviada' || inv.data.status === 'Borrador') && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {inv.data.clientName || inv.data.projectName}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-[var(--af-accent)]">
                  {fmtCOP(inv.data.total)}
                </div>
                <div className="text-[10px] text-[var(--muted-foreground)]">
                  {inv.data.issueDate}
                  {inv.data.dueDate ? ' → ' + inv.data.dueDate : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
