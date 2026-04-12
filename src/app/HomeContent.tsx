'use client';
import React from 'react';
import AppProvider, { useApp } from '@/contexts/AppContext';
import LoadingScreen from '@/components/layout/LoadingScreen';
import AuthScreen from '@/components/layout/AuthScreen';
import Sidebar from '@/components/layout/Sidebar';

// Keep imports for render-only types used in JSX
import type { Project, Task } from '@/lib/types';
import { DEFAULT_PHASES, EXPENSE_CATS, SUPPLIER_CATS, PHOTO_CATS, INV_UNITS, INV_WAREHOUSES, TRANSFER_STATUSES, CAT_COLORS, ADMIN_EMAILS, USER_ROLES, ROLE_COLORS, ROLE_ICONS, MESES, DIAS_SEMANA, SCREEN_TITLES, DEFAULT_ROLE_PERMS } from '@/lib/types';
import { fmtCOP, fmtDate, fmtDateTime, fmtSize, getInitials, statusColor, prioColor, taskStColor, avatarColor, fmtRecTime, fmtDuration, fmtTimer, getWeekStart, fileToBase64, getPlatform, uniqueId } from '@/lib/helpers';
import { notifyWhatsApp } from '@/lib/whatsapp-notifications';
import { getFirebase } from '@/lib/firebase-service';

import DashboardScreen from '@/screens/DashboardScreen';
import ProjectsScreen from '@/screens/ProjectsScreen';
import ObraScreen from '@/screens/ObraScreen';
import SuppliersScreen from '@/screens/SuppliersScreen';
import TeamScreen from '@/screens/TeamScreen';
import CompaniesScreen from '@/screens/CompaniesScreen';
import PortalScreen from '@/screens/PortalScreen';
import GalleryScreen from '@/screens/GalleryScreen';
import CalendarScreen from '@/screens/CalendarScreen';
import InstallScreen from '@/screens/InstallScreen';
import TimeTrackingScreen from '@/screens/TimeTrackingScreen';
import TasksScreen from '@/screens/TasksScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import FilesScreen from '@/screens/FilesScreen';
import ChatScreen from '@/screens/ChatScreen';
import InvoicesScreen from '@/screens/InvoicesScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AdminScreen from '@/screens/AdminScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';

function AppContent() {
  const ctx = useApp();
  const {
    ready, loading, authUser, screen, navigateTo, selectedProjectId, setSelectedProjectId,
    sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed,
    openModal, closeModal, showToast,
    darkMode, toggleTheme,
    projects, tasks, teamUsers, expenses, suppliers, companies,
    selectedCompanyId, setSelectedCompanyId,
    currentProject, pendingCount, isAdmin, myRole, isEmailAdmin,
    userName, initials,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin,
    forms, setForms,
    modals, editingId, setEditingId,
    toast,
    messages, setMessages, chatProjectId, setChatProjectId,
    workPhases, projectFiles, approvals, chatMobileShow, setChatMobileShow,
    calMonth, setCalMonth, calYear, setCalYear, calSelectedDate, setCalSelectedDate,
    calFilterProject, setCalFilterProject, meetings,
    galleryPhotos, galleryFilterProject, setGalleryFilterProject,
    galleryFilterCat, setGalleryFilterCat, lightboxPhoto, setLightboxPhoto, lightboxIndex, setLightboxIndex,
    invProducts, invCategories, invMovements, invTransfers,
    invTab, setInvTab, invFilterCat, setInvFilterCat, invSearch, setInvSearch,
    invMovFilterType, setInvMovFilterType, invTransferFilterStatus, setInvTransferFilterStatus,
    invWarehouseFilter, setInvWarehouseFilter,
    timeEntries, timeTab, setTimeTab, timeFilterProject, setTimeFilterProject,
    timeFilterDate, setTimeFilterDate, timeSession, timeTimerMs,
    invoices, invoiceTab, setInvoiceTab, invoiceItems, setInvoiceItems,
    invoiceFilterStatus, setInvoiceFilterStatus,
    comments, setComments, commentText, setCommentText, replyingTo, setReplyingTo,
    taskViewMode, setTaskViewMode,
    adminTab, setAdminTab, adminWeekOffset, setAdminWeekOffset,
    adminTaskSearch, setAdminTaskSearch, adminFilterAssignee, setAdminFilterAssignee,
    adminFilterProject, setAdminFilterProject, adminFilterPriority, setAdminFilterPriority,
    adminTooltipTask, setAdminTooltipTask, adminTooltipPos, setAdminTooltipPos,
    adminPermSection, setAdminPermSection, rolePerms, setRolePerms, toggleRolePerm,
    isRecording, isSavingTask, recDuration, recVolume,
    audioPreviewUrl, audioPreviewDuration, pendingFiles, chatDropActive,
    mediaRecRef, audioChunksRef, audioStreamRef, analyserRef, recTimerRef, recAnimRef,
    fileInputRef, audioPreviewBlobRef, playingAudioRef,
    playingAudio, setPlayingAudio, audioProgress, setAudioProgress,
    audioCurrentTime, setAudioCurrentTime, showEmojiPicker, setShowEmojiPicker,
    chatDmUser, setChatDmUser,
    installPrompt, showInstallBanner, isInstalled, showInstallGuide, isStandalone,
    handleInstall, dismissInstallBanner, platform,
    notifPermission, notifHistory, notifPrefs, showNotifPanel, setShowNotifPanel,
    unreadCount, notifSound, setNotifSound, inAppNotifs, setInAppNotifs,
    notifFilterCat, setNotifFilterCat, showNotifBanner, setShowNotifBanner,
    requestNotifPermission, dismissNotifBanner, markNotifRead, markAllNotifRead,
    clearNotifHistory, toggleNotifPref, sendNotif, sendBrowserNotif,
    msAccessToken, msConnected, msLoading, oneDriveFiles, odProjectFolder,
    showOneDrive, setShowOneDrive, msRefreshToken, msTokenExpiry,
    odSearchQuery, setOdSearchQuery, odSearchResults, setOdSearchResults,
    odSearching, setOdSearching, odBreadcrumbs, setOdBreadcrumbs,
    odCurrentFolder, setOdCurrentFolder, odViewMode, setOdViewMode,
    odRenaming, setOdRenaming, odRenameName, setOdRenameName,
    odUploading, setOdUploading, odUploadProgress, setOdUploadProgress,
    odUploadFile, setOdUploadFile, odDragOver, setOdDragOver,
    odTab, setOdTab, galleryLoading, setGalleryLoading, odGalleryPhotos, setOdGalleryPhotos,
    disconnectMicrosoft, refreshMsToken, graphApiGet, ensureProjectFolder,
    loadOneDriveFiles, uploadToOneDrive, deleteFromOneDrive, openOneDriveForProject,
    formatFileSize, timeAgo, getFileIcon, navigateToFolder, uploadFileWithProgress,
    handleFileUpload, handleDroppedFiles, renameOneDriveFile, downloadOneDriveFile,
    searchOneDriveFiles, loadGalleryPhotos,
    updateUserRole, updateUserCompany, getMyCompanyId, getMyRole, visibleProjects,
    getUserName, saveProject, deleteProject, openEditProject,
    saveTask, openEditTask, updateProjectProgress, updateUserName,
    toggleTask, deleteTask, sendMessage,
    startRecording, stopRecording, cancelRecording, handleMicButton,
    sendVoiceNote, handleFileSelect, removePendingFile, sendPendingFiles, sendAll,
    toggleAudioPlay, fileIcon, saveExpense, deleteExpense,
    saveSupplier, deleteSupplier, saveCompany,
    uploadFile, deleteFile, initDefaultPhases, updatePhaseStatus,
    saveApproval, updateApproval, deleteApproval,
    getWarehouseStock, getTotalStock, buildWarehouseStock,
    saveInvProduct, deleteInvProduct, openEditInvProduct,
    saveInvCategory, deleteInvCategory, openEditInvCategory,
    saveInvMovement, deleteInvMovement, saveInvTransfer, deleteInvTransfer,
    getInvCategoryName, getInvCategoryColor, getInvProductName,
    invTotalValue, invLowStock, invTotalStock, invPendingTransfers, invAlerts,
    GANTT_DAYS, GANTT_DAY_NAMES, GANTT_STATUS_CFG, GANTT_PRIO_CFG,
    getMonday, getGanttDays, getTaskBar, buildGanttRows, findOverlaps,
    getProjectColor, getProjectColorLight, getUserRole,
    activeTasks, completedTasks, overdueTasks, urgentTasks, adminFilteredTasks,
    projectExpenses, projectTasks, projectBudget, projectSpent,
    saveMeeting, deleteMeeting, openEditMeeting, openProject,
    saveGalleryPhoto, deleteGalleryPhoto, handleGalleryImageSelect,
    handleInvProductImageSelect, openLightbox, closeLightbox,
    lightboxPrev, lightboxNext, getFilteredGalleryPhotos,
    startTimeTracking, stopTimeTracking, saveManualTimeEntry,
    openNewInvoice, updateInvoiceItem, addInvoiceItem, removeInvoiceItem, saveInvoice,
    postComment, calcGanttDays, calcGanttOffset, navigateToRef,
    screenTitles,
  } = ctx;

  if (!ready || loading) return <LoadingScreen />;
  if (!authUser) return <AuthScreen forms={forms} setForms={setForms} doLogin={doLogin} doRegister={doRegister} doGoogleLogin={doGoogleLogin} doMicrosoftLogin={doMicrosoftLogin} showToast={showToast} />;

  // Local screen title overrides (dynamic titles like projectDetail)
  const localScreenTitles: Record<string, string> = {
    dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes',
    budget: 'Presupuestos', files: 'Planos y archivos', gallery: 'Galería', inventory: 'Inventario',
    admin: 'Panel Admin', obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo',
    calendar: 'Calendario', portal: 'Portal cliente', profile: 'Mi Perfil', install: 'Instalar App',
    companies: 'Empresas', projectDetail: currentProject?.data.name || 'Proyecto',
  };

  /* ===== RENDER ===== */
  return (
    <div className="flex h-dvh overflow-hidden" style={{ height: '100dvh' }}>
      {/* Toast */}
      {toast && <div className={`af-toast ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white`}>{toast.msg}</div>}

      {/* Install Banner (Android/Chrome Desktop) */}
      {showInstallBanner && installPrompt && !isStandalone && (
        <div className="fixed top-0 left-0 right-0 z-[200] p-3 sm:p-4 animate-slideIn" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
          <div className="max-w-lg mx-auto bg-[var(--card)] border border-[var(--af-accent)]/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-[var(--af-accent)] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">Instalar ArchiFlow</div>
                <div className="text-[12.5px] text-[var(--muted-foreground)] mt-0.5">Accede más rápido desde tu pantalla de inicio o escritorio</div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={handleInstall}>
                    Instalar app
                  </button>
                  <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[var(--af-bg3)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors" onClick={dismissInstallBanner}>
                    Ahora no
                  </button>
                </div>
              </div>
              <button className="w-9 h-9 flex items-center justify-center text-[var(--af-text3)] cursor-pointer hover:text-[var(--foreground)] flex-shrink-0" onClick={dismissInstallBanner}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
          <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] items-center justify-center cursor-pointer md:hidden flex" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {screen === 'projectDetail' ? (
            <button className="flex items-center gap-1.5 text-[var(--af-accent)] text-sm font-medium cursor-pointer hover:underline mr-2" onClick={() => navigateTo('projects')}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Proyectos
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium truncate af-heading-responsive">{localScreenTitles[screen] || screenTitles[screen] || ''}</div>
            <div className="text-xs text-[var(--muted-foreground)] hidden md:block">
              {screen === 'dashboard' ? `Bienvenido, ${userName.split(' ')[0]}` : screen === 'projectDetail' ? currentProject?.data.status || '' : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button
              className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all relative"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              title="Notificaciones"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {notifPermission === 'default' && (
                <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
            {/* Theme toggle */}
            <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all" onClick={toggleTheme} title={(darkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche') + ' (Ctrl+D)'}>
              {darkMode ? (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            {screen === 'projects' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, projName: '', projClient: '', projLocation: '', projBudget: '', projDesc: '', projStart: '', projEnd: '', projStatus: 'Concepto' })); openModal('project'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo proyecto
              </button>
            )}
            {screen === 'tasks' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nueva tarea
              </button>
            )}
            {screen === 'suppliers' && (
              <button className="hidden sm:flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none" onClick={() => { setEditingId(null); setForms(p => ({ ...p, supName: '', supCategory: 'Otro', supPhone: '', supEmail: '', supAddress: '', supWebsite: '', supNotes: '', supRating: '5' })); openModal('supplier'); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo proveedor
              </button>
            )}
            <div className={`w-9 h-9 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border flex-shrink-0 ${avatarColor(authUser?.uid)}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
          </div>
        </header>

        {/* Auto Notification Permission Banner */}
        {showNotifBanner && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[var(--af-accent)]/10 via-[var(--af-accent)]/5 to-transparent border-b border-[var(--af-accent)]/20 animate-fadeIn">
            <div className="text-xl flex-shrink-0">🔔</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">Activar notificaciones</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Recibe alertas de chat, tareas, reuniones, inventario y más — incluso cuando la app esté cerrada</div>
            </div>
            <button className="px-4 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>
              Activar ahora
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer flex-shrink-0 border-none bg-transparent" onClick={dismissNotifBanner}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* In-App Notification Toasts (bottom-right) */}
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

        {/* Notification Dropdown Panel */}
        {showNotifPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
            <div className="absolute right-2 sm:right-4 top-[60px] z-[60] w-[calc(100vw-16px)] sm:w-[400px] max-h-[85dvh] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col" style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold">Notificaciones</div>
                    {unreadCount > 0 && <span className="min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{unreadCount}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={markAllNotifRead}>
                        Leer todas
                      </button>
                    )}
                    <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:text-red-400" onClick={clearNotifHistory}>
                      Limpiar
                    </button>
                  </div>
                </div>
                {/* Category filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  {[
                    { key: 'all', label: 'Todo', emoji: '🔔' },
                    { key: 'chat', label: 'Chat', emoji: '💬' },
                    { key: 'task', label: 'Tareas', emoji: '📋' },
                    { key: 'meeting', label: 'Reuniones', emoji: '📅' },
                    { key: 'inventory', label: 'Inventario', emoji: '📦' },
                    { key: 'project', label: 'Proyectos', emoji: '📁' },
                    { key: 'approval', label: 'Aprob.', emoji: '✅' },
                    { key: 'reminder', label: 'Record.', emoji: '⏰' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${notifFilterCat === f.key ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                      onClick={() => setNotifFilterCat(f.key)}
                    >{f.emoji} {f.label}</button>
                  ))}
                </div>
              </div>

              {/* Permission prompt */}
              {notifPermission !== 'granted' && (
                <div className="p-4 bg-amber-500/5 border-b border-[var(--border)] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">🔔</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">Activar notificaciones del sistema</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">Para recibir alertas incluso con la app cerrada</div>
                    </div>
                    <button className="px-3 py-1.5 bg-[var(--af-accent)] text-background rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>
                      Activar
                    </button>
                  </div>
                </div>
              )}

              {/* Notification list */}
              <div className="overflow-y-auto flex-1 min-h-0">
                {(() => {
                  const filtered = notifFilterCat === 'all' ? notifHistory : notifHistory.filter(n => n.type === notifFilterCat);
                  if (filtered.length === 0) return (
                    <div className="p-8 text-center">
                      <div className="text-3xl mb-2">🔔</div>
                      <div className="text-sm text-[var(--muted-foreground)]">{notifFilterCat === 'all' ? 'Sin notificaciones' : 'Sin notificaciones de esta categoría'}</div>
                      <div className="text-[11px] text-[var(--af-text3)] mt-1">Las alertas aparecerán aquí</div>
                    </div>
                  );
                  return filtered.slice(0, 50).map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[var(--af-bg3)] border-b border-[var(--border)]/50 ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}
                      onClick={() => {
                        markNotifRead(n.id);
                        if (n.screen) {
                          navigateTo(n.screen, n.itemId);
                          setShowNotifPanel(false);
                        }
                      }}
                    >
                      <div className="text-base flex-shrink-0 mt-0.5">{n.icon || '🔔'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`text-[13px] leading-snug ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</div>
                          {n.type && <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${({chat:'bg-blue-500/10 text-blue-400',task:'bg-purple-500/10 text-purple-400',meeting:'bg-amber-500/10 text-amber-400',inventory:'bg-emerald-500/10 text-emerald-400',project:'bg-cyan-500/10 text-cyan-400',approval:'bg-pink-500/10 text-pink-400',reminder:'bg-red-500/10 text-red-400'} as any)[n.type] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{n.type}</span>}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="text-[10px] text-[var(--af-text3)] mt-1">
                          {(() => {
                            const d = new Date(n.timestamp);
                            const now = new Date();
                            const diff = now.getTime() - d.getTime();
                            if (diff < 60000) return 'Ahora mismo';
                            if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
                            if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
                            return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                          })()}
                        </div>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--af-accent)] flex-shrink-0 mt-2" />}
                    </div>
                  ));
                })()}
              </div>

              {/* Settings footer */}
              <div className="p-3 border-t border-[var(--border)] bg-[var(--af-bg3)] flex-shrink-0">
                <div className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Configurar alertas</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'chat', label: '💬 Chat' },
                    { key: 'tasks', label: '📋 Tareas' },
                    { key: 'meetings', label: '📅 Reuniones' },
                    { key: 'approvals', label: '✅ Aprobaciones' },
                    { key: 'inventory', label: '📦 Inventario' },
                    { key: 'projects', label: '📁 Proyectos' },
                  ].map(p => (
                    <button
                      key={p.key}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifPrefs[p.key] ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                      onClick={() => toggleNotifPref(p.key)}
                    >
                      {p.label}
                      {notifPrefs[p.key] && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifSound ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                      onClick={() => setNotifSound(!notifSound)}
                    >🔊 Sonido</button>
                    <span className="text-[10px] text-[var(--af-text3)]">
                      {notifPermission === 'granted' ? '✅ OS activas' : notifPermission === 'denied' ? '❌ OS bloqueadas' : '⏳ Sin activar OS'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--af-text3)]">
                    {notifHistory.length} total
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <main id="main-content" className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`} style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}>

          {/* DASHBOARD */}
          {screen === 'dashboard' && <DashboardScreen />}

          {/* PROJECTS */}
          {screen === 'projects' && <ProjectsScreen />}

          {/* ===== PROJECT DETAIL ===== */}
          {screen === 'projectDetail' && <ProjectDetailScreen />}

          {/* ===== TASKS ===== */}
          {screen === 'tasks' && <TasksScreen />}

          {/* ===== CHAT ===== */}
          {screen === 'chat' && <ChatScreen />}

          {/* ===== GLOBAL BUDGET ===== */}
          {screen === 'budget' && <BudgetScreen />}

          {/* ===== GLOBAL FILES ===== */}
          {screen === 'files' && <FilesScreen />}

          {/* GLOBAL OBRA */}
          {screen === 'obra' && <ObraScreen />}

          {/* SUPPLIERS */}
          {screen === 'suppliers' && <SuppliersScreen />}

          {/* TEAM MANAGEMENT */}
          {screen === 'team' && <TeamScreen />}

          {/* COMPANIES */}
          {screen === 'companies' && <CompaniesScreen />}

          {/* ===== CALENDAR ===== */}
          {screen === 'calendar' && <CalendarScreen />}


          {/* GLOBAL PORTAL */}
          {screen === 'portal' && <PortalScreen />}


              {/* GALLERY */}
              {screen === 'gallery' && <GalleryScreen />}


          {/* ===== INVENTORY SECTION ===== */}
          {screen === 'inventory' && <InventoryScreen />}

          {/* ===== ADMIN PANEL ===== */}
          {screen === 'admin' && <AdminScreen />}

              {/* ===== PROFILE ===== */}
          {screen === 'profile' && <ProfileScreen />}

          {/* ===== INSTALL APP GUIDE ===== */}
          {screen === 'install' && <InstallScreen />}

        </main>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-lg border-t border-[var(--border)] flex z-40 safe-bottom" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
        {[
          { id: 'dashboard', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: 'Inicio' },
          { id: 'projects', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Proyectos' },
          { id: 'tasks', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: 'Tareas' },
          { id: 'chat', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat' },
          { id: '_more', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>, label: 'Más' },
        ].map(item => {
          const isActive = item.id === '_more' ? sidebarOpen : screen === item.id;
          return (
          <button key={item.id} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-all relative ${isActive ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'}`} onClick={() => item.id === '_more' ? setSidebarOpen(true) : navigateTo(item.id, null)}>
            {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--af-accent)]" />}
            {item.icon}
            <span className="text-[10px] leading-tight font-medium">{item.label}</span>
          </button>
          );
        })}
      </nav>

      {/* ===== MODALS ===== */}

      {/* Project Modal */}
      {modals.project && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('project')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Casa Pérez" value={forms.projName || ''} onChange={e => setForms(p => ({ ...p, projName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Estado</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.projStatus || 'Concepto'} onChange={e => setForms(p => ({ ...p, projStatus: e.target.value }))}><option value="Concepto">Concepto</option><option value="Diseno">Diseño</option><option value="Ejecucion">Ejecución</option><option value="Terminado">Terminado</option></select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cliente</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre del cliente" value={forms.projClient || ''} onChange={e => setForms(p => ({ ...p, projClient: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Ubicación</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Barrio, Ciudad" value={forms.projLocation || ''} onChange={e => setForms(p => ({ ...p, projLocation: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Empresa</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.projCompany || ''} onChange={e => setForms(p => ({ ...p, projCompany: e.target.value }))}><option value="">Sin empresa asignada</option>{companies.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Presupuesto (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="48000000" value={forms.projBudget || ''} onChange={e => setForms(p => ({ ...p, projBudget: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha inicio</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.projStart || ''} onChange={e => setForms(p => ({ ...p, projStart: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha entrega</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.projEnd || ''} onChange={e => setForms(p => ({ ...p, projEnd: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Presupuesto (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="48000000" value={forms.projBudget || ''} onChange={e => setForms(p => ({ ...p, projBudget: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.projDesc || ''} onChange={e => setForms(p => ({ ...p, projDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('project')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveProject}>{editingId ? 'Guardar' : 'Crear proyecto'}</button>
          </div>
        </div>
      </div>)}

      {/* Task Modal */}
      {modals.task && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('task')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar tarea' : 'Nueva tarea'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="¿Qué hay que hacer?" value={forms.taskTitle || ''} onChange={e => setForms(p => ({ ...p, taskTitle: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Detalles adicionales..." value={forms.taskDescription || ''} onChange={e => setForms(p => ({ ...p, taskDescription: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskProject || ''} onChange={e => setForms(p => ({ ...p, taskProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Responsable</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskAssignee || ''} onChange={e => setForms(p => ({ ...p, taskAssignee: e.target.value }))}><option value="">Sin asignar</option>{teamUsers.map(u => <option key={u.id} value={u.id}>{u.data.name}{u.id === authUser?.uid ? ' (Tú)' : ''}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Prioridad</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskPriority || 'Media'} onChange={e => setForms(p => ({ ...p, taskPriority: e.target.value }))}><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Estado</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskStatus || 'Por hacer'} onChange={e => setForms(p => ({ ...p, taskStatus: e.target.value }))}><option value="Por hacer">Por hacer</option><option value="En progreso">En progreso</option><option value="Revision">Revisión</option><option value="Completado">Completado</option></select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha límite</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.taskDue || ''} onChange={e => setForms(p => ({ ...p, taskDue: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('task')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={saveTask} disabled={isSavingTask}>{isSavingTask ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear tarea'}</button>
          </div>
        </div>
      </div>)}

      {/* Expense Modal */}
      {modals.expense && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('expense')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">Registrar gasto</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Concepto *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Descripción del gasto" value={forms.expConcept || ''} onChange={e => setForms(p => ({ ...p, expConcept: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.expProject || ''} onChange={e => setForms(p => ({ ...p, expProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.expCategory || 'Materiales'} onChange={e => setForms(p => ({ ...p, expCategory: e.target.value }))}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Monto (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="0" value={forms.expAmount || ''} onChange={e => setForms(p => ({ ...p, expAmount: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.expDate || ''} onChange={e => setForms(p => ({ ...p, expDate: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('expense')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveExpense}>Registrar</button>
          </div>
        </div>
      </div>)}

      {/* Supplier Modal */}
      {modals.supplier && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('supplier')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre del proveedor" value={forms.supName || ''} onChange={e => setForms(p => ({ ...p, supName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.supCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, supCategory: e.target.value }))}>{SUPPLIER_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Teléfono</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="+57 300..." value={forms.supPhone || ''} onChange={e => setForms(p => ({ ...p, supPhone: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Email</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="contacto@empresa.com" value={forms.supEmail || ''} onChange={e => setForms(p => ({ ...p, supEmail: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Dirección</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Dirección" value={forms.supAddress || ''} onChange={e => setForms(p => ({ ...p, supAddress: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Sitio web</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="www.empresa.com" value={forms.supWebsite || ''} onChange={e => setForms(p => ({ ...p, supWebsite: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Calificación (1-5)</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.supRating || '5'} onChange={e => setForms(p => ({ ...p, supRating: e.target.value }))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} ({n})</option>)}</select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Notas</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Notas..." value={forms.supNotes || ''} onChange={e => setForms(p => ({ ...p, supNotes: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('supplier')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveSupplier}>{editingId ? 'Guardar' : 'Crear proveedor'}</button>
          </div>
        </div>
      </div>)}

      {/* Time Entry Modal */}
      {modals.timeEntry && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('timeEntry')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">Registro Manual de Tiempo</h3>
          <div className="space-y-3">
            <select className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" value={forms.teProject || ''} onChange={e => setForms(p => ({ ...p, teProject: e.target.value }))}>
              <option value="">Seleccionar proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
            </select>
            <select className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" value={forms.tePhase || ''} onChange={e => setForms(p => ({ ...p, tePhase: e.target.value }))}>
              <option value="">Fase (opcional)</option>
              {DEFAULT_PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
            </select>
            <textarea className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none resize-none" rows={2} placeholder="Descripcion de la actividad" value={forms.teDescription || ''} onChange={e => setForms(p => ({ ...p, teDescription: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Fecha</label>
                <input type="date" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" value={forms.teDate || ''} onChange={e => setForms(p => ({ ...p, teDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Duracion (min)</label>
                <input type="number" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" placeholder="Ej: 120" value={forms.teManualDuration || ''} onChange={e => setForms(p => ({ ...p, teManualDuration: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Hora inicio</label>
                <input type="time" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" value={forms.teStartTime || ''} onChange={e => setForms(p => ({ ...p, teStartTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Hora fin</label>
                <input type="time" className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none" value={forms.teEndTime || ''} onChange={e => setForms(p => ({ ...p, teEndTime: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={forms.teBillable !== false} onChange={e => setForms(p => ({ ...p, teBillable: e.target.checked }))} className="w-4 h-4 accent-[var(--af-accent)]" /><span className="text-sm">Facturable</span></label>
              <div className="flex items-center gap-2 flex-1"><span className="text-xs text-[var(--muted-foreground)]">Tarifa/h:</span><input type="number" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.teRate || 50000} onChange={e => setForms(p => ({ ...p, teRate: e.target.value }))} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-bg3)] text-[var(--foreground)] border border-[var(--border)]" onClick={() => closeModal('timeEntry')}>Cancelar</button>
            <button className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none" onClick={saveManualTimeEntry}>Guardar</button>
          </div>
        </div>
      </div>)}

      {/* Approval Modal */}
      {modals.approval && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('approval')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">Nueva aprobación</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="¿Qué necesita aprobación?" value={forms.appTitle || ''} onChange={e => setForms(p => ({ ...p, appTitle: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="3" placeholder="Detalles..." value={forms.appDesc || ''} onChange={e => setForms(p => ({ ...p, appDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('approval')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveApproval}>Crear</button>
          </div>
        </div>
      </div>)}

      {/* Meeting Modal */}
      {modals.meeting && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('meeting')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar reunión' : 'Nueva reunión'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Título *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Junta de obra" value={forms.meetTitle || ''} onChange={e => setForms(p => ({ ...p, meetTitle: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.meetProject || ''} onChange={e => setForms(p => ({ ...p, meetProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.meetDate || ''} onChange={e => setForms(p => ({ ...p, meetDate: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hora</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="time" value={forms.meetTime || '09:00'} onChange={e => setForms(p => ({ ...p, meetTime: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Duración</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.meetDuration || '60'} onChange={e => setForms(p => ({ ...p, meetDuration: e.target.value }))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1.5 horas</option><option value="120">2 horas</option></select></div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Participantes (separados por coma)</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre 1, Nombre 2, ..." value={forms.meetAttendees || ''} onChange={e => setForms(p => ({ ...p, meetAttendees: e.target.value }))} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {teamUsers.slice(0, 8).map(u => {
                const currentAttendees = (forms.meetAttendees || '').split(',').map((s: string) => s.trim().toLowerCase());
                const isSelected = currentAttendees.includes(u.data.name.toLowerCase());
                return (
                  <button key={u.id} type="button" className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-all border ${isSelected ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--input)]'}`} onClick={() => {
                    const current = (forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    if (isSelected) { setForms(p => ({ ...p, meetAttendees: current.filter((n: string) => n.toLowerCase() !== u.data.name.toLowerCase()).join(', ') })); }
                    else { setForms(p => ({ ...p, meetAttendees: [...current, u.data.name].join(', ') })); }
                  }}>{u.data.name}</button>
                );
              })}
            </div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Agenda o notas de la reunión..." value={forms.meetDesc || ''} onChange={e => setForms(p => ({ ...p, meetDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('meeting')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveMeeting}>{editingId ? 'Guardar' : 'Crear reunión'}</button>
          </div>
        </div>
      </div>)}

      {/* Gallery Photo Modal */}
      {modals.gallery && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('gallery')}>
  <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
    <div className="text-lg font-semibold mb-5">{editingId ? 'Editar foto' : '📸 Agregar foto'}</div>
    
    {/* Image preview / upload area */}
    <div className="mb-4">
      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Foto *</label>
      {forms.galleryImageData ? (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
          <img src={forms.galleryImageData} alt="Preview" className="w-full max-h-[200px] object-contain bg-[var(--af-bg3)]" />
          <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors" onClick={() => setForms(p => ({ ...p, galleryImageData: '' }))}>✕</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--muted-foreground)]" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span className="text-sm text-[var(--muted-foreground)]">Toca para seleccionar una imagen</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG, WebP — máx. 5 MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleGalleryImageSelect} />
        </label>
      )}
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
      <div>
        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label>
        <select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryProject || ''} onChange={e => setForms(p => ({ ...p, galleryProject: e.target.value }))}>
          <option value="">Sin proyecto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label>
        <select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, galleryCategory: e.target.value }))}>
          {PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
    <div className="mb-3">
      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label>
      <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Vista frontal del proyecto" value={forms.galleryCaption || ''} onChange={e => setForms(p => ({ ...p, galleryCaption: e.target.value }))} />
    </div>
    <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
      <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('gallery')}>Cancelar</button>
      <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveGalleryPhoto}>{editingId ? 'Guardar' : 'Subir foto'}</button>
    </div>
  </div>
</div>)}

      {/* Inventory Product Modal */}
      {modals.invProduct && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invProduct')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[520px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar producto' : '📦 Nuevo producto'}</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Cemento Portland" value={forms.invProdName || ''} onChange={e => setForms(p => ({ ...p, invProdName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">SKU</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="CMP-001" value={forms.invProdSku || ''} onChange={e => setForms(p => ({ ...p, invProdSku: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdCat || ''} onChange={e => setForms(p => ({ ...p, invProdCat: e.target.value }))}><option value="">Sin categoría</option>{invCategories.map(c => <option key={c.id} value={c.id}>{c.data.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Unidad</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdUnit || 'Unidad'} onChange={e => setForms(p => ({ ...p, invProdUnit: e.target.value }))}>{INV_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Precio unit. (COP)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="50000" value={forms.invProdPrice || ''} onChange={e => setForms(p => ({ ...p, invProdPrice: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Stock por almacén</label>
            <div className="space-y-2">
              {INV_WAREHOUSES.map(wh => (
                <div key={wh} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] w-36 sm:w-44 flex-shrink-0 truncate">{wh}</span>
                  <input className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="0" value={forms[`invProdWS_${wh.replace(/\s/g, '_')}`] || '0'} onChange={e => setForms(p => ({ ...p, [`invProdWS_${wh.replace(/\s/g, '_')}`]: e.target.value }))} />
                  <span className="text-xs text-[var(--muted-foreground)] w-8">{forms.invProdUnit || 'Unidad'}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Product Image */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Foto del producto</label>
            {forms.invProdImage ? (
              <div className="relative rounded-xl overflow-hidden border border-[var(--border)] inline-block">
                <img src={forms.invProdImage} alt="Preview" className="w-full max-h-[140px] object-contain bg-[var(--af-bg3)]" />
                <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors cursor-pointer" onClick={() => setForms(p => ({ ...p, invProdImage: '' }))}>✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--muted-foreground)]" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="text-xs text-[var(--muted-foreground)]">Toca para agregar foto</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG — máx 3 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleInvProductImageSelect} />
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Stock mínimo (total)</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="number" placeholder="5" value={forms.invProdMinStock || '5'} onChange={e => setForms(p => ({ ...p, invProdMinStock: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Almacén principal</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invProdWarehouse || 'Almacén Principal'} onChange={e => setForms(p => ({ ...p, invProdWarehouse: e.target.value }))}>{INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.invProdDesc || ''} onChange={e => setForms(p => ({ ...p, invProdDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invProduct')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveInvProduct}>{editingId ? 'Guardar' : 'Crear producto'}</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Category Modal */}
      {modals.invCategory && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invCategory')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[420px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar categoría' : '🏷️ Nueva categoría'}</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Materiales" value={forms.invCatName || ''} onChange={e => setForms(p => ({ ...p, invCatName: e.target.value }))} /></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Color</label><div className="flex flex-wrap gap-2">{CAT_COLORS.map(color => (<button key={color} className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${forms.invCatColor === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setForms(p => ({ ...p, invCatColor: color }))} />))}</div></div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Descripción..." value={forms.invCatDesc || ''} onChange={e => setForms(p => ({ ...p, invCatDesc: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invCategory')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveInvCategory}>{editingId ? 'Guardar' : 'Crear categoría'}</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Movement Modal */}
      {modals.invMovement && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invMovement')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">📋 Registrar movimiento</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              <button className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Entrada' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, invMovType: 'Entrada' }))}>↓ Entrada</button>
              <button className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${forms.invMovType === 'Salida' ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-[var(--af-bg3)] border-[var(--border)] text-[var(--muted-foreground)]'}`} onClick={() => setForms(p => ({ ...p, invMovType: 'Salida' }))}>↑ Salida</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Producto *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invMovProduct || ''} onChange={e => setForms(p => ({ ...p, invMovProduct: e.target.value }))}><option value="">Seleccionar producto</option>{invProducts.map(p => <option key={p.id} value={p.id}>{p.data.name} (Total: {getTotalStock(p)})</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Almacén *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invMovWarehouse || 'Almacén Principal'} onChange={e => setForms(p => ({ ...p, invMovWarehouse: e.target.value }))}>{INV_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cantidad *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="10" min="1" value={forms.invMovQty || ''} onChange={e => setForms(p => ({ ...p, invMovQty: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.invMovDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invMovDate: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Referencia</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Factura #..." value={forms.invMovRef || ''} onChange={e => setForms(p => ({ ...p, invMovRef: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Motivo</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" placeholder="Compra proveedor, Uso en obra..." value={forms.invMovReason || ''} onChange={e => setForms(p => ({ ...p, invMovReason: e.target.value }))} /></div>
          {forms.invMovProduct && (() => { const prod = invProducts.find(p => p.id === forms.invMovProduct); if (!prod) return null; const wh = forms.invMovWarehouse || 'Almacén Principal'; const curStock = getWarehouseStock(prod, wh); const qty = Number(forms.invMovQty || 0); return (
            <div className={`rounded-lg p-3 mb-3 text-sm border ${forms.invMovType === 'Salida' && qty > curStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {wh}:</span><span className="font-medium">{curStock} {prod.data.unit}</span></div>
              {qty > 0 && (<div className="flex justify-between mt-1"><span className="text-[var(--muted-foreground)]">Después:</span><span className={`font-bold ${forms.invMovType === 'Salida' && qty > curStock ? 'text-red-400' : 'text-[var(--foreground)]'}`}>{forms.invMovType === 'Entrada' ? curStock + qty : Math.max(0, curStock - qty)} {prod.data.unit}</span></div>)}
              {forms.invMovType === 'Salida' && qty > curStock && (<div className="text-red-400 text-xs mt-1">⚠ Excede stock disponible en {wh}</div>)}
            </div>
          ); })()}
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invMovement')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-emerald-600 text-white border-none hover:bg-emerald-700 transition-colors" onClick={saveInvMovement}>Registrar</button>
          </div>
        </div>
      </div>)}

      {/* Inventory Transfer Modal */}
      {modals.invTransfer && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('invTransfer')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">🔄 Nueva transferencia</div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Producto *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrProduct || ''} onChange={e => setForms(p => ({ ...p, invTrProduct: e.target.value }))}><option value="">Seleccionar producto</option>{invProducts.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Desde (origen) *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrFrom || ''} onChange={e => setForms(p => ({ ...p, invTrFrom: e.target.value }))}><option value="">Seleccionar</option>{INV_WAREHOUSES.map(w => <option key={w} value={w} disabled={w === forms.invTrTo}>{w}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Hasta (destino) *</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.invTrTo || ''} onChange={e => setForms(p => ({ ...p, invTrTo: e.target.value }))}><option value="">Seleccionar</option>{INV_WAREHOUSES.map(w => <option key={w} value={w} disabled={w === forms.invTrFrom}>{w}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Cantidad *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="number" placeholder="10" min="1" value={forms.invTrQty || ''} onChange={e => setForms(p => ({ ...p, invTrQty: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.invTrDate || new Date().toISOString().split('T')[0]} onChange={e => setForms(p => ({ ...p, invTrDate: e.target.value }))} /></div>
          </div>
          <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Notas</label><textarea className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none" rows="2" placeholder="Motivo de la transferencia..." value={forms.invTrNotes || ''} onChange={e => setForms(p => ({ ...p, invTrNotes: e.target.value }))} /></div>
          {/* Live preview */}
          {forms.invTrProduct && forms.invTrFrom && (() => { const prod = invProducts.find(p => p.id === forms.invTrProduct); if (!prod) return null; const fromStock = getWarehouseStock(prod, forms.invTrFrom); const toStock = getWarehouseStock(prod, forms.invTrTo); const qty = Number(forms.invTrQty || 0); return (
            <div className={`rounded-lg p-3 mb-3 text-sm border space-y-1 ${qty > fromStock ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {forms.invTrFrom}:</span><span className="font-medium">{fromStock} → {qty > fromStock ? '❌' : fromStock - qty} {prod.data.unit}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Stock en {forms.invTrTo}:</span><span className="font-medium">{toStock} → {toStock + qty} {prod.data.unit}</span></div>
              {qty > fromStock && (<div className="text-red-400 text-xs">⚠ Stock insuficiente en origen</div>)}
            </div>
          ); })()}
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('invTransfer')}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-blue-600 text-white border-none hover:bg-blue-700 transition-colors" onClick={saveInvTransfer}>Transferir</button>
          </div>
        </div>
      </div>)}

      {/* Company Modal */}
      {modals.company && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('company')}>
        <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[500px] sm:max-w-[95vw] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
          <div className="text-lg font-semibold mb-5">{editingId ? 'Editar empresa' : 'Nueva empresa'}</div>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre comercial *</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Arquitectura Pérez SAS" value={forms.compName || ''} onChange={e => setForms(p => ({ ...p, compName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Razón legal</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Nombre legal completo" value={forms.compLegal || ''} onChange={e => setForms(p => ({ ...p, compLegal: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">NIT</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: 900123456-7" value={forms.compNit || ''} onChange={e => setForms(p => ({ ...p, compNit: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Teléfono</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="+57 300 1234567" value={forms.compPhone || ''} onChange={e => setForms(p => ({ ...p, compPhone: e.target.value }))} /></div>
            </div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Correo de contacto</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="contacto@empresa.com" value={forms.compEmail || ''} onChange={e => setForms(p => ({ ...p, compEmail: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Dirección</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Dirección de la empresa" value={forms.compAddress || ''} onChange={e => setForms(p => ({ ...p, compAddress: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('company')}>Cancelar</button>
            <button className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveCompany}>{editingId ? 'Guardar cambios' : 'Crear empresa'}</button>
          </div>
        </div>
      </div>)}

      {/* ===== REPORTES ===== */}

      {/* ===== TIME TRACKING ===== */}
      {screen === 'timeTracking' && <TimeTrackingScreen />}
      

      {/* ===== INVOICES ===== */}
      {screen === 'invoices' && <InvoicesScreen />}
      {screen === 'reports' && <ReportsScreen />}

      {/* Lightbox Viewer */}
      {lightboxPhoto && (<div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn" onClick={closeLightbox}>
  <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
    {/* Close button */}
    <button className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors" onClick={closeLightbox}>✕</button>
    {/* OneDrive photo lightbox */}
    {lightboxPhoto.thumbnailLarge || lightboxPhoto.thumbnailUrl ? (
      <>
        {/* Download button */}
        <button className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => downloadOneDriveFile(lightboxPhoto.id, lightboxPhoto.name)} title="Descargar">⬇️</button>
        {/* Image */}
        <img src={lightboxPhoto.thumbnailLarge || lightboxPhoto.webUrl} className="max-w-full max-h-[80dvh] object-contain rounded-lg" alt={lightboxPhoto.name || ''} />
        {/* Navigation */}
        <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => {
            const prev = (lightboxIndex - 1 + odGalleryPhotos.length) % odGalleryPhotos.length;
            setLightboxIndex(prev); setLightboxPhoto(odGalleryPhotos[prev]);
          }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-white/60 text-sm">{lightboxIndex + 1} / {odGalleryPhotos.length}</span>
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => {
            const next = (lightboxIndex + 1) % odGalleryPhotos.length;
            setLightboxIndex(next); setLightboxPhoto(odGalleryPhotos[next]);
          }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-[11px] mt-2">{lightboxPhoto.name || ''}</div>
      </>
    ) : (
      <>
        {/* Main gallery photo lightbox */}
        <div className="absolute top-3 left-3 z-10 text-left">
          {lightboxPhoto.data.caption && <div className="text-white text-sm font-medium">{lightboxPhoto.data.caption}</div>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded bg-white/15 text-white/80">{lightboxPhoto.data.categoryName}</span>
            {(() => { const proj = projects.find(p => p.id === lightboxPhoto.data.projectId); return proj ? <span className="text-xs text-white/60">{proj.data.name}</span> : null; })()}
          </div>
        </div>
        {/* Image */}
        <img src={lightboxPhoto.data.imageData} alt={lightboxPhoto.data.caption || 'Foto'} className="max-w-full max-h-[80dvh] object-contain rounded-lg" />
        {/* Navigation */}
        <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxPrev}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-white/60 text-sm">{lightboxIndex + 1} / {getFilteredGalleryPhotos().length}</span>
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxNext}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </>
    )}
  </div>
</div>)}

      {/* Escape key handler */}
      <div style={{ display: 'none' }} aria-hidden="true" ref={() => {
        if (typeof window === 'undefined') return;
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            if (lightboxPhoto) closeLightbox();
            else if (Object.values(modals).some(Boolean)) { Object.keys(modals).forEach(k => closeModal(k)); }
          }
          if (lightboxPhoto) {
            if (e.key === 'ArrowLeft') lightboxPrev();
            if (e.key === 'ArrowRight') lightboxNext();
          }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }} />
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
