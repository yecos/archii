'use client';
import React, { useState, useMemo } from 'react';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { Activity, Filter } from 'lucide-react';

/* ===== TYPES ===== */

type EventType =
  | 'task_completed'
  | 'task_created'
  | 'expense_added'
  | 'invoice_created'
  | 'daily_log'
  | 'notification'
  | 'approval_pending';

type FilterTab = 'all' | 'tasks' | 'financial' | 'activity';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: any; // Firestore Timestamp | Date | string
  actorUid?: string;
  actorName?: string;
}

/* ===== EVENT TYPE CONFIG ===== */

const EVENT_TYPES: Record<EventType, { icon: string; color: string; label: string }> = {
  task_completed: { icon: '✅', color: 'bg-emerald-500', label: 'Tarea completada' },
  task_created: { icon: '📋', color: 'bg-blue-500', label: 'Nueva tarea' },
  expense_added: { icon: '💰', color: 'bg-[var(--af-accent)]', label: 'Nuevo gasto' },
  invoice_created: { icon: '🧾', color: 'bg-purple-500', label: 'Nueva factura' },
  daily_log: { icon: '📝', color: 'bg-blue-400', label: 'Bitácora diaria' },
  notification: { icon: '🔔', color: 'bg-amber-500', label: 'Notificación' },
  approval_pending: { icon: '📋', color: 'bg-orange-500', label: 'Aprobación pendiente' },
};

/* ===== FILTER TABS ===== */

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'financial', label: 'Financiero' },
  { key: 'activity', label: 'Actividad' },
];

const FILTER_MAP: Record<FilterTab, EventType[]> = {
  all: ['task_completed', 'task_created', 'expense_added', 'invoice_created', 'daily_log', 'notification', 'approval_pending'],
  tasks: ['task_created', 'task_completed'],
  financial: ['expense_added', 'invoice_created'],
  activity: ['daily_log', 'notification', 'approval_pending'],
};

/* ===== HELPERS ===== */

function formatRelativeTime(date: any): string {
  try {
    const d = date?.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    if (diffDay === 1) return 'Ayer';
    if (diffDay < 7) return `Hace ${diffDay} días`;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch (err) {
    console.error('[ArchiFlow] ActivityTimeline: format relative date failed:', err);
    return '';
  }
}

function toTimestamp(date: any): number {
  try {
    const d = date?.toDate ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (err) {
    console.error('[ArchiFlow] ActivityTimeline: parse timestamp failed:', err);
    return 0;
  }
}

/* ===== COMPONENT ===== */

const MAX_VISIBLE = 30;

export default function ActivityTimeline() {
  const { tasks, expenses, pendingApprovals, projects } = useFirestore();
  const { teamUsers, getUserName } = useAuth();
  const { notifHistory } = useNotif();
  const { dailyLogs } = useComments();
  const { invoices } = useInvoice();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showAll, setShowAll] = useState(false);

  /* ===== BUILD UNIFIED TIMELINE ===== */

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    // Tasks completed (status === 'Completado', use updatedAt)
    tasks.forEach((t: any) => {
      if (t.data?.status === 'Completado' && t.data?.updatedAt) {
        const proj = projects.find((p: any) => p.id === t.data.projectId);
        events.push({
          id: `tc-${t.id}`,
          type: 'task_completed',
          title: t.data.title || 'Tarea',
          description: proj?.data?.name ? `En ${proj.data.name}` : '',
          timestamp: t.data.updatedAt,
          actorUid: t.data.updatedBy || t.data.createdBy,
          actorName: t.data.updatedBy ? getUserName(t.data.updatedBy) : t.data.createdBy ? getUserName(t.data.createdBy) : undefined,
        });
      }
    });

    // New tasks created (use createdAt, exclude completed to avoid double)
    tasks.forEach((t: any) => {
      if (t.data?.createdAt && t.data?.status !== 'Completado') {
        const proj = projects.find((p: any) => p.id === t.data.projectId);
        events.push({
          id: `tn-${t.id}`,
          type: 'task_created',
          title: t.data.title || 'Tarea',
          description: proj?.data?.name
            ? `${t.data.status || 'Por hacer'} · ${proj.data.name}`
            : t.data.status || 'Por hacer',
          timestamp: t.data.createdAt,
          actorUid: t.data.createdBy,
          actorName: t.data.createdBy ? getUserName(t.data.createdBy) : undefined,
        });
      }
    });

    // Expenses added
    expenses.forEach((e: any) => {
      if (e.data?.createdAt) {
        const proj = projects.find((p: any) => p.id === e.data.projectId);
        const amount = Number(e.data.amount) || 0;
        events.push({
          id: `exp-${e.id}`,
          type: 'expense_added',
          title: e.data.concept || 'Gasto',
          description: `$${amount.toLocaleString('es-CO')}${proj?.data?.name ? ` · ${proj.data.name}` : ''}`,
          timestamp: e.data.createdAt,
          actorUid: e.data.createdBy,
          actorName: e.data.createdBy ? getUserName(e.data.createdBy) : undefined,
        });
      }
    });

    // Invoices created
    invoices.forEach((inv: any) => {
      if (inv.data?.createdAt) {
        const total = Number(inv.data.total) || 0;
        events.push({
          id: `inv-${inv.id}`,
          type: 'invoice_created',
          title: `Factura ${inv.data.number || ''}`.trim() || 'Factura',
          description: `$${total.toLocaleString('es-CO')} · ${inv.data.projectName || ''}`,
          timestamp: inv.data.createdAt,
          actorUid: inv.data.createdBy,
          actorName: inv.data.createdBy ? getUserName(inv.data.createdBy) : undefined,
        });
      }
    });

    // Daily logs added
    dailyLogs.forEach((log: any) => {
      if (log.data?.createdAt) {
        events.push({
          id: `dl-${log.id}`,
          type: 'daily_log',
          title: `Bitácora ${log.data.date || ''}`,
          description: log.data.supervisor ? `Supervisor: ${log.data.supervisor}` : '',
          timestamp: log.data.createdAt,
          actorUid: log.data.createdBy,
          actorName: log.data.createdBy ? getUserName(log.data.createdBy) : log.data.supervisor || undefined,
        });
      }
    });

    // Notifications from history
    notifHistory.forEach((n: any) => {
      if (n.timestamp) {
        events.push({
          id: `notif-${n.id}`,
          type: 'notification',
          title: n.title || 'Notificación',
          description: n.body || '',
          timestamp: n.timestamp,
        });
      }
    });

    // Pending approvals
    pendingApprovals.forEach((a: any) => {
      if (a.data?.createdAt) {
        events.push({
          id: `appr-${a.id}`,
          type: 'approval_pending',
          title: a.data.title || 'Aprobación pendiente',
          description: a.data.projectName
            ? `${a.data.type || 'general'} · ${a.data.projectName}`
            : a.data.type || 'general',
          timestamp: a.data.createdAt,
          actorUid: a.data.requestedBy,
          actorName: a.data.requestedByName || (a.data.requestedBy ? getUserName(a.data.requestedBy) : undefined),
        });
      }
    });

    // Sort by most recent first
    events.sort((a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp));

    return events;
  }, [tasks, expenses, pendingApprovals, projects, notifHistory, dailyLogs, invoices, getUserName]);

  /* ===== FILTER ===== */

  const filteredEvents = useMemo(() => {
    const allowed = FILTER_MAP[activeFilter];
    return allEvents.filter(e => allowed.includes(e.type));
  }, [allEvents, activeFilter]);

  const visibleEvents = showAll ? filteredEvents : filteredEvents.slice(0, MAX_VISIBLE);
  const hasMore = filteredEvents.length > MAX_VISIBLE;

  /* ===== RENDER ===== */

  return (
    <div className="space-y-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--af-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Actividad reciente</h3>
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ===== FILTER TABS ===== */}
      <div className="flex items-center gap-1 p-1 bg-[var(--af-bg4)] rounded-lg">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveFilter(tab.key); setShowAll(false); }}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium
              transition-all cursor-pointer whitespace-nowrap
              ${activeFilter === tab.key
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]/50'}
            `}
          >
            <Filter size={10} className="opacity-60" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== EMPTY STATE ===== */}
      {filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--af-text3)]">
          <div className="text-3xl mb-3">📭</div>
          <div className="text-sm font-medium">Sin actividad reciente</div>
          <div className="text-xs mt-1 text-[var(--muted-foreground)]">
            Los cambios y eventos aparecerán aquí
          </div>
        </div>
      )}

      {/* ===== TIMELINE ===== */}
      {filteredEvents.length > 0 && (
        <div className="relative space-y-0">
          {visibleEvents.map((event, idx) => {
            const config = EVENT_TYPES[event.type];
            const isLast = idx === visibleEvents.length - 1;
            const timeStr = formatRelativeTime(event.timestamp);

            return (
              <div key={event.id} className="relative flex gap-3 animate-fadeIn">
                {/* ===== LEFT: Dot + Line ===== */}
                <div className="flex flex-col items-center shrink-0" style={{ width: '20px' }}>
                  {/* Dot */}
                  <div
                    className={`w-3 h-3 rounded-full ${config.color} shrink-0 mt-1.5 ring-2 ring-[var(--card)]`}
                  />
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-[var(--border)] min-h-[8px]" />
                  )}
                </div>

                {/* ===== RIGHT: Content Card ===== */}
                <div className="flex-1 pb-4 min-w-0">
                  <div className="bg-[var(--af-bg3)] rounded-lg p-3 hover:bg-[var(--af-bg4)] transition-colors">
                    {/* Header row */}
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm shrink-0 mt-px">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
                          {event.title}
                        </div>
                        {/* Description */}
                        {event.description && (
                          <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 truncate">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta row: time + actor */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {event.actorName && (
                          <>
                            <span className="text-[10px] font-medium text-[var(--af-text3)] truncate">
                              {event.actorName}
                            </span>
                            <span className="text-[10px] text-[var(--border)]">·</span>
                          </>
                        )}
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                          {config.label}
                        </span>
                      </div>
                      {timeStr && (
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 ml-auto">
                          {timeStr}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ===== VER MÁS ===== */}
          {hasMore && !showAll && (
            <div className="flex items-center justify-center pt-2 pb-4 pl-[20px]">
              <button
                onClick={() => setShowAll(true)}
                className="text-[11px] font-medium text-[var(--af-accent)] hover:underline cursor-pointer transition-colors"
              >
                Ver más ({filteredEvents.length - MAX_VISIBLE} eventos restantes)
              </button>
            </div>
          )}

          {showAll && filteredEvents.length > MAX_VISIBLE && (
            <div className="flex items-center justify-center pt-2 pb-4 pl-[20px]">
              <button
                onClick={() => setShowAll(false)}
                className="text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
              >
                Ver menos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
