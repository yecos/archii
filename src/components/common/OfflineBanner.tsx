'use client';
import React from 'react';
import { WifiOff, Wifi, CloudOff, Cloud, RefreshCw, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

export default function OfflineBanner() {
  const {
    isOnline,
    isOfflineMode,
    isSyncing,
    syncProgress,
    pendingCount,
    syncedCount,
    failedCount,
    triggerSync,
  } = useOfflineQueue();

  const [visible, setVisible] = React.useState(true);
  const [lastOnlineState, setLastOnlineState] = React.useState(true);

  // Show banner when status changes
  React.useEffect(() => {
    if (isOnline !== lastOnlineState) {
      setVisible(true);
      setLastOnlineState(isOnline);
      // Auto-hide "back online" after 4s
      if (isOnline && pendingCount === 0) {
        const timer = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, lastOnlineState, pendingCount]);

  // Show during sync
  const showSyncing = isSyncing;
  // Show when offline
  const showOffline = !isOnline;
  // Show when back online with pending ops
  const showPendingSync = isOnline && pendingCount > 0 && !isSyncing;
  // Show when just came back online (brief)
  const showBackOnline = isOnline && pendingCount === 0 && visible;

  if (!showOffline && !showSyncing && !showPendingSync && !showBackOnline) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200]" role="alert" aria-live="polite">
      {/* Offline banner */}
      {showOffline && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-red-600/95 backdrop-blur-sm text-white text-sm animate-slideDown shadow-lg">
          <CloudOff size={18} className="shrink-0" />
          <span className="font-medium">Sin conexión a internet</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
              {pendingCount} {pendingCount === 1 ? 'operación pendiente' : 'operaciones pendientes'}
            </span>
          )}
          <span className="text-white/70 text-xs">Los cambios se guardarán localmente</span>
          <button
            className="ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer bg-transparent border-none text-white"
            onClick={() => setVisible(false)}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Syncing banner */}
      {showSyncing && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-blue-600/95 backdrop-blur-sm text-white text-sm animate-slideDown shadow-lg">
          <Loader2 size={18} className="shrink-0 animate-spin" />
          <span className="font-medium">Sincronizando cambios...</span>
          <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
          <span className="text-white/80 text-xs">{syncProgress}%</span>
          {syncedCount > 0 && (
            <CheckCircle2 size={16} className="text-green-300 shrink-0" />
          )}
        </div>
      )}

      {/* Pending sync banner */}
      {showPendingSync && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-amber-600/95 backdrop-blur-sm text-white text-sm animate-slideDown shadow-lg">
          <CloudOff size={18} className="shrink-0" />
          <span className="font-medium">
            {pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'} de sincronizar
          </span>
          <button
            onClick={triggerSync}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-none text-white transition-colors"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Sincronizar ahora
          </button>
          <button
            className="ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer bg-transparent border-none text-white"
            onClick={() => setVisible(false)}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Back online banner */}
      {showBackOnline && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/95 backdrop-blur-sm text-white text-sm animate-slideDown shadow-lg">
          <Wifi size={16} className="shrink-0" />
          <span className="font-medium">Conexión restablecida</span>
          <button
            className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer bg-transparent border-none text-white"
            onClick={() => setVisible(false)}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
