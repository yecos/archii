'use client';
import React from 'react';
import { Trash2 } from 'lucide-react';
import { TRANSFER_STATUSES } from '@/lib/types';
import type { InvTransfer } from '@/lib/types';

interface InvTransfersTabProps {
  invTransfers: InvTransfer[];
  invTransferFilterStatus: string;
  setInvTransferFilterStatus: (v: string) => void;
  getInvProductName: (productId: string) => string;
  deleteInvTransfer: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setForms: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  openModal: (modal: string) => void;
}

export default function InvTransfersTab({
  invTransfers, invTransferFilterStatus, setInvTransferFilterStatus,
  getInvProductName, deleteInvTransfer, setEditingId, setForms, openModal,
}: InvTransfersTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">🔄 Transferencias ({invTransfers.length})</h3>
        <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-blue-600 text-white border-none hover:bg-blue-700 transition-colors flex items-center gap-2 self-start" onClick={() => { setEditingId(null); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' })); openModal('invTransfer'); }}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>Nueva transferencia</button>
      </div>
      <select className="skeuo-input rounded-lg px-3 py-2 text-sm outline-none" value={invTransferFilterStatus} onChange={e => setInvTransferFilterStatus(e.target.value)}><option value="all">Todos los estados</option>{TRANSFER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      {invTransfers.filter(t => invTransferFilterStatus === 'all' || t.data.status === invTransferFilterStatus).length === 0 ? (
        <div className="text-center py-12"><div className="text-4xl mb-2">🔄</div><div className="text-[var(--muted-foreground)]">Sin transferencias</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Mueve productos entre almacenes</div></div>
      ) : (
        <div className="space-y-2">
          {invTransfers.filter(t => invTransferFilterStatus === 'all' || t.data.status === invTransferFilterStatus).map(t => (
            <div key={t.id} className="skeuo-panel rounded-xl p-3 sm:p-4 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center"><span className="text-lg">🔄</span></div>
                  <div>
                    <div className="text-sm font-semibold">{t.data.productName || getInvProductName(t.data.productId)}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      <span className="text-blue-400">{t.data.fromWarehouse}</span>
                      <span className="mx-1">→</span>
                      <span className="text-emerald-400">{t.data.toWarehouse}</span>
                      <span className="ml-1">· {t.data.quantity} uds</span>
                    </div>
                    {t.data.notes && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{t.data.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.data.status === 'Completada' ? 'bg-emerald-500/15 text-emerald-400' : t.data.status === 'En tránsito' ? 'bg-blue-500/15 text-blue-400' : t.data.status === 'Cancelada' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{t.data.status}</span>
                  <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" onClick={() => deleteInvTransfer(t.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
