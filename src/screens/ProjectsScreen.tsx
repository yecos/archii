'use client';
import React, { useState, useMemo } from 'react';
import { Plus, Upload, Search, X, Grid3X3, List, ArrowUpDown, Calendar, ClipboardCheck, Globe, Building2, Pencil, Trash2, MapPin } from 'lucide-react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { SkeletonProjects } from '@/components/ui/SkeletonLoaders';
import { statusColor, fmtCOP, fmtDate } from '@/lib/helpers';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerContainer';
import EmptyState from '@/components/ui/EmptyState';

type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'budget-desc' | 'progress-desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Nombre (A-Z)' },
  { value: 'name-desc', label: 'Nombre (Z-A)' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'budget-desc', label: 'Presupuesto (mayor a menor)' },
  { value: 'progress-desc', label: 'Progreso (mayor a menor)' },
];

export default function ProjectsScreen() {
  const { forms, setForms, setEditingId, openModal } = useUI();
  const { loading, getMyRole, visibleProjects } = useAuth();
  const { projects, companies, tasks, expenses, openEditProject, deleteProject, openProject } = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const viewMode = forms.projView || 'grid';

  // Filtered, searched, and sorted projects
  const filteredProjects = useMemo(() => {
    let result = visibleProjects(projects);

    // Status filter
    if (forms.projFilter) {
      result = result.filter(p => p.data.status === forms.projFilter);
    }

    // Company filter
    if (forms.projCompanyFilter) {
      result = result.filter(p => p.data.companyId === forms.projCompanyFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const d = p.data;
        const compName = companies.find(c => c.id === d.companyId)?.data?.name || '';
        return (
          d.name.toLowerCase().includes(q) ||
          (d.client && d.client.toLowerCase().includes(q)) ||
          (compName && compName.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.data.name.localeCompare(b.data.name);
        case 'name-desc':
          return b.data.name.localeCompare(a.data.name);
        case 'newest': {
          const ta = a.data.createdAt?.seconds || 0;
          const tb = b.data.createdAt?.seconds || 0;
          return tb - ta;
        }
        case 'oldest': {
          const ta = a.data.createdAt?.seconds || 0;
          const tb = b.data.createdAt?.seconds || 0;
          return ta - tb;
        }
        case 'budget-desc':
          return (b.data.budget || 0) - (a.data.budget || 0);
        case 'progress-desc':
          return (b.data.progress || 0) - (a.data.progress || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [projects, forms.projFilter, forms.projCompanyFilter, searchQuery, sortOption, companies, visibleProjects]);

  // Precompute task counts and spent budgets per project
  const projectMeta = useMemo(() => {
    const meta: Record<string, { totalTasks: number; completedTasks: number; spent: number }> = {};
    tasks.forEach(t => {
      const pid = t.data.projectId;
      if (!pid) return;
      if (!meta[pid]) meta[pid] = { totalTasks: 0, completedTasks: 0, spent: 0 };
      meta[pid].totalTasks++;
      if (t.data.status === 'Completado') meta[pid].completedTasks++;
    });
    expenses.forEach(e => {
      const pid = e.data.projectId;
      if (!pid) return;
      if (!meta[pid]) meta[pid] = { totalTasks: 0, completedTasks: 0, spent: 0 };
      meta[pid].spent += Number(e.data.amount) || 0;
    });
    return meta;
  }, [tasks, expenses]);

  const STATUS_TABS = [
    { k: 'Todos', v: '' },
    { k: 'Concepto', v: 'Concepto' },
    { k: 'Diseño', v: 'Diseno' },
    { k: 'Ejecución', v: 'Ejecucion' },
    { k: 'Terminados', v: 'Terminado' },
  ];

  const hasActiveFilters = searchQuery || sortOption !== 'newest' || viewMode !== 'grid';

  return (
    <div className="animate-fadeIn">
      {/* Top bar: status tabs + actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 overflow-x-auto flex-wrap">
          {STATUS_TABS.map(tab => {
            const projs = visibleProjects(projects);
            const count = tab.v ? projs.filter(p => p.data.status === tab.v).length : projs.length;
            return (
              <button
                key={tab.k}
                className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${
                  (forms.projFilter || '') === tab.v
                    ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => setForms(p => ({ ...p, projFilter: tab.v }))}
              >
                {tab.k} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 skeuo-btn text-[var(--foreground)] px-3 py-2 text-xs font-medium"
            onClick={() => openModal('importData')}
          >
            <Upload size={13} /> Importar
          </button>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            onClick={() => {
              setEditingId(null);
              openModal('project');
            }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />Nuevo proyecto
          </button>
        </div>
      </div>

      {/* Company filter bar */}
      {(getMyRole() === 'Admin' || getMyRole() === 'Director') && companies.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-1">
          <button
            className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${
              !forms.projCompanyFilter
                ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]'
                : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'
            }`}
            onClick={() => setForms(p => ({ ...p, projCompanyFilter: '' }))}
          >
            <Globe size={12} className="inline mr-1" />Todas las empresas
          </button>
          {companies.map(c => (
            <button
              key={c.id}
              className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all whitespace-nowrap border ${
                forms.projCompanyFilter === c.id
                  ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]'
                  : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/30'
              }`}
              onClick={() => setForms(p => ({ ...p, projCompanyFilter: c.id }))}
            >
              <Building2 size={12} className="inline mr-1" />{c.data.name}
            </button>
          ))}
        </div>
      )}

      {/* Search, sort, and view toggle bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
          <input
            type="text"
            placeholder="Buscar proyecto, cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-[13px] skeuo-input pl-8 pr-3 py-1.5 w-[200px] sm:w-[240px]"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--af-text3)] cursor-pointer"
              onClick={() => setSearchQuery('')}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative flex items-center">
          <ArrowUpDown size={14} className="absolute left-2.5 text-[var(--af-text3)] pointer-events-none z-10" />
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value as SortOption)}
            className="text-[13px] skeuo-input pl-8 pr-7 py-1.5 cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1">
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${
              viewMode === 'grid'
                ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm'
                : 'text-[var(--muted-foreground)]'
            }`}
            onClick={() => setForms(p => ({ ...p, projView: 'grid' }))}
            title="Vista de cuadrícula"
          >
            <Grid3X3 size={14} />
          </button>
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${
              viewMode === 'list'
                ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm'
                : 'text-[var(--muted-foreground)]'
            }`}
            onClick={() => setForms(p => ({ ...p, projView: 'list' }))}
            title="Vista de lista"
          >
            <List size={14} />
          </button>
        </div>

        {/* Results count */}
        <span className="text-[12px] text-[var(--muted-foreground)] ml-auto">
          {filteredProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && <SkeletonProjects />}

      {!loading && filteredProjects.length === 0 && (
        <EmptyState
          illustration={searchQuery ? 'search' : 'projects'}
          title={searchQuery ? 'Sin resultados' : 'Sin proyectos'}
          description={searchQuery ? 'Intenta con otra búsqueda' : 'Crea tu primer proyecto para comenzar'}
        />
      )}

      {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {filteredProjects.map(p => {
            const d = p.data;
            const prog = d.progress || 0;
            const compName = companies.find(c => c.id === d.companyId)?.data?.name;
            const meta = projectMeta[p.id] || { totalTasks: 0, completedTasks: 0, spent: 0 };
            return (
              <StaggerItem key={p.id}>
                <div
                  className="card-glass card-glass-hover tilt-hover rounded-xl p-4 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99] relative overflow-hidden"
                  onClick={() => openProject(p.id)}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--af-accent)] opacity-0 transition-opacity hover:!opacity-100" />
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full badge-gradient ${statusColor(d.status)}`}>
                        {d.status || 'Concepto'}
                      </span>
                      {compName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--af-text3)]">
                          <Building2 size={10} className="inline mr-0.5" />{compName}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        className="px-2.5 py-1.5 rounded bg-[var(--af-bg4)] text-xs cursor-pointer hover:bg-[var(--af-bg3)]"
                        onClick={() => openEditProject(p)}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="px-2.5 py-1.5 rounded bg-red-500/10 text-xs cursor-pointer hover:bg-red-500/20"
                        onClick={() => deleteProject(p.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold mb-1">{d.name}</div>
                  <div className="text-xs text-[var(--af-text3)] mb-3">
                    {d.location ? <><MapPin size={10} className="inline mr-0.5" />{d.location}</> : ''}{d.client ? ' · ' + d.client : ''}
                  </div>
                  <div className="flex gap-4 mb-3">
                    <div>
                      <div className="text-lg font-semibold">{prog}%</div>
                      <div className="text-[10px] text-[var(--af-text3)]">Progreso</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(d.budget)}</div>
                      <div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full progress-animated ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`}
                      style={{ width: prog + '%' }}
                    />
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {!loading && filteredProjects.length > 0 && viewMode === 'list' && (
        <StaggerContainer>
          <div className="card-elevated overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_120px_90px_110px_100px_100px_80px] gap-3 px-4 py-2.5 text-[11px] text-[var(--af-text3)] font-medium uppercase tracking-wider border-b border-[var(--border)] bg-[var(--af-bg3)]">
              <span>Proyecto</span>
              <span>Cliente</span>
              <span>Estado</span>
              <span>Presupuesto</span>
              <span>Tareas</span>
              <span>Progreso</span>
              <span className="text-right">Acciones</span>
            </div>
            {filteredProjects.map((p, idx) => {
              const d = p.data;
              const prog = d.progress || 0;
              const compName = companies.find(c => c.id === d.companyId)?.data?.name;
              const meta = projectMeta[p.id] || { totalTasks: 0, completedTasks: 0, spent: 0 };
              const isLast = idx === filteredProjects.length - 1;
              return (
                <StaggerItem key={p.id}>
                  <div
                    className={`grid sm:grid-cols-[1fr_120px_90px_110px_100px_100px_80px] gap-2 sm:gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-[var(--af-bg3)] group ${
                      !isLast ? 'border-b border-[var(--border)]' : ''
                    }`}
                    onClick={() => openProject(p.id)}
                  >
                    {/* Project name + company + location */}
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">{d.name}</div>
                      <div className="text-[11px] text-[var(--af-text3)] flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {d.location && <span><MapPin size={10} className="inline mr-0.5" />{d.location}</span>}
                        {compName && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)]"><Building2 size={10} className="inline mr-0.5" />{compName}</span>}
                        {d.endDate && (
                          <span className="flex items-center gap-0.5">
                            <Calendar size={10} /> {fmtDate(d.endDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Client */}
                    <div className="text-[12px] text-[var(--muted-foreground)] truncate hidden sm:block items-center">
                      <span className="line-clamp-1">{d.client || '—'}</span>
                    </div>

                    {/* Status */}
                    <div className="hidden sm:block">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full badge-gradient ${statusColor(d.status)}`}>
                        {d.status || 'Concepto'}
                      </span>
                    </div>

                    {/* Budget */}
                    <div className="hidden sm:block">
                      <div className="text-[13px] font-semibold text-[var(--af-accent)]">{fmtCOP(d.budget)}</div>
                      {meta.spent > 0 && (
                        <div className="text-[10px] text-[var(--af-text3)]">
                          Gastado: {fmtCOP(meta.spent)}
                        </div>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 text-[12px]">
                        <ClipboardCheck size={12} className="text-[var(--af-text3)]" />
                        {meta.completedTasks}/{meta.totalTasks}
                      </div>
                      {meta.totalTasks > 0 && (
                        <div className="w-full h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full progress-animated ${meta.completedTasks === meta.totalTasks ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`}
                            style={{ width: `${(meta.completedTasks / meta.totalTasks) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full progress-animated ${prog >= 80 ? 'bg-emerald-500' : prog >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`}
                          style={{ width: prog + '%' }}
                        />
                      </div>
                      <span className="text-[12px] font-medium w-8 text-right">{prog}%</span>
                    </div>

                    {/* Actions */}
                    <div className="sm:flex items-center justify-end gap-1 transition-opacity duration-150">
                      <button
                        className="text-[11px] px-2 py-1.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20"
                        onClick={e => { e.stopPropagation(); openEditProject(p); }}
                      >
                        Editar
                      </button>
                      <button
                        className="text-[11px] px-2 py-1.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20"
                        onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Mobile: status badge visible inline */}
                    <div className="sm:hidden flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full badge-gradient ${statusColor(d.status)}`}>
                        {d.status || 'Concepto'}
                      </span>
                      <span className="text-[11px] text-[var(--af-text3)]">
                        {meta.completedTasks}/{meta.totalTasks} tareas
                      </span>
                      <span className="text-[11px] font-medium ml-auto">{prog}%</span>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>
      )}
    </div>
  );
}
