'use client';

import React, { useRef, useState } from 'react';
import { Download, FolderOpen, HardDrive, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useNasStorage, type NasFileItem } from '@/hooks/useNasStorage';

function formatBytes(value?: number) {
  if (!value || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

function fileIcon(item: NasFileItem) {
  if (item.isDirectory) return '📁';
  const type = item.mimeType || '';
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf')) return '📄';
  if (type.startsWith('video/')) return '🎬';
  if (/\.(dwg|dxf|rvt|skp)$/i.test(item.name)) return '📐';
  if (/\.(xlsx?|csv)$/i.test(item.name)) return '📊';
  if (/\.(docx?|txt)$/i.test(item.name)) return '📝';
  return '📎';
}

export default function NasStoragePanel({
  tenantId,
  projectId,
  projectName,
  showToast,
}: {
  tenantId: string | null;
  projectId: string | null;
  projectName: string;
  showToast?: (message: string, type?: string) => void;
}) {
  const nas = useNasStorage(tenantId, projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  if (nas.available === null || nas.available === false) return null;

  const notify = (message: string, type?: string) => {
    if (showToast) showToast(message, type);
  };

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    setBusyItem(key);
    try {
      await action();
      if (success) notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Operación NAS fallida', 'error');
    } finally {
      setBusyItem(null);
    }
  };

  const createFolder = async () => {
    const name = window.prompt('Nombre de la nueva carpeta');
    if (!name?.trim()) return;
    await run('new-folder', () => nas.createFolder(name), 'Carpeta creada');
  };

  const renameItem = async (item: NasFileItem) => {
    const name = window.prompt('Nuevo nombre', item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    await run(item.path, () => nas.rename(item, name), 'Elemento renombrado');
  };

  const deleteItem = async (item: NasFileItem) => {
    const ok = window.confirm(
      `¿Eliminar "${item.name}" de la NAS? Esta acción afecta el archivo real del proyecto.`
    );
    if (!ok) return;
    await run(item.path, () => nas.remove(item), 'Elemento eliminado');
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run('upload', () => nas.upload(file), `${file.name} subido a la NAS`);
  };

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-[var(--card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-emerald-500/5 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <HardDrive size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">S10-NAS · NEXO</span>
              <span className={`h-2 w-2 rounded-full ${nas.online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {nas.online ? 'ONLINE' : 'DEGRADED'}
              </span>
            </div>
            <div className="truncate text-[10px] text-[var(--muted-foreground)]">
              Projects/{projectId} · {projectName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void nas.list()}
            disabled={nas.loading}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--af-bg3)] px-2.5 py-1.5 text-[11px] hover:bg-[var(--af-bg4)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={nas.loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button
            type="button"
            onClick={() => void createFolder()}
            disabled={!nas.initialized || !!busyItem}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400 disabled:opacity-40"
          >
            <Plus size={12} /> Carpeta
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!nas.initialized || !!busyItem}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <Upload size={12} /> Subir
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
        </div>
      </div>

      {nas.error && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-400">
          {nas.error}
        </div>
      )}

      {!nas.initialized ? (
        <div className="p-8 text-center">
          <HardDrive className="mx-auto mb-3 text-emerald-400" size={30} />
          <div className="mb-1 text-sm font-semibold">Inicializar almacenamiento del proyecto</div>
          <div className="mx-auto mb-4 max-w-lg text-xs text-[var(--muted-foreground)]">
            Se creará una carpeta privada para este proyecto en la NAS de NEXO con Planos, Renders,
            Presupuestos, Contratos, Fotos y Entregables.
          </div>
          <button
            type="button"
            onClick={() => void run('ensure', nas.ensureProjectStorage, 'Almacenamiento NAS inicializado')}
            disabled={nas.loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {nas.loading ? 'Inicializando…' : 'Inicializar S10-NAS'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex min-h-[38px] items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-4 py-2 text-[11px]">
            <button
              type="button"
              onClick={() => void nas.list('')}
              className="shrink-0 border-none bg-transparent font-medium text-emerald-400"
            >
              S10-NAS
            </button>
            {nas.breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.path}>
                <span className="text-[var(--af-text3)]">/</span>
                <button
                  type="button"
                  onClick={() => void nas.list(crumb.path)}
                  className="max-w-[160px] truncate border-none bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {nas.loading ? (
            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">Cargando NAS…</div>
          ) : nas.items.length === 0 ? (
            <div className="p-8 text-center text-[var(--af-text3)]">
              <div className="mb-2 text-3xl">📂</div>
              <div className="text-sm">Carpeta vacía</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {nas.currentPath && (
                <button
                  type="button"
                  onClick={() => void nas.goUp()}
                  className="flex w-full items-center gap-2 bg-transparent px-4 py-2 text-left text-[11px] text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)]"
                >
                  ↩ Subir un nivel
                </button>
              )}

              {nas.items.map((item) => (
                <div
                  key={item.path}
                  className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--af-bg3)]"
                >
                  <button
                    type="button"
                    onClick={() => item.isDirectory ? void nas.openFolder(item) : void nas.download(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 border-none bg-transparent text-left"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--af-bg3)] text-base">
                      {fileIcon(item)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{item.name}</div>
                      <div className="text-[10px] text-[var(--af-text3)]">
                        {item.isDirectory ? 'Carpeta' : formatBytes(item.size)}
                        {item.lastModified ? ` · ${new Date(item.lastModified).toLocaleDateString('es-CO')}` : ''}
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    {item.isDirectory ? (
                      <button
                        type="button"
                        title="Abrir carpeta"
                        onClick={() => void nas.openFolder(item)}
                        className="rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--af-bg4)]"
                      >
                        <FolderOpen size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Descargar"
                        onClick={() => void run(item.path + ':download', () => nas.download(item))}
                        className="rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--af-bg4)]"
                      >
                        <Download size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Renombrar"
                      onClick={() => void renameItem(item)}
                      className="rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--af-bg4)]"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => void deleteItem(item)}
                      className="rounded-md border-none bg-transparent p-1.5 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
