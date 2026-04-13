/**
 * export-checklist.ts
 * Exporta checklists de obra a PDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChecklistEntry {
  id: string;
  projectId: string;
  phaseName: string;
  itemName: string;
  checked: boolean;
  checkedBy?: string;
  checkedAt?: any;
  notes?: string;
  createdBy: string;
  createdAt: any;
}

interface ExportParams {
  projectId: string;
  projectName: string;
  entries: ChecklistEntry[];
  phaseProgress: Record<string, { total: number; checked: number; pct: number }>;
  teamUsers: any[];
  getUserName: (id: string) => string;
}

export function exportChecklistPDF({ projectId, projectName, entries, phaseProgress, teamUsers, getUserName }: ExportParams) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(158, 124, 62);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ArchiFlow', 15, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Checklist de Obra', 15, 27);
  doc.setFontSize(9);
  doc.text(`Proyecto: ${projectName}`, 15, 33);

  y = 42;
  doc.setTextColor(50, 50, 50);

  // Overall progress
  const totalItems = entries.length;
  const checkedItems = entries.filter(e => e.checked).length;
  const overallPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Progreso General: ${overallPct}% (${checkedItems}/${totalItems})`, 15, y);
  y += 5;

  // Progress bar
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(15, y, 180, 4, 2, 2, 'F');
  doc.setFillColor(158, 124, 62);
  doc.roundedRect(15, y, Math.max((overallPct / 100) * 180, 1), 4, 2, 2, 'F');
  y += 12;

  // Group by phase
  const phases = [...new Set(entries.map(e => e.phaseName))];

  phases.forEach(phase => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    const phaseEntries = entries.filter(e => e.phaseName === phase);
    const prog = phaseProgress[phase];

    // Phase header
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(158, 124, 62);
    doc.text(`${phase} — ${prog ? prog.pct + '%' : '0%'}`, 15, y);
    y += 3;

    // Mini progress bar
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(15, y, 180, 2, 1, 1, 'F');
    if (prog) {
      doc.setFillColor(prog.pct >= 100 ? 16 : 158, prog.pct >= 100 ? 185 : 124, prog.pct >= 100 ? 129 : 62);
      doc.roundedRect(15, y, Math.max((prog.pct / 100) * 180, 1), 2, 1, 1, 'F');
    }
    y += 8;

    // Items table
    doc.setTextColor(50, 50, 50);
    const tableData = phaseEntries.map(e => [
      e.checked ? '✓' : '○',
      e.itemName,
      e.checked && e.checkedBy ? getUserName(e.checkedBy) : '',
      e.notes || '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Estado', 'Item', 'Verificado por', 'Notas']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [158, 124, 62], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 40 },
        3: { cellWidth: 55 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.cell.raw === '✓') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`ArchiFlow v2.0 — Checklist de Obra — Generado: ${new Date().toLocaleDateString('es-CO')}`, 15, 272);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 15, 272, { align: 'right' });
  }

  doc.save(`archiflow-checklist-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
}
