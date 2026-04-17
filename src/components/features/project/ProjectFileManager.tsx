'use client';
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, Sparkles, Check, AlertCircle, Loader2, FileText, FolderOpen, ChevronRight, X, RotateCcw, CloudUpload } from 'lucide-react';

/* ===== Types ===== */

export interface FileClassification {
  originalName: string;
  suggestedName: string;
  category: string;
  subcategory: string;
  phaseId: string | null;
  phaseName: string | null;
  processId: string | null;
  processName: string | null;
  tags: string[];
  description: string;
  confidence: number;
}

interface QueuedFile {
  id: string;
  file: File;
  classification: FileClassification | null;
  status: 'pending' | 'classifying' | 'classified' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  uploadProgress: number;
}

interface PhaseOption {
  id: string;
  name: string;
  processes: { id: string; name: string }[];
}

interface ProjectFileManagerProps {
  projectId: string;
  projectName: string;
  phases: PhaseOption[];
  authToken: string;
  onFilesUploaded?: (results: FileClassification[]) => void;
  msAccessToken?: string | null;
  oneDriveFolderId?: string | null;
}

/* ===== Constants ===== */

const CATEGORY_ICONS: Record<string, string> = {
  planos: '📐',
  fotos: '📸',
  contratos: '📄',
  presupuestos: '💰',
  permisos: '📋',
  documentos: '📝',
  otros: '📎',
};

const CATEGORY_COLORS: Record<string, string> = {
  planos: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  fotos: 'text-green-400 bg-green-500/10 border-green-500/20',
  contratos: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  presupuestos: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  permisos: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  documentos: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  otros: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

/* ===== Main Component ===== */

export default function ProjectFileManager({
  projectId,
  projectName,
  phases,
  authToken,
  onFilesUploaded,
  msAccessToken,
  oneDriveFolderId,
}: ProjectFileManagerProps) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build phase lookup
  const phaseMap = useMemo(() => {
    const map = new Map<string, { name: string; processes: Map<string, string> }>();
    for (const p of phases) {
      const procMap = new Map<string, string>();
      for (const proc of p.processes) procMap.set(proc.id, proc.name);
      map.set(p.id, { name: p.name, processes: procMap });
    }
    return map;
  }, [phases]);

  // Phase/process resolver
  const resolvePhaseName = useCallback((phaseId: string | null) => {
    if (!phaseId) return null;
    return phaseMap.get(phaseId)?.name || null;
  }, [phaseMap]);

  const resolveProcessName = useCallback((phaseId: string | null, processId: string | null) => {
    if (!phaseId || !processId) return null;
    return phaseMap.get(phaseId)?.processes.get(processId) || null;
  }, [phaseMap]);

  // Add files to queue
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const queued: QueuedFile[] = Array.from(newFiles).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      classification: null,
      status: 'pending',
      uploadProgress: 0,
    }));
    setFiles(prev => [...prev, ...queued]);
    setShowResults(false);
  }, []);

  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setShowResults(false);
  }, []);

  // Classify all files with AI
  const classifyFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setIsClassifying(true);

    // Mark all pending as classifying
    setFiles(prev => prev.map(f =>
      (f.status === 'pending' || f.status === 'error') ? { ...f, status: 'classifying' as const } : f
    ));

    try {
      const response = await fetch('/api/ai-file-classifier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          files: pendingFiles.map(f => ({
            name: f.file.name,
            type: f.file.type,
            size: f.file.size,
          })),
          projectPhases: phases.map(p => ({
            id: p.id,
            name: p.name,
            processes: p.processes.map(pr => ({ id: pr.id, name: pr.name })),
          })),
          projectName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const results: FileClassification[] = data.results || [];

      // Resolve phase/process names from IDs
      const resolvedResults = results.map(r => ({
        ...r,
        phaseName: resolvePhaseName(r.phaseId),
        processName: resolveProcessName(r.phaseId, r.processId),
      }));

      // Update files with classification
      const resultMap = new Map(resolvedResults.map((r, i) => [pendingFiles[i].id, r]));
      setFiles(prev => prev.map(f => {
        const result = resultMap.get(f.id);
        if (result) {
          return { ...f, classification: result, status: 'classified' as const };
        }
        return f;
      }));

      setShowResults(true);
    } catch (err) {
      console.error('[FileManager] Classification failed:', err);
      setFiles(prev => prev.map(f =>
        f.status === 'classifying' ? { ...f, status: 'error' as const, error: 'Error de clasificación' } : f
      ));
    } finally {
      setIsClassifying(false);
    }
  }, [files, phases, projectName, authToken, resolvePhaseName, resolveProcessName]);

  // Upload files to OneDrive
  const uploadFiles = useCallback(async () => {
    const classified = files.filter(f => f.status === 'classified' && f.classification);
    if (classified.length === 0) return;

    if (!msAccessToken || !oneDriveFolderId) {
      // Upload without OneDrive — just save metadata
      const results = classified.map(f => f.classification!);
      setFiles(prev => prev.map(f =>
        classified.some(c => c.id === f.id) ? { ...f, status: 'uploaded' as const, uploadProgress: 100 } : f
      ));
      onFilesUploaded?.(results);
      return;
    }

    // Upload each file sequentially
    for (const queuedFile of classified) {
      try {
        setFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'uploading' as const, uploadProgress: 0 } : f
        ));

        const classification = queuedFile.classification!;
        // Determine subfolder based on category
        const subfolder = classification.subcategory || classification.category;

        // Upload to OneDrive
        const formData = new FormData();
        formData.append('file', queuedFile.file);
        formData.append('folderId', oneDriveFolderId);
        formData.append('projectId', projectId);
        formData.append('fileName', classification.suggestedName);

        // Simulate progress
        for (let p = 0; p <= 90; p += 30) {
          await new Promise(r => setTimeout(r, 200));
          setFiles(prev => prev.map(f =>
            f.id === queuedFile.id ? { ...f, uploadProgress: p } : f
          ));
        }

        const res = await fetch('/api/onedrive/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${msAccessToken}` },
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');

        setFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'uploaded' as const, uploadProgress: 100 } : f
        ));
      } catch (err) {
        console.error('[FileManager] Upload failed for', queuedFile.file.name, err);
        setFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'error' as const, error: 'Error al subir' } : f
        ));
      }
    }

    const results = classified.map(f => f.classification!);
    onFilesUploaded?.(results);
  }, [files, msAccessToken, oneDriveFolderId, projectId, onFilesUploaded]);

  // Stats
  const stats = useMemo(() => {
    const total = files.length;
    const classified = files.filter(f => f.status === 'classified').length;
    const uploaded = files.filter(f => f.status === 'uploaded').length;
    const errors = files.filter(f => f.status === 'error').length;
    return { total, classified, uploaded, errors };
  }, [files]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Asistente IA de Archivos</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">Clasifica, renombra y organiza automaticamente</div>
          </div>
        </div>
        {files.length > 0 && (
          <button onClick={clearFiles} className="text-[11px] text-[var(--muted-foreground)] hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-1">
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : 'border-[var(--border)] hover:border-emerald-400/50 hover:bg-emerald-500/5'
        } p-8 text-center`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-emerald-500/20' : 'bg-[var(--af-bg3)]'}`}>
            <Upload className={`w-5 h-5 ${isDragging ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`} />
          </div>
          <div>
            <div className="text-sm font-medium">
              {isDragging ? 'Suelta los archivos aqui' : 'Arrastra archivos o haz clic para seleccionar'}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
              Soporta imagenes, planos, PDFs, documentos y mas
            </div>
          </div>
        </div>
      </div>

      {/* File Queue */}
      {files.length > 0 && !showResults && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--muted-foreground)]">{files.length} archivo(s) en cola</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--af-bg3)]/50">
                <FileText className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                <span className="text-[12px] flex-1 truncate">{f.file.name}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{(f.file.size / 1024).toFixed(0)} KB</span>
                {f.status === 'classifying' && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                {f.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {f.status === 'pending' && (
                  <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer bg-transparent border-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Classify Button */}
          <button
            onClick={classifyFiles}
            disabled={isClassifying || files.filter(f => f.status === 'pending' || f.status === 'error').length === 0}
            className={`w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border-none ${
              isClassifying
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
            }`}
          >
            {isClassifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando con IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Clasificar con IA ({files.filter(f => f.status === 'pending' || f.status === 'error').length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          {/* Results Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-[12px] font-medium">Clasificacion completada</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {stats.classified} archivos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowResults(false)} className="text-[11px] px-2.5 py-1 rounded-lg skeuo-btn cursor-pointer flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reclasificar
              </button>
            </div>
          </div>

          {/* Classification Results */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {files.filter(f => f.classification).map(f => {
              const c = f.classification!;
              const catColor = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.otros;
              const catIcon = CATEGORY_ICONS[c.category] || '📎';

              return (
                <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2 animate-fadeIn" style={{ animationDuration: '0.2s' }}>
                  {/* File header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-sm">
                      {catIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[var(--muted-foreground)] truncate">{f.file.name}</div>
                      <div className="text-[12px] font-medium truncate text-emerald-400">{c.suggestedName}</div>
                    </div>
                    {/* Status indicator */}
                    {f.status === 'uploaded' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />}
                    {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  </div>

                  {/* Upload progress */}
                  {f.status === 'uploading' && (
                    <div className="w-full bg-[var(--border)] rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${f.uploadProgress}%` }} />
                    </div>
                  )}

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor}`}>
                      {catIcon} {c.category}
                    </span>
                    {c.subcategory && c.subcategory !== 'general' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[var(--af-bg3)] text-[var(--muted-foreground)] border border-[var(--border)]">
                        {c.subcategory}
                      </span>
                    )}
                    {c.phaseName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <FolderOpen className="w-2.5 h-2.5" /> {c.phaseName}
                      </span>
                    )}
                    {c.processName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/5 text-amber-300/70 border border-amber-500/10">
                        <ChevronRight className="w-2.5 h-2.5" /> {c.processName}
                      </span>
                    )}
                    {/* Confidence */}
                    <span className={`text-[9px] ml-auto ${c.confidence > 0.7 ? 'text-emerald-400' : c.confidence > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(c.confidence * 100)}% confianza
                    </span>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <div className="text-[11px] text-[var(--af-text3)] leading-relaxed">{c.description}</div>
                  )}

                  {/* Tags */}
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {c.tags.map((tag, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--af-bg3)] text-[var(--muted-foreground)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upload Button */}
          {stats.classified > 0 && stats.uploaded < stats.classified && (
            <button
              onClick={uploadFiles}
              disabled={files.some(f => f.status === 'uploading')}
              className={`w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border-none ${
                files.some(f => f.status === 'uploading')
                  ? 'bg-[#0078d4]/20 text-[#0078d4]'
                  : 'bg-[#0078d4] text-white hover:bg-[#006cbd] active:scale-[0.98]'
              }`}
            >
              {files.some(f => f.status === 'uploading') ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Subir a OneDrive ({stats.classified - stats.uploaded} archivos)
                </>
              )}
            </button>
          )}

          {/* All uploaded */}
          {stats.uploaded > 0 && stats.uploaded === stats.classified && (
            <div className="text-center py-3 text-[12px] text-emerald-400 font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              {stats.uploaded} archivo(s) subidos exitosamente
            </div>
          )}
        </div>
      )}
    </div>
  );
}
