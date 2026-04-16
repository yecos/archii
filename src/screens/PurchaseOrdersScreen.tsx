'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { fmtCOP } from '@/lib/helpers';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useTenantId } from '@/hooks/useTenantId';
import type { FirestoreTimestamp } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

type POStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Parcial' | 'Recibida' | 'Cancelada';

interface POItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface PurchaseOrder {
  id: string;
  data: {
    number: string;
    supplierId: string;
    supplierName: string;
    projectId: string;
    projectName: string;
    status: POStatus;
    items: POItem[];
    subtotal: number;
    tax: number;
    total: number;
    notes: string;
    deliveryDate: string;
    issueDate: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

const STATUS_TABS = [
  { k: 'Todas', v: 'all' },
  { k: 'Borrador', v: 'Borrador' },
  { k: 'Enviada', v: 'Enviada' },
  { k: 'Aprobada', v: 'Aprobada' },
  { k: 'Parcial', v: 'Parcial' },
  { k: 'Recibida', v: 'Recibida' },
  { k: 'Cancelada', v: 'Cancelada' },
];

const STATUS_COLORS: Record<POStatus, string> = {
  Borrador: 'bg-[var(--skeuo-raised)] text-[var(--muted-foreground)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Enviada: 'bg-[var(--skeuo-raised)] text-[var(--af-blue)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Aprobada: 'bg-[var(--skeuo-raised)] text-emerald-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Parcial: 'bg-[var(--skeuo-raised)] text-amber-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Recibida: 'bg-[var(--skeuo-raised)] text-[var(--af-accent)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Cancelada: 'bg-[var(--skeuo-raised)] text-red-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] line-through opacity-60',
};

const emptyPOItem = (): POItem => ({ id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, description: '', quantity: 1, price: 0 });

export default function PurchaseOrdersScreen() {
  const ui = useUI();
  const { projects, suppliers } = useFirestore();
  const auth = useAuth();
  const tenantId = useTenantId();
  const { showToast } = ui;

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tab, setTab] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formSupplier, setFormSupplier] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formItems, setFormItems] = useState<POItem[]>([emptyPOItem()]);
  const [formNotes, setFormNotes] = useState('');
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formTax, setFormTax] = useState(19);

  // Load POs
  useEffect(() => {
    if (!tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('purchaseOrders').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setPos(snapToDocs(snap) as PurchaseOrder[]);
    }, (err: Error) => console.error('[ArchiFlow] PO: listen error:', err));
    return () => unsub();
  }, [tenantId]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return pos;
    return pos.filter(po => po.data.status === filterStatus);
  }, [pos, filterStatus]);

  const totals = useMemo(() => {
    const subtotal = formItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    const taxAmt = subtotal * (Number(formTax) || 0) / 100;
    return { subtotal, tax: taxAmt, total: subtotal + taxAmt };
  }, [formItems, formTax]);

  // Summary
  const summary = useMemo(() => {
    const total = pos.length;
    const approved = pos.filter(p => p.data.status === 'Aprobada').length;
    const pending = pos.filter(p => ['Borrador', 'Enviada'].includes(p.data.status)).length;
    const totalAmount = pos.filter(p => p.data.status !== 'Cancelada').reduce((s, p) => s + (p.data.total || 0), 0);
    return { total, approved, pending, totalAmount };
  }, [pos]);

  const resetForm = () => {
    setEditingId(null);
    setFormSupplier('');
    setFormProject('');
    setFormItems([emptyPOItem()]);
    setFormNotes('');
    setFormDeliveryDate('');
    setFormTax(19);
  };

  const openEditor = (po?: PurchaseOrder) => {
    if (po) {
      setEditingId(po.id);
      setFormSupplier(po.data.supplierId);
      setFormProject(po.data.projectId);
      setFormItems(po.data.items?.length ? po.data.items : [emptyPOItem()]);
      setFormNotes(po.data.notes || '');
      setFormDeliveryDate(po.data.deliveryDate || '');
      setFormTax(po.data.tax || 19);
    } else {
      resetForm();
    }
    setTab('editor');
  };

  const savePO = async () => {
    if (!formSupplier) { showToast('Selecciona un proveedor', 'error'); return; }
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const supplier = suppliers.find(s => s.id === formSupplier);
      const proj = projects.find(p => p.id === formProject);

      const poData: Record<string, any> = {
        supplierId: formSupplier,
        supplierName: supplier?.data.name || '',
        projectId: formProject || '',
        projectName: proj?.data.name || '',
        status: editingId ? undefined : 'Borrador',
        items: formItems,
        subtotal: totals.subtotal,
        tax: formTax,
        total: totals.total,
        notes: formNotes,
        deliveryDate: formDeliveryDate,
        updatedAt: ts,
      };

      if (editingId) {
        await db.collection('purchaseOrders').doc(editingId).update(poData);
        showToast('Orden de compra actualizada');
      } else {
        poData.number = `OC-${Date.now().toString(36).toUpperCase()}`;
        poData.issueDate = new Date().toISOString().split('T')[0];
        poData.createdAt = ts;
        poData.createdBy = auth.authUser?.uid || '';
        poData.tenantId = tenantId;
        await db.collection('purchaseOrders').add(poData);
        showToast('✅ Orden de compra creada');
      }
      resetForm();
      setTab('list');
    } catch (err) {
      console.error('[ArchiFlow] PO: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  const deletePO = async (id: string) => {
    try {
      await getFirebase().firestore().collection('purchaseOrders').doc(id).delete();
      showToast('Orden eliminada');
      if (editingId === id) { resetForm(); setTab('list'); }
    } catch (err) {
      console.error('[ArchiFlow] PO: delete error:', err);
      showToast('Error al eliminar', 'error');
    }
  };

  const updateStatus = async (id: string, status: POStatus) => {
    try {
      await getFirebase().firestore().collection('purchaseOrders').doc(id).update({
        status,
        updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
      });
      showToast(`Estado: ${status}`);
    } catch (err) {
      console.error('[ArchiFlow] PO: status update error:', err);
    }
  };

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setFormItems(prev => [...prev, emptyPOItem()]);
  const removeItem = (idx: number) => setFormItems(prev => prev.filter((_, i) => i !== idx));

  // ===== LIST VIEW =====
  if (tab === 'list') {
    return (
      <div className="animate-fadeIn space-y-4">
        {/* Filter + New */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button key={tab.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${filterStatus === tab.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setFilterStatus(tab.v)}>{tab.k}</button>
            ))}
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => openEditor()}>
            <Plus size={16} /> Nueva Orden
          </button>
        </div>

        {/* Summary Cards */}
        <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { lbl: 'Total OCs', val: String(summary.total), color: 'text-[var(--af-accent)]' },
            { lbl: 'Aprobadas', val: String(summary.approved), color: 'text-emerald-400' },
            { lbl: 'Pendientes', val: String(summary.pending), color: 'text-[var(--af-blue)]' },
            { lbl: 'Monto Total', val: fmtCOP(summary.totalAmount), color: 'text-purple-400' },
          ].map((c, i) => (
            <div key={i} className="card-glass-subtle rounded-xl xl:p-4 p-3">
              <div className={`text-lg font-bold font-tabular text-gradient ${c.color}`}>{c.val}</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
            </div>
          ))}
        </div>

        {/* PO List */}
        {filtered.length === 0 ? (
          <EmptyState
            illustration="files"
            title="Sin órdenes de compra"
            description={filterStatus !== 'all' ? `No hay órdenes con estado "${filterStatus}"` : 'Crea tu primera orden de compra para gestionar las adquisiciones'}
            action={filterStatus === 'all' ? { label: 'Crear Orden', onClick: () => openEditor() } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(po => {
              const isExpanded = expandedId === po.id;
              return (
                <div key={po.id} className="card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all" onClick={() => setExpandedId(isExpanded ? null : po.id)}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{po.data.number}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 ${STATUS_COLORS[po.data.status] || ''}`}>{po.data.status}</span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{po.data.supplierName}{po.data.projectName ? ' · ' + po.data.projectName : ''}</div>
                      {po.data.deliveryDate && <div className="text-[10px] text-[var(--af-text3)] mt-0.5">Entrega: {po.data.deliveryDate}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base sm:text-lg font-bold font-tabular text-gradient text-[var(--af-accent)]">{fmtCOP(po.data.total)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{po.data.items?.length || 0} items</div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2 animate-fadeIn">
                      <div className="space-y-1">
                        {po.data.items?.map((item, i) => (
                          <div key={item.id || i} className="flex justify-between text-[12px]">
                            <span className="text-[var(--muted-foreground)]">{item.description || 'Sin descripción'}</span>
                            <span className="text-[var(--foreground)]">{item.quantity} × {fmtCOP(item.price)} = {fmtCOP(item.quantity * item.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[var(--border)]">
                        <span>Subtotal: {fmtCOP(po.data.subtotal)}</span>
                        <span>IVA {po.data.tax || 19}%: {fmtCOP(po.data.tax * (po.data.subtotal || 0) / 100)}</span>
                        <span className="text-[var(--af-accent)]">Total: {fmtCOP(po.data.total)}</span>
                      </div>
                      {po.data.notes && <div className="text-[12px] text-[var(--muted-foreground)] italic">{po.data.notes}</div>}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0 flex-wrap mt-2 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => openEditor(po)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    {po.data.status === 'Borrador' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => updateStatus(po.id, 'Enviada')}>Enviar</button>}
                    {po.data.status === 'Enviada' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-emerald-400 hover:opacity-80 transition-opacity" onClick={() => updateStatus(po.id, 'Aprobada')}>Aprobar</button>}
                    {po.data.status === 'Aprobada' && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-amber-400 hover:opacity-80 transition-opacity" onClick={() => updateStatus(po.id, 'Parcial')}>Parcial</button>}
                    {(po.data.status === 'Parcial' || po.data.status === 'Aprobada') && <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80 transition-opacity" onClick={() => updateStatus(po.id, 'Recibida')}>Recibida</button>}
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80 transition-opacity" onClick={() => deletePO(po.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== EDITOR VIEW =====
  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{editingId ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</h3>
        <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => { resetForm(); setTab('list'); }}>← Volver</button>
      </div>

      <div className="card-elevated rounded-xl p-4 space-y-4">
        {/* Supplier & Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formSupplier} onChange={e => setFormSupplier(e.target.value)}>
            <option value="">Seleccionar proveedor *</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.data.name}</option>)}
          </select>
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formProject} onChange={e => setFormProject(e.target.value)}>
            <option value="">Seleccionar proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
          <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Fecha de entrega" value={formDeliveryDate} onChange={e => setFormDeliveryDate(e.target.value)} />
        </div>

        {/* Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Items</span>
            <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={addItem}>+ Agregar item</button>
          </div>
          <div className="skeuo-well rounded-xl p-3 space-y-2">
            {formItems.map((item, idx) => (
              <div key={item.id} className="bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-lg p-2.5">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input className="col-span-6 md:col-span-5 skeuo-input px-2 py-1.5 text-xs outline-none" placeholder="Descripción" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <input type="number" className="col-span-2 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Cant." value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value) || 0)} />
                  <input type="number" className="col-span-3 md:col-span-4 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Precio" value={item.price || ''} onChange={e => updateItem(idx, 'price', Number(e.target.value) || 0)} />
                  <button className="col-span-1 text-xs text-[var(--af-red)] cursor-pointer text-center" onClick={() => removeItem(idx)}>✕</button>
                </div>
                <div className="text-right text-[10px] text-[var(--muted-foreground)] mt-1">
                  {fmtCOP((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span>{fmtCOP(totals.subtotal)}</span></div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">IVA (%)</span>
            <input type="number" className="w-20 skeuo-input px-2 py-1 text-xs text-right outline-none" value={formTax} onChange={e => setFormTax(Number(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-[var(--border)]">
            <span>Total</span>
            <span className="text-[var(--af-accent)] font-tabular">{fmtCOP(totals.total)}</span>
          </div>
        </div>

        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />

        <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={savePO}>
          {editingId ? 'Guardar Cambios' : 'Crear Orden de Compra'}
        </button>
      </div>
    </div>
  );
}
