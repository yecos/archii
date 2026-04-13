/**
 * ArchiFlow — Exportaciones Premium PDF/Excel
 * Funciones de exportación mejoradas para informes de proyecto
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── Colores ─── */
const C = {
  primary: [200, 169, 110] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  orange: [245, 158, 11] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
};

/* ─── Helpers ─── */
function fmtCOP(val: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return dateStr; }
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Gold bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, 210, 3, 'F');
  // Title
  doc.setFontSize(18);
  doc.setTextColor(...C.dark);
  doc.text(title, 14, 18);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...C.gray);
    doc.text(subtitle, 14, 25);
  }
  // Date
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`, 196, 18, { align: 'right' });
  // Line
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.5);
  doc.line(14, subtitle ? 30 : 23, 196, subtitle ? 30 : 23);
  return subtitle ? 36 : 28;
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text('ArchiFlow v2.0 — Reporte generado automáticamente', 14, 287);
    doc.text(`Página ${i} de ${pages}`, 196, 287, { align: 'right' });
  }
}

/* ═══════════════════════════════════════════════════════════
   1. REPORTE DE PROYECTO (PDF)
   ═══════════════════════════════════════════════════════════ */
export function exportProjectReport(project: any, tasks: any[], expenses: any[], teamUsers: any[]) {
  const doc = new jsPDF();
  const p = project.data;

  // Page 1 — Cover + Summary
  let y = addHeader(doc, p.name || 'Proyecto', 'Reporte Ejecutivo del Proyecto');

  // Project info
  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text('Información General', 14, y); y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    head: [],
    body: [
      ['Estado', p.status || '-'],
      ['Cliente', p.client || '-'],
      ['Ubicación', p.location || '-'],
      ['Presupuesto', fmtCOP(Number(p.budget) || 0)],
      ['Fecha Inicio', fmtDate(p.startDate)],
      ['Fecha Fin', fmtDate(p.endDate)],
      ['Progreso', `${p.progress || 0}%`],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: C.gray, fontSize: 9 }, 1: { fontSize: 9 } },
    styles: { cellPadding: 3, lineWidth: 0 },
    alternateRowStyles: { fillColor: C.lightGray },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Financial summary
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const budget = Number(p.budget) || 0;
  const pct = budget > 0 ? Math.round(totalExpenses / budget * 100) : 0;

  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text('Resumen Financiero', 14, y); y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    head: [['Concepto', 'Valor']],
    body: [
      ['Presupuesto Asignado', fmtCOP(budget)],
      ['Gastos Registrados', fmtCOP(totalExpenses)],
      ['Balance Disponible', fmtCOP(budget - totalExpenses)],
      ['Ejecución Presupuestal', `${pct}%`],
    ],
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', fontSize: 9 }, 1: { halign: 'right', fontSize: 9 } },
    styles: { cellPadding: 3 },
    alternateRowStyles: { fillColor: C.lightGray },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Task summary
  const completed = tasks.filter((t: any) => t.status === 'Completado').length;
  const inProgress = tasks.filter((t: any) => t.status === 'En progreso').length;
  const overdue = tasks.filter((t: any) => {
    if (t.status === 'Completado' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text('Resumen de Tareas', 14, y); y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    head: [['Indicador', 'Cantidad']],
    body: [
      ['Total de Tareas', String(tasks.length)],
      ['Completadas', String(completed)],
      ['En Progreso', String(inProgress)],
      ['Pendientes', String(tasks.length - completed - inProgress)],
      ['Vencidas', String(overdue)],
      ['Efectividad', tasks.length > 0 ? `${Math.round(completed / tasks.length * 100)}%` : '0%'],
    ],
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', fontSize: 9 }, 1: { halign: 'center', fontSize: 9 } },
    styles: { cellPadding: 3 },
    alternateRowStyles: { fillColor: C.lightGray },
  });

  // Page 2 — Task Details
  doc.addPage();
  y = addHeader(doc, `${p.name || 'Proyecto'} — Detalle de Tareas`);

  if (tasks.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['#', 'Tarea', 'Asignado', 'Prioridad', 'Estado', 'Fecha Entrega']],
      body: tasks.map((t: any, i: number) => {
        const assignee = teamUsers.find((u: any) => u.id === t.assigneeId);
        return [
          String(i + 1),
          (t.title || '-').substring(0, 40),
          assignee?.data?.name || assignee?.data?.email || '-',
          t.priority || '-',
          t.status || '-',
          fmtDate(t.dueDate),
        ];
      }),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 8 }, 4: { cellWidth: 22 } },
    });
  }

  // Page 3 — Expenses
  if (expenses.length > 0) {
    doc.addPage();
    y = addHeader(doc, `${p.name || 'Proyecto'} — Registro de Gastos`);

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['#', 'Concepto', 'Categoría', 'Monto', 'Fecha']],
      body: expenses.map((e: any, i: number) => [
        String(i + 1),
        (e.concept || '-').substring(0, 50),
        e.category || '-',
        fmtCOP(Number(e.amount) || 0),
        fmtDate(e.date || e.createdAt),
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      columnStyles: { 3: { halign: 'right' } },
    });
  }

  addFooter(doc);
  doc.save(`ArchiFlow_${(p.name || 'proyecto').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   2. LISTA DE TAREAS (PDF)
   ═══════════════════════════════════════════════════════════ */
export function exportTaskList(tasks: any[], projects: any[], teamUsers: any[]) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'Lista de Tareas', `${tasks.length} tareas registradas`);

  if (tasks.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...C.gray);
    doc.text('No hay tareas para exportar.', 14, y + 20);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      theme: 'striped',
      head: [['#', 'Tarea', 'Proyecto', 'Asignado', 'Prioridad', 'Estado', 'Entrega']],
      body: tasks.map((t: any, i: number) => {
        const proj = projects.find((p: any) => p.id === t.projectId);
        const assignee = teamUsers.find((u: any) => u.id === t.assigneeId);
        return [
          String(i + 1),
          (t.title || '-').substring(0, 35),
          (proj?.data?.name || '-').substring(0, 20),
          assignee?.data?.name || '-',
          t.priority || '-',
          t.status || '-',
          fmtDate(t.dueDate),
        ];
      }),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 6.5, cellPadding: 2 },
    });
  }

  addFooter(doc);
  doc.save(`ArchiFlow_Tareas_${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   3. RESUMEN EJECUTIVO (PDF)
   ═══════════════════════════════════════════════════════════ */
export function exportExecutiveSummary(projects: any[], tasks: any[], expenses: any[], teamUsers: any[]) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'Resumen Ejecutivo', `ArchiFlow — ${new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`);

  // Portfolio overview
  const totalBudget = projects.reduce((s: number, p: any) => s + (Number(p.data.budget) || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
  const completedTasks = tasks.filter((t: any) => t.status === 'Completado').length;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    head: [['Indicador', 'Valor']],
    body: [
      ['Proyectos Totales', String(projects.length)],
      ['En Ejecución', String(projects.filter((p: any) => p.data.status === 'Ejecucion').length)],
      ['Terminados', String(projects.filter((p: any) => p.data.status === 'Terminado').length)],
      ['Presupuesto Total', fmtCOP(totalBudget)],
      ['Gastos Totales', fmtCOP(totalExpenses)],
      ['Ejecución Presupuestal', `${totalBudget > 0 ? Math.round(totalExpenses / totalBudget * 100) : 0}%`],
      ['Total Tareas', String(tasks.length)],
      ['Tareas Completadas', `${completedTasks} (${tasks.length > 0 ? Math.round(completedTasks / tasks.length * 100) : 0}%)`],
      ['Equipo', `${teamUsers.length} miembros`],
    ],
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fontSize: 9 }, 1: { fontSize: 9 } },
    styles: { cellPadding: 3 },
    alternateRowStyles: { fillColor: C.lightGray },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Project list
  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text('Detalle por Proyecto', 14, y); y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    theme: 'striped',
    head: [['Proyecto', 'Estado', 'Presupuesto', 'Gastado', '% Ejec.', 'Progreso', 'Tareas']],
    body: projects.map((p: any) => {
      const pExp = expenses.filter((e: any) => e.projectId === p.id).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      const pTasks = tasks.filter((t: any) => t.projectId === p.id);
      const pDone = pTasks.filter((t: any) => t.status === 'Completado').length;
      const b = Number(p.data.budget) || 0;
      return [
        (p.data.name || '-').substring(0, 30),
        p.data.status || '-',
        fmtCOP(b),
        fmtCOP(pExp),
        b > 0 ? `${Math.round(pExp / b * 100)}%` : '-',
        `${p.data.progress || 0}%`,
        `${pDone}/${pTasks.length}`,
      ];
    }),
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2.5 },
  });

  addFooter(doc);
  doc.save(`ArchiFlow_Resumen_Ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   4. BITÁCORA (PDF)
   ═══════════════════════════════════════════════════════════ */
export function exportBitacora(logs: any[], projectName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, `Bitácora de Obra${projectName ? ` — ${projectName}` : ''}`, `${logs.length} registros`);

  if (logs.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...C.gray);
    doc.text('No hay registros en la bitácora.', 14, y + 20);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      theme: 'striped',
      head: [['Fecha', 'Clima', 'Actividades', 'Personal', 'Observaciones']],
      body: logs.map((l: any) => [
        fmtDate(l.data.date),
        l.data.weather || '-',
        (l.data.activities || []).join(', ').substring(0, 60),
        l.data.personnel || '-',
        (l.data.notes || '-').substring(0, 50),
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 6.5, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 25 } },
    });
  }

  addFooter(doc);
  doc.save(`ArchiFlow_Bitacora_${new Date().toISOString().split('T')[0]}.pdf`);
}
