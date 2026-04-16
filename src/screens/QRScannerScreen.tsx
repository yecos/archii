/**
 * QRScannerScreen.tsx — QR Code & Barcode scanner screen for ArchiFlow
 * Provides scanning for: inventory products, projects, tasks, team members
 * Full-screen scanner with history and quick actions.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { useI18n, useFirestore, useInventory, useUI } from '@/hooks/useDomain';
import QRScanner from '@/components/ui/QRScanner';
import { ScanLine, History, Link as LinkIcon, Package, FolderOpen, CheckSquare, Users, Search, ArrowRight, Trash2, Copy, ExternalLink } from 'lucide-react';
import type { InvProduct } from '@/lib/types';

interface ScanResult {
  text: string;
  format: string;
  timestamp: Date;
}

interface HistoryEntry extends ScanResult {
  id: string;
}

export default function QRScannerScreen() {
  const { t } = useI18n();
  const { projects, tasks } = useFirestore();
  const { invProducts } = useInventory();
  const { navigateTo, showToast } = useUI();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lookupResult, setLookupResult] = useState<{
    type: string;
    label: string;
    icon: string;
    action: () => void;
  } | null>(null);

  const handleScan = useCallback((result: ScanResult) => {
    // Add to history
    const entry: HistoryEntry = {
      ...result,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 50)); // Keep max 50

    // Try to look up in app data
    const scannedText = result.text.toLowerCase().trim();

    // Check if it's a project
    const project = projects.find((p) =>
      p.id === result.text ||
      p.data.name.toLowerCase() === scannedText
    );
    if (project) {
      setLookupResult({
        type: 'project',
        label: project.data.name,
        icon: '📁',
        action: () => navigateTo('projectDetail', project.id),
      });
      return;
    }

    // Check if it's a task
    const task = tasks.find((tk) =>
      tk.id === result.text
    );
    if (task) {
      setLookupResult({
        type: 'task',
        label: task.data.title,
        icon: '✅',
        action: () => navigateTo('tasks'),
      });
      return;
    }

    // Check if it's an inventory product
    const product = invProducts.find((ip: InvProduct) =>
      ip.id === result.text ||
      ip.data.sku.toLowerCase() === scannedText ||
      ip.data.name.toLowerCase() === scannedText
    );
    if (product) {
      setLookupResult({
        type: 'inventory',
        label: `${product.data.name} (SKU: ${product.data.sku})`,
        icon: '📦',
        action: () => navigateTo('inventory'),
      });
      return;
    }

    // Check if it's a URL
    try {
      new URL(result.text);
      setLookupResult({
        type: 'url',
        label: result.text,
        icon: '🔗',
        action: () => window.open(result.text, '_blank', 'noopener'),
      });
      return;
    } catch {
      // Not a URL
    }

    // Plain text result
    setLookupResult({
      type: 'text',
      label: result.text,
      icon: '📝',
      action: () => {
        navigator.clipboard.writeText(result.text).catch(() => {});
        showToast('Texto copiado al portapapeles');
      },
    });
  }, [projects, tasks, invProducts, navigateTo, showToast]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast('Historial limpiado');
  }, [showToast]);

  const copyScanText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('Copiado al portapapeles');
  }, [showToast]);

  return (
    <div className="max-w-2xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <ScanLine size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <h1
            className="text-xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Escáner QR / Código de Barras
          </h1>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] ml-[42px]">
          Escanea códigos para acceder rápidamente a proyectos, tareas, inventario y más
        </p>
      </div>

      {/* Quick Scan Button */}
      <button
        onClick={() => setScannerOpen(true)}
        className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-[var(--af-accent)]/10 via-[var(--af-accent)]/5 to-transparent border border-[var(--af-accent)]/20 cursor-pointer hover:border-[var(--af-accent)]/40 transition-all mb-6 group"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--af-accent)] flex items-center justify-center shadow-[var(--skeuo-shadow-btn)] group-hover:scale-105 transition-transform">
          <ScanLine size={28} className="stroke-background" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[16px] font-bold text-[var(--foreground)] mb-0.5">
            Iniciar Escaneo
          </div>
          <div className="text-[12px] text-[var(--muted-foreground)]">
            QR Code, EAN-13, UPC, Code128 y más formatos
          </div>
        </div>
        <ArrowRight size={20} className="text-[var(--af-accent)] group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Lookup Result */}
      {lookupResult && (
        <div className="card-elevated rounded-xl p-4 mb-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{lookupResult.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[var(--muted-foreground)] uppercase font-semibold tracking-wide">
                {lookupResult.type === 'project' ? 'Proyecto encontrado' :
                 lookupResult.type === 'task' ? 'Tarea encontrada' :
                 lookupResult.type === 'inventory' ? 'Producto de inventario' :
                 lookupResult.type === 'url' ? 'Enlace detectado' :
                 'Texto escaneado'}
              </div>
              <div className="text-[14px] font-semibold text-[var(--foreground)] truncate">
                {lookupResult.label}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={lookupResult.action}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            >
              {lookupResult.type === 'url' ? (
                <><ExternalLink size={14} /> Abrir enlace</>
              ) : lookupResult.type === 'text' ? (
                <><Copy size={14} /> Copiar texto</>
              ) : (
                <><ArrowRight size={14} /> Ir al recurso</>
              )}
            </button>
            <button
              onClick={() => setLookupResult(null)}
              className="px-3 py-2 rounded-lg text-[13px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* What you can scan */}
      <div className="mb-6">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Search size={15} className="text-[var(--muted-foreground)]" />
          ¿Qué puedes escanear?
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: FolderOpen, label: 'Proyectos', desc: 'ID o nombre del proyecto', color: 'text-blue-400 bg-blue-500/10' },
            { icon: CheckSquare, label: 'Tareas', desc: 'ID de tarea', color: 'text-emerald-400 bg-emerald-500/10' },
            { icon: Package, label: 'Inventario', desc: 'SKU o nombre de producto', color: 'text-amber-400 bg-amber-500/10' },
            { icon: LinkIcon, label: 'Enlaces', desc: 'URLs y códigos QR web', color: 'text-purple-400 bg-purple-500/10' },
          ].map((item) => (
            <div key={item.label} className="card-glass-subtle rounded-xl p-3">
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-2`}>
                <item.icon size={16} />
              </div>
              <div className="text-[13px] font-semibold text-[var(--foreground)]">{item.label}</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan History */}
      {history.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <History size={15} className="text-[var(--muted-foreground)]" />
              Historial de Escaneos ({history.length})
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-[11px] text-red-400 cursor-pointer hover:underline"
            >
              <Trash2 size={11} /> Limpiar
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="card-glass-subtle rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--af-bg3)] transition-colors"
                onClick={() => {
                  setLookupResult({
                    type: 'text',
                    label: entry.text,
                    icon: '📝',
                    action: () => {
                      navigator.clipboard.writeText(entry.text).catch(() => {});
                      showToast('Copiado al portapapeles');
                    },
                  });
                }}
              >
                <span className="text-lg">{entry.format.includes('QR') ? '📱' : '📊'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--foreground)] font-medium truncate">{entry.text}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    {entry.format} · {entry.timestamp.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyScanText(entry.text); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] cursor-pointer transition-colors bg-transparent border-none"
                >
                  <Copy size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Escanear Código"
        description="Apunta la cámara al código QR o de barras"
      />
    </div>
  );
}
