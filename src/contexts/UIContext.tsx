'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/ui-store';
import { SCREEN_TITLES } from '@/lib/types';

/* ===== DOM Toast Fallback (inline — funciona siempre, sin depender de imports) ===== */
type ToastType = 'success' | 'error' | 'warning' | 'info';
function showToastDOM(message: string, type: ToastType = 'info', duration = 4500) {
  if (typeof document === 'undefined') return;
  try {
    let container = document.getElementById('af-dom-toast-container');
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.id = 'af-dom-toast-container';
      container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
      document.body.appendChild(container);
    }
    const colors: Record<string, {bg:string;border:string;color:string;icon:string}> = {
      success:{bg:'rgba(16,185,129,0.18)',border:'rgba(16,185,129,0.5)',color:'#34d399',icon:'✓'},
      error:{bg:'rgba(239,68,68,0.18)',border:'rgba(239,68,68,0.5)',color:'#f87171',icon:'✕'},
      warning:{bg:'rgba(245,158,11,0.18)',border:'rgba(245,158,11,0.5)',color:'#fbbf24',icon:'⚠'},
      info:{bg:'rgba(59,130,246,0.18)',border:'rgba(59,130,246,0.5)',color:'#60a5fa',icon:'ℹ'},
    };
    const c = colors[type] || colors.info;
    const el = document.createElement('div');
    el.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:500;line-height:1.4;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 24px rgba(0,0,0,0.25);max-width:420px;opacity:0;transform:translateY(-12px) scale(0.95);transition:opacity 0.3s ease,transform 0.3s ease;white-space:nowrap;';
    el.style.background = c.bg;
    el.style.border = '1px solid ' + c.border;
    el.style.color = c.color;
    const icon = document.createElement('span');
    icon.textContent = c.icon;
    icon.style.cssText = 'flex-shrink:0;font-size:14px;font-weight:700;';
    el.appendChild(icon);
    const msg = document.createElement('span');
    msg.textContent = message;
    el.appendChild(msg);
    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'flex-shrink:0;background:none;border:none;color:' + c.color + ';font-size:18px;cursor:pointer;padding:0 2px;opacity:0.7;margin-left:4px;';
    close.onclick = function() { el.style.opacity='0'; el.style.transform='translateY(-12px) scale(0.95)'; setTimeout(function(){el.remove();},300); };
    el.appendChild(close);
    container.appendChild(el);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.opacity='1'; el.style.transform='translateY(0) scale(1)'; }); });
    setTimeout(function(){ el.style.opacity='0'; el.style.transform='translateY(-12px) scale(0.95)'; setTimeout(function(){ if(el.parentNode) el.remove(); },300); }, duration);
  } catch(e) { console.error('[ArchiFlow] UI: showToast DOM manipulation failed:', e); }
}

/* ===== UI CONTEXT ===== */
interface UIContextType {
  // Navigation
  screen: string;
  setScreen: React.Dispatch<React.SetStateAction<string>>;
  selectedProjectId: string | null;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCompanyId: string | null;
  setSelectedCompanyId: React.Dispatch<React.SetStateAction<string | null>>;
  navigateTo: (s: string, projId?: string | null) => void;
  navigateToRef: React.MutableRefObject<(s: string, projId?: string | null) => void>;

  // Sidebar / Layout
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  chatMobileShow: boolean;
  setChatMobileShow: React.Dispatch<React.SetStateAction<boolean>>;
  taskViewMode: 'list' | 'kanban';
  setTaskViewMode: React.Dispatch<React.SetStateAction<'list' | 'kanban'>>;
  calView: 'monthly' | 'weekly';
  setCalView: React.Dispatch<React.SetStateAction<'monthly' | 'weekly'>>;

  // Theme (derived from next-themes for backward compatibility)
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  toggleTheme: () => void;

  // PWA Install
  installPrompt: any;
  setInstallPrompt: React.Dispatch<React.SetStateAction<any>>;
  showInstallBanner: boolean;
  setShowInstallBanner: React.Dispatch<React.SetStateAction<boolean>>;
  isInstalled: boolean;
  setIsInstalled: React.Dispatch<React.SetStateAction<boolean>>;
  showInstallGuide: boolean;
  setShowInstallGuide: React.Dispatch<React.SetStateAction<boolean>>;
  isStandalone: boolean;
  setIsStandalone: React.Dispatch<React.SetStateAction<boolean>>;
  handleInstall: () => Promise<void>;
  dismissInstallBanner: () => void;
  platform: string;

  // Modals & Forms
  modals: Record<string, boolean>;
  setModals: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  openModal: (n: string) => void;
  closeModal: (n: string) => void;
  forms: Record<string, any>;
  setForms: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  // Toast
  showToast: (msg: string, type?: string) => void;

  // Misc
  screenTitles: typeof SCREEN_TITLES;
}

const UIContext = createContext<UIContextType | null>(null);

export default function UIProvider({ children }: { children: React.ReactNode }) {
  // Navigation
  const [screen, setScreen] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Sidebar / Layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatMobileShow, setChatMobileShow] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');
  const [calView, setCalView] = useState<'monthly' | 'weekly'>('monthly');

  // Theme — delegates to next-themes
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';
  const setDarkMode = useCallback((v: boolean) => setNextTheme(v ? 'dark' : 'light'), [setNextTheme]);
  const toggleTheme = useCallback(() => setNextTheme(darkMode ? 'light' : 'dark'), [darkMode, setNextTheme]);

  // PWA Install
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Modals & Forms
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, any>>({});

  const navigateToRef = useRef<(s: string, projId?: string | null) => void>(() => {});

  // ===== EFFECTS =====

  // Check if running as standalone app
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // PWA Install prompt handler
  useEffect(() => {
    const isDismissed = localStorage.getItem('archiflow-install-dismissed');
    const alreadyInstalled = localStorage.getItem('archiflow-installed');
    if (alreadyInstalled) {
      setIsInstalled(true);
      return;
    }
    if (isDismissed) {
      const dismissedTime = parseInt(isDismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setTimeout(() => setShowInstallBanner(true), 2000);
    };
    const appInstalledHandler = () => {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      setIsInstalled(true);
      localStorage.setItem('archiflow-installed', 'true');
      showToast('ArchiFlow instalado correctamente');
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  // ===== FUNCTIONS =====

  const openModal = useCallback((n: string) => setModals(p => ({ ...p, [n]: true })), []);
  const closeModal = useCallback((n: string) => { setModals(p => ({ ...p, [n]: false })); setEditingId(null); }, []);

  const showToast = useCallback((msg: string, type = 'success') => {
    // Intentar con sonner primero (Toaster puede no renderizar con React 19)
    try {
      const opts = { duration: 3500 };
      if (type === 'error') toast.error(msg, opts);
      else if (type === 'warning') toast.warning(msg, opts);
      else toast.success(msg, opts);
    } catch (err) {
      console.warn('[ArchiFlow] UI: Sonner toast failed:', err);
    }
    // Siempre mostrar toast DOM inline como garantía (funciona siempre)
    showToastDOM(msg, type as 'success' | 'error' | 'warning' | 'info');
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  }, [installPrompt, showToast]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem('archiflow-install-dismissed', String(Date.now()));
  }, [showToast]);

  // (toggleTheme defined above via next-themes delegation)

  const navigateTo = useCallback((s: string, projId?: string | null) => {
    setScreen(s);
    setSelectedProjectId(projId ?? selectedProjectId);
    setSidebarOpen(false);
    if (s !== 'chat') { setChatMobileShow(false); }
    useUIStore.getState().setCurrentScreen(s);
  }, [selectedProjectId, showToast]);
  navigateToRef.current = navigateTo;

  // Get platform info
  const platform = useMemo(() => {
    if (typeof window === 'undefined') return 'web';
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/win/i.test(ua)) return 'windows';
    if (/mac/i.test(ua)) return 'mac';
    return 'web';
  }, []);

  const screenTitles = SCREEN_TITLES;

  const value: UIContextType = useMemo(() => ({
    screen, setScreen,
    selectedProjectId, setSelectedProjectId,
    selectedCompanyId, setSelectedCompanyId,
    navigateTo, navigateToRef,
    sidebarOpen, setSidebarOpen,
    sidebarCollapsed, setSidebarCollapsed,
    chatMobileShow, setChatMobileShow,
    taskViewMode, setTaskViewMode,
    calView, setCalView,
    darkMode, setDarkMode, toggleTheme, // derived from next-themes
    installPrompt, setInstallPrompt,
    showInstallBanner, setShowInstallBanner,
    isInstalled, setIsInstalled,
    showInstallGuide, setShowInstallGuide,
    isStandalone, setIsStandalone,
    handleInstall, dismissInstallBanner, platform,
    modals, setModals,
    editingId, setEditingId,
    openModal, closeModal,
    forms, setForms,
    showToast,
    screenTitles,
  }), [screen, selectedProjectId, selectedCompanyId, navigateTo, sidebarOpen, sidebarCollapsed, chatMobileShow, taskViewMode, calView, darkMode, installPrompt, showInstallBanner, isInstalled, showInstallGuide, isStandalone, handleInstall, dismissInstallBanner, modals, editingId, forms, showToast]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within UIProvider');
  return ctx;
}
