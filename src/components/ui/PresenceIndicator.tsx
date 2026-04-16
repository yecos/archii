'use client';
import React, { useMemo } from 'react';
import { avatarColor, getInitials } from '@/lib/helpers';
import { Eye, Users } from 'lucide-react';
import type { OnlineUserDoc } from '@/lib/presence-service';

/* ========================================================================== */
/*  Single user presence dot                                                   */
/* ========================================================================== */

interface PresenceDotProps {
  userId: string;
  userName: string;
  userPhoto: string;
  size?: 'sm' | 'md';
  showPulse?: boolean;
}

export function PresenceDot({ userId, userName, userPhoto, size = 'sm', showPulse = true }: PresenceDotProps) {
  const isSmall = size === 'sm';

  return (
    <div className="relative inline-flex flex-shrink-0" title={`${userName} — en línea`}>
      {/* Avatar or initials */}
      {userPhoto ? (
        <div
          className={`${isSmall ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-cover bg-center ring-1 ring-[var(--card)]`}
          style={{ backgroundImage: `url(${userPhoto})` }}
        />
      ) : (
        <div
          className={`${isSmall ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[9px]'} rounded-full font-semibold flex items-center justify-center ring-1 ring-[var(--card)] ${avatarColor(userId)}`}
        >
          {getInitials(userName)}
        </div>
      )}
      {/* Green online indicator dot */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 ${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-emerald-500 ring-2 ring-[var(--card)] ${
          showPulse ? 'animate-pulse' : ''
        }`}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Compact mode — just dots, no names                                         */
/* ========================================================================== */

interface PresenceDotsCompactProps {
  users: OnlineUserDoc[];
  max?: number;
}

export function PresenceDotsCompact({ users, max = 4 }: PresenceDotsCompactProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map(u => (
        <PresenceDot
          key={u.id}
          userId={u.data.userId}
          userName={u.data.userName}
          userPhoto={u.data.userPhoto}
          size="sm"
          showPulse={false}
        />
      ))}
      {remaining > 0 && (
        <span className="w-5 h-5 rounded-full bg-[var(--af-bg4)] text-[9px] font-semibold flex items-center justify-center ring-1 ring-[var(--card)] text-[var(--muted-foreground)] ml-1">
          +{remaining}
        </span>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Full mode — avatars + names ("Viewing now" badge)                          */
/* ========================================================================== */

interface PresenceViewingNowProps {
  users: OnlineUserDoc[];
  screenName?: string;
  projectName?: string;
  variant?: 'pill' | 'card';
}

export function PresenceViewingNow({ users, screenName, projectName, variant = 'pill' }: PresenceViewingNowProps) {
  if (users.length === 0) return null;

  const labelText = projectName
    ? `viendo este proyecto`
    : screenName
      ? `en ${screenName}`
      : 'en línea ahora';

  const firstName = users[0]?.data?.userName?.split(' ')[0] || 'Alguien';

  if (variant === 'pill') {
    return (
      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-fadeIn">
        <Eye size={12} className="text-emerald-400 flex-shrink-0" />
        {users.length === 1 ? (
          <span className="text-[11px] text-emerald-400 font-medium">
            {firstName} está {labelText}
          </span>
        ) : users.length === 2 ? (
          <span className="text-[11px] text-emerald-400 font-medium">
            {firstName} y 1 persona más están {labelText}
          </span>
        ) : (
          <span className="text-[11px] text-emerald-400 font-medium">
            {firstName} y {users.length - 1} personas están {labelText}
          </span>
        )}
        <PresenceDotsCompact users={users} max={3} />
      </div>
    );
  }

  // Card variant
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 animate-fadeIn">
      <div className="flex items-center gap-1.5 text-emerald-400">
        <Users size={14} />
        <span className="text-[12px] font-medium">Ahora</span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <PresenceDotsCompact users={users} max={5} />
        <span className="text-[11px] text-[var(--muted-foreground)] truncate">
          {users.length === 1
            ? `${firstName} está ${labelText}`
            : `${users.length} personas ${labelText}`}
        </span>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Online counter for TopBar                                                  */
/* ========================================================================== */

interface OnlineCounterProps {
  count: number;
}

export function OnlineCounter({ count }: OnlineCounterProps) {
  if (count <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] font-medium text-emerald-400 whitespace-nowrap">
        {count === 1 ? '1 persona en línea' : `${count} personas en línea`}
      </span>
    </div>
  );
}
