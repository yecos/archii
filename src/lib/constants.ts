/* ===== ARCHIFLOW CONSTANTS ===== */

import type { Task, WorkPhase } from './types';

// Project phases
export const PROJECT_PHASES = [
  { group: 'Diseño', phases: ['Conceptualización', 'Anteproyecto', 'Proyecto', 'Interiorismo'] },
  { group: 'Construcción', phases: ['Preliminares', 'Demoliciones', 'Excavaciones', 'Fundaciones', 'Estructura', 'Redes', 'Obra gris', 'Acabados', 'Carpintería', 'Mobiliario'] },
] as const;
export const PHASE_GROUP_ICONS: Record<string, string> = { 'Diseño': '📐', 'Construcción': '🏗️' };
export const ALL_PHASE_NAMES = PROJECT_PHASES.flatMap(g => g.phases);

// Categories
export const EXPENSE_CATS = ['Materiales', 'Mano de obra', 'Mobiliario', 'Acabados', 'Imprevistos'];
export const SUPPLIER_CATS = ['Materiales', 'Mobiliario', 'Iluminación', 'Acabados', 'Eléctrico', 'Plomería', 'Otro'];
export const PHOTO_CATS = ['Fachada', 'Interior', 'Obra', 'Planos', 'Renders', 'Otro'];
export const INV_UNITS = ['Unidad', 'Metro', 'Metro²', 'Metro³', 'Kilogramo', 'Litro', 'Galon', 'Rollo', 'Saco', 'Caja', 'Paquete', 'Pieza', 'Par', 'Set', 'Otro'] as const;
export const INV_WAREHOUSES = ['Almacén Principal', 'Obra en Curso', 'Bodega Reserva'] as const;
export const TRANSFER_STATUSES = ['Pendiente', 'En tránsito', 'Completada', 'Cancelada'] as const;
export const CAT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1'];

// Users & Roles
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
  Admin: '👑', Director: '🎯', Arquitecto: '📐', Interventor: '🔍',
  Contratista: '🏗️', Cliente: '🤝', Miembro: '👤',
};

// Calendar
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Meeting types
export const MEETING_TYPES = ['Reunión de obra', 'Comité técnico', 'Reunión con cliente', 'Otra'];
export const MEETING_STATUSES = ['Programada', 'Realizada', 'Cancelada'];
export const PARTICIPANT_ROLES = ['Asistente', 'Moderador', 'Secretario'];

// Work log weather
export const WEATHER_OPTIONS = [
  { value: 'Soleado', icon: '☀️', label: 'Soleado' },
  { value: 'Nublado', icon: '☁️', label: 'Nublado' },
  { value: 'Lluvioso', icon: '🌧️', label: 'Lluvioso' },
  { value: 'Parcial', icon: '⛅', label: 'Parcialmente nublado' },
  { value: 'Tormenta', icon: '⛈️', label: 'Tormenta' },
];

// Signature roles for work logs
export const SIGNATURE_ROLES = ['Supervisor de obra', 'Interventor', 'Residente'];

// Avatar colors
export const avatarColors = [
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
];

// ===== COLOR HELPERS =====

export const statusColor = (s: string) => ({
  Concepto: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]',
  Diseno: 'bg-blue-500/10 text-blue-400',
  Ejecucion: 'bg-amber-500/10 text-amber-400',
  Terminado: 'bg-emerald-500/10 text-emerald-400',
}[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');

export const prioColor = (p: string) => ({
  Alta: 'bg-red-500/10 text-red-400',
  Media: 'bg-amber-500/10 text-amber-400',
  Baja: 'bg-emerald-500/10 text-emerald-400',
}[p] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');

export const taskStColor = (s: string) => ({
  'Por hacer': 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]',
  'En progreso': 'bg-blue-500/10 text-blue-400',
  Revision: 'bg-amber-500/10 text-amber-400',
  Completado: 'bg-emerald-500/10 text-emerald-400',
}[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');

export const avatarColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};
