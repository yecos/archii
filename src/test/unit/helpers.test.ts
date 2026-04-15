import { describe, it, expect } from 'vitest';
import {
  fmtCOP,
  fmtDate,
  fmtDateTime,
  fmtSize,
  getInitials,
  statusColor,
  prioColor,
  taskStColor,
  avatarColor,
  fmtRecTime,
  fmtDuration,
  fmtTimer,
  getWeekStart,
  uniqueId,
} from '@/lib/helpers';

describe('fmtCOP', () => {
  it('formats zero as $0', () => {
    expect(fmtCOP(0)).toBe('$0');
  });

  it('formats small numbers with locale', () => {
    expect(fmtCOP(500)).toBe('$500');
  });

  it('formats thousands with K suffix', () => {
    expect(fmtCOP(15000)).toBe('$15K');
  });

  it('formats millions with M suffix', () => {
    expect(fmtCOP(2500000)).toBe('$2.5M');
  });

  it('formats negative numbers', () => {
    expect(fmtCOP(-500)).toBe('$-500');
  });
});

describe('fmtDate', () => {
  it('returns "—" for null', () => {
    expect(fmtDate(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(fmtDate(undefined)).toBe('—');
  });

  it('formats a Date object', () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025
    const result = fmtDate(d);
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('handles Firebase Timestamp-like objects with .toDate()', () => {
    const ts = { toDate: () => new Date(2025, 5, 10) };
    const result = fmtDate(ts);
    expect(result).toContain('10');
    expect(result).toContain('2025');
  });

  it('formats string dates', () => {
    const result = fmtDate('2025-03-20');
    expect(result).toContain('2025');
  });

  it('formats number timestamps', () => {
    // 2025-01-01T00:00:00Z in ms
    const result = fmtDate(1735689600000);
    expect(result).toContain('2025');
  });
});

describe('fmtDateTime', () => {
  it('returns "—" for null', () => {
    expect(fmtDateTime(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(fmtDateTime(undefined)).toBe('—');
  });

  it('formats a Date object with time', () => {
    const d = new Date(2025, 0, 15, 14, 30);
    const result = fmtDateTime(d);
    expect(result).toContain('15');
    expect(result).toContain('2025');
    // es-CO locale uses 12-hour format (02:30 p. m.)
    expect(result).toMatch(/30/);
  });

  it('handles Firebase Timestamp-like objects with .toDate()', () => {
    const ts = { toDate: () => new Date(2025, 5, 10, 9, 5) };
    const result = fmtDateTime(ts);
    expect(result).toContain('10');
    expect(result).toContain('2025');
    expect(result).toContain('09');
  });

  it('formats string dates with time', () => {
    const result = fmtDateTime('2025-03-20T10:00:00');
    expect(result).toContain('2025');
  });

  it('formats number timestamps with time', () => {
    const result = fmtDateTime(1735689600000);
    expect(result).toContain('2025');
  });
});

describe('fmtSize', () => {
  it('formats bytes (< 1024)', () => {
    expect(fmtSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(fmtSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(fmtSize(1048576)).toBe('1.0 MB');
    expect(fmtSize(5242880)).toBe('5.0 MB');
  });

  it('formats zero bytes', () => {
    expect(fmtSize(0)).toBe('0 B');
  });
});

describe('getInitials', () => {
  it('returns initials for a single name', () => {
    expect(getInitials('Juan')).toBe('J');
  });

  it('returns initials for two names', () => {
    expect(getInitials('Juan Perez')).toBe('JP');
  });

  it('returns initials for three names (max 2)', () => {
    expect(getInitials('Juan Carlos Perez')).toBe('JC');
  });

  it('returns "?" for empty string', () => {
    expect(getInitials('')).toBe('?');
  });
});

describe('statusColor', () => {
  it('returns correct class for Concepto', () => {
    expect(statusColor('Concepto')).toBe('bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
  });

  it('returns correct class for Diseno', () => {
    expect(statusColor('Diseno')).toBe('bg-blue-500/10 text-blue-400');
  });

  it('returns correct class for Ejecucion', () => {
    expect(statusColor('Ejecucion')).toBe('bg-amber-500/10 text-amber-400');
  });

  it('returns correct class for Terminado', () => {
    expect(statusColor('Terminado')).toBe('bg-emerald-500/10 text-emerald-400');
  });

  it('returns default class for unknown status', () => {
    expect(statusColor('Unknown')).toBe('bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
  });
});

describe('prioColor', () => {
  it('returns correct class for Alta', () => {
    expect(prioColor('Alta')).toBe('bg-red-500/10 text-red-400');
  });

  it('returns correct class for Media', () => {
    expect(prioColor('Media')).toBe('bg-amber-500/10 text-amber-400');
  });

  it('returns correct class for Baja', () => {
    expect(prioColor('Baja')).toBe('bg-emerald-500/10 text-emerald-400');
  });

  it('returns default class for unknown priority', () => {
    expect(prioColor('Unknown')).toBe('bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
  });
});

describe('taskStColor', () => {
  it('returns correct class for "Por hacer"', () => {
    expect(taskStColor('Por hacer')).toBe('bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
  });

  it('returns correct class for "En progreso"', () => {
    expect(taskStColor('En progreso')).toBe('bg-blue-500/10 text-blue-400');
  });

  it('returns correct class for "Revision"', () => {
    expect(taskStColor('Revision')).toBe('bg-amber-500/10 text-amber-400');
  });

  it('returns correct class for "Completado"', () => {
    expect(taskStColor('Completado')).toBe('bg-emerald-500/10 text-emerald-400');
  });

  it('returns default class for unknown status', () => {
    expect(taskStColor('Unknown')).toBe('bg-[var(--af-bg4)] text-[var(--muted-foreground)]');
  });
});

describe('avatarColor', () => {
  it('returns same color for same ID', () => {
    expect(avatarColor('user-123')).toBe(avatarColor('user-123'));
  });

  it('can return different colors for different IDs', () => {
    const colors = new Set();
    for (let i = 0; i < 20; i++) {
      colors.add(avatarColor(`user-${i}`));
    }
    // With 4 colors and 20 IDs, we should have at least 2 different colors
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  it('returns a valid color for empty string', () => {
    const color = avatarColor('');
    expect(color).toBeTruthy();
    expect(typeof color).toBe('string');
  });
});

describe('fmtRecTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(fmtRecTime(0)).toBe('00:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(fmtRecTime(90)).toBe('01:30');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(fmtRecTime(3661)).toBe('61:01');
  });
});

describe('fmtDuration', () => {
  it('formats 0 as 0m', () => {
    expect(fmtDuration(0)).toBe('0m');
  });

  it('formats 30 minutes', () => {
    expect(fmtDuration(30)).toBe('30m');
  });

  it('formats 90 minutes as 1h 30m', () => {
    expect(fmtDuration(90)).toBe('1h 30m');
  });

  it('formats 120 minutes as 2h', () => {
    expect(fmtDuration(120)).toBe('2h');
  });
});

describe('fmtTimer', () => {
  it('formats 0ms as 00:00', () => {
    expect(fmtTimer(0)).toBe('00:00');
  });

  it('formats 60000ms as 01:00', () => {
    expect(fmtTimer(60000)).toBe('01:00');
  });

  it('formats 3661000ms as 01:01:01', () => {
    expect(fmtTimer(3661000)).toBe('01:01:01');
  });
});

describe('getWeekStart', () => {
  it('returns a Monday', () => {
    const monday = getWeekStart();
    expect(monday.getDay()).toBe(1);
  });

  it('returns midnight time', () => {
    const monday = getWeekStart();
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(monday.getSeconds()).toBe(0);
    expect(monday.getMilliseconds()).toBe(0);
  });

  it('works for a known Wednesday date', () => {
    // Wed Apr 16 2025 → Mon Apr 14 2025
    const wed = new Date(2025, 3, 16); // month is 0-indexed
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(14);
    expect(monday.getMonth()).toBe(3);
  });
});

describe('uniqueId', () => {
  it('has the specified prefix', () => {
    const id = uniqueId('test');
    expect(id.startsWith('test-')).toBe(true);
  });

  it('generates different IDs', () => {
    const id1 = uniqueId();
    const id2 = uniqueId();
    expect(id1).not.toBe(id2);
  });

  it('has default prefix "id"', () => {
    const id = uniqueId();
    expect(id.startsWith('id-')).toBe(true);
  });
});
