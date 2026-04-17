/**
 * audit-trail.ts
 * Sistema de registro de auditoría para ArchiFlow v2.0
 * Registra quién cambió qué y cuándo en la aplicación.
 *
 * Usa Firebase Firestore (CDN) via firebase-service.ts
 */

import { getDb, serverTimestamp, snapToDocs } from '@/lib/firebase-service';
import type { FirestoreTimestamp } from '@/lib/types';

/* ===== TYPES ===== */

export type AuditAction = 'create' | 'update' | 'delete';

export type AuditEntityType =
  | 'project'
  | 'task'
  | 'expense'
  | 'supplier'
  | 'company'
  | 'invoice'
  | 'meeting'
  | 'approval'
  | 'inventory_product'
  | 'inventory_movement'
  | 'inventory_transfer';

export interface AuditEntry {
  id: string;
  data: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityName: string;
    projectId?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    userId: string;
    userName: string;
    timestamp: FirestoreTimestamp | null;
  };
}

export interface AuditFilters {
  entityType?: AuditEntityType | 'all';
  userId?: string | 'all';
  projectId?: string | 'all';
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
  limit?: number;
}

/** Field labels in Spanish for human-readable change display */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  status: 'Estado',
  budget: 'Presupuesto',
  assigneeId: 'Asignado',
  priority: 'Prioridad',
  dueDate: 'Fecha límite',
  startDate: 'Fecha inicio',
  endDate: 'Fecha fin',
  name: 'Nombre',
  title: 'Título',
  description: 'Descripción',
  client: 'Cliente',
  location: 'Ubicación',
  progress: 'Progreso',
  category: 'Categoría',
  amount: 'Monto',
  concept: 'Concepto',
  rating: 'Calificación',
  phase: 'Fase',
  date: 'Fecha',
  email: 'Correo',
  phone: 'Teléfono',
  address: 'Dirección',
  website: 'Sitio web',
  notes: 'Notas',
  companyId: 'Empresa',
  number: 'Número',
  total: 'Total',
  subtotal: 'Subtotal',
  tax: 'Impuestos',
  stock: 'Stock',
  warehouse: 'Almacén',
  quantity: 'Cantidad',
  type: 'Tipo',
};

/** Entity type icons for the audit log */
export const AUDIT_ENTITY_ICONS: Record<AuditEntityType, string> = {
  project: '📁',
  task: '✅',
  expense: '💰',
  supplier: '🏪',
  company: '🏢',
  invoice: '🧾',
  meeting: '📅',
  approval: '📋',
  inventory_product: '📦',
  inventory_movement: '🔄',
  inventory_transfer: '🚚',
};

/** Entity type labels in Spanish */
export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  project: 'Proyecto',
  task: 'Tarea',
  expense: 'Gasto',
  supplier: 'Proveedor',
  company: 'Empresa',
  invoice: 'Factura',
  meeting: 'Reunión',
  approval: 'Aprobación',
  inventory_product: 'Producto',
  inventory_movement: 'Movimiento',
  inventory_transfer: 'Transferencia',
};

/** Action labels in Spanish */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Creó',
  update: 'Actualizó',
  delete: 'Eliminó',
};

/* ===== HELPER: Extract meaningful changes ===== */

/**
 * Compare old and new data objects and return only meaningful changes.
 * Only tracks fields defined in TRACKED_FIELDS to keep the audit log lightweight.
 */
const TRACKED_FIELDS: Record<AuditEntityType, string[]> = {
  project: ['status', 'budget', 'name', 'client', 'location', 'progress', 'startDate', 'endDate', 'companyId', 'phase', 'description'],
  task: ['status', 'priority', 'assigneeId', 'title', 'dueDate', 'description', 'projectId'],
  expense: ['concept', 'amount', 'category', 'date', 'projectId'],
  supplier: ['name', 'category', 'rating', 'email', 'phone', 'address'],
  company: ['name', 'nit', 'email', 'phone', 'address'],
  invoice: ['status', 'total', 'subtotal', 'tax', 'number', 'issueDate', 'dueDate'],
  meeting: ['title', 'date', 'time', 'duration', 'location'],
  approval: ['status', 'title', 'amount', 'type', 'description'],
  inventory_product: ['name', 'stock', 'price', 'warehouse', 'categoryId'],
  inventory_movement: ['type', 'quantity', 'reason', 'warehouse'],
  inventory_transfer: ['status', 'quantity', 'fromWarehouse', 'toWarehouse'],
};

export function extractChanges(
  entityType: AuditEntityType,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const fields = TRACKED_FIELDS[entityType] || [];
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    // Skip if both are empty/undefined
    if (oldVal === undefined && newVal === undefined) continue;
    if (oldVal === '' && newVal === '') continue;
    if (oldVal === null && newVal === null) continue;

    // Compare values
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: oldVal ?? '', new: newVal ?? '' };
    }
  }

  return changes;
}

/* ===== CORE FUNCTIONS ===== */

/**
 * Log an audit entry to Firestore.
 * This is the main entry point for recording audit events.
 *
 * The function is fire-and-forget — errors are logged to console but don't
 * propagate to the caller, so audit failures don't break the main workflow.
 */
export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  changes?: Record<string, { old: unknown; new: unknown }>,
  projectId?: string,
  userId?: string,
  userName?: string,
  tenantId?: string,
): Promise<void> {
  try {
    const db = getDb();

    const entry = {
      action,
      entityType,
      entityId,
      entityName,
      projectId: projectId || null,
      tenantId: tenantId || null,
      changes: changes && Object.keys(changes).length > 0 ? changes : null,
      userId: userId || 'unknown',
      userName: userName || 'Desconocido',
      timestamp: serverTimestamp(),
    };

    await db.collection('audit_trail').add(entry);
  } catch (err) {
    // Audit logging should NEVER break the main workflow
    console.error('[ArchiFlow Audit] Error writing audit entry:', err);
  }
}

/**
 * Query audit logs with optional filters.
 * Returns the most recent entries first (ordered by timestamp desc).
 */
export async function getAuditLogs(
  filters?: AuditFilters & { tenantId?: string }
): Promise<AuditEntry[]> {
  try {
    const db = getDb();
    let query: any = db.collection('audit_trail').orderBy('timestamp', 'desc');

    // Apply tenant isolation filter
    if (filters?.tenantId) {
      query = query.where('tenantId', '==', filters.tenantId);
    }

    // Apply filters
    if (filters?.entityType && filters.entityType !== 'all') {
      query = query.where('entityType', '==', filters.entityType);
    }
    if (filters?.userId && filters.userId !== 'all') {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      query = query.where('projectId', '==', filters.projectId);
    }

    // Apply limit (default 50)
    const limit = filters?.limit || 50;
    query = query.limit(limit);

    const snap = await query.get();
    return snapToDocs<AuditEntry['data']>(snap);
  } catch (err) {
    console.error('[ArchiFlow Audit] Error querying audit logs:', err);
    return [];
  }
}

/**
 * Format a change entry as a human-readable diff string.
 * Example: "Estado: En progreso → Completado"
 */
export function formatChange(field: string, change: { old: unknown; new: unknown }): string {
  const label = AUDIT_FIELD_LABELS[field] || field;
  return `${label}: ${formatValue(change.old)} → ${formatValue(change.new)}`;
}

/**
 * Format a value for display in the audit log.
 * Handles special cases like empty strings, null, and numbers.
 */
export function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '(vacío)';
  if (typeof val === 'number') return val.toLocaleString('es-CO');
  return String(val);
}
