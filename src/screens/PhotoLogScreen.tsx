'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs, uploadToStorage } from '@/lib/firebase-service';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Camera, Trash2, Pencil } from 'lucide-react';
import type { FirestoreTimestamp } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

interface PhotoLogEntry {
  id: string;
  data: {
    projectId: string;
    space: string;
    phase: string;
    progress: number;
    beforePhoto: string;
    afterPhoto: string;
    caption: string;
    date: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

const PHASE_OPTIONS = ['Preparación', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Limpieza', 'Entrega'];

export default function PhotoLogScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const auth = useAuth();
  const { showToast } = ui;

  const [entries, setEntries] = useState<PhotoLogEntry[]>([]);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [spaceTab, setSpaceTab] = useState<string>('all');
  const [tab, setTab] = useState<'list' | 'create' | 'edit'>('list');
  const [detailEntry, setDetailEntry] = useState<PhotoLogEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formProject, setFormProject] = useState('');
  const [formSpace, setFormSpace] = useState('');
  const [formNewSpace, setFormNewSpace] = useState('');
  const [formPhase, setFormPhase] = useState('Acabados');
  const [formProgress, setFormProgress] = useState(0);
  const [formBeforePhoto, setFormBeforePhoto] = useState('');
  const [formAfterPhoto, setFormAfterPhoto] = useState('');
  const [formCaption, setFormCaption] = useState('');

  // Load entries
  useEffect(() => {
    const db = getFirebase().firestore();
    const unsub = db.collection('photoLog').orderBy('date', 'desc').onSnapshot((snap: any) => {
      setEntries(snapToDocs(snap) as PhotoLogEntry[]);
    }, (err: any) => console.error('[ArchiFlow] PhotoLog: listen error:', err));
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterProjectId) list = list.filter(e => e.data.projectId === filterProjectId);
    if (spaceTab !== 'all') list = list.filter(e => e.data.space === spaceTab);
    return list;
  }, [entries, filterProjectId, spaceTab]);

  const uniqueSpaces = useMemo(() => {
    const spaces = new Set(entries.map(e => e.data.space).filter(Boolean));
    return ['all', ...Array.from(spaces)];
  }, [entries]);

  const spaceProgress = useMemo(() => {
    const map: Record<string, { total: number; avgProgress: number }> = {};
    const bySpace: Record<string, number[]> = {};
    entries.forEach(e => {
      if (!e.data.space) return;
      if (!bySpace[e.data.space]) bySpace[e.data.space] = [];
      bySpace[e.data.space].push(e.data.progress || 0);
    });
    Object.entries(bySpace).forEach(([space, progs]) => {
      map[space] = { total: progs.length, avgProgress: Math.round(progs.reduce((s, p) => s + p, 0) / progs.length) };
    });
    return map;
  }, [entries]);

  const resetForm = () => {
    setFormProject('');
    setFormSpace('');
    setFormNewSpace('');
    setFormPhase('Acabados');
    setFormProgress(0);
    setFormBeforePhoto('');
    setFormAfterPhoto('');
    setFormCaption('');
    setEditingId(null);
  };

  const populateForm = (entry: PhotoLogEntry) => {
    setFormProject(entry.data.projectId);
    setFormSpace(entry.data.space || '');
    setFormNewSpace('');
    setFormPhase(entry.data.phase || 'Acabados');
    setFormProgress(entry.data.progress || 0);
    setFormBeforePhoto(entry.data.beforePhoto || '');
    setFormAfterPhoto(entry.data.afterPhoto || '');
    setFormCaption(entry.data.caption || '');
    setEditingId(entry.id);
  };

  const openEdit = (entry: PhotoLogEntry) => {
    populateForm(entry);
    setDetailEntry(null);
    setTab('edit');
  };

  const handlePhotoUpload = (field: 'before' | 'after') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (field === 'before') setFormBeforePhoto(reader.result as string);
        else setFormAfterPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[ArchiFlow] PhotoLog: photo read error:', err);
    }
  };

  const saveEntry = async () => {
    if (!formProject) { showToast('Selecciona un proyecto', 'error'); return; }
    if (!formBeforePhoto && !formAfterPhoto) { showToast('Agrega al menos una foto', 'error'); return; }
    try {
      const fb = getFirebase();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const space = formNewSpace.trim() || formSpace;
      if (!space) { showToast('Selecciona o crea un espacio', 'error'); return; }

      // Upload base64 photos to Storage, keep existing URLs as-is
      let finalBefore = formBeforePhoto;
      let finalAfter = formAfterPhoto;
      const uid = auth.authUser?.uid || 'anon';

      if (formBeforePhoto.startsWith('data:')) {
        const result = await uploadToStorage(formBeforePhoto, `photoLog/${uid}/${formProject}/before_${Date.now()}.jpg`);
        finalBefore = result.downloadURL;
      }
      if (formAfterPhoto.startsWith('data:')) {
        const result = await uploadToStorage(formAfterPhoto, `photoLog/${uid}/${formProject}/after_${Date.now()}.jpg`);
        finalAfter = result.downloadURL;
      }

      const entryData = {
        projectId: formProject,
        space,
        phase: formPhase,
        progress: formProgress,
        beforePhoto: finalBefore,
        afterPhoto: finalAfter,
        caption: formCaption,
        updatedAt: ts,
      };

      if (editingId) {
        await fb.firestore().collection('photoLog').doc(editingId).update(entryData);
        showToast('Entrada actualizada');
      } else {
        await fb.firestore().collection('photoLog').add({
          ...entryData,
          date: new Date().toISOString().split('T')[0],
          createdAt: ts,
          createdBy: auth.authUser?.uid || '',
        });
        showToast('Entrada registrada');
      }
      resetForm();
      setTab('list');
    } catch (err) {
      console.error('[ArchiFlow] PhotoLog: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await getFirebase().firestore().collection('photoLog').doc(id).delete();
      showToast('Entrada eliminada');
      if (detailEntry?.id === id) setDetailEntry(null);
    } catch (err) {
      console.error('[ArchiFlow] PhotoLog: delete error:', err);
    }
  };

  // ===== DETAIL MODAL =====
  if (detailEntry) {
    const proj = projects.find(p => p.id === detailEntry.data.projectId);
    return (
      <div className="animate-fadeIn space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Detalle del Registro Fotográfico</h3>
          <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => setDetailEntry(null)}>← Volver</button>
        </div>
        <div className="card-elevated rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><span className="text-[11px] text-[var(--muted-foreground)]">Proyecto</span><div className="text-sm font-semibold">{proj?.data.name || '—'}</div></div>
            <div><span className="text-[11px] text-[var(--muted-foreground)]">Espacio</span><div className="text-sm font-semibold">{detailEntry.data.space}</div></div>
            <div><span className="text-[11px] text-[var(--muted-foreground)]">Fase</span><div className="text-sm font-semibold">{detailEntry.data.phase}</div></div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-[var(--muted-foreground)]">Progreso</span>
              <span className="text-sm font-bold text-[var(--af-accent)]">{detailEntry.data.progress}%</span>
            </div>
            <div className="h-2 bg-[var(--skeuo-inset)] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[var(--af-accent)] progress-animated transition-all" style={{ width: `${detailEntry.data.progress}%` }} />
            </div>
          </div>
          {/* Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detailEntry.data.beforePhoto && (
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Antes</span>
                <img src={detailEntry.data.beforePhoto} alt="Antes" className="w-full rounded-lg bg-[var(--skeuo-inset)]" />
              </div>
            )}
            {detailEntry.data.afterPhoto && (
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Después</span>
                <img src={detailEntry.data.afterPhoto} alt="Después" className="w-full rounded-lg bg-[var(--skeuo-inset)]" />
              </div>
            )}
          </div>
          {detailEntry.data.caption && <div className="text-sm text-[var(--muted-foreground)] italic">{detailEntry.data.caption}</div>}
          <div className="text-[11px] text-[var(--af-text3)]">Fecha: {detailEntry.data.date}</div>
          {/* Action buttons in detail modal */}
          <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
            <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-blue)] text-white px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:opacity-80 transition-opacity" onClick={() => openEdit(detailEntry)}>
              <Pencil size={14} /> Editar
            </button>
            <button className="skeuo-btn flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-red-500/20 transition-colors" onClick={() => { deleteEntry(detailEntry.id); setDetailEntry(null); }}>
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== CREATE / EDIT VIEW =====
  if (tab === 'create' || tab === 'edit') {
    const isEditing = tab === 'edit' && editingId !== null;
    const availableSpaces = entries
      .filter(e => !formProject || e.data.projectId === formProject)
      .map(e => e.data.space)
      .filter(Boolean);
    const uniqueAvailableSpaces = [...new Set(availableSpaces)];

    return (
      <div className="animate-fadeIn space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{isEditing ? 'Editar Registro Fotográfico' : 'Nuevo Registro Fotográfico'}</h3>
          <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => { resetForm(); setTab('list'); }}>← Volver</button>
        </div>
        <div className="card-elevated rounded-xl p-4 space-y-4">
          {/* Project & Space */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formProject} onChange={e => { setFormProject(e.target.value); setFormSpace(''); setFormNewSpace(''); }}>
              <option value="">Seleccionar proyecto *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
            <div className="flex gap-2">
              <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none flex-1" value={formSpace} onChange={e => { setFormSpace(e.target.value); if (e.target.value) setFormNewSpace(''); }}>
                <option value="">Espacio existente</option>
                {uniqueAvailableSpaces.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[var(--muted-foreground)] text-xs self-center">o</span>
              <input className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none flex-1" placeholder="Nuevo espacio" value={formNewSpace} onChange={e => { setFormNewSpace(e.target.value); if (e.target.value) setFormSpace(''); }} />
            </div>
          </div>

          {/* Phase */}
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formPhase} onChange={e => setFormPhase(e.target.value)}>
            {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Progress slider */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[13px] font-medium">Progreso</span>
              <span className="text-sm font-bold text-[var(--af-accent)]">{formProgress}%</span>
            </div>
            <input type="range" min="0" max="100" value={formProgress} onChange={e => setFormProgress(Number(e.target.value))} className="w-full accent-[var(--af-accent)]" />
          </div>

          {/* Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-[13px] font-medium block mb-2">Foto Antes</span>
              {formBeforePhoto ? (
                <div className="relative group">
                  <img src={formBeforePhoto} alt="Antes" className="w-full rounded-lg bg-[var(--skeuo-inset)] aspect-video object-cover" />
                  <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setFormBeforePhoto('')}>✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)] transition-colors">
                  <Camera size={24} className="text-[var(--muted-foreground)] mb-1" />
                  <span className="text-[11px] text-[var(--muted-foreground)]">Subir foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload('before')} />
                </label>
              )}
            </div>
            <div>
              <span className="text-[13px] font-medium block mb-2">Foto Después</span>
              {formAfterPhoto ? (
                <div className="relative group">
                  <img src={formAfterPhoto} alt="Después" className="w-full rounded-lg bg-[var(--skeuo-inset)] aspect-video object-cover" />
                  <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setFormAfterPhoto('')}>✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)] transition-colors">
                  <Camera size={24} className="text-[var(--muted-foreground)] mb-1" />
                  <span className="text-[11px] text-[var(--muted-foreground)]">Subir foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload('after')} />
                </label>
              )}
            </div>
          </div>

          {/* Caption */}
          <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Descripción / Caption..." value={formCaption} onChange={e => setFormCaption(e.target.value)} />

          <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveEntry}>
            {isEditing ? 'Guardar Cambios' : 'Registrar Entrada'}
          </button>
        </div>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-3 items-center flex-wrap">
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none min-w-[180px]" value={filterProjectId} onChange={e => { setFilterProjectId(e.target.value); setSpaceTab('all'); }}>
            <option value="">Todos los proyectos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
        </div>
        <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { resetForm(); setTab('create'); }}>
          <Plus size={16} /> Nueva Entrada
        </button>
      </div>

      {/* Space tabs */}
      {uniqueSpaces.length > 1 && (
        <div className="flex gap-1 skeuo-well rounded-xl p-1 overflow-x-auto">
          {uniqueSpaces.map(space => (
            <button key={space} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${spaceTab === space ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-medium shadow-[var(--skeuo-shadow-raised-sm)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setSpaceTab(space)}>
              {space === 'all' ? 'Todos' : space}
            </button>
          ))}
        </div>
      )}

      {/* Progress per space */}
      {Object.keys(spaceProgress).length > 0 && (
        <div className="card-elevated rounded-xl p-4">
          <div className="text-[13px] font-semibold mb-3">Progreso por Espacio</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(spaceProgress).slice(0, 8).map(([space, data]) => (
              <div key={space} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSpaceTab(space)}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-[var(--foreground)] truncate">{space}</span>
                  <span className="text-[11px] font-bold text-[var(--af-accent)]">{data.avgProgress}%</span>
                </div>
                <div className="h-1.5 bg-[var(--skeuo-inset)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--af-accent)] progress-animated" style={{ width: `${data.avgProgress}%` }} />
                </div>
                <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{data.total} registros</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="gallery"
          title="Sin registros fotográficos"
          description={filterProjectId ? 'No hay fotos para este proyecto' : 'Registra tu primera entrada para documentar el avance de obra'}
          action={!filterProjectId ? { label: 'Agregar Entrada', onClick: () => { resetForm(); setTab('create'); } } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(entry => {
            const proj = projects.find(p => p.id === entry.data.projectId);
            const hasComparison = entry.data.beforePhoto && entry.data.afterPhoto;
            return (
              <div key={entry.id} className="card-glass-subtle rounded-xl overflow-hidden card-glass-hover cursor-pointer transition-all" onClick={() => setDetailEntry(entry)}>
                {/* Photo area */}
                <div className={`relative aspect-video bg-[var(--skeuo-inset)] ${hasComparison ? '' : ''}`}>
                  {hasComparison ? (
                    <div className="flex w-full h-full">
                      <div className="w-1/2 h-full relative">
                        <img src={entry.data.beforePhoto} alt="Antes" className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">Antes</span>
                      </div>
                      <div className="w-px bg-[var(--af-accent)]" />
                      <div className="w-1/2 h-full relative">
                        <img src={entry.data.afterPhoto} alt="Después" className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">Después</span>
                      </div>
                    </div>
                  ) : (
                    <img src={entry.data.beforePhoto || entry.data.afterPhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  {/* Progress overlay */}
                  <div className="absolute top-1 right-1 text-[10px] bg-[var(--af-accent)] text-background px-1.5 py-0.5 rounded-full font-semibold">{entry.data.progress}%</div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold truncate">{entry.data.space}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--skeuo-raised)] text-[var(--muted-foreground)]">{entry.data.phase}</span>
                  </div>
                  {proj && <div className="text-[11px] text-[var(--af-text3)] truncate">{proj.data.name}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex-1 h-1 bg-[var(--skeuo-inset)] rounded-full overflow-hidden mr-2">
                      <div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: `${entry.data.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-[var(--af-text3)]">{entry.data.date}</span>
                  </div>
                  {entry.data.caption && <div className="text-[11px] text-[var(--muted-foreground)] mt-1 truncate">{entry.data.caption}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
