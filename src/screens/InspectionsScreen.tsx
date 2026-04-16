'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs } from '@/lib/firebase-service';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, CheckCircle, XCircle, Clock, MinusCircle, Pencil } from 'lucide-react';
import type { FirestoreTimestamp } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

type InspectionStatus = 'Pendiente' | 'En progreso' | 'Aprobada' | 'Rechazada';
type InspectionType = 'Estructural' | 'Eléctrico' | 'Acabados' | 'General';
type ItemResult = 'pass' | 'fail' | 'na' | 'pending';

interface InspectionItem {
  id: string;
  description: string;
  result: ItemResult;
  score: number;
  notes: string;
  photos: string[];
}

interface Inspection {
  id: string;
  data: {
    title: string;
    projectId: string;
    projectName: string;
    type: InspectionType;
    inspector: string;
    status: InspectionStatus;
    date: string;
    score: number;
    items: InspectionItem[];
    notes: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

const STATUS_TABS = [
  { k: 'Todas', v: 'all' },
  { k: 'Pendiente', v: 'Pendiente' },
  { k: 'En progreso', v: 'En progreso' },
  { k: 'Aprobada', v: 'Aprobada' },
  { k: 'Rechazada', v: 'Rechazada' },
];

const TYPE_TABS = [
  { k: 'Todos', v: 'all' },
  { k: 'Estructural', v: 'Estructural' },
  { k: 'Eléctrico', v: 'Eléctrico' },
  { k: 'Acabados', v: 'Acabados' },
  { k: 'General', v: 'General' },
];

const STATUS_COLORS: Record<InspectionStatus, string> = {
  Pendiente: 'bg-amber-500/10 text-amber-400',
  'En progreso': 'bg-blue-500/10 text-blue-400',
  Aprobada: 'bg-emerald-500/10 text-emerald-400',
  Rechazada: 'bg-red-500/10 text-red-400',
};

const TYPE_COLORS: Record<InspectionType, string> = {
  Estructural: 'bg-orange-500/10 text-orange-400',
  Eléctrico: 'bg-cyan-500/10 text-cyan-400',
  Acabados: 'bg-purple-500/10 text-purple-400',
  General: 'bg-[var(--skeuo-raised)] text-[var(--muted-foreground)]',
};

const RESULT_ICONS: Record<ItemResult, { icon: React.ReactNode; color: string }> = {
  pass: { icon: <CheckCircle size={16} />, color: 'text-emerald-400' },
  fail: { icon: <XCircle size={16} />, color: 'text-red-400' },
  pending: { icon: <Clock size={16} />, color: 'text-amber-400' },
  na: { icon: <MinusCircle size={16} />, color: 'text-[var(--muted-foreground)]' },
};

const RESULT_LABELS: Record<ItemResult, string> = {
  pass: 'Aprobado',
  fail: 'Rechazado',
  pending: 'Pendiente',
  na: 'N/A',
};

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--af-bg4)" strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color }}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

const emptyItem = (): InspectionItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: '',
  result: 'pending',
  score: 0,
  notes: '',
  photos: [],
});

export default function InspectionsScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const auth = useAuth();
  const { showToast } = ui;

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [tab, setTab] = useState<'list' | 'create' | 'edit'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formType, setFormType] = useState<InspectionType>('General');
  const [formInspector, setFormInspector] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formItems, setFormItems] = useState<InspectionItem[]>([emptyItem()]);
  const [formNotes, setFormNotes] = useState('');

  // Load
  useEffect(() => {
    const db = getFirebase().firestore();
    const unsub = db.collection('inspections').orderBy('date', 'desc').onSnapshot((snap: any) => {
      setInspections(snapToDocs(snap) as Inspection[]);
    }, (err: any) => console.error('[ArchiFlow] Inspections: listen error:', err));
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = inspections;
    if (filterStatus !== 'all') list = list.filter(i => i.data.status === filterStatus);
    if (filterType !== 'all') list = list.filter(i => i.data.type === filterType);
    return list;
  }, [inspections, filterStatus, filterType]);

  const summary = useMemo(() => {
    const total = inspections.length;
    const approved = inspections.filter(i => i.data.status === 'Aprobada').length;
    const pending = inspections.filter(i => ['Pendiente', 'En progreso'].includes(i.data.status)).length;
    const avgScore = inspections.filter(i => i.data.score > 0).length > 0
      ? Math.round(inspections.filter(i => i.data.score > 0).reduce((s, i) => s + i.data.score, 0) / inspections.filter(i => i.data.score > 0).length)
      : 0;
    return { total, approved, pending, avgScore };
  }, [inspections]);

  // Auto-calculate score from items
  const formScore = useMemo(() => {
    const scored = formItems.filter(i => i.result === 'pass' || i.result === 'fail');
    if (scored.length === 0) return 0;
    const total = scored.reduce((s, i) => s + i.score, 0);
    return Math.round(total / scored.length);
  }, [formItems]);

  const resetForm = () => {
    setFormTitle('');
    setFormProject('');
    setFormType('General');
    setFormInspector('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormItems([emptyItem()]);
    setFormNotes('');
    setEditingId(null);
  };

  const populateForm = (insp: Inspection) => {
    setFormTitle(insp.data.title);
    setFormProject(insp.data.projectId);
    setFormType(insp.data.type || 'General');
    setFormInspector(insp.data.inspector || '');
    setFormDate(insp.data.date || new Date().toISOString().split('T')[0]);
    setFormItems(insp.data.items?.length ? insp.data.items : [emptyItem()]);
    setFormNotes(insp.data.notes || '');
    setEditingId(insp.id);
  };

  const openEdit = (insp: Inspection) => {
    populateForm(insp);
    setTab('edit');
    setExpandedId(null);
  };

  const updateItem = (idx: number, field: keyof InspectionItem, value: any) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setFormItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setFormItems(prev => prev.filter((_, i) => i !== idx));

  const saveInspection = async () => {
    if (!formTitle) { showToast('Ingresa un título', 'error'); return; }
    if (!formProject) { showToast('Selecciona un proyecto', 'error'); return; }
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const proj = projects.find(p => p.id === formProject);

      const inspData = {
        title: formTitle,
        projectId: formProject,
        projectName: proj?.data.name || '',
        type: formType,
        inspector: formInspector || auth.authUser?.displayName || '',
        date: formDate,
        score: formScore,
        items: formItems,
        notes: formNotes,
        updatedAt: ts,
      };

      if (editingId) {
        await db.collection('inspections').doc(editingId).update(inspData);
        showToast('Inspección actualizada');
      } else {
        await db.collection('inspections').add({
          ...inspData,
          status: 'Pendiente',
          createdAt: ts,
          createdBy: auth.authUser?.uid || '',
        });
        showToast('Inspección creada');
      }
      resetForm();
      setTab('list');
    } catch (err) {
      console.error('[ArchiFlow] Inspections: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  const deleteInspection = async (id: string) => {
    try {
      await getFirebase().firestore().collection('inspections').doc(id).delete();
      showToast('Inspección eliminada');
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('[ArchiFlow] Inspections: delete error:', err);
    }
  };

  const updateStatus = async (id: string, status: InspectionStatus) => {
    try {
      await getFirebase().firestore().collection('inspections').doc(id).update({
        status,
        updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
      });
      showToast(`Estado: ${status}`);
    } catch (err) {
      console.error('[ArchiFlow] Inspections: status update error:', err);
    }
  };

  // ===== LIST VIEW =====
  if (tab === 'list') {
    return (
      <div className="animate-fadeIn space-y-4">
        {/* Filter + New */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
            {STATUS_TABS.map(t => (
              <button key={t.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${filterStatus === t.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setFilterStatus(t.v)}>{t.k}</button>
            ))}
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { resetForm(); setTab('create'); }}>
            <Plus size={16} /> Nueva Inspección
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
          {TYPE_TABS.map(t => (
            <button key={t.v} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${filterType === t.v ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setFilterType(t.v)}>{t.k}</button>
          ))}
        </div>

        {/* Summary */}
        <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { lbl: 'Total Inspecciones', val: String(summary.total), color: 'text-[var(--af-accent)]' },
            { lbl: 'Aprobadas', val: String(summary.approved), color: 'text-emerald-400' },
            { lbl: 'Pendientes', val: String(summary.pending), color: 'text-amber-400' },
            { lbl: 'Puntaje Promedio', val: `${summary.avgScore}%`, color: summary.avgScore >= 80 ? 'text-emerald-400' : summary.avgScore >= 60 ? 'text-amber-400' : 'text-red-400' },
          ].map((c, i) => (
            <div key={i} className="card-glass-subtle rounded-xl xl:p-4 p-3">
              <div className={`text-lg font-bold font-tabular text-gradient ${c.color}`}>{c.val}</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            illustration="tasks"
            title="Sin inspecciones"
            description={filterStatus !== 'all' || filterType !== 'all' ? 'No hay inspecciones con los filtros seleccionados' : 'Crea tu primera inspección de calidad'}
            action={filterStatus === 'all' && filterType === 'all' ? { label: 'Crear Inspección', onClick: () => { resetForm(); setTab('create'); } } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(insp => {
              const isExpanded = expandedId === insp.id;
              return (
                <div key={insp.id} className="card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all" onClick={() => setExpandedId(isExpanded ? null : insp.id)}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Score ring */}
                    <div className="shrink-0">
                      <ScoreRing score={insp.data.score} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold">{insp.data.title}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 ${TYPE_COLORS[insp.data.type]}`}>{insp.data.type}</span>
                        <span className={`skeuo-badge text-[10px] px-2 py-0.5 ${STATUS_COLORS[insp.data.status]}`}>{insp.data.status}</span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">
                        {insp.data.projectName}{insp.data.inspector ? ` · Inspector: ${insp.data.inspector}` : ''}
                      </div>
                      <div className="text-[10px] text-[var(--af-text3)] mt-0.5">
                        {insp.data.date} · {insp.data.items?.length || 0} items
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-fadeIn">
                      {/* Items checklist */}
                      {insp.data.items?.map((item, idx) => {
                        const ri = RESULT_ICONS[item.result] || RESULT_ICONS.pending;
                        return (
                          <div key={item.id || idx} className="flex items-start gap-3 py-1.5 border-b border-[var(--border)] last:border-b-0">
                            <div className={`shrink-0 mt-0.5 ${ri.color}`}>{ri.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-[var(--foreground)]">{item.description || 'Sin descripción'}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ri.color} bg-[var(--skeuo-raised)]`}>{RESULT_LABELS[item.result]}</span>
                                {item.score > 0 && <span className="text-[10px] text-[var(--muted-foreground)]">Puntaje: {item.score}</span>}
                              </div>
                              {item.notes && <div className="text-[11px] text-[var(--muted-foreground)] mt-1 italic">{item.notes}</div>}
                            </div>
                          </div>
                        );
                      })}
                      {insp.data.notes && <div className="text-[12px] text-[var(--muted-foreground)] italic">Notas: {insp.data.notes}</div>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0 flex-wrap mt-2 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                    {insp.data.status === 'Pendiente' && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-blue-400 hover:opacity-80" onClick={() => updateStatus(insp.id, 'En progreso')}>Iniciar</button>
                    )}
                    {(insp.data.status === 'Pendiente' || insp.data.status === 'En progreso') && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-emerald-400 hover:opacity-80" onClick={() => updateStatus(insp.id, 'Aprobada')}>Aprobar</button>
                    )}
                    {(insp.data.status === 'Pendiente' || insp.data.status === 'En progreso') && (
                      <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80" onClick={() => updateStatus(insp.id, 'Rechazada')}>Rechazar</button>
                    )}
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80" onClick={() => deleteInspection(insp.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80" onClick={() => openEdit(insp)} title="Editar">
                      <Pencil size={14} />
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

  // ===== CREATE / EDIT VIEW =====
  const isEditing = tab === 'edit' && editingId !== null;
  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{isEditing ? 'Editar Inspección de Calidad' : 'Nueva Inspección de Calidad'}</h3>
        <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => { resetForm(); setTab('list'); }}>← Volver</button>
      </div>

      <div className="card-elevated rounded-xl p-4 space-y-4">
        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Título de la inspección *" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formProject} onChange={e => setFormProject(e.target.value)}>
            <option value="">Seleccionar proyecto *</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formType} onChange={e => setFormType(e.target.value as InspectionType)}>
            <option value="Estructural">Estructural</option>
            <option value="Eléctrico">Eléctrico</option>
            <option value="Acabados">Acabados</option>
            <option value="General">General</option>
          </select>
          <input className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Inspector" value={formInspector} onChange={e => setFormInspector(e.target.value)} />
          <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
        </div>

        {/* Score preview */}
        <div className="flex items-center gap-3 card-glass-subtle rounded-xl p-3">
          <ScoreRing score={formScore} size={52} />
          <div>
            <div className="text-[13px] font-semibold">Puntaje Calculado</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">{formItems.filter(i => i.result !== 'pending').length} de {formItems.length} items evaluados</div>
          </div>
        </div>

        {/* Items checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Items de Inspección</span>
            <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={addItem}>+ Agregar item</button>
          </div>
          <div className="skeuo-well rounded-xl p-3 space-y-2">
            {formItems.map((item, idx) => (
              <div key={item.id} className="bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input className="flex-1 skeuo-input px-2 py-1.5 text-xs outline-none" placeholder="Descripción del item" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <select className="skeuo-input px-2 py-1.5 text-xs outline-none w-28" value={item.result} onChange={e => updateItem(idx, 'result', e.target.value)}>
                    <option value="pending">Pendiente</option>
                    <option value="pass">Aprobado</option>
                    <option value="fail">Rechazado</option>
                    <option value="na">N/A</option>
                  </select>
                  {item.result !== 'na' && (
                    <input type="number" className="w-16 skeuo-input px-2 py-1.5 text-xs outline-none text-right" placeholder="Pts" min="0" max="100" value={item.score || ''} onChange={e => updateItem(idx, 'score', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
                  )}
                  {formItems.length > 1 && (
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] text-[var(--af-red)] cursor-pointer shrink-0" onClick={() => removeItem(idx)}>✕</button>
                  )}
                </div>
                <input className="w-full skeuo-input px-2 py-1 text-[10px] outline-none text-[var(--muted-foreground)]" placeholder="Notas (opcional)" value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Notas generales..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />

        <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveInspection}>
          {isEditing ? 'Guardar Cambios' : 'Crear Inspección'}
        </button>
      </div>
    </div>
  );
}
