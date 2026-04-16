'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Detects when a new Service Worker is waiting to activate
 * and shows a toast prompting the user to update.
 */
export default function SWUpdateToast() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Check for waiting SW on load
    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          setShowUpdate(true);
        }
      } catch {
        // Service worker not available
      }
    };

    // Listen for SW update messages
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Check periodically (every 60s)
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 60000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Reload after a short delay to allow SW to activate
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      // Fallback: just reload
      window.location.reload();
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowUpdate(false);
    // Re-check in 5 minutes
    setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg?.waiting) setShowUpdate(true);
        }).catch(() => {});
      }
    }, 5 * 60 * 1000);
  }, []);

  if (!showUpdate) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[300] max-w-sm animate-slideUp"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 shrink-0">
          <RefreshCw size={18} className={`text-blue-500 ${updating ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
            Nueva versión disponible
          </p>
          <p className="text-xs text-[var(--skeuo-text-secondary)] mt-0.5">
            Actualiza para obtener las últimas mejoras y correcciones.
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold cursor-pointer border-none hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={updating ? 'animate-spin' : ''} />
              {updating ? 'Actualizando...' : 'Actualizar ahora'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-2 py-1.5 text-xs text-[var(--skeuo-text-secondary)] hover:text-[var(--skeuo-text-primary)] cursor-pointer bg-transparent border-none transition-colors"
            >
              Después
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--skeuo-sunken)] cursor-pointer bg-transparent border-none text-[var(--skeuo-text-secondary)] shrink-0"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
