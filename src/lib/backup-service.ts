/**
 * backup-service.ts
 * Sistema de copia de seguridad y restauración para ArchiFlow.
 * Exporta/importa todos los datos de Firestore a JSON.
 */

import { getDb, type FirestoreDB, type QuerySnapshot } from './firebase-service';

/* ===== TYPES ===== */

export interface BackupMetadata {
  version: string;
  exportDate: string;
  uid: string;
  companyName?: string;
  userEmail?: string;
  totalCollections: number;
  totalDocuments: number;
  estimatedSizeMB: string;
}

export type ImportConflictStrategy = 'skip' | 'replace' | 'merge';

export interface CollectionBackup {
  collection: string;
  count: number;
  documents: Array<{ id: string; data: Record<string, unknown> }>;
}

export interface BackupData {
  metadata: BackupMetadata;
  collections: CollectionBackup[];
}

export interface ImportSummary {
  collection: string;
  total: number;
  created: number;
  skipped: number;
  replaced: number;
  errors: number;
}

export interface ImportResult {
  success: boolean;
  summary: ImportSummary[];
  totalCreated: number;
  totalSkipped: number;
  totalReplaced: number;
  totalErrors: number;
  errors: string[];
}

/* ===== CONSTANTS ===== */

const BACKUP_VERSION = '1.0.0';

const BACKUP_COLLECTIONS: Array<{ name: string; label: string; icon: string }> = [
  { name: 'projects', label: 'Proyectos', icon: '📁' },
  { name: 'tasks', label: 'Tareas', icon: '✅' },
  { name: 'expenses', label: 'Gastos', icon: '💰' },
  { name: 'suppliers', label: 'Proveedores', icon: '🏪' },
  { name: 'companies', label: 'Empresas', icon: '🏢' },
  { name: 'meetings', label: 'Reuniones', icon: '📅' },
  { name: 'galleryPhotos', label: 'Fotos Galería', icon: '📸' },
  { name: 'invProducts', label: 'Productos Inventario', icon: '📦' },
  { name: 'invCategories', label: 'Categorías Inventario', icon: '🏷️' },
  { name: 'invMovements', label: 'Movimientos', icon: '🔄' },
  { name: 'invTransfers', label: 'Transferencias', icon: '🚚' },
  { name: 'invoices', label: 'Facturas', icon: '🧾' },
  { name: 'quotations', label: 'Cotizaciones', icon: '📋' },
  { name: 'purchaseOrders', label: 'Órdenes de Compra', icon: '🛒' },
  { name: 'fieldNotes', label: 'Minutas de Obra', icon: '📝' },
  { name: 'photoLogs', label: 'Bitácora Fotográfica', icon: '📷' },
  { name: 'inspections', label: 'Inspecciones', icon: '🔍' },
  { name: 'changeOrders', label: 'Control de Cambios', icon: '🔄' },
  { name: 'dailyLogs', label: 'Diarios de Obra', icon: '📋' },
  { name: 'comments', label: 'Comentarios', icon: '💬' },
];

/* ===== UTILITY FUNCTIONS ===== */

/**
 * Estimate the size of a backup in megabytes (MB).
 * Uses JSON serialization size as a proxy.
 */
export function estimateBackupSize(data: BackupData): string {
  const jsonStr = JSON.stringify(data);
  const bytes = new Blob([jsonStr]).size;
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;
}

/**
 * Get document counts for all backup collections.
 * Returns an array with collection names and their document counts.
 */
export async function getCollectionCounts(
  db: FirestoreDB,
): Promise<Array<{ name: string; label: string; icon: string; count: number }>> {
  const results: Array<{ name: string; label: string; icon: string; count: number }> = [];

  for (const col of BACKUP_COLLECTIONS) {
    try {
      const snap: QuerySnapshot = await db.collection(col.name).get();
      results.push({
        name: col.name,
        label: col.label,
        icon: col.icon,
        count: snap.size,
      });
    } catch (err) {
      console.warn(`[Backup] Error reading collection ${col.name}:`, err);
      results.push({ name: col.name, label: col.label, icon: col.icon, count: 0 });
    }
  }

  return results;
}

/**
 * Export all user data to a BackupData structure.
 * Fetches all documents from each backup collection.
 */
export async function exportAllData(
  uid: string,
  companyId?: string,
): Promise<BackupData> {
  const db = getDb();
  const collections: CollectionBackup[] = [];
  let totalDocuments = 0;

  for (const col of BACKUP_COLLECTIONS) {
    try {
      let query = db.collection(col.name);

      // Filter by companyId if available and applicable
      if (companyId && ['projects', 'tasks', 'expenses', 'suppliers', 'companies'].includes(col.name)) {
        query = query.where('companyId', '==', companyId) as ReturnType<typeof db.collection>;
      }

      const snap: QuerySnapshot = await query.get();
      const docs = snap.docs.map((d) => ({
        id: d.id,
        data: (d.data() || {}) as Record<string, unknown>,
      }));

      collections.push({
        collection: col.name,
        count: docs.length,
        documents: docs,
      });

      totalDocuments += docs.length;
    } catch (err) {
      console.warn(`[Backup] Error exporting collection ${col.name}:`, err);
      collections.push({ collection: col.name, count: 0, documents: [] });
    }
  }

  const backupData: BackupData = {
    metadata: {
      version: BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      uid,
      companyName: companyId || undefined,
      totalCollections: collections.length,
      totalDocuments,
      estimatedSizeMB: '', // Will be filled below
    },
    collections,
  };

  // Calculate estimated size
  backupData.metadata.estimatedSizeMB = estimateBackupSize(backupData);

  return backupData;
}

/**
 * Validate a backup JSON structure.
 * Returns an error message if invalid, or null if valid.
 */
export function validateBackupStructure(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'El archivo no es un JSON válido.';
  }

  const backup = data as Record<string, unknown>;

  if (!backup.metadata || typeof backup.metadata !== 'object') {
    return 'El archivo no contiene metadatos válidos.';
  }

  const meta = backup.metadata as Record<string, unknown>;
  if (!meta.version || !meta.exportDate) {
    return 'Los metadatos están incompletos (falta versión o fecha).';
  }

  if (!Array.isArray(backup.collections)) {
    return 'El archivo no contiene una lista de colecciones.';
  }

  // Validate each collection entry
  for (const col of backup.collections) {
    if (!col || typeof col !== 'object') continue;
    const c = col as Record<string, unknown>;
    if (typeof c.collection !== 'string') {
      return `Colección inválida: falta nombre de colección.`;
    }
    if (!Array.isArray(c.documents)) {
      return `Colección "${c.collection}": no contiene documentos válidos.`;
    }
  }

  return null; // Valid
}

/**
 * Generate an import summary preview (without actually importing).
 * Checks what would be imported.
 */
export function generateImportPreview(
  data: BackupData,
): ImportSummary[] {
  return data.collections.map((col) => ({
    collection: col.collection,
    total: col.count,
    created: 0,
    skipped: 0,
    replaced: 0,
    errors: 0,
  }));
}

/**
 * Get a human-readable summary of backup contents for display.
 */
export function getBackupInfo(data: BackupData): {
  date: string;
  version: string;
  uid: string;
  collections: Array<{ name: string; count: number }>;
  totalDocs: number;
} {
  return {
    date: new Date(data.metadata.exportDate).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    version: data.metadata.version,
    uid: data.metadata.uid,
    collections: data.collections.map((c) => ({ name: c.collection, count: c.count })),
    totalDocs: data.metadata.totalDocuments,
  };
}

/**
 * Download a BackupData object as a JSON file.
 * Triggers a browser download.
 */
export function downloadBackupFile(data: BackupData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date(data.metadata.exportDate).toISOString().slice(0, 10);
  const fileName = `archiflow_backup_${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read and parse a backup JSON file.
 * Returns the parsed BackupData or throws an error.
 */
export async function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          reject(new Error('No se pudo leer el archivo.'));
          return;
        }
        const data = JSON.parse(text);
        const validationError = validateBackupStructure(data);
        if (validationError) {
          reject(new Error(validationError));
          return;
        }
        resolve(data as BackupData);
      } catch (err) {
        reject(new Error('El archivo no es un JSON válido de backup de ArchiFlow.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Save last backup date to localStorage.
 */
export function saveLastBackupDate(date: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('archiflow_last_backup', date);
  }
}

/**
 * Get last backup date from localStorage.
 */
export function getLastBackupDate(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('archiflow_last_backup');
  }
  return null;
}

/**
 * Format a date string for display.
 */
export function formatBackupDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

export { BACKUP_COLLECTIONS };
