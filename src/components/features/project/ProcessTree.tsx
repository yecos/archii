'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  FolderOpen,
  Folder,
  Check,
  X,
} from 'lucide-react';
import { confirm } from '@/hooks/useConfirmDialog';
import type { ProcessNode } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ProcessTreeProps {
  processes: ProcessNode[];
  selectedProcessId: string | null;
  onSelectProcess: (processId: string | null) => void;
  onAddProcess: (parentId: string | null, name: string) => void;
  onRemoveProcess: (processId: string) => void;
  onRenameProcess: (processId: string, name: string) => void;
  taskCounts?: Record<string, number>;
  completedCounts?: Record<string, number>;
  label?: string;
}

/* -------------------------------------------------------------------------- */
/*  Inline Prompt (replaces window.prompt)                                    */
/* -------------------------------------------------------------------------- */

function InlinePrompt({
  message,
  placeholder,
  onConfirm,
  onCancel,
}: {
  message: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <div className="px-2 py-2">
      <div className="skeuo-panel rounded-lg p-3 space-y-2 animate-fadeIn">
        <div className="text-[12px] text-[var(--muted-foreground)]">{message}</div>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
          className="skeuo-input w-full text-[12px] px-3 py-1.5"
        />
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="skeuo-btn px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--af-accent)] text-white cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-all"
          >
            <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Crear</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Find whether a node is an ancestor of (or is) a given target id. */
function isAncestorOf(node: ProcessNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  return (node.children ?? []).some((c) => isAncestorOf(c, targetId));
}

/** Collect all ids in the subtree. */
function collectIds(node: ProcessNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

/* -------------------------------------------------------------------------- */
/*  Single-node row                                                           */
/* -------------------------------------------------------------------------- */

interface TreeNodeRowProps {
  node: ProcessNode;
  depth: number;
  selectedProcessId: string | null;
  onSelectProcess: (processId: string | null) => void;
  onAddProcess: (parentId: string | null, name: string) => void;
  onRemoveProcess: (processId: string) => void;
  onRenameProcess: (processId: string, name: string) => void;
  taskCounts?: Record<string, number>;
  completedCounts?: Record<string, number>;
}

function TreeNodeRow({
  node,
  depth,
  selectedProcessId,
  onSelectProcess,
  onAddProcess,
  onRemoveProcess,
  onRenameProcess,
  taskCounts,
  completedCounts,
}: TreeNodeRowProps) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = selectedProcessId === node.id;
  const taskCount = taskCounts?.[node.id] ?? 0;
  const completedCount = completedCounts?.[node.id] ?? 0;

  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the rename input when editing begins
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  /* ---- Handlers ---- */

  const handleSelect = useCallback(() => {
    onSelectProcess(node.id);
  }, [node.id, onSelectProcess]);

  const handleDoubleClick = useCallback(() => {
    setDraft(node.name);
    setEditing(true);
  }, [node.name]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== node.name) {
      onRenameProcess(node.id, trimmed);
    }
    setEditing(false);
  }, [draft, node.id, node.name, onRenameProcess]);

  const cancelRename = useCallback(() => {
    setDraft(node.name);
    setEditing(false);
  }, [node.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitRename();
      if (e.key === 'Escape') cancelRename();
    },
    [commitRename, cancelRename],
  );

  const handleAddChild = useCallback(() => {
    setAddingChild(true);
  }, []);

  const handleAddChildConfirm = useCallback(
    (name: string) => {
      onAddProcess(node.id, name);
      setAddingChild(false);
    },
    [node.id, onAddProcess],
  );

  const handleAddChildCancel = useCallback(() => {
    setAddingChild(false);
  }, []);

  const handleDelete = useCallback(async () => {
    const ok = await confirm({
      title: 'Eliminar proceso',
      description: `¿Eliminar "${node.name}" y todos sus hijos?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (ok) {
      onRemoveProcess(node.id);
    }
  }, [node.id, node.name, onRemoveProcess]);

  /* ---- Render ---- */

  return (
    <>
      {/* Row */}
      <div
        className="group relative animate-fadeIn"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onDoubleClick={handleDoubleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSelect();
          }}
          className={`
            flex items-center gap-2 rounded-xl px-3 py-2 transition-all cursor-pointer
            ${
              isSelected
                ? 'ring-1 ring-[var(--af-accent)]/30 bg-[var(--af-accent)]/5'
                : 'hover:bg-[var(--af-bg3)]'
            }
          `}
        >
          {/* Expand / collapse chevron */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md
                         hover:bg-[var(--af-bg3)] transition-colors"
              aria-label={expanded ? 'Colapsar' : 'Expandir'}
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              )}
            </button>
          ) : (
            /* Spacer to keep alignment */
            <span className="w-5 flex-shrink-0" />
          )}

          {/* Folder icon */}
          {hasChildren ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-[var(--af-accent)]" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" />
          )}

          {/* Name or rename input */}
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium
                         text-[var(--foreground)] outline-none
                         border-b border-[var(--af-accent)] focus:border-[var(--af-accent)]
                         px-0.5 py-0"
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]">
              {node.name}
            </span>
          )}

          {/* Task count badge */}
          {taskCount > 0 && (
            <span
              className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium
                         bg-[var(--af-accent)]/10 text-[var(--af-accent)]"
            >
              {completedCount}/{taskCount}
            </span>
          )}

          {/* Hover actions */}
          {!editing && (
            <span className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Add child */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChild();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md
                           hover:bg-[var(--af-accent)]/10 transition-colors"
                aria-label="Agregar proceso hijo"
                title="Agregar proceso hijo"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              </button>

              {/* Rename */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft(node.name);
                  setEditing(true);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md
                           hover:bg-[var(--af-accent)]/10 transition-colors"
                aria-label="Renombrar"
                title="Renombrar"
              >
                <Pencil className="w-3 h-3 text-[var(--muted-foreground)]" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md
                           hover:bg-red-500/10 transition-colors"
                aria-label="Eliminar"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3 text-[var(--muted-foreground)] hover:text-red-500" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Inline add-child prompt */}
      {addingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 24 + 12}px` }}>
          <InlinePrompt
            message="Nombre del nuevo proceso:"
            placeholder="Ej: Sub-proceso"
            onConfirm={handleAddChildConfirm}
            onCancel={handleAddChildCancel}
          />
        </div>
      )}

      {/* Children (rendered recursively) */}
      {hasChildren && expanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedProcessId={selectedProcessId}
            onSelectProcess={onSelectProcess}
            onAddProcess={onAddProcess}
            onRemoveProcess={onRemoveProcess}
            onRenameProcess={onRenameProcess}
            taskCounts={taskCounts}
            completedCounts={completedCounts}
          />
        ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  ProcessTree (top-level)                                                   */
/* -------------------------------------------------------------------------- */

export default function ProcessTree({
  processes,
  selectedProcessId,
  onSelectProcess,
  onAddProcess,
  onRemoveProcess,
  onRenameProcess,
  taskCounts,
  completedCounts,
  label,
}: ProcessTreeProps) {
  const [addingRoot, setAddingRoot] = useState(false);

  const handleAddRootConfirm = useCallback(
    (name: string) => {
      onAddProcess(null, name);
      setAddingRoot(false);
    },
    [onAddProcess],
  );

  const handleAddRootCancel = useCallback(() => {
    setAddingRoot(false);
  }, []);

  return (
    <section className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        {label && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </h3>
        )}
        <button
          type="button"
          onClick={() => setAddingRoot(true)}
          className="inline-flex items-center gap-1 text-[12px] font-medium
                     text-[var(--af-accent)] hover:text-[var(--af-accent)]/80
                     px-2 py-1 rounded-lg hover:bg-[var(--af-accent)]/10 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar proceso
        </button>
      </div>

      {/* Inline add-root prompt */}
      {addingRoot && (
        <InlinePrompt
          message={label ? `Nombre del nuevo proceso (${label}):` : 'Nombre del nuevo proceso:'}
          placeholder="Ej: Nuevo proceso"
          onConfirm={handleAddRootConfirm}
          onCancel={handleAddRootCancel}
        />
      )}

      {/* Tree */}
      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Folder className="w-10 h-10 text-[var(--muted-foreground)]/40 mb-2" />
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Sin procesos todavía
          </p>
          <p className="text-[11px] text-[var(--af-text3)] mt-1">
            Agrega un proceso para comenzar
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
          {processes.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              selectedProcessId={selectedProcessId}
              onSelectProcess={onSelectProcess}
              onAddProcess={onAddProcess}
              onRemoveProcess={onRemoveProcess}
              onRenameProcess={onRenameProcess}
              taskCounts={taskCounts}
              completedCounts={completedCounts}
            />
          ))}
        </div>
      )}
    </section>
  );
}
