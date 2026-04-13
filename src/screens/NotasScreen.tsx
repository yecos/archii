'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getInitials, avatarColor } from '@/lib/helpers';
import { getFirebase } from '@/lib/firebase-service';
import { Plus, X, Pin, Trash2, Edit3, StickyNote, Search, Tag, Calendar, Palette, Archive, Star, LayoutGrid, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Note categories with colors
const NOTE_CATEGORIES = [
  { id: 'general', label: 'General', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
  { id: 'obra', label: 'Obra', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { id: 'diseno', label: 'Diseno', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  { id: 'cliente', label: 'Cliente', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { id: 'urgente', label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  { id: 'idea', label: 'Idea', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
];

const NOTE_COLORS = [
  { id: 'default', bg: 'var(--card)', label: 'Default' },
  { id: 'yellow', bg: '#fef3c7', label: 'Amarillo' },
  { id: 'green', bg: '#d1fae5', label: 'Verde' },
  { id: 'blue', bg: '#dbeafe', label: 'Azul' },
  { id: 'pink', bg: '#fce7f3', label: 'Rosa' },
  { id: 'purple', bg: '#ede9fe', label: 'Morado' },
];

interface QuickNote {
  id: string;
  title: string;
  content: string;
  category: string;
  colorId: string;
  projectId: string;
  pinned: boolean;
  starred: boolean;
  archived: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export default function NotasScreen() {
  const { projects, authUser, showToast, loading } = useApp();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formColorId, setFormColorId] = useState('default');
  const [formProjectId, setFormProjectId] = useState('');

  // Load notes from Firestore on mount
  React.useEffect(() => {
    if (!authUser) return;
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();

    const unsub = db.collection('quickNotes')
      .where('createdBy', '==', authUser.uid)
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snap => {
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QuickNote[];
        setNotes(loaded);
      }, err => {
        console.error('Error loading notes:', err);
      });

    return () => unsub();
  }, [authUser]);

  // Save note to Firestore
  const saveNote = useCallback(async () => {
    if (!formTitle.trim() && !formContent.trim()) return;
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();
    const now = fb.firestore.FieldValue.serverTimestamp();

    try {
      if (editingNote) {
        await db.collection('quickNotes').doc(editingNote.id).update({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          colorId: formColorId,
          projectId: formProjectId,
          updatedAt: now,
        });
        showToast('Nota actualizada');
      } else {
        await db.collection('quickNotes').add({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          colorId: formColorId,
          projectId: formProjectId,
          pinned: false,
          starred: false,
          archived: false,
          createdBy: authUser?.uid,
          createdAt: now,
          updatedAt: now,
        });
        showToast('Nota creada');
      }
      resetForm();
    } catch (err) {
      showToast('Error al guardar nota', 'error');
    }
  }, [formTitle, formContent, formCategory, formColorId, formProjectId, editingNote, authUser, showToast]);

  const togglePin = useCallback(async (note: QuickNote) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('quickNotes').doc(note.id).update({ pinned: !note.pinned, updatedAt: fb.firestore.FieldValue.serverTimestamp() });
    } catch { showToast('Error', 'error'); }
  }, [showToast]);

  const toggleStar = useCallback(async (note: QuickNote) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('quickNotes').doc(note.id).update({ starred: !note.starred, updatedAt: fb.firestore.FieldValue.serverTimestamp() });
    } catch { showToast('Error', 'error'); }
  }, [showToast]);

  const toggleArchive = useCallback(async (note: QuickNote) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('quickNotes').doc(note.id).update({ archived: !note.archived, updatedAt: fb.firestore.FieldValue.serverTimestamp() });
      showToast(note.archived ? 'Nota restaurada' : 'Nota archivada');
    } catch { showToast('Error', 'error'); }
  }, [showToast]);

  const deleteNote = useCallback(async (noteId: string) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('quickNotes').doc(noteId).delete();
      showToast('Nota eliminada');
    } catch { showToast('Error', 'error'); }
  }, [showToast]);

  const resetForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setFormColorId('default');
    setFormProjectId('');
  };

  const openEdit = (note: QuickNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormColorId(note.colorId);
    setFormProjectId(note.projectId);
    setShowForm(true);
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    let result = showArchived ? notes.filter(n => n.archived) : notes.filter(n => !n.archived);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    if (filterCategory) result = result.filter(n => n.category === filterCategory);
    if (filterProject) result = result.filter(n => n.projectId === filterProject);
    // Sort: pinned first, then by updatedAt
    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return 0;
    });
  }, [notes, searchQuery, filterCategory, filterProject, showArchived]);

  const getNoteBg = (colorId: string) => {
    const c = NOTE_COLORS.find(nc => nc.id === colorId);
    return c ? c.bg : 'var(--card)';
  };

  const getCategoryInfo = (catId: string) => {
    return NOTE_CATEGORIES.find(c => c.id === catId) || NOTE_CATEGORIES[0];
  };

  const getProjectName = (projId: string) => {
    const p = projects.find((pr: any) => pr.id === projId);
    return p?.data?.name || '';
  };

  // Stats
  const totalNotes = notes.filter(n => !n.archived).length;
  const pinnedNotes = notes.filter(n => n.pinned && !n.archived).length;
  const starredNotes = notes.filter(n => n.starred && !n.archived).length;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold mb-1 flex items-center gap-2">
              <StickyNote size={20} className="text-[var(--af-accent)]" />
              Notas Rapidas
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">v2.0</span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">Pizarron de notas, ideas y recordatorios rapidos</div>
          </div>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={14} /> Nueva nota
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total notas', value: totalNotes, icon: '📝', color: 'text-[var(--af-accent)]' },
          { label: 'Fijadas', value: pinnedNotes, icon: '📌', color: 'text-amber-400' },
          { label: 'Destacadas', value: starredNotes, icon: '⭐', color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="text-lg">{stat.icon}</div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
          <input
            type="text" placeholder="Buscar notas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 transition-all"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1 overflow-x-auto">
          <button
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all whitespace-nowrap ${!filterCategory ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
            onClick={() => setFilterCategory('')}
          >Todas</button>
          {NOTE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all whitespace-nowrap ${filterCategory === cat.id ? '' : 'border border-[var(--border)]'}`}
              style={filterCategory === cat.id ? { backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.border}` } : { color: 'var(--muted-foreground)', backgroundColor: 'var(--af-bg3)' }}
              onClick={() => setFilterCategory(filterCategory === cat.id ? '' : cat.id)}
            >{cat.label}</button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-0.5 bg-[var(--af-bg3)] rounded-lg p-0.5 ml-auto">
          <button className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[var(--card)] shadow-sm' : ''}`} onClick={() => setViewMode('grid')}>
            <LayoutGrid size={14} className={viewMode === 'grid' ? 'text-[var(--af-accent)]' : 'text-[var(--muted-foreground)]'} />
          </button>
          <button className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[var(--card)] shadow-sm' : ''}`} onClick={() => setViewMode('list')}>
            <List size={14} className={viewMode === 'list' ? 'text-[var(--af-accent)]' : 'text-[var(--muted-foreground)]'} />
          </button>
        </div>

        <button
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all ${showArchived ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}
          onClick={() => setShowArchived(!showArchived)}
        ><Archive size={12} /> {showArchived ? 'Activas' : 'Archivadas'}</button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">{editingNote ? 'Editar nota' : 'Nueva nota'}</div>
            <button className="w-8 h-8 rounded-lg hover:bg-[var(--af-bg4)] flex items-center justify-center cursor-pointer border-none bg-transparent text-[var(--muted-foreground)]" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text" placeholder="Titulo de la nota" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]"
            />
            <div className="flex gap-2">
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                className="flex-1 text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--foreground)] outline-none cursor-pointer">
                {NOTE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)}
                className="flex-1 text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--foreground)] outline-none cursor-pointer">
                <option value="">Sin proyecto</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
              </select>
            </div>
          </div>
          <textarea
            placeholder="Escribe tu nota aqui..." value={formContent} onChange={e => setFormContent(e.target.value)}
            rows={4}
            className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none mb-3"
          />
          {/* Color picker */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-[var(--muted-foreground)]">Color:</span>
            <div className="flex gap-1.5">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.id}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${formColorId === c.id ? 'scale-110 border-[var(--af-accent)]' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c.bg === 'var(--card)' ? 'var(--af-bg4)' : c.bg }}
                  onClick={() => setFormColorId(c.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded-lg text-[12px] cursor-pointer bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] transition-colors" onClick={resetForm}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[12px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveNote}>
              {editingNote ? 'Guardar cambios' : 'Crear nota'}
            </button>
          </div>
        </div>
      )}

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">{showArchived ? '📦' : '📝'}</div>
          <div className="text-sm text-[var(--muted-foreground)]">{showArchived ? 'Sin notas archivadas' : 'Sin notas'}</div>
          <div className="text-xs text-[var(--af-text3)] mt-1">{showArchived ? 'Las notas que archives apareceran aqui' : 'Crea tu primera nota rapida'}</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredNotes.map(note => {
            const catInfo = getCategoryInfo(note.category);
            const projName = getProjectName(note.projectId);
            return (
              <div
                key={note.id}
                className="rounded-xl border p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 group cursor-default relative"
                style={{ backgroundColor: getNoteBg(note.colorId), borderColor: note.pinned ? 'var(--af-accent)' : 'var(--border)' }}
              >
                {/* Pinned indicator */}
                {note.pinned && (
                  <div className="absolute top-2 right-2">
                    <Pin size={14} className="text-[var(--af-accent)] fill-[var(--af-accent)]" />
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    {note.title && <div className="text-[14px] font-semibold truncate">{note.title}</div>}
                    {!note.title && <div className="text-[14px] text-[var(--muted-foreground)] italic">Sin titulo</div>}
                  </div>
                </div>

                {/* Category + Project tags */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: catInfo.bg, color: catInfo.color }}>
                    {catInfo.label}
                  </span>
                  {projName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)]">
                      {projName}
                    </span>
                  )}
                </div>

                {/* Content */}
                {note.content && (
                  <div className="text-[12px] text-[var(--muted-foreground)] leading-relaxed line-clamp-4 mb-3 whitespace-pre-wrap">
                    {note.content}
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer border-none bg-transparent" onClick={() => togglePin(note)} title={note.pinned ? 'Desfijar' : 'Fijar'}>
                    <Pin size={13} className={note.pinned ? 'text-[var(--af-accent)] fill-[var(--af-accent)]' : 'text-[var(--af-text3)]'} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer border-none bg-transparent" onClick={() => toggleStar(note)} title={note.starred ? 'Quitar estrella' : 'Destacar'}>
                    <Star size={13} className={note.starred ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--af-text3)]'} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer border-none bg-transparent" onClick={() => openEdit(note)} title="Editar">
                    <Edit3 size={13} className="text-[var(--af-text3)]" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-amber-500/10 cursor-pointer border-none bg-transparent" onClick={() => toggleArchive(note)} title={note.archived ? 'Restaurar' : 'Archivar'}>
                    <Archive size={13} className="text-[var(--af-text3)]" />
                  </button>
                  <div className="flex-1" />
                  <button className="p-1.5 rounded hover:bg-red-500/10 cursor-pointer border-none bg-transparent" onClick={() => deleteNote(note.id)} title="Eliminar">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {filteredNotes.map((note, idx) => {
            const catInfo = getCategoryInfo(note.category);
            const projName = getProjectName(note.projectId);
            return (
              <div
                key={note.id}
                className={`flex items-start gap-3 p-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--af-bg3)] transition-colors cursor-default group ${idx % 2 === 0 ? '' : 'bg-[var(--af-bg3)]/30'}`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: catInfo.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {note.pinned && <Pin size={11} className="text-[var(--af-accent)] fill-[var(--af-accent)]" />}
                    {note.starred && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                    <span className="text-[13px] font-medium truncate">{note.title || 'Sin titulo'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: catInfo.bg, color: catInfo.color }}>{catInfo.label}</span>
                    {projName && <span className="text-[10px] text-[var(--af-text3)] truncate">{projName}</span>}
                  </div>
                  {note.content && <div className="text-[12px] text-[var(--muted-foreground)] line-clamp-1">{note.content}</div>}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button className="p-1.5 rounded hover:bg-[var(--af-bg4)] cursor-pointer border-none bg-transparent" onClick={() => openEdit(note)}><Edit3 size={12} className="text-[var(--af-text3)]" /></button>
                  <button className="p-1.5 rounded hover:bg-red-500/10 cursor-pointer border-none bg-transparent" onClick={() => deleteNote(note.id)}><Trash2 size={12} className="text-red-400" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
