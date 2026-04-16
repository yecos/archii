/**
 * FormBuilderScreen.tsx — Dynamic Form Builder for custom inspections/checklists.
 * Create form templates with various field types, fill them out per project,
 * and view completed form instances.
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useFirestore, useUI } from '@/hooks/useDomain';
import { getFirebase, serverTimestamp, snapToDocs, type QuerySnapshot } from '@/lib/firebase-service';
import { useTenantId } from '@/hooks/useTenantId';
import { confirm } from '@/hooks/useConfirmDialog';
import {
  FileText, Plus, Trash2, Pencil, CheckSquare, Camera, Star,
  ChevronDown, ChevronUp, GripVertical, X, Download, Eye,
  ClipboardList, AlertTriangle, Save
} from 'lucide-react';

/* ===== TYPES ===== */

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'photo' | 'date' | 'rating';
  label: string;
  required: boolean;
  options?: string[]; // for select type
}

interface FormTemplate {
  id: string;
  data: {
    name: string;
    description: string;
    icon: string;
    fields: FormField[];
    createdAt: unknown;
    createdBy: string;
    updatedAt?: unknown;
  };
}

interface FormInstance {
  id: string;
  data: {
    templateId: string;
    templateName: string;
    projectId: string;
    projectName: string;
    status: string;
    values: Record<string, string | number | boolean>;
    photos: string[];
    filledBy: string;
    filledByName: string;
    completedAt: unknown;
    createdAt: unknown;
    updatedAt?: unknown;
  };
}

const FIELD_TYPES: Array<{ type: FormField['type']; label: string; icon: React.ReactNode }> = [
  { type: 'text', label: 'Texto corto', icon: <FileText size={14} /> },
  { type: 'textarea', label: 'Texto largo', icon: <FileText size={14} /> },
  { type: 'number', label: 'Número', icon: <span className="text-xs font-bold">#</span> },
  { type: 'select', label: 'Selección', icon: <ChevronDown size={14} /> },
  { type: 'checkbox', label: 'Sí / No', icon: <CheckSquare size={14} /> },
  { type: 'photo', label: 'Foto', icon: <Camera size={14} /> },
  { type: 'date', label: 'Fecha', icon: <span className="text-xs">📅</span> },
  { type: 'rating', label: 'Calificación', icon: <Star size={14} /> },
];

const FORM_ICONS = ['📋', '🔍', '✅', '🏗️', '⚡', '🔧', '📊', '🛡️', '📏', '🧱', '🔌', '🏁'];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ===== COMPONENTS ===== */

function FieldEditor({ field, onUpdate, onRemove, index }: {
  field: FormField;
  onUpdate: (f: FormField) => void;
  onRemove: () => void;
  index: number;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [newOption, setNewOption] = useState('');

  return (
    <div className="card-glass-subtle rounded-lg p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <GripVertical size={14} className="text-[var(--af-text3)]" />
        <span className="text-[10px] text-[var(--af-text3)] bg-[var(--af-bg4)] px-1.5 py-0.5 rounded">#{index + 1}</span>
        <div className="flex-1 flex items-center gap-2">
          <select
            className="text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--foreground)] outline-none cursor-pointer"
            value={field.type}
            onChange={e => onUpdate({ ...field, type: e.target.value as FormField['type'] })}
          >
            {FIELD_TYPES.map(ft => (
              <option key={ft.type} value={ft.type}>{ft.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Etiqueta del campo..."
            value={field.label}
            onChange={e => onUpdate({ ...field, label: e.target.value })}
            className="flex-1 text-[12px] skeuo-input px-2 py-1"
          />
        </div>
        <label className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => onUpdate({ ...field, required: e.target.checked })}
            className="w-3.5 h-3.5 rounded"
          />
          Req.
        </label>
        <button onClick={onRemove} className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-none">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Options editor for select type */}
      {field.type === 'select' && (
        <div className="ml-6 pl-3 border-l-2 border-[var(--border)]">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1 text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline mb-1 bg-transparent border-none"
          >
            {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Opciones ({field.options?.length || 0})
          </button>
          {showOptions && (
            <div className="space-y-1 animate-fadeIn">
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[11px] text-[var(--muted-foreground)] flex-1">{opt}</span>
                  <button
                    onClick={() => onUpdate({ ...field, options: (field.options || []).filter((_, j) => j !== i) })}
                    className="text-red-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Agregar opción..."
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newOption.trim()) {
                      onUpdate({ ...field, options: [...(field.options || []), newOption.trim()] });
                      setNewOption('');
                    }
                  }}
                  className="flex-1 text-[11px] skeuo-input px-2 py-0.5"
                />
                <button
                  onClick={() => {
                    if (newOption.trim()) {
                      onUpdate({ ...field, options: [...(field.options || []), newOption.trim()] });
                      setNewOption('');
                    }
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 border-none"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== MAIN SCREEN ===== */

export default function FormBuilderScreen() {
  const { authUser, getUserName, teamUsers } = useAuth();
  const tenantId = useTenantId();
  const { projects } = useFirestore();
  const { showToast } = useUI();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [instances, setInstances] = useState<FormInstance[]>([]);
  const [tab, setTab] = useState<'templates' | 'fill' | 'history'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [fillingTemplate, setFillingTemplate] = useState<FormTemplate | null>(null);
  const [viewingInstance, setViewingInstance] = useState<FormInstance | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state for template editor
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [tmplIcon, setTmplIcon] = useState('📋');
  const [tmplFields, setTmplFields] = useState<FormField[]>([]);

  // Form state for filling
  const [fillProject, setFillProject] = useState('');
  const [fillValues, setFillValues] = useState<Record<string, string | number | boolean>>({});
  const [fillPhotos, setFillPhotos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load data
  useEffect(() => {
    if (!authUser || !tenantId) return;
    const db = getFirebase().firestore();

    const unsub1 = db.collection('formTemplates').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').onSnapshot(
      (snap: QuerySnapshot) => { setTemplates(snapToDocs(snap) as FormTemplate[]); setLoading(false); },
      (err: unknown) => { console.error('[ArchiFlow] Error loading form templates:', err); setLoading(false); }
    );

    const unsub2 = db.collection('formInstances').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(50).onSnapshot(
      (snap: QuerySnapshot) => { setInstances(snapToDocs(snap) as FormInstance[]); },
      (err: unknown) => { console.error('[ArchiFlow] Error loading form instances:', err); }
    );

    return () => { unsub1(); unsub2(); };
  }, [authUser, tenantId]);

  // Template CRUD
  const resetTemplateForm = useCallback(() => {
    setTmplName('');
    setTmplDesc('');
    setTmplIcon('📋');
    setTmplFields([]);
    setEditingTemplate(null);
  }, []);

  const openEditTemplate = useCallback((t: FormTemplate) => {
    setEditingTemplate(t);
    setTmplName(t.data.name);
    setTmplDesc(t.data.description);
    setTmplIcon(t.data.icon);
    setTmplFields([...t.data.fields]);
    setTab('templates');
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!tmplName.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
    if (tmplFields.length === 0) { showToast('Agrega al menos un campo', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const data = {
        name: tmplName.trim(),
        description: tmplDesc.trim(),
        icon: tmplIcon,
        fields: tmplFields,
        updatedAt: ts,
      };
      if (editingTemplate) {
        await db.collection('formTemplates').doc(editingTemplate.id).update(data);
        showToast('Plantilla actualizada');
      } else {
        await db.collection('formTemplates').add({ ...data, tenantId, createdAt: ts, createdBy: authUser?.uid });
        showToast('Plantilla creada');
      }
      resetTemplateForm();
    } catch (err) {
      console.error('[ArchiFlow] Error saving form template:', err);
      showToast('Error al guardar', 'error');
    }
  }, [tmplName, tmplDesc, tmplIcon, tmplFields, editingTemplate, authUser, showToast, resetTemplateForm]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!(await confirm({ title: 'Eliminar plantilla', description: '¿Eliminar esta plantilla de formulario?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try {
      await getFirebase().firestore().collection('formTemplates').doc(id).delete();
      showToast('Plantilla eliminada');
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [showToast]);

  // Form filling
  const startFilling = useCallback((t: FormTemplate) => {
    setFillingTemplate(t);
    setFillProject('');
    setFillValues({});
    setFillPhotos({});
    setTab('fill');
  }, []);

  const saveFilledForm = useCallback(async () => {
    if (!fillingTemplate || !fillProject) { showToast('Selecciona un proyecto', 'error'); return; }
    // Validate required fields
    const missing = fillingTemplate.data.fields
      .filter(f => f.required && !fillValues[f.id] && fillValues[f.id] !== false)
      .map(f => f.label);
    if (missing.length > 0) { showToast(`Campos requeridos: ${missing.join(', ')}`, 'error'); return; }

    setSaving(true);
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const proj = projects.find((p: { id: string; data: { name: string } }) => p.id === fillProject);
      await db.collection('formInstances').add({
        templateId: fillingTemplate.id,
        templateName: fillingTemplate.data.name,
        projectId: fillProject,
        projectName: proj?.data?.name || 'Desconocido',
        status: 'Completada',
        values: fillValues,
        photos: Object.values(fillPhotos).filter(Boolean),
        filledBy: authUser?.uid,
        filledByName: getUserName(authUser?.uid || ''),
        completedAt: ts,
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('Formulario guardado');
      setFillingTemplate(null);
      setFillValues({});
      setFillPhotos({});
      setFillProject('');
      setTab('history');
    } catch (err) {
      console.error('[ArchiFlow] Error saving form instance:', err);
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [fillingTemplate, fillProject, fillValues, fillPhotos, projects, authUser, getUserName, showToast]);

  const renderFilledField = useCallback((field: FormField, value: unknown) => {
    const val = value as string | number | boolean | undefined;
    switch (field.type) {
      case 'checkbox': return val ? '✅ Sí' : '❌ No';
      case 'rating': return val ? `${'★'.repeat(Number(val))}${'☆'.repeat(5 - Number(val))}` : '—';
      case 'photo': return val ? '📷 Foto adjunta' : '—';
      case 'number': return val != null ? String(val) : '—';
      default: return val ? String(val) : '—';
    }
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--af-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <ClipboardList size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Generador de Formularios
          </h1>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] ml-[42px]">
          Crea formularios personalizados para inspecciones, checklists y auditorías
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 mb-6">
        {[
          { id: 'templates' as const, label: 'Plantillas', icon: <FileText size={14} /> },
          { id: 'fill' as const, label: 'Llenar Formulario', icon: <Pencil size={14} /> },
          { id: 'history' as const, label: 'Historial', icon: <Eye size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all flex-1 justify-center ${
              tab === t.id ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === TEMPLATES TAB === */}
      {tab === 'templates' && (
        <>
          {/* Template Editor */}
          <div className="card-elevated rounded-xl p-4 mb-6">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              {editingTemplate ? <Pencil size={14} /> : <Plus size={14} />}
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </h2>

            {/* Icon selector */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-[var(--muted-foreground)]">Icono:</span>
              <div className="flex gap-1 flex-wrap">
                {FORM_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setTmplIcon(icon)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer border transition-all ${
                      tmplIcon === icon
                        ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/10 shadow-sm'
                        : 'border-[var(--border)] hover:border-[var(--af-accent)]/30'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <input type="text" placeholder="Nombre del formulario..." value={tmplName} onChange={e => setTmplName(e.target.value)} className="text-[13px] skeuo-input px-3 py-2 w-full mb-2" />
            <input type="text" placeholder="Descripción (opcional)..." value={tmplDesc} onChange={e => setTmplDesc(e.target.value)} className="text-[13px] skeuo-input px-3 py-2 w-full mb-3" />

            {/* Fields */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-[var(--muted-foreground)]">Campos ({tmplFields.length})</span>
                <select
                  className="text-[11px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--foreground)] outline-none cursor-pointer"
                  value=""
                  onChange={e => {
                    if (e.target.value) {
                      setTmplFields([...tmplFields, { id: generateId(), type: e.target.value as FormField['type'], label: '', required: false }]);
                    }
                  }}
                >
                  <option value="">+ Agregar campo</option>
                  {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
                </select>
              </div>
              {tmplFields.map((field, i) => (
                <FieldEditor key={field.id} field={field} index={i} onUpdate={f => setTmplFields(tmplFields.map(x => x.id === f.id ? f : x))} onRemove={() => setTmplFields(tmplFields.filter(x => x.id !== field.id))} />
              ))}
              {tmplFields.length === 0 && (
                <div className="text-center py-6 text-[var(--af-text3)] text-[12px]">
                  Agrega campos para crear tu formulario
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors">
                <Save size={14} /> {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
              </button>
              {editingTemplate && (
                <button onClick={resetTemplateForm} className="px-4 py-2 rounded-lg text-[13px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer">
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Template List */}
          <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">Plantillas existentes ({templates.length})</h2>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-[13px]">No hay plantillas creadas</div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="card-glass-subtle rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">{t.data.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--foreground)]">{t.data.name}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      {t.data.fields.length} campos · {t.data.description || 'Sin descripción'}
                    </div>
                  </div>
                  <button onClick={() => startFilling(t)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 transition-colors">
                    <Pencil size={11} /> Llenar
                  </button>
                  <button onClick={() => openEditTemplate(t)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg skeuo-btn text-[var(--muted-foreground)] cursor-pointer">
                    <Pencil size={11} /> Editar
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-none">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === FILL TAB === */}
      {tab === 'fill' && (
        <>
          {!fillingTemplate ? (
            <div className="text-center py-12 text-[var(--af-text3)]">
              <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Selecciona una plantilla para llenar</p>
              <p className="text-[12px]">Ve a la pestaña &quot;Plantillas&quot; y haz clic en &quot;Llenar&quot;</p>
            </div>
          ) : (
            <div className="card-elevated rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{fillingTemplate.data.icon}</span>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{fillingTemplate.data.name}</h2>
                  <p className="text-[11px] text-[var(--muted-foreground)]">{fillingTemplate.data.description}</p>
                </div>
              </div>

              {/* Project selector */}
              <div className="mb-4">
                <label className="text-[12px] text-[var(--muted-foreground)] mb-1 block">Proyecto *</label>
                <select
                  className="w-full text-[13px] skeuo-input px-3 py-2 cursor-pointer"
                  value={fillProject}
                  onChange={e => setFillProject(e.target.value)}
                >
                  <option value="">Seleccionar proyecto...</option>
                  {projects.map((p: { id: string; data: { name: string } }) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
                </select>
              </div>

              {/* Fields */}
              {fillingTemplate.data.fields.map(field => (
                <div key={field.id} className="mb-3">
                  <label className="text-[12px] text-[var(--foreground)] mb-1 block font-medium">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input type="text" className="w-full text-[13px] skeuo-input px-3 py-2" placeholder="..." value={String(fillValues[field.id] || '')} onChange={e => setFillValues({ ...fillValues, [field.id]: e.target.value })} />
                  )}
                  {field.type === 'textarea' && (
                    <textarea className="w-full text-[13px] skeuo-input px-3 py-2 min-h-[80px] resize-y" placeholder="..." value={String(fillValues[field.id] || '')} onChange={e => setFillValues({ ...fillValues, [field.id]: e.target.value })} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" className="w-full text-[13px] skeuo-input px-3 py-2" placeholder="0" value={String(fillValues[field.id] || '')} onChange={e => setFillValues({ ...fillValues, [field.id]: Number(e.target.value) || 0 })} />
                  )}
                  {field.type === 'select' && (
                    <select className="w-full text-[13px] skeuo-input px-3 py-2 cursor-pointer" value={String(fillValues[field.id] || '')} onChange={e => setFillValues({ ...fillValues, [field.id]: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!fillValues[field.id]} onChange={e => setFillValues({ ...fillValues, [field.id]: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-[13px] text-[var(--foreground)]">{fillValues[field.id] ? 'Sí' : 'No'}</span>
                    </label>
                  )}
                  {field.type === 'date' && (
                    <input type="date" className="w-full text-[13px] skeuo-input px-3 py-2" value={String(fillValues[field.id] || '')} onChange={e => setFillValues({ ...fillValues, [field.id]: e.target.value })} />
                  )}
                  {field.type === 'rating' && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setFillValues({ ...fillValues, [field.id]: star })} className="text-2xl cursor-pointer bg-transparent border-none transition-transform hover:scale-110" style={{ color: (fillValues[field.id] as number) >= star ? '#f59e0b' : 'var(--af-bg4)' }}>
                          ★
                        </button>
                      ))}
                    </div>
                  )}
                  {field.type === 'photo' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setFillPhotos({ ...fillPhotos, [field.id]: reader.result as string });
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id={`photo-${field.id}`}
                      />
                      <label htmlFor={`photo-${field.id}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer">
                        <Camera size={14} /> Tomar foto
                      </label>
                      {fillPhotos[field.id] && <span className="text-[11px] text-emerald-400">✅ Foto cargada</span>}
                    </div>
                  )}
                </div>
              ))}

              {/* Save */}
              <button onClick={saveFilledForm} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-50 mt-4">
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Formulario'}
              </button>
            </div>
          )}
        </>
      )}

      {/* === HISTORY TAB === */}
      {tab === 'history' && (
        <>
          {viewingInstance ? (
            <div className="card-elevated rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{viewingInstance.data.templateName}</h2>
                <button onClick={() => setViewingInstance(null)} className="px-3 py-1.5 rounded-lg text-[12px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer">
                  ← Volver
                </button>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)] mb-4">
                <span>📁 {viewingInstance.data.projectName}</span>
                <span>·</span>
                <span>👤 {viewingInstance.data.filledByName}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${viewingInstance.data.status === 'Completada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {viewingInstance.data.status}
                </span>
              </div>
              <div className="space-y-3">
                {(templates.find(t => t.id === viewingInstance.data.templateId)?.data.fields || []).map(field => (
                  <div key={field.id} className="p-3 rounded-lg bg-[var(--af-bg2)]">
                    <div className="text-[11px] text-[var(--muted-foreground)] mb-1">{field.label}</div>
                    <div className="text-[13px] text-[var(--foreground)] font-medium">{renderFilledField(field, viewingInstance.data.values[field.id])}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">Formularios completados ({instances.length})</h2>
              {instances.length === 0 ? (
                <div className="text-center py-8 text-[var(--af-text3)] text-[13px]">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
                  No hay formularios completados aún
                </div>
              ) : (
                <div className="space-y-2">
                  {instances.map(inst => (
                    <div key={inst.id} className="card-glass-subtle rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--af-bg3)] transition-colors" onClick={() => setViewingInstance(inst)}>
                      <span className="text-lg">📋</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--foreground)]">{inst.data.templateName}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          📁 {inst.data.projectName} · 👤 {inst.data.filledByName}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inst.data.status === 'Completada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {inst.data.status}
                      </span>
                      <Eye size={14} className="text-[var(--af-text3)]" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
