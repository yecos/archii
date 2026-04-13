'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getFirebase } from '@/lib/firebase-service';
import { getInitials, avatarColor } from '@/lib/helpers';
import {
  Plus, X, Search, Filter, ClipboardList, AlertTriangle,
  Clock, CheckCircle2, Loader2, Trash2, Pencil,
  ChevronRight, MapPin, Calendar, User, BarChart3,
  ArrowUpCircle, CircleDot, ShieldCheck, Eye,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface PunchItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  location: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'En progreso' | 'Resuelto' | 'Verificado';
  assigneeId: string;
  dueDate: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

type StatusFilter = 'Todos' | 'Pendiente' | 'En progreso' | 'Resuelto' | 'Verificado';
type PriorityFilter = '' | 'Alta' | 'Media' | 'Baja';

const STATUSES: StatusFilter[] = ['Todos', 'Pendiente', 'En progreso', 'Resuelto', 'Verificado'];
const PRIORITIES: PunchItem['priority'][] = ['Alta', 'Media', 'Baja'];
const ALL_STATUSES: PunchItem['status'][] = ['Pendiente', 'En progreso', 'Resuelto', 'Verificado'];

const emptyForm: Omit<PunchItem, 'id' | 'createdAt' | 'updatedAt'> = {
  projectId: '',
  title: '',
  description: '',
  location: '',
  priority: 'Media',
  status: 'Pendiente',
  assigneeId: '',
  dueDate: '',
  createdBy: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const priorityStyle: Record<PunchItem['priority'], { bg: string; text: string; dot: string }> = {
  Alta: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  Media: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  Baja: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
};

const statusStyle: Record<PunchItem['status'], { bg: string; text: string; icon: React.ReactNode }> = {
  'Pendiente': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    icon: <CircleDot size={11} />,
  },
  'En progreso': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: <Loader2 size={11} className="animate-spin" />,
  },
  'Resuelto': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: <CheckCircle2 size={11} />,
  },
  'Verificado': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    icon: <ShieldCheck size={11} />,
  },
};

const nextStatus: Record<PunchItem['status'], PunchItem['status']> = {
  'Pendiente': 'En progreso',
  'En progreso': 'Resuelto',
  'Resuelto': 'Verificado',
  'Verificado': 'Pendiente',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function isOverdue(dateStr: string, status: PunchItem['status']): boolean {
  if (!dateStr || status === 'Resuelto' || status === 'Verificado') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T12:00:00');
  return due < today;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PunchListScreen() {
  const { projects, authUser, teamUsers, getUserName, showToast } = useApp();

  // State
  const [items, setItems] = useState<PunchItem[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [statusTab, setStatusTab] = useState<StatusFilter>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Real-time Firestore listener ───────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();

    let query: any = db.collection('punchListItems');
    if (selectedProject) {
      query = query.where('projectId', '==', selectedProject);
    }

    const unsub = query.onSnapshot(
      snap => {
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PunchItem[];
        setItems(loaded);
      },
      err => {
        console.error('PunchList snapshot error:', err);
        showToast('Error al cargar punch list', 'error');
      }
    );

    return () => unsub();
  }, [authUser, selectedProject, showToast]);

  // ── CRUD Operations ───────────────────────────────────────────────────────
  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      projectId: selectedProject,
      createdBy: authUser?.uid || '',
    });
    setShowForm(true);
  }, [selectedProject, authUser]);

  const openEditForm = useCallback((item: PunchItem) => {
    setEditingId(item.id);
    setForm({
      projectId: item.projectId,
      title: item.title,
      description: item.description,
      location: item.location,
      priority: item.priority,
      status: item.status,
      assigneeId: item.assigneeId,
      dueDate: item.dueDate,
      createdBy: item.createdBy,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      showToast('El titulo es obligatorio', 'error');
      return;
    }
    if (!form.projectId) {
      showToast('Selecciona un proyecto', 'error');
      return;
    }

    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();
    setSaving(true);

    try {
      const data = {
        projectId: form.projectId,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        priority: form.priority,
        status: form.status,
        assigneeId: form.assigneeId,
        dueDate: form.dueDate,
        createdBy: form.createdBy || authUser?.uid || '',
        updatedAt: fb.firestore.FieldValue.serverTimestamp(),
      };

      if (editingId) {
        await db.collection('punchListItems').doc(editingId).update(data);
        showToast('Item actualizado');
      } else {
        await db.collection('punchListItems').add({
          ...data,
          createdAt: fb.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Item creado');
      }
      closeForm();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, authUser, showToast, closeForm]);

  const handleDelete = useCallback(async (id: string) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await fb.firestore().collection('punchListItems').doc(id).delete();
      showToast('Item eliminado');
      setDeletingId(null);
    } catch {
      showToast('Error al eliminar', 'error');
    }
  }, [showToast]);

  const handleStatusChange = useCallback(async (item: PunchItem, newStatus?: PunchItem['status']) => {
    const fb = getFirebase();
    if (!fb) return;
    const next = newStatus || nextStatus[item.status];
    try {
      await fb.firestore().collection('punchListItems').doc(item.id).update({
        status: next,
        updatedAt: fb.firestore.FieldValue.serverTimestamp(),
      });
      showToast(`Estado cambiado a "${next}"`);
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  }, [showToast]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedProject) {
      result = result.filter(i => i.projectId === selectedProject);
    }
    if (statusTab !== 'Todos') {
      result = result.filter(i => i.status === statusTab);
    }
    if (priorityFilter) {
      result = result.filter(i => i.priority === priorityFilter);
    }
    if (assigneeFilter) {
      result = result.filter(i => i.assigneeId === assigneeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const priorityOrder = { Alta: 0, Media: 1, Baja: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const statusOrder = { Pendiente: 0, 'En progreso': 1, Resuelto: 2, Verificado: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [items, selectedProject, statusTab, priorityFilter, assigneeFilter, searchQuery]);

  const stats = useMemo(() => {
    const base = selectedProject ? items.filter(i => i.projectId === selectedProject) : items;
    const total = base.length;
    const pending = base.filter(i => i.status === 'Pendiente').length;
    const inProgress = base.filter(i => i.status === 'En progreso').length;
    const resolved = base.filter(i => i.status === 'Resuelto' || i.status === 'Verificado').length;
    const verified = base.filter(i => i.status === 'Verificado').length;
    const pct = total > 0 ? Math.round(((resolved + verified) / total) * 100) : 0;
    return { total, pending, inProgress, resolved, verified, pct };
  }, [items, selectedProject]);

  const statusCounts = useMemo(() => {
    const base = selectedProject ? items.filter(i => i.projectId === selectedProject) : items;
    const counts: Record<string, number> = { Todos: base.length };
    STATUSES.forEach(s => {
      counts[s] = base.filter(i => i.status === s).length;
    });
    return counts;
  }, [items, selectedProject]);

  const getProjectName = useCallback(
    (pid: string) => projects.find((p: any) => p.id === pid)?.data?.name || 'Sin proyecto',
    [projects]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn space-y-4">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold mb-1 flex items-center gap-2">
              <ClipboardList size={20} className="text-[var(--af-accent)]" />
              Punch List
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">v2.0</span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Seguimiento de defectos y pendientes de obra
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={openCreateForm}
          >
            <Plus size={14} /> Nuevo Item
          </button>
        </div>
      </div>

      {/* ─── Project Filter ─── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Filter size={12} /> Filtrar por Proyecto
        </div>
        <select
          className="w-full sm:w-72 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.data?.name || 'Sin nombre'}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Status Tabs ─── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUSES.map(status => {
            const count = statusCounts[status] ?? 0;
            const isActive = statusTab === status;
            return (
              <button
                key={status}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap cursor-pointer transition-all border-none ${
                  isActive
                    ? 'bg-[var(--af-accent)] text-background'
                    : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => setStatusTab(status)}
              >
                {status}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-background/20 text-background'
                      : 'bg-[var(--af-bg4)] text-[var(--af-text3)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Total Items</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">En Progreso</div>
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Resueltos</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.resolved}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center col-span-2 md:col-span-1">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Tasa Verificacion</div>
          <div className="text-2xl font-bold text-violet-400">{stats.pct}%</div>
        </div>
      </div>

      {/* ─── Create / Edit Form ─── */}
      {showForm && (
        <div className="bg-[var(--card)] border border-[var(--af-accent)]/30 rounded-xl p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold flex items-center gap-2">
              {editingId ? <Pencil size={16} className="text-[var(--af-accent)]" /> : <Plus size={16} className="text-[var(--af-accent)]" />}
              {editingId ? 'Editar Item' : 'Nuevo Item'}
            </div>
            <button
              className="p-1.5 rounded-lg hover:bg-[var(--af-bg3)] cursor-pointer border-none bg-transparent text-[var(--af-text3)] transition-colors"
              onClick={closeForm}
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block">
                Titulo *
              </label>
              <input
                type="text"
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors placeholder:text-[var(--af-text3)]"
                placeholder="Ej: Fisura en muro de cocina"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block">
                Descripcion
              </label>
              <textarea
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors resize-none placeholder:text-[var(--af-text3)]"
                rows={3}
                placeholder="Describe el defecto o pendiente..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                <MapPin size={11} /> Ubicacion / Area
              </label>
              <input
                type="text"
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors placeholder:text-[var(--af-text3)]"
                placeholder="Ej: Apartamento 201, Cocina"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                <AlertTriangle size={11} /> Prioridad
              </label>
              <select
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as PunchItem['priority'] }))}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                <CircleDot size={11} /> Estado
              </label>
              <select
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as PunchItem['status'] }))}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                <User size={11} /> Asignado a
              </label>
              <select
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
                value={form.assigneeId}
                onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {teamUsers.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block">
                Proyecto *
              </label>
              <select
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              >
                <option value="">Seleccionar proyecto</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.data?.name || 'Sin nombre'}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                <Calendar size={11} /> Fecha Limite
              </label>
              <input
                type="date"
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[var(--border)]">
            <button
              className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="flex items-center gap-1.5 bg-[var(--af-bg4)] text-[var(--muted-foreground)] px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer border-none hover:bg-[var(--af-bg3)] transition-colors"
              onClick={closeForm}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ─── Filter Bar ─── */}
      {items.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
              <input
                type="text"
                className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors placeholder:text-[var(--af-text3)]"
                placeholder="Buscar por titulo, descripcion o ubicacion..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Priority Filter */}
            <select
              className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}
            >
              <option value="">Todas las prioridades</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
            {/* Assignee Filter */}
            <select
              className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors cursor-pointer"
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
            >
              <option value="">Todos los asignados</option>
              {teamUsers.map(u => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ─── Items List ─── */}
      {filteredItems.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">
            {items.length === 0 ? (
              <ClipboardList className="inline-block text-[var(--af-text3)]" size={40} />
            ) : (
              <Eye className="inline-block text-[var(--af-text3)]" size={40} />
            )}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            {items.length === 0
              ? 'No hay items en la punch list'
              : 'No se encontraron items con los filtros aplicados'}
          </div>
          <div className="text-xs text-[var(--af-text3)] mt-1">
            {items.length === 0
              ? 'Crea un nuevo item para empezar el seguimiento'
              : 'Ajusta los filtros para ver mas resultados'}
          </div>
          {items.length === 0 && (
            <button
              className="mt-4 flex items-center gap-1.5 mx-auto bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
              onClick={openCreateForm}
            >
              <Plus size={14} /> Crear Primer Item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const pri = priorityStyle[item.priority];
            const sts = statusStyle[item.status];
            const overdue = isOverdue(item.dueDate, item.status);
            const assigneeName = item.assigneeId ? getUserName(item.assigneeId) : '';
            const projectName = getProjectName(item.projectId);

            return (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-all group"
              >
                {/* Top Row: badges + actions */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.bg} ${pri.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                      {item.priority}
                    </span>
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sts.bg} ${sts.text}`}>
                      {sts.icon} {item.status}
                    </span>
                    {/* Overdue badge */}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">
                        <Clock size={10} /> Vencida
                      </span>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-lg hover:bg-[var(--af-bg3)] cursor-pointer border-none bg-transparent text-[var(--af-text3)] hover:text-[var(--foreground)] transition-colors"
                      onClick={() => openEditForm(item)}
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    {deletingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 cursor-pointer border-none hover:bg-red-500/20 transition-colors"
                          onClick={() => handleDelete(item.id)}
                        >
                          Confirmar
                        </button>
                        <button
                          className="text-[10px] px-2 py-1 rounded bg-[var(--af-bg4)] cursor-pointer border-none text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] transition-colors"
                          onClick={() => setDeletingId(null)}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer border-none bg-transparent text-[var(--af-text3)] hover:text-red-400 transition-colors"
                        onClick={() => setDeletingId(item.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="text-[14px] font-semibold text-[var(--foreground)] mb-1 leading-snug">
                  {item.title}
                </div>

                {/* Description */}
                {item.description && (
                  <div className="text-[12px] text-[var(--muted-foreground)] mb-2 leading-relaxed line-clamp-2">
                    {item.description}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--af-text3)]">
                  {/* Location */}
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-[var(--af-accent)]" />
                      {item.location}
                    </span>
                  )}
                  {/* Project */}
                  <span className="flex items-center gap-1">
                    <BarChart3 size={11} className="text-[var(--af-accent)]" />
                    {projectName}
                  </span>
                  {/* Due date */}
                  {item.dueDate && (
                    <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                      <Calendar size={11} className={overdue ? 'text-red-400' : 'text-[var(--af-accent)]'} />
                      {formatDate(item.dueDate)}
                    </span>
                  )}
                </div>

                {/* Assignee + quick actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  {/* Assignee */}
                  <div className="flex items-center gap-2">
                    {item.assigneeId ? (
                      <>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: avatarColor(item.assigneeId) }}
                        >
                          {getInitials(assigneeName)}
                        </div>
                        <span className="text-[12px] text-[var(--foreground)]">{assigneeName}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--af-text3)] italic">Sin asignar</span>
                    )}
                  </div>

                  {/* Quick status change */}
                  <div className="flex items-center gap-1">
                    {ALL_STATUSES.map(st => {
                      const stStyle = statusStyle[st];
                      const isActive = item.status === st;
                      return (
                        <button
                          key={st}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all border-none ${
                            isActive
                              ? `${stStyle.bg} ${stStyle.text}`
                              : 'bg-transparent text-[var(--af-text3)] hover:bg-[var(--af-bg4)] hover:text-[var(--foreground)]'
                          }`}
                          onClick={() => {
                            if (!isActive) handleStatusChange(item, st);
                          }}
                          title={`Cambiar a: ${st}`}
                        >
                          {stStyle.icon} {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Empty state when no project selected ─── */}
      {!selectedProject && items.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">
            <ClipboardList className="inline-block text-[var(--af-text3)]" size={40} />
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Selecciona un proyecto o crea items para empezar
          </div>
          <div className="text-xs text-[var(--af-text3)] mt-1">
            La punch list permite rastrear defectos y tareas pendientes de obra
          </div>
        </div>
      )}
    </div>
  );
}
