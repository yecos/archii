'use client';
import { FileText, Image, FileSpreadsheet, File, Ruler } from 'lucide-react';

interface FileIconProps {
  fileName: string;
  mimeType?: string;
  size?: number;
}

export function FileIcon({ fileName, mimeType, size = 18 }: FileIconProps) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mt = (mimeType || '').toLowerCase();

  if (mt.includes('pdf') || ext === 'pdf') return <FileText size={size} className="text-red-400" />;
  if (mt.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'heic'].includes(ext))
    return <Image size={size} className="text-emerald-400" />;
  if (mt.includes('sheet') || mt.includes('excel') || mt.includes('csv') || ['xls', 'xlsx', 'csv'].includes(ext))
    return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (mt.includes('word') || mt.includes('document') || ['doc', 'docx', 'rtf', 'odt'].includes(ext))
    return <FileText size={size} className="text-blue-400" />;
  if (['dwg', 'dxf', 'skp', 'plt', 'rvt', 'ifc'].includes(ext) || mt.includes('dwg') || mt.includes('dxf'))
    return <Ruler size={size} className="text-amber-400" />;
  return <File size={size} className="text-[var(--muted-foreground)]" />;
}
