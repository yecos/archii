/**
 * export-excel.ts
 * Export tasks to Excel format.
 * Stub implementation — in production this would use a library like xlsx.
 */

export function exportTasksExcel(tasks: any[], projects: any[], teamUsers: any[]): void {
  // Stub: Create a CSV as a simple fallback
  const headers = ['Tarea', 'Proyecto', 'Responsable', 'Prioridad', 'Estado', 'Fecha límite'];
  const rows = tasks.map(t => {
    const proj = projects.find((p: any) => p.id === t.data.projectId);
    const user = teamUsers.find((u: any) => u.id === t.data.assigneeId);
    return [
      t.data.title,
      proj?.data?.name || '',
      user?.data?.name || 'Sin asignar',
      t.data.priority,
      t.data.status,
      t.data.dueDate || '',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tareas_archiflow_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
