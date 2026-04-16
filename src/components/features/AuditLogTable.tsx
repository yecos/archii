'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  AuditEntry,
  AuditFilters,
  AuditEntityType,
  AuditAction,
} from '@/lib/audit-trail';
import {
  getAuditLogs,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_ICONS,
  AUDIT_ACTION_LABELS,
  AUDIT_FIELD_LABELS,
  formatChange,
  formatValue,
} from '@/lib/audit-trail';
import { fmtDateTime } from '@/lib/helpers';
import type { FirestoreTimestamp } from '@/lib/types';
import { ChevronDown, ChevronRight, Filter, RefreshCw, Loader2 } from 'lucide-react';

/* ===== TYPES ===== */

interface AuditLogTableProps {
  /** Optional team users for resolving user names */
  teamUsers?: Array<{ id: string; data: { name: string; email: string } }>;
  /** Optional projects for resolving project names */
  projects?: Array<{ id: string; data: { name: string } }>;
}

interface InternalFilters extends AuditFilters {
  action?: AuditAction | 'all';
}

/* ===== COMPONENT ===== */

export default function AuditLogTable({ teamUsers = [], projects = [] }: AuditLogTableProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [filterEntityType, setFilterEntityType] = useState<AuditEntityType | 'all'>('all');
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string | 'all'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Load logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AuditFilters = {
        entityType: filterEntityType,
        userId: filterUser,
        projectId: filterProject,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        limit: 50,
      };
      const result = await getAuditLogs(filters);
      setLogs(result);
    } catch (err) {
      console.error('[AuditLogTable] Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filterEntityType, filterUser, filterProject, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filter by action
  const filteredLogs = useMemo(() => {
    if (filterAction === 'all') return logs;
    return logs.filter(l => l.data.action === filterAction);
  }, [logs, filterAction]);

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Resolve user name
  const resolveUserName = (uid: string): string => {
    if (!uid) return '—';
    const user = teamUsers.find(u => u.id === uid);
    return user?.data?.name || uid.substring(0, 8) + '...';
  };

  // Resolve project name
  const resolveProjectName = (projectId: string | undefined): string => {
    if (!projectId) return '—';
    const proj = projects.find(p => p.id === projectId);
    return proj?.data?.name || 'Proyecto';
  };

  // Action color classes
  const actionColor = (action: AuditAction): string => {
    switch (action) {
      case 'create': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'update': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'delete': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] border-[var(--border)]';
    }
  };

  // Action dot color
  const actionDotColor = (action: AuditAction): string => {
    switch (action) {
      case 'create': return 'bg-emerald-400';
      case 'update': return 'bg-amber-400';
      case 'delete': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  // Unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const userIds = [...new Set(logs.map(l => l.data.userId).filter(Boolean))];
    return userIds.map(uid => ({
      id: uid,
      name: resolveUserName(uid),
    }));
  }, [logs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique entity types present in logs
  const presentEntityTypes = useMemo(() => {
    return [...new Set(logs.map(l => l.data.entityType))];
  }, [logs]);

  // Unique projects present in logs
  const presentProjects = useMemo(() => {
    const projectIds = [...new Set(logs.map(l => l.data.projectId).filter(Boolean))];
    return projectIds.map(pid => ({
      id: pid,
      name: resolveProjectName(pid),
    }));
  }, [logs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* ===== FILTER BAR ===== */}
      <div className="skeuo-panel rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-[var(--muted-foreground)]" />
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Filtros</span>
          <button
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer skeuo-btn hover:bg-[var(--card)] transition-all"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Entity Type */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-medium mb-1 block">Tipo de Entidad</label>
            <select
              className="w-full skeuo-input rounded-lg px-2.5 py-1.5 text-xs cursor-pointer"
              value={filterEntityType}
              onChange={e => setFilterEntityType(e.target.value as AuditEntityType | 'all')}
            >
              <option value="all">Todos</option>
              {presentEntityTypes.map(et => (
                <option key={et} value={et}>{AUDIT_ENTITY_ICONS[et]} {AUDIT_ENTITY_LABELS[et]}</option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-medium mb-1 block">Acción</label>
            <select
              className="w-full skeuo-input rounded-lg px-2.5 py-1.5 text-xs cursor-pointer"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as AuditAction | 'all')}
            >
              <option value="all">Todos</option>
              <option value="create">🟢 Crear</option>
              <option value="update">🟡 Actualizar</option>
              <option value="delete">🔴 Eliminar</option>
            </select>
          </div>

          {/* User */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-medium mb-1 block">Usuario</label>
            <select
              className="w-full skeuo-input rounded-lg px-2.5 py-1.5 text-xs cursor-pointer"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            >
              <option value="all">Todos</option>
              {uniqueUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-medium mb-1 block">Rango de Fechas</label>
            <div className="flex gap-1.5">
              <input
                type="date"
                className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--input)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                placeholder="Desde"
              />
              <input
                type="date"
                className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--input)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                placeholder="Hasta"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Creaciones</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{logs.filter(l => l.data.action === 'create').length}</div>
        </div>
        <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Actualizaciones</div>
          <div className="text-lg font-bold text-amber-400 mt-0.5">{logs.filter(l => l.data.action === 'update').length}</div>
        </div>
        <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Eliminaciones</div>
          <div className="text-lg font-bold text-red-400 mt-0.5">{logs.filter(l => l.data.action === 'delete').length}</div>
        </div>
      </div>

      {/* ===== LOADING STATE ===== */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">Cargando registro de cambios...</span>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!loading && filteredLogs.length === 0 && (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-medium">Sin registros de auditoría</div>
          <div className="text-xs mt-1">Los cambios realizados en la aplicación aparecerán aquí</div>
        </div>
      )}

      {/* ===== DESKTOP TABLE ===== */}
      {!loading && filteredLogs.length > 0 && (
        <>
          {/* Desktop view */}
          <div className="hidden md:block skeuo-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold w-8"></th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Fecha</th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Usuario</th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Acción</th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Entidad</th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Nombre</th>
                    <th className="text-left py-2.5 px-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Cambios</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(entry => {
                    const isExpanded = expandedRows.has(entry.id);
                    const hasChanges = entry.data.changes && Object.keys(entry.data.changes).length > 0;
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          className="border-b border-[var(--border)]/50 hover:bg-[var(--af-bg4)]/30 cursor-pointer transition-colors"
                          onClick={() => hasChanges ? toggleRow(entry.id) : undefined}
                        >
                          {/* Expand toggle */}
                          <td className="py-2.5 px-3">
                            {hasChanges ? (
                              isExpanded
                                ? <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                                : <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
                            ) : <div className="w-3.5" />}
                          </td>
                          {/* Date */}
                          <td className="py-2.5 px-3 text-[var(--muted-foreground)] whitespace-nowrap">
                            {entry.data.timestamp
                              ? fmtDateTime(entry.data.timestamp as FirestoreTimestamp)
                              : '—'}
                          </td>
                          {/* User */}
                          <td className="py-2.5 px-3 font-medium">
                            {entry.data.userName}
                          </td>
                          {/* Action */}
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${actionColor(entry.data.action)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${actionDotColor(entry.data.action)}`} />
                              {AUDIT_ACTION_LABELS[entry.data.action]}
                            </span>
                          </td>
                          {/* Entity Type */}
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1">
                              <span>{AUDIT_ENTITY_ICONS[entry.data.entityType]}</span>
                              <span className="text-[var(--muted-foreground)]">{AUDIT_ENTITY_LABELS[entry.data.entityType]}</span>
                            </span>
                          </td>
                          {/* Entity Name */}
                          <td className="py-2.5 px-3 font-medium max-w-[200px] truncate" title={String(entry.data.entityName ?? '')}>
                            {String(entry.data.entityName ?? '')}
                          </td>
                          {/* Changes preview */}
                          <td className="py-2.5 px-3 text-[var(--muted-foreground)] max-w-[300px]">
                            {hasChanges ? (
                              <span className="text-[10px]">
                                {Object.keys(entry.data.changes!).length} cambio{Object.keys(entry.data.changes!).length > 1 ? 's' : ''}
                                {isExpanded ? '' : ' — haz clic para ver'}
                              </span>
                            ) : (
                              <span className="text-[10px] italic">—</span>
                            )}
                          </td>
                        </tr>
                        {/* Expanded changes */}
                        {isExpanded && hasChanges && (
                          <tr>
                            <td colSpan={7} className="px-3 py-2 bg-[var(--af-bg4)]/20">
                              <div className="ml-6 space-y-1">
                                {Object.entries(entry.data.changes!).map(([field, change]) => (
                                  <div key={field} className="flex items-start gap-2 text-[11px]">
                                    <span className="text-[var(--muted-foreground)] font-medium whitespace-nowrap">
                                      {AUDIT_FIELD_LABELS[field] || field}:
                                    </span>
                                    <span className="text-red-400 line-through">{formatValue(change.old)}</span>
                                    <span className="text-[var(--muted-foreground)]">→</span>
                                    <span className="text-emerald-400 font-medium">{formatValue(change.new)}</span>
                                  </div>
                                ))}
                                {entry.data.projectId && (
                                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1 pt-1 border-t border-[var(--border)]/50">
                                    Proyecto: {resolveProjectName(entry.data.projectId)}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view — Card list */}
          <div className="md:hidden space-y-2 max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {filteredLogs.map(entry => {
              const isExpanded = expandedRows.has(entry.id);
              const hasChanges = entry.data.changes && Object.keys(entry.data.changes).length > 0;
              return (
                <div
                  key={entry.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span>{AUDIT_ENTITY_ICONS[entry.data.entityType]}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${actionColor(entry.data.action)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${actionDotColor(entry.data.action)}`} />
                      {AUDIT_ACTION_LABELS[entry.data.action]}
                    </span>
                    <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">
                      {entry.data.timestamp ? fmtDateTime(entry.data.timestamp as FirestoreTimestamp) : '—'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="text-sm font-medium mb-1">{String(entry.data.entityName ?? '')}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mb-2">
                    <span>{AUDIT_ENTITY_LABELS[entry.data.entityType]}</span>
                    <span className="mx-1.5">·</span>
                    <span>{String(entry.data.userName ?? '')}</span>
                    {entry.data.projectId && (
                      <>
                        <span className="mx-1.5">·</span>
                        <span>{resolveProjectName(entry.data.projectId)}</span>
                      </>
                    )}
                  </div>

                  {/* Changes */}
                  {hasChanges && (
                    <div>
                      <button
                        className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        onClick={() => toggleRow(entry.id)}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {Object.keys(entry.data.changes!).length} cambio{Object.keys(entry.data.changes!).length > 1 ? 's' : ''}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-[var(--border)]">
                          {Object.entries(entry.data.changes!).map(([field, change]) => (
                            <div key={field} className="text-[11px]">
                              <span className="text-[var(--muted-foreground)] font-medium">{AUDIT_FIELD_LABELS[field] || field}: </span>
                              <span className="text-red-400 line-through">{formatValue(change.old)}</span>
                              <span className="text-[var(--muted-foreground)]"> → </span>
                              <span className="text-emerald-400 font-medium">{formatValue(change.new)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="text-center text-[10px] text-[var(--muted-foreground)] pt-2">
            Mostrando {filteredLogs.length} registros más recientes
          </div>
        </>
      )}
    </div>
  );
}
