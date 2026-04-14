'use client';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, showBanner, dismissBanner } = useNetworkStatus();

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium animate-slideDown ${
        isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>Conexión restablecida</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Sin conexión a internet</span>
        </>
      )}
      <button
        className="ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer bg-transparent border-none text-white"
        onClick={dismissBanner}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
}
