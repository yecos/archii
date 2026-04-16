/**
 * export-reports.ts
 * Premium branded PDF reports: Reporte de Proyecto, Reporte Financiero, Reporte de Obra.
 * Uses pdf-branding.ts for professional company-branded headers, footers, and cover pages.
 */

import type jsPDF from 'jspdf';
import { fmtDuration } from './helpers';
import type {
  Project, Task, Expense, Invoice, TeamUser, TimeEntry,
  DailyLog, FieldNote, PhotoLogEntry, Inspection, ChangeOrder,
  Company,
} from './types';
import {
  getThemeColors,
  getCompanyBranding,
  addBrandedHeader,
  addBrandedFooter,
  addCoverPage,
  addTableOfContents,
  addSectionTitle,
  addKPIBoxes,
  checkAddPage,
  type CompanyBranding,
} from './pdf-branding';

/* ===== Currency formatting (consistent with export-pdf.ts) ===== */

function fmtCOPFull(n: number): string {
  if (!n || n === 0) return '$0';
  return '$' + Number(n).toLocaleString('es-CO');
}

/* ===== Auto-table import helper ===== */

async function getPdfModules() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

/* ===== Common table styles factory ===== */

function tableStyles(colors: ReturnType<typeof getThemeColors>) {
  return {
    theme: 'striped' as const,
    headStyles: {
      fillColor: colors.dark,
      textColor: colors.white,
      fontSize: 8,
      fontStyle: 'bold' as const,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: colors.text,
    },
    alternateRowStyles: {
      fillColor: colors.bg,
    },
    margin: { left: 14, right: 14 },
  };
}

/* ═══════════════════════════════════════════════════════════
   REPORTE DE PROYECTO
   Executive summary: progress, budget, timeline, team, milestones
   ═══════════════════════════════════════════════════════════ */

export async function exportProjectReportPDF(data: {
  projects: Project[];
  tasks: Task[];
  expenses: Expense[];
  invoices: Invoice[];
  teamUsers: TeamUser[];
  timeEntries: TimeEntry[];
  company?: Company;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCharts?: boolean;
  includePhotos?: boolean;
  includeSignatures?: boolean;
}) {
  const { jsPDF, autoTable } = await getPdfModules();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(data.company);
  const ts = tableStyles(C);

  // Filter to specific project if requested
  const projects = data.projectId
    ? data.projects.filter(p => p.id === data.projectId)
    : data.projects;

  const project = projects[0];
  const projectName = project?.data?.name || 'Todos los Proyectos';
  const clientName = project?.data?.client || 'Varios';
  const dateRange = data.dateFrom && data.dateTo
    ? `${data.dateFrom} — ${data.dateTo}`
    : 'Todo el período';

  // KPI calculations
  const tasksForProjects = data.tasks.filter(t =>
    !data.projectId || t.data.projectId === data.projectId,
  );
  const expensesForProjects = data.expenses.filter(e =>
    !data.projectId || e.data.projectId === data.projectId,
  );
  const invoicesForProjects = data.invoices.filter(i =>
    !data.projectId || i.data.projectId === data.projectId,
  );
  const timeForProjects = data.timeEntries.filter(e =>
    !data.projectId || e.data.projectId === data.projectId,
  );

  const totalBudget = projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = expensesForProjects.reduce((s, e) => s + (e.data.amount || 0), 0);
  const totalInvoiced = invoicesForProjects
    .filter(i => i.data.status !== 'Cancelada')
    .reduce((s, i) => s + (i.data.total || 0), 0);
  const tasksCompleted = tasksForProjects.filter(t => t.data.status === 'Completado').length;
  const tasksTotal = tasksForProjects.length;
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const totalMinutes = timeForProjects.reduce((s, e) => s + (e.data.duration || 0), 0);
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.data.progress || 0), 0) / projects.length)
    : 0;

  // ═══════ COVER PAGE ═══════
  addCoverPage(doc, {
    reportTitle: 'Reporte de Proyecto',
    reportType: 'Reporte Ejecutivo',
    projectName,
    clientName,
    dateRange,
    branding,
    colors: C,
    summaryItems: [
      { label: 'Progreso Promedio', value: `${avgProgress}%` },
      { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget) },
      { label: 'Utilización', value: `${budgetPct}%` },
      { label: 'Tareas', value: `${tasksCompleted}/${tasksTotal}` },
    ],
  });

  // ═══════ TABLE OF CONTENTS ═══════
  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, [
    { title: 'Resumen Ejecutivo', page: 3 },
    { title: 'Estado de Proyectos', page: 4 },
    { title: 'Presupuesto y Finanzas', page: 5 },
    { title: 'Tareas y Cronograma', page: 6 },
    { title: 'Equipo de Trabajo', page: 7 },
    { title: 'Tiempo Registrado', page: 8 },
  ]);

  // ═══════ PAGE 3: EXECUTIVE SUMMARY ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Reporte de Proyecto', `Resumen Ejecutivo — ${projectName}`, branding, C);

  let y = 36;

  // KPI boxes
  y = addKPIBoxes(doc, y, [
    { label: 'Proyectos Activos', value: String(projects.length), color: [59, 130, 246] as [number, number, number] },
    { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget), color: C.primary },
    { label: 'Total Gastado', value: fmtCOPFull(totalSpent), color: totalSpent > totalBudget ? C.red : C.green },
    { label: 'Utilización Presupuesto', value: `${budgetPct}%`, color: budgetPct > 90 ? C.red : C.green },
    { label: 'Tareas Completadas', value: `${tasksCompleted}/${tasksTotal}`, color: C.green },
    { label: 'Total Facturado', value: fmtCOPFull(totalInvoiced), color: [59, 130, 246] as [number, number, number] },
    { label: 'Horas Registradas', value: fmtDuration(totalMinutes), color: C.primary },
    { label: 'Progreso Promedio', value: `${avgProgress}%`, color: C.primary },
    { label: 'Miembros de Equipo', value: String(data.teamUsers.length), color: [59, 130, 246] as [number, number, number] },
  ], C);

  // Status summary paragraph
  y += 4;
  y = checkAddPage(doc, y, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text('Resumen General', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  const summaryText = `El portafolio cuenta con ${projects.length} proyecto(s) activo(s) con un presupuesto total de ${fmtCOPFull(totalBudget)}. Se ha ejecutado el ${budgetPct}% del presupuesto con un gasto acumulado de ${fmtCOPFull(totalSpent)}. El progreso promedio de los proyectos es del ${avgProgress}%, con ${tasksCompleted} de ${tasksTotal} tareas completadas. Se han registrado ${fmtDuration(totalMinutes)} de trabajo del equipo y facturado un total de ${fmtCOPFull(totalInvoiced)}.`;
  const lines = doc.splitTextToSize(summaryText, doc.internal.pageSize.getWidth() - 28);
  lines.forEach((line: string) => {
    y = checkAddPage(doc, y, 6);
    doc.text(line, 14, y);
    y += 5;
  });

  addBrandedFooter(doc);

  // ═══════ PAGE 4: PROJECT STATUS ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Estado de Proyectos', projectName, branding, C);
  y = 36;

  if (projects.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Estado', 'Cliente', 'Presupuesto', 'Gastado', 'Progreso']],
      body: projects.map(p => {
        const spent = expensesForProjects
          .filter(e => e.data.projectId === p.id)
          .reduce((s, e) => s + e.data.amount, 0);
        return [
          p.data.name,
          p.data.status,
          p.data.client,
          fmtCOPFull(p.data.budget || 0),
          fmtCOPFull(spent),
          `${p.data.progress || 0}%`,
        ];
      }),
      ...ts,
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' },
      },
    });
    y = doc.lastAutoTable!.finalY + 10;
  }

  // Progress bars (visual)
  y = addSectionTitle(doc, y + 4, 'Progreso por Proyecto', C);
  projects.forEach(p => {
    y = checkAddPage(doc, y, 14);
    const progress = p.data.progress || 0;
    const barW = doc.internal.pageSize.getWidth() - 28;

    // Project name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(`${p.data.name} — ${progress}%`, 14, y);

    // Background bar
    y += 3;
    doc.setFillColor(...C.bg);
    doc.roundedRect(14, y, barW, 4, 1, 1, 'F');

    // Progress bar
    const fillW = (progress / 100) * barW;
    if (fillW > 0) {
      doc.setFillColor(...C.primary);
      doc.roundedRect(14, y, fillW, 4, 1, 1, 'F');
    }
    y += 10;
  });

  addBrandedFooter(doc);

  // ═══════ PAGE 5: BUDGET & FINANCES ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Presupuesto y Finanzas', projectName, branding, C);
  y = 36;

  // Budget KPIs
  y = addKPIBoxes(doc, y, [
    { label: 'Presupuesto', value: fmtCOPFull(totalBudget), color: C.primary },
    { label: 'Gastado', value: fmtCOPFull(totalSpent), color: C.red },
    { label: 'Saldo', value: fmtCOPFull(totalBudget - totalSpent), color: C.green },
    { label: 'Facturado', value: fmtCOPFull(totalInvoiced), color: [59, 130, 246] as [number, number, number] },
  ], C);

  // Expenses by category
  y = addSectionTitle(doc, y, 'Gastos por Categoría', C);
  const catData: Record<string, number> = {};
  expensesForProjects.forEach(e => {
    const c = e.data.category || 'Otro';
    catData[c] = (catData[c] || 0) + e.data.amount;
  });
  const categories = Object.entries(catData).sort((a, b) => b[1] - a[1]);

  if (categories.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Categoría', 'Total (COP)', '% del Total']],
      body: categories.map(([cat, amount]) => [
        cat,
        fmtCOPFull(amount),
        `${totalSpent > 0 ? (amount / totalSpent * 100).toFixed(1) : 0}%`,
      ]),
      ...ts,
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 6: TASKS & TIMELINE ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Tareas y Cronograma', projectName, branding, C);
  y = 36;

  // Task status summary
  const taskStatuses = [
    { label: 'Por hacer', value: tasksForProjects.filter(t => t.data.status === 'Por hacer').length },
    { label: 'En progreso', value: tasksForProjects.filter(t => t.data.status === 'En progreso').length },
    { label: 'En revisión', value: tasksForProjects.filter(t => t.data.status === 'En revisión').length },
    { label: 'Completado', value: tasksCompleted },
  ];
  y = addKPIBoxes(doc, y, taskStatuses.map(t => ({
    label: t.label,
    value: String(t.value),
    color: t.label === 'Completado' ? C.green : C.primary,
  })), C);

  // Pending tasks table
  y = addSectionTitle(doc, y, 'Tareas Pendientes', C);
  const pendingTasks = tasksForProjects.filter(t => t.data.status !== 'Completado').slice(0, 25);
  if (pendingTasks.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tarea', 'Proyecto', 'Prioridad', 'Estado', 'Fecha Límite']],
      body: pendingTasks.map(t => {
        const proj = data.projects.find(p => p.id === t.data.projectId);
        return [t.data.title, proj?.data.name || '-', t.data.priority, t.data.status, t.data.dueDate || '-'];
      }),
      ...ts,
      columnStyles: { 4: { halign: 'center' } },
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 7: TEAM ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Equipo de Trabajo', projectName, branding, C);
  y = 36;

  // Team members table
  autoTable(doc, {
    startY: y,
    head: [['Nombre', 'Rol', 'Tareas Asignadas', 'Estado']],
    body: data.teamUsers.map(member => {
      const memberTasks = tasksForProjects.filter(t =>
        t.data.assigneeId === member.id || t.data.assigneeIds?.includes(member.id)
      );
      return [
        member.data.name,
        member.data.role || 'Miembro',
        String(memberTasks.length),
        member.data.isActive !== false ? 'Activo' : 'Inactivo',
      ];
    }),
    ...ts,
    columnStyles: { 2: { halign: 'center' } },
  });

  addBrandedFooter(doc);

  // ═══════ PAGE 8: TIME ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Tiempo Registrado', projectName, branding, C);
  y = 36;

  const billableMins = timeForProjects.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0), 0);
  const billableValue = timeForProjects.filter(e => e.data.billable).reduce((s, e) => s + (e.data.duration || 0) * (e.data.rate || 0) / 60, 0);

  y = addKPIBoxes(doc, y, [
    { label: 'Total Horas', value: fmtDuration(totalMinutes), color: C.primary },
    { label: 'Horas Facturables', value: fmtDuration(billableMins), color: C.green },
    { label: 'Valor Facturable', value: fmtCOPFull(billableValue), color: C.primary },
    { label: 'Registros', value: String(timeForProjects.length), color: [59, 130, 246] as [number, number, number] },
  ], C);

  y = addSectionTitle(doc, y, 'Detalle de Tiempo', C);
  if (timeForProjects.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Fase', 'Descripción', 'Duración', 'Facturable', 'Valor']],
      body: timeForProjects.slice(0, 30).map(e => {
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
      ...ts,
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
      },
    });
  }

  addBrandedFooter(doc);

  // ═══════ SIGNATURES PAGE (if requested) ═══════
  if (data.includeSignatures) {
    doc.addPage();
    addBrandedHeader(doc, 'Firmas de Aprobación', projectName, branding, C);

    let sy = 50;
    const pageW = doc.internal.pageSize.getWidth();
    const roles = ['Elaboró', 'Revisó', 'Aprobó'];
    const boxW = (pageW - 28 - 10) / 3;

    roles.forEach((role, i) => {
      const x = 14 + i * (boxW + 5);

      doc.setFillColor(...C.bg);
      doc.roundedRect(x, sy, boxW, 40, 2, 2, 'F');

      // Role label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.primary);
      doc.text(role, x + boxW / 2, sy + 10, { align: 'center' });

      // Signature line
      doc.setDrawColor(...C.dark);
      doc.setLineWidth(0.3);
      doc.line(x + 10, sy + 25, x + boxW - 10, sy + 25);

      // Name line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text('Nombre:', x + boxW / 2, sy + 32, { align: 'center' });
      doc.text('Fecha:', x + boxW / 2, sy + 38, { align: 'center' });
    });

    addBrandedFooter(doc);
  }

  // Save
  const safeName = projectName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`reporte-proyecto-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   REPORTE FINANCIERO
   Budget breakdown, expenses by category, invoice summary, profitability
   ═══════════════════════════════════════════════════════════ */

export async function exportFinancialReportPDF(data: {
  projects: Project[];
  expenses: Expense[];
  invoices: Invoice[];
  company?: Company;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCharts?: boolean;
}) {
  const { jsPDF, autoTable } = await getPdfModules();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(data.company);
  const ts = tableStyles(C);

  // Filter data
  const projects = data.projectId
    ? data.projects.filter(p => p.id === data.projectId)
    : data.projects;
  const projectName = projects[0]?.data?.name || 'Todos los Proyectos';

  const filterExpenses = data.expenses.filter(e => {
    if (data.projectId && e.data.projectId !== data.projectId) return false;
    if (data.dateFrom && e.data.date < data.dateFrom) return false;
    if (data.dateTo && e.data.date > data.dateTo) return false;
    return true;
  });

  const filterInvoices = data.invoices.filter(i => {
    if (data.projectId && i.data.projectId !== data.projectId) return false;
    return true;
  });

  // Calculations
  const totalBudget = projects.reduce((s, p) => s + (p.data.budget || 0), 0);
  const totalSpent = filterExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
  const totalInvoiced = filterInvoices.filter(i => i.data.status !== 'Cancelada').reduce((s, i) => s + (i.data.total || 0), 0);
  const paidInvoices = filterInvoices.filter(i => i.data.status === 'Pagada').reduce((s, i) => s + (i.data.total || 0), 0);
  const pendingInvoices = filterInvoices.filter(i => i.data.status === 'Enviada').reduce((s, i) => s + (i.data.total || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const profitability = totalInvoiced - totalSpent;
  const profitMargin = totalInvoiced > 0 ? Math.round((profitability / totalInvoiced) * 100) : 0;
  const budgetBalance = totalBudget - totalSpent;
  const dateRange = data.dateFrom && data.dateTo
    ? `${data.dateFrom} — ${data.dateTo}`
    : 'Todo el período';

  // ═══════ COVER PAGE ═══════
  addCoverPage(doc, {
    reportTitle: 'Reporte Financiero',
    reportType: 'Análisis Financiero',
    projectName,
    dateRange,
    branding,
    colors: C,
    summaryItems: [
      { label: 'Presupuesto', value: fmtCOPFull(totalBudget) },
      { label: 'Gastado', value: fmtCOPFull(totalSpent) },
      { label: 'Rentabilidad', value: fmtCOPFull(profitability) },
      { label: 'Margen', value: `${profitMargin}%` },
    ],
  });

  // ═══════ TABLE OF CONTENTS ═══════
  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, [
    { title: 'Resumen Financiero', page: 3 },
    { title: 'Desglose por Categoría', page: 4 },
    { title: 'Detalle de Gastos', page: 5 },
    { title: 'Resumen de Facturación', page: 6 },
    { title: 'Análisis de Rentabilidad', page: 7 },
  ]);

  // ═══════ PAGE 3: FINANCIAL SUMMARY ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Reporte Financiero', `Resumen — ${projectName}`, branding, C);

  let y = 36;
  y = addKPIBoxes(doc, y, [
    { label: 'Presupuesto Total', value: fmtCOPFull(totalBudget), color: C.primary },
    { label: 'Total Ejecutado', value: fmtCOPFull(totalSpent), color: C.red },
    { label: 'Saldo Disponible', value: fmtCOPFull(budgetBalance), color: budgetBalance >= 0 ? C.green : C.red },
    { label: 'Utilización', value: `${budgetPct}%`, color: budgetPct > 90 ? C.red : C.green },
    { label: 'Total Facturado', value: fmtCOPFull(totalInvoiced), color: [59, 130, 246] as [number, number, number] },
    { label: 'Cobrado', value: fmtCOPFull(paidInvoices), color: C.green },
    { label: 'Por Cobrar', value: fmtCOPFull(pendingInvoices), color: [245, 158, 11] as [number, number, number] },
    { label: 'Rentabilidad', value: fmtCOPFull(profitability), color: profitability >= 0 ? C.green : C.red },
    { label: 'Margen de Ganancia', value: `${profitMargin}%`, color: profitMargin >= 20 ? C.green : C.red },
  ], C);

  // Per-project breakdown
  if (projects.length > 1) {
    y = addSectionTitle(doc, y + 4, 'Resumen por Proyecto', C);
    autoTable(doc, {
      startY: y,
      head: [['Proyecto', 'Presupuesto', 'Ejecutado', '%', 'Facturado', 'Rentabilidad']],
      body: projects.map(p => {
        const spent = filterExpenses.filter(e => e.data.projectId === p.id).reduce((s, e) => s + e.data.amount, 0);
        const invoiced = filterInvoices.filter(i => i.data.projectId === p.id && i.data.status !== 'Cancelada').reduce((s, i) => s + i.data.total, 0);
        const profit = invoiced - spent;
        return [
          p.data.name,
          fmtCOPFull(p.data.budget || 0),
          fmtCOPFull(spent),
          `${p.data.budget > 0 ? Math.round((spent / p.data.budget) * 100) : 0}%`,
          fmtCOPFull(invoiced),
          fmtCOPFull(profit),
        ];
      }),
      ...ts,
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 4: EXPENSES BY CATEGORY ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Desglose por Categoría', projectName, branding, C);
  y = 36;

  const catData: Record<string, { amount: number; count: number }> = {};
  filterExpenses.forEach(e => {
    const c = e.data.category || 'Otro';
    if (!catData[c]) catData[c] = { amount: 0, count: 0 };
    catData[c].amount += e.data.amount;
    catData[c].count += 1;
  });
  const categories = Object.entries(catData).sort((a, b) => b[1].amount - a[1].amount);

  // Visual bars for categories
  y = addSectionTitle(doc, y, 'Distribución de Gastos', C);
  const maxAmount = categories.length > 0 ? categories[0][1].amount : 1;
  categories.forEach(([cat, info]) => {
    y = checkAddPage(doc, y, 14);
    const pageW = doc.internal.pageSize.getWidth();
    const barMaxW = pageW - 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(cat, 14, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(fmtCOPFull(info.amount), pageW - 14, y, { align: 'right' });

    // Bar
    y += 2;
    doc.setFillColor(...C.bg);
    doc.roundedRect(14, y, barMaxW, 4, 1, 1, 'F');
    const fillW = (info.amount / maxAmount) * barMaxW;
    if (fillW > 0) {
      doc.setFillColor(...C.primary);
      doc.roundedRect(14, y, fillW, 4, 1, 1, 'F');
    }

    // Count
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text(`${info.count} registro(s) — ${totalSpent > 0 ? (info.amount / totalSpent * 100).toFixed(1) : 0}%`, 14 + barMaxW + 3, y + 3);

    y += 8;
  });

  addBrandedFooter(doc);

  // ═══════ PAGE 5: EXPENSES DETAIL ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Detalle de Gastos', projectName, branding, C);
  y = 36;

  if (filterExpenses.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Categoría', 'Monto (COP)', 'Fecha', 'Proveedor']],
      body: filterExpenses.slice(0, 40).map(e => [
        e.data.concept,
        e.data.category,
        fmtCOPFull(e.data.amount),
        e.data.date || '-',
        e.data.supplier || '-',
      ]),
      ...ts,
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 6: INVOICE SUMMARY ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Resumen de Facturación', projectName, branding, C);
  y = 36;

  // Invoice status breakdown
  const invStatuses = [
    { label: 'Borrador', count: filterInvoices.filter(i => i.data.status === 'Borrador').length, total: filterInvoices.filter(i => i.data.status === 'Borrador').reduce((s, i) => s + i.data.total, 0) },
    { label: 'Enviada', count: filterInvoices.filter(i => i.data.status === 'Enviada').length, total: filterInvoices.filter(i => i.data.status === 'Enviada').reduce((s, i) => s + i.data.total, 0) },
    { label: 'Pagada', count: filterInvoices.filter(i => i.data.status === 'Pagada').length, total: filterInvoices.filter(i => i.data.status === 'Pagada').reduce((s, i) => s + i.data.total, 0) },
    { label: 'Vencida', count: filterInvoices.filter(i => i.data.status === 'Vencida').length, total: filterInvoices.filter(i => i.data.status === 'Vencida').reduce((s, i) => s + i.data.total, 0) },
    { label: 'Cancelada', count: filterInvoices.filter(i => i.data.status === 'Cancelada').length, total: filterInvoices.filter(i => i.data.status === 'Cancelada').reduce((s, i) => s + i.data.total, 0) },
  ];

  y = addSectionTitle(doc, y, 'Estado de Facturas', C);
  autoTable(doc, {
    startY: y,
    head: [['Estado', 'Cantidad', 'Valor Total (COP)']],
    body: invStatuses.map(s => [s.label, String(s.count), fmtCOPFull(s.total)]),
    ...ts,
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
  });

  y = doc.lastAutoTable!.finalY + 12;

  // Invoice detail table
  y = addSectionTitle(doc, y, 'Detalle de Facturas', C);
  if (filterInvoices.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['No.', 'Proyecto', 'Cliente', 'Total (COP)', 'Estado', 'Fecha']],
      body: filterInvoices.map(i => [
        i.data.number,
        i.data.projectName,
        i.data.clientName,
        fmtCOPFull(i.data.total),
        i.data.status,
        i.data.issueDate || '-',
      ]),
      ...ts,
      columnStyles: { 3: { halign: 'right' }, 5: { halign: 'center' } },
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 7: PROFITABILITY ANALYSIS ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Análisis de Rentabilidad', projectName, branding, C);
  y = 36;

  y = addKPIBoxes(doc, y, [
    { label: 'Ingresos (Facturado)', value: fmtCOPFull(totalInvoiced), color: C.green },
    { label: 'Egresos (Gastos)', value: fmtCOPFull(totalSpent), color: C.red },
    { label: 'Rentabilidad Neta', value: fmtCOPFull(profitability), color: profitability >= 0 ? C.green : C.red },
    { label: 'Margen de Ganancia', value: `${profitMargin}%`, color: profitMargin >= 20 ? C.green : C.red },
  ], C);

  // Profitability narrative
  y += 4;
  y = checkAddPage(doc, y, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text('Análisis', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  let narrative = '';
  if (profitability >= 0) {
    narrative = `El análisis financiero muestra una rentabilidad neta positiva de ${fmtCOPFull(profitability)}, lo que representa un margen de ganancia del ${profitMargin}%. Los ingresos totales por facturación ascienden a ${fmtCOPFull(totalInvoiced)} contra egresos de ${fmtCOPFull(totalSpent)}. ${profitMargin >= 20 ? 'El margen se encuentra dentro del rango saludable para el sector de la construcción.' : 'Se recomienda revisar los costos para mejorar el margen de ganancia.'}`;
  } else {
    narrative = `El análisis financiero muestra una rentabilidad neta negativa de ${fmtCOPFull(Math.abs(profitability))}. Los egresos de ${fmtCOPFull(totalSpent)} superan los ingresos facturados de ${fmtCOPFull(totalInvoiced)}. Se requiere atención inmediata para ajustar costos y mejorar la facturación pendiente de cobro (${fmtCOPFull(pendingInvoices)}).`;
  }
  const narrativeLines = doc.splitTextToSize(narrative, doc.internal.pageSize.getWidth() - 28);
  narrativeLines.forEach((line: string) => {
    y = checkAddPage(doc, y, 6);
    doc.text(line, 14, y);
    y += 5;
  });

  addBrandedFooter(doc);

  const safeName = projectName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`reporte-financiero-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   REPORTE DE OBRA
   Field notes, photos grid, inspection results, change orders
   ═══════════════════════════════════════════════════════════ */

export async function exportConstructionReportPDF(data: {
  projects: Project[];
  dailyLogs: DailyLog[];
  fieldNotes: FieldNote[];
  photoLogs: PhotoLogEntry[];
  inspections: Inspection[];
  changeOrders: ChangeOrder[];
  company?: Company;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  includePhotos?: boolean;
  includeSignatures?: boolean;
}) {
  const { jsPDF, autoTable } = await getPdfModules();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const C = getThemeColors();
  const branding = getCompanyBranding(data.company);
  const ts = tableStyles(C);

  const project = data.projectId
    ? data.projects.find(p => p.id === data.projectId)
    : undefined;
  const projectName = project?.data?.name || 'Todos los Proyectos';
  const dateRange = data.dateFrom && data.dateTo
    ? `${data.dateFrom} — ${data.dateTo}`
    : 'Todo el período';

  // Filter data
  const filterLogs = data.dailyLogs.filter(l => {
    if (data.projectId && l.data.projectId !== data.projectId) return false;
    if (data.dateFrom && l.data.date < data.dateFrom) return false;
    if (data.dateTo && l.data.date > data.dateTo) return false;
    return true;
  });
  const filterFieldNotes = data.fieldNotes.filter(n => {
    if (data.projectId && n.data.projectId !== data.projectId) return false;
    return true;
  });
  const filterInspections = data.inspections.filter(i => {
    if (data.projectId && i.data.projectId !== data.projectId) return false;
    return true;
  });
  const filterChangeOrders = data.changeOrders.filter(co => {
    if (data.projectId && co.data.projectId !== data.projectId) return false;
    return true;
  });

  // KPI calculations
  const totalActivities = filterLogs.reduce((s, l) => s + (l.data.activities?.length || 0), 0);
  const avgWorkers = filterLogs.length > 0
    ? Math.round(filterLogs.reduce((s, l) => s + (l.data.laborCount || 0), 0) / filterLogs.length)
    : 0;
  const completedInspections = filterInspections.filter(i => i.data.status === 'Aprobada').length;
  const pendingCO = filterChangeOrders.filter(co => !['Aprobada', 'Implementada', 'Rechazada'].includes(co.data.status)).length;
  const coBudgetImpact = filterChangeOrders.reduce((s, co) => s + (co.data.impactBudget || 0), 0);
  const coDaysImpact = filterChangeOrders.reduce((s, co) => s + (co.data.impactDays || 0), 0);

  // ═══════ COVER PAGE ═══════
  addCoverPage(doc, {
    reportTitle: 'Reporte de Obra',
    reportType: 'Seguimiento de Obra',
    projectName,
    dateRange,
    branding,
    colors: C,
    summaryItems: [
      { label: 'Registros Bitácora', value: String(filterLogs.length) },
      { label: 'Minutas', value: String(filterFieldNotes.length) },
      { label: 'Inspecciones', value: `${completedInspections}/${filterInspections.length}` },
      { label: 'Cambios Pendientes', value: String(pendingCO) },
    ],
  });

  // ═══════ TABLE OF CONTENTS ═══════
  doc.addPage();
  addBrandedFooter(doc);
  addTableOfContents(doc, [
    { title: 'Resumen de Obra', page: 3 },
    { title: 'Bitácora Diaria', page: 4 },
    { title: 'Minutas de Obra', page: 6 },
    { title: 'Inspecciones', page: 7 },
    { title: 'Control de Cambios', page: 8 },
  ]);

  // ═══════ PAGE 3: CONSTRUCTION SUMMARY ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Reporte de Obra', `Resumen — ${projectName}`, branding, C);

  let y = 36;
  y = addKPIBoxes(doc, y, [
    { label: 'Días Registrados', value: String(filterLogs.length), color: C.primary },
    { label: 'Actividades Totales', value: String(totalActivities), color: C.green },
    { label: 'Promedio Personal/Día', value: String(avgWorkers), color: [59, 130, 246] as [number, number, number] },
    { label: 'Minutas Generadas', value: String(filterFieldNotes.length), color: C.primary },
    { label: 'Inspecciones Aprobadas', value: `${completedInspections}/${filterInspections.length}`, color: C.green },
    { label: 'Cambios Pendientes', value: String(pendingCO), color: pendingCO > 0 ? C.red : C.green },
    { label: 'Impacto Presupuesto (CO)', value: fmtCOPFull(coBudgetImpact), color: coBudgetImpact > 0 ? C.red : C.green },
    { label: 'Impacto Días (CO)', value: `${coDaysImpact} días`, color: coDaysImpact > 0 ? C.red : C.green },
    { label: 'Fotos Registradas', value: String(data.photoLogs.length), color: C.primary },
  ], C);

  // Project info
  if (project) {
    y += 4;
    y = addSectionTitle(doc, y, 'Información del Proyecto', C);

    const infoItems = [
      { label: 'Estado', value: project.data.status },
      { label: 'Ubicación', value: project.data.location },
      { label: 'Cliente', value: project.data.client },
      { label: 'Presupuesto', value: fmtCOPFull(project.data.budget || 0) },
      { label: 'Fecha Inicio', value: project.data.startDate || '-' },
      { label: 'Fecha Fin', value: project.data.endDate || '-' },
      { label: 'Progreso', value: `${project.data.progress || 0}%` },
      { label: 'Fase Actual', value: project.data.phase || '-' },
    ];

    infoItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 14 + col * 95;
      const yPos = y + row * 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(item.label + ':', x, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.dark);
      doc.text(item.value, x + 30, yPos);
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 4-5: DAILY LOGS ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Bitácora Diaria', projectName, branding, C);
  y = 36;

  const sortedLogs = [...filterLogs].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));

  if (sortedLogs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('No hay registros de bitácora para el período seleccionado', 14, y);
  } else {
    sortedLogs.slice(0, 15).forEach((log) => {
      y = checkAddPage(doc, y, 35);

      // Date header bar
      doc.setFillColor(...C.dark);
      doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      const info = `${log.data.date || 'Sin fecha'}  |  ${log.data.weather || '-'} ${log.data.temperature ? log.data.temperature + '°C' : ''}  |  Personal: ${log.data.laborCount || 0}  |  Supervisor: ${log.data.supervisor || '-'}`;
      doc.text(info, 18, y + 5);
      y += 10;

      // Activities
      if (log.data.activities && log.data.activities.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.primary);
        doc.text('Actividades:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.text);
        log.data.activities.slice(0, 5).forEach((act: string) => {
          y = checkAddPage(doc, y, 6);
          doc.text(`• ${act}`, 18, y);
          y += 4;
        });
        if (log.data.activities.length > 5) {
          doc.text(`... y ${log.data.activities.length - 5} actividad(es) más`, 18, y);
          y += 4;
        }
      }

      // Materials & Equipment (compact)
      const extras: string[] = [];
      if (log.data.materials && log.data.materials.length > 0) extras.push(`Materiales: ${log.data.materials.join(', ')}`);
      if (log.data.equipment && log.data.equipment.length > 0) extras.push(`Equipos: ${log.data.equipment.join(', ')}`);
      if (extras.length > 0) {
        y += 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.muted);
        extras.forEach(ext => {
          y = checkAddPage(doc, y, 6);
          const extLines = doc.splitTextToSize(ext, doc.internal.pageSize.getWidth() - 36);
          doc.text(extLines, 18, y);
          y += extLines.length * 3.5 + 1;
        });
      }

      y += 4;
    });
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 6: FIELD NOTES ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Minutas de Obra', projectName, branding, C);
  y = 36;

  if (filterFieldNotes.length > 0) {
    filterFieldNotes.slice(0, 10).forEach((note) => {
      y = checkAddPage(doc, y, 40);

      // Note header
      doc.setFillColor(...C.primary);
      doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      doc.text(`${note.data.date || 'Sin fecha'} — ${note.data.supervisor || 'Sin supervisor'} — ${note.data.projectName || ''}`, 18, y + 5);
      y += 10;

      // Activities
      if (note.data.activities && note.data.activities.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.primary);
        doc.text('Actividades:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.text);
        note.data.activities.slice(0, 5).forEach((act: string) => {
          doc.text(`• ${act}`, 18, y);
          y += 4;
        });
      }

      // Commitments
      if (note.data.commitments && note.data.commitments.length > 0) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.primary);
        doc.text('Compromisos:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.text);
        note.data.commitments.slice(0, 5).forEach((cmt: string) => {
          doc.text(`• ${cmt}`, 18, y);
          y += 4;
        });
      }

      // Observations
      if (note.data.observations) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text('Observaciones:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.text);
        const obsLines = doc.splitTextToSize(note.data.observations, doc.internal.pageSize.getWidth() - 36);
        obsLines.slice(0, 3).forEach((line: string) => {
          doc.text(line, 18, y);
          y += 4;
        });
      }

      y += 6;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('No hay minutas registradas para el período seleccionado', 14, y);
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 7: INSPECTIONS ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Inspecciones', projectName, branding, C);
  y = 36;

  if (filterInspections.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Inspección', 'Tipo', 'Inspector', 'Fecha', 'Estado', 'Score']],
      body: filterInspections.map(insp => [
        insp.data.title,
        insp.data.type,
        insp.data.inspector,
        insp.data.date || '-',
        insp.data.status,
        `${insp.data.overallScore || 0}/100`,
      ]),
      ...ts,
      columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' } },
    });

    // Inspection details
    y = doc.lastAutoTable!.finalY + 10;
    filterInspections.slice(0, 3).forEach(insp => {
      y = checkAddPage(doc, y, 35);
      y = addSectionTitle(doc, y, `${insp.data.title} — ${insp.data.date || ''}`, C);

      if (insp.data.items && insp.data.items.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Item', 'Estado', 'Score', 'Notas']],
          body: insp.data.items.slice(0, 15).map(item => [
            item.description,
            item.status,
            `${item.score}/100`,
            item.notes || '-',
          ]),
          ...ts,
          columnStyles: { 2: { halign: 'center' } },
        });
        y = doc.lastAutoTable!.finalY + 10;
      }

      if (insp.data.observations) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.muted);
        doc.text('Observaciones:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.text);
        const obsLines = doc.splitTextToSize(insp.data.observations, doc.internal.pageSize.getWidth() - 28);
        obsLines.slice(0, 5).forEach((line: string) => {
          doc.text(line, 14, y);
          y += 4;
        });
        y += 4;
      }
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('No hay inspecciones registradas para el período seleccionado', 14, y);
  }

  addBrandedFooter(doc);

  // ═══════ PAGE 8: CHANGE ORDERS ═══════
  doc.addPage();
  addBrandedHeader(doc, 'Control de Cambios', projectName, branding, C);
  y = 36;

  if (filterChangeOrders.length > 0) {
    y = addKPIBoxes(doc, y, [
      { label: 'Total Solicitudes', value: String(filterChangeOrders.length), color: C.primary },
      { label: 'Pendientes', value: String(pendingCO), color: pendingCO > 0 ? C.red : C.green },
      { label: 'Impacto Presupuesto', value: fmtCOPFull(coBudgetImpact), color: coBudgetImpact > 0 ? C.red : C.green },
      { label: 'Impacto Cronograma', value: `${coDaysImpact} días`, color: coDaysImpact > 0 ? C.red : C.green },
    ], C);

    y = addSectionTitle(doc, y, 'Detalle de Cambios', C);
    autoTable(doc, {
      startY: y,
      head: [['No.', 'Título', 'Categoría', 'Estado', 'Impacto $', 'Impacto Días', 'Solicitado por']],
      body: filterChangeOrders.map(co => [
        co.data.number,
        co.data.title,
        co.data.category,
        co.data.status,
        fmtCOPFull(co.data.impactBudget || 0),
        `${co.data.impactDays >= 0 ? '+' : ''}${co.data.impactDays} días`,
        co.data.requestedBy || '-',
      ]),
      ...ts,
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'center' } },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('No hay órdenes de cambio registradas', 14, y);
  }

  addBrandedFooter(doc);

  // ═══════ SIGNATURES PAGE ═══════
  if (data.includeSignatures) {
    doc.addPage();
    addBrandedHeader(doc, 'Firmas de Aprobación', projectName, branding, C);

    let sy = 50;
    const pageW = doc.internal.pageSize.getWidth();
    const roles = ['Director de Obra', 'Interventor', 'Contratista'];
    const boxW = (pageW - 28 - 10) / 3;

    roles.forEach((role, i) => {
      const x = 14 + i * (boxW + 5);
      doc.setFillColor(...C.bg);
      doc.roundedRect(x, sy, boxW, 40, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.primary);
      doc.text(role, x + boxW / 2, sy + 10, { align: 'center' });

      doc.setDrawColor(...C.dark);
      doc.setLineWidth(0.3);
      doc.line(x + 10, sy + 25, x + boxW - 10, sy + 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text('Nombre:', x + boxW / 2, sy + 32, { align: 'center' });
      doc.text('Fecha:', x + boxW / 2, sy + 38, { align: 'center' });
    });

    addBrandedFooter(doc);
  }

  const safeName = projectName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`reporte-obra-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
