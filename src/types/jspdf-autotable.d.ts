/**
 * Type augmentation for jsPDF to include jspdf-autotable plugin properties.
 * The autotable plugin mutates jsPDF instances at runtime, adding
 * `lastAutoTable` and `previousAutoTable` with metadata about the
 * most recently rendered table.
 *
 * See: https://github.com/simonbengtsson/jsPDF-AutoTable
 */

import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    /** Metadata about the most recently rendered autoTable. */
    lastAutoTable?: {
      finalY: number;
      startX: number;
    };

    /** Metadata about the previously rendered autoTable (before lastAutoTable). */
    previousAutoTable?: {
      finalY: number;
    };
  }
}
