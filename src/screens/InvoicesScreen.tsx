'use client';
import React, { useMemo, useState } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { fmtCOP } from '@/lib/helpers';
import { DEFAULT_PHASES } from '@/lib/types';
import * as fbActions from '@/lib/firestore-actions';
import { exportInvoicePDF } from '@/lib/export-pdf';
import { FileText, Download } from 'lucide-react';

export default function InvoicesScreen() {
  const { forms, setForms, showToast } = useUI();
  const { projects } = useFirestore();
  const {
    addInvoiceItem, invoiceFilterStatus, invoiceItems, invoiceTab,
    invoices, openNewInvoice, removeInvoiceItem, saveInvoice,
    setInvoiceFilterStatus, setInvoiceTab, updateInvoiceItem,
  } = useInvoice();

  return (
<div className="animate-fadeIn space-y-4">
        {invoiceTab === 'list' && (<div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
              {[{ k: 'Todas', v: 'all' }, { k: 'Borrador', v: 'Borrador' }, { k: 'Enviadas', v: 'Enviada' }, { k: 'Pagadas', v: 'Pagada' }, { k: 'Vencidas', v: 'Vencida' }].map(tab => (
                <button key={tab.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${invoiceFilterStatus === tab.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setInvoiceFilterStatus(tab.v)}>{tab.k}</button>
              ))}
            </div>
            <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={openNewInvoice}>+ Nueva Factura</button>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {(() => {
              const totalInvoiced = invoices.filter(i => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0);
              const totalPaid = invoices.filter(i => i.data.status === 'Pagada').reduce((s, i) => s + (i.data.total || 0), 0);
              const totalPending = invoices.filter(i => i.data.status === 'Enviada' || i.data.status === 'Borrador').reduce((s, i) => s + (i.data.total || 0), 0);
              const totalOverdue = invoices.filter(i => i.data.status === 'Vencida').reduce((s, i) => s + (i.data.total || 0), 0);
              return [
                { lbl: 'Facturado', val: fmtCOP(totalInvoiced), color: 'text-[var(--af-accent)]' },
                { lbl: 'Pagado', val: fmtCOP(totalPaid), color: 'text-[var(--af-green)]' },
                { lbl: 'Pendiente', val: fmtCOP(totalPending), color: 'text-[var(--af-blue)]' },
                { lbl: 'Vencido', val: fmtCOP(totalOverdue), color: 'text-[var(--af-red)]' },
              ].map((c, i) => (
                <div key={i} className="card-elevated rounded-xl xl:p-4 p-3">
                  <div className={`text-lg font-bold ${c.color}`}>{c.val}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
                </div>
              ));
            })()}
          </div>
          {/* Invoice List */}
          {(() => {
            const filtered = invoices.filter(i => invoiceFilterStatus === 'all' || i.data.status === invoiceFilterStatus);
            return filtered.length === 0 ? <div className="text-center py-16 text-[var(--af-text3)]"><div className="text-4xl mb-3">🧾</div><div className="text-sm">Sin facturas</div></div> : (
              <div className="space-y-2">
                {filtered.map(inv => {
                  const statusColors: Record<string, string> = { Borrador: 'bg-[var(--skeuo-raised)] text-[var(--muted-foreground)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]', Enviada: 'bg-[var(--skeuo-raised)] text-[var(--af-blue)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]', Pagada: 'bg-[var(--skeuo-raised)] text-[var(--af-green)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]', Vencida: 'bg-[var(--skeuo-raised)] text-[var(--af-red)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]', Cancelada: 'bg-[var(--skeuo-raised)] text-[var(--af-red)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] line-through opacity-60' };
                  const proj = projects.find(p => p.id === inv.data.projectId);
                  return (<div key={inv.id} className="card-elevated rounded-xl xl:p-5 p-4 cursor-pointer transition-all">
                    <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{inv.data.number}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 ${statusColors[inv.data.status] || ''}`}>{inv.data.status}</span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{inv.data.projectName}{inv.data.clientName ? ' · ' + inv.data.clientName : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base sm:text-lg font-bold text-[var(--af-accent)]">{fmtCOP(inv.data.total)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{inv.data.issueDate}{inv.data.dueDate ? ' → ' + inv.data.dueDate : ''}</div>
                    </div>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap mt-2 pt-2 border-t border-[var(--border)] sm:mt-0 sm:pt-0 sm:border-t-0" onClick={e => e.stopPropagation()}>
                      {/* NEW: PDF Download */}
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80 transition-opacity" onClick={() => {
                        try { exportInvoicePDF(inv, proj); showToast('PDF descargado'); } catch (err) { console.error('[ArchiFlow] Invoices: export invoice PDF failed:', err); showToast('Error al generar PDF', 'error'); }
                      }} title="Descargar PDF">
                        <FileText size={14} />
                      </button>
                      {inv.data.status === 'Borrador' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => fbActions.updateInvoiceStatus(inv.id, 'Enviada', showToast)}>Enviar</button>}
                      {inv.data.status === 'Enviada' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-green)] hover:opacity-80 transition-opacity" onClick={() => fbActions.updateInvoiceStatus(inv.id, 'Pagada', showToast)}>Pagar</button>}
                      {inv.data.status === 'Enviada' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-amber)] hover:opacity-80 transition-opacity" onClick={() => fbActions.updateInvoiceStatus(inv.id, 'Vencida', showToast)}>Vencer</button>}
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-red)] hover:opacity-80 transition-opacity" onClick={() => fbActions.deleteInvoice(inv.id, showToast)}>🗑</button>
                    </div>
                  </div>);
                })}
              </div>
            );
          })()}
        </div>)}

        {invoiceTab === 'create' && (<div className="card-elevated rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Nueva Factura</h3>
            <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setInvoiceTab('list')}>Cancelar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProject || ''} onChange={e => setForms(p => ({ ...p, invProject: e.target.value }))}>
              <option value="">Seleccionar proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
            <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Numero de factura" value={forms.invNumber || ''} onChange={e => setForms(p => ({ ...p, invNumber: e.target.value }))} />
            <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invIssueDate || ''} onChange={e => setForms(p => ({ ...p, invIssueDate: e.target.value }))} />
            <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invDueDate || ''} onChange={e => setForms(p => ({ ...p, invDueDate: e.target.value }))} />
          </div>
          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-[13px] font-medium">Items</span><button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={addInvoiceItem}>+ Agregar item</button></div>
            <div className="skeuo-well rounded-xl p-3 space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] text-[var(--muted-foreground)] font-medium mb-1">
                <div className="col-span-4">Concepto</div><div className="col-span-3">Fase</div><div className="col-span-2">Horas</div><div className="col-span-2">Tarifa</div><div className="col-span-1"></div>
              </div>
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-lg p-2.5 sm:p-0 sm:border-0 sm:rounded-none sm:shadow-none">
                  {/* Mobile: stacked layout */}
                  <div className="sm:hidden space-y-2">
                    <input className="w-full skeuo-input px-2.5 py-1.5 text-xs outline-none" placeholder="Concepto" value={item.concept} onChange={e => updateInvoiceItem(idx, 'concept', e.target.value)} />
                    <div className="flex gap-2">
                      <select className="flex-1 skeuo-input px-2 py-1.5 text-xs outline-none" value={item.phase} onChange={e => updateInvoiceItem(idx, 'phase', e.target.value)}>
                        <option value="">Fase</option>
                        {DEFAULT_PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                      </select>
                      <input type="number" className="w-20 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Horas" value={item.hours} onChange={e => updateInvoiceItem(idx, 'hours', e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" className="flex-1 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Tarifa" value={item.rate} onChange={e => updateInvoiceItem(idx, 'rate', e.target.value)} />
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] text-[var(--af-red)] cursor-pointer flex-shrink-0" onClick={() => removeInvoiceItem(idx)}>✕</button>
                    </div>
                  </div>
                  {/* Desktop: grid layout */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                    <input className="col-span-4 skeuo-input px-2 py-1.5 text-xs outline-none" placeholder="Concepto" value={item.concept} onChange={e => updateInvoiceItem(idx, 'concept', e.target.value)} />
                    <select className="col-span-3 skeuo-input px-2 py-1.5 text-xs outline-none" value={item.phase} onChange={e => updateInvoiceItem(idx, 'phase', e.target.value)}>
                      <option value="">Fase</option>
                      {DEFAULT_PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                    </select>
                    <input type="number" className="col-span-2 skeuo-input px-2 py-1.5 text-xs outline-none text-right" value={item.hours} onChange={e => updateInvoiceItem(idx, 'hours', e.target.value)} />
                    <input type="number" className="col-span-2 skeuo-input px-2 py-1.5 text-xs outline-none text-right" value={item.rate} onChange={e => updateInvoiceItem(idx, 'rate', e.target.value)} />
                    <button className="col-span-1 text-xs text-[var(--af-red)] cursor-pointer text-center" onClick={() => removeInvoiceItem(idx)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span>{fmtCOP(invoiceItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">IVA (%)</span>
              <input type="number" className="w-20 skeuo-input px-2 py-1 text-xs text-right outline-none" value={forms.invTax || 19} onChange={e => setForms(p => ({ ...p, invTax: e.target.value }))} />
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>Total</span>
              <span className="text-[var(--af-accent)]">{fmtCOP(invoiceItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) * (1 + (Number(forms.invTax) || 19) / 100))}</span>
            </div>
          </div>
          <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas..." value={forms.invNotes || ''} onChange={e => setForms(p => ({ ...p, invNotes: e.target.value }))} />
          <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)]" onClick={saveInvoice}>Crear Factura</button>
        </div>)}
      </div>
  );
}
