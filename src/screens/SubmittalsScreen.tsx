'use client';
import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate } from '@/lib/helpers';
import { SUBMITTAL_STATUS_COLORS, SUBMITTAL_STATUSES } from '@/lib/types';
import { SkeletonCard } from '@/components/ui/SkeletonLoaders';
import * as fbActions from '@/lib/firestore-actions';

export default function SubmittalsScreen() {
  const {
    submittals, projects, teamUsers, loading,
    subFilterProject, setSubFilterProject, subFilterStatus, setSubFilterStatus,
    setEditingId, setForms, openModal, showToast, authUser, activeTenantId,
  } = useApp();

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showReviewInput, setShowReviewInput] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return submittals.filter((s: any) => {
      if (subFilterProject && s.data.projectId !== subFilterProject) return false;
      if (subFilterStatus && s.data.status !== subFilterStatus) return false;
      return true;
    });
  }, [submittals, subFilterProject, subFilterStatus]);

  const stats = useMemo(() => ({
    total: submittals.length,
    draft: submittals.filter((s: any) => s.data.status === 'Borrador').length,
    inReview: submittals.filter((s: any) => s.data.status === 'En revisión').length,
    approved: submittals.filter((s: any) => s.data.status === 'Aprobado').length,
    rejected: submittals.filter((s: any) => s.data.status === 'Rechazado').length,
    returned: submittals.filter((s: any) => s.data.status === 'Devuelto').length,
  }), [submittals]);

  const getProjectName = (pid: string) => {
    const p = projects.find((pr: any) => pr.id === pid);
    return p?.data.name || 'Sin proyecto';
  };

  const getUserName = (uid: string) => {
    const u = teamUsers.find((t: any) => t.id === uid);
    return u?.data.name || uid;
  };

  const handleStatusChange = async (subId: string, newStatus: string, notes?: string) => {
    await fbActions.updateSubmittalStatus(subId, newStatus, notes || '', showToast, authUser, activeTenantId);
    setShowReviewInput(null);
    setReviewNotes(prev => { const n = { ...prev }; delete n[subId]; return n; });
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-[var(--muted-foreground)]">{submittals.length} submittals</div>
        <button
          className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
          onClick={() => { setEditingId(null); setForms(p => ({ ...p, subTitle: '', subDescription: '', subSpecification: '', subStatus: 'Borrador', subReviewer: '', subDueDate: '', subReviewNotes: '', subProject: '' })); openModal('submittal'); }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nuevo submittal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'bg-[var(--af-bg4)]' },
          { label: 'Borrador', value: stats.draft, color: 'bg-gray-500/10 text-gray-400' },
          { label: 'En revisión', value: stats.inReview, color: 'bg-amber-500/10 text-amber-400' },
          { label: 'Aprobado', value: stats.approved, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Rechazado', value: stats.rejected, color: 'bg-red-500/10 text-red-400' },
          { label: 'Devuelto', value: stats.returned, color: 'bg-purple-500/10 text-purple-400' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[11px] opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
          value={subFilterProject}
          onChange={(e) => setSubFilterProject(e.target.value)}
        >
          <option value="">Todos los proyectos</option>
          {projects.filter((p: any) => p.data.status === 'Ejecucion').map((p: any) => (
            <option key={p.id} value={p.id}>{p.data.name}</option>
          ))}
        </select>
        <select
          className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
          value={subFilterStatus}
          onChange={(e) => setSubFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {SUBMITTAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {['', ...SUBMITTAL_STATUSES].map((status, i) => (
          <button
            key={status || 'all'}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap cursor-pointer border-none transition-colors ${
              subFilterStatus === status
                ? 'bg-[var(--af-accent)] text-background'
                : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setSubFilterStatus(status)}
          >
            {i === 0 ? 'Todos' : status}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {!loading && filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin submittals</div>
          <div className="text-[13px]">Crea tu primer submittal para enviar a revisión</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: any) => {
            const statusCls = SUBMITTAL_STATUS_COLORS[s.data.status] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]';
            return (
              <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20">
                      {s.data.number}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
                      {s.data.status}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button className="px-1.5 py-0.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer" onClick={() => { setEditingId(s.id); setForms(f => ({ ...f, subTitle: s.data.title, subDescription: s.data.description || '', subSpecification: s.data.specification || '', subStatus: s.data.status || 'Borrador', subReviewer: s.data.reviewer || '', subDueDate: s.data.dueDate || '', subReviewNotes: s.data.reviewNotes || '', subProject: s.data.projectId || '' })); openModal('submittal'); }}>✏️</button>
                    <button className="px-1.5 py-0.5 rounded bg-red-500/10 text-xs cursor-pointer" onClick={() => fbActions.deleteSubmittal(s.id, showToast, activeTenantId)}>🗑</button>
                  </div>
                </div>

                {/* Title */}
                <div className="text-[14px] font-semibold mb-1">{s.data.title}</div>
                {s.data.description && (
                  <div className="text-[12px] text-[var(--muted-foreground)] mb-2 line-clamp-2">{s.data.description}</div>
                )}

                {/* Spec */}
                {s.data.specification && (
                  <div className="text-[11px] text-[var(--af-text3)] mb-2">📄 Spec: {s.data.specification}</div>
                )}

                {/* Review notes */}
                {(s.data.status === 'Rechazado' || s.data.status === 'Devuelto') && s.data.reviewNotes && (
                  <div className={`${s.data.status === 'Rechazado' ? 'bg-red-500/5 border-red-500/20' : 'bg-purple-500/5 border-purple-500/20'} border rounded-lg p-3 mb-2`}>
                    <div className="text-[10px] font-semibold mb-1">{s.data.status === 'Rechazado' ? 'MOTIVO DE RECHAZO' : 'NOTAS DE DEVOLUCIÓN'}</div>
                    <div className="text-[12px] text-[var(--foreground)]">{s.data.reviewNotes}</div>
                  </div>
                )}

                {/* Quick actions */}
                {s.data.status === 'Borrador' && (
                  <button
                    className="text-[12px] font-semibold text-[var(--af-accent)] hover:underline cursor-pointer bg-transparent border-none p-0 mb-2"
                    onClick={() => handleStatusChange(s.id, 'En revisión')}
                  >
                    → Enviar a revisión
                  </button>
                )}

                {s.data.status === 'En revisión' && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {showReviewInput === s.id ? (
                      <div className="flex gap-2 w-full">
                        <input
                          className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          placeholder="Notas de revisión (opcional)"
                          value={reviewNotes[s.id] || ''}
                          onChange={(e) => setReviewNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                        />
                        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer" onClick={() => handleStatusChange(s.id, 'Aprobado', reviewNotes[s.id])}>Aprobar</button>
                        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 cursor-pointer" onClick={() => handleStatusChange(s.id, 'Rechazado', reviewNotes[s.id])}>Rechazar</button>
                        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 cursor-pointer" onClick={() => handleStatusChange(s.id, 'Devuelto', reviewNotes[s.id])}>Devolver</button>
                        <button className="px-2 py-1.5 rounded-lg text-[11px] bg-[var(--af-bg4)] cursor-pointer" onClick={() => setShowReviewInput(null)}>✕</button>
                      </div>
                    ) : (
                      <button
                        className="text-[12px] font-semibold text-amber-400 hover:underline cursor-pointer bg-transparent border-none p-0"
                        onClick={() => setShowReviewInput(s.id)}
                      >
                        ⚖️ Revisar submittal
                      </button>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-[11px] text-[var(--af-text3)]">
                  <span>📁 {getProjectName(s.data.projectId)}</span>
                  {s.data.submittedBy && <span>👤 {s.data.submittedBy}</span>}
                  {s.data.reviewer && <span>🔍 {getUserName(s.data.reviewer)}</span>}
                  {s.data.dueDate && <span>📅 {fmtDate(s.data.dueDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
