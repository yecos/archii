import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ===== ARCHIFLOW HELPERS ===== */

export const fmtCOP = (n: number) => { if (!n) return '$0'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; return '$' + Number(n).toLocaleString('es-CO'); };
export const fmtDate = (ts: any) => { if (!ts) return '—'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const fmtSize = (b: number) => { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };
export const getInitials = (n: string) => n ? n.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?';
export const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
export const fileIcon = (type: string) => { if (type?.startsWith('image/')) return '🖼️'; if (type?.includes('pdf')) return '📄'; if (type?.startsWith('audio/')) return '🎵'; if (type?.startsWith('video/')) return '🎬'; if (type?.includes('word') || type?.includes('document')) return '📝'; if (type?.includes('sheet') || type?.includes('excel')) return '📊'; if (type?.includes('zip') || type?.includes('rar')) return '📦'; return '📎'; };
export const fmtRecTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`; };
