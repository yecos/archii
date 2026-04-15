'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { NAV_ITEMS, NAV_GROUPS } from '@/lib/types';
import { Search, ArrowRight, FolderKanban, CheckSquare, Users, Store, Building2, Layout } from 'lucide-react';

/* ===== Types ===== */

interface SearchResultItem {
  id: string;
  category: 'nav' | 'project' | 'task' | 'team' | 'supplier' | 'company';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  /** Extra metadata rendered in the result row (e.g. status badge, priority) */
  badge?: React.ReactNode;
}

/* ===== Helpers ===== */

/** Case-insensitive includes check */
function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/** Highlight matching substring with accent colour */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--af-accent)] font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ===== Component ===== */

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { navigateTo, openModal } = useUI();
  const { teamUsers } = useAuth();
  const { projects, tasks, suppliers, companies, openProject, openEditTask } = useFirestore();

  // Local state
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Debounce query at 200ms ----
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // ---- Auto-focus input when opened ----
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      // Small delay so the animation starts before focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // ---- Lock body scroll when open ----
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ---- Build search results ----
  const results = useMemo((): SearchResultItem[] => {
    const q = debouncedQuery.trim();
    const items: SearchResultItem[] = [];
    const MAX = 5;

    // Navigation — search across NAV_ITEMS and NAV_GROUPS items
    const seenIds = new Set<string>();
    const allNavItems = [...NAV_ITEMS, ...NAV_GROUPS.flatMap(g => g.items)];
    const navMatches = allNavItems.filter(item => !q || matches(item.label, q));
    for (const item of navMatches.slice(0, MAX)) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      items.push({
        id: `nav-${item.id}`,
        category: 'nav',
        title: item.label,
        subtitle: 'Navegación',
        icon: <span className="text-base leading-none">{item.icon}</span>,
      });
    }

    // Projects
    const projMatches = projects.filter(p => !q || matches(p.data.name, q) || matches(p.data.status, q));
    for (const p of projMatches.slice(0, MAX)) {
      items.push({
        id: `project-${p.id}`,
        category: 'project',
        title: p.data.name,
        subtitle: `Proyecto · ${p.data.client || 'Sin cliente'}`,
        icon: <FolderKanban size={16} />,
        badge: (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/20">
            {p.data.status}
          </span>
        ),
      });
    }

    // Tasks
    const taskMatches = tasks.filter(
      t => !q || matches(t.data.title, q)
    );
    for (const t of taskMatches.slice(0, MAX)) {
      const proj = projects.find(p => p.id === t.data.projectId);
      items.push({
        id: `task-${t.id}`,
        category: 'task',
        title: t.data.title,
        subtitle: proj ? `Tarea · ${proj.data.name}` : 'Tarea',
        icon: <CheckSquare size={16} />,
        badge: (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            t.data.priority === 'Urgente' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            t.data.priority === 'Alta' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            t.data.priority === 'Media' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border border-[var(--border)]'
          }`}>
            {t.data.priority}
          </span>
        ),
      });
    }

    // Team
    const teamMatches = teamUsers.filter(u => !q || matches(u.data.name, q) || matches(u.data.role || '', q));
    for (const u of teamMatches.slice(0, MAX)) {
      items.push({
        id: `team-${u.id}`,
        category: 'team',
        title: u.data.name,
        subtitle: u.data.role || 'Equipo',
        icon: <Users size={16} />,
      });
    }

    // Suppliers
    const supMatches = suppliers.filter(s => !q || matches(s.data.name, q) || matches(s.data.category, q));
    for (const s of supMatches.slice(0, MAX)) {
      items.push({
        id: `supplier-${s.id}`,
        category: 'supplier',
        title: s.data.name,
        subtitle: `Proveedor · ${s.data.category}`,
        icon: <Store size={16} />,
      });
    }

    // Companies
    const compMatches = companies.filter(c => !q || matches(c.data.name, q) || matches(c.data.nit, q));
    for (const c of compMatches.slice(0, MAX)) {
      items.push({
        id: `company-${c.id}`,
        category: 'company',
        title: c.data.name,
        subtitle: c.data.nit ? `Empresa · NIT ${c.data.nit}` : 'Empresa',
        icon: <Building2 size={16} />,
      });
    }

    return items;
  }, [debouncedQuery, projects, tasks, teamUsers, suppliers, companies]);

  // ---- Group results by category ----
  const groupedResults = useMemo(() => {
    const groups: { key: SearchResultItem['category']; label: string; icon: React.ReactNode; items: SearchResultItem[] }[] = [
      { key: 'nav', label: 'Navegación', icon: <Layout size={14} />, items: [] },
      { key: 'project', label: 'Proyectos', icon: <FolderKanban size={14} />, items: [] },
      { key: 'task', label: 'Tareas', icon: <CheckSquare size={14} />, items: [] },
      { key: 'team', label: 'Equipo', icon: <Users size={14} />, items: [] },
      { key: 'supplier', label: 'Proveedores', icon: <Store size={14} />, items: [] },
      { key: 'company', label: 'Empresas', icon: <Building2 size={14} />, items: [] },
    ];
    for (const r of results) {
      const g = groups.find(g => g.key === r.category);
      if (g) g.items.push(r);
    }
    return groups.filter(g => g.items.length > 0);
  }, [results]);

  // Quick actions (shown only when search is empty)
  const quickActions = useMemo(() => [
    { label: 'Nuevo proyecto', icon: <FolderKanban size={15} />, action: () => { openModal('project'); onClose(); } },
    { label: 'Nueva tarea', icon: <CheckSquare size={15} />, action: () => { openModal('task'); onClose(); } },
    { label: 'Nuevo gasto', icon: <span className="text-sm leading-none">💰</span>, action: () => { openModal('expense'); onClose(); } },
  ], [openModal, onClose]);

  // ---- Reset selected index when results change ----
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // ---- Scroll selected item into view ----
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // ---- Handle selection ----
  const handleSelect = useCallback((item: SearchResultItem) => {
    switch (item.category) {
      case 'nav': {
        const navId = item.id.replace('nav-', '');
        navigateTo(navId);
        break;
      }
      case 'project': {
        const projId = item.id.replace('project-', '');
        openProject(projId);
        break;
      }
      case 'task': {
        const taskId = item.id.replace('task-', '');
        const task = tasks.find(t => t.id === taskId);
        if (task) openEditTask(task);
        break;
      }
      case 'team':
        navigateTo('team');
        break;
      case 'supplier':
        navigateTo('suppliers');
        break;
      case 'company':
        navigateTo('companies');
        break;
    }
    onClose();
  }, [navigateTo, openProject, openEditTask, tasks, onClose]);

  // ---- Keyboard navigation ----
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  // ---- Close on backdrop click ----
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const q = debouncedQuery.trim();

  return (
    <div
      ref={containerRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] animate-fadeIn"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-slideUp"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--muted-foreground)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar proyectos, tareas, equipo..."
            className="flex-1 bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)] bg-[var(--af-bg3)] border border-[var(--border)] rounded-md px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto overscroll-contain">
          {/* Quick actions — shown only when search is empty */}
          {!q && quickActions.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-1 mb-1.5">
                Acciones rápidas
              </p>
              <div className="space-y-0.5">
                {quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--af-bg3)] active:bg-[var(--af-bg4)]"
                  >
                    <span className="text-[var(--muted-foreground)]">{qa.icon}</span>
                    <span className="text-sm text-[var(--foreground)]">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {q && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--af-bg3)] flex items-center justify-center mb-3">
                <Search size={20} className="text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm text-[var(--foreground)] font-medium mb-1">Sin resultados</p>
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                No se encontraron resultados para &quot;{q}&quot;
              </p>
            </div>
          )}

          {/* Grouped results */}
          {results.length > 0 && (
            <div className="py-2">
              {groupedResults.map(group => (
                <div key={group.key} className="mb-1 last:mb-0">
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-4 py-1.5">
                    <span className="text-[var(--muted-foreground)]">{group.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-[var(--af-text3)]">{group.items.length}</span>
                  </div>

                  {/* Items */}
                  {group.items.map(item => {
                    const globalIndex = results.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-left transition-colors
                          ${isSelected
                            ? 'bg-[var(--af-bg3)] border-l-2 border-[var(--af-accent)]'
                            : 'border-l-2 border-transparent hover:bg-[var(--af-bg4)]'
                          }
                        `}
                      >
                        {/* Icon */}
                        <span className={`shrink-0 ${isSelected ? 'text-[var(--af-accent)]' : 'text-[var(--muted-foreground)]'}`}>
                          {item.icon}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--foreground)] truncate">
                            <Highlight text={item.title} query={q} />
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)] truncate">{item.subtitle}</div>
                        </div>

                        {/* Badge (e.g. status, priority) */}
                        {item.badge && (
                          <span className="shrink-0 ml-1">{item.badge}</span>
                        )}

                        {/* Arrow */}
                        <ArrowRight size={14} className={`shrink-0 ml-1 transition-colors ${isSelected ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
          <span>
            <kbd className="bg-[var(--af-bg3)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">↑↓</kbd>
            {' '}navegar
            <span className="mx-1.5">·</span>
            <kbd className="bg-[var(--af-bg3)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">↵</kbd>
            {' '}seleccionar
            <span className="mx-1.5">·</span>
            <kbd className="bg-[var(--af-bg3)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">esc</kbd>
            {' '}cerrar
          </span>
          <span className="sm:hidden">Desliza para más</span>
        </div>
      </div>
    </div>
  );
}
