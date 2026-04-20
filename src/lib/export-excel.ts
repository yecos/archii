/**
 * export-excel.ts
 * Exportación a Excel usando SheetJS (xlsx).
 * ArchiFlow v2.0 — Exportar datos tabulares a .xlsx
 */

import * as XLSX from 'xlsx';

function fmtCOPFull(n: number): string {
  if (!n || n === 0) return '$0';
  return '$' + Number(n).toLocaleString('es-CO');
}

function fmtDurationMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════
   EXPORTAR TAREAS A EXCEL
   ═══════════════════════════════════════════════ */

export function exportTasksExcel(tasks: any[], projects: any[], teamUsers: any[]) {
  const wb = XLSX.utils.book_new();

  const data = tasks.map(t => {
    const proj = projects.find(p => p.id === t.data.projectId);
    const assignee = teamUsers.find(u => u.id === t.data.assigneeId);
    return {
      Tarea: t.data.title,
      Proyecto: proj?.data.name || '-',
      Prioridad: t.data.priority || '-',
      Estado: t.data.status || '-',
      Asignado: assignee?.data.name || '-',
      'Fecha Límite': t.data.dueDate || '-',
      'Creado': t.data.createdAt ? (t.data.createdAt.toDate ? t.data.createdAt.toDate().toLocaleDateString('es-CO') : new Date(t.data.createdAt).toLocaleDateString('es-CO')) : '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 14 },
    { wch: 20 }, { wch: 14 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tareas');

  // Summary sheet
  const statuses: Record<string, number> = {};
  const prios: Record<string, number> = {};
  tasks.forEach(t => {
    statuses[t.data.status || 'Sin estado'] = (statuses[t.data.status || 'Sin estado'] || 0) + 1;
    prios[t.data.priority || 'Sin prioridad'] = (prios[t.data.priority || 'Sin prioridad'] || 0) + 1;
  });

  const summaryData = [
    { Métrica: 'Total tareas', Valor: tasks.length },
    { Métrica: 'Completadas', Valor: statuses['Completado'] || 0 },
    { Métrica: 'En progreso', Valor: statuses['En progreso'] || 0 },
    { Métrica: 'Por hacer', Valor: statuses['Por hacer'] || 0 },
    { Métrica: 'En revisión', Valor: statuses['Revision'] || 0 },
    { Métrica: 'Prioridad Alta', Valor: prios['Alta'] || 0 },
    { Métrica: 'Prioridad Media', Valor: prios['Media'] || 0 },
    { Métrica: 'Prioridad Baja', Valor: prios['Baja'] || 0 },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

  downloadWorkbook(wb, 'archiflow-tareas');
}

/* ═══════════════════════════════════════════════
   EXPORTAR GASTOS A EXCEL
   ═══════════════════════════════════════════════ */

export function exportExpensesExcel(expenses: any[], projects: any[]) {
  const wb = XLSX.utils.book_new();

  const data = expenses.map(e => {
    const proj = projects.find(p => p.id === e.data.projectId);
    return {
      Concepto: e.data.concept,
      Proyecto: proj?.data.name || '-',
      Categoría: e.data.category || '-',
      Monto: e.data.amount || 0,
      Fecha: e.data.date || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 14 },
  ];

  // Summary
  const catSummary: Record<string, number> = {};
  expenses.forEach(e => {
    const c = e.data.category || 'Otro';
    catSummary[c] = (catSummary[c] || 0) + (e.data.amount || 0);
  });

  const summaryRows = Object.entries(catSummary).sort((a, b) => b[1] - a[1]).map(([cat, total]) => ({
    Categoría: cat,
    Total: total,
    '%': expenses.length > 0 ? (total / expenses.reduce((s, e) => s + (e.data.amount || 0), 0) * 100).toFixed(1) + '%' : '0%',
  }));
  summaryRows.push({
    Categoría: 'TOTAL GENERAL',
    Total: expenses.reduce((s, e) => s + (e.data.amount || 0), 0),
    '%': '100%',
  });

  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen Categorías');

  XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  // Move summary to first position
  wb.SheetNames = ['Resumen Categorías', 'Gastos'];

  downloadWorkbook(wb, 'archiflow-gastos');
}

/* ═══════════════════════════════════════════════
   EXPORTAR TIEMPO A EXCEL
   ═══════════════════════════════════════════════ */

export function exportTimeExcel(timeEntries: any[], projects: any[], teamUsers: any[]) {
  const wb = XLSX.utils.book_new();

  const data = timeEntries.map(e => {
    const proj = projects.find(p => p.id === e.data.projectId);
    const user = teamUsers.find(u => u.id === e.data.userId);
    return {
      Proyecto: proj?.data.name || '-',
      Fase: e.data.phaseName || '-',
      Miembro: e.data.userName || user?.data.name || '-',
      Descripción: e.data.description || '-',
      'Duración (min)': e.data.duration || 0,
      'Duración': fmtDurationMinutes(e.data.duration || 0),
      Facturable: e.data.billable ? 'Sí' : 'No',
      'Tarifa (COP/h)': e.data.rate || 0,
      'Valor (COP)': Math.round((e.data.duration || 0) * (e.data.rate || 0) / 60),
      Fecha: e.data.date || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Registros');

  // Summary by member
  const byMember: Record<string, { total: number; billable: number; value: number }> = {};
  timeEntries.forEach(e => {
    const name = e.data.userName || '-';
    if (!byMember[name]) byMember[name] = { total: 0, billable: 0, value: 0 };
    byMember[name].total += e.data.duration || 0;
    if (e.data.billable) {
      byMember[name].billable += e.data.duration || 0;
      byMember[name].value += Math.round((e.data.duration || 0) * (e.data.rate || 0) / 60);
    }
  });

  const memberRows = Object.entries(byMember).map(([name, data]) => ({
    Miembro: name,
    'Total Horas': fmtDurationMinutes(data.total),
    'Facturable': fmtDurationMinutes(data.billable),
    'Valor Facturable': data.value,
  }));

  const ws2 = XLSX.utils.json_to_sheet(memberRows);
  ws2['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Por Miembro');

  wb.SheetNames = ['Registros', 'Por Miembro'];
  downloadWorkbook(wb, 'archiflow-tiempo');
}

/* ═══════════════════════════════════════════════
   EXPORTAR INVENTARIO A EXCEL
   ═══════════════════════════════════════════════ */

export function exportInventoryExcel(products: any[], categories: any[], movements: any[]) {
  const wb = XLSX.utils.book_new();

  // Products sheet
  const prodData = products.map(p => {
    const cat = categories.find(c => c.id === p.data.categoryId);
    return {
      Producto: p.data.name,
      SKU: p.data.sku || '-',
      Categoría: cat?.data.name || '-',
      Unidad: p.data.unit || '-',
      'Precio (COP)': p.data.price || 0,
      'Stock Total': p.data.stock || 0,
      'Stock Mínimo': p.data.minStock || 0,
      Bodega: p.data.warehouse || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(prodData);
  ws['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Movements sheet
  const movData = movements.map(m => ({
    Producto: m.data.productId || '-',
    Tipo: m.data.type,
    Cantidad: m.data.quantity || 0,
    Razón: m.data.reason || '-',
    Referencia: m.data.reference || '-',
    Fecha: m.data.date || '-',
  }));

  if (movData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(movData);
    ws2['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Movimientos');
  }

  // Low stock alert
  const lowStock = products.filter(p => (p.data.stock || 0) <= (p.data.minStock || 0));
  if (lowStock.length > 0) {
    const lowData = lowStock.map(p => ({
      Producto: p.data.name,
      'Stock Actual': p.data.stock || 0,
      'Stock Mínimo': p.data.minStock || 0,
      'Diferencia': (p.data.stock || 0) - (p.data.minStock || 0),
    }));
    const ws3 = XLSX.utils.json_to_sheet(lowData);
    ws3['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Stock Bajo');
  }

  downloadWorkbook(wb, 'archiflow-inventario');
}

/* ═══════════════════════════════════════════════
   EXPORTAR PROYECTOS A EXCEL
   ═══════════════════════════════════════════════ */

export function exportProjectsExcel(projects: any[], tasks: any[], expenses: any[]) {
  const wb = XLSX.utils.book_new();

  const data = projects.map(p => {
    const projTasks = tasks.filter(t => t.data.projectId === p.id);
    const projExpenses = expenses.filter(e => e.data.projectId === p.id);
    const totalSpent = projExpenses.reduce((s, e) => s + (e.data.amount || 0), 0);
    const completedTasks = projTasks.filter(t => t.data.status === 'Completado').length;

    return {
      Proyecto: p.data.name,
      Estado: p.data.status,
      Cliente: p.data.client || '-',
      Ubicación: p.data.location || '-',
      Presupuesto: p.data.budget || 0,
      Gastado: totalSpent,
      'Saldo': (p.data.budget || 0) - totalSpent,
      Progreso: `${p.data.progress || 0}%`,
      'Tareas': projTasks.length,
      'Tareas Completadas': completedTasks,
      'Fecha Inicio': p.data.startDate || '-',
      'Fecha Entrega': p.data.endDate || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
    { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

  downloadWorkbook(wb, 'archiflow-proyectos');
}
