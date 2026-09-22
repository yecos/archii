'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare2,
  CalendarDays,
  WalletCards,
  HardHat,
  FolderOpen,
  Users,
  ArrowLeft,
  Plus,
  Clock3,
  CircleAlert,
  BriefcaseBusiness,
  Menu,
  X,
} from 'lucide-react';

import { useApp } from '@/contexts/AppContext';
import LoadingScreen from '@/components/layout/LoadingScreen';
import AuthScreen from '@/components/layout/AuthScreen';
import TenantSelectionScreen from '@/components/layout/TenantSelectionScreen';
import ProjectModal from '@/components/modals/ProjectModal';
import TaskModal from '@/components/modals/TaskModal';
import ExpenseModal from '@/components/modals/ExpenseModal';
import MeetingModal from '@/components/modals/MeetingModal';
import GalleryModal from '@/components/modals/GalleryModal';
import LightboxViewer from '@/components/features/LightboxViewer';
import ConfirmDialog from '@/components/common/ConfirmDialog';

import ProjectsScreen from '@/screens/ProjectsScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';
import TasksScreen from '@/screens/TasksScreen';
import BudgetScreen from '@/screens/BudgetScreen';

const WeeklyAgendaScreen = dynamic(() => import('@/screens/WeeklyAgendaScreen'), { ssr: false });
const FilesScreen = dynamic(() => import('@/screens/FilesScreen'), { ssr: false });
const ObraScreen = dynamic(() => import('@/screens/ObraScreen'), { ssr: false });
const TeamScreen = dynamic(() => import('@/screens/TeamScreen'), { ssr: false });

const TEAM_SCREENS = new Set([
  'dashboard',
  'projects',
  'projectDetail',
  'tasks',
  'weeklyAgenda',
  'budget',
  'obra',
  'files',
  'team',
]);

const navItems = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare2 },
  { id: 'weeklyAgenda', label: 'Agenda', icon: CalendarDays },
  { id: 'budget', label: 'Presupuestos', icon: WalletCards },
  { id: 'obra', label: 'Seguimiento', icon: HardHat },
  { id: 'files', label: 'Archivos', icon: FolderOpen },
  { id: 'team', label: 'Equipo', icon: Users },
] as const;

function TeamDashboard() {
  const {
    projects,
    tasks,
    teamUsers,
    expenses,
    authUser,
    navigateTo,
    openModal,
  } = useApp();

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const activeProjects = projects.filter((p: any) => !['Terminado', 'Completado', 'Cerrado'].includes(p.data.status));
    const pendingTasks = tasks.filter((t: any) => t.data.status !== 'Completado');
    const overdue = pendingTasks.filter((t: any) => t.data.dueDate && t.data.dueDate < today);
    const myTasks = pendingTasks.filter((t: any) =>
      t.data.assigneeId === authUser?.uid || t.data.assigneeIds?.includes(authUser?.uid)
    );
    return { activeProjects, pendingTasks, overdue, myTasks };
  }, [projects, tasks, authUser?.uid]);

  const upcoming = useMemo(() => {
    return [...stats.pendingTasks]
      .filter((t: any) => t.data.dueDate)
      .sort((a: any, b: any) => String(a.data.dueDate).localeCompare(String(b.data.dueDate)))
      .slice(0, 6);
  }, [stats.pendingTasks]);

  const projectName = (id: string) => projects.find((p: any) => p.id === id)?.data.name || 'Sin proyecto';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--af-accent)]/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--af-accent)]">
            Archii Team
          </div>
          <h1 className="font-serif text-3xl leading-tight md:text-5xl">
            Lo importante del equipo, en un solo lugar.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">
            Proyectos, tareas, agenda, presupuesto y seguimiento sin la complejidad del panel completo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => { openModal('project'); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--af-accent)] px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
            >
              <Plus size={16} /> Nuevo proyecto
            </button>
            <button
              onClick={() => { openModal('task'); }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--af-accent)]/40"
            >
              <CheckSquare2 size={16} /> Nueva tarea
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Proyectos activos', value: stats.activeProjects.length, icon: BriefcaseBusiness, target: 'projects' },
          { label: 'Tareas pendientes', value: stats.pendingTasks.length, icon: CheckSquare2, target: 'tasks' },
          { label: 'Mis tareas', value: stats.myTasks.length, icon: Clock3, target: 'tasks' },
          { label: 'Vencidas', value: stats.overdue.length, icon: CircleAlert, target: 'tasks' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigateTo(item.target)}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--af-accent)]/35 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-[var(--af-accent)]" />
                <span className="text-2xl font-semibold md:text-3xl">{item.value}</span>
              </div>
              <div className="mt-4 text-xs text-[var(--muted-foreground)] md:text-sm">{item.label}</div>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Próximas entregas</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">Las tareas más cercanas del equipo</div>
            </div>
            <button onClick={() => navigateTo('weeklyAgenda')} className="text-xs font-semibold text-[var(--af-accent)]">
              Ver agenda
            </button>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                No hay entregas próximas.
              </div>
            ) : upcoming.map((task: any) => (
              <button
                key={task.id}
                onClick={() => navigateTo('tasks', task.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--background)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--af-accent)]/10 text-[var(--af-accent)]">
                  <CheckSquare2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{task.data.title}</div>
                  <div className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{projectName(task.data.projectId)}</div>
                </div>
                <div className="shrink-0 text-xs text-[var(--muted-foreground)]">{task.data.dueDate}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-sm font-semibold">Resumen</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Información compartida con Archii completo</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-sm text-[var(--muted-foreground)]">Miembros</span>
              <span className="font-semibold">{teamUsers.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-sm text-[var(--muted-foreground)]">Proyectos totales</span>
              <span className="font-semibold">{projects.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-sm text-[var(--muted-foreground)]">Registros de gasto</span>
              <span className="font-semibold">{expenses.length}</span>
            </div>
            <div className="rounded-2xl bg-[var(--af-accent)]/8 p-4 text-xs leading-5 text-[var(--muted-foreground)]">
              Todo lo que se cree aquí utiliza la misma base de datos del Archii principal. No necesitas duplicar proyectos ni usuarios.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function TeamPage() {
  const app = useApp();
  const {
    ready,
    loading,
    authUser,
    screen,
    navigateTo,
    forms,
    setForms,
    doLogin,
    doRegister,
    doGoogleLogin,
    doMicrosoftLogin,
    tenantReady,
    activeTenantName,
    userName,
    initials,
    modals,
    openModal,
    closeModal,
    pendingDeleteAction,
    setPendingDeleteAction,
  } = app;

  const [mobileNav, setMobileNav] = React.useState(false);

  useEffect(() => {
    if (ready && authUser && tenantReady && !TEAM_SCREENS.has(screen)) {
      navigateTo('dashboard');
    }
  }, [ready, authUser, tenantReady, screen, navigateTo]);

  if (!ready || loading) return <LoadingScreen />;

  if (!authUser) {
    return (
      <>
        <Toaster position="top-center" richColors closeButton />
        <AuthScreen
          forms={forms}
          setForms={setForms}
          doLogin={doLogin}
          doRegister={doRegister}
          doGoogleLogin={doGoogleLogin}
          doMicrosoftLogin={doMicrosoftLogin}
          showToast={() => {}}
        />
      </>
    );
  }

  if (!tenantReady) return <TenantSelectionScreen />;

  const activeScreen = TEAM_SCREENS.has(screen) ? screen : 'dashboard';
  const currentNav = activeScreen === 'projectDetail' ? 'projects' : activeScreen;
  const title =
    activeScreen === 'projectDetail'
      ? app.currentProject?.data?.name || 'Proyecto'
      : navItems.find((item) => item.id === currentNav)?.label || 'Inicio';

  const renderContent = () => {
    if (activeScreen === 'dashboard') return <TeamDashboard />;
    if (activeScreen === 'projects') return <ProjectsScreen />;
    if (activeScreen === 'projectDetail') return <ProjectDetailScreen />;
    if (activeScreen === 'tasks') return <TasksScreen />;
    if (activeScreen === 'weeklyAgenda') return <WeeklyAgendaScreen />;
    if (activeScreen === 'budget') return <BudgetScreen />;
    if (activeScreen === 'obra') return <ObraScreen />;
    if (activeScreen === 'files') return <FilesScreen />;
    if (activeScreen === 'team') return <TeamScreen />;
    return <TeamDashboard />;
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)]">
      <Toaster position="top-center" richColors closeButton />

      {mobileNav && (
        <button
          aria-label="Cerrar navegación"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform md:relative md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-[var(--border)] px-5">
          <div>
            <div className="font-serif text-2xl tracking-tight">Archii</div>
            <div className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--af-accent)]">Team</div>
          </div>
          <button onClick={() => setMobileNav(false)} className="rounded-lg p-2 text-[var(--muted-foreground)] md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="truncate text-xs font-semibold">{activeTenantName || 'Equipo'}</div>
            <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">Espacio de trabajo</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigateTo(item.id);
                  setMobileNav(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active
                  ? 'bg-[var(--af-accent)]/12 font-semibold text-[var(--af-accent)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <Link href="/" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]">
            <ArrowLeft size={17} />
            Archii completo
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--af-accent)]/15 text-xs font-bold text-[var(--af-accent)]">
              {initials || 'A'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">{userName || authUser.email}</div>
              <div className="truncate text-[10px] text-[var(--muted-foreground)]">Miembro del equipo</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur-xl md:px-6">
          <button onClick={() => setMobileNav(true)} className="rounded-xl border border-[var(--border)] p-2 md:hidden">
            <Menu size={18} />
          </button>
          {activeScreen === 'projectDetail' && (
            <button onClick={() => navigateTo('projects')} className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="min-w-0">
            <div className="truncate text-base font-semibold md:text-lg">{title}</div>
            <div className="hidden text-[11px] text-[var(--muted-foreground)] sm:block">Vista simplificada para el equipo</div>
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button onClick={() => openModal('task')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--af-accent)]/40">
              <Plus size={15} /> Tarea
            </button>
            <button onClick={() => openModal('project')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--af-accent)] px-3 py-2 text-xs font-semibold text-background hover:opacity-90">
              <Plus size={15} /> Proyecto
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7">
          <div className="mx-auto w-full max-w-[1500px]">
            {renderContent()}
          </div>
        </main>
      </div>

      <ProjectModal open={!!modals.project} onClose={() => closeModal('project')} />
      <TaskModal open={!!modals.task} onClose={() => closeModal('task')} />
      <ExpenseModal open={!!modals.expense} onClose={() => closeModal('expense')} />
      <MeetingModal open={!!modals.meeting} onClose={() => closeModal('meeting')} />
      <GalleryModal open={!!modals.gallery} onClose={() => closeModal('gallery')} />
      <LightboxViewer />

      <ConfirmDialog
        open={!!pendingDeleteAction?.open}
        onOpenChange={(open) => { if (!open) setPendingDeleteAction(null); }}
        title={pendingDeleteAction?.title || ''}
        description={pendingDeleteAction?.description}
        confirmLabel={(pendingDeleteAction as any)?.confirmLabel || 'Eliminar'}
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => pendingDeleteAction?.onConfirm()}
      />
    </div>
  );
}
