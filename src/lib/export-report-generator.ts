/**
 * export-report-generator.ts
 * Premium PDF report generation for ArchiFlow Report Generator screen.
 * Uses pdf-branding.ts for company headers/footers and theme colors.
 */

import type jsPDF from 'jspdf';
import {
  getThemeColors,
  getCompanyBranding,
  addBrandedHeader,
  addBrandedFooter,
  addCoverPage,
  addTableOfContents,
  checkAddPage,
  addSectionTitle,
  addKPIBoxes,
} from './pdf-branding';
import type { Company, Project, Task, Expense, Invoice } from './types';

/* ===== Report Options Interface ===== */

export interface ReportOptions {
  includeCharts: boolean;
  includePhotos: boolean;
  includeSignatures: boolean;
  includeDetails: boolean;
}

export interface DateRange {
  from: string;
  to: string;
}

/* ===== COP Formatting ===== */

function fmtCOPFull(n: number): string {
  if (!n || n === 0) return '$0';
  return '$' + Number(n).toLocaleString('es-CO');
}

function fmtDateStr(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(range: DateRange): string {
  const from = fmtDateStr(range.from);
  const to = fmtDateStr(range.to);
  if (range.from && range.to) return `${from} – ${to}`;
  return from;
}

function filterByDate<T extends { data: { date?: string; createdAt?: { toDate(): Date } | null } }>(
  items: T[],
  range: DateRange,
  dateField: 'date' | 'createdAt' = 'date',
): T[] {
  if (!range.from && !range.to) return items;
  return items.filter((item) => {
    const raw = item.data[dateField];
    const d = raw
      ? typeof raw === 'string'
        ? new Date(raw)
        : 'toDate' in raw && raw.toDate
          ? raw.toDate()
          : null
      : null;
    if (!d) return false;
    if (range.from && d < new Date(range.from)) return false;
    if (range.to) {
      const toDate = new Date(range.to);
      toDate.setDate(toDate.getDate() + 1);
      if (d >= toDate) return false;
    }
    return true;
  });
}

/* ═══════════════════════════════════════════════
   GENERATE PROJECT REPORT PDF
   ═══════════════════════════════════════════════ */

export async function generateProjectReport(
  project: Project | null,
  projects: Project[],
  tasks: Task[],
  expenses: Expense[],
  invoices: Invoice[],
  teamUsers: { id: string; data: { name: string; role?: string } }[],
  company: Company | undefined,
  dateRange: DateRange,
  options: ReportOptions,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(company);

  const projectName = project?.data.name || 'Todos los Proyectos';
  const relevantProjects = project ? [project] : projects;
  const relevantTasks = tasks.filter((t) =>
    project ? t.data.projectId === project.id : true,
  );
  const relevantExpenses = expenses.filter((e) =>
    project ? e.data.projectId === project.id : true,
  );
  const filteredExpenses = filterByDate(relevantExpenses, dateRange);
  const filteredTasks = relevantTasks.filter((t) => {
    if (!t.data.dueDate && !t.data.createdAt) return true;
    if (dateRange.from && t.data.dueDate && new Date(t.data.dueDate) < new Date(dateRange.from)) return false;
    if (dateRange.to && t.data.dueDate) {
      const to = new Date(dateRange.to);
      to.setDate(to.getDate() + 1);
      if (new Date(t.data.dueDate) >= to) return false;
    }
    return true;
  });

  const totalBudget = relevantProjects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = filteredExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
  const taskCompleted = filteredTasks.filter((t) => t.data.status === 'Completado').length;
  const taskTotal = filteredTasks.length;
  const avgProgress =
    relevantProjects.length > 0
      ? Math.round(relevantProjects.reduce((s, p) => s + (p.data.progress || 0), 0) / relevantProjects.length)
      : 0;
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Summary items for cover
  const summaryItems = [
    { label: 'Progreso', value: `${avgProgress}%` },
    { label: 'Presupuesto', value: fmtCOPFull(totalBudget) },
    { label: 'Gastado', value: fmtCOPFull(totalSpent) },
    { label: 'Tareas', value: `${taskCompleted}/${taskTotal}` },
  ];

  // ── COVER PAGE ──
  addCoverPage(doc, {
    reportTitle: 'Reporte de Proyecto',
    reportType: 'Reporte Ejecutivo',
    projectName: projectName,
    clientName: project?.data.client || undefined,
    dateRange: formatDateRange(dateRange),
    branding,
    colors: C,
    summaryItems,
  });

  // ── TABLE OF CONTENTS ──
  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, [
    { title: 'Resumen Ejecutivo', page: 3 },
    { title: 'Progreso y Avance', page: 3 },
    { title: 'Tareas Detalladas', page: 4 },
    { title: 'Presupuesto y Gastos', page: 5 },
    { title: 'Equipo Asignado', page: 6 },
    { title: 'Cronograma', page: 7 },
  ]);

  // ── CONTENT PAGES ──
  doc.addPage();
  addBrandedHeader(doc, 'Reporte de Proyecto', projectName, branding, C);
  let y = 38;

  // Section 1: Resumen Ejecutivo
  y = addSectionTitle(doc, y, '1. Resumen Ejecutivo', C);
  y = addKPIBoxes(
    doc,
    y,
    [
      { label: 'Total Proyectos', value: String(relevantProjects.length), color: C.primary },
      { label: 'Progreso Promedio', value: `${avgProgress}%`, color: avgProgress > 70 ? C.green : C.primary },
      { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget), color: C.primary },
      { label: 'Total Gastado', value: fmtCOPFull(totalSpent), color: totalSpent > totalBudget ? C.red : C.text },
      { label: 'Utilización', value: `${budgetPct}%`, color: budgetPct > 90 ? C.red : C.green },
      { label: 'Tareas Completadas', value: `${taskCompleted}/${taskTotal}`, color: C.green },
    ],
    C,
  );

  // Projects overview table
  y = addSectionTitle(doc, y, '2. Progreso y Avance', C);
  if (relevantProjects.length > 0) {
    y = checkAddPage(doc, y, 50);
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Estado', 'Cliente', 'Presupuesto', 'Progreso']],
      body: relevantProjects.map((p) => [
        p.data.name,
        p.data.status,
        p.data.client || '—',
        fmtCOPFull(p.data.budget || 0),
        `${p.data.progress || 0}%`,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 3: Tasks
  y = addSectionTitle(doc, y, '3. Tareas Detalladas', C);
  if (filteredTasks.length > 0) {
    // Task status summary
    const statusCounts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      const s = t.data.status || 'Sin estado';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Estado', 'Cantidad', 'Porcentaje']],
      body: Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => [
          status,
          String(count),
          `${Math.round((count / filteredTasks.length) * 100)}%`,
        ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;

    // Tasks detail table
    if (options.includeDetails) {
      y = checkAddPage(doc, y, 50);
      autoTable(doc, {
        startY: y,
        head: [['Tarea', 'Prioridad', 'Estado', 'Asignado', 'Fecha Límite']],
        body: filteredTasks.slice(0, 40).map((t) => {
          const assignee = teamUsers.find((u) => u.id === t.data.assigneeId);
          return [
            t.data.title,
            t.data.priority,
            t.data.status,
            assignee?.data.name || 'Sin asignar',
            t.data.dueDate || '—',
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: C.text },
        alternateRowStyles: { fillColor: C.bg },
        columnStyles: { 4: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });
      y = (doc.lastAutoTable?.finalY || y) + 10;
    }
  }

  // Section 4: Budget
  y = addSectionTitle(doc, y, '4. Presupuesto y Gastos', C);
  y = addKPIBoxes(
    doc,
    y,
    [
      { label: 'Presupuesto', value: fmtCOPFull(totalBudget), color: C.primary },
      { label: 'Gastado', value: fmtCOPFull(totalSpent), color: C.text },
      { label: 'Saldo', value: fmtCOPFull(totalBudget - totalSpent), color: totalBudget - totalSpent >= 0 ? C.green : C.red },
      { label: 'Utilización', value: `${budgetPct}%`, color: budgetPct > 90 ? C.red : C.green },
    ],
    C,
  );

  // Expenses by category
  if (filteredExpenses.length > 0) {
    const catData: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const c = e.data.category || 'Otro';
      catData[c] = (catData[c] || 0) + e.data.amount;
    });
    const cats = Object.entries(catData).sort((a, b) => b[1] - a[1]);

    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Categoría', 'Total (COP)', '% del Total']],
      body: cats.map(([cat, amount]) => [
        cat,
        fmtCOPFull(amount),
        `${totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 5: Team
  y = addSectionTitle(doc, y, '5. Equipo Asignado', C);
  const projectAssignees = [...new Set(filteredTasks.map((t) => t.data.assigneeId).filter(Boolean))];
  const teamMembers = teamUsers.filter((u) => projectAssignees.includes(u.id));
  if (teamMembers.length > 0) {
    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Miembro', 'Rol', 'Tareas Asignadas', 'Completadas']],
      body: teamMembers.map((u) => {
        const memberTasks = filteredTasks.filter((t) => t.data.assigneeId === u.id);
        const completed = memberTasks.filter((t) => t.data.status === 'Completado').length;
        return [u.data.name, u.data.role || 'Miembro', String(memberTasks.length), String(completed)];
      }),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 6: Timeline
  y = addSectionTitle(doc, y, '6. Cronograma', C);
  if (relevantProjects.length > 0) {
    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Inicio', 'Fin', 'Duración (días)', 'Progreso']],
      body: relevantProjects.map((p) => {
        const start = p.data.startDate ? new Date(p.data.startDate) : null;
        const end = p.data.endDate ? new Date(p.data.endDate) : null;
        const days = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        return [
          p.data.name,
          fmtDateStr(p.data.startDate),
          fmtDateStr(p.data.endDate),
          String(days),
          `${p.data.progress || 0}%`,
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
  }

  // Signature section
  if (options.includeSignatures) {
    const pageW = doc.internal.pageSize.getWidth();
    y = checkAddPage(doc, y + 20, 50);
    y = addSectionTitle(doc, y, 'Firmas de Aprobación', C);

    const sigY = y + 10;
    const sigW = (pageW - 28 - 15) / 2;
    ['Elaboró', 'Aprobó'].forEach((label, i) => {
      const x = 14 + i * (sigW + 15);
      doc.setDrawColor(...C.muted);
      doc.setLineWidth(0.3);
      doc.line(x, sigY + 20, x + sigW, sigY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(label, x + sigW / 2, sigY + 25, { align: 'center' });
      doc.text('Nombre:', x + 2, sigY + 32);
      doc.text('Cargo:', x + 2, sigY + 38);
      doc.text('Fecha:', x + 2, sigY + 44);
    });
  }

  addBrandedFooter(doc);
  const safeName = projectName.replace(/[^a-zA-Z0-9áéíóúñ]/g, '-').substring(0, 30);
  doc.save(`reporte-proyecto-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   GENERATE FINANCIAL REPORT PDF
   ═══════════════════════════════════════════════ */

export async function generateFinancialReport(
  project: Project | null,
  projects: Project[],
  expenses: Expense[],
  invoices: Invoice[],
  company: Company | undefined,
  dateRange: DateRange,
  options: ReportOptions,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(company);

  const projectName = project?.data.name || 'Todos los Proyectos';
  const relevantExpenses = expenses.filter((e) =>
    project ? e.data.projectId === project.id : true,
  );
  const filteredExpenses = filterByDate(relevantExpenses, dateRange);
  const relevantInvoices = invoices.filter((inv) =>
    project ? inv.data.projectId === project.id : true,
  );
  const invoiceDateItems = relevantInvoices.map((inv) => ({
    id: inv.id,
    data: { ...inv.data, date: inv.data.issueDate } as Invoice['data'] & { date: string },
  }));
  const filteredInvoices = filterByDate(invoiceDateItems, dateRange)
    .map((item) => relevantInvoices.find((inv) => inv.id === item.id) || item);

  const totalBudget = project ? project.data.budget : projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = filteredExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
  const totalInvoiced = filteredInvoices.filter((i) => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0);
  const totalPaid = filteredInvoices.filter((i) => i.data.status === 'Pagada').reduce((s, i) => s + (i.data.total || 0), 0);
  const totalPending = filteredInvoices.filter((i) => i.data.status === 'Enviada' || i.data.status === 'Borrador').reduce((s, i) => s + (i.data.total || 0), 0);
  const totalOverdue = filteredInvoices.filter((i) => i.data.status === 'Vencida').reduce((s, i) => s + (i.data.total || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const margin = totalInvoiced > 0 ? Math.round(((totalInvoiced - totalSpent) / totalInvoiced) * 100) : 0;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  // ── COVER PAGE ──
  addCoverPage(doc, {
    reportTitle: 'Reporte Financiero',
    reportType: 'Análisis Financiero',
    projectName,
    clientName: project?.data.client || undefined,
    dateRange: formatDateRange(dateRange),
    branding,
    colors: C,
    summaryItems: [
      { label: 'Presupuesto', value: fmtCOPFull(totalBudget) },
      { label: 'Gastado', value: fmtCOPFull(totalSpent) },
      { label: 'Facturado', value: fmtCOPFull(totalInvoiced) },
      { label: 'Margen', value: `${margin}%` },
    ],
  });

  // ── TABLE OF CONTENTS ──
  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, [
    { title: 'Resumen Financiero', page: 3 },
    { title: 'Presupuesto vs Ejecución', page: 3 },
    { title: 'Gastos por Categoría', page: 4 },
    { title: 'Detalle de Gastos', page: 5 },
    { title: 'Resumen de Facturación', page: 6 },
    { title: 'Estado de Cobro', page: 7 },
  ]);

  // ── CONTENT PAGES ──
  doc.addPage();
  addBrandedHeader(doc, 'Reporte Financiero', projectName, branding, C);
  let y = 38;

  // Section 1: Financial Summary
  y = addSectionTitle(doc, y, '1. Resumen Financiero', C);
  y = addKPIBoxes(
    doc,
    y,
    [
      { label: 'Presupuesto', value: fmtCOPFull(totalBudget), color: C.primary },
      { label: 'Total Gastado', value: fmtCOPFull(totalSpent), color: C.text },
      { label: 'Saldo Disponible', value: fmtCOPFull(totalBudget - totalSpent), color: totalBudget - totalSpent >= 0 ? C.green : C.red },
      { label: 'Utilización', value: `${budgetPct}%`, color: budgetPct > 90 ? C.red : C.green },
      { label: 'Total Facturado', value: fmtCOPFull(totalInvoiced), color: C.primary },
      { label: 'Margen Bruto', value: `${margin}%`, color: margin > 20 ? C.green : margin > 0 ? C.primary : C.red },
    ],
    C,
  );

  // Section 2: Budget vs Actual (per project)
  y = addSectionTitle(doc, y, '2. Presupuesto vs Ejecución', C);
  const relevantProjects = project ? [project] : projects;
  if (relevantProjects.length > 0) {
    y = checkAddPage(doc, y, 50);
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Presupuesto', 'Gastado', 'Variación', '% Ejecutado']],
      body: relevantProjects.map((p) => {
        const spent = filteredExpenses.filter((e) => e.data.projectId === p.id).reduce((s, e) => s + e.data.amount, 0);
        const variation = (p.data.budget || 0) - spent;
        const pct = (p.data.budget || 0) > 0 ? Math.round((spent / (p.data.budget || 0)) * 100) : 0;
        return [
          p.data.name,
          fmtCOPFull(p.data.budget || 0),
          fmtCOPFull(spent),
          fmtCOPFull(variation),
          `${pct}%`,
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 3: Expenses by Category
  y = addSectionTitle(doc, y, '3. Gastos por Categoría', C);
  if (filteredExpenses.length > 0) {
    const catData: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const c = e.data.category || 'Otro';
      catData[c] = (catData[c] || 0) + e.data.amount;
    });
    const cats = Object.entries(catData).sort((a, b) => b[1] - a[1]);

    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Categoría', 'Total (COP)', '% del Total', 'N. Transacciones']],
      body: cats.map(([cat, amount]) => {
        const count = filteredExpenses.filter((e) => (e.data.category || 'Otro') === cat).length;
        return [cat, fmtCOPFull(amount), `${totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0}%`, String(count)];
      }),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 4: Expense Detail
  if (options.includeDetails && filteredExpenses.length > 0) {
    y = addSectionTitle(doc, y, '4. Detalle de Gastos', C);
    y = checkAddPage(doc, y, 50);
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Categoría', 'Monto (COP)', 'Fecha', 'Proveedor']],
      body: filteredExpenses.slice(0, 50).map((e) => [
        e.data.concept,
        e.data.category || '—',
        fmtCOPFull(e.data.amount),
        fmtDateStr(e.data.date),
        e.data.supplier || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Section 5: Invoice Summary
  y = addSectionTitle(doc, y, options.includeDetails ? '5. Resumen de Facturación' : '4. Resumen de Facturación', C);
  y = addKPIBoxes(
    doc,
    y,
    [
      { label: 'Total Facturado', value: fmtCOPFull(totalInvoiced), color: C.primary },
      { label: 'Cobrado', value: fmtCOPFull(totalPaid), color: C.green },
      { label: 'Por Cobrar', value: fmtCOPFull(totalPending), color: C.primary },
      { label: 'Vencido', value: fmtCOPFull(totalOverdue), color: totalOverdue > 0 ? C.red : C.text },
      { label: 'Tasa de Cobro', value: `${collectionRate}%`, color: collectionRate > 80 ? C.green : C.red },
    ],
    C,
  );

  if (filteredInvoices.length > 0) {
    y = checkAddPage(doc, y, 50);
    autoTable(doc, {
      startY: y,
      head: [['Factura', 'Proyecto', 'Estado', 'Total (COP)', 'Emisión', 'Vencimiento']],
      body: filteredInvoices.map((inv) => [
        inv.data.number || 'S/N',
        inv.data.projectName || '—',
        inv.data.status,
        fmtCOPFull(inv.data.total || 0),
        fmtDateStr(inv.data.issueDate),
        fmtDateStr(inv.data.dueDate),
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
  }

  // Signature section
  if (options.includeSignatures) {
    const pageW = doc.internal.pageSize.getWidth();
    y = checkAddPage(doc, (doc.lastAutoTable?.finalY || y) + 20, 50);
    y = addSectionTitle(doc, y, 'Firmas de Aprobación', C);
    const sigY = y + 10;
    const sigW = (pageW - 28 - 15) / 2;
    ['Revisó', 'Aprobó'].forEach((label, i) => {
      const x = 14 + i * (sigW + 15);
      doc.setDrawColor(...C.muted);
      doc.setLineWidth(0.3);
      doc.line(x, sigY + 20, x + sigW, sigY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(label, x + sigW / 2, sigY + 25, { align: 'center' });
      doc.text('Nombre:', x + 2, sigY + 32);
      doc.text('Cargo:', x + 2, sigY + 38);
      doc.text('Fecha:', x + 2, sigY + 44);
    });
  }

  addBrandedFooter(doc);
  const safeName = projectName.replace(/[^a-zA-Z0-9áéíóúñ]/g, '-').substring(0, 30);
  doc.save(`reporte-financiero-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════
   GENERATE FIELD REPORT PDF
   ═══════════════════════════════════════════════ */

export interface FieldReportData {
  dailyLogs: { id: string; data: { date: string; weather: string; temperature: number; activities: string[]; laborCount: number; equipment: string[]; materials: string[]; observations: string; supervisor: string; photos: string[] } }[];
  fieldNotes: { id: string; data: { date: string; weather: string; participants: string[]; activities: string[]; observations: string; commitments: string[]; supervisor: string } }[];
  inspections: { id: string; data: { title: string; type: string; status: string; inspector: string; date: string; items: { description: string; status: string; score: number; notes: string }[]; overallScore: number; observations: string } }[];
}

export async function generateFieldReport(
  project: Project | null,
  fieldData: FieldReportData,
  company: Company | undefined,
  dateRange: DateRange,
  options: ReportOptions,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(company);

  const projectName = project?.data.name || 'Todos los Proyectos';
  const logs = fieldData.dailyLogs || [];
  const notes = fieldData.fieldNotes || [];
  const inspections = fieldData.inspections || [];

  // Filter by date
  const filteredLogs = filterByDate(logs, dateRange);
  const filteredNotes = filterByDate(notes, dateRange);
  const filteredInspections = filterByDate(inspections, dateRange);

  const totalActivities = filteredLogs.reduce((s, l) => s + (l.data.activities?.length || 0), 0);
  const avgLabor = filteredLogs.length > 0 ? Math.round(filteredLogs.reduce((s, l) => s + (l.data.laborCount || 0), 0) / filteredLogs.length) : 0;
  const totalInspections = filteredInspections.length;
  const avgScore = totalInspections > 0 ? Math.round(filteredInspections.reduce((s, ins) => s + (ins.data.overallScore || 0), 0) / totalInspections) : 0;

  // ── COVER PAGE ──
  addCoverPage(doc, {
    reportTitle: 'Reporte de Obra',
    reportType: 'Reporte de Campo',
    projectName,
    dateRange: formatDateRange(dateRange),
    branding,
    colors: C,
    summaryItems: [
      { label: 'Registros', value: String(filteredLogs.length) },
      { label: 'Minutas', value: String(filteredNotes.length) },
      { label: 'Inspecciones', value: String(totalInspections) },
      { label: 'Promedio Personal', value: String(avgLabor) },
    ],
  });

  // ── TABLE OF CONTENTS ──
  const sections = [
    { title: 'Resumen de Obra', page: 3 },
    { title: 'Bitácora Diaria', page: 3 },
  ];
  if (filteredNotes.length > 0) sections.push({ title: 'Minutas de Obra', page: 5 });
  if (filteredInspections.length > 0) sections.push({ title: 'Inspecciones', page: 6 });

  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, sections);

  // ── CONTENT PAGES ──
  doc.addPage();
  addBrandedHeader(doc, 'Reporte de Obra', projectName, branding, C);
  let y = 38;

  // Section 1: Summary
  y = addSectionTitle(doc, y, '1. Resumen de Obra', C);
  y = addKPIBoxes(
    doc,
    y,
    [
      { label: 'Registros Diarios', value: String(filteredLogs.length), color: C.primary },
      { label: 'Total Actividades', value: String(totalActivities), color: C.text },
      { label: 'Promedio Personal', value: String(avgLabor), color: C.primary },
      { label: 'Minutas', value: String(filteredNotes.length), color: C.text },
      { label: 'Inspecciones', value: String(totalInspections), color: C.primary },
      { label: 'Score Promedio', value: `${avgScore}%`, color: avgScore >= 80 ? C.green : avgScore >= 60 ? [245, 158, 11] as [number, number, number] : C.red },
    ],
    C,
  );

  // Section 2: Daily Logs
  y = addSectionTitle(doc, y, '2. Bitácora Diaria', C);
  if (filteredLogs.length > 0) {
    const sortedLogs = [...filteredLogs].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));

    // Summary table
    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Clima', 'Temp.', 'Personal', 'Actividades', 'Supervisor']],
      body: sortedLogs.map((log) => [
        fmtDateStr(log.data.date),
        log.data.weather || '—',
        log.data.temperature ? `${log.data.temperature}°C` : '—',
        String(log.data.laborCount || 0),
        String(log.data.activities?.length || 0),
        log.data.supervisor || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;

    // Detailed log entries if includeDetails
    if (options.includeDetails) {
      sortedLogs.slice(0, 10).forEach((log) => {
        y = checkAddPage(doc, y, 40);

        // Date header
        const pageW = doc.internal.pageSize.getWidth();
        doc.setFillColor(...C.dark);
        doc.roundedRect(14, y, pageW - 28, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...C.white);
        doc.text(
          `${log.data.date || 'Sin fecha'}    ${log.data.weather || ''}  ${log.data.temperature ? log.data.temperature + '°C' : ''}    Personal: ${log.data.laborCount || 0}    Supervisor: ${log.data.supervisor || '-'}`,
          18,
          y + 5,
        );
        y += 10;

        // Activities
        if (log.data.activities && log.data.activities.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...C.primary);
          doc.text('Actividades:', 14, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...C.text);
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
          doc.setTextColor(...C.primary);
          doc.text('Materiales:', 14, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...C.text);
          doc.text(log.data.materials.join(', '), 18, y);
          y += 5;
        }

        // Equipment
        if (log.data.equipment && log.data.equipment.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...C.primary);
          doc.text('Equipos:', 14, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...C.text);
          doc.text(log.data.equipment.join(', '), 18, y);
          y += 5;
        }

        // Observations
        if (log.data.observations) {
          y += 1;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...C.muted);
          doc.text('Observaciones:', 14, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...C.text);
          const lines = doc.splitTextToSize(log.data.observations, 170);
          lines.forEach((line: string) => {
            y = checkAddPage(doc, y, 6);
            doc.text(line, 18, y);
            y += 4;
          });
        }
        y += 4;
      });
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text('No hay registros en la bitácora para el período seleccionado', 14, y + 4);
  }

  // Section 3: Field Notes (Minutas)
  if (filteredNotes.length > 0) {
    y = addSectionTitle(doc, y, '3. Minutas de Obra', C);
    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Supervisor', 'Participantes', 'Actividades', 'Compromisos']],
      body: filteredNotes.slice(0, 20).map((note) => [
        fmtDateStr(note.data.date),
        note.data.supervisor || '—',
        String(note.data.participants?.length || 0),
        String(note.data.activities?.length || 0),
        String(note.data.commitments?.length || 0),
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;

    // Detailed commitments if includeDetails
    if (options.includeDetails) {
      const allCommitments = filteredNotes
        .filter((n) => n.data.commitments?.length)
        .map((n) => n.data.commitments!.map((c: string) => ({ text: c, date: n.data.date, supervisor: n.data.supervisor })))
        .flat();

      if (allCommitments.length > 0) {
        y = checkAddPage(doc, y, 40);
        autoTable(doc, {
          startY: y,
          head: [['Compromiso', 'Fecha Minuta', 'Supervisor']],
          body: allCommitments.map((c) => [c.text, fmtDateStr(c.date), c.supervisor || '—']),
          theme: 'striped',
          headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: C.text },
          alternateRowStyles: { fillColor: C.bg },
          margin: { left: 14, right: 14 },
        });
        y = (doc.lastAutoTable?.finalY || y) + 10;
      }
    }
  }

  // Section 4: Inspections
  if (filteredInspections.length > 0) {
    y = addSectionTitle(doc, y, `4. Inspecciones`, C);
    y = checkAddPage(doc, y, 40);
    autoTable(doc, {
      startY: y,
      head: [['Título', 'Tipo', 'Inspector', 'Fecha', 'Score', 'Estado']],
      body: filteredInspections.map((ins) => [
        ins.data.title,
        ins.data.type || '—',
        ins.data.inspector || '—',
        fmtDateStr(ins.data.date),
        `${ins.data.overallScore || 0}%`,
        ins.data.status,
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;

    // Detailed inspection items
    if (options.includeDetails) {
      filteredInspections.slice(0, 5).forEach((ins) => {
        if (!ins.data.items?.length) return;
        y = addSectionTitle(doc, y, `Inspección: ${ins.data.title}`, C);
        y = checkAddPage(doc, y, 40);
        autoTable(doc, {
          startY: y,
          head: [['Item', 'Estado', 'Score', 'Notas']],
          body: ins.data.items.map((item) => [
            item.description,
            item.status,
            `${item.score}%`,
            item.notes || '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7, textColor: C.text },
          alternateRowStyles: { fillColor: C.bg },
          columnStyles: { 2: { halign: 'center' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc.lastAutoTable?.finalY || y) + 10;
      });
    }
  }

  // Signature section
  if (options.includeSignatures) {
    const pageW = doc.internal.pageSize.getWidth();
    y = checkAddPage(doc, y + 20, 50);
    y = addSectionTitle(doc, y, 'Firmas de Aprobación', C);
    const sigY = y + 10;
    const sigW = (pageW - 28 - 15) / 2;
    ['Residente / Supervisor', 'Director de Obra'].forEach((label, i) => {
      const x = 14 + i * (sigW + 15);
      doc.setDrawColor(...C.muted);
      doc.setLineWidth(0.3);
      doc.line(x, sigY + 20, x + sigW, sigY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(label, x + sigW / 2, sigY + 25, { align: 'center' });
      doc.text('Nombre:', x + 2, sigY + 32);
      doc.text('C.C. / NIT:', x + 2, sigY + 38);
      doc.text('Fecha:', x + 2, sigY + 44);
    });
  }

  addBrandedFooter(doc);
  const safeName = projectName.replace(/[^a-zA-Z0-9áéíóúñ]/g, '-').substring(0, 30);
  doc.save(`reporte-obra-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
