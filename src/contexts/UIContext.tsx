'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { domToast } from '@/lib/toast-dom';
import { useUIStore } from '@/stores/ui-store';
import { SCREEN_TITLES } from '@/lib/types';

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
    } catch {
      // Sonner falló — ignorar
    }
    // Siempre mostrar toast DOM como garantía (funciona siempre, sin depender de React)
    domToast(msg, type as 'success' | 'error' | 'warning' | 'info', 4500);
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
  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows/.test(ua)) return 'windows';
    if (/Mac/.test(ua)) return 'mac';
    return 'other';
  };
  const platform = getPlatform();

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
  }), [screen, selectedProjectId, selectedCompanyId, navigateTo, sidebarOpen, sidebarCollapsed, chatMobileShow, taskViewMode, darkMode, installPrompt, showInstallBanner, isInstalled, showInstallGuide, isStandalone, handleInstall, dismissInstallBanner, modals, editingId, forms, showToast]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within UIProvider');
  return ctx;
}
