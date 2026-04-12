'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import { statusColor } from '@/lib/helpers';

export default function OneDriveScreen() {
  const { msConnected, projects, doMicrosoftLogin, disconnectMicrosoft, openOneDriveForProject } = useApp();

  return (<div className="animate-fadeIn space-y-5">
    {!msConnected ? (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">☁️</div>
        <div className="text-[15px] font-semibold mb-2">Conectar OneDrive</div>
        <div className="text-xs text-[var(--muted-foreground)] mb-4 max-w-md mx-auto">Conecta tu cuenta de Microsoft para gestionar archivos de proyectos directamente en OneDrive. Cada proyecto tendrá su propia carpeta en la nube.</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 max-w-lg mx-auto">
          <div className="bg-[var(--af-bg3)] rounded-xl p-3 text-center"><div className="text-lg mb-1">☁️</div><div className="text-[11px] font-medium">Almacenamiento en la nube</div></div>
          <div className="bg-[var(--af-bg3)] rounded-xl p-3 text-center"><div className="text-lg mb-1">📁</div><div className="text-[11px] font-medium">Carpeta por proyecto</div></div>
          <div className="bg-[var(--af-bg3)] rounded-xl p-3 text-center"><div className="text-lg mb-1">🔄</div><div className="text-[11px] font-medium">Sincronización</div></div>
        </div>
        <button className="bg-[#0078d4] hover:bg-[#106ebe] text-white border-none rounded-xl px-6 py-3 text-sm font-semibold cursor-pointer transition-colors" onClick={() => doMicrosoftLogin()}>
          Conectar con Microsoft
        </button>
      </div>
    ) : (
      <>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
          <span className="text-emerald-400 text-sm">✓</span>
          <span className="text-sm text-emerald-400">Conectado con Microsoft OneDrive</span>
          <button className="ml-auto text-xs text-red-400 hover:text-red-300 cursor-pointer" onClick={disconnectMicrosoft}>Desconectar</button>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">Los archivos se organizan en <strong>OneDrive/ArchiFlow/[Proyecto]/</strong>. Abre un proyecto para ver sus archivos.</div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[15px] font-semibold mb-4">Proyectos — Abrir en OneDrive</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map(p => (
              <button key={p.id} className="bg-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-3 text-left cursor-pointer hover:border-[#0078d4] transition-all flex items-center gap-3" onClick={() => openOneDriveForProject(p.data.name)}>
                <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">📁</div>
                <div>
                  <div className="text-sm font-medium">{p.data.name}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">{statusColor(p.data.status)} <span className="ml-1">{p.data.status}</span></div>
                </div>
              </button>
            ))}
            {projects.length === 0 && <div className="text-sm text-[var(--muted-foreground)] col-span-2 text-center py-4">No hay proyectos creados</div>}
          </div>
        </div>
      </>
    )}
  </div>);
}
