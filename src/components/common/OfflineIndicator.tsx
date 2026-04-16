'use client';
import { WifiOff, CloudOff, CloudCheck, Loader2, Database } from 'lucide-react';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

interface OfflineIndicatorProps {
  /** Show as a compact dot (for headers/sidebars) or full badge */
  variant?: 'dot' | 'badge' | 'full';
  /** Additional CSS classes */
  className?: string;
}

export function OfflineIndicator({ variant = 'dot', className = '' }: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, cacheSizeBytes } = useOfflineQueue();

  // --- Dot variant: small colored circle ---
  if (variant === 'dot') {
    if (!isOnline) {
      return (
        <span
          className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ${className}`}
          title="Sin conexión"
        />
      );
    }
    if (isSyncing) {
      return (
        <span
          className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-blue-500 ${className}`}
          title="Sincronizando..."
        />
      );
    }
    if (pendingCount > 0) {
      return (
        <span
          className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-amber-500 ${className}`}
          title={`${pendingCount} cambios pendientes`}
        />
      );
    }
    return null;
  }

  // --- Badge variant: small pill with icon ---
  if (variant === 'badge') {
    if (!isOnline) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium ${className}`}>
          <WifiOff size={12} />
          Offline
        </span>
      );
    }
    if (isSyncing) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium ${className}`}>
          <Loader2 size={12} className="animate-spin" />
          Sync...
        </span>
      );
    }
    if (pendingCount > 0) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium ${className}`}>
          <CloudOff size={12} />
          {pendingCount} pendientes
        </span>
      );
    }
    return null;
  }

  // --- Full variant: detailed status card ---
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={`rounded-xl p-3 space-y-2 ${className}`}>
      {/* Connection status */}
      <div className="flex items-center gap-2 text-sm">
        {!isOnline ? (
          <>
            <WifiOff size={16} className="text-red-500" />
            <span className="font-medium text-red-600">Sin conexión</span>
          </>
        ) : isSyncing ? (
          <>
            <Loader2 size={16} className="text-blue-500 animate-spin" />
            <span className="font-medium text-blue-600">Sincronizando...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff size={16} className="text-amber-500" />
            <span className="font-medium text-amber-600">Pendiente de sincronizar</span>
          </>
        ) : (
          <>
            <CloudCheck size={16} className="text-green-500" />
            <span className="font-medium text-green-600">Todo sincronizado</span>
          </>
        )}
      </div>

      {/* Pending count */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--skeuo-text-secondary)]">
          <Database size={12} />
          <span>{pendingCount} {pendingCount === 1 ? 'operación encolada' : 'operaciones encoladas'}</span>
        </div>
      )}

      {/* Cache info */}
      {cacheSizeBytes > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--skeuo-text-secondary)]">
          <Database size={12} />
          <span>Caché: {formatBytes(cacheSizeBytes)}</span>
        </div>
      )}
    </div>
  );
}
