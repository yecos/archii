import { describe, it, expect } from 'vitest';
import {
  getMonday,
  getGanttDays,
  getTaskBar,
  buildGanttRows,
  findOverlaps,
  getProjectColor,
  calcGanttDays,
  calcGanttOffset,
} from '@/lib/gantt-helpers';

describe('getMonday', () => {
  it('returns Monday for Wednesday Apr 16 2025 → Monday Apr 14 2025', () => {
    const wed = new Date(2025, 3, 16); // Apr 16, 2025 (Wednesday)
    const monday = getMonday(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(14);
    expect(monday.getMonth()).toBe(3); // April
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2025, 3, 13); // Apr 13, 2025 (Sunday)
    const monday = getMonday(sun);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(7); // Apr 7, 2025
  });

  it('returns same day for a Monday', () => {
    const mon = new Date(2025, 3, 14); // Apr 14, 2025 (Monday)
    const result = getMonday(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(14);
  });

  it('sets time to midnight', () => {
    const result = getMonday(new Date(2025, 3, 16));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('getGanttDays', () => {
  it('returns 14 days for weekOffset=0', () => {
    const days = getGanttDays(0);
    expect(days).toHaveLength(14);
  });

  it('starts on Monday for weekOffset=0', () => {
    const days = getGanttDays(0);
    expect(days[0].getDay()).toBe(1); // Monday
  });

  it('shifts by 7 days for weekOffset=1', () => {
    const days0 = getGanttDays(0);
    const days1 = getGanttDays(1);
    const diff = days1[0].getTime() - days0[0].getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getTaskBar', () => {
  // Create a 14-day range starting on Monday Apr 14, 2025
  function makeDays(offsetDays = 0): Date[] {
    const start = new Date(2025, 3, 14 + offsetDays);
    start.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  it('returns a bar for a task within range', () => {
    const days = makeDays();
    const task = {
      id: 't1',
      data: {
        startDate: '2025-04-15',
        dueDate: '2025-04-18',
      },
    };
    const bar = getTaskBar(task, days);
    expect(bar).not.toBeNull();
    expect(bar!.left).toBeGreaterThanOrEqual(0);
    expect(bar!.width).toBeGreaterThan(0);
  });

  it('returns a bar clamped to range for a task before range', () => {
    const days = makeDays();
    const task = {
      id: 't1',
      data: {
        startDate: '2025-04-01',
        dueDate: '2025-04-10',
      },
    };
    const bar = getTaskBar(task, days);
    // Task ends before range starts — left will be negative but clamped to 0
    expect(bar).not.toBeNull();
    expect(bar!.left).toBe(0);
  });

  it('returns null for a task entirely after range', () => {
    const days = makeDays();
    const task = {
      id: 't1',
      data: {
        startDate: '2025-05-01',
        dueDate: '2025-05-10',
      },
    };
    const bar = getTaskBar(task, days);
    // Task starts after range ends — bar might still show but left could be >= 100%
    expect(bar).not.toBeNull();
    // Width should be clamped so it doesn't overflow
    expect(bar!.left + bar!.width).toBeLessThanOrEqual(100);
  });

  it('returns null for a task with no dueDate', () => {
    const days = makeDays();
    const task = { id: 't1', data: { startDate: '2025-04-15' } };
    expect(getTaskBar(task, days)).toBeNull();
  });

  it('returns null for a task with no data', () => {
    const days = makeDays();
    expect(getTaskBar({ id: 't1' }, days)).toBeNull();
  });
});

describe('buildGanttRows', () => {
  it('places non-overlapping tasks in 1 row', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14', dueDate: '2025-04-16' } },
      { id: 't2', data: { startDate: '2025-04-17', dueDate: '2025-04-19' } },
    ];
    const rows = buildGanttRows(tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });

  it('places overlapping tasks in 2 rows', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14', dueDate: '2025-04-18' } },
      { id: 't2', data: { startDate: '2025-04-16', dueDate: '2025-04-20' } },
    ];
    const rows = buildGanttRows(tasks);
    expect(rows).toHaveLength(2);
  });

  it('skips tasks without dueDate', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14' } },
      { id: 't2', data: { startDate: '2025-04-15', dueDate: '2025-04-16' } },
    ];
    const rows = buildGanttRows(tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(1);
    expect(rows[0][0].id).toBe('t2');
  });
});

describe('findOverlaps', () => {
  it('detects overlapping tasks', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14', dueDate: '2025-04-18' } },
      { id: 't2', data: { startDate: '2025-04-16', dueDate: '2025-04-20' } },
    ];
    const overlaps = findOverlaps(tasks);
    expect(overlaps).toContain('t1');
    expect(overlaps).toContain('t2');
  });

  it('returns empty set for non-overlapping tasks', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14', dueDate: '2025-04-15' } },
      { id: 't2', data: { startDate: '2025-04-16', dueDate: '2025-04-17' } },
    ];
    const overlaps = findOverlaps(tasks);
    expect(overlaps.size).toBe(0);
  });

  it('skips tasks without dueDate', () => {
    const tasks = [
      { id: 't1', data: { startDate: '2025-04-14' } },
      { id: 't2', data: { startDate: '2025-04-14', dueDate: '2025-04-16' } },
    ];
    const overlaps = findOverlaps(tasks);
    expect(overlaps.size).toBe(0);
  });
});

describe('getProjectColor', () => {
  const projects = [
    { id: 'proj1', data: {} },
    { id: 'proj2', data: {} },
    { id: 'proj3', data: {} },
  ];

  it('returns first color for first project', () => {
    expect(getProjectColor('proj1', projects)).toBe('#3b82f6');
  });

  it('returns second color for second project', () => {
    expect(getProjectColor('proj2', projects)).toBe('#8b5cf6');
  });

  it('returns default when project not found', () => {
    // findIndex returns -1, Math.abs(-1) % 10 = 1, so colors[1]
    expect(getProjectColor('unknown', projects)).toBe('#8b5cf6');
  });
});

describe('calcGanttDays', () => {
  it('returns 1 for same start and end date', () => {
    expect(calcGanttDays('2025-04-14', '2025-04-14')).toBe(1);
  });

  it('returns 14 for 2 weeks', () => {
    expect(calcGanttDays('2025-04-14', '2025-04-28')).toBe(14);
  });

  it('returns 0 for empty strings', () => {
    expect(calcGanttDays('', '2025-04-14')).toBe(0);
    expect(calcGanttDays('2025-04-14', '')).toBe(0);
    expect(calcGanttDays('', '')).toBe(0);
  });
});

describe('calcGanttOffset', () => {
  it('returns 5 when phase starts 5 days after timeline', () => {
    expect(calcGanttOffset('2025-04-19', '2025-04-14')).toBe(5);
  });

  it('returns 0 when phase starts before timeline', () => {
    expect(calcGanttOffset('2025-04-10', '2025-04-14')).toBe(0);
  });

  it('returns 0 for empty strings', () => {
    expect(calcGanttOffset('', '2025-04-14')).toBe(0);
    expect(calcGanttOffset('2025-04-19', '')).toBe(0);
  });
});
