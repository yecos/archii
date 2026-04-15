import type { Project } from '@/lib/types';

/* ===== TYPES ===== */

export type FileSource = 'local' | 'onedrive' | 'gallery';
export type FileCategory = 'todos' | 'documentos' | 'imagenes' | 'planos' | 'otros';
export type SortKey = 'nombre' | 'fecha' | 'tamano';
export type ViewMode = 'grid' | 'list';

export interface UnifiedFile {
  id: string;
  name: string;
  source: FileSource;
  category: FileCategory;
  size: number;
  date: any;
  projectName: string;
  projectId: string;
  url: string;
  mimeType?: string;
  thumbnailUrl?: string;
  caption?: string;
}

/* ===== CONSTANTS ===== */

export const FILE_CATEGORY_TABS: { key: FileCategory; label: string; icon: string }[] = [
  { key: 'todos', label: 'Todos', icon: '📂' },
  { key: 'documentos', label: 'Documentos', icon: '📄' },
  { key: 'imagenes', label: 'Imágenes', icon: '🖼️' },
  { key: 'planos', label: 'Planos', icon: '📐' },
  { key: 'otros', label: 'Otros', icon: '📎' },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'tamano', label: 'Tamaño' },
];

/* ===== HELPERS ===== */

export function getFileCategory(fileName: string, mimeType?: string): FileCategory {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mt = (mimeType || '').toLowerCase();

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'heic'];
  const planosExts = ['dwg', 'dxf', 'skp', 'plt', 'hpGL', '3dm', 'rvt', 'ifc'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods'];

  if (imageExts.includes(ext) || mt.includes('image')) return 'imagenes';
  if (planosExts.includes(ext) || mt.includes('dwg') || mt.includes('dxf')) return 'planos';
  if (docExts.includes(ext) || mt.includes('pdf') || mt.includes('word') || mt.includes('sheet') || mt.includes('document') || mt.includes('presentation') || mt.includes('csv')) return 'documentos';
  return 'otros';
}

export function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
}
