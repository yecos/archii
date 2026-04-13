'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getInitials, avatarColor } from '@/lib/helpers';
import { getFirebase } from '@/lib/firebase-service';
import { DEFAULT_PHASES } from '@/lib/types';
import {
  Plus, X, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, BarChart3, ClipboardCheck,
  Filter, Download, Wrench, HardHat, Paintbrush, Zap, FileText, ShieldCheck,
} from 'lucide-react';
import { exportChecklistPDF } from '@/lib/export-pdf';

// Default checklist items per construction phase
const PHASE_CHECKLISTS: Record<string, { items: string[]; icon: string }> = {
  'Planos': {
    icon: '📐',
    items: [
      'Plano arquitectonico aprobado',
      'Plano estructural revisado',
      'Planos de instalaciones electricas',
      'Planos hidraulicos y sanitarios',
      'Planos de gas natural',
      'Calculos estructurales firmados',
      'Licencia de construccion vigente',
      'Estudio de suelos aprobado',
      'Reglamento de propiedad horizontal',
      'Manual de obra entregado al contratista',
    ],
  },
  'Cimentacion': {
    icon: '🏗️',
    items: [
      'Limpieza y nivelacion del terreno',
      'Trazado y replanteo verificado',
      'Excavacion segun estudio de suelos',
      'Pedestalado y mejora de suelo',
      'Encofrado de zapatas y columnas',
      'Armado de refuerzo (segun planos)',
      'Vaciado de concreto en zapatas',
      'Vaciado de concreto en vigas de cimentacion',
      'Pruebas de resistencia del concreto',
      'Relleno compactado alrededor de cimentacion',
    ],
  },
  'Estructura': {
    icon: '🔩',
    items: [
      'Encofrado de columnas',
      'Armado de acero en columnas',
      'Vaciado de concreto en columnas',
      'Encofrado de vigas',
      'Armado de acero en vigas',
      'Vaciado de concreto en vigas',
      'Encofrado de losa',
      'Armado de malla electrosoldada',
      'Vaciado de losa aligerada',
      'Descimbre y curado del concreto',
    ],
  },
  'Instalaciones': {
    icon: '⚡',
    items: [
      'Instalacion electrica - canalizacion',
      'Tuberia hidraulica sanitaria',
      'Tuberia gas natural (si aplica)',
      'Puntos de red y telecomunicaciones',
      'Instalacion de A/C - ductos',
      'Sistema de ventilacion mecanica',
      'Prueba hidraulica de tuberias',
      'Prueba electrica de circuitos',
      'Instalacion de aparatos sanitarios',
      'Tablero electrico principal',
    ],
  },
  'Acabados': {
    icon: '🎨',
    items: [
      'Muros de division en bloque/tabla',
      'Aplanado y pañetado de muros',
      'Enlucado fino de muros',
      'Impermeabilizacion en areas humedas',
      'Pisos ceramicos/porcelanato',
      'Instalacion de carpinteria',
      'Pintura de muros y cielos rasos',
      'Instalacion de griferia y accesorios',
      'Instalacion de closet y cocinas',
      'Limpieza final de acabados',
    ],
  },
  'Entrega': {
    icon: '🏠',
    items: [
      'Pruebas funcionales de todas las instalaciones',
      'Verificacion de acabados contra planos',
      'Limpieza general profunda',
      'Entrega de manuales y garantias',
      'Acta de entrega finalizada',
      'Paz y salvos de impuestos',
      'Certificado de habitabilidad',
      'Registro de propietarios',
      'Entrega de llaves',
      'Garantia de obra firmada',
    ],
  },
};

interface ChecklistEntry {
  id: string;
  projectId: string;
  phaseName: string;
  itemName: string;
  checked: boolean;
  checkedBy?: string;
  checkedAt?: any;
  notes?: string;
  createdBy: string;
  createdAt: any;
}

export default function ChecklistsScreen() {
  const { projects, authUser, teamUsers, getUserName, showToast, loading, setSelectedProjectId, navigateTo } = useApp();

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [filterPhase, setFilterPhase] = useState('');

  // Load entries from Firestore
  React.useEffect(() => {
    if (!authUser || !selectedProject) return;
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();

    const unsub = db.collection('phaseChecklists')
      .where('projectId', '==', selectedProject)
      .onSnapshot(snap => {
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChecklistEntry[];
        setEntries(loaded);
      }, err => console.error(err));

    return () => unsub();
  }, [authUser, selectedProject]);

  // Toggle checklist item
  const toggleItem = useCallback(async (entry: ChecklistEntry) => {
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();
    try {
      await db.collection('phaseChecklists').doc(entry.id).update({
        checked: !entry.checked,
        checkedBy: !entry.checked ? authUser?.uid : null,
        checkedAt: !entry.checked ? fb.firestore.FieldValue.serverTimestamp() : null,
      });
    } catch { showToast('Error', 'error'); }
  }, [authUser, showToast]);

  // Initialize phase checklists for a project
  const initPhaseChecklist = useCallback(async (phaseName: string) => {
    const fb = getFirebase();
    if (!fb || !selectedProject) return;
    const db = fb.firestore();
    const batch = db.batch();
    const colRef = db.collection('phaseChecklists');

    const existing = entries.filter(e => e.phaseName === phaseName).map(e => e.itemName);
    const defaultItems = PHASE_CHECKLISTS[phaseName]?.items || [];

    for (const item of defaultItems) {
      if (existing.includes(item)) continue;
      const ref = colRef.doc();
      batch.set(ref, {
        projectId: selectedProject,
        phaseName,
        itemName: item,
        checked: false,
        checkedBy: null,
        checkedAt: null,
        notes: '',
        createdBy: authUser?.uid,
        createdAt: fb.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      showToast(`Checklist de ${phaseName} inicializado`);
      setExpandedPhases(prev => new Set(prev).add(phaseName));
    } catch { showToast('Error al inicializar', 'error'); }
  }, [selectedProject, entries, authUser, showToast]);

  // Save note
  const saveNote = useCallback(async (entryId: string) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('phaseChecklists').doc(entryId).update({ notes: noteText });
      setNoteEditing(null);
      setNoteText('');
      showToast('Nota guardada');
    } catch { showToast('Error', 'error'); }
  }, [noteText, showToast]);

  const togglePhaseExpanded = (phase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  // Project phases (merge DEFAULT_PHASES with project-specific)
  const projectPhases = useMemo(() => {
    if (!selectedProject) return DEFAULT_PHASES;
    return DEFAULT_PHASES;
  }, [selectedProject]);

  // Group entries by phase
  const entriesByPhase = useMemo(() => {
    const grouped: Record<string, ChecklistEntry[]> = {};
    entries.forEach(e => {
      if (!grouped[e.phaseName]) grouped[e.phaseName] = [];
      grouped[e.phaseName].push(e);
    });
    return grouped;
  }, [entries]);

  // Phase progress
  const phaseProgress = useMemo(() => {
    const progress: Record<string, { total: number; checked: number; pct: number }> = {};
    projectPhases.forEach(phase => {
      const phaseEntries = entriesByPhase[phase] || [];
      const total = phaseEntries.length;
      const checked = phaseEntries.filter(e => e.checked).length;
      progress[phase] = { total, checked, pct: total > 0 ? Math.round((checked / total) * 100) : 0 };
    });
    return progress;
  }, [projectPhases, entriesByPhase]);

  // Overall progress
  const overallProgress = useMemo(() => {
    const total = entries.length;
    const checked = entries.filter(e => e.checked).length;
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  }, [entries]);

  const displayPhases = filterPhase ? projectPhases.filter(p => p === filterPhase) : projectPhases;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold mb-1 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-[var(--af-accent)]" />
              Checklists de Obra
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">v2.0</span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">Control de calidad por fase de construccion</div>
          </div>
          {selectedProject && entries.length > 0 && (
            <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
              onClick={() => {
                try {
                  exportChecklistPDF({ projectId: selectedProject, projectName: projects.find((p: any) => p.id === selectedProject)?.data?.name || '', entries, phaseProgress, teamUsers, getUserName });
                  showToast('Checklist PDF descargado');
                } catch { showToast('Error', 'error'); }
              }}>
              <FileText size={14} /> Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* Project selector */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-3">Seleccionar Proyecto</div>
        {projects.filter((p: any) => p.data.status !== 'Terminado').length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)]">
            <div className="text-3xl mb-2">🏗️</div>
            <div className="text-sm">Sin proyectos activos</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.filter((p: any) => p.data.status !== 'Terminado').map((p: any) => {
              const isSelected = selectedProject === p.id;
              const projEntries = entries.filter(e => e.projectId === p.id);
              const projChecked = projEntries.filter(e => e.checked).length;
              const projPct = projEntries.length > 0 ? Math.round((projChecked / projEntries.length) * 100) : 0;
              return (
                <div key={p.id}
                  className={`bg-[var(--af-bg3)] border rounded-xl p-4 cursor-pointer transition-all ${isSelected ? 'border-[var(--af-accent)] ring-1 ring-[var(--af-accent)]/20' : 'border-[var(--border)] hover:border-[var(--af-accent)]/40'}`}
                  onClick={() => setSelectedProject(isSelected ? '' : p.id)}
                >
                  <div className="text-sm font-semibold truncate mb-1">{p.data.name}</div>
                  <div className="text-[10px] text-[var(--af-text3)] mb-2">{p.data.client && p.data.location ? `${p.data.client} · ${p.data.location}` : p.data.client || p.data.location || ''}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--af-accent)] transition-all" style={{ width: `${projPct}%` }} />
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{projPct}%</span>
                  </div>
                  <div className="text-[10px] text-[var(--af-text3)] mt-1">{projChecked}/{projEntries.length} items</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase checklists */}
      {selectedProject && (
        <>
          {/* Overall progress */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-semibold flex items-center gap-2">
                <BarChart3 size={16} className="text-[var(--af-accent)]" />
                Progreso General
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${overallProgress >= 80 ? 'text-emerald-400' : overallProgress >= 50 ? 'text-amber-400' : 'text-[var(--af-accent)]'}`}>
                  {overallProgress}%
                </span>
                <button
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${showCompleted ? 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? <><CheckCircle2 size={11} /> Ocultar completados</> : <><Circle size={11} /> Mostrar completados</>}
                </button>
              </div>
            </div>
            <div className="h-3 bg-[var(--af-bg4)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${overallProgress >= 80 ? 'bg-emerald-500' : overallProgress >= 50 ? 'bg-amber-500' : 'bg-[var(--af-accent)]'}`} style={{ width: `${overallProgress}%` }} />
            </div>
            {/* Phase progress bars */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {projectPhases.map(phase => {
                const prog = phaseProgress[phase];
                const info = PHASE_CHECKLISTS[phase];
                if (!prog) return null;
                return (
                  <div key={phase} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--af-bg3)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => togglePhaseExpanded(phase)}>
                    <span className="text-sm">{info?.icon || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{phase}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, backgroundColor: prog.pct >= 100 ? '#10b981' : prog.pct > 0 ? '#c8a96e' : 'var(--af-bg4)' }} />
                        </div>
                        <span className="text-[9px] text-[var(--muted-foreground)]">{prog.pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable phase sections */}
          <div className="space-y-3">
            {displayPhases.map(phase => {
              const phaseEntries = (entriesByPhase[phase] || []).filter(e => showCompleted || !e.checked);
              const prog = phaseProgress[phase];
              const info = PHASE_CHECKLISTS[phase];
              const isExpanded = expandedPhases.has(phase);
              const hasEntries = (entriesByPhase[phase] || []).length > 0;

              return (
                <div key={phase} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                  {/* Phase header */}
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--af-bg3)] transition-colors" onClick={() => togglePhaseExpanded(phase)}>
                    <span className="text-xl">{info?.icon || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">{phase}</span>
                        {prog && prog.pct === 100 && prog.total > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-0.5">
                            <ShieldCheck size={9} /> Completa
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        {prog ? `${prog.checked} de ${prog.total} items` : 'Sin inicializar'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {prog && prog.total > 0 && (
                        <div className="w-16 h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, backgroundColor: prog.pct >= 100 ? '#10b981' : '#c8a96e' }} />
                        </div>
                      )}
                      {!hasEntries && (
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 transition-colors border-none" onClick={(e) => { e.stopPropagation(); initPhaseChecklist(phase); }}>
                          <Plus size={12} /> Inicializar
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-[var(--af-text3)]" /> : <ChevronDown size={16} className="text-[var(--af-text3)]" />}
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && hasEntries && (
                    <div className="border-t border-[var(--border)] p-4 pt-2 space-y-1 animate-fadeIn">
                      {phaseEntries.length === 0 && (
                        <div className="text-center py-4 text-[var(--af-text3)] text-[12px]">
                          {!showCompleted ? 'Todos los items completados' : 'Sin items'}
                        </div>
                      )}
                      {phaseEntries.map(entry => {
                        const checker = entry.checkedBy ? getUserName(entry.checkedBy) : '';
                        return (
                          <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--af-bg3)] transition-colors group">
                            <button
                              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-all border-none ${entry.checked ? 'bg-emerald-500' : 'bg-transparent border-2 border-[var(--input)] hover:border-[var(--af-accent)]'}`}
                              onClick={() => toggleItem(entry)}
                            >
                              {entry.checked && <CheckCircle2 size={14} className="text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] leading-snug ${entry.checked ? 'line-through text-[var(--af-text3)]' : ''}`}>
                                {entry.itemName}
                              </div>
                              {entry.checked && checker && (
                                <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 size={9} /> Verificado por {checker}
                                </div>
                              )}
                              {/* Notes */}
                              {noteEditing === entry.id ? (
                                <div className="mt-1.5 flex gap-1.5">
                                  <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote(entry.id)}
                                    className="flex-1 text-[11px] bg-[var(--af-bg3)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)] outline-none" placeholder="Agregar nota..." />
                                  <button className="text-[10px] px-2 py-1 rounded bg-[var(--af-accent)] text-background cursor-pointer border-none" onClick={() => saveNote(entry.id)}>Guardar</button>
                                  <button className="text-[10px] px-2 py-1 rounded bg-[var(--af-bg4)] cursor-pointer border-none text-[var(--muted-foreground)]" onClick={() => { setNoteEditing(null); setNoteText(''); }}>X</button>
                                </div>
                              ) : (
                                entry.notes && <div className="text-[10px] text-[var(--af-text3)] mt-0.5 italic">📝 {entry.notes}</div>
                              )}
                            </div>
                            <button className="p-1 rounded hover:bg-[var(--af-bg4)] cursor-pointer border-none bg-transparent opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setNoteEditing(entry.id); setNoteText(entry.notes || ''); }}>
                              <FileText size={12} className="text-[var(--af-text3)]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!selectedProject && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm text-[var(--muted-foreground)]">Selecciona un proyecto para ver los checklists</div>
          <div className="text-xs text-[var(--af-text3)] mt-1">Cada fase tiene items predefinidos de control de calidad</div>
        </div>
      )}
    </div>
  );
}
