import { describe, it, expect } from 'vitest';
import {
  generateRecurringDates,
  expandMeetingForMonth,
} from '@/lib/recurrence';
import type { RecurrencePattern } from '@/lib/recurrence';

describe('generateRecurringDates', () => {
  it('returns empty array for "none" pattern', () => {
    expect(generateRecurringDates('2025-01-15', 'none')).toEqual([]);
  });

  it('generates daily dates', () => {
    const dates = generateRecurringDates('2025-01-15', 'daily', undefined, 3);
    expect(dates).toHaveLength(3);
    expect(dates).toEqual(['2025-01-16', '2025-01-17', '2025-01-18']);
  });

  it('generates weekly dates every 7 days', () => {
    const dates = generateRecurringDates('2025-01-15', 'weekly', undefined, 3);
    expect(dates).toHaveLength(3);
    // Jan 15 + 7 = Jan 22, + 7 = Jan 29, + 7 = Feb 5
    expect(dates).toEqual(['2025-01-22', '2025-01-29', '2025-02-05']);
  });

  it('generates biweekly dates every 14 days', () => {
    const dates = generateRecurringDates('2025-01-15', 'biweekly', undefined, 3);
    expect(dates).toHaveLength(3);
    // Jan 15 + 14 = Jan 29, + 14 = Feb 12, + 14 = Feb 26
    expect(dates).toEqual(['2025-01-29', '2025-02-12', '2025-02-26']);
  });

  it('generates monthly dates incrementing month', () => {
    const dates = generateRecurringDates('2025-01-15', 'monthly', undefined, 3);
    expect(dates).toHaveLength(3);
    expect(dates).toEqual(['2025-02-15', '2025-03-15', '2025-04-15']);
  });

  it('generates yearly dates incrementing year', () => {
    const dates = generateRecurringDates('2025-01-15', 'yearly', undefined, 3);
    expect(dates).toHaveLength(3);
    expect(dates).toEqual(['2026-01-15', '2027-01-15', '2028-01-15']);
  });

  it('respects the limit parameter', () => {
    const dates = generateRecurringDates('2025-01-01', 'daily', undefined, 5);
    expect(dates).toHaveLength(5);
  });

  it('stops at recurrenceEnd', () => {
    const dates = generateRecurringDates('2025-01-01', 'daily', '2025-01-04');
    // Should include Jan 2, 3, 4 but not Jan 5 (since Jan 5 > Jan 4)
    expect(dates.length).toBeLessThanOrEqual(3);
    expect(dates).toContain('2025-01-02');
    expect(dates).toContain('2025-01-03');
    expect(dates).toContain('2025-01-04');
    expect(dates).not.toContain('2025-01-05');
  });

  it('returns empty for empty startDate', () => {
    expect(generateRecurringDates('', 'daily')).toEqual([]);
  });

  it('returns empty for invalid startDate', () => {
    expect(generateRecurringDates('not-a-date', 'daily')).toEqual([]);
  });
});

describe('expandMeetingForMonth', () => {
  it('non-recurring meeting in target month returns 1 result', () => {
    const meeting = {
      id: 'm1',
      data: {
        date: '2025-01-15',
        recurrence: 'none',
      },
    };
    const results = expandMeetingForMonth(meeting, 2025, 0); // January
    expect(results).toHaveLength(1);
    expect(results[0].date).toBe('2025-01-15');
    expect(results[0].isRecurring).toBe(false);
  });

  it('non-recurring meeting not in target month returns empty', () => {
    const meeting = {
      id: 'm1',
      data: {
        date: '2025-01-15',
        recurrence: 'none',
      },
    };
    const results = expandMeetingForMonth(meeting, 2025, 1); // February
    expect(results).toHaveLength(0);
  });

  it('recurring weekly meeting generates multiple results in target month', () => {
    const meeting = {
      id: 'm1',
      data: {
        date: '2025-01-01',
        recurrence: 'weekly',
      },
    };
    const results = expandMeetingForMonth(meeting, 2025, 0); // January
    // Original date (Jan 1) is in January, plus weekly occurrences
    expect(results.length).toBeGreaterThan(1);
    // All should be marked as recurring
    expect(results.every(r => r.isRecurring)).toBe(true);
    // All should be in January 2025
    expect(results.every(r => {
      const d = new Date(r.date);
      return d.getFullYear() === 2025 && d.getMonth() === 0;
    })).toBe(true);
  });

  it('recurring meeting not in target month returns empty', () => {
    const meeting = {
      id: 'm1',
      data: {
        date: '2025-01-15',
        recurrence: 'weekly',
      },
    };
    const results = expandMeetingForMonth(meeting, 2024, 5); // June 2024
    expect(results).toHaveLength(0);
  });

  it('meeting with no date returns empty', () => {
    const meeting = {
      id: 'm1',
      data: {},
    };
    const results = expandMeetingForMonth(meeting, 2025, 0);
    expect(results).toHaveLength(0);
  });
});
