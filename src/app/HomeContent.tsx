'use client';
import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

/* ─── Context hooks ─── */
import { useUIContext } from '@/contexts/UIContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestoreContext } from '@/contexts/FirestoreContext';
import { useGalleryContext } from '@/contexts/GalleryContext';
import { useInventoryContext } from '@/contexts/InventoryContext';
import { useNotifContext } from '@/contexts/NotifContext';
import AppProvider from '@/contexts/AppContext';

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
import SWUpdateToast from '@/components/common/SWUpdateToast';

/* ─── Features (lazy) ─── */
const LightboxViewer = dynamic(() => import('@/components/features/LightboxViewer'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/archiflow/CommandPalette'), { ssr: false });
const AIAgentPanel = dynamic(() => import('@/components/archiflow/AIAgentPanel'), { ssr: false });
const FloatingChatBubble = dynamic(() => import('@/components/layout/FloatingChatBubble'), { ssr: false });

/* ─── Global React Error Diagnostic ─── */
function ReactErrorDiagnostic() {
  const [errors, setErrors] = useState<Array<{ message: string; source: string; stack: string; time: number }>>([]);

  useEffect(() => {
    // Override console.error to capture React rendering errors
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args.map(a => typeof a === 'string' ? a : '').join(' ');
      if (msg.includes('error #300') || msg.includes('Objects are not valid') || msg.includes('object is not valid')) {
        // Extract component stack from React's additional args
        let source = '';
        for (const arg of args) {
          if (typeof arg === 'string' && arg.includes('at ')) {
            source = arg;
            break;
          }
        }
        const fullMessage = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join('\n');
        setErrors(prev => [...prev.slice(-4), { message: fullMessage, source, stack: '', time: Date.now() }]);
      }
      origError(...args);
    };
    return () => { console.error = origError; };
  }, []);

  if (errors.length === 0) return null;
  const lastError = errors[errors.length - 1];

  return (
    <div
      className="fixed z-[9999] cursor-pointer"
      style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
      onClick={() => setErrors([])}
    >
      <div
        className="px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-white text-[12px]"
        style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', maxWidth: '90vw', minWidth: '280px' }}
      >
        <span style={{ fontSize: '16px' }}>🔍</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">React Error #300 detectado</div>
          <div className="text-[10px] opacity-80 truncate mt-0.5" style={{ maxWidth: '60vw' }}>
            {lastError.message.split('\n').find(l => l.includes('at ')) || lastError.message.substring(0, 120)}
          </div>
        </div>
        <span className="text-[10px] opacity-60">(click para cerrar)</span>
      </div>
    </div>
  );
}

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
const ImportDataModal = dynamic(() => import('@/components/features/ImportDataModal'), { ssr: false });

/* ─── Screens (lazy — code-split por demanda) ─── */
const DashboardScreen = dynamic(() => import('@/screens/DashboardScreen'), { ssr: false });
const ProjectsScreen = dynamic(() => import('@/screens/ProjectsScreen'), { ssr: false });
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
const QuotationScreen = dynamic(() => import('@/screens/QuotationScreen'), { ssr: false });
const ReportsScreen = dynamic(() => import('@/screens/ReportsScreen'), { ssr: false });
const SettingsScreen = dynamic(() => import('@/screens/SettingsScreen'), { ssr: false });
const GanttScreen = dynamic(() => import('@/screens/GanttScreen'), { ssr: false });
const PurchaseOrdersScreen = dynamic(() => import('@/screens/PurchaseOrdersScreen'), { ssr: false });
const FieldNotesScreen = dynamic(() => import('@/screens/FieldNotesScreen'), { ssr: false });
const PhotoLogScreen = dynamic(() => import('@/screens/PhotoLogScreen'), { ssr: false });
const InspectionsScreen = dynamic(() => import('@/screens/InspectionsScreen'), { ssr: false });
const TemplatesScreen = dynamic(() => import('@/screens/TemplatesScreen'), { ssr: false });
const ChangeOrdersScreen = dynamic(() => import('@/screens/ChangeOrdersScreen'), { ssr: false });
const ProfitabilityScreen = dynamic(() => import('@/screens/ProfitabilityScreen'), { ssr: false });
const PredictiveAIScreen = dynamic(() => import('@/screens/PredictiveAIScreen'), { ssr: false });
const OfflineStatusScreen = dynamic(() => import('@/screens/OfflineStatusScreen'), { ssr: false });
const ReportGeneratorScreen = dynamic(() => import('@/screens/ReportGeneratorScreen'), { ssr: false });
const AutomationScreen = dynamic(() => import('@/screens/AutomationScreen'), { ssr: false });
const QRScannerScreen = dynamic(() => import('@/screens/QRScannerScreen'), { ssr: false });
const GeolocationScreen = dynamic(() => import('@/screens/GeolocationScreen'), { ssr: false });
const BackupScreen = dynamic(() => import('@/screens/BackupScreen'), { ssr: false });
const FormBuilderScreen = dynamic(() => import('@/screens/FormBuilderScreen'), { ssr: false });
const MultiTenantScreen = dynamic(() => import('@/screens/MultiTenantScreen'), { ssr: false });
const TimeLapseScreen = dynamic(() => import('@/screens/TimeLapseScreen'), { ssr: false });
const ApiWebhooksScreen = dynamic(() => import('@/screens/ApiWebhooksScreen'), { ssr: false });

function AppContent() {
  const { screen, navigateTo, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, closeModal, forms, setForms, modals, showToast } = useUIContext();

  /* ─── Smooth page transition state ─── */
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayScreen, setDisplayScreen] = useState(screen);

  const stableNavigateTo = useCallback((s: string, projId?: string | null) => {
    navigateTo(s, projId);
  }, [navigateTo]);

  useEffect(() => {
    if (screen !== displayScreen) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayScreen(screen);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [screen, displayScreen]);
  const { ready, loading, authUser, doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doPasswordReset, userName, initials } = useAuthContext();
  const { teamUsers, isAdmin, isEmailAdmin } = useAuthContext();
  const { projects, tasks, currentProject, pendingCount } = useFirestoreContext();
  const { galleryPhotos } = useGalleryContext();
  const { invLowStock } = useInventoryContext();
  const { showNotifBanner, requestNotifPermission, dismissNotifBanner, inAppNotifs, setInAppNotifs, markNotifRead } = useNotifContext();
  const commandOpen = useUIStore((s) => s.commandOpen);
  const aiAgentOpen = useUIStore((s) => s.aiAgentOpen);
  const setAIAgentOpen = useUIStore((s) => s.setAIAgentOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);

  if (!ready || loading) return <LoadingScreen />;
  if (!authUser) return (
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
  );

  return (
    <div className="flex h-dvh overflow-hidden" style={{ height: '100dvh' }}>
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

        {/* Notification Permission Banner */}
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

        {/* In-App Notification Toasts */}
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto md:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
          {inAppNotifs.map(n => (
            <div key={n.id} className="pointer-events-auto card-elevated p-3 shadow-2xl flex items-start gap-3 animate-slideUp cursor-pointer hover:border-[var(--af-accent)]/30 transition-all" style={{ width: '340px', maxWidth: 'calc(100vw - 32px)' }} onClick={() => { markNotifRead(n.id); if (n.screen) navigateTo(n.screen, n.itemId); }}>
              <div className="text-lg flex-shrink-0 mt-0.5">{typeof n.icon === 'string' ? n.icon : '🔔'}</div>
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

        <main
          id="main-content"
          role="main"
          className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`}
          style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}
        >
          <div key={displayScreen} className={`flex-1 flex flex-col min-h-0 transition-all duration-150 ease-out ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
            {displayScreen === 'dashboard' && <ErrorBoundary label="Dashboard"><DashboardScreen /></ErrorBoundary>}
            {displayScreen === 'projects' && <ErrorBoundary label="Proyectos"><ProjectsScreen /></ErrorBoundary>}
            {displayScreen === 'projectDetail' && <ErrorBoundary label="Detalle de Proyecto"><ProjectDetailScreen /></ErrorBoundary>}
            {displayScreen === 'tasks' && <ErrorBoundary label="Tareas"><TasksScreen /></ErrorBoundary>}
            {displayScreen === 'chat' && <ErrorBoundary label="Chat"><ChatScreen /></ErrorBoundary>}
            {displayScreen === 'budget' && <ErrorBoundary label="Presupuestos"><BudgetScreen /></ErrorBoundary>}
            {displayScreen === 'files' && <ErrorBoundary label="Archivos"><FilesScreen /></ErrorBoundary>}
            {displayScreen === 'obra' && <ErrorBoundary label="Seguimiento de Obra"><ObraScreen /></ErrorBoundary>}
            {displayScreen === 'suppliers' && <ErrorBoundary label="Proveedores"><SuppliersScreen /></ErrorBoundary>}
            {displayScreen === 'team' && <ErrorBoundary label="Equipo"><TeamScreen /></ErrorBoundary>}
            {displayScreen === 'companies' && <ErrorBoundary label="Empresas"><CompaniesScreen /></ErrorBoundary>}
            {displayScreen === 'calendar' && <ErrorBoundary label="Calendario"><CalendarScreen /></ErrorBoundary>}
            {displayScreen === 'portal' && <ErrorBoundary label="Portal Cliente"><PortalScreen /></ErrorBoundary>}
            {displayScreen === 'gallery' && <ErrorBoundary label="Galería"><GalleryScreen /></ErrorBoundary>}
            {displayScreen === 'inventory' && <ErrorBoundary label="Inventario"><InventoryScreen /></ErrorBoundary>}
            {displayScreen === 'admin' && <ErrorBoundary label="Panel Admin"><AdminScreen /></ErrorBoundary>}
            {displayScreen === 'profile' && <ErrorBoundary label="Mi Perfil"><ProfileScreen /></ErrorBoundary>}
            {displayScreen === 'install' && <ErrorBoundary label="Instalar App"><InstallScreen /></ErrorBoundary>}
            {displayScreen === 'timeTracking' && <ErrorBoundary label="Time Tracking"><TimeTrackingScreen /></ErrorBoundary>}
            {displayScreen === 'invoices' && <ErrorBoundary label="Facturas"><InvoicesScreen /></ErrorBoundary>}
            {displayScreen === 'quotations' && <ErrorBoundary label="Cotizaciones"><QuotationScreen /></ErrorBoundary>}
            {displayScreen === 'reports' && <ErrorBoundary label="Reportes"><ReportsScreen /></ErrorBoundary>}
            {displayScreen === 'settings' && <ErrorBoundary label="Configuración"><SettingsScreen /></ErrorBoundary>}
            {displayScreen === 'gantt' && <ErrorBoundary label="Cronograma"><GanttScreen /></ErrorBoundary>}
            {displayScreen === 'purchaseOrders' && <ErrorBoundary label="Órdenes de Compra"><PurchaseOrdersScreen /></ErrorBoundary>}
            {displayScreen === 'fieldNotes' && <ErrorBoundary label="Minutas de Obra"><FieldNotesScreen /></ErrorBoundary>}
            {displayScreen === 'photoLog' && <ErrorBoundary label="Bitácora Fotográfica"><PhotoLogScreen /></ErrorBoundary>}
            {displayScreen === 'inspections' && <ErrorBoundary label="Inspecciones"><InspectionsScreen /></ErrorBoundary>}
            {displayScreen === 'templates' && <ErrorBoundary label="Templates"><TemplatesScreen /></ErrorBoundary>}
            {displayScreen === 'changeOrders' && <ErrorBoundary label="Control de Cambios"><ChangeOrdersScreen /></ErrorBoundary>}
            {displayScreen === 'profitability' && <ErrorBoundary label="Dashboard de Rentabilidad"><ProfitabilityScreen /></ErrorBoundary>}
            {displayScreen === 'predictiveAI' && <ErrorBoundary label="IA Predictiva"><PredictiveAIScreen /></ErrorBoundary>}
            {displayScreen === 'offlineStatus' && <ErrorBoundary label="Estado Offline"><OfflineStatusScreen /></ErrorBoundary>}
            {displayScreen === 'reportGenerator' && <ErrorBoundary label="Generador de Reportes"><ReportGeneratorScreen /></ErrorBoundary>}
            {displayScreen === 'automations' && <ErrorBoundary label="Flujos Automatizados"><AutomationScreen /></ErrorBoundary>}
            {displayScreen === 'qrScanner' && <ErrorBoundary label="Escáner QR"><QRScannerScreen /></ErrorBoundary>}
            {displayScreen === 'formBuilder' && <ErrorBoundary label="Generador de Formularios"><FormBuilderScreen /></ErrorBoundary>}
            {displayScreen === 'timeLapse' && <ErrorBoundary label="Time-lapse"><TimeLapseScreen /></ErrorBoundary>}
            {displayScreen === 'apiWebhooks' && <ErrorBoundary label="API & Webhooks"><ApiWebhooksScreen /></ErrorBoundary>}
            {displayScreen === 'geolocation' && <ErrorBoundary label="Geolocalización GPS"><GeolocationScreen /></ErrorBoundary>}
            {displayScreen === 'backup' && <ErrorBoundary label="Copia de Seguridad"><BackupScreen /></ErrorBoundary>}
            {displayScreen === 'multiTenant' && <ErrorBoundary label="Multitenant"><MultiTenantScreen /></ErrorBoundary>}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* ===== Modals ===== */}
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

      <ErrorBoundary label="LightboxViewer" fallback={null}>
        <LightboxViewer />
      </ErrorBoundary>
      <ErrorBoundary label="CommandPalette" fallback={null}>
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
      </ErrorBoundary>
      <ErrorBoundary label="AIAgentPanel" fallback={null}>
        <AIAgentPanel isOpen={aiAgentOpen} onClose={() => setAIAgentOpen(false)} />
      </ErrorBoundary>
      <ErrorBoundary label="FloatingChatBubble" fallback={null}>
        <FloatingChatBubble />
      </ErrorBoundary>
      <ErrorBoundary label="SWUpdateToast" fallback={null}>
        <SWUpdateToast />
      </ErrorBoundary>

      {/* Global React error diagnostic */}
      <ReactErrorDiagnostic />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
