'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SkeletonProjects } from '@/components/ui/SkeletonLoaders';
import { statusColor, fmtCOP } from '@/lib/helpers';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { Pencil, Trash2, Search, AlertTriangle, Clock } from 'lucide-react';

export default function ProjectsScreen() {
  const {
    loading, projects, companies, forms, setForms, setEditingId, openModal,
    visibleProjects, openEditProject, deleteProject, openProject, getMyRole, tasks,
  } = useApp();

  const handleNewProject = () => {
    setEditingId(null);
    openModal('project');
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredProjects = useMemo(() => {
    let projs = visibleProjects();
    if (forms.projFilter) projs = projs.filter((p: any) => p.data.status === forms.projFilter);
    if (forms.projCompanyFilter) projs = projs.filter((p: any) => p.data.companyId === forms.projCompanyFilter);
    if (forms.projSearch) {
      const q = forms.projSearch.toLowerCase();
      projs = projs.filter((p: any) =>
        (p.data.name || '').toLowerCase().includes(q) ||
        (p.data.client || '').toLowerCase().includes(q) ||
        (p.data.location || '').toLowerCase().includes(q)
      );
    }
    return projs;
  }, [forms.projFilter, forms.projCompanyFilter, forms.projSearch, projects]);

  const getProjectStats = (projectId: string) => {
    const projTasks = tasks.filter((t: any) => t.data.projectId === projectId);
    const pending = projTasks.filter((t: any) => t.data.status !== 'Completado').length;
    const overdue = projTasks.filter((t: any) => t.data.status !== 'Completado' && t.data.dueDate && t.data.dueDate < today).length;
    return { pending, overdue };
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate + 'T23:59:59').getTime() - new Date().getTime()) / 86400000);
    return diff;
  };

  const statusTabs = [
    { k: 'Todos', v: '' },
    { k: 'Concepto', v: 'Concepto' },
    { k: 'Diseño', v: 'Diseno' },
    { k: 'Ejecución', v: 'Ejecucion' },
    { k: 'Terminados', v: 'Terminado' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Search bar + New project button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
          <input
            value={forms.projSearch || ''}
            onChange={e => setForms(p => ({ ...p, projSearch: e.target.value }))}
            placeholder="Buscar por nombre, cliente o ubicación..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] outline-none focus:border-[var(--af-accent)]/50 placeholder:text-[var(--muted-foreground)] transition-colors"
          />
        </div>
        <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={handleNewProject}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Nuevo proyecto
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 overflow-x-auto mb-3 scrollbar-none">
        {statusTabs.map(tab => {
          const projs = visibleProjects();
          const count = tab.v ? projs.filter((p: any) => p.data.status === tab.v).length : projs.length;
          return (
            <button key={tab.k} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${(forms.projFilter || '') === tab.v ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, projFilter: tab.v }))}>
              {tab.k} ({count})
            </button>
          );
        })}
      </div>

      {/* Company filter pills */}
      {(getMyRole() === 'Admin' || getMyRole() === 'Director') && companies.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-1">
          <button className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${!forms.projCompanyFilter ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => setForms(p => ({ ...p, projCompanyFilter: '' }))}>
            Todas las empresas
          </button>
          {companies.map(c => (
            <button key={c.id} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${forms.projCompanyFilter === c.id ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={() => setForms(p => ({ ...p, projCompanyFilter: c.id }))}>
              {c.data.name}
            </button>
          ))}
        </div>
      )}

      {loading && <SkeletonProjects />}

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📁</div>
          <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">Sin proyectos</div>
          <div className="text-[13px]">{forms.projSearch ? 'No se encontraron resultados' : 'Crea tu primer proyecto'}</div>
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p: any) => {
            const d = p.data;
            const prog = d.progress || 0;
            const compName = companies.find(c => c.id === d.companyId)?.data?.name;
            const stats = getProjectStats(p.id);
            const daysLeft = getDaysRemaining(d.endDate);

            return (
              <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 cursor-pointer transition-all hover:border-[var(--input)] hover:-translate-y-0.5 relative overflow-hidden group" onClick={() => openProject(p.id)}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--af-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Top: status + company + overdue badge + actions */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor(d.status)}`}>{d.status || 'Concepto'}</span>
                    {compName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--af-text3)]">{compName}</span>}
                    {stats.overdue > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{stats.overdue}
                      </span>
                    )}
                  </div>
                  {/* Desktop edit/delete */}
                  <div className="hidden md:flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button className="px-2.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => openEditProject(p)}>✏️</button>
                    <button className="px-2.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer hover:bg-red-500/20" onClick={() => deleteProject(p.id)}>🗑</button>
                  </div>
                  {/* Mobile overflow */}
                  <div className="md:hidden" onClick={e => e.stopPropagation()}>
                    <OverflowMenu
                      actions={[
                        { label: 'Editar proyecto', icon: <Pencil size={14} />, onClick: () => openEditProject(p) },
                        { label: 'Eliminar proyecto', icon: <Trash2 size={14} />, onClick: () => deleteProject(p.id), variant: 'danger', separator: true },
                      ]}
                      side="left"
                      align="end"
                    />
                  </div>
                </div>

                {/* Project name */}
                <div className="text-[15px] font-semibold mb-1 leading-tight">{d.name}</div>
                <div className="text-xs text-[var(--af-text3)] mb-3 truncate">
                  {d.location ? '📍 ' + d.location : ''}{d.location && d.client ? ' · ' : ''}{d.client || ''}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: prog + '%' }} />
                </div>

                {/* Bottom stats */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--foreground)]">{prog}%</span>
                    {d.budget > 0 && <span className="text-[var(--af-accent)] font-medium">{fmtCOP(d.budget)}</span>}
                    {stats.pending > 0 && <span className="text-[var(--muted-foreground)]">{stats.pending} tareas</span>}
                  </div>
                  {daysLeft !== null && d.status !== 'Terminado' && (
                    <span className={`flex items-center gap-1 font-medium ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft < 0 ? `-${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <FloatingActionButton onClick={handleNewProject} ariaLabel="Nuevo proyecto" />
    </div>
  );
}
