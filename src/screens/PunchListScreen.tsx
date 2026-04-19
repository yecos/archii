'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate } from '@/lib/helpers';
import { PUNCH_STATUS_COLORS, PUNCH_STATUSES, PUNCH_PRIORITIES, PUNCH_LOCATIONS } from '@/lib/types';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import * as fbActions from '@/lib/firestore-actions';
import { Camera } from 'lucide-react';

const PRIO_COLORS: Record<string, string> = {
  'Alta': 'bg-red-500/10 text-red-400 border-red-500/30',
  'Media': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Baja': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const LOC_COLORS: Record<string, string> = {
  'Fachada': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Interior': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'Estructura': 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  'Instalaciones': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Acabados': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'Terraza': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  'Zonas comunes': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Otro': 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]',
};

export default function PunchListScreen() {
  const {
    punchItems, projects, teamUsers, loading,
    punchFilterProject, setPunchFilterProject, punchFilterStatus, setPunchFilterStatus,
    punchFilterLocation, setPunchFilterLocation,
    setEditingId, setForms, openModal, showToast, authUser, activeTenantId,
  } = useApp();

  const filtered = useMemo(() => {
    return punchItems.filter((p: any) => {
      if (punchFilterProject && p.data.projectId !== punchFilterProject) return false;
      if (punchFilterStatus && p.data.status !== punchFilterStatus) return false;
      if (punchFilterLocation && p.data.location !== punchFilterLocation) return false;
      return true;
    });
  }, [punchItems, punchFilterProject, punchFilterStatus, punchFilterLocation]);

  const stats = useMemo(() => {
    const total = punchItems.length;
    const pending = punchItems.filter((p: any) => p.data.status === 'Pendiente').length;
    const inProgress = punchItems.filter((p: any) => p.data.status === 'En progreso').length;
    const completed = punchItems.filter((p: any) => p.data.status === 'Completado').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, inProgress, completed, pct };
  }, [punchItems]);

  const getProjectName = (pid: string) => {
    const p = projects.find((pr: any) => pr.id === pid);
    return p?.data.name || '';
  };

  const getUserName = (uid: string) => {
    const u = teamUsers.find((t: any) => t.id === uid);
    return u?.data.name || '';
  };

  const handleStatusChange = async (punchId: string, newStatus: string) => {
    await fbActions.updatePunchItemStatus(punchId, newStatus, showToast, authUser, activeTenantId);
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-[var(--muted-foreground)]">{punchItems.length} items</div>
        <button
          className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
          onClick={() => { setEditingId(null); setForms(p => ({ ...p, punchTitle: '', punchDescription: '', punchLocation: 'Otro', punchStatus: 'Pendiente', punchPriority: 'Media', punchAssignedTo: '', punchDueDate: '', punchProject: '' })); openModal('punchItem'); }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nuevo item
        </button>
      </div>

      {/* Stats + progress bar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-5">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{stats.pending}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Pendiente</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{stats.inProgress}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">En progreso</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.completed}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Completado</div>
          </div>
        </div>
        <div className="relative h-2 bg-[var(--af-bg3)] rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-1 text-right">{stats.pct}% completado</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
          value={punchFilterProject}
          onChange={(e) => setPunchFilterProject(e.target.value)}
        >
          <option value="">Todos los proyectos</option>
          {projects.filter((p: any) => p.data.status === 'Ejecucion').map((p: any) => (
            <option key={p.id} value={p.id}>{p.data.name}</option>
          ))}
        </select>
        <select
          className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
          value={punchFilterStatus}
          onChange={(e) => setPunchFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {PUNCH_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
          value={punchFilterLocation}
          onChange={(e) => setPunchFilterLocation(e.target.value)}
        >
          <option value="">Todas las ubicaciones</option>
          {PUNCH_LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {['', ...PUNCH_STATUSES].map((status, i) => (
          <button
            key={status || 'all'}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap cursor-pointer border-none transition-colors ${
              punchFilterStatus === status
                ? 'bg-[var(--af-accent)] text-background'
                : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setPunchFilterStatus(status)}
          >
            {i === 0 ? 'Todos' : status}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {!loading && filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin items</div>
          <div className="text-[13px]">Agrega tu primer item a la punch list</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p: any) => {
            const statusCls = PUNCH_STATUS_COLORS[p.data.status] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]';
            const prioCls = PRIO_COLORS[p.data.priority] || PRIO_COLORS['Media'];
            const locCls = LOC_COLORS[p.data.location] || LOC_COLORS['Otro'];
            const projName = getProjectName(p.data.projectId);
            return (
              <div key={p.id} className={`bg-[var(--card)] border rounded-xl p-4 hover:border-[var(--input)] transition-all ${p.data.status === 'Completado' ? 'border-emerald-500/20 opacity-80' : 'border-[var(--border)]'}`}>
                {/* Badges row */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCls}`}>
                    {p.data.status}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${prioCls}`}>
                    {p.data.priority}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${locCls}`}>
                    {p.data.location}
                  </span>
                  {p.data.photos && p.data.photos.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] flex items-center gap-0.5">
                      <Camera size={10} className="stroke-current" /> {p.data.photos.length}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div className="text-[14px] font-semibold mb-1">{p.data.title}</div>
                {p.data.description && (
                  <div className="text-[12px] text-[var(--muted-foreground)] mb-3 line-clamp-2">{p.data.description}</div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-[11px] text-[var(--af-text3)] mb-3">
                  {projName && <span>📁 {projName}</span>}
                  {p.data.assignedTo && <span>👤 {getUserName(p.data.assignedTo)}</span>}
                  {p.data.dueDate && <span>📅 {fmtDate(p.data.dueDate)}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {p.data.status === 'Pendiente' && (
                    <button
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-colors"
                      onClick={() => handleStatusChange(p.id, 'En progreso')}
                    >
                      ▶ Iniciar
                    </button>
                  )}
                  {p.data.status === 'En progreso' && (
                    <button
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                      onClick={() => handleStatusChange(p.id, 'Completado')}
                    >
                      ✓ Completar
                    </button>
                  )}
                  {p.data.status === 'Completado' && (
                    <button
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer"
                      onClick={() => handleStatusChange(p.id, 'Pendiente')}
                    >
                      ↩ Reabrir
                    </button>
                  )}
                  <button className="px-1.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer" onClick={() => { setEditingId(p.id); setForms(f => ({ ...f, punchTitle: p.data.title, punchDescription: p.data.description || '', punchLocation: p.data.location || 'Otro', punchStatus: p.data.status || 'Pendiente', punchPriority: p.data.priority || 'Media', punchAssignedTo: p.data.assignedTo || '', punchDueDate: p.data.dueDate || '', punchProject: p.data.projectId || '' })); openModal('punchItem'); }}>✏️</button>
                  <button className="px-1.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer" onClick={() => fbActions.deletePunchItem(p.id, showToast, activeTenantId)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
