'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, Upload, HardDrive, Database, Shield, Clock,
  AlertTriangle, CheckCircle, Info, FileJson, RefreshCw,
  Loader2, ChevronDown, ChevronUp, Trash2, Eye,
} from 'lucide-react';
import { useAuth, useFirestore, useUI } from '@/hooks/useDomain';
import { confirm } from '@/hooks/useConfirmDialog';
import { getFirebase } from '@/lib/firebase-service';
import {
  exportAllData,
  downloadBackupFile,
  readBackupFile,
  getCollectionCounts,
  estimateBackupSize,
  getBackupInfo,
  saveLastBackupDate,
  getLastBackupDate,
  formatBackupDate,
  validateBackupStructure,
  generateImportPreview,
  BACKUP_COLLECTIONS,
  type BackupData,
  type ImportResult,
  type ImportConflictStrategy,
} from '@/lib/backup-service';

/* ===== COMPONENT ===== */

export default function BackupScreen() {
  const { authUser } = useAuth();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [collectionCounts, setCollectionCounts] = useState<Array<{ name: string; label: string; icon: string; count: number }>>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [backupPreview, setBackupPreview] = useState<BackupData | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ImportConflictStrategy>('skip');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load collection counts and last backup date on mount
  useEffect(() => {
    loadCollectionCounts();
    setLastBackup(getLastBackupDate());
  }, []);

  const loadCollectionCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const db = getFirebase().firestore();
      const counts = await getCollectionCounts(db);
      setCollectionCounts(counts);
    } catch (err) {
      console.error('[Backup] Error loading collection counts:', err);
      showToast('Error al cargar conteos de colecciones', 'error');
    } finally {
      setLoadingCounts(false);
    }
  }, [showToast]);

  const totalDocs = collectionCounts.reduce((sum, c) => sum + c.count, 0);

  /* ===== EXPORT / BACKUP ===== */

  const handleExport = async () => {
    if (!authUser) {
      showToast('Debes estar autenticado para exportar', 'error');
      return;
    }

    const confirmed = await confirm({
      title: 'Exportar Copia de Seguridad',
      description: `Se exportarán ${totalDocs} documentos de ${collectionCounts.length} colecciones. El archivo se descargará como JSON. ¿Continuar?`,
      confirmText: 'Exportar',
      variant: 'default',
    });

    if (!confirmed) return;

    setIsExporting(true);
    try {
      const data = await exportAllData(authUser.uid);
      downloadBackupFile(data);
      const now = new Date().toISOString();
      saveLastBackupDate(now);
      setLastBackup(now);
      showToast(`Backup exportado: ${data.metadata.totalDocuments} documentos (${data.metadata.estimatedSizeMB})`, 'success');
    } catch (err) {
      console.error('[Backup] Export error:', err);
      showToast('Error al exportar la copia de seguridad', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /* ===== IMPORT / RESTORE ===== */

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      showToast('Selecciona un archivo JSON válido', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('El archivo excede el límite de 50 MB', 'error');
      return;
    }

    try {
      const data = await readBackupFile(file);
      setBackupPreview(data);
      setImportResult(null);
    } catch (err) {
      console.error('[Backup] File read error:', err);
      showToast(err instanceof Error ? err.message : 'Error al leer el archivo', 'error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!authUser || !backupPreview) return;

    const preview = generateImportPreview(backupPreview);
    const previewText = preview
      .filter((c) => c.total > 0)
      .map((c) => `• ${c.collection}: ${c.total} docs`)
      .join('\n');

    const strategyLabel = {
      skip: 'Omitir existentes (solo crear nuevos)',
      replace: 'Reemplazar existentes',
      merge: 'Combinar con existentes',
    }[conflictStrategy];

    const confirmed = await confirm({
      title: 'Restaurar Copia de Seguridad',
      description: `Se importarán ${backupPreview.metadata.totalDocuments} documentos.\n\nEstrategia: ${strategyLabel}\n\n${previewText}\n\nEsta acción no se puede deshacer. ¿Continuar?`,
      confirmText: 'Restaurar',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setIsImporting(true);
    setImportProgress(10);

    try {
      const fb = getFirebase();
      const token = await fb.auth().currentUser?.getIdToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación.');

      setImportProgress(30);

      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          backupData: backupPreview,
          conflictStrategy,
        }),
      });

      setImportProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la restauración');
      }

      setImportResult(result.result as ImportResult);
      setImportProgress(100);
      showToast('Restauración completada exitosamente', 'success');

      // Refresh collection counts
      loadCollectionCounts();
    } catch (err) {
      console.error('[Backup] Import error:', err);
      showToast(err instanceof Error ? err.message : 'Error al restaurar', 'error');
      setImportProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  const clearPreview = () => {
    setBackupPreview(null);
    setImportResult(null);
    setImportProgress(0);
  };

  /* ===== RENDER ===== */

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <HardDrive size={24} />
          Copia de Seguridad
        </h1>
        <p className="text-sm text-[var(--skeuo-text-secondary)] mt-1">
          Exporta e importa todos los datos de tu cuenta para proteger tu información
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--skeuo-sunken)]">
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none transition-all ${
            activeTab === 'backup'
              ? 'skeuo-btn shadow-sm'
              : 'bg-transparent text-[var(--skeuo-text-secondary)] hover:text-[var(--skeuo-text-primary)]'
          }`}
        >
          <Download size={16} />
          Exportar
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none transition-all ${
            activeTab === 'restore'
              ? 'skeuo-btn shadow-sm'
              : 'bg-transparent text-[var(--skeuo-text-secondary)] hover:text-[var(--skeuo-text-primary)]'
          }`}
        >
          <Upload size={16} />
          Restaurar
        </button>
      </div>

      {/* ===== BACKUP TAB ===== */}
      {activeTab === 'backup' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Status Card */}
          <div className="card-elevated rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center">
                  <Database size={24} className="text-[var(--af-accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)]">
                    Resumen de Datos
                  </h2>
                  <p className="text-xs text-[var(--skeuo-text-secondary)]">
                    {loadingCounts ? 'Calculando...' : `${totalDocs} documentos en ${collectionCounts.length} colecciones`}
                  </p>
                </div>
              </div>
              {lastBackup && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--skeuo-text-secondary)]">
                  <Clock size={14} />
                  Último backup: {formatBackupDate(lastBackup)}
                </div>
              )}
            </div>

            {/* Collection Counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {loadingCounts ? (
                <div className="col-span-2 flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-[var(--af-accent)]" />
                  <span className="ml-2 text-sm text-[var(--skeuo-text-secondary)]">Cargando colecciones...</span>
                </div>
              ) : (
                collectionCounts.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--skeuo-sunken)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{col.icon}</span>
                      <span className="text-xs font-medium text-[var(--skeuo-text-primary)]">
                        {col.label}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${col.count > 0 ? 'text-[var(--af-accent)]' : 'text-[var(--skeuo-text-secondary)]'}`}>
                      {col.count}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || loadingCounts || totalDocs === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl skeuo-btn text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Exportar Copia de Seguridad
                </>
              )}
            </button>

            {totalDocs === 0 && !loadingCounts && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <span className="text-xs text-amber-600">
                  No hay documentos para exportar. Crea algunos datos primero.
                </span>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="card-elevated rounded-xl p-5 space-y-3">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-full flex items-center justify-between cursor-pointer bg-transparent border-none"
            >
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[var(--af-accent)]" />
                <span className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
                  Recomendaciones de Backup
                </span>
              </div>
              {showInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showInfo && (
              <div className="space-y-2 animate-fadeIn">
                <RecommendationItem
                  icon={<Clock size={14} />}
                  title="Frecuencia semanal"
                  description="Realiza backups al menos una vez por semana para minimizar pérdida de datos."
                />
                <RecommendationItem
                  icon={<Shield size={14} />}
                  title="Antes de cambios importantes"
                  description="Exporta un backup antes de eliminar proyectos, empresas o realizar migraciones."
                />
                <RecommendationItem
                  icon={<HardDrive size={14} />}
                  title="Almacena múltiples copias"
                  description="Guarda los archivos JSON en diferentes ubicaciones (nube, disco externo, etc.)."
                />
                <RecommendationItem
                  icon={<CheckCircle size={14} />}
                  title="Verifica la integridad"
                  description="Después de exportar, abre el archivo y verifica que los datos sean correctos."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RESTORE TAB ===== */}
      {activeTab === 'restore' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Upload Area */}
          <div className="card-elevated rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
              <Upload size={20} className="text-[var(--af-accent)]" />
              Restaurar desde Archivo
            </h2>

            {!backupPreview ? (
              /* Drag & Drop Zone */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/5'
                    : 'border-[var(--skeuo-edge-light)] hover:border-[var(--af-accent)]/50 hover:bg-[var(--skeuo-sunken)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <FileJson size={40} className={`mx-auto mb-3 ${isDragging ? 'text-[var(--af-accent)]' : 'text-[var(--skeuo-text-secondary)]'}`} />
                <p className="text-sm font-medium text-[var(--skeuo-text-primary)]">
                  {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta un archivo JSON'}
                </p>
                <p className="text-xs text-[var(--skeuo-text-secondary)] mt-1">
                  o haz clic para seleccionar · archiflow_backup_*.json
                </p>
              </div>
            ) : (
              /* Preview + Import */
              <div className="space-y-4">
                {/* Preview Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson size={18} className="text-green-500" />
                    <span className="text-sm font-medium text-[var(--skeuo-text-primary)]">
                      {getBackupInfo(backupPreview).date}
                    </span>
                  </div>
                  <button
                    onClick={clearPreview}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-500/10 cursor-pointer bg-transparent border-none transition-colors"
                  >
                    <Trash2 size={12} />
                    Quitar
                  </button>
                </div>

                {/* Preview Info */}
                <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)] space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--skeuo-text-secondary)]">Versión:</span>
                      <span className="ml-1 font-medium text-[var(--skeuo-text-primary)]">
                        {backupPreview.metadata.version}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--skeuo-text-secondary)]">UID:</span>
                      <span className="ml-1 font-medium text-[var(--skeuo-text-primary)] font-mono">
                        {backupPreview.metadata.uid.slice(0, 12)}...
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[var(--skeuo-text-secondary)]">Total documentos:</span>
                      <span className="ml-1 font-semibold text-[var(--af-accent)]">
                        {backupPreview.metadata.totalDocuments}
                      </span>
                      <span className="ml-1 text-[var(--skeuo-text-secondary)]">
                        en {backupPreview.collections.filter((c) => c.count > 0).length} colecciones
                      </span>
                    </div>
                  </div>

                  {/* Collection breakdown */}
                  <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                    {backupPreview.collections
                      .filter((c) => c.count > 0)
                      .map((col) => (
                        <div key={col.collection} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--skeuo-text-secondary)]">{col.collection}</span>
                          <span className="font-medium text-[var(--skeuo-text-primary)]">{col.count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Conflict Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--skeuo-text-primary)]">
                    Estrategia de conflictos:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      { value: 'skip', label: 'Omitir existentes', desc: 'Solo crear nuevos documentos' },
                      { value: 'replace', label: 'Reemplazar', desc: 'Sobrescribir documentos existentes' },
                      { value: 'merge', label: 'Combinar', desc: 'Fusionar datos con existentes' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setConflictStrategy(opt.value)}
                        className={`p-2.5 rounded-lg text-left cursor-pointer border-none transition-all ${
                          conflictStrategy === opt.value
                            ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/30'
                            : 'bg-[var(--skeuo-sunken)] hover:bg-[var(--skeuo-raised)]'
                        }`}
                      >
                        <div className={`text-xs font-semibold ${
                          conflictStrategy === opt.value ? 'text-[var(--af-accent)]' : 'text-[var(--skeuo-text-primary)]'
                        }`}>
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-[var(--skeuo-text-secondary)] mt-0.5">
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-600">
                    La restauración escribirá datos directamente en Firestore. Los datos existentes pueden ser afectados según la estrategia seleccionada.
                  </span>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--af-accent)] text-background text-sm font-semibold cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Restaurar Copia de Seguridad
                    </>
                  )}
                </button>

                {/* Progress Bar */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-[var(--skeuo-sunken)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--af-accent)] rounded-full transition-all duration-500"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-center text-[var(--skeuo-text-secondary)]">
                      {importProgress < 30 && 'Preparando datos...'}
                      {importProgress >= 30 && importProgress < 70 && 'Enviando al servidor...'}
                      {importProgress >= 70 && importProgress < 100 && 'Procesando documentos...'}
                      {importProgress >= 100 && '¡Completado!'}
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className={`p-4 rounded-xl space-y-3 ${
                    importResult.success
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {importResult.success ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <AlertTriangle size={18} className="text-red-500" />
                      )}
                      <span className="text-sm font-semibold">
                        {importResult.success ? 'Restauración completada' : 'Restauración con errores'}
                      </span>
                    </div>

                    {/* Summary Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="text-lg font-bold text-green-500">{importResult.totalCreated}</div>
                        <div className="text-[10px] text-[var(--skeuo-text-secondary)]">Creados</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="text-lg font-bold text-amber-500">{importResult.totalSkipped}</div>
                        <div className="text-[10px] text-[var(--skeuo-text-secondary)]">Omitidos</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="text-lg font-bold text-blue-500">{importResult.totalReplaced}</div>
                        <div className="text-[10px] text-[var(--skeuo-text-secondary)]">Reemplazados</div>
                      </div>
                    </div>

                    {/* Per-collection breakdown */}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.summary
                        .filter((s) => s.total > 0)
                        .map((s) => (
                          <div key={s.collection} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-background/30">
                            <span className="font-medium">{s.collection}</span>
                            <span className="text-[var(--skeuo-text-secondary)]">
                              {s.created > 0 && <span className="text-green-500">+{s.created}</span>}
                              {s.skipped > 0 && <span className="text-amber-500"> ⏭{s.skipped}</span>}
                              {s.replaced > 0 && <span className="text-blue-500"> ↻{s.replaced}</span>}
                              {s.errors > 0 && <span className="text-red-500"> ✗{s.errors}</span>}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-red-500">Errores:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1">
                          {importResult.errors.slice(0, 10).map((err, i) => (
                            <div key={i} className="text-[10px] text-red-400 bg-red-500/5 px-2 py-1 rounded">
                              {err}
                            </div>
                          ))}
                          {importResult.errors.length > 10 && (
                            <div className="text-[10px] text-[var(--skeuo-text-secondary)]">
                              ...y {importResult.errors.length - 10} errores más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What's Included */}
          <div className="card-elevated rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
              <Eye size={16} className="text-[var(--af-accent)]" />
              Datos incluidos en el backup
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BACKUP_COLLECTIONS.map((col) => (
                <div key={col.name} className="flex items-center gap-1.5 text-xs text-[var(--skeuo-text-secondary)]">
                  <span>{col.icon}</span>
                  <span>{col.label}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[var(--skeuo-text-secondary)] p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <strong className="text-blue-500">Nota:</strong> Las fotos e imágenes se exportan como URLs de Storage o base64.
              Los archivos adjuntos grandes no se incluyen; usa la sincronización con OneDrive para eso.
            </div>
          </div>
        </div>
      )}

      {/* ===== INFO SECTION (both tabs) ===== */}
      <div className="card-elevated rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <Shield size={16} className="text-[var(--af-accent)]" />
          Seguridad e Integridad
        </h3>
        <div className="space-y-2">
          <InfoTip
            icon={<Shield size={14} />}
            text="Los backups contienen todos tus datos en formato JSON. Guárdalos en un lugar seguro."
          />
          <InfoTip
            icon={<AlertTriangle size={14} />}
            text="No compartas archivos de backup — contienen información sensible del proyecto."
          />
          <InfoTip
            icon={<CheckCircle size={14} />}
            text="Verifica la integridad del archivo abriéndolo en un editor de texto antes de restaurar."
          />
          <InfoTip
            icon={<Database size={14} />}
            text="Los archivos grandes (50+ MB) pueden tardar más en procesarse durante la restauración."
          />
        </div>
      </div>
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function RecommendationItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--skeuo-sunken)]">
      <div className="w-6 h-6 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center shrink-0 text-[var(--af-accent)]">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-[var(--skeuo-text-primary)]">{title}</div>
        <div className="text-[11px] text-[var(--skeuo-text-secondary)] mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function InfoTip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-[var(--skeuo-text-secondary)]">
      <span className="shrink-0 mt-0.5 text-[var(--af-accent)]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
