/**
 * types.ts
 * Todas las interfaces, constantes y configuraciones del proyecto.
 * Extraído de page.tsx para modularización.
 */

/* ===== INTERFACES ===== */

/** Firebase Timestamp type — loaded via CDN, not npm. Represents Firestore server timestamps. */
export type FirestoreTimestamp = { seconds: number; nanoseconds: number } | null;

/** Common base fields for Firestore documents */
export interface FirestoreBase {
  createdAt: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  createdBy?: string;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: string;
  companyId?: string;
}

export interface TeamUser {
  id: string;
  data: {
    name: string;
    email: string;
    role?: string;
    photoURL?: string;
    companyId?: string;
    isActive?: boolean;
    lastLogin?: FirestoreTimestamp | null;
  };
}

export type ProjectStatus = 'Concepto' | 'Anteproyecto' | 'Proyecto' | 'En ejecución' | 'Entrega' | 'Pausado' | 'Completado' | 'Cancelado';

export interface Project {
  id: string;
  data: {
    name: string;
    status: ProjectStatus;
    client: string;
    location: string;
    budget: number;
    description: string;
    startDate: string;
    endDate: string;
    progress: number;
    companyId?: string;
    phase?: string;
    color?: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
    createdBy?: string;
    updatedBy?: string;
  };
}

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  phases: string[];
  tasks: string[];
}

export type TaskPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type TaskStatus = 'Por hacer' | 'En progreso' | 'En revisión' | 'Completado';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  data: {
    title: string;
    projectId: string;
    assigneeId: string;
    assigneeIds?: string[];
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    startDate?: string;
    description?: string;
    subtasks?: Subtask[];
    progress?: number;
    order?: number;
    phase?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy?: string;
    updatedAt?: FirestoreTimestamp | null;
    updatedBy?: string;
    completedAt?: FirestoreTimestamp | null;
  };
}

export interface Expense {
  id: string;
  data: {
    concept: string;
    projectId: string;
    category: string;
    amount: number;
    date: string;
    supplier?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy?: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface Supplier {
  id: string;
  data: {
    name: string;
    category: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    notes: string;
    rating: number;
    createdAt: FirestoreTimestamp | null;
    createdBy?: string;
  };
}

export type ApprovalType = 'budget_change' | 'phase_completion' | 'expense_approval' | 'general';
export type ApprovalStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  budget_change: 'Cambio presupuestario',
  phase_completion: 'Completar fase',
  expense_approval: 'Aprobar gasto',
  general: 'General',
};

export const APPROVAL_TYPE_ICONS: Record<ApprovalType, string> = {
  budget_change: '💰',
  phase_completion: '🏗️',
  expense_approval: '🧾',
  general: '📋',
};

export interface Approval {
  id: string;
  data: {
    title: string;
    description: string;
    status: ApprovalStatus;
    type: ApprovalType;
    requestedBy: string;
    requestedByName: string;
    projectId?: string;
    projectName?: string;
    amount?: number;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedAt?: FirestoreTimestamp | null;
    comments?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface WorkPhase {
  id: string;
  data: {
    name: string;
    description: string;
    status: 'Pendiente' | 'En progreso' | 'Completada';
    order: number;
    startDate: string;
    endDate: string;
    projectId?: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface DailyLog {
  id: string;
  data: {
    projectId: string;
    date: string;
    weather: string;
    temperature: number;
    activities: string[];
    laborCount: number;
    equipment: string[];
    materials: string[];
    observations: string;
    photos: string[];
    supervisor: string;
    createdBy: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface ProjectFile {
  id: string;
  data: {
    name: string;
    type: string;
    size: number;
    data?: string;
    url?: string;
    uploadedBy?: string;
    createdAt: FirestoreTimestamp | null;
  };
}

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  webUrl: string;
  createdDateTime: string;
  '@microsoft.graph.downloadUrl'?: string;
  thumbnailUrl?: string;
}

export interface GalleryPhoto {
  id: string;
  data: {
    projectId: string;
    categoryName: string;
    caption: string;
    /** Download URL from Firebase Storage (preferred) or base64 data URL (legacy) */
    imageData: string;
    /** Storage path in Firebase Storage (null for legacy base64 photos) */
    storagePath?: string;
    /** Original file name */
    fileName?: string;
    /** File size in bytes */
    fileSize?: number;
    /** MIME type */
    contentType?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

export interface InvProduct {
  id: string;
  data: {
    name: string;
    sku: string;
    categoryId: string;
    unit: string;
    price: number;
    stock: number;
    minStock: number;
    description: string;
    imageData: string;
    warehouse: string;
    warehouseStock: Record<string, number>;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
    updatedBy?: string;
  };
}

export interface InvCategory {
  id: string;
  data: {
    name: string;
    color: string;
    description: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface InvMovement {
  id: string;
  data: {
    productId: string;
    type: 'Entrada' | 'Salida';
    quantity: number;
    reason: string;
    reference: string;
    date: string;
    warehouse?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

export interface InvTransfer {
  id: string;
  data: {
    productId: string;
    productName: string;
    fromWarehouse: string;
    toWarehouse: string;
    quantity: number;
    status: 'Pendiente' | 'En tránsito' | 'Completada' | 'Cancelada';
    date: string;
    notes: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    completedAt?: FirestoreTimestamp | null;
  };
}

export interface Company {
  id: string;
  data: {
    name: string;
    nit: string;
    address?: string;
    phone?: string;
    email?: string;
    legalName?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy?: string;
    updatedAt?: FirestoreTimestamp | null;
    updatedBy?: string;
  };
}

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Meeting {
  id: string;
  data: {
    title: string;
    projectId?: string;
    date: string;
    time: string;
    duration: number;
    location?: string;
    description?: string;
    attendees: string[];
    createdBy?: string;
    createdAt: FirestoreTimestamp | null;
    createdByUid?: string;
    recurrence?: RecurrencePattern;
    recurrenceEnd?: string; // ISO date string — when recurrence stops
  };
}

export interface ChatMessage {
  id: string;
  uid: string;
  userName: string;
  userPhoto?: string;
  text: string;
  type?: 'text' | 'image' | 'audio' | 'file' | 'TEXT' | 'AUDIO' | 'IMAGE' | 'FILE';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileData?: string;
  fileType?: string;
  audioData?: string;
  audioDuration?: number;
  replyTo?: { id: string; text: string; userName: string; uid: string } | string;
  reactions?: Record<string, string[]>;
  createdAt: FirestoreTimestamp | null;
}

export interface NotifEntry {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: string;
  read: boolean;
  timestamp: Date;
  screen: string | null;
  itemId: string | null;
}

export interface TimeEntry {
  id: string;
  data: {
    userId: string;
    userName: string;
    projectId: string;
    phaseName: string;
    description: string;
    startTime: string;
    endTime: string;
    duration: number;
    billable: boolean;
    rate: number;
    date: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface InvoiceItem {
  concept: string;
  phase: string;
  hours: number;
  rate: number;
  amount: number;
}

export type InvoiceStatus = 'Borrador' | 'Enviada' | 'Pagada' | 'Vencida' | 'Cancelada';

export interface Invoice {
  id: string;
  data: {
    projectId: string;
    projectName: string;
    clientName: string;
    number: string;
    status: InvoiceStatus;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    notes: string;
    issueDate: string;
    dueDate: string;
    paidDate?: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

export type QuotationStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Convertida' | 'Vencida';

export interface QuotationItem {
  id: string;
  concept: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vat: number; // IVA percentage (default 19)
  discount: number; // discount percentage (default 0)
  subtotal: number; // quantity * unitPrice
  vatAmount: number; // subtotal * vat / 100
  discountAmount: number; // subtotal * discount / 100
  total: number; // subtotal + vatAmount - discountAmount
}

export interface QuotationSection {
  id: string;
  name: string;
  items: QuotationItem[];
  subtotal: number;
  vatTotal: number;
  discountTotal: number;
  total: number;
}

export interface QuotationPayment {
  id: string;
  label: string;
  condition: string; // e.g. "Al inicio", "Al 80%", "Entrega final"
  percentage: number;
  amount: number;
  paid: boolean;
  paidDate?: string;
}

export interface Quotation {
  id: string;
  data: {
    number: string;
    projectId: string;
    projectName: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    status: QuotationStatus;
    sections: QuotationSection[];
    payments: QuotationPayment[];
    subtotal: number;
    vatTotal: number;
    discountTotal: number;
    grandTotal: number;
    validUntil: string; // ISO date
    notes: string;
    internalNotes: string; // only visible to team
    terms: string; // payment terms text
    bankName: string;
    bankAccount: string;
    bankAccountType: string;
    bankHolder: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

// Purchase Order
export type PurchaseOrderStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Parcial' | 'Recibida' | 'Cancelada';

export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  data: {
    number: string;
    projectId: string;
    projectName: string;
    supplierId?: string;
    supplierName: string;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    deliveryDate: string;
    deliveryAddress: string;
    notes: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

// Field Note (Minuta)
export interface FieldNote {
  id: string;
  data: {
    projectId: string;
    projectName: string;
    date: string;
    weather: string;
    participants: string[];
    activities: string[];
    observations: string;
    commitments: string[];
    photos: string[];
    supervisor: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

// Photo Log Entry
export interface PhotoLogEntry {
  id: string;
  data: {
    projectId: string;
    projectName: string;
    space: string;
    phase: string;
    beforePhoto?: string;
    afterPhoto?: string;
    caption: string;
    progress: number;
    date: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
  };
}

// Inspection
export type InspectionStatus = 'Pendiente' | 'En progreso' | 'Aprobada' | 'Rechazada';

export interface InspectionItem {
  id: string;
  description: string;
  status: 'Aprobado' | 'Rechazado' | 'Pendiente' | 'N/A';
  score: number;
  notes: string;
  photo?: string;
}

export interface Inspection {
  id: string;
  data: {
    projectId: string;
    projectName: string;
    title: string;
    type: string; // structural, electrical, finishes, etc
    status: InspectionStatus;
    inspector: string;
    date: string;
    items: InspectionItem[];
    overallScore: number;
    observations: string;
    createdAt: FirestoreTimestamp | null;
    createdBy: string;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface Comment {
  id: string;
  data: {
    taskId: string;
    projectId: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    text: string;
    mentions: string[];
    parentId?: string;
    createdAt: FirestoreTimestamp | null;
    updatedAt?: FirestoreTimestamp | null;
  };
}

export interface TimeSession {
  entryId: string | null;
  startTime: number | null;
  description: string;
  projectId: string;
  phaseName: string;
  isRunning: boolean;
}

/* ===== FIRESTORE FLAT DOCUMENT TYPES ===== */
/** Flattened Firestore document types (id merged with data fields).
 *  Used in server-side code where documents are accessed as { id, ...doc.data() }.
 *  Fields are optional because Firestore documents may not have all fields. */

export interface ProjectFlat {
  id: string;
  name?: string;
  status?: string;
  progress?: number;
  budget?: number;
  phase?: string;
  client?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export interface TaskFlat {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  completedAt?: unknown;
  projectId?: string;
}

export interface ExpenseFlat {
  id: string;
  amount?: number | string;
  date?: string;
  category?: string;
  concept?: string;
  projectId?: string;
}

export interface MemberFlat {
  id: string;
  name?: string;
  displayName?: string;
  role?: string;
  active?: boolean;
}

export interface WhatsAppLinkedUser {
  id: string;
  whatsappPhone?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  linkedAt?: unknown;
  active?: boolean;
}

/* ===== NOTIFICATION EVENT TYPES ===== */

/** Granular notification event categories for per-event preference control. */
export type NotifEventType =
  | 'task_assigned'    // Nueva tarea asignada
  | 'task_due_soon'    // Tarea próxima a vencer
  | 'task_completed'   // Tarea completada
  | 'expense_added'    // Nuevo gasto registrado
  | 'budget_alert'     // Alerta de presupuesto
  | 'chat_message'     // Nuevo mensaje en chat
  | 'meeting_reminder' // Recordatorio de reunión
  | 'phase_change'     // Cambio de fase de proyecto
  | 'comment_mention'  // Mención en comentario
  | 'inventory_alert'  // Alerta de inventario (stock bajo)
  | 'approval_action'; // Acciones de aprobación (crear, aprobar, rechazar)

/** Per-user notification preferences — true = enabled, false = disabled. */
export type NotifPreferences = { [K in NotifEventType]: boolean };

/** Default: all notification channels enabled. */
export const DEFAULT_NOTIF_PREFERENCES: NotifPreferences = {
  task_assigned: true,
  task_due_soon: true,
  task_completed: true,
  expense_added: true,
  budget_alert: true,
  chat_message: true,
  meeting_reminder: true,
  phase_change: true,
  comment_mention: true,
  inventory_alert: true,
  approval_action: true,
};

/** Metadata for each notification event type (labels, descriptions, icons, categories). */
export const NOTIF_EVENT_CONFIG: Record<NotifEventType, { label: string; description: string; icon: string; category: string }> = {
  task_assigned:    { label: 'Tarea asignada',       description: 'Cuando te asignan una nueva tarea',                    icon: '📋', category: 'tasks' },
  task_due_soon:    { label: 'Tarea por vencer',     description: 'Recordatorio de tareas próximas a vencer o vencidas',   icon: '⏰', category: 'tasks' },
  task_completed:   { label: 'Tarea completada',     description: 'Cuando se completa una tarea asignada a ti',            icon: '✅', category: 'tasks' },
  expense_added:    { label: 'Nuevo gasto',          description: 'Cuando se registra un gasto en tus proyectos',           icon: '💰', category: 'budget' },
  budget_alert:     { label: 'Alerta de presupuesto',description: 'Cuando un proyecto alcanza un umbral de presupuesto',   icon: '🚨', category: 'budget' },
  chat_message:     { label: 'Mensajes de chat',     description: 'Nuevos mensajes en chat general o de proyecto',          icon: '💬', category: 'chat' },
  meeting_reminder: { label: 'Reuniones',            description: 'Nuevas reuniones programadas y recordatorios',           icon: '📅', category: 'meetings' },
  phase_change:     { label: 'Cambios de proyecto',  description: 'Cambios de estado en tus proyectos',                    icon: '📁', category: 'projects' },
  comment_mention:  { label: 'Menciones',            description: 'Cuando alguien te menciona en un comentario',            icon: '💬', category: 'comments' },
  inventory_alert:  { label: 'Alertas de inventario',description: 'Stock bajo, entradas, salidas y transferencias',         icon: '📦', category: 'inventory' },
  approval_action:  { label: 'Aprobaciones',         description: 'Creación, aprobación y rechazo de solicitudes',           icon: '📋', category: 'approvals' },
};

/** All NotifEventType values as a const array for iteration. */
export const NOTIF_EVENT_TYPES: readonly NotifEventType[] = [
  'task_assigned',
  'task_due_soon',
  'task_completed',
  'expense_added',
  'budget_alert',
  'chat_message',
  'meeting_reminder',
  'phase_change',
  'comment_mention',
  'inventory_alert',
  'approval_action',
];

/* ===== FORM DATA INTERFACES ===== */
/** Typed form data for each save function (replaces Record<string, any>). */

export interface ProjectFormData {
  projName: string;
  projStatus: string;
  projClient: string;
  projLocation: string;
  projBudget: string; // Number() applied
  projDesc: string;
  projStart: string;
  projEnd: string;
  projCompany: string;
}

export interface TaskFormData {
  taskTitle: string;
  taskProject: string;
  taskAssignee: string;
  taskPriority: string;
  taskStatus: string;
  taskDue: string;
}

export interface ExpenseFormData {
  expConcept: string;
  expProject: string;
  expCategory: string;
  expAmount: string; // Number() applied
  expDate: string;
}

export interface SupplierFormData {
  supName: string;
  supCategory: string;
  supPhone: string;
  supEmail: string;
  supAddress: string;
  supWebsite: string;
  supNotes: string;
  supRating: string; // Number() applied
}

export interface CompanyFormData {
  compName: string;
  compNit: string;
  compAddress: string;
  compPhone: string;
  compEmail: string;
  compLegal: string;
}

export interface ApprovalFormData {
  apprTitle: string;
  apprDesc: string;
}

export interface MeetingFormData {
  meetTitle: string;
  meetProject: string;
  meetDate: string;
  meetTime: string;
  meetDuration: string;
  meetLocation: string;
  meetDesc: string;
  meetAttendees: string[];
}

export interface GalleryPhotoFormData {
  photoProject: string;
  photoCategory: string;
  photoCaption: string;
  photoImage: string;
}

export interface InvProductFormData {
  prodName: string;
  prodSku: string;
  prodCategory: string;
  prodUnit: string;
  prodPrice: string; // Number() applied
  prodStock: string; // Number() applied
  prodMinStock: string; // Number() applied
  prodDesc: string;
  prodImage: string;
  prodWarehouse: string;
}

export interface InvMovementFormData {
  movProduct: string;
  movType: string;
  movQuantity: string; // Number() applied
  movReason: string;
  movReference: string;
  movDate: string;
  movWarehouse: string;
}

export interface InvTransferFormData {
  transProduct: string;
  transProductName: string;
  transFrom: string;
  transTo: string;
  transQuantity: string; // Number() applied
  transDate: string;
  transNotes: string;
}

export interface TimeEntryFormData {
  teProject: string;
  tePhase: string;
  teDescription: string;
  teStartTime: string;
  teEndTime: string;
  teDuration: string | number; // Number() applied
  teBillable: boolean;
  teRate: string | number; // Number() applied
  teDate: string;
}

export interface InvoiceFormData {
  invProject: string;
  invNumber: string;
  invStatus: string;
  invItems: any[];
  invSubtotal: string | number; // Number() applied
  invTax: string | number; // Number() applied
  invTotal: string | number; // Number() applied
  invNotes: string;
  invIssueDate: string;
  invDueDate: string;
}

export interface QuotationFormData {
  projId: string;
  number: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  status: string;
  sections: any[];
  payments: any[];
  validUntil: string;
  notes: string;
  internalNotes: string;
  terms: string;
  bankName: string;
  bankAccount: string;
  bankAccountType: string;
  bankHolder: string;
}

export interface CommentFormData {
  taskId: string;
  projectId: string;
  text: string;
  mentions: string[];
  parentId: string | null;
}

export interface ChatMessageFormData {
  text?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileData?: string;
  fileType?: string;
  audioData?: string;
  audioDuration?: number;
  replyTo?: any;
  reactions?: Record<string, string[]>;
}

/* ===== CONSTANTES ===== */

export const DEFAULT_PHASES = ['Planos', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'];

export const EXPENSE_CATS = ['Materiales', 'Mano de obra', 'Mobiliario', 'Acabados', 'Imprevistos'];

export const SUPPLIER_CATS = ['Materiales', 'Mobiliario', 'Iluminación', 'Acabados', 'Eléctrico', 'Plomería', 'Otro'];

export const PHOTO_CATS = ['Fachada', 'Interior', 'Obra', 'Planos', 'Renders', 'Otro'];

export const INV_UNITS = ['Unidad', 'Metro', 'Metro²', 'Metro³', 'Kilogramo', 'Litro', 'Galon', 'Rollo', 'Saco', 'Caja', 'Paquete', 'Pieza', 'Par', 'Set', 'Otro'] as const;

export const INV_WAREHOUSES = ['Almacén Principal', 'Obra en Curso', 'Bodega Reserva'] as const;

export const TRANSFER_STATUSES = ['Pendiente', 'En tránsito', 'Completada', 'Cancelada'] as const;

export const CAT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

export const ADMIN_EMAILS = ['yecos11@gmail.com'];

export const USER_ROLES = ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Contratista', 'Cliente', 'Miembro'] as const;

export const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-500/10 text-red-400 border-red-500/30',
  Director: 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30',
  Arquitecto: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Interventor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Contratista: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Cliente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Miembro: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]',
};

export const ROLE_ICONS: Record<string, string> = {
  Admin: '👑',
  Director: '🎯',
  Arquitecto: '📐',
  Interventor: '🔍',
  Contratista: '🏗️',
  Cliente: '🤝',
  Miembro: '👤',
};

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Permisos por defecto del sistema de roles. */
export const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  'Ver Dashboard': ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Contratista', 'Cliente', 'Miembro'],
  'Crear proyectos': ['Admin', 'Director', 'Arquitecto'],
  'Editar proyectos': ['Admin', 'Director', 'Arquitecto'],
  'Eliminar proyectos': ['Admin', 'Director'],
  'Crear tareas': ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Contratista'],
  'Asignar tareas': ['Admin', 'Director', 'Arquitecto'],
  'Gestionar equipo': ['Admin', 'Director'],
  'Cambiar roles': ['Admin'],
  'Ver presupuestos': ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Cliente'],
  'Ver inventario': ['Admin', 'Director', 'Arquitecto', 'Contratista', 'Interventor'],
  'Gestionar inventario': ['Admin', 'Director', 'Contratista'],
  'Panel Admin': ['Admin', 'Director'],
  'Chat general': ['Admin', 'Director', 'Arquitecto', 'Interventor', 'Contratista', 'Cliente', 'Miembro'],
  'Portal cliente': ['Admin', 'Director', 'Cliente'],
};

/** Navegación del sidebar */
export const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'profile', icon: '👤', label: 'Mi Perfil' },
  { id: 'projects', icon: '📁', label: 'Proyectos' },
  { id: 'tasks', icon: '✅', label: 'Tareas' },
  { id: 'timeTracking', icon: '⏱️', label: 'Tiempo' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'budget', icon: '💰', label: 'Presupuestos' },
  { id: 'files', icon: '📂', label: 'Archivos' },
  { id: 'obra', label: 'Obra', icon: '🏗️' },
  { id: 'suppliers', icon: '🏪', label: 'Proveedores' },
  { id: 'team', icon: '👥', label: 'Equipo' },
  { id: 'companies', icon: '🏢', label: 'Empresas' },
  { id: 'invoices', icon: '🧾', label: 'Facturas' },
  { id: 'quotations', icon: '📋', label: 'Cotizaciones' },
  { id: 'calendar', icon: '📅', label: 'Calendario' },
  { id: 'portal', label: 'Portal Cliente', icon: '🤝' },
  { id: 'gallery', icon: '📸', label: 'Galería' },
  { id: 'inventory', icon: '📦', label: 'Inventario' },
  { id: 'reports', icon: '📈', label: 'Reportes' },
  { id: 'admin', icon: '⚙️', label: 'Admin' },
  { id: 'settings', icon: '🎨', label: 'Configuración' },
] as const;

export const SCREEN_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  profile: 'Mi Perfil',
  projects: 'Proyectos',
  tasks: 'Tareas',
  timeTracking: 'Time Tracking',
  chat: 'Chat',
  budget: 'Presupuestos',
  files: 'Archivos',
  obra: 'Seguimiento de Obra',
  suppliers: 'Proveedores',
  team: 'Equipo',
  companies: 'Empresas',
  invoices: 'Facturación',
  quotations: 'Cotizaciones',
  calendar: 'Calendario',
  portal: 'Portal Cliente',
  gallery: 'Galería de Fotos',
  inventory: 'Inventario',
  reports: 'Reportes',
  admin: 'Panel de Administración',
  settings: 'Configuración',
  gantt: 'Cronograma',
  purchaseOrders: 'Órdenes de Compra',
  fieldNotes: 'Minutas de Obra',
  photoLog: 'Bitácora Fotográfica',
  inspections: 'Inspecciones',
  templates: 'Templates de Proyecto',
};

/* ===== NAVIGATION GROUPS (collapsible sidebar) ===== */

/** Navigation groups for collapsible sidebar */
export interface NavGroupItem {
  id: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavGroupItem[];
  defaultOpen?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    icon: '📊',
    defaultOpen: true,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'profile', label: 'Mi Perfil', icon: '👤' },
    ],
  },
  {
    id: 'projects',
    label: 'Proyectos',
    icon: '📁',
    defaultOpen: true,
    items: [
      { id: 'projects', label: 'Proyectos', icon: '📁' },
      { id: 'tasks', label: 'Tareas', icon: '✅' },
      { id: 'gantt', label: 'Cronograma', icon: '🗓️' },
      { id: 'timeTracking', label: 'Time Tracking', icon: '⏱️' },
    ],
  },
  {
    id: 'finances',
    label: 'Finanzas',
    icon: '💰',
    defaultOpen: true,
    items: [
      { id: 'budget', label: 'Presupuestos', icon: '💰' },
      { id: 'quotations', label: 'Cotizaciones', icon: '📋' },
      { id: 'invoices', label: 'Facturación', icon: '🧾' },
      { id: 'purchaseOrders', label: 'Órdenes de Compra', icon: '🛒' },
    ],
  },
  {
    id: 'field',
    label: 'Obra / Campo',
    icon: '🏗️',
    items: [
      { id: 'obra', label: 'Seguimiento Obra', icon: '🏗️' },
      { id: 'fieldNotes', label: 'Minutas de Obra', icon: '📝' },
      { id: 'photoLog', label: 'Bitácora Fotográfica', icon: '📸' },
      { id: 'inspections', label: 'Inspecciones', icon: '🔍' },
    ],
  },
  {
    id: 'operations',
    label: 'Operaciones',
    icon: '📦',
    items: [
      { id: 'inventory', label: 'Inventario', icon: '📦' },
      { id: 'suppliers', label: 'Proveedores', icon: '🏪' },
      { id: 'companies', label: 'Empresas', icon: '🏢' },
    ],
  },
  {
    id: 'communication',
    label: 'Comunicación',
    icon: '💬',
    items: [
      { id: 'chat', label: 'Chat', icon: '💬' },
      { id: 'calendar', label: 'Calendario', icon: '📅' },
      { id: 'portal', label: 'Portal Cliente', icon: '🤝' },
    ],
  },
  {
    id: 'tools',
    label: 'Herramientas',
    icon: '🛠️',
    items: [
      { id: 'files', label: 'Archivos', icon: '📂' },
      { id: 'gallery', label: 'Galería', icon: '🖼️' },
      { id: 'reports', label: 'Reportes', icon: '📈' },
      { id: 'templates', label: 'Templates', icon: '📐' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: '⚙️',
    items: [
      { id: 'team', label: 'Equipo', icon: '👥' },
      { id: 'settings', label: 'Configuración', icon: '🎨' },
      { id: 'admin', label: 'Admin', icon: '⚙️' },
    ],
  },
];
