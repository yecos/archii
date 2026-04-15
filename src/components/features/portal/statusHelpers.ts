/* ===== STATUS HELPERS ===== */

export const projectStatusColor = (s: string): string =>
  ({
    Concepto: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    Anteproyecto: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    Proyecto: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'En ejecución': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Entrega: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    Pausado: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Completado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Cancelado: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]');

export const invoiceStatusColor = (s: string): string =>
  ({
    Borrador: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]',
    Enviada: 'bg-blue-500/10 text-blue-400',
    Pagada: 'bg-emerald-500/10 text-emerald-400',
    Vencida: 'bg-red-500/10 text-red-400',
    Cancelada: 'bg-red-500/5 text-red-300 line-through',
  }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');

export const progressColor = (p: number): string =>
  p >= 80 ? 'bg-emerald-500' : p >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500';

/* ===== TYPES ===== */

export type PortalTab = 'overview' | 'project-detail';
export type DetailTab = 'resumen' | 'fotos' | 'facturas' | 'actividad';
