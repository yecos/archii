'use client';
import React, { useState, useRef, useCallback } from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { importProjects, importTasks, importExpenses, downloadTemplate } from '@/lib/import-data';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X, ArrowLeft, Loader2 } from 'lucide-react';

type ImportType = 'projects' | 'tasks' | 'expenses';
type Step = 'select' | 'upload' | 'preview' | 'result';

const TYPE_LABELS: Record<ImportType, string> = {
  projects: 'Proyectos',
  tasks: 'Tareas',
  expenses: 'Gastos',
};

const TYPE_ICONS: Record<ImportType, string> = {
  projects: '📁',
  tasks: '✅',
  expenses: '💰',
};

const TYPE_COLUMNS: Record<ImportType, string[]> = {
  projects: ['Nombre', 'Estado', 'Cliente', 'Ubicación', 'Presupuesto', 'Descripción', 'Fecha Inicio', 'Fecha Fin'],
  tasks: ['Título', 'Proyecto', 'Asignado a', 'Prioridad', 'Estado', 'Fecha Límite', 'Descripción'],
  expenses: ['Concepto', 'Proyecto', 'Categoría', 'Monto', 'Fecha'],
};

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImportDataModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: ImportType;
}

export default function ImportDataModal({ open, onClose, defaultType }: ImportDataModalProps) {
  const { showToast } = useUI();
  const { teamUsers } = useAuth();
  const { projects } = useFirestore();

  const [step, setStep] = useState<Step>('select');
  const [importType, setImportType] = useState<ImportType>(defaultType || 'projects');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setFile(null);
    setPreviewData([]);
    setPreviewHeaders([]);
    setImporting(false);
    setResult(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSelectType = useCallback((type: ImportType) => {
    setImportType(type);
    setStep('upload');
  }, []);

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Formato no válido. Usa archivos .xlsx, .xls o .csv';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'El archivo supera el límite de 5 MB';
    }
    return null;
  }, []);

  const processFile = useCallback(async (f: File) => {
    const error = validateFile(f);
    if (error) {
      showToast(error, 'error');
      return;
    }

    setFile(f);
    setImporting(true);

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await f.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const wsName = wb.SheetNames[0];
      if (!wsName) {
        showToast('El archivo no contiene hojas de cálculo', 'error');
        setImporting(false);
        return;
      }
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      if (data.length === 0) {
        showToast('El archivo está vacío o no tiene datos válidos', 'error');
        setImporting(false);
        return;
      }

      const headers = Object.keys(data[0]);
      setPreviewHeaders(headers);
      setPreviewData(data.slice(0, 5));
      setStep('preview');
    } catch (err: any) {
      showToast('Error al leer el archivo: ' + (err?.message || 'Error desconocido'), 'error');
    } finally {
      setImporting(false);
    }
  }, [validateFile, showToast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setImporting(true);
    try {
      let res: { imported: number; errors: string[] };
      switch (importType) {
        case 'projects':
          res = await importProjects(file, teamUsers);
          break;
        case 'tasks':
          res = await importTasks(file, projects, teamUsers);
          break;
        case 'expenses':
          res = await importExpenses(file, projects);
          break;
      }
      setResult(res);
      setStep('result');
      if (res.imported > 0) {
        showToast(`✅ ${res.imported} ${TYPE_LABELS[importType].toLowerCase()} importados correctamente`);
      }
      if (res.errors.length > 0) {
        showToast(`⚠️ ${res.errors.length} errores encontrados`, 'warning');
      }
    } catch (err: any) {
      showToast('Error al importar: ' + (err?.message || 'Error desconocido'), 'error');
    } finally {
      setImporting(false);
    }
  }, [file, importType, teamUsers, projects, showToast]);

  const handleDownloadTemplate = useCallback(async (type: ImportType) => {
    try {
      await downloadTemplate(type);
      showToast('Plantilla descargada');
    } catch (err) {
      console.error('[ArchiFlow] ImportData: download template failed:', err);
      showToast('Error al descargar la plantilla', 'error');
    }
  }, [showToast]);

  /* ===== RENDER ===== */

  return (
    <CenterModal open={open} onClose={handleClose} maxWidth={580}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {step !== 'select' && (
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent transition-colors"
              onClick={() => step === 'upload' ? setStep('select') : step === 'preview' ? setStep('upload') : setStep('select')}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h2 className="text-lg font-semibold">
            📥 Importar datos
            {step !== 'select' && (
              <span className="text-sm font-normal text-[var(--muted-foreground)] ml-2">
                — {TYPE_LABELS[importType]}
              </span>
            )}
          </h2>
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent transition-colors"
          onClick={handleClose}
        >
          <X size={16} />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-5">
        {(['select', 'upload', 'preview', 'result'] as Step[]).map((s, i) => {
          const stepOrder = ['select', 'upload', 'preview', 'result'];
          const currentIdx = stepOrder.indexOf(step);
          const isActive = s === step;
          const isDone = stepOrder.indexOf(s) < currentIdx;
          const labels = ['Tipo', 'Archivo', 'Vista previa', 'Resultado'];
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className={`flex-1 h-0.5 rounded ${isDone ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />}
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold transition-colors ${
                isActive ? 'bg-[var(--af-accent)] text-background' :
                isDone ? 'bg-[var(--af-accent)]/20 text-[var(--af-accent)]' :
                'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
              }`} title={labels[i]}>
                {isDone ? '✓' : i + 1}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step: Select Type */}
      {step === 'select' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Selecciona el tipo de dato que deseas importar:</p>
          {(['projects', 'tasks', 'expenses'] as ImportType[]).map(type => (
            <button
              key={type}
              className="w-full flex items-center gap-3 p-4 bg-[var(--af-bg3)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/30 hover:bg-[var(--af-bg4)] transition-all text-left"
              onClick={() => handleSelectType(type)}
            >
              <span className="text-2xl">{TYPE_ICONS[type]}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{TYPE_LABELS[type]}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Columnas: {TYPE_COLUMNS[type].join(', ')}
                </div>
              </div>
              <FileSpreadsheet size={18} className="text-[var(--af-text3)]" />
            </button>
          ))}
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Sube un archivo Excel o CSV con los datos de {TYPE_LABELS[importType].toLowerCase()}.
          </p>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/5'
                : 'border-[var(--border)] hover:border-[var(--af-accent)]/40 hover:bg-[var(--af-bg4)]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`} />
            <div className="text-sm font-medium">
              {dragOver ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí o haz clic para seleccionar'}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              Formatos aceptados: .xlsx, .xls, .csv (máx. 5 MB)
            </div>
          </div>

          {/* Template download */}
          <div className="flex items-center gap-2 p-3 bg-[var(--af-bg3)] rounded-lg border border-[var(--border)]">
            <Download size={16} className="text-[var(--af-accent)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">¿No tienes un archivo?</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Descarga una plantilla de ejemplo con el formato correcto</div>
            </div>
            <button
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-accent)] text-background cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none font-medium whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(importType); }}
            >
              Descargar plantilla
            </button>
          </div>

          {/* Required columns */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Columnas requeridas:</div>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_COLUMNS[importType].map(col => (
                <span key={col} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] border border-[var(--border)]">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{file?.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                {' · Vista previa (primeras 5 filas)'}
              </p>
            </div>
            <button
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--af-bg3)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors border border-[var(--border)] font-medium"
              onClick={() => { setFile(null); setPreviewData([]); setStep('upload'); }}
            >
              Cambiar archivo
            </button>
          </div>

          {/* Preview table */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--af-bg3)]">
                    <th className="px-2.5 py-2 text-left text-[var(--muted-foreground)] font-semibold sticky left-0 bg-[var(--af-bg3)] z-10">#</th>
                    {previewHeaders.map(h => (
                      <th key={h} className="px-2.5 py-2 text-left text-[var(--muted-foreground)] font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="border-t border-[var(--border)] hover:bg-[var(--af-bg4)]/50">
                      <td className="px-2.5 py-1.5 text-[var(--muted-foreground)] sticky left-0 bg-[var(--card)] z-10">{idx + 1}</td>
                      {previewHeaders.map(h => (
                        <td key={h} className="px-2.5 py-1.5 text-[var(--foreground)] whitespace-nowrap max-w-[150px] truncate" title={String(row[h])}>
                          {String(row[h] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 bg-[var(--af-accent)] text-background px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Importar {TYPE_LABELS[importType].toLowerCase()}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-[var(--af-bg3)] border border-[var(--border)] rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <div>
              <div className="text-lg font-bold">
                {result.imported} {result.imported === 1 ? 'registro importado' : 'registros importados'}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {TYPE_LABELS[importType]} importados correctamente
              </div>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertCircle size={16} />
                {result.errors.length} {result.errors.length === 1 ? 'advertencia' : 'advertencias'}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-500/20 bg-amber-500/5">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs border-b border-amber-500/10 last:border-0">
                    <span className="text-amber-400 flex-shrink-0 mt-0.5">⚠</span>
                    <span className="text-[var(--foreground)]">{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--af-bg4)] transition-colors"
              onClick={resetState}
            >
              Importar más
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors"
              onClick={handleClose}
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Global loading overlay */}
      {importing && step === 'preview' && (
        <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-3 shadow-xl flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-[var(--af-accent)]" />
            <span className="text-sm font-medium">Procesando...</span>
          </div>
        </div>
      )}
    </CenterModal>
  );
}
