/**
 * recurrence.ts
 * Utility functions for generating recurring event dates.
 */

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

/**
 * Generate an array of ISO date strings for recurring occurrences.
 *
 * @param startDate - ISO date string of the first occurrence (YYYY-MM-DD)
 * @param recurrence - One of the RecurrencePattern values
 * @param recurrenceEnd - Optional ISO date string when recurrence stops
 * @param limit - Max number of occurrences to generate (default 100)
 * @returns Array of ISO date strings (excluding the start date itself for convenience)
 */
export function generateRecurringDates(
  startDate: string,
  recurrence: RecurrencePattern,
  recurrenceEnd?: string,
  limit: number = 100,
): string[] {
  if (!startDate || recurrence === 'none') return [];

  const dates: string[] = [];
  const start = parseDate(startDate);
  if (!start) return dates;

  const end = recurrenceEnd ? parseDate(recurrenceEnd) : null;

  let current = new Date(start);

  // safety counter to avoid infinite loops
  let iterations = 0;
  const maxIterations = limit + 1000;

  while (iterations < maxIterations) {
    iterations++;
    const next = advanceDate(current, recurrence);
    if (!next) break;
    current = next;

    // Check if we've gone past the end date
    if (end && current > end) break;

    dates.push(formatDate(current));

    if (dates.length >= limit) break;
  }

  return dates;
}

/**
 * Expand a single meeting with recurrence into individual occurrences
 * that fall within a given month. Returns an array of { date, meeting } pairs
 * where date is the occurrence date (ISO string).
 */
export function expandMeetingForMonth(
  meeting: { id: string; data: Record<string, any> },
  year: number,
  month: number, // 0-indexed
): Array<{ date: string; meeting: { id: string; data: Record<string, any> }; isRecurring: boolean }> {
  const { date: meetDate, recurrence, recurrenceEnd } = meeting.data;
  if (!meetDate) return [];

  // If no recurrence, just check if the meeting falls in the target month
  if (!recurrence || recurrence === 'none') {
    const d = parseDate(meetDate);
    if (d && d.getFullYear() === year && d.getMonth() === month) {
      return [{ date: meetDate, meeting, isRecurring: false }];
    }
    return [];
  }

  // Recurring meeting — generate all dates and filter for target month
  const allDates = generateRecurringDates(meetDate, recurrence as RecurrencePattern, recurrenceEnd);
  const results: Array<{ date: string; meeting: { id: string; data: Record<string, any> }; isRecurring: boolean }> = [];

  // Include the original date if it falls in the target month
  const origD = parseDate(meetDate);
  if (origD && origD.getFullYear() === year && origD.getMonth() === month) {
    results.push({ date: meetDate, meeting, isRecurring: true });
  }

  for (const occDate of allDates) {
    const od = parseDate(occDate);
    if (od && od.getFullYear() === year && od.getMonth() === month) {
      results.push({ date: occDate, meeting, isRecurring: true });
    }
  }

  return results;
}

/**
 * Advance a date by one recurrence period.
 */
function advanceDate(d: Date, pattern: RecurrencePattern): Date | null {
  const result = new Date(d);
  switch (pattern) {
    case 'daily':
      result.setDate(result.getDate() + 1);
      break;
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'biweekly':
      result.setDate(result.getDate() + 14);
      break;
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'yearly':
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return result;
}

/**
 * Parse YYYY-MM-DD string to a Date at midnight local time.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Use a simple split to avoid timezone issues with Date constructor
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

/**
 * Format a Date to YYYY-MM-DD string (local time).
 */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
