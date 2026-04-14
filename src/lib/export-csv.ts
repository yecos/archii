/**
 * export-csv.ts
 * Exportación a CSV (sin dependencias externas).
 * ArchiFlow v2.0 — Exportar datos tabulares a .csv (UTF-8 BOM para compatibilidad con Excel)
 */

/**
 * Convert an array of objects to CSV string with UTF-8 BOM for Excel compatibility.
 * Handles commas, quotes, and newlines in values.
 */
function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return '';

  const keys = headers || Object.keys(rows[0]);
  const lines: string[] = [];

  // Header row
  lines.push(keys.map(escapeCSV).join(','));

  // Data rows
  for (const row of rows) {
    lines.push(keys.map(k => escapeCSV(String(row[k] ?? ''))).join(','));
  }

  // UTF-8 BOM + content
  return '\uFEFF' + lines.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════
   EXPORTAR PROYECTOS A CSV
   ═══════════════════════════════════════════════ */

export function exportProjectsCSV(projects: any[], tasks: any[], expenses: any[]) {
  const rows = projects.map(p => {
    const projTasks = tasks.filter((t: any) => t.data.projectId === p.id);
    const projExpenses = expenses.filter((e: any) => e.data.projectId === p.id);
    const totalSpent = projExpenses.reduce((s: number, e: any) => s + (e.data.amount || 0), 0);
    const completedTasks = projTasks.filter((t: any) => t.data.status === 'Completado').length;

    return {
      'Proyecto': p.data.name,
      'Estado': p.data.status,
      'Cliente': p.data.client || '-',
      'Ubicación': p.data.location || '-',
      'Presupuesto': p.data.budget || 0,
      'Gastado': totalSpent,
      'Saldo': (p.data.budget || 0) - totalSpent,
      'Progreso': `${p.data.progress || 0}%`,
      'Total Tareas': projTasks.length,
      'Tareas Completadas': completedTasks,
      'Fecha Inicio': p.data.startDate || '-',
      'Fecha Entrega': p.data.endDate || '-',
    };
  });

  downloadCSV(toCSV(rows), 'archiflow-proyectos');
}

/* ═══════════════════════════════════════════════
   EXPORTAR TAREAS A CSV
   ═══════════════════════════════════════════════ */

export function exportTasksCSV(tasks: any[], projects: any[], teamUsers: any[]) {
  const rows = tasks.map(t => {
    const proj = projects.find((p: any) => p.id === t.data.projectId);
    const assignee = teamUsers.find((u: any) => u.id === t.data.assigneeId);

    const created = t.data.createdAt
      ? (t.data.createdAt.toDate ? t.data.createdAt.toDate().toLocaleDateString('es-CO') : new Date(t.data.createdAt).toLocaleDateString('es-CO'))
      : '-';

    return {
      'Tarea': t.data.title,
      'Proyecto': proj?.data.name || '-',
      'Prioridad': t.data.priority || '-',
      'Estado': t.data.status || '-',
      'Asignado': assignee?.data.name || '-',
      'Fecha Límite': t.data.dueDate || '-',
      'Creado': created,
    };
  });

  downloadCSV(toCSV(rows), 'archiflow-tareas');
}

/* ═══════════════════════════════════════════════
   EXPORTAR GASTOS A CSV
   ═══════════════════════════════════════════════ */

export function exportExpensesCSV(expenses: any[], projects: any[]) {
  const rows = expenses.map(e => {
    const proj = projects.find((p: any) => p.id === e.data.projectId);
    return {
      'Concepto': e.data.concept,
      'Proyecto': proj?.data.name || '-',
      'Categoría': e.data.category || '-',
      'Monto': e.data.amount || 0,
      'Fecha': e.data.date || '-',
    };
  });

  downloadCSV(toCSV(rows), 'archiflow-gastos');
}

/* ═══════════════════════════════════════════════
   EXPORTAR PROVEEDORES A CSV
   ═══════════════════════════════════════════════ */

export function exportSuppliersCSV(suppliers: any[]) {
  const rows = suppliers.map(s => ({
    'Proveedor': s.data.name,
    'Categoría': s.data.category || '-',
    'Teléfono': s.data.phone || '-',
    'Email': s.data.email || '-',
    'Dirección': s.data.address || '-',
    'Website': s.data.website || '-',
    'Calificación': s.data.rating || 0,
    'Notas': s.data.notes || '-',
  }));

  downloadCSV(toCSV(rows), 'archiflow-proveedores');
}

/* ═══════════════════════════════════════════════
   EXPORTAR TIEMPO A CSV
   ═══════════════════════════════════════════════ */

export function exportTimeCSV(timeEntries: any[], projects: any[]) {
  const rows = timeEntries.map(e => {
    const proj = projects.find((p: any) => p.id === e.data.projectId);
    const mins = e.data.duration || 0;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    const durStr = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;

    return {
      'Proyecto': proj?.data.name || '-',
      'Fase': e.data.phaseName || '-',
      'Miembro': e.data.userName || '-',
      'Descripción': e.data.description || '-',
      'Duración (min)': mins,
      'Duración': durStr,
      'Facturable': e.data.billable ? 'Sí' : 'No',
      'Tarifa (COP/h)': e.data.rate || 0,
      'Valor (COP)': Math.round(mins * (e.data.rate || 0) / 60),
      'Fecha': e.data.date || '-',
    };
  });

  downloadCSV(toCSV(rows), 'archiflow-tiempo');
}
