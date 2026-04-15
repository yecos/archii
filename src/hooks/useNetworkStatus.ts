'use client';
import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus(): { isOnline: boolean; showBanner: boolean; dismissBanner: () => void } {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state from browser
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" banner briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  return { isOnline, showBanner, dismissBanner };
}
