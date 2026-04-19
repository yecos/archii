/**
 * types.ts
 * Todas las interfaces, constantes y configuraciones del proyecto.
 * Extraído de page.tsx para modularización.
 */

/* ===== INTERFACES ===== */

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface TeamUser {
  id: string;
  data: {
    name: string;
    email: string;
    role?: string;
    photoURL?: string;
    companyId?: string;
  };
}

export interface Project {
  id: string;
  data: {
    name: string;
    status: string;
    client: string;
    location: string;
    budget: number;
    description: string;
    startDate: string;
    endDate: string;
    progress: number;
    companyId?: string;
    createdAt: any;
    updatedAt?: any;
    createdBy?: string;
  };
}

export interface Task {
  id: string;
  data: {
    title: string;
    projectId: string;
    assigneeId: string;
    priority: string;
    status: string;
    dueDate: string;
    createdAt: any;
    createdBy?: string;
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
    createdAt: any;
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
    createdAt: any;
  };
}

export interface Approval {
  id: string;
  data: {
    title: string;
    description: string;
    status: string;
    createdAt: any;
  };
}

export interface WorkPhase {
  id: string;
  data: {
    name: string;
    description: string;
    status: string;
    order: number;
    startDate: string;
    endDate: string;
    createdAt: any;
  };
}

export interface DailyLog {
  id: string;
  data: {
    projectId: string;
    date: string; // YYYY-MM-DD format
    weather: string; // 'Soleado', 'Nublado', 'Lluvioso', 'Parcialmente nublado', 'Tormenta'
    temperature: number; // Celsius
    activities: string[]; // Array of activity descriptions
    laborCount: number; // Number of workers
    equipment: string[]; // Equipment used
    materials: string[]; // Materials used/consumed
    observations: string; // General observations/notes
    photos: string[]; // Base64 photo strings
    supervisor: string; // Supervisor name
    createdBy: string; // User UID
    createdAt: any;
    updatedAt?: any;
  };
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: any;
}

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  webUrl: string;
  createdDateTime: string;
  '@microsoft.graph.downloadUrl'?: string;
}

export interface GalleryPhoto {
  id: string;
  data: {
    projectId: string;
    categoryName: string;
    caption: string;
    imageData: string;
    createdAt: any;
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
    createdAt: any;
    createdBy: string;
    updatedAt?: any;
  };
}

export interface InvCategory {
  id: string;
  data: {
    name: string;
    color: string;
    description: string;
    createdAt: any;
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
    createdAt: any;
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
    status: string;
    date: string;
    notes: string;
    createdAt: any;
    createdBy: string;
    completedAt?: any;
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
    createdAt: any;
  };
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
    duration: number; // minutos
    billable: boolean;
    rate: number; // COP/hora
    date: string;
    createdAt: any;
    updatedAt?: any;
  };
}

export interface Invoice {
  id: string;
  data: {
    projectId: string;
    projectName: string;
    clientName: string;
    number: string;
    status: 'Borrador' | 'Enviada' | 'Pagada' | 'Vencida' | 'Cancelada';
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    notes: string;
    issueDate: string;
    dueDate: string;
    paidDate?: string;
    createdAt: any;
    createdBy: string;
  };
}

export interface InvoiceItem {
  concept: string;
  phase: string;
  hours: number;
  rate: number;
  amount: number;
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
    createdAt: any;
    updatedAt?: any;
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
  { id: 'calendar', icon: '📅', label: 'Calendario' },
  { id: 'portal', label: 'Portal Cliente', icon: '🤝' },
  { id: 'gallery', icon: '📸', label: 'Galería' },
  { id: 'inventory', icon: '📦', label: 'Inventario' },
  { id: 'reports', icon: '📈', label: 'Reportes' },
  { id: 'admin', icon: '⚙️', label: 'Admin' },
  { id: 'superAdmin', icon: '🛡️', label: 'Super Admin' },
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
  calendar: 'Calendario',
  portal: 'Portal Cliente',
  gallery: 'Galería de Fotos',
  inventory: 'Inventario',
  reports: 'Reportes',
  admin: 'Panel de Administración',
  superAdmin: 'Super Administrador',
};
