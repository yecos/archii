'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs } from '@/lib/firebase-service';
import { fmtCOP } from '@/lib/helpers';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, Edit3, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import type { FirestoreTimestamp, ChangeOrderStatus, ChangeOrderCategory } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

type COStatus = 'Borrador' | 'Solicitada' | 'En Revisión' | 'Aprobada' | 'Rechazada' | 'Implementada';

interface ChangeOrderEntry {
  id: string;
  data: {
    number: string;
    projectId: string;
    projectName: string;
    title: string;
    description: string;
    category: ChangeOrderCategory;
    status: COStatus;
    reason: string;
    impactBudget: number;
    impactDays: number;
    requestedBy: string;
    approvedBy: string;
    approvedAt: FirestoreTimestamp | null;
    implementedAt: FirestoreTimestamp | null;
    dueDate: string;
    notes: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

const STATUS_TABS = [
  { k: 'Todas', v: 'all' },
  { k: 'Borrador', v: 'Borrador' },
  { k: 'Solicitada', v: 'Solicitada' },
  { k: 'En Revisión', v: 'En Revisión' },
  { k: 'Aprobada', v: 'Aprobada' },
  { k: 'Rechazada', v: 'Rechazada' },
  { k: 'Implementada', v: 'Implementada' },
];

const STATUS_COLORS: Record<COStatus, string> = {
  Borrador: 'bg-[var(--skeuo-raised)] text-[var(--muted-foreground)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Solicitada: 'bg-[var(--skeuo-raised)] text-[var(--af-blue)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  'En Revisión': 'bg-[var(--skeuo-raised)] text-amber-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Aprobada: 'bg-[var(--skeuo-raised)] text-emerald-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
  Rechazada: 'bg-[var(--skeuo-raised)] text-red-400 border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] line-through opacity-60',
  Implementada: 'bg-[var(--skeuo-raised)] text-[var(--af-accent)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)]',
};

const STATUS_ICONS: Record<COStatus, typeof FileText> = {
  Borrador: FileText,
  Solicitada: ArrowUpRight,
  'En Revisión': Clock,
  Aprobada: CheckCircle2,
  Rechazada: XCircle,
  Implementada: RotateCcw,
};

const CATEGORIES: ChangeOrderCategory[] = [
  'Cambio de Alcance',
  'Diseño',
  'Condición de Sitio',
  'Solicitud del Cliente',
  'Normativa',
  'Error de Construcción',
  'Otro',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Cambio de Alcance': '📐',
  'Diseño': '🎨',
  'Condición de Sitio': '🏗️',
  'Solicitud del Cliente': '👤',
  'Normativa': '📜',
  'Error de Construcción': '⚠️',
  'Otro': '📌',
};

export default function ChangeOrdersScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const auth = useAuth();
  const { showToast } = ui;

  const [cos, setCos] = useState<ChangeOrderEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tab, setTab] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formProject, setFormProject] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<ChangeOrderCategory>('Cambio de Alcance');
  const [formReason, setFormReason] = useState('');
  const [formImpactBudget, setFormImpactBudget] = useState(0);
  const [formImpactDays, setFormImpactDays] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load Change Orders
  useEffect(() => {
    const db = getFirebase().firestore();
    const unsub = db.collection('changeOrders').orderBy('createdAt', 'desc').onSnapshot((snap) => {
      setCos(snapToDocs(snap) as ChangeOrderEntry[]);
    }, (err: unknown) => console.error('[ArchiFlow] CO: listen error:', err instanceof Error ? err.message : String(err)));
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return cos;
    return cos.filter(co => co.data.status === filterStatus);
  }, [cos, filterStatus]);

  // Summary
  const summary = useMemo(() => {
    const total = cos.length;
    const approved = cos.filter(c => c.data.status === 'Aprobada').length;
    const pending = cos.filter(c => ['Borrador', 'Solicitada', 'En Revisión'].includes(c.data.status)).length;
    const totalImpact = cos
      .filter(c => ['Aprobada', 'Implementada'].includes(c.data.status))
      .reduce((s, c) => s + (c.data.impactBudget || 0), 0);
    const totalDelay = cos
      .filter(c => ['Aprobada', 'Implementada'].includes(c.data.status))
      .reduce((s, c) => s + (c.data.impactDays || 0), 0);
    return { total, approved, pending, totalImpact, totalDelay };
  }, [cos]);

  const resetForm = () => {
    setEditingId(null);
    setFormProject('');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Cambio de Alcance');
    setFormReason('');
    setFormImpactBudget(0);
    setFormImpactDays(0);
    setFormDueDate('');
    setFormNotes('');
  };

  const openEditor = (co?: ChangeOrderEntry) => {
    if (co) {
      setEditingId(co.id);
      setFormProject(co.data.projectId);
      setFormTitle(co.data.title);
      setFormDescription(co.data.description);
      setFormCategory(co.data.category);
      setFormReason(co.data.reason);
      setFormImpactBudget(co.data.impactBudget);
      setFormImpactDays(co.data.impactDays);
      setFormDueDate(co.data.dueDate);
      setFormNotes(co.data.notes);
    } else {
      resetForm();
    }
    setTab('editor');
  };

  const saveCO = async () => {
    if (!formTitle.trim()) { showToast('Ingresa un titulo para el cambio', 'error'); return; }
    if (!formProject) { showToast('Selecciona un proyecto', 'error'); return; }
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const proj = projects.find(p => p.id === formProject);

      const coData: Record<string, any> = {
        projectId: formProject,
        projectName: proj?.data.name || '',
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        reason: formReason.trim(),
        impactBudget: Number(formImpactBudget) || 0,
        impactDays: Number(formImpactDays) || 0,
        dueDate: formDueDate,
        notes: formNotes.trim(),
        updatedAt: ts,
      };

      if (editingId) {
        await db.collection('changeOrders').doc(editingId).update(coData);
        showToast('Cambio actualizado');
      } else {
        coData.number = `CC-${Date.now().toString(36).toUpperCase()}`;
        coData.status = 'Borrador';
        coData.requestedBy = auth.authUser?.displayName || auth.authUser?.email || '';
        coData.approvedBy = '';
        coData.approvedAt = null;
        coData.implementedAt = null;
        coData.createdAt = ts;
        coData.createdBy = auth.authUser?.uid || '';
        await db.collection('changeOrders').add(coData);
        showToast('Cambio registrado');
      }
      resetForm();
      setTab('list');
    } catch (err) {
      console.error('[ArchiFlow] CO: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  const deleteCO = async (id: string) => {
    try {
      await getFirebase().firestore().collection('changeOrders').doc(id).delete();
      showToast('Cambio eliminado');
      if (editingId === id) { resetForm(); setTab('list'); }
    } catch (err) {
      console.error('[ArchiFlow] CO: delete error:', err);
      showToast('Error al eliminar', 'error');
    }
  };

  const updateStatus = async (id: string, status: COStatus) => {
    try {
      const fb = getFirebase();
      const update: Record<string, any> = {
        status,
        updatedAt: fb.firestore.FieldValue.serverTimestamp(),
      };
      if (status === 'Aprobada') {
        update.approvedBy = auth.authUser?.displayName || auth.authUser?.email || '';
        update.approvedAt = fb.firestore.FieldValue.serverTimestamp();
      }
      if (status === 'Implementada') {
        update.implementedAt = fb.firestore.FieldValue.serverTimestamp();
      }
      if (status === 'Solicitada') {
        update.requestedBy = update.requestedBy || auth.authUser?.displayName || '';
      }
      await fb.firestore().collection('changeOrders').doc(id).update(update);
      showToast(`Estado: ${status}`);
    } catch (err) {
      console.error('[ArchiFlow] CO: status update error:', err);
    }
  };

  // ===== LIST VIEW =====
  if (tab === 'list') {
    return (
      <div className="animate-fadeIn space-y-4">
        {/* Header + Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
            {STATUS_TABS.map(t => (
              <button key={t.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${filterStatus === t.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setFilterStatus(t.v)}>{t.k}</button>
            ))}
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => openEditor()}>
            <Plus size={16} /> Nuevo Cambio
          </button>
        </div>

        {/* Summary Cards */}
        <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { lbl: 'Total Cambios', val: String(summary.total), icon: FileText, color: 'text-[var(--af-accent)]' },
            { lbl: 'Pendientes', val: String(summary.pending), icon: Clock, color: 'text-amber-400' },
            { lbl: 'Aprobadas', val: String(summary.approved), icon: CheckCircle2, color: 'text-emerald-400' },
            { lbl: 'Impacto Presupuesto', val: fmtCOP(summary.totalImpact), icon: summary.totalImpact >= 0 ? TrendingUp : TrendingDown, color: summary.totalImpact >= 0 ? 'text-red-400' : 'text-emerald-400' },
            { lbl: 'Dias Adicionales', val: `${summary.totalDelay >= 0 ? '+' : ''}${summary.totalDelay}`, icon: summary.totalDelay >= 0 ? TrendingUp : TrendingDown, color: summary.totalDelay >= 0 ? 'text-red-400' : 'text-emerald-400' },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="card-glass-subtle rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={c.color} />
                  <div className={`text-lg font-bold font-tabular text-gradient ${c.color}`}>{c.val}</div>
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
              </div>
            );
          })}
        </div>

        {/* Change Orders List */}
        {filtered.length === 0 ? (
          <EmptyState
            illustration="files"
            title="Sin cambios registrados"
            description={filterStatus !== 'all' ? `No hay cambios con estado "${filterStatus}"` : 'Registra tu primer cambio para controlar modificaciones al alcance, presupuesto o cronograma'}
            action={filterStatus === 'all' ? { label: 'Registrar Cambio', onClick: () => openEditor() } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(co => {
              const isExpanded = expandedId === co.id;
              const StatusIcon = STATUS_ICONS[co.data.status] || FileText;
              const isCostPositive = co.data.impactBudget > 0;
              const isDelayPositive = co.data.impactDays > 0;

              return (
                <div key={co.id} className="card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all" onClick={() => setExpandedId(isExpanded ? null : co.id)}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Category icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'var(--af-accent)/8' }}>
                      {CATEGORY_ICONS[co.data.category] || '📌'}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-mono text-[var(--af-text3)]">{co.data.number}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 flex items-center gap-1 ${STATUS_COLORS[co.data.status] || ''}`}>
                          <StatusIcon size={10} />
                          {co.data.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-0.5">{co.data.title}</div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{co.data.projectName}</div>

                      {/* Impact indicators */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`flex items-center gap-1 text-[11px] font-medium ${isCostPositive ? 'text-red-400' : co.data.impactBudget < 0 ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                          {isCostPositive ? <TrendingUp size={12} /> : co.data.impactBudget < 0 ? <TrendingDown size={12} /> : null}
                          {isCostPositive ? '+' : ''}{fmtCOP(co.data.impactBudget)}
                        </div>
                        <div className={`flex items-center gap-1 text-[11px] font-medium ${isDelayPositive ? 'text-amber-400' : co.data.impactDays < 0 ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                          <Clock size={12} />
                          {isDelayPositive ? '+' : ''}{co.data.impactDays} dias
                        </div>
                        <div className="text-[10px] text-[var(--af-text3)]">{co.data.category}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-fadeIn">
                      {co.data.description && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-1">Descripcion</div>
                          <div className="text-[13px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{co.data.description}</div>
                        </div>
                      )}
                      {co.data.reason && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider mb-1">Justificacion</div>
                          <div className="text-[13px] text-[var(--muted-foreground)] leading-relaxed whitespace-pre-wrap">{co.data.reason}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                        <div className="card-glass-subtle rounded-lg p-2">
                          <div className="text-[10px] text-[var(--af-text3)]">Categoria</div>
                          <div className="font-medium">{CATEGORY_ICONS[co.data.category]} {co.data.category}</div>
                        </div>
                        <div className="card-glass-subtle rounded-lg p-2">
                          <div className="text-[10px] text-[var(--af-text3)]">Solicitado por</div>
                          <div className="font-medium truncate">{co.data.requestedBy || '—'}</div>
                        </div>
                        <div className="card-glass-subtle rounded-lg p-2">
                          <div className="text-[10px] text-[var(--af-text3)]">Aprobado por</div>
                          <div className="font-medium truncate">{co.data.approvedBy || '—'}</div>
                        </div>
                        {co.data.dueDate && (
                          <div className="card-glass-subtle rounded-lg p-2">
                            <div className="text-[10px] text-[var(--af-text3)]">Fecha Limite</div>
                            <div className="font-medium">{co.data.dueDate}</div>
                          </div>
                        )}
                      </div>
                      {co.data.notes && <div className="text-[12px] text-[var(--muted-foreground)] italic">Nota: {co.data.notes}</div>}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-1 flex-wrap mt-3 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => openEditor(co)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    {co.data.status === 'Borrador' && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity flex items-center gap-1" onClick={() => updateStatus(co.id, 'Solicitada')}>
                        <ArrowUpRight size={12} /> Solicitar
                      </button>
                    )}
                    {co.data.status === 'Solicitada' && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-amber-400 hover:opacity-80 transition-opacity flex items-center gap-1" onClick={() => updateStatus(co.id, 'En Revisión')}>
                        <Clock size={12} /> Revisar
                      </button>
                    )}
                    {co.data.status === 'En Revisión' && (
                      <>
                        <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-emerald-400 hover:opacity-80 transition-opacity flex items-center gap-1" onClick={() => updateStatus(co.id, 'Aprobada')}>
                          <CheckCircle2 size={12} /> Aprobar
                        </button>
                        <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80 transition-opacity flex items-center gap-1" onClick={() => updateStatus(co.id, 'Rechazada')}>
                          <XCircle size={12} /> Rechazar
                        </button>
                      </>
                    )}
                    {co.data.status === 'Aprobada' && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-accent)] hover:opacity-80 transition-opacity flex items-center gap-1" onClick={() => updateStatus(co.id, 'Implementada')}>
                        <RotateCcw size={12} /> Implementar
                      </button>
                    )}
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80 transition-opacity ml-auto" onClick={() => deleteCO(co.id)} title="Eliminar">
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
        <h3 className="text-[15px] font-semibold">{editingId ? 'Editar Cambio' : 'Nuevo Control de Cambio'}</h3>
        <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => { resetForm(); setTab('list'); }}>Volver a la lista</button>
      </div>

      <div className="card-elevated rounded-xl p-4 space-y-4">
        {/* Project & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formProject} onChange={e => setFormProject(e.target.value)}>
            <option value="">Seleccionar proyecto *</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formCategory} onChange={e => setFormCategory(e.target.value as ChangeOrderCategory)}>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>)}
          </select>
          <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Fecha limite" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
        </div>

        {/* Title */}
        <input className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Titulo del cambio *" value={formTitle} onChange={e => setFormTitle(e.target.value)} />

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-[var(--af-text3)] uppercase tracking-wider">Descripcion del cambio</label>
          <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={3} placeholder="Describe detalladamente el cambio solicitado..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-[var(--af-text3)] uppercase tracking-wider">Justificacion / Razon</label>
          <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Por que se requiere este cambio..." value={formReason} onChange={e => setFormReason(e.target.value)} />
        </div>

        {/* Impact */}
        <div className="aurora-bg card-glass rounded-xl p-4 space-y-3">
          <div className="text-[12px] font-semibold text-[var(--af-text3)] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            Impacto del Cambio
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] flex items-center gap-2">
                Impacto en Presupuesto
                {formImpactBudget > 0 && <span className="text-red-400 text-[11px]">(Incremento)</span>}
                {formImpactBudget < 0 && <span className="text-emerald-400 text-[11px]">(Ahorro)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
                <input
                  type="number"
                  className="w-full skeuo-input pl-7 pr-3 py-2 text-sm text-[var(--foreground)] outline-none text-right font-tabular"
                  placeholder="0"
                  value={formImpactBudget || ''}
                  onChange={e => setFormImpactBudget(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] flex items-center gap-2">
                Impacto en Cronograma
                {formImpactDays > 0 && <span className="text-amber-400 text-[11px]">(Retraso)</span>}
                {formImpactDays < 0 && <span className="text-emerald-400 text-[11px]">(Ahorro tiempo)</span>}
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full skeuo-input pl-3 pr-10 py-2 text-sm text-[var(--foreground)] outline-none text-right font-tabular"
                  placeholder="0"
                  value={formImpactDays || ''}
                  onChange={e => setFormImpactDays(Number(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">dias</span>
              </div>
            </div>
          </div>

          {/* Impact preview */}
          {(formImpactBudget !== 0 || formImpactDays !== 0) && (
            <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
              <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${formImpactBudget > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formImpactBudget > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formImpactBudget > 0 ? '+' : ''}{fmtCOP(formImpactBudget)}
              </div>
              <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${formImpactDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                <Clock size={14} />
                {formImpactDays > 0 ? '+' : ''}{formImpactDays} dias
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas adicionales..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />

        {/* Submit */}
        <div className="flex gap-3">
          <button className="flex-1 skeuo-btn bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveCO}>
            {editingId ? 'Guardar Cambios' : 'Registrar Cambio'}
          </button>
          <button className="skeuo-btn px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-[var(--skeuo-edge-light)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors bg-transparent" onClick={() => { resetForm(); setTab('list'); }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
