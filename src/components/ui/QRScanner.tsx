/**
 * QRScanner.tsx — QR Code & Barcode scanner component for ArchiFlow
 * Uses html5-qrcode library for camera-based scanning.
 * Supports QR codes, EAN-13, UPC, Code128, etc.
 */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, SwitchCamera, Flashlight, Copy, ExternalLink, ScanLine } from 'lucide-react';

interface ScanResult {
  text: string;
  format: string;
  timestamp: Date;
}

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan?: (result: ScanResult) => void;
  /** Allow selecting from image file */
  allowFileScan?: boolean;
  /** Title displayed in the header */
  title?: string;
  /** Description shown below title */
  description?: string;
}

export default function QRScanner({
  open,
  onClose,
  onScan,
  allowFileScan = true,
  title = 'Escanear Código',
  description = 'Apunta la cámara al código QR o de barras',
}: QRScannerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);

  const stopScanner = useCallback(() => {
    try {
      if (html5QrRef.current) {
        const scanner = html5QrRef.current as { stop: () => Promise<void>; clear: () => void; isScanning: boolean };
        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
          scanner.clear();
        }
        html5QrRef.current = null;
      }
    } catch {
      // ignore
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current || !open) return;

    setError(null);
    setIsInitialized(false);

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');
      const scannerId = 'archiflow-qr-reader';

      // Ensure element exists
      if (!document.getElementById(scannerId)) {
        const el = document.createElement('div');
        el.id = scannerId;
        scannerRef.current.appendChild(el);
      }

      const scanner = new Html5Qrcode(scannerId);
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText: string, decodedResult: unknown) => {
          const result = decodedResult as { result?: { format?: { formatName?: string } } };
          const format = result?.result?.format?.formatName || 'QR Code';
          const scanResult: ScanResult = {
            text: decodedText,
            format,
            timestamp: new Date(),
          };
          setLastResult(scanResult);
          if (onScan) onScan(scanResult);
          // Vibrate on successful scan
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(100);
          }
          // Stop after successful scan
          stopScanner();
        },
        () => {
          // QR code not found in frame — ignore
        }
      );

      setIsScanning(true);
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      // Handle common errors
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setError('Permiso de cámara denegado. Activa el acceso a la cámara en tu navegador.');
      } else if (message.includes('NotFoundError') || message.includes('Requested device not found')) {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (message.includes('NotReadableError') || message.includes('Could not start')) {
        setError('La cámara está siendo usada por otra aplicación.');
      } else {
        setError(`Error al iniciar el escáner: ${message}`);
      }
    }
  }, [open, facingMode, onScan, stopScanner]);

  // Start/stop scanner based on open state
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  const handleToggleCamera = useCallback(async () => {
    stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopScanner]);

  const handleToggleTorch = useCallback(async () => {
    try {
      const scanner = html5QrRef.current as { applyVideoConstraints: (constraints: unknown) => Promise<void> } | null;
      if (!scanner) return;

      const newTorch = !torchEnabled;
      await scanner.applyVideoConstraints({
        advanced: [{ torch: newTorch }],
      } as unknown);
      setTorchEnabled(newTorch);
    } catch {
      // Torch not supported
      setTorchEnabled(false);
    }
  }, [torchEnabled]);

  const handleFileScan = useCallback(async () => {
    try {
      // Create a hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const tempId = 'archiflow-qr-reader-temp';
          let tempEl = document.getElementById(tempId);
          if (!tempEl) {
            tempEl = document.createElement('div');
            tempEl.id = tempId;
            tempEl.style.display = 'none';
            document.body.appendChild(tempEl);
          }
          const scanner = new Html5Qrcode(tempId);
          const result = await scanner.scanFile(file, true);
          const format = typeof result === 'string' ? 'QR Code' : 'QR Code';
          const scanResult: ScanResult = {
            text: typeof result === 'string' ? result : String(result),
            format,
            timestamp: new Date(),
          };
          setLastResult(scanResult);
          if (onScan) onScan(scanResult);
          scanner.clear();
          // Cleanup temp element
          const el = document.getElementById(tempId);
          if (el) document.body.removeChild(el);
        } catch {
          // No QR code found in image
        }
      };
      fileInput.click();
    } catch {
      // ignore
    }
  }, [onScan]);

  const copyResult = useCallback(() => {
    if (!lastResult) return;
    navigator.clipboard.writeText(lastResult.text).catch(() => {});
  }, [lastResult]);

  const openUrl = useCallback(() => {
    if (!lastResult) return;
    try {
      new URL(lastResult.text);
      window.open(lastResult.text, '_blank', 'noopener');
    } catch {
      // Not a valid URL
    }
  }, [lastResult]);

  const isUrl = lastResult ? (() => { try { new URL(lastResult.text); return true; } catch { return false; } })() : false;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--card)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <ScanLine size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
            <p className="text-[11px] text-[var(--muted-foreground)]">{description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors border-none"
          aria-label="Cerrar escáner"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative flex flex-col">
        <div ref={scannerRef} className="flex-1 flex items-center justify-center overflow-hidden">
          <div id="archiflow-qr-reader-file" className="hidden" />
        </div>

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--card)]/90 p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <ScanLine size={32} className="stroke-red-400" />
              </div>
              <p className="text-[13px] text-red-400 mb-4">{error}</p>
              <button
                onClick={startScanner}
                className="px-4 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-[var(--muted-foreground)]">Iniciando cámara...</p>
            </div>
          </div>
        )}

        {/* Scanner Overlay Corners */}
        {isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[250px] h-[250px] relative">
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[var(--af-accent)] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[var(--af-accent)] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[var(--af-accent)] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[var(--af-accent)] rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[var(--af-accent)] to-transparent animate-bounce" style={{ top: '50%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--af-bg2)] animate-fadeIn">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              {lastResult.format}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {lastResult.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[13px] text-[var(--foreground)] font-medium break-all mb-2">
            {lastResult.text}
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer"
            >
              <Copy size={13} /> Copiar
            </button>
            {isUrl && (
              <button
                onClick={openUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 transition-colors"
              >
                <ExternalLink size={13} /> Abrir enlace
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => { setLastResult(null); startScanner(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-[var(--af-accent)] text-background font-semibold cursor-pointer border-none"
            >
              <ScanLine size={13} /> Escanear otro
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {!lastResult && (
        <div className="flex items-center justify-around px-4 py-4 border-t border-[var(--border)]">
          <button
            onClick={handleToggleCamera}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer hover:bg-[var(--af-bg3)] transition-colors bg-transparent border-none text-[var(--muted-foreground)]"
            title="Cambiar cámara"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--af-bg3)] flex items-center justify-center">
              <SwitchCamera size={20} />
            </div>
            <span className="text-[10px] font-medium">Cambiar cámara</span>
          </button>

          <button
            onClick={handleToggleTorch}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer hover:bg-[var(--af-bg3)] transition-colors bg-transparent border-none text-[var(--muted-foreground)]"
            title="Linterna"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${torchEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--af-bg3)]'}`}>
              <Flashlight size={20} />
            </div>
            <span className="text-[10px] font-medium">{torchEnabled ? 'Apagar' : 'Linterna'}</span>
          </button>

          {allowFileScan && (
            <button
              onClick={handleFileScan}
              className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer hover:bg-[var(--af-bg3)] transition-colors bg-transparent border-none text-[var(--muted-foreground)]"
              title="Escanear desde imagen"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--af-bg3)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <span className="text-[10px] font-medium">Desde imagen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
