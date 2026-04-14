/**
 * import-data.ts
 * Importación desde Excel/CSV para ArchiFlow v2.0.
 * Usa xlsx (dinámico) para leer .xlsx, .xls y .csv.
 * Todas las funciones devuelven { imported, errors }.
 */

import type { TeamUser, Project, ProjectStatus, TaskPriority, TaskStatus } from '@/lib/types';
import { getFirebase, serverTimestamp } from '@/lib/firebase-service';

/* ===== Helpers ===== */

const VALID_PROJECT_STATUSES: ProjectStatus[] = ['Concepto', 'Anteproyecto', 'Proyecto', 'En ejecución', 'Entrega', 'Pausado', 'Completado', 'Cancelado'];
const VALID_TASK_PRIORITIES: TaskPriority[] = ['Baja', 'Media', 'Alta', 'Urgente'];
const VALID_TASK_STATUSES: TaskStatus[] = ['Por hacer', 'En progreso', 'En revisión', 'Completado'];

interface ImportResult {
  imported: number;
  errors: string[];
}

/** Read any spreadsheet file and return array of row objects (header → value). */
async function readSpreadsheet(file: File): Promise<Record<string, any>[]> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const wsName = wb.SheetNames[0];
  if (!wsName) return [];
  const ws = wb.Sheets[wsName];
  // json_to_sheet with header:1 first to check for empty
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  return data;
}

/** Parse a date string supporting DD/MM/YYYY, YYYY-MM-DD, and Excel serial dates. */
function parseDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  const s = String(val).trim();
  if (!s) return '';

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

  return '';
}

/** Parse a number, handling COP format (dots as thousands separator, comma as decimal). */
function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  const s = String(val || '').trim();
  if (!s) return 0;
  // Remove currency symbols and spaces
  const cleaned = s.replace(/[^0-9.,\-]/g, '');
  if (!cleaned) return 0;
  // Handle COP format: 1.500.000,50 or 1500000
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Could be 1,500,000.00 (US) or 1.500.000,50 (EU/COP)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // COP: dots are thousands, comma is decimal
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // US: commas are thousands, dot is decimal
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }
  if (cleaned.includes(',')) {
    // If comma is at end-ish, it might be thousands separator
    const parts = cleaned.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned.replace(/\./g, '')) || 0;
}

/* ===== Import Projects ===== */

export async function importProjects(
  file: File,
  teamUsers: TeamUser[],
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  const rows = await readSpreadsheet(file);
  if (rows.length === 0) {
    return { imported: 0, errors: ['El archivo está vacío o no tiene datos válidos.'] };
  }

  // Get existing project names for duplicate check
  const db = getFirebase().firestore();
  const existingSnap = await db.collection('projects').get();
  const existingNames = new Set<string>();
  existingSnap.forEach((doc: any) => {
    const name = (doc.data()?.name || '').toLowerCase().trim();
    if (name) existingNames.add(name);
  });

  const ts = serverTimestamp();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // row 1 is header
    const row = rows[i];

    const name = String(row['Nombre'] || row['nombre'] || '').trim();
    if (!name) {
      errors.push(`Fila ${rowNum}: "Nombre" está vacío. Fila omitida.`);
      continue;
    }

    // Duplicate check
    if (existingNames.has(name.toLowerCase())) {
      errors.push(`Fila ${rowNum}: "${name}" ya existe. Fila omitida.`);
      continue;
    }

    const statusRaw = String(row['Estado'] || row['estado'] || '').trim();
    const status = VALID_PROJECT_STATUSES.includes(statusRaw as ProjectStatus)
      ? statusRaw
      : 'Concepto';

    const client = String(row['Cliente'] || row['cliente'] || '').trim();
    const location = String(row['Ubicación'] || row['Ubicacion'] || row['ubicacion'] || '').trim();
    const budget = parseNumber(row['Presupuesto'] || row['presupuesto']);
    const description = String(row['Descripción'] || row['Descripcion'] || row['descripcion'] || '').trim();
    const startDate = parseDate(row['Fecha Inicio'] || row['fecha inicio'] || row['Fecha inicio']);
    const endDate = parseDate(row['Fecha Fin'] || row['fecha fin'] || row['Fecha fin'] || row['Fecha Entrega'] || '');

    try {
      await db.collection('projects').add({
        name,
        status,
        client,
        location,
        budget,
        description,
        startDate,
        endDate,
        progress: 0,
        createdAt: ts,
        updatedAt: ts,
      });
      existingNames.add(name.toLowerCase());
      imported++;
    } catch (err: any) {
      errors.push(`Fila ${rowNum}: Error al guardar "${name}" — ${err?.message || 'Error desconocido'}`);
    }
  }

  return { imported, errors };
}

/* ===== Import Tasks ===== */

export async function importTasks(
  file: File,
  projects: any[],
  teamUsers: TeamUser[],
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  const rows = await readSpreadsheet(file);
  if (rows.length === 0) {
    return { imported: 0, errors: ['El archivo está vacío o no tiene datos válidos.'] };
  }

  // Build project lookup by name
  const projectByName = new Map<string, string>();
  projects.forEach((p: any) => {
    const name = (p.data?.name || '').toLowerCase().trim();
    if (name) projectByName.set(name, p.id);
  });

  // Build user lookup by email
  const userByEmail = new Map<string, string>();
  teamUsers.forEach(u => {
    const email = (u.data?.email || '').toLowerCase().trim();
    if (email) userByEmail.set(email, u.id);
  });

  const db = getFirebase().firestore();
  const ts = serverTimestamp();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const title = String(row['Título'] || row['Titulo'] || row['titulo'] || row['Tarea'] || '').trim();
    if (!title) {
      errors.push(`Fila ${rowNum}: "Título" está vacío. Fila omitida.`);
      continue;
    }

    // Match project by name
    const projNameRaw = String(row['Proyecto'] || row['proyecto'] || '').trim();
    const projectId = projectByName.get(projNameRaw.toLowerCase());
    if (!projectId && projNameRaw) {
      errors.push(`Fila ${rowNum}: Proyecto "${projNameRaw}" no encontrado. Fila omitida.`);
      continue;
    }

    // Match assignee by email
    const assigneeEmail = String(row['Asignado a'] || row['Asignado'] || row['asignado'] || '').trim().toLowerCase();
    const assigneeId = userByEmail.get(assigneeEmail) || '';

    const priorityRaw = String(row['Prioridad'] || row['prioridad'] || '').trim();
    const priority = VALID_TASK_PRIORITIES.includes(priorityRaw as TaskPriority)
      ? priorityRaw
      : 'Media';

    const statusRaw = String(row['Estado'] || row['estado'] || '').trim();
    const status = VALID_TASK_STATUSES.includes(statusRaw as TaskStatus)
      ? statusRaw
      : 'Por hacer';

    const dueDate = parseDate(row['Fecha Límite'] || row['Fecha limite'] || row['fecha limite'] || row['Fecha'] || row['fecha']);
    const description = String(row['Descripción'] || row['Descripcion'] || row['descripcion'] || '').trim();

    try {
      await db.collection('tasks').add({
        title,
        projectId: projectId || '',
        assigneeId,
        assigneeIds: assigneeId ? [assigneeId] : [],
        priority,
        status,
        dueDate,
        description,
        subtasks: [],
        createdAt: ts,
        updatedAt: ts,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Fila ${rowNum}: Error al guardar "${title}" — ${err?.message || 'Error desconocido'}`);
    }
  }

  return { imported, errors };
}

/* ===== Import Expenses ===== */

export async function importExpenses(
  file: File,
  projects: any[],
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  const rows = await readSpreadsheet(file);
  if (rows.length === 0) {
    return { imported: 0, errors: ['El archivo está vacío o no tiene datos válidos.'] };
  }

  // Build project lookup by name
  const projectByName = new Map<string, string>();
  projects.forEach((p: any) => {
    const name = (p.data?.name || '').toLowerCase().trim();
    if (name) projectByName.set(name, p.id);
  });

  const db = getFirebase().firestore();
  const ts = serverTimestamp();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const concept = String(row['Concepto'] || row['concepto'] || '').trim();
    if (!concept) {
      errors.push(`Fila ${rowNum}: "Concepto" está vacío. Fila omitida.`);
      continue;
    }

    // Match project by name
    const projNameRaw = String(row['Proyecto'] || row['proyecto'] || '').trim();
    const projectId = projectByName.get(projNameRaw.toLowerCase());
    if (!projectId && projNameRaw) {
      errors.push(`Fila ${rowNum}: Proyecto "${projNameRaw}" no encontrado. Fila omitida.`);
      continue;
    }

    const category = String(row['Categoría'] || row['Categoria'] || row['categoria'] || '').trim() || 'Imprevistos';
    const amount = parseNumber(row['Monto'] || row['monto'] || row['Valor'] || row['valor']);
    const date = parseDate(row['Fecha'] || row['fecha']);

    try {
      await db.collection('expenses').add({
        concept,
        projectId: projectId || '',
        category,
        amount,
        date,
        createdAt: ts,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Fila ${rowNum}: Error al guardar "${concept}" — ${err?.message || 'Error desconocido'}`);
    }
  }

  return { imported, errors };
}

/* ===== Template Generation ===== */

/** Generate a sample Excel template for the given import type. */
export async function generateTemplate(type: 'projects' | 'tasks' | 'expenses'): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  if (type === 'projects') {
    const data = [
      { Nombre: 'Edificio Residencial Las Palmas', Estado: 'En ejecución', Cliente: 'Constructora ABC', Ubicación: 'Bogotá, Colombia', Presupuesto: 500000000, Descripción: 'Proyecto de edificio residencial de 10 pisos', 'Fecha Inicio': '01/01/2025', 'Fecha Fin': '31/12/2025' },
      { Nombre: 'Casa Familiar López', Estado: 'Concepto', Cliente: 'Familia López', Ubicación: 'Medellín, Colombia', Presupuesto: 200000000, Descripción: 'Diseño de casa unifamiliar', 'Fecha Inicio': '', 'Fecha Fin': '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 15 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
  } else if (type === 'tasks') {
    const data = [
      { Título: 'Revisión de planos estructurales', Proyecto: 'Edificio Residencial Las Palmas', 'Asignado a': 'juan@email.com', Prioridad: 'Alta', Estado: 'En progreso', 'Fecha Límite': '15/02/2025', Descripción: 'Revisar planos con el ingeniero' },
      { Título: 'Instalación eléctrica fase 1', Proyecto: 'Edificio Residencial Las Palmas', 'Asignado a': 'maria@email.com', Prioridad: 'Media', Estado: 'Por hacer', 'Fecha Límite': '28/02/2025', Descripción: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Tareas');
  } else {
    const data = [
      { Concepto: 'Cemento Portland', Proyecto: 'Edificio Residencial Las Palmas', Categoría: 'Materiales', Monto: 2500000, Fecha: '10/01/2025' },
      { Concepto: 'Mano de obra electricista', Proyecto: 'Edificio Residencial Las Palmas', Categoría: 'Mano de obra', Monto: 3500000, Fecha: '12/01/2025' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Download a template for a given import type. */
export async function downloadTemplate(type: 'projects' | 'tasks' | 'expenses') {
  const blob = await generateTemplate(type);
  const names: Record<string, string> = { projects: 'plantilla-proyectos', tasks: 'plantilla-tareas', expenses: 'plantilla-gastos' };
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${names[type]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
