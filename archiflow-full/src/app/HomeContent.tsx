'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AppProvider, { useApp } from '@/contexts/AppContext';
import { Toaster } from 'sonner';
import { Bell, X } from 'lucide-react';

/* ─── Layout ─── */
import LoadingScreen from '@/components/layout/LoadingScreen';
import AuthScreen from '@/components/layout/AuthScreen';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import InstallBanner from '@/components/layout/InstallBanner';
import NotifPanel from '@/components/layout/NotifPanel';

/* ─── Features ─── */
import LightboxViewer from '@/components/features/LightboxViewer';

/* ─── Modals ─── */
import ProjectModal from '@/components/modals/ProjectModal';
import TaskModal from '@/components/modals/TaskModal';
import ExpenseModal from '@/components/modals/ExpenseModal';
import SupplierModal from '@/components/modals/SupplierModal';
import TimeEntryModal from '@/components/modals/TimeEntryModal';
import ApprovalModal from '@/components/modals/ApprovalModal';
import MeetingModal from '@/components/modals/MeetingModal';
import GalleryModal from '@/components/modals/GalleryModal';
import InvProductModal from '@/components/modals/InvProductModal';
import InvCategoryModal from '@/components/modals/InvCategoryModal';
import InvMovementModal from '@/components/modals/InvMovementModal';
import InvTransferModal from '@/components/modals/InvTransferModal';
import CompanyModal from '@/components/modals/CompanyModal';

import ErrorBoundary from '@/components/common/ErrorBoundary';

/* ─── Screens — core screens loaded directly ─── */
import DashboardScreen from '@/screens/DashboardScreen';
import ProjectsScreen from '@/screens/ProjectsScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';
import TasksScreen from '@/screens/TasksScreen';
import ChatScreen from '@/screens/ChatScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import ProfileScreen from '@/screens/ProfileScreen';

/* ─── Screens — lazy loaded (heavy / rarely used) ─── */
import dynamic from 'next/dynamic';
const FilesScreen = dynamic(() => import('@/screens/FilesScreen'), { ssr: false });
const ObraScreen = dynamic(() => import('@/screens/ObraScreen'), { ssr: false });
const SuppliersScreen = dynamic(() => import('@/screens/SuppliersScreen'), { ssr: false });
const TeamScreen = dynamic(() => import('@/screens/TeamScreen'), { ssr: false });
const CompaniesScreen = dynamic(() => import('@/screens/CompaniesScreen'), { ssr: false });
const CalendarScreen = dynamic(() => import('@/screens/CalendarScreen'), { ssr: false });
const PortalScreen = dynamic(() => import('@/screens/PortalScreen'), { ssr: false });
const GalleryScreen = dynamic(() => import('@/screens/GalleryScreen'), { ssr: false });
const InventoryScreen = dynamic(() => import('@/screens/InventoryScreen'), { ssr: false });
const AdminScreen = dynamic(() => import('@/screens/AdminScreen'), { ssr: false });
const InstallScreen = dynamic(() => import('@/screens/InstallScreen'), { ssr: false });
const TimeTrackingScreen = dynamic(() => import('@/screens/TimeTrackingScreen'), { ssr: false });
const InvoicesScreen = dynamic(() => import('@/screens/InvoicesScreen'), { ssr: false });
const ReportsScreen = dynamic(() => import('@/screens/ReportsScreen'), { ssr: false });

function AppContent() {
  const {
    ready, loading, authUser, screen, navigateTo,
    sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed,
    closeModal,
    projects, tasks, teamUsers, companies,
    currentProject, pendingCount, isAdmin, isEmailAdmin,
    userName, initials,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin,
    forms, setForms,
    modals,
    galleryPhotos, invLowStock,
    showNotifBanner, requestNotifPermission, dismissNotifBanner,
    inAppNotifs, setInAppNotifs, markNotifRead,
    screenTitles,
  } = useApp();

  if (!ready || loading) return <LoadingScreen />;
  if (!authUser) return (
    <AuthScreen
      forms={forms}
      setForms={setForms}
      doLogin={doLogin}
      doRegister={doRegister}
      doGoogleLogin={doGoogleLogin}
      doMicrosoftLogin={doMicrosoftLogin}
      showToast={() => {}}
    />
  );

  // Local screen title overrides (dynamic titles like projectDetail)
  const localScreenTitles: Record<string, string> = {
    dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes',
    budget: 'Presupuestos', files: 'Planos y archivos', gallery: 'Galería', inventory: 'Inventario',
    admin: 'Panel Admin', obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo',
    calendar: 'Calendario', portal: 'Portal cliente', profile: 'Mi Perfil', install: 'Instalar App',
    companies: 'Empresas', projectDetail: currentProject?.data.name || 'Proyecto',
  };

  return (
    <div className="flex h-dvh overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sonner Toaster — premium toast system */}
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: false,
          classNames: {
            toast: 'af-sonner-toast',
            title: 'af-sonner-title',
            description: 'af-sonner-desc',
            actionButton: 'af-sonner-action',
            cancelButton: 'af-sonner-cancel',
            success: '!bg-emerald-600 !text-white !border-emerald-500',
            error: '!bg-red-500 !text-white !border-red-400',
            warning: '!bg-amber-500 !text-white !border-amber-400',
          },
        }}
        richColors
        closeButton
        duration={3500}
      />

      <InstallBanner />
      <Sidebar
        screen={screen}
        navigateTo={navigateTo}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        userName={userName}
        initials={initials}
        authUser={authUser}
        teamUsers={teamUsers}
        isEmailAdmin={isEmailAdmin}
        projects={projects}
        tasks={tasks}
        pendingCount={pendingCount}
        galleryPhotos={galleryPhotos}
        invLowStock={invLowStock}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        {/* Notification Permission Banner — small inline */}
        {showNotifBanner && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[var(--af-accent)]/10 via-[var(--af-accent)]/5 to-transparent border-b border-[var(--af-accent)]/20 animate-fadeIn">
            <Bell size={20} className="stroke-[var(--af-accent)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">Activar notificaciones</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Recibe alertas de chat, tareas, reuniones, inventario y más — incluso cuando la app esté cerrada</div>
            </div>
            <button className="px-4 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>
              Activar ahora
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer flex-shrink-0 border-none bg-transparent" onClick={dismissNotifBanner}>
              <X size={16} className="stroke-current" />
            </button>
          </div>
        )}

        {/* In-App Notification Toasts — small inline */}
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
          {inAppNotifs.map(n => (
            <div key={n.id} className="pointer-events-auto bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-2xl flex items-start gap-3 animate-slideUp cursor-pointer hover:border-[var(--af-accent)]/30 transition-all" style={{ width: '340px', maxWidth: 'calc(100vw - 32px)' }} onClick={() => { markNotifRead(n.id); if (n.screen) navigateTo(n.screen, n.itemId); }}>
              <div className="text-lg flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight">{n.title}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2 leading-snug">{n.body}</div>
              </div>
              <button className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0 bg-transparent border-none cursor-pointer mt-0.5" onClick={(e) => { e.stopPropagation(); setInAppNotifs(prev => prev.filter(x => x.id !== n.id)); }}>
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        <NotifPanel />

        {/* Main content with screen rendering */}
        <main
          id="main-content"
          className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`}
          style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 flex flex-col min-h-0"
            >
              <ErrorBoundary>
              {screen === 'dashboard' && <DashboardScreen />}
              {screen === 'projects' && <ProjectsScreen />}
              {screen === 'projectDetail' && <ProjectDetailScreen />}
              {screen === 'tasks' && <TasksScreen />}
              {screen === 'chat' && <ChatScreen />}
              {screen === 'budget' && <BudgetScreen />}
              {screen === 'files' && <FilesScreen />}
              {screen === 'obra' && <ObraScreen />}
              {screen === 'suppliers' && <SuppliersScreen />}
              {screen === 'team' && <TeamScreen />}
              {screen === 'companies' && <CompaniesScreen />}
              {screen === 'calendar' && <CalendarScreen />}
              {screen === 'portal' && <PortalScreen />}
              {screen === 'gallery' && <GalleryScreen />}
              {screen === 'inventory' && <InventoryScreen />}
              {screen === 'admin' && <AdminScreen />}
              {screen === 'profile' && <ProfileScreen />}
              {screen === 'install' && <InstallScreen />}
              {screen === 'timeTracking' && <TimeTrackingScreen />}
              {screen === 'invoices' && <InvoicesScreen />}
              {screen === 'reports' && <ReportsScreen />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav />

      {/* ===== Modals — each self-contained ===== */}
      <ProjectModal open={!!modals.project} onClose={() => closeModal('project')} />
      <TaskModal open={!!modals.task} onClose={() => closeModal('task')} />
      <ExpenseModal open={!!modals.expense} onClose={() => closeModal('expense')} />
      <SupplierModal open={!!modals.supplier} onClose={() => closeModal('supplier')} />
      <TimeEntryModal open={!!modals.timeEntry} onClose={() => closeModal('timeEntry')} />
      <ApprovalModal open={!!modals.approval} onClose={() => closeModal('approval')} />
      <MeetingModal open={!!modals.meeting} onClose={() => closeModal('meeting')} />
      <GalleryModal open={!!modals.gallery} onClose={() => closeModal('gallery')} />
      <InvProductModal open={!!modals.invProduct} onClose={() => closeModal('invProduct')} />
      <InvCategoryModal open={!!modals.invCategory} onClose={() => closeModal('invCategory')} />
      <InvMovementModal open={!!modals.invMovement} onClose={() => closeModal('invMovement')} />
      <InvTransferModal open={!!modals.invTransfer} onClose={() => closeModal('invTransfer')} />
      <CompanyModal open={!!modals.company} onClose={() => closeModal('company')} />

      <LightboxViewer />
    </div>
  );
}

/* ─── Entry point — page.tsx handles lazy loading via dynamic() ─── */

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
