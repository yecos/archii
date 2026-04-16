'use client';
import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { getInitials, avatarColor } from '@/lib/helpers';
import { ROLE_ICONS, NAV_GROUPS } from '@/lib/types';
import type { TeamUser, Project, Task, GalleryPhoto, InvProduct } from '@/lib/types';
import {
  LayoutGrid, User, Folder, ClipboardCheck, MessageCircle, DollarSign, FileText, Camera, Image,
  Package, Settings, Store, Users, Calendar, Globe, Building2, ChevronLeft, ChevronRight, Home,
  Sparkles, Timer, Receipt, BarChart3, ChevronDown, ClipboardList, ShoppingCart,
  FileSearch, ClipboardCheck as InspectionIcon, FilePen, HardHat,
  Briefcase, Palette, GalleryHorizontalEnd, FileSpreadsheet, LayoutTemplate,
  Download, ArrowLeftRight, Gem, Brain, WifiOff, Zap, ScanLine, ClipboardPen, Film, Link, MapPin, HardDriveDownload,
} from 'lucide-react';

/** Firebase auth user — loaded via CDN, so no npm type available. */
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface SidebarProps {
  screen: string;
  navigateTo: (s: string, projId?: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string;
  initials: string;
  authUser: FirebaseUser | null;
  teamUsers: TeamUser[];
  isEmailAdmin: boolean;
  projects: Project[];
  tasks: Task[];
  pendingCount: number;
  galleryPhotos: GalleryPhoto[];
  invLowStock: InvProduct[];
  isAdmin: boolean;
}

/* ===== Icon mapping for nav groups & items ===== */

const GROUP_ICONS: Record<string, React.ReactNode> = {
  principal: <LayoutGrid size={14} className="stroke-current" />,
  projects: <Folder size={14} className="stroke-current" />,
  finances: <DollarSign size={14} className="stroke-current" />,
  field: <HardHat size={14} className="stroke-current" />,
  operations: <Package size={14} className="stroke-current" />,
  communication: <MessageCircle size={14} className="stroke-current" />,
  tools: <Briefcase size={14} className="stroke-current" />,
  system: <Settings size={14} className="stroke-current" />,
};

const ITEM_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutGrid size={18} className="stroke-current" />,
  profile: <User size={18} className="stroke-current" />,
  projects: <Folder size={18} className="stroke-current" />,
  tasks: <ClipboardCheck size={18} className="stroke-current" />,
  gantt: <Calendar size={18} className="stroke-current" />,
  timeTracking: <Timer size={18} className="stroke-current" />,
  budget: <DollarSign size={18} className="stroke-current" />,
  quotations: <ClipboardList size={18} className="stroke-current" />,
  invoices: <Receipt size={18} className="stroke-current" />,
  purchaseOrders: <ShoppingCart size={18} className="stroke-current" />,
  obra: <Camera size={18} className="stroke-current" />,
  fieldNotes: <FilePen size={18} className="stroke-current" />,
  photoLog: <Image size={18} className="stroke-current" />,
  inspections: <FileSearch size={18} className="stroke-current" />,
  inventory: <Package size={18} className="stroke-current" />,
  suppliers: <Store size={18} className="stroke-current" />,
  companies: <Building2 size={18} className="stroke-current" />,
  chat: <MessageCircle size={18} className="stroke-current" />,
  calendar: <Calendar size={18} className="stroke-current" />,
  portal: <Globe size={18} className="stroke-current" />,
  files: <FileText size={18} className="stroke-current" />,
  gallery: <GalleryHorizontalEnd size={18} className="stroke-current" />,
  reports: <BarChart3 size={18} className="stroke-current" />,
  templates: <LayoutTemplate size={18} className="stroke-current" />,
  team: <Users size={18} className="stroke-current" />,
  settings: <Palette size={18} className="stroke-current" />,
  admin: <Settings size={18} className="stroke-current" />,
  install: <Download size={18} className="stroke-current" />,
  changeOrders: <ArrowLeftRight size={18} className="stroke-current" />,
  profitability: <Gem size={18} className="stroke-current" />,
  predictiveAI: <Brain size={18} className="stroke-current" />,
  offlineStatus: <WifiOff size={18} className="stroke-current" />,
  reportGenerator: <Sparkles size={18} className="stroke-current" />,
  automations: <Zap size={18} className="stroke-current" />,
  qrScanner: <ScanLine size={18} className="stroke-current" />,
  formBuilder: <ClipboardPen size={18} className="stroke-current" />,
  timeLapse: <Film size={18} className="stroke-current" />,
  apiWebhooks: <Link size={18} className="stroke-current" />,
  geolocation: <MapPin size={18} className="stroke-current" />,
  backup: <HardDriveDownload size={18} className="stroke-current" />,
};

/* ===== Badge mapping ===== */

interface BadgeMap {
  [itemId: string]: number | undefined;
}

/* ===== Collapsible Group Component ===== */

function CollapsibleGroup({
  group,
  expanded,
  onToggle,
  screen,
  navigateTo,
  closeMobile,
  sidebarCollapsed,
  badges,
}: {
  group: typeof NAV_GROUPS[number];
  expanded: boolean;
  onToggle: () => void;
  screen: string;
  navigateTo: (s: string) => void;
  closeMobile: () => void;
  sidebarCollapsed: boolean;
  badges: BadgeMap;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const hasActiveItem = group.items.some(item => item.id === screen);

  // Measure content height for animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, sidebarCollapsed]);

  const handleItemClick = useCallback((id: string) => {
    navigateTo(id);
    closeMobile();
  }, [navigateTo, closeMobile]);

  // Collapsed sidebar: show just group icon as a button
  if (sidebarCollapsed) {
    return (
      <div className="relative mb-0.5">
        <button
          onClick={onToggle}
          className="group/collapsible w-full flex items-center justify-center h-9 rounded-lg transition-all cursor-pointer"
          title={group.label}
        >
          <span className={`transition-colors ${hasActiveItem ? 'text-[var(--af-accent2)]' : 'text-[var(--muted-foreground)] group-hover/collapsible:text-[var(--foreground)]'}`}>
            {GROUP_ICONS[group.id] || <span className="text-sm">{group.icon}</span>}
          </span>
        </button>
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--popover)] border border-[var(--border)] rounded-md shadow-lg text-[11px] font-medium text-[var(--popover-foreground)] whitespace-nowrap opacity-0 pointer-events-none group-hover/collapsible:opacity-100 transition-opacity z-[200]">
          {group.label}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10.5px] font-semibold tracking-wider uppercase transition-all cursor-pointer ${
          hasActiveItem
            ? 'text-[var(--af-accent2)] bg-[var(--af-accent)]/5'
            : 'text-[var(--af-text3)] hover:text-[var(--muted-foreground)] hover:bg-[var(--skeuo-raised)]'
        }`}
      >
        <span className="shrink-0">{GROUP_ICONS[group.id] || <span className="text-xs">{group.icon}</span>}</span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Collapsible items */}
      <div
        style={{
          maxHeight: expanded ? (contentHeight ?? 200) + 'px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div ref={contentRef} className="pt-0.5">
          {group.items.map((item) => {
            const isActive = screen === item.id;
            const badge = badges[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 pl-4 pr-2.5 py-2 rounded-lg cursor-pointer text-[13.5px] mb-0.5 transition-all ${
                  isActive
                    ? 'bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] text-[var(--af-accent2)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => handleItemClick(item.id)}
              >
                {ITEM_ICONS[item.id] || <span className="text-sm">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    className={`skeuo-badge text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      item.id === 'tasks' ? 'bg-red-500 text-white' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===== Main Sidebar Component ===== */

export default React.memo(function Sidebar({
  screen, navigateTo, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed,
  userName, initials, authUser, teamUsers, isEmailAdmin,
  projects, tasks, pendingCount, galleryPhotos, invLowStock, isAdmin,
}: SidebarProps) {
  const tasksWithDueDate = useMemo(() => tasks.filter(t => t.data.dueDate && t.data.status !== 'Completado'), [tasks]);

  // ─── Badge data ───
  const badges: BadgeMap = useMemo(() => ({
    projects: projects.length || undefined,
    tasks: pendingCount > 0 ? pendingCount : undefined,
    gallery: galleryPhotos.length > 0 ? galleryPhotos.length : undefined,
    inventory: invLowStock.length > 0 ? invLowStock.length : undefined,
    team: teamUsers.length || undefined,
    calendar: tasksWithDueDate.length > 0 ? tasksWithDueDate.length : undefined,
  }), [projects.length, pendingCount, galleryPhotos.length, invLowStock.length, teamUsers.length, tasksWithDueDate.length]);

  // ─── Expanded groups state with localStorage persistence ───
  const STORAGE_KEY = 'archiflow-nav-expanded';

  const getDefaultExpanded = useCallback((): Record<string, boolean> => {
    const defaults: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      defaults[group.id] = group.defaultOpen ?? false;
    }
    return defaults;
  }, []);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => getDefaultExpanded());

  // Load expanded groups from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults so new groups get their defaultOpen
        const defaults = getDefaultExpanded();
        setExpandedGroups(prev => ({ ...defaults, ...parsed, ...prev }));
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist expanded state (only after initial load from localStorage)
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
    } catch { /* ignore */ }
  }, [expandedGroups]);

  // Auto-expand the group containing the current screen
  useEffect(() => {
    const currentGroup = NAV_GROUPS.find(g => g.items.some(item => item.id === screen));
    if (currentGroup && !expandedGroups[currentGroup.id]) {
      setExpandedGroups(prev => ({ ...prev, [currentGroup.id]: true }));
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  /* ─── Sidebar nav scroll fade indicator ─── */
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollTop, setCanScrollTop] = useState(false);
  const [canScrollBottom, setCanScrollBottom] = useState(false);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollTop(el.scrollTop > 4);
    setCanScrollBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scrollMaskStyle = (canScrollTop || canScrollBottom)
    ? { maskImage: 'linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)' as const }
    : {};

  // ─── Swipe gesture for sidebar open/close on mobile ───
  const touchRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startTime: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchRef.current) return;
    const { startX, startTime } = touchRef.current;
    const endX = e.changedTouches[0].clientX;
    const elapsed = Date.now() - startTime;
    const deltaX = endX - startX;
    touchRef.current = null;

    if (elapsed > 300) return;

    if (startX < 30 && deltaX > 50 && !sidebarOpen) {
      setSidebarOpen(true);
    }
    if (sidebarOpen && startX - endX > 50) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const closeMobile = useCallback(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [setSidebarOpen]);

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px] md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full bg-[var(--skeuo-raised)] border-r border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised)] flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${sidebarCollapsed ? 'w-[68px]' : 'w-[270px] xl:w-[280px]'} max-md:!w-[270px]`}>
        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="skeuo-btn hidden md:flex items-center justify-center h-8 w-8 self-end mr-2 mt-2 rounded-lg text-[var(--muted-foreground)] transition-colors cursor-pointer" title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          <ChevronLeft size={16} className="transition-transform" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* Logo header */}
        <div className="skeuo-panel p-4 pb-3 border-b border-[var(--skeuo-edge-light)] flex items-center gap-2.5" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--skeuo-edge-light)', boxShadow: 'inset 0 -1px 0 var(--skeuo-edge-dark), 0 1px 0 var(--skeuo-edge-light)' }}>
          <div className="w-8 h-8 bg-[var(--af-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <Home size={20} strokeWidth={2} className="stroke-background" />
          </div>
          <div className={`transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}>
            <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg flex items-center gap-1.5">ArchiFlow <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/15 text-[var(--af-accent)]" style={{ fontFamily: 'system-ui, sans-serif' }}>2.0</span></div>
            <div className="text-[10px] text-[var(--af-text3)]">Premium</div>
          </div>
        </div>

        {/* Navigation groups */}
        <div ref={navRef} className="flex-1 overflow-y-auto py-3 px-3" style={scrollMaskStyle}>
          {NAV_GROUPS.map(group => (
            <CollapsibleGroup
              key={group.id}
              group={group}
              expanded={expandedGroups[group.id]}
              onToggle={() => toggleGroup(group.id)}
              screen={screen}
              navigateTo={(s) => navigateTo(s, null)}
              closeMobile={closeMobile}
              sidebarCollapsed={sidebarCollapsed}
              badges={badges}
            />
          ))}
        </div>

        {/* AI Agent Button */}
        <div className="px-3 pb-2">
          <button
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] hover:bg-[var(--af-accent)]/20 transition-all font-medium"
            onClick={() => {
              import('@/stores/ui-store').then(({ useUIStore }) => {
                useUIStore.getState().setAIAgentOpen(true);
              });
              closeMobile();
            }}
          >
            <Sparkles size={16} className="stroke-current shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span>Agente IA</span>
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/20">FREE</span>
              </>
            )}
          </button>
        </div>

        {/* User profile footer */}
        <div
          className="skeuo-divider border-t border-[var(--skeuo-edge-light)] p-3 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--skeuo-raised)] hover:shadow-[var(--skeuo-shadow-raised-sm)] transition-all"
          onClick={() => navigateTo('profile')}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${avatarColor(authUser?.uid ?? '')}`}
            style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}
          >
            {authUser?.photoURL ? '' : initials}
          </div>
          <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'md:hidden md:w-0' : 'md:block'}`}>
            <div className="text-[13px] font-medium truncate">{userName}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              {(() => {
                const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro';
                const displayRole = isEmailAdmin ? 'Admin' : myRole;
                return <>{ROLE_ICONS[displayRole] || <User size={14} className="inline" />} {displayRole}</>;
              })()}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});
