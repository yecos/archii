'use client';
import React, { useState, useMemo } from 'react';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { Users, AlertTriangle, TrendingUp, Filter } from 'lucide-react';

/* ===== HELPERS ===== */

function avatarColor(uid: string): string {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500'];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getAssigneeIds(t: any): string[] {
  if (Array.isArray(t.data.assigneeIds) && t.data.assigneeIds.length > 0) return t.data.assigneeIds;
  if (t.data.assigneeId) return [t.data.assigneeId];
  return [];
}

/* ===== TYPES ===== */

type SortOption = 'mas-cargados' | 'menos-cargados' | 'nombre';

interface MemberWorkload {
  uid: string;
  name: string;
  role: string;
  activeCount: number;
  pendingCount: number;
  completedCount: number;
  total: number;
  activeTasks: Array<{ title: string; projectId: string }>;
  completionPct: number;
}

/* ===== COMPONENT ===== */

export default function TeamWorkloadView({ navigateTo }: { navigateTo: (screen: string, projectId?: string | null) => void }) {
  const { tasks, projects } = useFirestore();
  const { teamUsers, getUserName } = useAuth();

  const [sortBy, setSortBy] = useState<SortOption>('mas-cargados');

  /* ----- Build member workload map ----- */
  const memberWorkloads = useMemo(() => {
    const map = new Map<string, MemberWorkload>();

    // Initialize all team members
    for (const user of teamUsers) {
      map.set(user.id, {
        uid: user.id,
        name: user.data.name || getUserName(user.id),
        role: user.data.role || 'Miembro',
        activeCount: 0,
        pendingCount: 0,
        completedCount: 0,
        total: 0,
        activeTasks: [],
        completionPct: 0,
      });
    }

    // Assign tasks to members
    for (const t of tasks) {
      const assignees = getAssigneeIds(t);
      for (const uid of assignees) {
        const entry = map.get(uid);
        if (!entry) continue;

        entry.total += 1;
        const status = t.data.status as string;

        if (status === 'Completado') {
          entry.completedCount += 1;
        } else if (status === 'En progreso' || status === 'En revisión') {
          entry.activeCount += 1;
          if (entry.activeTasks.length < 3) {
            entry.activeTasks.push({ title: t.data.title, projectId: t.data.projectId });
          }
        } else {
          // "Por hacer" and any other status
          entry.pendingCount += 1;
        }
      }
    }

    // Compute completion percentage
    for (const entry of map.values()) {
      entry.completionPct = entry.total > 0 ? Math.round(((entry.activeCount + entry.completedCount) / entry.total) * 100) : 0;
    }

    return Array.from(map.values());
  }, [teamUsers, tasks, getUserName]);

  /* ----- Summary stats ----- */
  const summaryStats = useMemo(() => {
    const totalMembers = memberWorkloads.length;
    const totalTasksAcrossTeam = memberWorkloads.reduce((s, m) => s + m.total, 0);
    const avgPerMember = totalMembers > 0 ? (totalTasksAcrossTeam / totalMembers).toFixed(1) : '0';

    // Most loaded member by active tasks
    const sorted = [...memberWorkloads].sort((a, b) => b.activeCount - a.activeCount);
    const mostLoaded = sorted.length > 0 && sorted[0].activeCount > 0 ? sorted[0].name : '—';

    // Members with no tasks
    const noTaskMembers = memberWorkloads.filter(m => m.total === 0).length;

    return { totalMembers, avgPerMember, mostLoaded, noTaskMembers };
  }, [memberWorkloads]);

  /* ----- Sorted & filtered list ----- */
  const sortedMembers = useMemo(() => {
    const list = [...memberWorkloads];
    switch (sortBy) {
      case 'mas-cargados':
        list.sort((a, b) => b.activeCount - a.activeCount || b.total - a.total);
        break;
      case 'menos-cargados':
        list.sort((a, b) => a.activeCount - b.activeCount || a.total - b.total);
        break;
      case 'nombre':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [memberWorkloads, sortBy]);

  /* ----- Workload level ----- */
  const getWorkloadLevel = (active: number): { label: string; color: string; bg: string; dot: string } => {
    if (active === 0) return { label: 'Sin carga', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' };
    if (active <= 3) return { label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' };
    if (active <= 6) return { label: 'Alta', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' };
    return { label: 'Sobrecargado', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-400' };
  };

  /* ----- Progress bar color ----- */
  const getProgressColor = (pct: number): string => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  /* ----- Project name resolver ----- */
  const resolveProjectName = (pid: string): string => {
    if (!pid) return '';
    const proj = projects.find(p => p.id === pid);
    return proj?.data?.name || '';
  };

  return (
    <div className="animate-fadeIn space-y-5">
      {/* ===== SUMMARY STATS BAR ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users size={14} className="text-blue-400" />
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Equipo</span>
          </div>
          <div className="text-xl font-bold text-[var(--foreground)]">{summaryStats.totalMembers}</div>
          <div className="text-[10px] text-[var(--af-text3)]">miembros</div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-purple-400" />
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Promedio</span>
          </div>
          <div className="text-xl font-bold text-[var(--foreground)]">{summaryStats.avgPerMember}</div>
          <div className="text-[10px] text-[var(--af-text3)]">tareas/miembro</div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-400" />
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Más cargado</span>
          </div>
          <div className="text-sm font-bold text-[var(--foreground)] truncate" title={summaryStats.mostLoaded}>
            {summaryStats.mostLoaded}
          </div>
          <div className="text-[10px] text-[var(--af-text3)]">mayor carga activa</div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users size={14} className="text-emerald-400" />
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Disponibles</span>
          </div>
          <div className="text-xl font-bold text-[var(--foreground)]">{summaryStats.noTaskMembers}</div>
          <div className="text-[10px] text-[var(--af-text3)]">sin tareas</div>
        </div>
      </div>

      {/* ===== SORT OPTIONS ===== */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[var(--muted-foreground)]" />
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Ordenar</span>
        <select
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none cursor-pointer ml-1"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
        >
          <option value="mas-cargados">Más cargados</option>
          <option value="menos-cargados">Menos cargados</option>
          <option value="nombre">Nombre</option>
        </select>
      </div>

      {/* ===== WORKLOAD CARDS GRID ===== */}
      {sortedMembers.length === 0 && (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-sm font-medium">Sin miembros del equipo</div>
          <div className="text-xs mt-1">Los miembros aparecerán aquí cuando se registren</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedMembers.map(member => {
          const level = getWorkloadLevel(member.activeCount);
          return (
            <div
              key={member.uid}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 transition-all hover:border-[var(--input)]"
            >
              {/* Header: Avatar + Name + Role */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white ${avatarColor(member.uid)} flex-shrink-0`}>
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--foreground)] truncate">{member.name}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{member.role}</div>
                </div>
                {/* Workload level badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${level.bg} ${level.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${level.dot}`} />
                  {level.label}
                </span>
              </div>

              {/* Task count badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {member.activeCount} activas
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  {member.pendingCount} pendientes
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {member.completedCount} completadas
                </span>
              </div>

              {/* Progress bar */}
              {member.total > 0 ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--muted-foreground)]">Progreso</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] font-medium">{member.completionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--af-bg3)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(member.completionPct)}`}
                      style={{ width: `${member.completionPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <div className="text-[10px] text-[var(--muted-foreground)] italic">Sin tareas asignadas</div>
                </div>
              )}

              {/* Active task titles (up to 3) */}
              {member.activeTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Tareas activas</div>
                  {member.activeTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className="text-[var(--af-accent)] mt-0.5 flex-shrink-0">●</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[var(--foreground)] truncate block">{task.title}</span>
                        {task.projectId && resolveProjectName(task.projectId) && (
                          <span className="text-[9px] text-[var(--muted-foreground)] truncate block">
                            {resolveProjectName(task.projectId)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {member.activeCount > 3 && (
                    <div className="text-[10px] text-[var(--muted-foreground)] pl-4 italic">
                      +{member.activeCount - 3} más
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-[var(--muted-foreground)] pt-2">
        {sortedMembers.length} miembro{sortedMembers.length !== 1 ? 's' : ''} del equipo
      </div>
    </div>
  );
}
