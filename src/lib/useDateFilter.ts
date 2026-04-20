'use client';

import { useMemo } from 'react';

/**
 * Shared hook for filtering items by date range.
 * Used in ReportsScreen (expenses, invoices, timeEntries).
 *
 * @param items - Array of Firestore documents with date field
 * @param dateField - Field name to filter on ('date', 'issueDate', 'createdAt', etc.)
 * @param dateFilter - One of 'all', 'month', 'quarter', 'year'
 */
export function useDateFilter<T extends Record<string, any>>(
  items: T[],
  dateField: string,
  dateFilter: string
): T[] {
  return useMemo(() => {
    if (dateFilter === 'all' || !dateField) return items;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return items.filter((item) => {
      const raw = item[dateField];
      if (!raw) return false;

      const date = raw?.toDate ? raw.toDate() : new Date(raw);
      if (isNaN(date.getTime())) return false;

      switch (dateFilter) {
        case 'month':
          return date.getFullYear() === year && date.getMonth() === month;
        case 'quarter': {
          const quarter = Math.floor(month / 3);
          const itemQuarter = Math.floor(date.getMonth() / 3);
          return date.getFullYear() === year && itemQuarter === quarter;
        }
        case 'year':
          return date.getFullYear() === year;
        default:
          return true;
      }
    });
  }, [items, dateField, dateFilter]);
}
