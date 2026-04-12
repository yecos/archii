/* ===== ARCHIFLOW HELPERS ===== */

export const fmtCOP = (n: number) => { if (!n) return '$0'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; return '$' + Number(n).toLocaleString('es-CO'); };
export const fmtDate = (ts: any) => { if (!ts) return '—'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const fmtSize = (b: number) => { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };
export const fmtRecTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`; };
export const getInitials = (n: string) => n ? n.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?';
export const fileIcon = (type: string) => { if (type?.startsWith('image/')) return '🖼️'; if (type?.includes('pdf')) return '📄'; if (type?.startsWith('audio/')) return '🎵'; if (type?.startsWith('video/')) return '🎬'; if (type?.includes('word') || type?.includes('document')) return '📝'; if (type?.includes('sheet') || type?.includes('excel')) return '📊'; if (type?.includes('zip') || type?.includes('rar')) return '📦'; return '📎'; };
export const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });

// ===== COLOR HELPERS =====
export const avatarColors = [
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
];

export const avatarColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};

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

// ===== GANTT HELPERS =====
export const GANTT_DAYS = 14;
export const GANTT_DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const GANTT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'Por hacer': { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  'En progreso': { label: 'En Progreso', color: '#3b82f6', bg: '#eff6ff' },
  'Revision': { label: 'Revisión', color: '#8b5cf6', bg: '#f5f3ff' },
  'Completado': { label: 'Completado', color: '#10b981', bg: '#ecfdf5' },
};
export const GANTT_PRIO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  'Baja': { label: 'Baja', bg: '#f1f5f9', color: '#475569' },
  'Media': { label: 'Media', bg: '#e0f2fe', color: '#0369a1' },
  'Alta': { label: 'Alta', bg: '#ffedd5', color: '#c2410c' },
};

// REACTION_EMOJIS moved to constants.ts
