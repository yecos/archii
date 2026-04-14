'use client';
import React from 'react';
import dynamic from 'next/dynamic';

import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useInventory } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import AppProvider from '@/contexts/AppContext';
import { Toaster } from 'sonner';
import { Bell, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

/* ─── Layout ─── */
import LoadingScreen from '@/components/layout/LoadingScreen';
import AuthScreen from '@/components/layout/AuthScreen';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import InstallBanner from '@/components/layout/InstallBanner';
import NotifPanel from '@/components/layout/NotifPanel';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import OfflineBanner from '@/components/common/OfflineBanner';

/* ─── Features (lazy) ─── */
const LightboxViewer = dynamic(() => import('@/components/features/LightboxViewer'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/archiflow/CommandPalette'), { ssr: false });

/* ─── Modals (lazy — solo se cargan cuando se abren) ─── */
const ProjectModal = dynamic(() => import('@/components/modals/ProjectModal'), { ssr: false });
const TaskModal = dynamic(() => import('@/components/modals/TaskModal'), { ssr: false });
const ExpenseModal = dynamic(() => import('@/components/modals/ExpenseModal'), { ssr: false });
const SupplierModal = dynamic(() => import('@/components/modals/SupplierModal'), { ssr: false });
const TimeEntryModal = dynamic(() => import('@/components/modals/TimeEntryModal'), { ssr: false });
const ApprovalModal = dynamic(() => import('@/components/modals/ApprovalModal'), { ssr: false });
const MeetingModal = dynamic(() => import('@/components/modals/MeetingModal'), { ssr: false });
const GalleryModal = dynamic(() => import('@/components/modals/GalleryModal'), { ssr: false });
const InvProductModal = dynamic(() => import('@/components/modals/InvProductModal'), { ssr: false });
const InvCategoryModal = dynamic(() => import('@/components/modals/InvCategoryModal'), { ssr: false });
const InvMovementModal = dynamic(() => import('@/components/modals/InvMovementModal'), { ssr: false });
const InvTransferModal = dynamic(() => import('@/components/modals/InvTransferModal'), { ssr: false });
const CompanyModal = dynamic(() => import('@/components/modals/CompanyModal'), { ssr: false });

/* ─── Features (lazy) ─── */
const ImportDataModal = dynamic(() => import('@/components/features/ImportDataModal'), { ssr: false });

/* ─── Screens — eager (quick navigation) ─── */
import ProjectsScreen from '@/screens/ProjectsScreen';

/* ─── Screens — lazy (code-split por demanda) ─── */
const DashboardScreen = dynamic(() => import('@/screens/DashboardScreen'), { ssr: false });
const ProjectDetailScreen = dynamic(() => import('@/screens/ProjectDetailScreen'), { ssr: false });
const TasksScreen = dynamic(() => import('@/screens/TasksScreen'), { ssr: false });
const ChatScreen = dynamic(() => import('@/screens/ChatScreen'), { ssr: false });
const BudgetScreen = dynamic(() => import('@/screens/BudgetScreen'), { ssr: false });
const ProfileScreen = dynamic(() => import('@/screens/ProfileScreen'), { ssr: false });
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
  const { screen, navigateTo, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, closeModal, forms, setForms, modals, screenTitles, showToast } = useUI();
  const { ready, loading, authUser, doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doPasswordReset, userName, initials } = useAuth();
  const { projects, tasks, currentProject, pendingCount } = useFirestore();
  const { teamUsers, isAdmin, isEmailAdmin } = useAuth();
  const { galleryPhotos } = useGallery();
  const { invLowStock } = useInventory();
  const { showNotifBanner, requestNotifPermission, dismissNotifBanner, inAppNotifs, setInAppNotifs, markNotifRead } = useNotif();
  const commandOpen = useUIStore((s) => s.commandOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);

  if (!ready || loading) return <LoadingScreen />;
  if (!authUser) return (
    <>
      {/* Toaster MUST be rendered here too — otherwise auth errors are invisible */}
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
      <AuthScreen
        forms={forms}
        setForms={setForms}
        doLogin={doLogin}
        doRegister={doRegister}
        doGoogleLogin={doGoogleLogin}
        doMicrosoftLogin={doMicrosoftLogin}
        doPasswordReset={doPasswordReset}
        showToast={showToast}
      />
    </>
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

      <OfflineBanner />
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
        aria-label="Navegación principal"
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
                <X size={12} className="stroke-current" />
              </button>
            </div>
          ))}
        </div>

        <NotifPanel />

        {/* Main content with screen rendering */}
        <main
          id="main-content"
          role="main"
          className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`}
          style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}
        >
          <div
            key={screen}
            className="flex-1 flex flex-col min-h-0 animate-fadeIn"
          >
              {screen === 'dashboard' && <ErrorBoundary label="Dashboard"><DashboardScreen /></ErrorBoundary>}
              {screen === 'projects' && <ErrorBoundary label="Proyectos"><ProjectsScreen /></ErrorBoundary>}
              {screen === 'projectDetail' && <ErrorBoundary label="Detalle de Proyecto"><ProjectDetailScreen /></ErrorBoundary>}
              {screen === 'tasks' && <ErrorBoundary label="Tareas"><TasksScreen /></ErrorBoundary>}
              {screen === 'chat' && <ErrorBoundary label="Chat"><ChatScreen /></ErrorBoundary>}
              {screen === 'budget' && <ErrorBoundary label="Presupuestos"><BudgetScreen /></ErrorBoundary>}
              {screen === 'files' && <ErrorBoundary label="Archivos"><FilesScreen /></ErrorBoundary>}
              {screen === 'obra' && <ErrorBoundary label="Seguimiento de Obra"><ObraScreen /></ErrorBoundary>}
              {screen === 'suppliers' && <ErrorBoundary label="Proveedores"><SuppliersScreen /></ErrorBoundary>}
              {screen === 'team' && <ErrorBoundary label="Equipo"><TeamScreen /></ErrorBoundary>}
              {screen === 'companies' && <ErrorBoundary label="Empresas"><CompaniesScreen /></ErrorBoundary>}
              {screen === 'calendar' && <ErrorBoundary label="Calendario"><CalendarScreen /></ErrorBoundary>}
              {screen === 'portal' && <ErrorBoundary label="Portal Cliente"><PortalScreen /></ErrorBoundary>}
              {screen === 'gallery' && <ErrorBoundary label="Galería"><GalleryScreen /></ErrorBoundary>}
              {screen === 'inventory' && <ErrorBoundary label="Inventario"><InventoryScreen /></ErrorBoundary>}
              {screen === 'admin' && <ErrorBoundary label="Panel Admin"><AdminScreen /></ErrorBoundary>}
              {screen === 'profile' && <ErrorBoundary label="Mi Perfil"><ProfileScreen /></ErrorBoundary>}
              {screen === 'install' && <ErrorBoundary label="Instalar App"><InstallScreen /></ErrorBoundary>}
              {screen === 'timeTracking' && <ErrorBoundary label="Time Tracking"><TimeTrackingScreen /></ErrorBoundary>}
              {screen === 'invoices' && <ErrorBoundary label="Facturas"><InvoicesScreen /></ErrorBoundary>}
              {screen === 'reports' && <ErrorBoundary label="Reportes"><ReportsScreen /></ErrorBoundary>}
          </div>
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
      <ImportDataModal open={!!modals.importData} onClose={() => closeModal('importData')} />

      <LightboxViewer />

      {/* ===== Command Palette (Cmd+K) ===== */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
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
