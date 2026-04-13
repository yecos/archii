/**
 * export-pdf.ts
 * Export checklists to PDF format.
 * Stub implementation — in production this would use a PDF generation library.
 */

export function exportChecklistPDF(params: {
  projectId: string;
  projectName: string;
  entries: any[];
  phaseProgress: any[];
  teamUsers: any[];
  getUserName: (uid: string) => string;
}): void {
  // Stub: Create a simple text file as fallback
  const lines = [
    `Checklist - ${params.projectName}`,
    `Fecha: ${new Date().toLocaleDateString('es-CO')}`,
    '='.repeat(50),
    '',
  ];

  params.entries.forEach((entry: any) => {
    lines.push(`- ${entry.data?.text || entry.text || 'Item'}`);
    if (entry.data?.checked !== undefined) {
      lines.push(`  Estado: ${entry.data.checked ? 'Completado' : 'Pendiente'}`);
    }
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checklist_${params.projectName}_${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
