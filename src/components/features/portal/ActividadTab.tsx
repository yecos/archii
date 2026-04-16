import React, { useMemo } from 'react';
import { fmtDateTime } from '@/lib/helpers';
import type { Comment, FirestoreTimestamp } from '@/lib/types';

interface ActivityLog {
  id: string;
  data: {
    date: string;
    activities?: string[];
    observations?: string;
    supervisor?: string;
    createdAt: FirestoreTimestamp | null;
  };
}

interface ActividadTabProps {
  comments: Comment[];
  logs: ActivityLog[];
}

export default function ActividadTab({ comments, logs }: ActividadTabProps) {
  // Combine and sort by time
  const activity = useMemo(() => {
    const items: {
      id: string;
      type: 'comment' | 'log';
      title: string;
      subtitle: string;
      time: FirestoreTimestamp | null;
      icon: string;
      userName: string;
    }[] = [];

    comments.forEach((c) => {
      items.push({
        id: c.id,
        type: 'comment',
        title: c.data.text?.substring(0, 120) || '',
        subtitle: '',
        time: c.data.createdAt,
        icon: '💬',
        userName: c.data.userName || 'Usuario',
      });
    });

    logs.forEach((l) => {
      items.push({
        id: l.id,
        type: 'log',
        title: `Bitácora — ${l.data.date}`,
        subtitle:
          (l.data.activities || []).slice(0, 3).join(', ') ||
          l.data.observations ||
          'Sin detalles',
        time: l.data.createdAt,
        icon: '📝',
        userName: l.data.supervisor || 'Supervisor',
      });
    });

    items.sort((a, b) => {
      const ta = a.time?.toDate?.() || new Date(0);
      const tb = b.time?.toDate?.() || new Date(0);
      return tb.getTime() - ta.getTime();
    });

    return items;
  }, [comments, logs]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-lg font-bold">{comments.length}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Comentarios</div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-lg font-bold">{logs.length}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Bitácoras de obra</div>
        </div>
      </div>

      {/* Activity Feed */}
      {activity.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">Sin actividad registrada</div>
        </div>
      ) : (
        <div
          className="space-y-3 max-h-[600px] overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {activity.map((item) => (
            <div key={item.id + item.type} className="card-elevated rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] flex items-center justify-center text-base flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">
                      {item.userName}
                    </span>
                    <span className="text-[10px] text-[var(--af-text3)]">
                      {item.type === 'comment' ? 'comentó' : 'registro bitácora'}
                    </span>
                  </div>
                  <div className="text-[13px] text-[var(--foreground)] leading-relaxed">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      {item.subtitle}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--af-text3)] mt-1.5">
                    {fmtDateTime(item.time)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
