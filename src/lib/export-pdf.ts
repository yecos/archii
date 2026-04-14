/**
 * export-pdf.ts
 * Exportación a PDF profesional usando jsPDF + jspdf-autotable.
 * ArchiFlow v2.0 — Todos los reportes en PDF.
 */

import type jsPDF from 'jspdf';
import { fmtCOP, fmtDate, fmtDuration } from './helpers';

// Colores de marca ArchiFlow
const BRAND = {
  primary: [200, 169, 110] as [number, number, number], // #c8a96e (oro)
  dark: [26, 26, 32] as [number, number, number],       // #1a1a20
  text: [51, 51, 51] as [number, number, number],        // #333333
  muted: [130, 130, 130] as [number, number, number],    // #828282
  white: [255, 255, 255] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],    // #10b981
  red: [239, 68, 68] as [number, number, number],       // #ef4444
  blue: [59, 130, 246] as [number, number, number],     // #3b82f6
  bg: [247, 247, 248] as [number, number, number],      // #f7f7f8
};

function fmtCOPFull(n: number): string {
  if (!n || n === 0) return '$0';
  return '$' + Number(n).toLocaleString('es-CO');
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  // Gold bar at top
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 4, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.dark);
  doc.text(title, 14, 22);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text(subtitle, 14, 30);
  }

  // Brand logo text (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.primary);
  doc.text('ArchiFlow', pageW - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text('v2.0', pageW - 14, 24, { align: 'right' });

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageW - 14, 30, { align: 'right' });

  // Separator line
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageW - 14, 34);
}

function addFooter(doc: jsPDF) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text('ArchiFlow v2.0 — Plataforma de Gestión de Proyectos', pageW / 2, pageH - 8, { align: 'center' });
  doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 8, { align: 'right' });
}

function checkAddPage(doc: jsPDF, y: number, needed: number = 40): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    addFooter(doc);
    return 18;
  }
  return y;
}

/* ═══════════════════════════════════════════════
   EXPORTAR FACTURA A PDF
   ═══════════════════════════════════════════════ */

export async function exportInvoicePDF(invoice: any, project?: any) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  // Top gold band
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 8, 'F');

  // Logo + Company
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...BRAND.white);
  doc.text('ArchiFlow', 14, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text('Plataforma de Gestion de Proyectos', 14, 28);

  // Invoice title (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...BRAND.primary);
  doc.text('FACTURA', pageW - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.dark);
  doc.text(`No. ${invoice.data.number || 'S/N'}`, pageW - 14, 25, { align: 'right' });

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    Borrador: BRAND.muted,
    Enviada: BRAND.blue,
    Pagada: BRAND.green,
    Vencida: BRAND.red,
    Cancelada: BRAND.muted,
  };
  const statusBg = statusColors[invoice.data.status] || BRAND.muted;
  const statusText = invoice.data.status === 'Cancelada' ? BRAND.white : BRAND.white;
  doc.setFillColor(...statusBg);
  const badgeW = doc.getTextWidth(invoice.data.status.toUpperCase()) + 10;
  doc.roundedRect(pageW - 14 - badgeW, 27, badgeW, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...statusText);
  doc.text(invoice.data.status.toUpperCase(), pageW - 14 - badgeW / 2, 31, { align: 'center' });

  // Separator
  doc.setDrawColor(...BRAND.bg);
  doc.setLineWidth(0.3);
  doc.line(14, 36, pageW - 14, 36);

  // Info grid
  let y = 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('PROYECTO', 14, y);
  doc.text('CLIENTE', 14, y + 8);
  doc.text('FECHA EMISION', 14, y + 16);
  doc.text('FECHA VENCIMIENTO', 14, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.dark);
  doc.text(invoice.data.projectName || 'N/A', 50, y);
  doc.text(invoice.data.clientName || 'N/A', 50, y + 8);
  doc.text(invoice.data.issueDate || 'N/A', 50, y + 16);
  doc.text(invoice.data.dueDate || 'N/A', 50, y + 24);

  y += 32;

  // Items table
  if (invoice.data.items && invoice.data.items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Fase', 'Horas', 'Tarifa (COP)', 'Total (COP)']],
      body: invoice.data.items.map((item: any) => [
        item.concept || '-',
        item.phase || '-',
        item.hours || 0,
        fmtCOPFull(item.rate || 0),
        fmtCOPFull(item.amount || 0),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.dark,
        textColor: BRAND.white,
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: BRAND.text,
      },
      alternateRowStyles: {
        fillColor: BRAND.bg,
      },
      columnStyles: {
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text('Sin items', 14, y + 4);
    y += 12;
  }

  // Totals section
  const subtotal = invoice.data.subtotal || 0;
  const tax = invoice.data.tax || 0;
  const total = invoice.data.total || 0;

  y = checkAddPage(doc, y, 50);
  const totalsX = pageW - 14;

  doc.setDrawColor(...BRAND.bg);
  doc.setLineWidth(0.2);
  doc.line(totalsX - 80, y, totalsX, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text('Subtotal:', totalsX - 2, y, { align: 'right' });
  doc.setTextColor(...BRAND.dark);
  doc.text(fmtCOPFull(subtotal), totalsX, y, { align: 'right' });

  y += 7;
  doc.setTextColor(...BRAND.muted);
  doc.text(`IVA (${19}%):`, totalsX - 2, y, { align: 'right' });
  doc.setTextColor(...BRAND.dark);
  doc.text(fmtCOPFull(tax), totalsX, y, { align: 'right' });

  y += 2;
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.8);
  doc.line(totalsX - 80, y + 4, totalsX, y + 4);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text('TOTAL:', totalsX - 2, y, { align: 'right' });
  doc.text(fmtCOPFull(total), totalsX, y, { align: 'right' });

  // Notes
  if (invoice.data.notes) {
    y += 16;
    y = checkAddPage(doc, y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('NOTAS', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.text);
    doc.text(invoice.data.notes, 14, y + 6, { maxWidth: pageW - 28 });
  }

  // Footer
  addFooter(doc);

  doc.save(`factura-${invoice.data.number || 'borrador'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   EXPORTAR REPORTE GENERAL A PDF
   ═══════════════════════════════════════════════ */

export async function exportGeneralReportPDF(data: {
  projects: any[];
  tasks: any[];
  expenses: any[];
  invoices: any[];
  teamUsers: any[];
  timeEntries: any[];
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  addHeader(doc, 'Reporte General', 'Resumen ejecutivo de todos los módulos');

  let y = 40;

  // KPI Summary
  const totalBudget = data.projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = data.expenses.reduce((s, e) => s + (e.data.amount || 0), 0);
  const totalInvoiced = data.invoices.filter(i => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0);
  const taskCompleted = data.tasks.filter(t => t.data.status === 'Completado').length;
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // KPI boxes
  const kpis = [
    { label: 'Proyectos', value: String(data.projects.length), color: BRAND.blue },
    { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget), color: BRAND.primary },
    { label: 'Gastado Total', value: fmtCOPFull(totalSpent), color: BRAND.red },
    { label: 'Utilización', value: `${budgetPct}%`, color: budgetPct > 90 ? BRAND.red : BRAND.green },
    { label: 'Tareas Completadas', value: `${taskCompleted}/${data.tasks.length}`, color: BRAND.green },
    { label: 'Facturado', value: fmtCOPFull(totalInvoiced), color: BRAND.blue },
  ];

  const boxW = (pageW - 28 - 10) / 3;
  kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * (boxW + 5);
    const yPos = y + row * 18;

    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(x, yPos, boxW, 15, 1.5, 1.5, 'F');

    // Accent bar
    doc.setFillColor(...kpi.color);
    doc.rect(x, yPos, 1.5, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(kpi.label, x + 5, yPos + 13);
  });

  y += 44;

  // Projects table
  y = checkAddPage(doc, y, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Proyectos', 14, y);
  y += 4;

  if (data.projects.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Estado', 'Presupuesto', 'Gastado', 'Progreso']],
      body: data.projects.map(p => {
        const spent = data.expenses.filter(e => e.data.projectId === p.id).reduce((s, e) => s + e.data.amount, 0);
        return [p.data.name, p.data.status, fmtCOPFull(p.data.budget || 0), fmtCOPFull(spent), `${p.data.progress || 0}%`];
      }),
      theme: 'striped',
      headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: BRAND.text },
      alternateRowStyles: { fillColor: BRAND.bg },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Tasks table
  y = checkAddPage(doc, y, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Tareas Pendientes', 14, y);
  y += 4;

  const pendingTasks = data.tasks.filter(t => t.data.status !== 'Completado').slice(0, 30);
  if (pendingTasks.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tarea', 'Proyecto', 'Prioridad', 'Estado', 'Fecha Límite']],
      body: pendingTasks.map(t => {
        const proj = data.projects.find(p => p.id === t.data.projectId);
        return [t.data.title, proj?.data.name || '-', t.data.priority, t.data.status, t.data.dueDate || '-'];
      }),
      theme: 'striped',
      headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: BRAND.text },
      alternateRowStyles: { fillColor: BRAND.bg },
      columnStyles: { 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expenses table
  y = checkAddPage(doc, y, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Gastos Recientes', 14, y);
  y += 4;

  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Categoría', 'Monto (COP)', 'Fecha']],
      body: data.expenses.slice(0, 30).map(e => [
        e.data.concept, e.data.category, fmtCOPFull(e.data.amount), e.data.date || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: BRAND.text },
      alternateRowStyles: { fillColor: BRAND.bg },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  doc.save(`archiflow-reporte-general-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   EXPORTAR BITÁCORA A PDF
   ═══════════════════════════════════════════════ */

export async function exportDailyLogsPDF(data: {
  logs: any[];
  projectName: string;
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  addHeader(doc, `Bitácora de Obra`, data.projectName);

  let y = 40;

  if (data.logs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.muted);
    doc.text('No hay registros en la bitácora', 14, y);
    addFooter(doc);
    doc.save(`bitacora-${data.projectName}-${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  // Summary stats
  const totalLabor = data.logs.reduce((s, l) => s + (l.data.laborCount || 0), 0);
  const avgTemp = data.logs.filter(l => l.data.temperature).reduce((s, l) => s + l.data.temperature, 0) / Math.max(data.logs.filter(l => l.data.temperature).length, 1);
  const totalActivities = data.logs.reduce((s, l) => s + (l.data.activities?.length || 0), 0);

  const stats = [
    { label: 'Registros', value: String(data.logs.length) },
    { label: 'Total Actividades', value: String(totalActivities) },
    { label: 'Promedio Personal', value: `${Math.round(totalLabor / data.logs.length)}` },
    { label: 'Temp. Promedio', value: `${avgTemp.toFixed(1)}°C` },
  ];

  const statW = (pageW - 28 - 9) / 4;
  stats.forEach((stat, i) => {
    const x = 14 + i * (statW + 3);
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(x, y, statW, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.primary);
    doc.text(stat.value, x + 3, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(stat.label, x + 3, y + 12);
  });

  y += 22;

  // Log entries
  const sortedLogs = [...data.logs].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));

  sortedLogs.forEach((log) => {
    y = checkAddPage(doc, y, 50);

    // Date header
    doc.setFillColor(...BRAND.dark);
    doc.roundedRect(14, y, pageW - 28, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.white);
    const weatherIcons: Record<string, string> = { Soleado: 'S', Nublado: 'N', Lluvioso: 'L', 'Parcialmente nublado': 'P', Tormenta: 'T' };
    const wIcon = weatherIcons[log.data.weather] || '';
    doc.text(`${log.data.date || 'Sin fecha'}    ${log.data.weather || ''}  ${log.data.temperature ? log.data.temperature + '°C' : ''}    Personal: ${log.data.laborCount || 0}    Supervisor: ${log.data.supervisor || '-'}`, 18, y + 5);
    y += 10;

    // Activities
    if (log.data.activities && log.data.activities.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.primary);
      doc.text('Actividades:', 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      log.data.activities.forEach((act: string) => {
        y = checkAddPage(doc, y, 8);
        doc.text(`• ${act}`, 18, y);
        y += 4;
      });
    }

    // Materials
    if (log.data.materials && log.data.materials.length > 0) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.primary);
      doc.text('Materiales:', 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      doc.text(log.data.materials.join(', '), 18, y);
      y += 5;
    }

    // Equipment
    if (log.data.equipment && log.data.equipment.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.primary);
      doc.text('Equipos:', 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      doc.text(log.data.equipment.join(', '), 18, y);
      y += 5;
    }

    // Observations
    if (log.data.observations) {
      y += 1;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.muted);
      doc.text('Observaciones:', 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      const lines = doc.splitTextToSize(log.data.observations, pageW - 36);
      lines.forEach((line: string) => {
        y = checkAddPage(doc, y, 6);
        doc.text(line, 18, y);
        y += 4;
      });
    }

    y += 4;
  });

  addFooter(doc);
  doc.save(`bitacora-${data.projectName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   EXPORTAR PRESUPUESTO A PDF
   ═══════════════════════════════════════════════ */

export async function exportBudgetPDF(data: {
  expenses: any[];
  projects: any[];
  projectName?: string;
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  const title = data.projectName ? `Presupuesto - ${data.projectName}` : 'Presupuesto General';
  addHeader(doc, title, 'Detalle de gastos por categoría y proyecto');

  let y = 40;

  // Budget summary
  const totalBudget = data.projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = data.expenses.reduce((s, e) => s + (e.data.amount || 0), 0);

  const summaryData = [
    { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget) },
    { label: 'Total Gastado', value: fmtCOPFull(totalSpent) },
    { label: 'Saldo Disponible', value: fmtCOPFull(totalBudget - totalSpent) },
    { label: 'Utilización', value: `${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%` },
  ];

  summaryData.forEach((item, i) => {
    const boxW = (pageW - 28 - 9) / 4;
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(x, y, boxW, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.primary);
    doc.text(item.value, x + 3, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(item.label, x + 3, y + 12);
  });

  y += 22;

  // Expenses by category
  const catData: Record<string, number> = {};
  data.expenses.forEach(e => {
    const c = e.data.category || 'Otro';
    catData[c] = (catData[c] || 0) + e.data.amount;
  });
  const categories = Object.entries(catData).sort((a, b) => b[1] - a[1]);

  y = checkAddPage(doc, y, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Gastos por Categoría', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Total (COP)', '% del Total']],
    body: categories.map(([cat, amount]) => [
      cat,
      fmtCOPFull(amount),
      `${totalSpent > 0 ? (amount / totalSpent * 100).toFixed(1) : 0}%`
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: BRAND.text },
    alternateRowStyles: { fillColor: BRAND.bg },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // All expenses detail
  y = checkAddPage(doc, y, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Detalle de Gastos', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Categoría', 'Monto (COP)', 'Fecha']],
    body: data.expenses.slice(0, 50).map(e => [
      e.data.concept, e.data.category, fmtCOPFull(e.data.amount), e.data.date || '-'
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: BRAND.bg },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`presupuesto-${data.projectName || 'general'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   EXPORTAR TIEMPO A PDF
   ═══════════════════════════════════════════════ */

export async function exportTimeReportPDF(data: {
  timeEntries: any[];
  teamUsers: any[];
  projects: any[];
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  addHeader(doc, 'Reporte de Tiempo', 'Registro de horas por proyecto y miembro');

  let y = 40;

  const totalMins = data.timeEntries.reduce((s, e) => s + (e.data.duration || 0), 0);
  const billableMins = data.timeEntries.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0), 0);
  const billableValue = data.timeEntries.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0) * (e.data.rate || 0) / 60, 0);

  const stats = [
    { label: 'Total Horas', value: fmtDuration(totalMins) },
    { label: 'Facturable', value: fmtDuration(billableMins) },
    { label: 'Valor Facturable', value: fmtCOPFull(billableValue) },
    { label: 'Registros', value: String(data.timeEntries.length) },
  ];

  const pageW = doc.internal.pageSize.getWidth();
  const boxW = (pageW - 28 - 9) / 4;
  stats.forEach((stat, i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(x, y, boxW, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.primary);
    doc.text(stat.value, x + 3, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(stat.label, x + 3, y + 12);
  });

  y += 22;

  // Time entries table
  y = checkAddPage(doc, y, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text('Registros de Tiempo', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Proyecto', 'Fase', 'Descripción', 'Duración', 'Facturable', 'Valor']],
    body: data.timeEntries.slice(0, 50).map(e => {
      const proj = data.projects.find(p => p.id === e.data.projectId);
      return [
        proj?.data.name || '-',
        e.data.phaseName || '-',
        e.data.description || '-',
        fmtDuration(e.data.duration || 0),
        e.data.billable ? 'Sí' : 'No',
        fmtCOPFull((e.data.duration || 0) * (e.data.rate || 0) / 60),
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: BRAND.bg },
    columnStyles: { 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`reporte-tiempo-${new Date().toISOString().split('T')[0]}.pdf`);
}
