'use client';
import { useRef } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { avatarColor } from '@/lib/helpers';
import { EXPENSE_CATS, SUPPLIER_CATS, PHOTO_CATS, INV_UNITS, INV_WAREHOUSES, CAT_COLORS, PROJECT_PHASES, PHASE_GROUP_ICONS } from '@/lib/constants';

/* ===== Extracted Screens ===== */
import DashboardScreen from '@/screens/DashboardScreen';
import ProjectsScreen from '@/screens/ProjectsScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';
import TasksScreen from '@/screens/TasksScreen';
import ChatScreen from '@/screens/ChatScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import FilesScreen from '@/screens/FilesScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import AdminScreen from '@/screens/AdminScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import OneDriveScreen from '@/screens/OneDriveScreen';
import InstallScreen from '@/screens/InstallScreen';
import CalendarScreen from '@/screens/CalendarScreen';
import GalleryScreen from '@/screens/GalleryScreen';
import SuppliersScreen from '@/screens/SuppliersScreen';
import TeamScreen from '@/screens/TeamScreen';
import PortalScreen from '@/screens/PortalScreen';
import ObraScreen from '@/screens/ObraScreen';

/* ===== Layout Components ===== */
import AuthScreen from '@/components/layout/AuthScreen';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

/* ===== SCREEN TITLES ===== */
const screenTitles: Record<string, string> = {
  dashboard: 'Dashboard', projects: 'Proyectos', tasks: 'Tareas', chat: 'Mensajes',
  budget: 'Presupuestos', files: 'Planos y archivos', onedrive: 'OneDrive',
  gallery: 'Galería', inventory: 'Inventario', admin: 'Panel Admin',
  obra: 'Seguimiento obra', suppliers: 'Proveedores', team: 'Equipo',
  calendar: 'Calendario', portal: 'Portal cliente', settings: 'Configuración',
  profile: 'Mi Perfil', install: 'Instalar App',
};

/* ===== MODALS COMPONENT ===== */
function Modals() {
  const {
    modals, closeModal, forms, setForms, editingId,
    projects, teamUsers, invCategories, invProducts,
    saveProject, saveTask, saveExpense, saveSupplier, saveApproval,
    saveMeeting, saveGalleryPhoto, saveInvProduct, saveInvCategory,
    saveInvMovement, saveInvTransfer, addCustomPhase,
    handleGalleryImageSelect, handleInvProductImageSelect,
    getWarehouseStock, getTotalStock,
  } = useApp();

  return (<>
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
          <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Responsable</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskAssignee || ''} onChange={e => setForms(p => ({ ...p, taskAssignee: e.target.value }))}><option value="">Sin asignar</option>{teamUsers.map(u => <option key={u.id} value={u.id}>{u.data.name}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Prioridad</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskPriority || 'Media'} onChange={e => setForms(p => ({ ...p, taskPriority: e.target.value }))}><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
          <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Estado</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.taskStatus || 'Por hacer'} onChange={e => setForms(p => ({ ...p, taskStatus: e.target.value }))}><option value="Por hacer">Por hacer</option><option value="En progreso">En progreso</option><option value="Revision">Revisión</option><option value="Completado">Completado</option></select></div>
        </div>
        <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Fecha límite</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" type="date" value={forms.taskDue || ''} onChange={e => setForms(p => ({ ...p, taskDue: e.target.value }))} /></div>
        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
          <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all" onClick={() => closeModal('task')}>Cancelar</button>
          <button className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={saveTask}>{editingId ? 'Guardar cambios' : 'Crear tarea'}</button>
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

    {/* Approval Modal */}
    {modals.approval && (<div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={() => closeModal('approval')}>
      <div className="bg-[var(--card)] border sm:border border-[var(--input)] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:w-[480px] sm:max-w-[95vw] animate-slideUp sm:animate-slideIn" onClick={e => e.stopPropagation()}>
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
          <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Proyecto</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryProject || ''} onChange={e => setForms(p => ({ ...p, galleryProject: e.target.value }))}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.data.name}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Categoría</label><select className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" value={forms.galleryCategory || 'Otro'} onChange={e => setForms(p => ({ ...p, galleryCategory: e.target.value }))}>{PHOTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div className="mb-3"><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Descripción</label><input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Vista frontal del proyecto" value={forms.galleryCaption || ''} onChange={e => setForms(p => ({ ...p, galleryCaption: e.target.value }))} /></div>
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
        <div className="mb-3">
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Foto del producto</label>
          {forms.invProdImage ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--border)] inline-block">
              <img src={forms.invProdImage} alt="Preview" className="w-full max-h-[140px] object-contain bg-[var(--af-bg3)]" />
              <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors cursor-pointer" onClick={() => setForms(p => ({ ...p, invProdImage: '' }))}>✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--af-accent)]/50 transition-colors bg-[var(--af-bg3)]">
              <span className="text-sm text-[var(--muted-foreground)]">Seleccionar imagen</span>
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

    {/* Custom Phase Modal */}
    {modals.customPhase && (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal('customPhase'); }}>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Agregar fase personalizada</div>
            <button className="text-[var(--af-text3)] cursor-pointer hover:text-[var(--foreground)]" onClick={() => closeModal('customPhase')}>✕</button>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Grupo</label>
            <div className="flex gap-2">
              {PROJECT_PHASES.map(g => (
                <button key={g.group} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all ${(forms.customPhaseGroup || 'Construcción') === g.group ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, customPhaseGroup: g.group }))}>
                  {PHASE_GROUP_ICONS[g.group]} {g.group}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre de la fase *</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Ej: Paisajismo" value={forms.customPhaseName || ''} onChange={e => setForms(p => ({ ...p, customPhaseName: e.target.value }))} />
          </div>
          <button className="w-full bg-[var(--af-accent)] text-background border-none rounded-lg py-2.5 text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors" onClick={addCustomPhase}>Agregar fase</button>
        </div>
      </div>
    )}
  </>);
}

/* ===== LIGHTBOX COMPONENT ===== */
function Lightbox() {
  const { lightboxPhoto, closeLightbox, lightboxPrev, lightboxNext, lightboxIndex, getFilteredGalleryPhotos, projects } = useApp();

  if (!lightboxPhoto) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center animate-fadeIn" onClick={closeLightbox}>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <button className="absolute top-3 right-3 pt-[env(safe-area-inset-top,0px)] z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors" onClick={closeLightbox}>✕</button>
        <div className="absolute top-3 left-3 z-10 text-left">
          {lightboxPhoto.data.caption && <div className="text-white text-sm font-medium">{lightboxPhoto.data.caption}</div>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded bg-white/15 text-white/80">{lightboxPhoto.data.categoryName}</span>
            {(() => { const proj = projects.find(p => p.id === lightboxPhoto.data.projectId); return proj ? <span className="text-xs text-white/60">{proj.data.name}</span> : null; })()}
          </div>
        </div>
        <img src={lightboxPhoto.data.imageData} alt={lightboxPhoto.data.caption || 'Foto'} className="max-w-full max-h-[80dvh] object-contain rounded-lg" />
        <div className="flex items-center gap-4 mt-4 pb-[env(safe-area-inset-bottom,0px)]">
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxPrev}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-white/60 text-sm">{lightboxIndex + 1} / {getFilteredGalleryPhotos().length}</span>
          <button className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={lightboxNext}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div ref={useRef<HTMLDivElement>(null)} onKeyDown={e => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxPrev();
        if (e.key === 'ArrowRight') lightboxNext();
      }} style={{ display: 'none' }} />
    </div>
  );
}

/* ===== MAIN APP CONTENT ===== */
function AppContent() {
  const {
    ready, loading, authUser, screen, sidebarOpen, setSidebarOpen, navigateTo,
    toast, darkMode, toggleTheme, userName, initials, currentProject,
    showNotifPanel, setShowNotifPanel, unreadCount, markAllNotifRead, clearNotifHistory,
    markNotifRead, notifFilterCat, setNotifFilterCat, notifHistory, notifPermission,
    requestNotifPermission, notifPrefs, notifSound, setNotifSound, toggleNotifPref,
    showNotifBanner, dismissNotifBanner, inAppNotifs,
    showInstallBanner, installPrompt, isStandalone, handleInstall, dismissInstallBanner,
    openModal, setEditingId, setForms, projects, tasks,
  } = useApp();

  const dismissedNotifs = useRef<Set<string>>(new Set());

  /* ===== LOADING SCREEN ===== */
  if (!ready || loading) return (
    <div className="flex items-center justify-center h-dvh bg-background" style={{ height: '100dvh' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[var(--af-accent)]/30 border-t-[var(--af-accent)] rounded-full animate-spin" />
        <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-[var(--af-accent)]">ArchiFlow</div>
      </div>
    </div>
  );

  /* ===== AUTH SCREEN ===== */
  if (!authUser) return <AuthScreen />;

  /* ===== MAIN APP LAYOUT ===== */
  return (
    <div className="flex h-dvh overflow-hidden" style={{ height: '100dvh' }}>
      {/* Toast */}
      {toast && <div className={`af-toast ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white`}>{toast.msg}</div>}

      {/* Install Banner */}
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
                  <button className="flex-1 bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={handleInstall}>Instalar app</button>
                  <button className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[var(--af-bg3)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors" onClick={dismissInstallBanner}>Ahora no</button>
                </div>
              </div>
              <button className="w-9 h-9 flex items-center justify-center text-[var(--af-text3)] cursor-pointer hover:text-[var(--foreground)] flex-shrink-0" onClick={dismissInstallBanner}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar / Header */}
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
            <div className="text-base font-medium truncate">{screen === 'projectDetail' ? (currentProject?.data.name || 'Proyecto') : (screenTitles[screen] || '')}</div>
            <div className="text-xs text-[var(--muted-foreground)] hidden md:block">
              {screen === 'dashboard' ? `Bienvenido, ${userName.split(' ')[0]}` : screen === 'projectDetail' ? currentProject?.data.status || '' : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all relative" onClick={() => setShowNotifPanel(!showNotifPanel)} title="Notificaciones">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              {unreadCount > 0 && (<span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>)}
              {notifPermission === 'default' && (<span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-amber-500 rounded-full animate-pulse" />)}
            </button>
            {/* Theme toggle */}
            <button className="w-9 h-9 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all" onClick={toggleTheme} title={(darkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche') + ' (Ctrl+D)'}>
              {darkMode ? (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            {/* Context action buttons */}
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
            <button className="px-4 py-2 bg-[var(--af-accent)] text-background rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>Activar ahora</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer flex-shrink-0 border-none bg-transparent" onClick={dismissNotifBanner}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* In-App Notification Toasts (bottom-right) */}
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
          {inAppNotifs.filter(n => !dismissedNotifs.current.has(n.id)).map(n => (
            <div key={n.id} className="pointer-events-auto bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-2xl flex items-start gap-3 animate-slideUp cursor-pointer hover:border-[var(--af-accent)]/30 transition-all" style={{ width: '340px', maxWidth: 'calc(100vw - 32px)' }} onClick={() => { markNotifRead(n.id); if (n.screen) navigateTo(n.screen, n.itemId); }}>
              <div className="text-lg flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight">{n.title}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2 leading-snug">{n.body}</div>
              </div>
              <button className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0 bg-transparent border-none cursor-pointer mt-0.5" onClick={(e) => { e.stopPropagation(); dismissedNotifs.current.add(n.id); }}>
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Notification Dropdown Panel */}
        {showNotifPanel && (<>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
          <div className="absolute right-2 sm:right-4 top-[60px] z-[60] w-[calc(100vw-16px)] sm:w-[400px] max-h-[85dvh] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col" style={{ animation: 'fadeIn 0.2s ease' }}>
            <div className="p-4 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-semibold">Notificaciones</div>
                  {unreadCount > 0 && <span className="min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{unreadCount}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (<button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={markAllNotifRead}>Leer todas</button>)}
                  <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:text-red-400" onClick={clearNotifHistory}>Limpiar</button>
                </div>
              </div>
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
                  <button key={f.key} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${notifFilterCat === f.key ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setNotifFilterCat(f.key)}>{f.emoji} {f.label}</button>
                ))}
              </div>
            </div>
            {notifPermission !== 'granted' && (
              <div className="p-4 bg-amber-500/5 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🔔</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">Activar notificaciones del sistema</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">Para recibir alertas incluso con la app cerrada</div>
                  </div>
                  <button className="px-3 py-1.5 bg-[var(--af-accent)] text-background rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={requestNotifPermission}>Activar</button>
                </div>
              </div>
            )}
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
                  <div key={n.id} className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[var(--af-bg3)] border-b border-[var(--border)]/50 ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`} onClick={() => { markNotifRead(n.id); if (n.screen) { navigateTo(n.screen, n.itemId); setShowNotifPanel(false); } }}>
                    <div className="text-base flex-shrink-0 mt-0.5">{n.icon || '🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`text-[13px] leading-snug ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</div>
                        {n.type && <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${({chat:'bg-blue-500/10 text-blue-400',task:'bg-purple-500/10 text-purple-400',meeting:'bg-amber-500/10 text-amber-400',inventory:'bg-emerald-500/10 text-emerald-400',project:'bg-cyan-500/10 text-cyan-400',approval:'bg-pink-500/10 text-pink-400',reminder:'bg-red-500/10 text-red-400'} as any)[n.type] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{n.type}</span>}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.body}</div>
                      <div className="text-[10px] text-[var(--af-text3)] mt-1">
                        {(() => { const d = new Date(n.timestamp); const now = new Date(); const diff = now.getTime() - d.getTime(); if (diff < 60000) return 'Ahora mismo'; if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`; if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`; return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); })()}
                      </div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--af-accent)] flex-shrink-0 mt-2" />}
                  </div>
                ));
              })()}
            </div>
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
                  <button key={p.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifPrefs[p.key] ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`} onClick={() => toggleNotifPref(p.key)}>
                    {p.label}
                    {notifPrefs[p.key] && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <button className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notifSound ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`} onClick={() => setNotifSound(!notifSound)}>🔊 Sonido</button>
                  <span className="text-[10px] text-[var(--af-text3)]">{notifPermission === 'granted' ? '✅ OS activas' : notifPermission === 'denied' ? '❌ OS bloqueadas' : '⏳ Sin activar OS'}</span>
                </div>
                <span className="text-[10px] text-[var(--af-text3)]">{notifHistory.length} total</span>
              </div>
            </div>
          </div>
        </>)}

        {/* Content Area */}
        <main id="main-content" className={`flex-1 flex flex-col overflow-hidden ${screen === 'chat' ? 'p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6'}`} style={{ maxHeight: screen === 'chat' ? 'calc(100dvh - 60px)' : undefined }}>
          {screen === 'dashboard' && <DashboardScreen />}
          {screen === 'projects' && <ProjectsScreen />}
          {screen === 'projectDetail' && <ProjectDetailScreen />}
          {screen === 'tasks' && <TasksScreen />}
          {screen === 'chat' && <ChatScreen />}
          {screen === 'budget' && <BudgetScreen />}
          {screen === 'files' && <FilesScreen />}
          {screen === 'inventory' && <InventoryScreen />}
          {screen === 'admin' && <AdminScreen />}
          {screen === 'profile' && <ProfileScreen />}
          {screen === 'settings' && <SettingsScreen />}
          {screen === 'onedrive' && <OneDriveScreen />}
          {screen === 'install' && <InstallScreen />}
          {screen === 'calendar' && <CalendarScreen />}
          {screen === 'gallery' && <GalleryScreen />}
          {screen === 'suppliers' && <SuppliersScreen />}
          {screen === 'team' && <TeamScreen />}
          {screen === 'portal' && <PortalScreen />}
          {screen === 'obra' && <ObraScreen />}
        </main>
      </div>

      {/* Bottom Nav (Mobile) */}
      <BottomNav />

      {/* Modals */}
      <Modals />

      {/* Lightbox */}
      <Lightbox />
    </div>
  );
}

/* ===== PAGE EXPORT ===== */
export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
