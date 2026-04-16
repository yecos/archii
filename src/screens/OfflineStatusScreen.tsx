'use client';
import React, { useState } from 'react';
import {
  WifiOff, Wifi, CloudOff, CloudCheck, RefreshCw, Trash2, Database,
  HardDrive, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2,
  RotateCcw, ArrowUpDown, Shield, Smartphone, Monitor
} from 'lucide-react';
import { useOfflineQueue, QueuedMutation } from '@/contexts/OfflineQueueContext';

export default function OfflineStatusScreen() {
  const {
    pendingMutations,
    pendingCount,
    isSyncing,
    syncProgress,
    syncedCount,
    failedCount,
    isOnline,
    isOfflineMode,
    cacheSizeBytes,
    triggerSync,
    removeQueued,
    clearQueue,
    retryMutation,
    refreshCacheSize,
  } = useOfflineQueue();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return `Hace ${Math.floor(diff / 86400000)}d`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'add': return <span className="text-green-500 text-xs font-bold">+ Nuevo</span>;
      case 'set': return <span className="text-blue-500 text-xs font-bold">= Set</span>;
      case 'update': return <span className="text-amber-500 text-xs font-bold">~ Edit</span>;
      case 'delete': return <span className="text-red-500 text-xs font-bold">× Borrar</span>;
      default: return <span className="text-xs font-bold">?</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <HardDrive size={24} />
          Estado Offline
        </h1>
        <p className="text-sm text-[var(--skeuo-text-secondary)] mt-1">
          Monitoreo de conexión, caché y operaciones pendientes de sincronización
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Wifi size={24} className="text-green-500" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <WifiOff size={24} className="text-red-500" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)]">
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </h2>
              <p className="text-xs text-[var(--skeuo-text-secondary)]">
                {isOnline
                  ? 'Todas las operaciones se sincronizan en tiempo real'
                  : 'Los cambios se guardan localmente y se sincronizarán al reconectarse'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            isOnline ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* PWA features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FeaturePill
            icon={<Shield size={14} />}
            label="App Shell"
            active={true}
            tooltip="Interfaz cacheada para carga offline"
          />
          <FeaturePill
            icon={<Database size={14} />}
            label="Persistencia"
            active={true}
            tooltip="Firebase Persistence habilitado"
          />
          <FeaturePill
            icon={<ArrowUpDown size={14} />}
            label="Sync Queue"
            active={pendingCount === 0 || isSyncing}
            tooltip={pendingCount > 0 ? `${pendingCount} operaciones encoladas` : 'Cola vacía'}
          />
          <FeaturePill
            icon={<Monitor size={14} />}
            label="PWA"
            active={true}
            tooltip="Instalable como aplicación"
          />
        </div>
      </div>

      {/* Sync Status Card */}
      {(isSyncing || pendingCount > 0 || syncedCount > 0 || failedCount > 0) && (
        <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
              {isSyncing ? (
                <Loader2 size={18} className="animate-spin text-blue-500" />
              ) : pendingCount > 0 ? (
                <Clock size={18} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={18} className="text-green-500" />
              )}
              Sincronización
            </h3>
            {pendingCount > 0 && !isSyncing && (
              <button
                onClick={triggerSync}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold cursor-pointer border-none hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={14} />
                Sincronizar
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="w-full h-2.5 bg-[var(--skeuo-sunken)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--skeuo-text-secondary)]">
                <span>Progreso: {syncProgress}%</span>
                <span>{syncedCount} exitosas, {failedCount} fallidas</span>
              </div>
            </div>
          )}

          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-[var(--skeuo-sunken)]">
              <div className="text-lg font-bold text-amber-500">{pendingCount}</div>
              <div className="text-xs text-[var(--skeuo-text-secondary)]">Pendientes</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-[var(--skeuo-sunken)]">
              <div className="text-lg font-bold text-green-500">{syncedCount}</div>
              <div className="text-xs text-[var(--skeuo-text-secondary)]">Sincronizadas</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-[var(--skeuo-sunken)]">
              <div className="text-lg font-bold text-red-500">{failedCount}</div>
              <div className="text-xs text-[var(--skeuo-text-secondary)]">Fallidas</div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Mutations List */}
      {pendingMutations.length > 0 && (
        <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
              <CloudOff size={18} className="text-amber-500" />
              Operaciones pendientes
              <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
                ({pendingCount})
              </span>
            </h3>
            <button
              onClick={clearQueue}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-500/10 cursor-pointer bg-transparent border-none transition-colors"
            >
              <Trash2 size={12} />
              Limpiar todo
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingMutations.map((mutation) => (
              <MutationCard
                key={mutation.id}
                mutation={mutation}
                expanded={expandedId === mutation.id}
                onToggle={() => setExpandedId(expandedId === mutation.id ? null : mutation.id)}
                onRemove={() => removeQueued(mutation.id)}
                onRetry={() => retryMutation(mutation.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cache Info Card */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
            <Database size={18} className="text-blue-500" />
            Almacenamiento local
          </h3>
          <button
            onClick={refreshCacheSize}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--skeuo-text-secondary)] hover:bg-[var(--skeuo-sunken)] cursor-pointer bg-transparent border-none transition-colors"
          >
            <RefreshCw size={12} />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)]">
            <div className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
              {formatBytes(cacheSizeBytes)}
            </div>
            <div className="text-xs text-[var(--skeuo-text-secondary)]">
              Caché de la app
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)]">
            <div className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
              IndexedDB
            </div>
            <div className="text-xs text-[var(--skeuo-text-secondary)]">
              Cola de operaciones
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--skeuo-text-secondary)] p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <strong className="text-blue-500">Nota:</strong> La app guarda archivos temporales y datos
          de navegación para funcionar sin conexión. Puedes limpiar la caché desde la pantalla
          de Instalación si necesitas liberar espacio.
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
        <h3 className="font-semibold text-[var(--skeuo-text-primary)]">
          ¿Cómo funciona el modo offline?
        </h3>
        <div className="space-y-2 text-sm text-[var(--skeuo-text-secondary)]">
          <InfoRow
            step="1"
            title="Detección automática"
            description="La app detecta cuando pierdes conexión y activa el modo offline automáticamente."
          />
          <InfoRow
            step="2"
            title="Operaciones encoladas"
            description="Los cambios que haces offline se guardan localmente en una cola de sincronización."
          />
          <InfoRow
            step="3"
            title="Sincronización automática"
            description="Al recuperar la conexión, las operaciones pendientes se envían automáticamente a Firestore."
          />
          <InfoRow
            step="4"
            title="App Shell cacheada"
            description="La interfaz principal se carga desde la caché, permitiendo navegación offline completa."
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function FeaturePill({ icon, label, active, tooltip }: {
  icon: React.ReactNode; label: string; active: boolean; tooltip: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
        active
          ? 'bg-green-500/10 text-green-600'
          : 'bg-[var(--skeuo-sunken)] text-[var(--skeuo-text-secondary)]'
      }`}
      title={tooltip}
    >
      {icon}
      {label}
    </div>
  );
}

function MutationCard({ mutation, expanded, onToggle, onRemove, onRetry }: {
  mutation: QueuedMutation;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    return `Hace ${Math.floor(diff / 3600000)}h`;
  };

  return (
    <div className="rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 cursor-pointer bg-transparent border-none text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--skeuo-raised)] flex items-center justify-center shrink-0">
          {mutation.type === 'add' ? (
            <span className="text-green-500 font-bold text-sm">+</span>
          ) : mutation.type === 'update' ? (
            <span className="text-amber-500 font-bold text-sm">~</span>
          ) : mutation.type === 'delete' ? (
            <span className="text-red-500 font-bold text-sm">×</span>
          ) : (
            <span className="text-blue-500 font-bold text-sm">=</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--skeuo-text-primary)] truncate">
            {mutation.label}
          </div>
          <div className="text-xs text-[var(--skeuo-text-secondary)] truncate">
            {mutation.collection}{mutation.docId ? ` / ${mutation.docId}` : ''}
          </div>
        </div>
        <div className="text-xs text-[var(--skeuo-text-secondary)] shrink-0">
          {formatTime(mutation.queuedAt)}
        </div>
        {mutation.retries > 0 && (
          <span className="text-xs text-red-500 shrink-0">({mutation.retries} retries)</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--skeuo-edge-light)] pt-2">
          <div className="text-xs text-[var(--skeuo-text-secondary)]">
            <strong>Tipo:</strong> {mutation.type} | <strong>Cola:</strong> {mutation.collection}
            {mutation.docId && ` | <strong>ID:</strong> ${mutation.docId.slice(0, 12)}...`}
          </div>
          {mutation.data && (
            <div className="text-xs text-[var(--skeuo-text-secondary)] bg-[var(--skeuo-raised)] p-2 rounded-lg overflow-auto max-h-20">
              <pre className="whitespace-pre-wrap">{JSON.stringify(mutation.data, null, 2).slice(0, 500)}</pre>
            </div>
          )}
          {mutation.lastError && (
            <div className="text-xs text-red-500 flex items-start gap-1">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              {mutation.lastError}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onRetry}
              disabled={!navigator.onLine}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 cursor-pointer border-none disabled:opacity-40 transition-colors"
            >
              <RotateCcw size={12} />
              Reintentar
            </button>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer border-none transition-colors"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ step, title, description }: {
  step: string; title: string; description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-blue-500">
        {step}
      </div>
      <div>
        <div className="font-medium text-[var(--skeuo-text-primary)]">{title}</div>
        <div className="text-xs">{description}</div>
      </div>
    </div>
  );
}
