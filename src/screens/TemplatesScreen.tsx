'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, Edit3, Layout, ArrowRight } from 'lucide-react';
import type { ProjectTemplate } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

interface TemplatePhase {
  id: string;
  name: string;
  tasks: string[];
}

interface CustomTemplate extends ProjectTemplate {
  phasesData: TemplatePhase[];
  isBuiltIn?: boolean;
}

const ICON_OPTIONS = ['🏠', '🏢', '🏗️', '🔨', '📐', '🏠', '🏬', '✨', '🌍', '📐'];

/* ===== BUILT-IN TEMPLATES ===== */

const BUILT_IN_TEMPLATES: CustomTemplate[] = [
  {
    id: 'residencial',
    name: 'Residencial',
    icon: '🏠',
    description: 'Plantilla para proyectos de vivienda residencial con fases completas de construcción',
    phases: ['Planos', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: ['Diseño arquitectónico', 'Estudio de suelos', 'Licencias', 'Cimentación', 'Muros estructurales', 'Cubierta', 'Instalación eléctrica', 'Instalación hidráulica', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura', 'Entrega final'],
    phasesData: [
      { id: 'p1', name: 'Planos', tasks: ['Diseño arquitectónico', 'Diseño estructural', 'Estudio de suelos', 'Licencias y permisos'] },
      { id: 'p2', name: 'Cimentación', tasks: ['Excavación', 'Zapatas', 'Vigas de cimentación', 'Losa de entrepiso'] },
      { id: 'p3', name: 'Estructura', tasks: ['Muros estructurales', 'Columnas', 'Vigas', 'Cubierta'] },
      { id: 'p4', name: 'Instalaciones', tasks: ['Instalación eléctrica', 'Instalación hidráulica', 'Instalación sanitaria', 'Gas'] },
      { id: 'p5', name: 'Acabados', tasks: ['Muros divisorios', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura', 'Instalaciones finales'] },
      { id: 'p6', name: 'Entrega', tasks: ['Limpieza final', 'Pruebas de instalaciones', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'comercial',
    name: 'Comercial',
    icon: '🏢',
    description: 'Plantilla para proyectos de construcción comercial, oficinas y locales',
    phases: ['Diseño', 'Permisos', 'Obra Civil', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: ['Estudio de mercado', 'Diseño comercial', 'Obra civil', 'Instalaciones técnicas', 'Acabados comerciales', 'Señalización', 'Entrega'],
    phasesData: [
      { id: 'c1', name: 'Diseño', tasks: ['Estudio de mercado', 'Diseño arquitectónico', 'Diseño de interiores'] },
      { id: 'c2', name: 'Permisos', tasks: ['Licencia de construcción', 'Estudios ambientales', 'Aprobación de planos'] },
      { id: 'c3', name: 'Obra Civil', tasks: ['Cimentación', 'Estructura', 'Cerramientos', 'Cubierta'] },
      { id: 'c4', name: 'Instalaciones', tasks: ['Eléctrica', 'Hidráulica', 'HVAC', 'Incendio'] },
      { id: 'c5', name: 'Acabados', tasks: ['Pisos', 'Techos falsos', 'Vidriería', 'Carpintería', 'Pintura'] },
      { id: 'c6', name: 'Entrega', tasks: ['Señalización', 'Limpieza', 'Pruebas', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'remodelacion',
    name: 'Remodelación',
    icon: '🔨',
    description: 'Plantilla para proyectos de remodelación y renovación de espacios existentes',
    phases: ['Diagnóstico', 'Diseño', 'Demolición', 'Reconstrucción', 'Acabados', 'Entrega'],
    tasks: ['Inspección inicial', 'Diseño de remodelación', 'Demolición selectiva', 'Reparaciones', 'Nuevas instalaciones', 'Acabados', 'Entrega'],
    phasesData: [
      { id: 'r1', name: 'Diagnóstico', tasks: ['Inspección inicial', 'Levantamiento', 'Diagnóstico estructural'] },
      { id: 'r2', name: 'Diseño', tasks: ['Diseño de remodelación', 'Presupuesto', 'Materiales'] },
      { id: 'r3', name: 'Demolición', tasks: ['Demolición selectiva', 'Retiro de escombros', 'Limpieza'] },
      { id: 'r4', name: 'Reconstrucción', tasks: ['Reparaciones estructurales', 'Nuevos muros', 'Modificaciones'] },
      { id: 'r5', name: 'Acabados', tasks: ['Instalaciones', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura'] },
      { id: 'r6', name: 'Entrega', tasks: ['Limpieza final', 'Pruebas', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'obra-nueva',
    name: 'Obra Nueva',
    icon: '🏗️',
    description: 'Plantilla completa para construcción de obra nueva desde cero',
    phases: ['Planeación', 'Diseño', 'Licencias', 'Preparación', 'Construcción', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: ['Estudio del terreno', 'Diseño completo', 'Permisos', 'Movimiento de tierras', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Paisajismo', 'Entrega'],
    phasesData: [
      { id: 'n1', name: 'Planeación', tasks: ['Estudio del terreno', 'Topografía', 'Análisis ambiental', 'Presupuesto'] },
      { id: 'n2', name: 'Diseño', tasks: ['Diseño arquitectónico', 'Diseño estructural', 'Diseño de instalaciones', 'Modelado 3D'] },
      { id: 'n3', name: 'Licencias', tasks: ['Licencia de construcción', 'Planos aprobados', 'Permisos ambientales'] },
      { id: 'n4', name: 'Preparación', tasks: ['Limpieza del terreno', 'Movimiento de tierras', 'Campamento de obra', 'Vallas'] },
      { id: 'n5', name: 'Construcción', tasks: ['Cimentación', 'Estructura', 'Muros', 'Cubierta', 'Escaleras'] },
      { id: 'n6', name: 'Instalaciones', tasks: ['Eléctrica', 'Hidráulica', 'Sanitaria', 'Gas', 'Telecomunicaciones'] },
      { id: 'n7', name: 'Acabados', tasks: ['Pisos', 'Paredes', 'Carpintería', 'Herrería', 'Pintura'] },
      { id: 'n8', name: 'Entrega', tasks: ['Paisajismo', 'Limpieza', 'Pruebas', 'Documentación', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
];

const emptyPhase = (): TemplatePhase => ({
  id: `phase-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '',
  tasks: [''],
});

export default function TemplatesScreen() {
  const ui = useUI();
  const auth = useAuth();
  const { showToast } = ui;

  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [tab, setTab] = useState<'gallery' | 'preview' | 'editor'>('gallery');
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);

  // Editor form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('🏠');
  const [formDescription, setFormDescription] = useState('');
  const [formPhases, setFormPhases] = useState<TemplatePhase[]>([emptyPhase()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load custom templates from Firestore
  useEffect(() => {
    const db = getFirebase().firestore();
    const unsub = db.collection('projectTemplates').onSnapshot((snap: QuerySnapshot) => {
      const docs = snapToDocs(snap);
      const parsed = docs.map((d) => ({
        ...d.data,
        id: d.id,
        isBuiltIn: false,
        phasesData: d.data.phasesData || [],
      })) as CustomTemplate[];
      setCustomTemplates(parsed);
    }, (err: Error) => console.error('[ArchiFlow] Templates: listen error:', err));
    return () => unsub();
  }, []);

  const allTemplates = useMemo(() => {
    return [...BUILT_IN_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const totalTasks = (template: CustomTemplate) => {
    const phaseTasks = template.phasesData?.reduce((s, p) => s + (p.tasks?.length || 0), 0) || 0;
    return phaseTasks || template.tasks?.length || 0;
  };

  const phaseCount = (template: CustomTemplate) => {
    return template.phasesData?.length || template.phases?.length || 0;
  };

  // Open preview
  const openPreview = (template: CustomTemplate) => {
    setSelectedTemplate(template);
    setTab('preview');
  };

  // Create project from template
  const createProjectFromTemplate = (template: CustomTemplate) => {
    showToast('Navegando a crear proyecto con plantilla...', 'info');
    // Use UI context to navigate to projects with template data
    ui.setForms((prev: Record<string, any>) => ({
      ...prev,
      projTemplate: template.id,
      projTemplateName: template.name,
      projTemplatePhases: template.phasesData?.map(p => ({ name: p.name, tasks: p.tasks })) || template.phases,
    }));
    ui.navigateTo('projects');
  };

  // Open editor for new template
  const openEditor = (template?: CustomTemplate) => {
    if (template) {
      setEditingId(template.id);
      setFormName(template.name);
      setFormIcon(template.icon);
      setFormDescription(template.description);
      setFormPhases(template.phasesData?.length ? template.phasesData.map(p => ({ ...p })) : [emptyPhase()]);
    } else {
      setEditingId(null);
      setFormName('');
      setFormIcon('🏠');
      setFormDescription('');
      setFormPhases([emptyPhase()]);
    }
    setTab('editor');
  };

  // Save custom template
  const saveTemplate = async () => {
    if (!formName.trim()) { showToast('Ingresa un nombre', 'error'); return; }
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const phases = formPhases.filter(p => p.name.trim());
      const allTasks = phases.flatMap(p => p.tasks.filter(t => t.trim()));

      const data: Record<string, any> = {
        name: formName.trim(),
        icon: formIcon,
        description: formDescription,
        phases: phases.map(p => p.name),
        tasks: allTasks,
        phasesData: phases.map(p => ({ id: p.id, name: p.name, tasks: p.tasks })),
        updatedAt: ts,
      };

      if (editingId) {
        await db.collection('projectTemplates').doc(editingId).update(data);
        showToast('Plantilla actualizada');
      } else {
        data.createdAt = ts;
        data.createdBy = auth.authUser?.uid || '';
        await db.collection('projectTemplates').add(data);
        showToast('✅ Plantilla creada');
      }
      setTab('gallery');
    } catch (err) {
      console.error('[ArchiFlow] Templates: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  // Delete custom template
  const deleteTemplate = async (id: string) => {
    try {
      await getFirebase().firestore().collection('projectTemplates').doc(id).delete();
      showToast('Plantilla eliminada');
      if (selectedTemplate?.id === id) { setSelectedTemplate(null); setTab('gallery'); }
    } catch (err) {
      console.error('[ArchiFlow] Templates: delete error:', err);
    }
  };

  // Phase/task management
  const updatePhaseName = (idx: number, name: string) => {
    setFormPhases(prev => prev.map((p, i) => i === idx ? { ...p, name } : p));
  };

  const updatePhaseTask = (phaseIdx: number, taskIdx: number, value: string) => {
    setFormPhases(prev => prev.map((p, i) => {
      if (i !== phaseIdx) return p;
      const tasks = [...p.tasks];
      tasks[taskIdx] = value;
      return { ...p, tasks };
    }));
  };

  const addPhaseTask = (phaseIdx: number) => {
    setFormPhases(prev => prev.map((p, i) => {
      if (i !== phaseIdx) return p;
      return { ...p, tasks: [...p.tasks, ''] };
    }));
  };

  const removePhaseTask = (phaseIdx: number, taskIdx: number) => {
    setFormPhases(prev => prev.map((p, i) => {
      if (i !== phaseIdx) return p;
      return { ...p, tasks: p.tasks.filter((_, j) => j !== taskIdx) };
    }));
  };

  const addPhase = () => setFormPhases(prev => [...prev, emptyPhase()]);
  const removePhase = (idx: number) => setFormPhases(prev => prev.filter((_, i) => i !== idx));

  // ===== PREVIEW VIEW =====
  if (tab === 'preview' && selectedTemplate) {
    const phases = selectedTemplate.phasesData?.length ? selectedTemplate.phasesData : [];
    return (
      <div className="animate-fadeIn space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setTab('gallery')}>← Volver</button>
            <h3 className="text-[15px] font-semibold">{selectedTemplate.icon} {selectedTemplate.name}</h3>
          </div>
          {!selectedTemplate.isBuiltIn && (
            <div className="flex gap-2">
              <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80" onClick={() => openEditor(selectedTemplate)}>
                <Edit3 size={14} />
              </button>
              <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80" onClick={() => deleteTemplate(selectedTemplate.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Template info */}
        <div className="card-elevated rounded-xl p-4">
          <p className="text-sm text-[var(--muted-foreground)]">{selectedTemplate.description}</p>
          <div className="flex gap-4 mt-2 text-[11px] text-[var(--af-text3)]">
            <span>{phaseCount(selectedTemplate)} fases</span>
            <span>{totalTasks(selectedTemplate)} tareas</span>
          </div>
        </div>

        {/* Phases list */}
        <div className="space-y-2">
          {phases.map((phase, idx) => (
            <div key={phase.id || idx} className="card-glass-subtle rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[var(--af-accent)]/10 flex items-center justify-center text-[11px] font-bold text-[var(--af-accent)]">{idx + 1}</div>
                <span className="text-[13px] font-semibold">{phase.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--skeuo-raised)] text-[var(--muted-foreground)]">{phase.tasks.length} tareas</span>
              </div>
              <div className="space-y-1 pl-8">
                {phase.tasks.map((task, ti) => (
                  <div key={ti} className="text-[12px] text-[var(--muted-foreground)] flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[var(--af-accent)] shrink-0" />
                    {task}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Create project button */}
        <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center justify-center gap-2" onClick={() => createProjectFromTemplate(selectedTemplate)}>
          <Layout size={16} /> Crear Proyecto con esta Plantilla
        </button>
      </div>
    );
  }

  // ===== EDITOR VIEW =====
  if (tab === 'editor') {
    return (
      <div className="animate-fadeIn space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{editingId ? 'Editar Plantilla' : 'Nueva Plantilla Personalizada'}</h3>
          <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setTab('gallery')}>← Volver</button>
        </div>

        <div className="card-elevated rounded-xl p-4 space-y-4">
          {/* Name, Icon, Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Nombre de la plantilla *" value={formName} onChange={e => setFormName(e.target.value)} />
            <div className="flex gap-2">
              <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none flex-1" value={formIcon} onChange={e => setFormIcon(e.target.value)}>
                {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
              <span className="text-2xl self-center">{formIcon}</span>
            </div>
            <input className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Descripción" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
          </div>

          {/* Phases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">Fases y Tareas</span>
              <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={addPhase}>+ Agregar fase</button>
            </div>

            {formPhases.map((phase, phaseIdx) => (
              <div key={phase.id} className="bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--af-accent)]/10 flex items-center justify-center text-[11px] font-bold text-[var(--af-accent)]">{phaseIdx + 1}</div>
                  <input className="flex-1 skeuo-input px-2 py-1.5 text-sm font-semibold outline-none bg-transparent border-none" placeholder="Nombre de la fase" value={phase.name} onChange={e => updatePhaseName(phaseIdx, e.target.value)} />
                  {formPhases.length > 1 && (
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] text-[var(--af-red)] cursor-pointer shrink-0" onClick={() => removePhase(phaseIdx)}>✕</button>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1 pl-8">
                  {phase.tasks.map((task, taskIdx) => (
                    <div key={taskIdx} className="flex gap-2 items-center">
                      <div className="w-1 h-1 rounded-full bg-[var(--af-accent)] shrink-0" />
                      <input className="flex-1 skeuo-input px-2 py-1 text-xs outline-none bg-transparent border-none" placeholder={`Tarea ${taskIdx + 1}`} value={task} onChange={e => updatePhaseTask(phaseIdx, taskIdx, e.target.value)} />
                      {phase.tasks.length > 1 && (
                        <button className="text-[10px] text-[var(--af-red)] cursor-pointer hover:opacity-80 shrink-0" onClick={() => removePhaseTask(phaseIdx, taskIdx)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="text-[11px] text-[var(--af-blue)] cursor-pointer hover:underline ml-2" onClick={() => addPhaseTask(phaseIdx)}>+ Agregar tarea</button>
                </div>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex gap-3">
            <button className="skeuo-btn flex-1 bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveTemplate}>
              {editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
            </button>
            <button className="skeuo-btn px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--skeuo-raised)] transition-colors" onClick={() => setTab('gallery')}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== GALLERY VIEW =====
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="card-elevated rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold mb-1">Plantillas de Proyecto</div>
            <div className="text-sm text-[var(--muted-foreground)]">Inicia tu proyecto con una plantilla predefinida o crea la tuya</div>
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => openEditor()}>
            <Plus size={16} /> Plantilla Personalizada
          </button>
        </div>
      </div>

      {/* Built-in templates */}
      <div className="space-y-3">
        <div className="text-[13px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Plantillas Incluidas</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUILT_IN_TEMPLATES.map(template => (
            <div key={template.id} className="card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all group" onClick={() => openPreview(template)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center text-2xl group-hover:bg-[var(--af-accent)]/20 transition-colors">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{template.name}</div>
                  <div className="flex gap-2 text-[10px] text-[var(--af-text3)]">
                    <span>{phaseCount(template)} fases</span>
                    <span>·</span>
                    <span>{totalTasks(template)} tareas</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{template.description}</p>
              <div className="flex items-center justify-end mt-3 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline flex items-center gap-1" onClick={() => createProjectFromTemplate(template)}>
                  Crear proyecto <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Mis Plantillas</div>
          <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={() => openEditor()}>+ Crear nueva</button>
        </div>

        {customTemplates.length === 0 ? (
          <EmptyState
            illustration="generic"
            title="Sin plantillas personalizadas"
            description="Crea plantillas personalizadas para iniciar proyectos más rápido con tus fases y tareas habituales"
            action={{ label: 'Crear Plantilla', onClick: () => openEditor() }}
            compact
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {customTemplates.map(template => (
              <div key={template.id} className="card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all group" onClick={() => openPreview(template)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center text-2xl group-hover:bg-[var(--af-accent)]/20 transition-colors">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{template.name}</div>
                    <div className="flex gap-2 text-[10px] text-[var(--af-text3)]">
                      <span>{phaseCount(template)} fases</span>
                      <span>·</span>
                      <span>{totalTasks(template)} tareas</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{template.description}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80" onClick={() => openEditor(template)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80" onClick={() => deleteTemplate(template.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline flex items-center gap-1" onClick={() => createProjectFromTemplate(template)}>
                    Crear proyecto <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
