'use client';
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, Sparkles, Check, AlertCircle, Loader2, FileText, FolderOpen, ChevronRight, X, RotateCcw, CloudUpload, HardDrive, AlertTriangle, Info } from 'lucide-react';

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
  status: 'pending' | 'classifying' | 'classified' | 'uploading' | 'uploaded' | 'error' | 'skipped';
  error?: string;
  uploadProgress: number;
  driveItemId?: string;
  driveWebUrl?: string;
  targetFolderId?: string;
  skippedReason?: string;
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

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// File size limits
const MAX_FILE_SIZE = 15 * 1024 * 1024 * 1024;  // 15GB per file (OneDrive API supports up to 250GB)
const WARN_FILE_SIZE = 500 * 1024 * 1024;       // 500MB — show warning (slower upload)
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 * 1024; // 50GB total per batch
const SMALL_UPLOAD_LIMIT = 4 * 1024 * 1024;      // 4MB — simple PUT vs chunked upload
const CHUNK_SIZE = 10 * 1024 * 1024;             // 10MB chunks for large file upload (faster)

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

/* ===== Helpers ===== */

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx !== -1 ? filename.substring(idx).toLowerCase() : '';
}

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
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [folderCache, setFolderCache] = useState<Map<string, string>>(new Map()); // cache folder IDs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const resolvePhaseName = useCallback((phaseId: string | null) => {
    if (!phaseId) return null;
    return phaseMap.get(phaseId)?.name || null;
  }, [phaseMap]);

  const resolveProcessName = useCallback((phaseId: string | null, processId: string | null) => {
    if (!phaseId || !processId) return null;
    return phaseMap.get(phaseId)?.processes.get(processId) || null;
  }, [phaseMap]);

  // ===== ONE DRIVE FOLDER MANAGEMENT =====

  // Ensure a subfolder exists inside the project folder
  const ensureSubFolder = useCallback(async (parentFolderId: string, folderName: string): Promise<string | null> => {
    // Check cache first
    const cacheKey = `${parentFolderId}/${folderName}`;
    const cached = folderCache.get(cacheKey);
    if (cached) return cached;

    if (!msAccessToken) return null;

    try {
      // Check if folder exists
      const listUrl = `${GRAPH_BASE}/me/drive/items/${parentFolderId}/children?$filter=name eq '${encodeURIComponent(folderName)}'`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${msAccessToken}` },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const existing = listData.value?.find((f: { id: string; folder?: unknown }) => f.folder);
        if (existing) {
          setFolderCache(prev => new Map(prev).set(cacheKey, existing.id));
          return existing.id;
        }
      }

      // Create the folder
      const createUrl = `${GRAPH_BASE}/me/drive/items/${parentFolderId}/children`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${msAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });

      if (createRes.ok) {
        const folderData = await createRes.json();
        setFolderCache(prev => new Map(prev).set(cacheKey, folderData.id));
        return folderData.id;
      }

      return null;
    } catch (err) {
      console.error('[FileManager] Error creating subfolder:', err);
      return null;
    }
  }, [msAccessToken, folderCache]);

  // Get or create the target folder for a classified file
  const getTargetFolder = useCallback(async (classification: FileClassification): Promise<string | null> => {
    if (!oneDriveFolderId) return null;

    // Build folder path: ArchiFlow/Proyecto/{category}/{subcategory}
    const categoryFolder = await ensureSubFolder(oneDriveFolderId, classification.category);
    if (!categoryFolder) return oneDriveFolderId; // fallback to project root

    if (classification.subcategory && classification.subcategory !== 'general') {
      const subfolder = await ensureSubFolder(categoryFolder, classification.subcategory);
      return subfolder || categoryFolder;
    }

    return categoryFolder;
  }, [oneDriveFolderId, ensureSubFolder]);

  // ===== DIRECT ONE DRIVE UPLOAD FROM BROWSER =====

  const uploadFileToOneDrive = useCallback(async (
    file: File,
    targetFolderId: string,
    suggestedName: string,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<{ driveItemId: string; driveWebUrl: string } | null> => {
    if (!msAccessToken) return null;

    const encodedName = encodeURIComponent(suggestedName);

    if (file.size < SMALL_UPLOAD_LIMIT) {
      // Simple PUT upload for small files (<4MB)
      const uploadUrl = `${GRAPH_BASE}/me/drive/items/${targetFolderId}:/${encodedName}:/content`;
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${msAccessToken}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      onProgress(100);
      return {
        driveItemId: data.id,
        driveWebUrl: data.webUrl || data['@microsoft.graph.downloadUrl'] || '',
      };
    } else {
      // Large file: create upload session, then chunk upload
      // This bypasses Vercel body limits entirely!
      const sessionUrl = `${GRAPH_BASE}/me/drive/items/${targetFolderId}:/${encodedName}/createUploadSession`;

      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${msAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
          },
        }),
        signal,
      });

      if (!sessionRes.ok) {
        const errText = await sessionRes.text().catch(() => 'Unknown error');
        throw new Error(`Failed to create upload session: ${errText}`);
      }

      const sessionData = await sessionRes.json();
      const uploadUrl: string = sessionData.uploadUrl;

      let offset = 0;
      while (offset < file.size) {
        if (signal?.aborted) throw new Error('Upload cancelled');

        const chunkEnd = Math.min(offset + CHUNK_SIZE, file.size);
        const chunkLength = chunkEnd - offset;
        const chunk = file.slice(offset, chunkEnd);

        const chunkRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': String(chunkLength),
            'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${file.size}`,
          },
          body: chunk,
          signal,
        });

        if (chunkRes.status === 401) {
          throw new Error('Token expirado durante la carga');
        }

        if (chunkRes.status === 429) {
          // Throttled — wait and retry
          const retryAfter = chunkRes.headers.get('Retry-After') || '3';
          await new Promise(r => setTimeout(r, Number(retryAfter) * 1000));
          continue; // Retry same chunk
        }

        if (!chunkRes.ok && chunkRes.status !== 202) {
          const errText = await chunkRes.text().catch(() => 'Unknown error');
          throw new Error(`Error en fragmento ${offset}-${chunkEnd}: ${errText}`);
        }

        // Update real progress based on bytes sent
        offset = chunkEnd;
        onProgress(Math.round((offset / file.size) * 100));

        // If 200 or 201, upload is complete
        if (chunkRes.status === 200 || chunkRes.status === 201) {
          const finalData = await chunkRes.json();
          return {
            driveItemId: finalData.id,
            driveWebUrl: finalData.webUrl || '',
          };
        }
        // 202 = more chunks needed, continue loop
      }

      // Shouldn't reach here normally, but just in case
      return {
        driveItemId: sessionData.id || '',
        driveWebUrl: '',
      };
    }
  }, [msAccessToken]);

  // ===== FILE VALIDATION =====

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const valid: QueuedFile[] = [];
    const warnings: string[] = [];

    let totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

    for (const file of fileArray) {
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        warnings.push(`"${file.name}" (${formatSize(file.size)}) excede el limite de ${formatSize(MAX_FILE_SIZE)}`);
        continue;
      }

      if (file.size + totalSize > MAX_TOTAL_SIZE) {
        warnings.push(`No se pueden agregar mas archivos — limite total de ${formatSize(MAX_TOTAL_SIZE)}`);
        break;
      }

      totalSize += file.size;
      valid.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        classification: null,
        status: 'pending',
        uploadProgress: 0,
      });
    }

    // Show warnings for large files
    const largeFiles = valid.filter(f => f.file.size > WARN_FILE_SIZE);
    if (largeFiles.length > 0) {
      const names = largeFiles.map(f => `"${f.file.name}" (${formatSize(f.file.size)})`).join(', ');
      warnings.push(`Archivos grandes (subida lenta): ${names}`);
    }

    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid]);
      setShowResults(false);
    }

    if (warnings.length > 0) {
      setSizeWarning(warnings.join('\n'));
      // Auto-hide after 8 seconds
      setTimeout(() => setSizeWarning(null), 8000);
    }
  }, [files]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setShowResults(false);
    setFolderCache(new Map());
  }, []);

  // ===== AI CLASSIFICATION =====

  const classifyFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setIsClassifying(true);
    setFiles(prev => prev.map(f =>
      (f.status === 'pending' || f.status === 'error') ? { ...f, status: 'classifying' as const } : f
    ));

    try {
      // Classify in batches of 20 (API limit)
      const batchSize = 20;
      const allResults: Map<string, FileClassification> = new Map();

      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        const batch = pendingFiles.slice(i, i + batchSize);

        const response = await fetch('/api/ai-file-classifier', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            files: batch.map(f => ({
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

        // Map results to file IDs
        for (let j = 0; j < batch.length; j++) {
          if (results[j]) {
            const resolved = {
              ...results[j],
              phaseName: resolvePhaseName(results[j].phaseId),
              processName: resolveProcessName(results[j].phaseId, results[j].processId),
            };
            allResults.set(batch[j].id, resolved);
          }
        }
      }

      // Update all files with their classifications
      setFiles(prev => prev.map(f => {
        const result = allResults.get(f.id);
        if (result && (f.status === 'classifying')) {
          return { ...f, classification: result, status: 'classified' as const };
        }
        return f;
      }));

      setShowResults(true);
    } catch (err) {
      console.error('[FileManager] Classification failed:', err);
      setFiles(prev => prev.map(f =>
        f.status === 'classifying' ? { ...f, status: 'error' as const, error: 'Error de clasificacion' } : f
      ));
    } finally {
      setIsClassifying(false);
    }
  }, [files, phases, projectName, authToken, resolvePhaseName, resolveProcessName]);

  // ===== UPLOAD FILES =====

  const uploadFiles = useCallback(async () => {
    const classified = files.filter(f => f.status === 'classified' && f.classification);
    if (classified.length === 0) return;

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    for (const queuedFile of classified) {
      if (signal.aborted) break;

      try {
        setFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'uploading' as const, uploadProgress: 0 } : f
        ));

        const classification = queuedFile.classification!;

        // Determine upload target
        let targetFolderId: string;
        let driveResult: { driveItemId: string; driveWebUrl: string } | null = null;

        if (msAccessToken && oneDriveFolderId) {
          // Create smart subfolder and upload directly to OneDrive
          targetFolderId = (await getTargetFolder(classification)) || oneDriveFolderId;

          driveResult = await uploadFileToOneDrive(
            queuedFile.file,
            targetFolderId,
            classification.suggestedName,
            (progress) => {
              setFiles(prev => prev.map(f =>
                f.id === queuedFile.id ? { ...f, uploadProgress: progress } : f
              ));
            },
            signal
          );
        } else {
          // No OneDrive — mark as skipped
          setFiles(prev => prev.map(f =>
            f.id === queuedFile.id ? { ...f, status: 'skipped' as const, skippedReason: 'OneDrive no conectado' } : f
          ));
          continue;
        }

        if (driveResult) {
          setFiles(prev => prev.map(f =>
            f.id === queuedFile.id
              ? {
                  ...f,
                  status: 'uploaded' as const,
                  uploadProgress: 100,
                  driveItemId: driveResult!.driveItemId,
                  driveWebUrl: driveResult!.driveWebUrl,
                  targetFolderId: targetFolderId,
                }
              : f
          ));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('[FileManager] Upload failed for', queuedFile.file.name, errMsg);
        setFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'error' as const, error: errMsg } : f
        ));
      }
    }

    // Sync metadata to Firestore (lightweight JSON only)
    const uploadedFiles = files.filter(f => f.status === 'uploaded' || f.status === 'classified');
    if (uploadedFiles.length > 0) {
      try {
        const metadataToSync = uploadedFiles.map(f => ({
          driveItemId: f.driveItemId || '',
          driveWebUrl: f.driveWebUrl || '',
          originalName: f.file.name,
          smartName: f.classification?.suggestedName || f.file.name,
          category: f.classification?.category || 'otros',
          subcategory: f.classification?.subcategory || 'general',
          phaseId: f.classification?.phaseId || null,
          phaseName: f.classification?.phaseName || null,
          processId: f.classification?.processId || null,
          processName: f.classification?.processName || null,
          tags: f.classification?.tags || [],
          description: f.classification?.description || '',
          confidence: f.classification?.confidence || 0,
          size: f.file.size,
          mimeType: f.file.type,
          parentFolderId: f.targetFolderId || oneDriveFolderId || '',
        }));

        await fetch('/api/ai-file-manager/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            projectId,
            fileMetadata: metadataToSync,
          }),
        });
      } catch (syncErr) {
        console.error('[FileManager] Metadata sync failed:', syncErr);
        // Non-blocking — files are uploaded, metadata sync is secondary
      }
    }

    const results = classified.map(f => f.classification!);
    onFilesUploaded?.(results);
  }, [files, msAccessToken, oneDriveFolderId, projectId, authToken, onFilesUploaded, getTargetFolder, uploadFileToOneDrive]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setFiles(prev => prev.map(f =>
      f.status === 'uploading' ? { ...f, status: 'error' as const, error: 'Cancelado' } : f
    ));
  }, []);

  // ===== STATS =====

  const stats = useMemo(() => {
    const total = files.length;
    const classified = files.filter(f => f.status === 'classified').length;
    const uploaded = files.filter(f => f.status === 'uploaded').length;
    const errors = files.filter(f => f.status === 'error').length;
    const skipped = files.filter(f => f.status === 'skipped').length;
    const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
    return { total, classified, uploaded, errors, skipped, totalSize };
  }, [files]);

  // ===== RENDER =====

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
          <div className="flex items-center gap-2">
            {/* File size info */}
            <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {formatSize(stats.totalSize)} / {formatSize(MAX_TOTAL_SIZE)}
            </div>
            <button onClick={clearFiles} className="text-[11px] text-[var(--muted-foreground)] hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Size limit banner */}
      {!msAccessToken && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="text-[11px] text-amber-300">
            <span className="font-medium">OneDrive no conectado.</span> Los archivos se clasificaran con IA pero no se subiran a la nube. Conecta OneDrive para la organizacion completa.
          </div>
        </div>
      )}

      {/* Size warning */}
      {sizeWarning && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-yellow-300 whitespace-pre-line">{sizeWarning}</div>
          <button onClick={() => setSizeWarning(null)} className="text-yellow-400 hover:text-yellow-200 cursor-pointer bg-transparent border-none ml-auto flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
              Maximo {formatSize(MAX_FILE_SIZE)} por archivo — {formatSize(MAX_TOTAL_SIZE)} por lote
            </div>
          </div>
        </div>
      </div>

      {/* File Queue */}
      {files.length > 0 && !showResults && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--muted-foreground)]">{files.length} archivo(s) en cola — {formatSize(stats.totalSize)}</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {files.map(f => {
              const isLarge = f.file.size > WARN_FILE_SIZE;
              const isOversized = f.file.size > MAX_FILE_SIZE;
              return (
                <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOversized ? 'bg-red-500/10 border border-red-500/20' : isLarge ? 'bg-yellow-500/5' : 'bg-[var(--af-bg3)]/50'}`}>
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isOversized ? 'text-red-400' : isLarge ? 'text-yellow-400' : 'text-[var(--muted-foreground)]'}`} />
                  <span className="text-[12px] flex-1 truncate">{f.file.name}</span>
                  <span className={`text-[10px] ${isOversized ? 'text-red-400 font-medium' : 'text-[var(--muted-foreground)]'}`}>
                    {formatSize(f.file.size)}
                  </span>
                  {isLarge && !isOversized && <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                  {isOversized && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  {f.status === 'classifying' && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                  {f.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  {f.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer bg-transparent border-none">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-[var(--muted-foreground)]">{formatSize(f.file.size)}</span>
                      {f.status === 'uploaded' && <Check className="w-4 h-4 text-emerald-400" />}
                      {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
                      {f.status === 'skipped' && <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                      {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {/* Upload progress bar */}
                  {f.status === 'uploading' && (
                    <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-150" style={{ width: `${f.uploadProgress}%` }} />
                    </div>
                  )}

                  {/* Skipped message */}
                  {f.status === 'skipped' && f.skippedReason && (
                    <div className="text-[10px] text-yellow-400">{f.skippedReason}</div>
                  )}

                  {/* Error message */}
                  {f.status === 'error' && f.error && (
                    <div className="text-[10px] text-red-400">{f.error}</div>
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
            <div className="space-y-2">
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
                    Subiendo a OneDrive...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    {msAccessToken
                      ? `Subir a OneDrive (${stats.classified - stats.uploaded} archivos)`
                      : `Sin OneDrive — guardar metadatos (${stats.classified} archivos)`
                    }
                  </>
                )}
              </button>
              {files.some(f => f.status === 'uploading') && (
                <button
                  onClick={cancelUpload}
                  className="w-full py-1.5 rounded-lg text-[11px] text-red-400 hover:text-red-300 cursor-pointer bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Cancelar subida
                </button>
              )}
            </div>
          )}

          {/* All uploaded */}
          {stats.uploaded > 0 && stats.uploaded === stats.classified && (
            <div className="text-center py-3 text-[12px] text-emerald-400 font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              {stats.uploaded} archivo(s) subidos exitosamente
              {stats.skipped > 0 && (
                <span className="text-yellow-400">({stats.skipped} omitidos)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
