'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { getFirebase, snapToDocs, uploadToStorage } from '@/lib/firebase-service';
import EmptyState from '@/components/ui/EmptyState';
import SignatureModal from '@/components/modals/SignatureModal';
import SignatureDisplay, { type SignatureRecord } from '@/components/ui/SignatureDisplay';
import { Plus, ChevronDown, ChevronUp, Users, Clock, AlertTriangle, Trash2, Pencil, PenTool } from 'lucide-react';
import type { FirestoreTimestamp } from '@/lib/types';

/* ===== LOCAL TYPES ===== */

interface FieldNote {
  id: string;
  data: {
    projectId: string;
    date: string;
    weather: string;
    temperature: number;
    activities: string[];
    participants: string[];
    laborCount: number;
    observations: string;
    commitments: string[];
    commitmentFulfilled: boolean[];
    photos: string[];
    signatures?: SignatureRecord[];
    supervisor: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

const WEATHER_OPTIONS = ['Soleado', 'Nublado', 'Lluvioso', 'Parcialmente nublado', 'Tormenta'];

const weatherIcon = (w: string) => {
  switch (w) {
    case 'Soleado': return '☀️';
    case 'Nublado': return '☁️';
    case 'Lluvioso': return '🌧️';
    case 'Parcialmente nublado': return '⛅';
    case 'Tormenta': return '⛈️';
    default: return '🌤️';
  }
};

export default function FieldNotesScreen() {
  const ui = useUI();
  const { projects } = useFirestore();
  const auth = useAuth();
  const { showToast } = ui;

  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [tab, setTab] = useState<'list' | 'create' | 'edit'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formProject, setFormProject] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formWeather, setFormWeather] = useState('Soleado');
  const [formTemperature, setFormTemperature] = useState(25);
  const [formActivities, setFormActivities] = useState<string[]>(['']);
  const [formParticipants, setFormParticipants] = useState<string[]>(['']);
  const [formObservations, setFormObservations] = useState('');
  const [formCommitments, setFormCommitments] = useState<string[]>(['']);
  const [formSupervisor, setFormSupervisor] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formSignatures, setFormSignatures] = useState<SignatureRecord[]>([]);
  const [sigModalOpen, setSigModalOpen] = useState(false);

  // Load notes
  useEffect(() => {
    const db = getFirebase().firestore();
    const unsub = db.collection('fieldNotes').orderBy('date', 'desc').onSnapshot((snap: any) => {
      setNotes(snapToDocs(snap) as FieldNote[]);
    }, (err: any) => console.error('[ArchiFlow] FieldNotes: listen error:', err));
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = notes;
    if (filterProjectId) list = list.filter(n => n.data.projectId === filterProjectId);
    return list;
  }, [notes, filterProjectId]);

  // Summary
  const summary = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = filtered.filter(n => new Date(n.data.date) >= weekStart).length;
    const pendingCommitments = filtered.reduce((s, n) => {
      const commitments = n.data.commitments || [];
      const fulfilled = n.data.commitmentFulfilled || [];
      return s + commitments.filter((_, i) => !fulfilled[i]).length;
    }, 0);
    return { total: filtered.length, thisWeek, pendingCommitments };
  }, [filtered]);

  const resetForm = () => {
    setFormProject('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormWeather('Soleado');
    setFormTemperature(25);
    setFormActivities(['']);
    setFormParticipants(['']);
    setFormObservations('');
    setFormCommitments(['']);
    setFormSupervisor('');
    setFormPhotos([]);
    setFormSignatures([]);
    setEditingId(null);
  };

  const populateForm = (note: FieldNote) => {
    setFormProject(note.data.projectId);
    setFormDate(note.data.date || new Date().toISOString().split('T')[0]);
    setFormWeather(note.data.weather || 'Soleado');
    setFormTemperature(note.data.temperature || 25);
    setFormActivities(note.data.activities?.length ? note.data.activities : ['']);
    setFormParticipants(note.data.participants?.length ? note.data.participants : ['']);
    setFormObservations(note.data.observations || '');
    setFormCommitments(note.data.commitments?.length ? note.data.commitments : ['']);
    setFormSupervisor(note.data.supervisor || '');
    setFormPhotos(note.data.photos || []);
    setFormSignatures(note.data.signatures || []);
    setEditingId(note.id);
  };

  const openEdit = (note: FieldNote) => {
    populateForm(note);
    setTab('edit');
    setExpandedId(null);
  };

  const saveNote = async () => {
    if (!formProject) { showToast('Selecciona un proyecto', 'error'); return; }
    if (!formDate) { showToast('Selecciona una fecha', 'error'); return; }
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();
      const activities = formActivities.filter(a => a.trim());
      const participants = formParticipants.filter(p => p.trim());
      const commitments = formCommitments.filter(c => c.trim());

      // Upload base64 photos to Storage, keep existing URLs as-is
      const photoUrls: string[] = [];
      for (let i = 0; i < formPhotos.length; i++) {
        const photo = formPhotos[i];
        if (photo.startsWith('data:')) {
          const result = await uploadToStorage(photo, `fieldNotes/${auth.authUser?.uid || 'anon'}/${formProject}/${Date.now()}_${i}.jpg`);
          photoUrls.push(result.downloadURL);
        } else {
          photoUrls.push(photo);
        }
      }

      const noteData = {
        projectId: formProject,
        date: formDate,
        weather: formWeather,
        temperature: formTemperature,
        activities,
        participants,
        laborCount: participants.length,
        observations: formObservations,
        commitments,
        photos: photoUrls,
        supervisor: formSupervisor || auth.authUser?.displayName || '',
        signatures: formSignatures,
        updatedAt: ts,
      };

      if (editingId) {
        // Keep existing commitmentFulfilled, adjust length if commitments changed
        const existingNote = notes.find(n => n.id === editingId);
        const existingFulfilled = existingNote?.data.commitmentFulfilled || [];
        const newFulfilled = commitments.map((_, i) => existingFulfilled[i] || false);
        await db.collection('fieldNotes').doc(editingId).update({
          ...noteData,
          commitmentFulfilled: newFulfilled,
        });
        showToast('Minuta actualizada');
      } else {
        await db.collection('fieldNotes').add({
          ...noteData,
          commitmentFulfilled: new Array(commitments.length).fill(false),
          createdAt: ts,
          createdBy: auth.authUser?.uid || '',
        });
        showToast('Minuta registrada');
      }
      resetForm();
      setTab('list');
    } catch (err) {
      console.error('[ArchiFlow] FieldNotes: save error:', err);
      showToast('Error al guardar', 'error');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await getFirebase().firestore().collection('fieldNotes').doc(id).delete();
      showToast('Minuta eliminada');
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('[ArchiFlow] FieldNotes: delete error:', err);
    }
  };

  const toggleCommitment = async (noteId: string, idx: number, currentVal: boolean) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const fulfilled = [...(note.data.commitmentFulfilled || [])];
      fulfilled[idx] = !currentVal;
      await getFirebase().firestore().collection('fieldNotes').doc(noteId).update({ commitmentFulfilled: fulfilled });
    } catch (err) {
      console.error('[ArchiFlow] FieldNotes: toggle commitment error:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < Math.min(files.length, 5 - formPhotos.length); i++) {
      try {
        const reader = new FileReader();
        reader.onload = () => setFormPhotos(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(files[i]);
      } catch (err) {
        console.error('[ArchiFlow] FieldNotes: photo read error:', err);
      }
    }
  };

  const hasUnfulfilledCommitments = (note: FieldNote) => {
    const commitments = note.data.commitments || [];
    const fulfilled = note.data.commitmentFulfilled || [];
    return commitments.some((_, i) => !fulfilled[i]);
  };

  // ===== LIST VIEW =====
  if (tab === 'list') {
    return (
      <div className="animate-fadeIn space-y-4">
        {/* Header + Filter */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-3 items-center flex-wrap">
            <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none min-w-[180px]" value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
          </div>
          <button className="skeuo-btn flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => { resetForm(); setTab('create'); }}>
            <Plus size={16} /> Nueva Minuta
          </button>
        </div>

        {/* Summary Cards */}
        <div className="aurora-bg card-glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { lbl: 'Total Minutas', val: String(summary.total), color: 'text-[var(--af-accent)]', icon: '📝' },
            { lbl: 'Esta Semana', val: String(summary.thisWeek), color: 'text-blue-400', icon: '📅' },
            { lbl: 'Compromisos Pendientes', val: String(summary.pendingCommitments), color: summary.pendingCommitments > 0 ? 'text-amber-400' : 'text-emerald-400', icon: summary.pendingCommitments > 0 ? '⚠️' : '✅' },
          ].map((c, i) => (
            <div key={i} className="card-glass-subtle rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{c.icon}</span>
                <div className={`text-lg font-bold font-tabular text-gradient ${c.color}`}>{c.val}</div>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
            </div>
          ))}
        </div>

        {/* Notes List */}
        {filtered.length === 0 ? (
          <EmptyState
            illustration="tasks"
            title="Sin minutas de obra"
            description={filterProjectId ? 'No hay minutas para este proyecto' : 'Registra tu primera minuta para documentar las actividades en obra'}
            action={!filterProjectId ? { label: 'Crear Minuta', onClick: () => { resetForm(); setTab('create'); } } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(note => {
              const isExpanded = expandedId === note.id;
              const proj = projects.find(p => p.id === note.data.projectId);
              const unfulfilled = hasUnfulfilledCommitments(note);

              return (
                <div key={note.id} className={`card-glass-subtle rounded-xl p-4 card-glass-hover cursor-pointer transition-all ${unfulfilled ? 'ring-1 ring-amber-500/30' : ''}`} onClick={() => setExpandedId(isExpanded ? null : note.id)}>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{note.data.date || 'Sin fecha'}</span>
                      <span className="text-sm">{weatherIcon(note.data.weather)}</span>
                      {note.data.temperature > 0 && <span className="text-[11px] text-[var(--af-text3)]">{note.data.temperature}°C</span>}
                      {unfulfilled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={10} /> Compromisos pendientes
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {note.data.participants?.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                          <Users size={10} />{note.data.participants.length}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={14} className="text-[var(--af-text3)]" /> : <ChevronDown size={14} className="text-[var(--af-text3)]" />}
                    </div>
                  </div>

                  {/* Project */}
                  {proj && !filterProjectId && <div className="text-[11px] text-[var(--af-text3)] mt-1">{proj.data.name}</div>}

                  {/* Preview */}
                  {!isExpanded && note.data.activities?.length > 0 && (
                    <div className="mt-2 text-[12px] text-[var(--muted-foreground)]">
                      {note.data.activities.slice(0, 2).join(' · ')}
                      {note.data.activities.length > 2 && ` (+${note.data.activities.length - 2} más)`}
                    </div>
                  )}

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 animate-fadeIn border-t border-[var(--border)] pt-3">
                      {/* Activities */}
                      {note.data.activities?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-accent)] uppercase tracking-wide mb-1.5">Actividades</div>
                          <div className="space-y-1">
                            {note.data.activities.map((act: string, i: number) => (
                              <div key={i} className="text-[12px] text-[var(--foreground)] flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-1.5 shrink-0" />
                                {act}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observations */}
                      {note.data.observations && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-accent)] uppercase tracking-wide mb-1.5">Observaciones</div>
                          <div className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">{note.data.observations}</div>
                        </div>
                      )}

                      {/* Commitments */}
                      {note.data.commitments?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-accent)] uppercase tracking-wide mb-1.5">Compromisos</div>
                          <div className="space-y-1">
                            {note.data.commitments.map((c: string, i: number) => {
                              const fulfilled = note.data.commitmentFulfilled?.[i] || false;
                              return (
                                <div key={i} className="flex items-center gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); toggleCommitment(note.id, i, fulfilled); }}>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${fulfilled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)]'}`}>
                                    {fulfilled && <span className="text-[10px]">✓</span>}
                                  </div>
                                  <span className={`text-[12px] ${fulfilled ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}>{c}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Participants */}
                      {note.data.participants?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-accent)] uppercase tracking-wide mb-1.5 flex items-center gap-1"><Users size={10} /> Participantes</div>
                          <div className="flex flex-wrap gap-1.5">
                            {note.data.participants.map((p: string, i: number) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full skeuo-badge text-[var(--foreground)]">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photos */}
                      {note.data.photos?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--af-accent)] uppercase tracking-wide mb-1.5">Fotos ({note.data.photos.length})</div>
                          <div className="grid grid-cols-3 gap-2">
                            {note.data.photos.slice(0, 6).map((photo: string, i: number) => (
                              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-[var(--skeuo-inset)]">
                                <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supervisor */}
                      {note.data.supervisor && (
                        <div className="text-[11px] text-[var(--af-text3)]">
                          Supervisor: <span className="text-[var(--foreground)]">{note.data.supervisor}</span>
                        </div>
                      )}

                      {/* Signatures */}
                      {note.data.signatures && note.data.signatures.length > 0 && (
                        <SignatureDisplay signatures={note.data.signatures} compact />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-[var(--af-blue)] hover:opacity-80 transition-opacity" onClick={() => openEdit(note)} title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="skeuo-badge px-2 py-1.5 rounded text-xs cursor-pointer text-red-400 hover:opacity-80 transition-opacity" onClick={() => deleteNote(note.id)} title="Eliminar">
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

  // ===== CREATE / EDIT VIEW =====
  const isEditing = tab === 'edit' && editingId !== null;
  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{isEditing ? 'Editar Minuta de Obra' : 'Nueva Minuta de Obra'}</h3>
        <button className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:underline" onClick={() => { resetForm(); setTab('list'); }}>← Volver</button>
      </div>

      <div className="card-elevated rounded-xl p-4 space-y-4">
        {/* Project, Date, Weather */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formProject} onChange={e => setFormProject(e.target.value)}>
            <option value="">Seleccionar proyecto *</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
          </select>
          <input type="date" className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <div className="flex gap-2 items-center">
            <select className="skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none flex-1" value={formWeather} onChange={e => setFormWeather(e.target.value)}>
              {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{weatherIcon(w)} {w}</option>)}
            </select>
            <input type="number" className="w-20 skeuo-input px-2 py-2 text-sm text-[var(--foreground)] outline-none text-right" placeholder="°C" value={formTemperature} onChange={e => setFormTemperature(Number(e.target.value))} />
          </div>
        </div>

        {/* Supervisor */}
        <input className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Supervisor" value={formSupervisor} onChange={e => setFormSupervisor(e.target.value)} />

        {/* Activities */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Actividades</span>
            <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={() => setFormActivities(prev => [...prev, ''])}>+ Agregar</button>
          </div>
          {formActivities.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder={`Actividad ${i + 1}`} value={a} onChange={e => setFormActivities(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
              {formActivities.length > 1 && (
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] text-[var(--af-red)] cursor-pointer shrink-0" onClick={() => setFormActivities(prev => prev.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Participantes</span>
            <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={() => setFormParticipants(prev => [...prev, ''])}>+ Agregar</button>
          </div>
          {formParticipants.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder={`Participante ${i + 1}`} value={p} onChange={e => setFormParticipants(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
              {formParticipants.length > 1 && (
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] text-[var(--af-red)] cursor-pointer shrink-0" onClick={() => setFormParticipants(prev => prev.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Observations */}
        <textarea className="w-full skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none resize-none" rows={3} placeholder="Observaciones..." value={formObservations} onChange={e => setFormObservations(e.target.value)} />

        {/* Commitments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Compromisos</span>
            <button className="text-xs text-[var(--af-blue)] cursor-pointer hover:underline" onClick={() => setFormCommitments(prev => [...prev, ''])}>+ Agregar</button>
          </div>
          {formCommitments.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 skeuo-input px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder={`Compromiso ${i + 1}`} value={c} onChange={e => setFormCommitments(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
              {formCommitments.length > 1 && (
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] text-[var(--af-red)] cursor-pointer shrink-0" onClick={() => setFormCommitments(prev => prev.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium">Fotos</span>
          <div className="flex gap-2 items-center flex-wrap">
            {formPhotos.map((photo, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden relative group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setFormPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            {formPhotos.length < 5 && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--af-accent)] transition-colors">
                <Plus size={16} className="text-[var(--muted-foreground)]" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium flex items-center gap-1.5">
              <PenTool size={14} /> Firmas Digitales
              {formSignatures.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ml-1">{formSignatures.length}</span>
              )}
            </span>
          </div>
          {formSignatures.length > 0 && (
            <SignatureDisplay signatures={formSignatures} compact />
          )}
          <button
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-[var(--border)] text-[12px] text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--af-accent)] hover:text-[var(--af-accent)] transition-colors"
            onClick={() => setSigModalOpen(true)}
          >
            <PenTool size={14} /> {formSignatures.length > 0 ? 'Agregar Firma' : 'Firmar Minuta'}
          </button>
        </div>

        <button className="skeuo-btn w-full bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveNote}>
          {isEditing ? 'Guardar Cambios' : 'Registrar Minuta'}
        </button>
      </div>

      <SignatureModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        documentType="minuta"
        documentRef={editingId || undefined}
        documentTitle={formDate ? `Minuta ${formDate}` : 'Minuta de Obra'}
        existingSignatures={formSignatures}
        onSign={(sigs) => setFormSignatures(sigs)}
      />
    </div>
  );
}
