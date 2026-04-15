'use client';
import React, { useState, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useQuotation } from '@/hooks/useDomain';
import { fmtCOP, fmtDate } from '@/lib/helpers';
import { exportQuotationPDF } from '@/lib/export-pdf';
import { FileText, Download, Copy, Trash2, ChevronDown, ChevronRight, Plus, Send, ArrowUp, ArrowDown, Eye, MessageCircle } from 'lucide-react';
import type { Quotation, QuotationStatus } from '@/lib/types';

const STATUS_TABS = [
  { k: 'Todas', v: 'all' },
  { k: 'Borrador', v: 'Borrador' },
  { k: 'Enviada', v: 'Enviada' },
  { k: 'Aprobada', v: 'Aprobada' },
  { k: 'Rechazada', v: 'Rechazada' },
  { k: 'Convertida', v: 'Convertida' },
];

const STATUS_COLORS: Record<QuotationStatus, string> = {
  Borrador: 'bg-[var(--skeuo-raised)] text-[var(--muted-foreground)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Enviada: 'bg-[var(--skeuo-raised)] text-[var(--af-blue)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Aprobada: 'bg-[var(--skeuo-raised)] text-[var(--af-green)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Rechazada: 'bg-[var(--skeuo-raised)] text-[var(--af-red)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Convertida: 'bg-[var(--skeuo-raised)] text-purple-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Vencida: 'bg-[var(--skeuo-raised)] text-orange-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
};

const UNITS = ['Unidad', 'Metro', 'Metro²', 'Metro³', 'Kilogramo', 'Litro', 'Galon', 'Rollo', 'Saco', 'Caja', 'Paquete', 'Pieza', 'Par', 'Set', 'Otro'];

export default function QuotationScreen() {
  const { forms, setForms, showToast, editingId } = useUI();
  const { projects } = useFirestore();
  const {
    quotations, quotationTab, setQuotationTab,
    quotationFilterStatus, setQuotationFilterStatus,
    quoteSections, quotePayments,
    openNewQuotation, openEditQuotation, saveQuotation,
    updateQuotationStatus, duplicateQuotation, deleteQuotation,
    addSection, removeSection, updateSection,
    addItem, removeItem, updateItem,
    addPayment, removePayment, updatePayment,
    setQuoteSections, setQuotePayments,
  } = useQuotation();

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Computed totals
  const totals = useMemo(() => {
    const subtotal = quoteSections.reduce((s, sec) => s + (sec.subtotal || 0), 0);
    const vatTotal = quoteSections.reduce((s, sec) => s + (sec.vatTotal || 0), 0);
    const discountTotal = quoteSections.reduce((s, sec) => s + (sec.discountTotal || 0), 0);
    const grandTotal = subtotal + vatTotal - discountTotal;
    return { subtotal, vatTotal, discountTotal, grandTotal };
  }, [quoteSections]);

  // ===== LIST VIEW =====
  if (quotationTab === 'list') {
    return (
      <div className="animate-fadeIn space-y-4">
        {/* Filter Tabs + New Button */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button key={tab.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${quotationFilterStatus === tab.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setQuotationFilterStatus(tab.v)}>{tab.k}</button>
            ))}
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={openNewQuotation}>
            <Plus size={16} /> Nueva Cotización
          </button>
        </div>

        {/* Summary Cards */}
        <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(() => {
            const totalQuoted = quotations.reduce((s, q) => s + (q.data.grandTotal || 0), 0);
            const approved = quotations.filter(q => q.data.status === 'Aprobada').reduce((s, q) => s + (q.data.grandTotal || 0), 0);
            const pending = quotations.filter(q => ['Borrador', 'Enviada'].includes(q.data.status)).length;
            const conversionRate = quotations.length > 0 ? Math.round((quotations.filter(q => q.data.status === 'Aprobada' || q.data.status === 'Convertida').length / quotations.length) * 100) : 0;
            return [
              { lbl: 'Total Cotizado', val: fmtCOP(totalQuoted), color: 'text-[var(--af-accent)]' },
              { lbl: 'Aprobadas', val: fmtCOP(approved), color: 'text-[var(--af-green)]' },
              { lbl: 'Pendientes', val: String(pending), color: 'text-[var(--af-blue)]' },
              { lbl: 'Tasa Conversión', val: `${conversionRate}%`, color: 'text-purple-400' },
            ].map((c, i) => (
              <div key={i} className="card-glass-subtle rounded-xl xl:p-4 p-3">
                <div className={`text-lg font-bold font-tabular text-gradient ${c.color}`}>{c.val}</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
              </div>
            ));
          })()}
        </div>

        {/* Quotation List */}
        {(() => {
          const filtered = quotations.filter(q => quotationFilterStatus === 'all' || q.data.status === quotationFilterStatus);
          return filtered.length === 0 ? (
            <div className="text-center py-16 text-[var(--af-text3)]">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm">Sin cotizaciones</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(q => (
                <div key={q.id} className="card-glass-subtle rounded-xl p-4 mb-3 card-glass-hover cursor-pointer transition-all">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{q.data.number}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 ${STATUS_COLORS[q.data.status] || ''}`}>{q.data.status}</span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{q.data.projectName}{q.data.clientName ? ' · ' + q.data.clientName : ''}</div>
                      {q.data.validUntil && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Válida hasta: {q.data.validUntil}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base sm:text-lg font-bold font-tabular text-gradient text-[var(--af-accent)]">{fmtCOP(q.data.grandTotal)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{q.data.createdAt ? fmtDate(q.data.createdAt) : ''}</div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0 flex-wrap mt-2 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => openEditQuotation(q)} title="Editar">
                      <Eye size={14} />
                    </button>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80 transition-opacity" onClick={() => { try { exportQuotationPDF(q); showToast('PDF descargado'); } catch (err) { console.error(err); showToast('Error al generar PDF', 'error'); } }} title="Descargar PDF">
                      <FileText size={14} />
                    </button>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--muted-foreground)] hover:opacity-80 transition-opacity" onClick={() => duplicateQuotation(q.id)} title="Duplicar">
                      <Copy size={14} />
                    </button>
                    {/* Status change */}
                    <div className="relative">
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-green)] hover:opacity-80 transition-opacity" onClick={() => setStatusMenuOpen(statusMenuOpen === q.id ? null : q.id)} title="Cambiar estado">
                        <Send size={14} />
                      </button>
                      {statusMenuOpen === q.id && (
                        <div className="absolute left-0 bottom-full mb-1 z-50 skeuo-well rounded-lg shadow-lg p-1 min-w-[130px]">
                          {(['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Convertida', 'Vencida'] as QuotationStatus[]).map(s => (
                            <button key={s} className={`w-full text-left px-2 py-1.5 text-xs rounded cursor-pointer hover:bg-[var(--skeuo-raised)] transition-colors ${q.data.status === s ? 'font-semibold text-[var(--af-accent)]' : 'text-[var(--foreground)]'}`} onClick={() => { updateQuotationStatus(q.id, s); setStatusMenuOpen(null); }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* WhatsApp */}
                    {q.data.clientPhone && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-green-500 hover:opacity-80 transition-opacity" onClick={() => {
                        const msg = encodeURIComponent(`Hola ${q.data.clientName}, adjunto cotización ${q.data.number} por ${fmtCOP(q.data.grandTotal)}. ArchiFlow`);
                        window.open(`https://wa.me/${(q.data.clientPhone || '').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
                      }} title="Enviar WhatsApp">
                        <MessageCircle size={14} />
                      </button>
                    )}
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-red)] hover:opacity-80 transition-opacity" onClick={() => deleteQuotation(q.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  }

  // ===== EDITOR VIEW =====
  const isEditing = quotationTab === 'edit';
  const title = isEditing ? 'Editar Cotización' : 'Nueva Cotización';

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setQuotationTab('list')}>← Volver</button>
      </div>

      {/* Client Info + Project */}
      <div className="card-elevated rounded-xl p-4 space-y-3">
        <div className="text-[13px] font-medium text-[var(--muted-foreground)]">CLIENTE Y PROYECTO</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Nombre del cliente *" value={forms.qClientName || ''} onChange={e => setForms(p => ({ ...p, qClientName: e.target.value }))} />
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.qProjId || ''} onChange={e => {
            const proj = projects.find(p => p.id === e.target.value);
            setForms(p => ({ ...p, qProjId: e.target.value, qClientName: p.qClientName || proj?.data.client || p.qClientName }));
          }}>
            <option value="">Seleccionar proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
          <input type="email" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Email del cliente" value={forms.qClientEmail || ''} onChange={e => setForms(p => ({ ...p, qClientEmail: e.target.value }))} />
          <input type="tel" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Teléfono del cliente" value={forms.qClientPhone || ''} onChange={e => setForms(p => ({ ...p, qClientPhone: e.target.value }))} />
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none md:col-span-2" placeholder="Dirección del cliente" value={forms.qClientAddress || ''} onChange={e => setForms(p => ({ ...p, qClientAddress: e.target.value }))} />
        </div>
      </div>

      {/* Quotation Details */}
      <div className="card-elevated rounded-xl p-4 space-y-3">
        <div className="text-[13px] font-medium text-[var(--muted-foreground)]">DETALLES</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Número de cotización" value={forms.qNumber || ''} onChange={e => setForms(p => ({ ...p, qNumber: e.target.value }))} />
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.qStatus || 'Borrador'} onChange={e => setForms(p => ({ ...p, qStatus: e.target.value }))}>
            <option value="Borrador">Borrador</option>
            <option value="Enviada">Enviada</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Convertida">Convertida</option>
            <option value="Vencida">Vencida</option>
          </select>
          <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.qValidUntil || ''} onChange={e => setForms(p => ({ ...p, qValidUntil: e.target.value }))} placeholder="Válida hasta" />
        </div>
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas (visibles para el cliente)..." value={forms.qNotes || ''} onChange={e => setForms(p => ({ ...p, qNotes: e.target.value }))} />
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas internas (solo equipo)..." value={forms.qInternalNotes || ''} onChange={e => setForms(p => ({ ...p, qInternalNotes: e.target.value }))} />
      </div>

      {/* Sections & Items */}
      <div className="space-y-3">
        {quoteSections.map((sec, secIdx) => {
          const isCollapsed = collapsedSections.has(sec.id);
          return (
            <div key={sec.id} className="card-elevated rounded-xl overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center gap-2 p-3 bg-[var(--skeuo-raised)] border-b border-[var(--skeuo-edge-light)]">
                <button className="text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors bg-transparent border-none p-0" onClick={() => toggleSection(sec.id)}>
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
                <input type="text" className="flex-1 skeuo-input px-2 py-1 text-sm font-semibold text-[var(--foreground)] outline-none bg-transparent border-none" placeholder="Nombre de la sección" value={sec.name || ''} onChange={e => updateSection(secIdx, 'name', e.target.value)} />
                <span className="text-sm font-bold text-[var(--af-accent)]">{fmtCOP(sec.total || 0)}</span>
                <button className="text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] bg-transparent border-none p-0" onClick={() => {
                  if (secIdx <= 0) return;
                  setQuoteSections(prev => { const s = [...prev]; [s[secIdx - 1], s[secIdx]] = [s[secIdx], s[secIdx - 1]]; return s; });
                }}>
                  <ArrowUp size={14} />
                </button>
                <button className="text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] bg-transparent border-none p-0" onClick={() => {
                  if (secIdx >= quoteSections.length - 1) return;
                  setQuoteSections(prev => { const s = [...prev]; [s[secIdx], s[secIdx + 1]] = [s[secIdx + 1], s[secIdx]]; return s; });
                }}>
                  <ArrowDown size={14} />
                </button>
                {quoteSections.length > 1 && (
                  <button className="text-[var(--af-red)] cursor-pointer hover:opacity-80 bg-transparent border-none p-0" onClick={() => removeSection(secIdx)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Section Items */}
              {!isCollapsed && (
                <div className="p-3 space-y-2">
                  {/* Table header (desktop) */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] text-[var(--muted-foreground)] font-medium px-1">
                    <div className="col-span-3">Concepto</div>
                    <div className="col-span-1">Unidad</div>
                    <div className="col-span-1 text-right">Cant.</div>
                    <div className="col-span-2 text-right">Valor Unit.</div>
                    <div className="col-span-1 text-right">IVA%</div>
                    <div className="col-span-1 text-right">Desc%</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {sec.items.map((item, itemIdx) => (
                    <div key={item.id} className="bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-lg p-2.5">
                      {/* Mobile: stacked */}
                      <div className="md:hidden space-y-2">
                        <input className="w-full skeuo-input px-2.5 py-1.5 text-xs outline-none" placeholder="Concepto" value={item.concept} onChange={e => updateItem(secIdx, itemIdx, 'concept', e.target.value)} />
                        <input className="w-full skeuo-input px-2.5 py-1.5 text-xs outline-none" placeholder="Descripción (opcional)" value={item.description} onChange={e => updateItem(secIdx, itemIdx, 'description', e.target.value)} />
                        <div className="flex gap-2">
                          <select className="flex-1 skeuo-input px-2 py-1.5 text-xs outline-none" value={item.unit} onChange={e => updateItem(secIdx, itemIdx, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="number" className="w-20 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Cant." value={item.quantity || ''} onChange={e => updateItem(secIdx, itemIdx, 'quantity', Number(e.target.value) || 0)} />
                        </div>
                        <div className="flex gap-2">
                          <input type="number" className="flex-1 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Valor Unit." value={item.unitPrice || ''} onChange={e => updateItem(secIdx, itemIdx, 'unitPrice', Number(e.target.value) || 0)} />
                          <input type="number" className="w-16 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="IVA%" value={item.vat ?? 19} onChange={e => updateItem(secIdx, itemIdx, 'vat', Number(e.target.value) || 0)} />
                          <input type="number" className="w-16 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Desc%" value={item.discount || ''} onChange={e => updateItem(secIdx, itemIdx, 'discount', Number(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--af-accent)]">{fmtCOP(item.total || 0)}</span>
                          <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] text-[var(--af-red)] cursor-pointer flex-shrink-0" onClick={() => removeItem(secIdx, itemIdx)}>✕</button>
                        </div>
                      </div>

                      {/* Desktop: grid */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3 space-y-1">
                          <input className="w-full skeuo-input px-2 py-1 text-xs outline-none" placeholder="Concepto" value={item.concept} onChange={e => updateItem(secIdx, itemIdx, 'concept', e.target.value)} />
                          <input className="w-full skeuo-input px-2 py-0.5 text-[10px] outline-none text-[var(--muted-foreground)]" placeholder="Descripción" value={item.description} onChange={e => updateItem(secIdx, itemIdx, 'description', e.target.value)} />
                        </div>
                        <select className="col-span-1 skeuo-input px-1 py-1 text-xs outline-none" value={item.unit} onChange={e => updateItem(secIdx, itemIdx, 'unit', e.target.value)}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" className="col-span-1 skeuo-input px-2 py-1 text-xs outline-none text-right" value={item.quantity || ''} onChange={e => updateItem(secIdx, itemIdx, 'quantity', Number(e.target.value) || 0)} />
                        <input type="number" className="col-span-2 skeuo-input px-2 py-1 text-xs outline-none text-right" value={item.unitPrice || ''} onChange={e => updateItem(secIdx, itemIdx, 'unitPrice', Number(e.target.value) || 0)} />
                        <input type="number" className="col-span-1 skeuo-input px-2 py-1 text-xs outline-none text-right" value={item.vat ?? 19} onChange={e => updateItem(secIdx, itemIdx, 'vat', Number(e.target.value) || 0)} />
                        <input type="number" className="col-span-1 skeuo-input px-2 py-1 text-xs outline-none text-right" value={item.discount || ''} onChange={e => updateItem(secIdx, itemIdx, 'discount', Number(e.target.value) || 0)} />
                        <div className="col-span-2 text-right text-xs font-bold text-[var(--af-accent)]">{fmtCOP(item.total || 0)}</div>
                        <button className="col-span-1 text-xs text-[var(--af-red)] cursor-pointer text-center bg-transparent border-none" onClick={() => removeItem(secIdx, itemIdx)}>✕</button>
                      </div>
                    </div>
                  ))}

                  {/* Add item button */}
                  <button className="w-full text-xs text-[var(--af-blue)] cursor-pointer hover:underline flex items-center gap-1 bg-transparent border-none p-0 py-1" onClick={() => addItem(secIdx)}>
                    <Plus size={12} /> Agregar item
                  </button>

                  {/* Section Totals */}
                  <div className="flex justify-end gap-4 text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
                    <span>Sub: {fmtCOP(sec.subtotal)}</span>
                    <span>IVA: {fmtCOP(sec.vatTotal)}</span>
                    <span>Desc: {fmtCOP(sec.discountTotal)}</span>
                    <span className="font-bold text-[var(--foreground)]">Total: {fmtCOP(sec.total)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add section button */}
        <button className="w-full skeuo-btn border-2 border-dashed border-[var(--border)] rounded-xl p-3 text-sm text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--af-accent)] hover:text-[var(--af-accent)] transition-colors bg-transparent" onClick={addSection}>
          <Plus size={16} className="inline mr-1" /> Agregar Sección
        </button>
      </div>

      {/* Grand Total */}
      <div className="card-elevated rounded-xl p-4 bg-gradient-to-br from-[var(--af-accent)]/5 to-transparent">
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-6">
            <span className="text-[var(--muted-foreground)]">Subtotal</span>
            <span>{fmtCOP(totals.subtotal)}</span>
          </div>
          <div className="flex gap-6">
            <span className="text-[var(--muted-foreground)]">IVA</span>
            <span>{fmtCOP(totals.vatTotal)}</span>
          </div>
          {totals.discountTotal > 0 && (
            <div className="flex gap-6">
              <span className="text-[var(--muted-foreground)]">Descuentos</span>
              <span className="text-[var(--af-red)]">- {fmtCOP(totals.discountTotal)}</span>
            </div>
          )}
          <div className="w-48 border-t border-[var(--af-accent)]/30 pt-1 flex justify-between">
            <span className="font-bold">TOTAL</span>
            <span className="text-lg font-bold font-tabular text-gradient text-[var(--af-accent)]">{fmtCOP(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="card-elevated rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium text-[var(--muted-foreground)]">PLAN DE PAGOS</div>
          <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline bg-transparent border-none p-0" onClick={addPayment}>+ Agregar pago</button>
        </div>
        {quotePayments.map((pay, idx) => (
          <div key={pay.id} className="flex flex-wrap gap-2 items-center bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-lg p-2.5">
            <input type="text" className="w-28 skeuo-input px-2 py-1 text-xs outline-none" placeholder="Etiqueta" value={pay.label} onChange={e => updatePayment(idx, 'label', e.target.value)} />
            <input type="text" className="w-28 skeuo-input px-2 py-1 text-xs outline-none" placeholder="Condición" value={pay.condition} onChange={e => updatePayment(idx, 'condition', e.target.value)} />
            <div className="flex items-center gap-1">
              <input type="number" className="w-16 skeuo-input px-2 py-1 text-xs outline-none text-right" placeholder="%" value={pay.percentage || ''} onChange={e => updatePayment(idx, 'percentage', Number(e.target.value) || 0)} />
              <span className="text-xs text-[var(--muted-foreground)]">%</span>
            </div>
            <span className="text-xs font-bold text-[var(--af-accent)]">{fmtCOP(totals.grandTotal * (pay.percentage || 0) / 100)}</span>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" className="accent-[var(--af-green)]" checked={pay.paid || false} onChange={e => updatePayment(idx, 'paid', e.target.checked)} />
              <span className="text-[var(--muted-foreground)]">Pagado</span>
            </label>
            {quotePayments.length > 1 && (
              <button className="text-[var(--af-red)] cursor-pointer hover:opacity-80 bg-transparent border-none p-0" onClick={() => removePayment(idx)}><Trash2 size={12} /></button>
            )}
          </div>
        ))}
      </div>

      {/* Terms & Bank Info */}
      <div className="card-elevated rounded-xl p-4 space-y-3">
        <div className="text-[13px] font-medium text-[var(--muted-foreground)]">TÉRMINOS Y DATOS BANCARIOS</div>
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Condiciones de pago..." value={forms.qTerms || ''} onChange={e => setForms(p => ({ ...p, qTerms: e.target.value }))} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Banco" value={forms.qBankName || ''} onChange={e => setForms(p => ({ ...p, qBankName: e.target.value }))} />
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Tipo de cuenta" value={forms.qBankAccountType || ''} onChange={e => setForms(p => ({ ...p, qBankAccountType: e.target.value }))} />
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Número de cuenta" value={forms.qBankAccount || ''} onChange={e => setForms(p => ({ ...p, qBankAccount: e.target.value }))} />
          <input type="text" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Titular" value={forms.qBankHolder || ''} onChange={e => setForms(p => ({ ...p, qBankHolder: e.target.value }))} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="skeuo-btn flex-1 bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveQuotation}>
          {isEditing ? 'Guardar Cambios' : 'Guardar Cotización'}
        </button>
        <button className="skeuo-btn flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--skeuo-raised)] transition-colors" onClick={() => {
          const tempQ = {
            id: editingId || 'temp',
            data: {
              number: forms.qNumber || 'COT-BORRADOR',
              projectId: forms.qProjId || '',
              projectName: projects.find(p => p.id === forms.qProjId)?.data.name || '',
              clientName: forms.qClientName || '',
              clientEmail: forms.qClientEmail || '',
              clientPhone: forms.qClientPhone || '',
              clientAddress: forms.qClientAddress || '',
              status: (forms.qStatus || 'Borrador') as QuotationStatus,
              sections: quoteSections,
              payments: quotePayments,
              subtotal: totals.subtotal,
              vatTotal: totals.vatTotal,
              discountTotal: totals.discountTotal,
              grandTotal: totals.grandTotal,
              validUntil: forms.qValidUntil || '',
              notes: forms.qNotes || '',
              internalNotes: forms.qInternalNotes || '',
              terms: forms.qTerms || '',
              bankName: forms.qBankName || '',
              bankAccount: forms.qBankAccount || '',
              bankAccountType: forms.qBankAccountType || '',
              bankHolder: forms.qBankHolder || '',
              createdAt: null,
              createdBy: '',
            },
          } as Quotation;
          try { exportQuotationPDF(tempQ); showToast('PDF descargado'); } catch (err) { console.error(err); showToast('Error al generar PDF', 'error'); }
        }}>
          <Download size={16} /> PDF
        </button>
      </div>
    </div>
  );
}
