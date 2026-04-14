'use client';
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  FolderKanban,
  ImageIcon,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  CircleDot,
  MapPin,
  CalendarDays,
  User,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';
import { fmtCOP, fmtDate, fmtDateTime, statusColor, getInitials, avatarColor } from '@/lib/helpers';

/* ===== STATUS HELPERS ===== */

const projectStatusColor = (s: string): string =>
  ({
    Concepto: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    Anteproyecto: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    Proyecto: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'En ejecución': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Entrega: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    Pausado: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Completado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Cancelado: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border-[var(--border)]');

const invoiceStatusColor = (s: string): string =>
  ({
    Borrador: 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]',
    Enviada: 'bg-blue-500/10 text-blue-400',
    Pagada: 'bg-emerald-500/10 text-emerald-400',
    Vencida: 'bg-red-500/10 text-red-400',
    Cancelada: 'bg-red-500/5 text-red-300 line-through',
  }[s] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]');

const progressColor = (p: number): string =>
  p >= 80 ? 'bg-emerald-500' : p >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500';

/* ===== TYPES ===== */

type PortalTab = 'overview' | 'project-detail';
type DetailTab = 'resumen' | 'fotos' | 'facturas' | 'actividad';

/* ===== OVERVIEW VIEW ===== */

function OverviewView({
  onSelectProject,
}: {
  onSelectProject: (id: string) => void;
}) {
  const auth = useAuth();
  const fs = useFirestore();
  const inv = useInvoice();
  const cmt = useComments();

  // Filter projects visible to current user
  const myProjects = useMemo(() => auth.visibleProjects(fs.projects), [auth, fs.projects]);

  const activeProjects = useMemo(
    () => myProjects.filter((p) => !['Completado', 'Cancelado'].includes(p.data.status)),
    [myProjects],
  );

  const myInvoices = useMemo(
    () =>
      inv.invoices.filter((i: any) =>
        myProjects.some((p) => p.id === i.data.projectId),
      ),
    [inv.invoices, myProjects],
  );

  const pendingInvoices = useMemo(
    () =>
      myInvoices.filter(
        (i: any) => i.data.status === 'Enviada' || i.data.status === 'Borrador',
      ),
    [myInvoices],
  );

  // Get last 3 activity items per project (comments + daily logs combined)
  const getProjectActivity = useMemo(() => {
    const map: Record<string, { id: string; text: string; time: any; icon: string }[]> = {};
    myProjects.forEach((p) => {
      const items: { id: string; text: string; time: any; icon: string }[] = [];
      // Recent comments for this project
      cmt.comments
        .filter((c) => c.data.projectId === p.id)
        .slice(-5)
        .reverse()
        .forEach((c) => {
          items.push({
            id: c.id,
            text: c.data.text?.substring(0, 80) || '',
            time: c.data.createdAt,
            icon: '💬',
          });
        });
      // Recent daily logs for this project
      cmt.dailyLogs
        .filter((l) => l.data.projectId === p.id)
        .slice(0, 3)
        .forEach((l) => {
          items.push({
            id: l.id,
            text: `📝 ${l.data.date} — ${(l.data.activities || []).slice(0, 2).join(', ') || 'Sin actividades'}`,
            time: l.data.createdAt,
            icon: '📝',
          });
        });
      items.sort((a, b) => {
        const ta = a.time?.toDate?.() || new Date(0);
        const tb = b.time?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
      map[p.id] = items.slice(0, 3);
    });
    return map;
  }, [cmt.comments, cmt.dailyLogs, myProjects]);

  // Budget info per project
  const getProjectBudget = (projectId: string) => {
    const exps = fs.expenses.filter((e: any) => e.data.projectId === projectId);
    const spent = exps.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
    const budget = fs.projects.find((p) => p.id === projectId)?.data?.budget || 0;
    return { spent, budget };
  };

  // Photo count per project
  const getProjectPhotoCount = (projectId: string) => {
    return (cmt.dailyLogs as any[]).filter((l) => l.data.projectId === projectId).length;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2" style={{ borderColor: 'var(--af-accent)' }}>
              {auth.initials}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Bienvenido, {auth.userName}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">Portal del Cliente — Seguimiento de proyectos</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            value: myProjects.length,
            label: 'Proyectos',
            icon: <FolderKanban size={16} />,
            bg: 'bg-[var(--af-accent)]/10',
            iconColor: 'text-[var(--af-accent)]',
            sub: `${activeProjects.length} activos`,
          },
          {
            value: activeProjects.length,
            label: 'En progreso',
            icon: <CircleDot size={16} />,
            bg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400',
            sub: `${myProjects.filter((p) => p.data.status === 'Completado').length} finalizados`,
          },
          {
            value: pendingInvoices.length,
            label: 'Facturas pendientes',
            icon: <FileText size={16} />,
            bg: 'bg-amber-500/10',
            iconColor: 'text-amber-400',
            sub: pendingInvoices.length === 0 ? 'Al día' : 'Requieren atención',
            badge: pendingInvoices.length > 0,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center ${card.iconColor}`}>
                {card.icon}
              </div>
              {card.badge && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div className="text-xl md:text-2xl font-bold leading-tight">{card.value}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1.5">{card.label}</div>
            <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold">Mis Proyectos</h2>
          <span className="text-xs text-[var(--muted-foreground)]">{myProjects.length} proyecto{myProjects.length !== 1 ? 's' : ''}</span>
        </div>

        {myProjects.length === 0 ? (
          <div className="text-center py-16 text-[var(--af-text3)]">
            <div className="text-4xl mb-3">📁</div>
            <div className="text-sm">No tienes proyectos asignados</div>
            <div className="text-xs mt-1">Los proyectos se vinculan desde el panel de administración</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myProjects.map((project) => {
              const prog = project.data.progress || 0;
              const { spent, budget } = getProjectBudget(project.id);
              const activityItems = getProjectActivity[project.id] || [];
              const isActive = !['Completado', 'Cancelado'].includes(project.data.status);

              return (
                <div
                  key={project.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--af-accent)]/30 transition-all cursor-pointer group"
                  onClick={() => onSelectProject(project.id)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{project.data.name}</h3>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${projectStatusColor(project.data.status)}`}>
                        {project.data.status}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-[var(--muted-foreground)] mt-1 flex-shrink-0 group-hover:text-[var(--af-accent)] transition-colors" />
                  </div>

                  {/* Key Info */}
                  <div className="space-y-1.5 text-[12px] text-[var(--muted-foreground)] mb-4">
                    {project.data.client && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="flex-shrink-0" />
                        <span className="truncate">{project.data.client}</span>
                      </div>
                    )}
                    {project.data.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{project.data.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {project.data.startDate && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={12} className="flex-shrink-0" />
                          <span>{project.data.startDate}</span>
                        </div>
                      )}
                      {project.data.endDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="flex-shrink-0" />
                          <span>{project.data.endDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-[var(--muted-foreground)]">Progreso</span>
                      <span className="text-[11px] font-semibold">{prog}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor(prog)}`}
                        style={{ width: prog + '%' }}
                      />
                    </div>
                  </div>

                  {/* Budget Summary */}
                  {budget > 0 && (
                    <div className="mb-4">
                      <BudgetProgressBar spent={spent} budget={budget} showThresholds={false} compact />
                    </div>
                  )}

                  {/* Budget text fallback */}
                  {budget > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] mb-3">
                      <span>
                        <span className="text-[var(--af-accent)]">{fmtCOP(spent)}</span> gastado
                      </span>
                      <span>de {fmtCOP(budget)}</span>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {activityItems.length > 0 && (
                    <div className="border-t border-[var(--border)] pt-3">
                      <div className="text-[11px] font-medium text-[var(--muted-foreground)] mb-2">Actividad reciente</div>
                      <div className="space-y-1.5">
                        {activityItems.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5 flex-shrink-0">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-[var(--foreground)] truncate">{item.text}</div>
                              <div className="text-[10px] text-[var(--af-text3)]">{fmtDateTime(item.time)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== PROJECT DETAIL VIEW ===== */

function ProjectDetailView({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('resumen');
  const fs = useFirestore();
  const gal = useGallery();
  const inv = useInvoice();
  const cmt = useComments();

  const project = useMemo(() => fs.projects.find((p) => p.id === projectId), [fs.projects, projectId]);

  const projectExpenses = useMemo(
    () => fs.expenses.filter((e: any) => e.data.projectId === projectId),
    [fs.expenses, projectId],
  );
  const projectSpent = useMemo(
    () => projectExpenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0),
    [projectExpenses],
  );
  const projectBudget = project?.data?.budget || 0;

  const projectPhotos = useMemo(
    () => gal.galleryPhotos.filter((p: any) => p.data.projectId === projectId),
    [gal.galleryPhotos, projectId],
  );

  const projectInvoices = useMemo(
    () => inv.invoices.filter((i: any) => i.data.projectId === projectId),
    [inv.invoices, projectId],
  );

  const projectComments = useMemo(
    () => cmt.comments.filter((c) => c.data.projectId === projectId),
    [cmt.comments, projectId],
  );

  const projectLogs = useMemo(
    () => cmt.dailyLogs.filter((l: any) => l.data.projectId === projectId),
    [cmt.dailyLogs, projectId],
  );

  if (!project) {
    return (
      <div className="text-center py-16 text-[var(--af-text3)]">
        <div className="text-4xl mb-3">📁</div>
        <div className="text-sm">Proyecto no encontrado</div>
        <button className="mt-4 text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={onBack}>
          ← Volver al portal
        </button>
      </div>
    );
  }

  const prog = project.data.progress || 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Back button */}
      <button
        className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        <span>Volver al portal</span>
      </button>

      {/* Project Header */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${projectStatusColor(project.data.status)}`}>
                {project.data.status}
              </span>
              <h1 className="text-2xl mt-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {project.data.name}
              </h1>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">
                {project.data.location && '📍 ' + project.data.location}
                {project.data.client ? ' · ' + project.data.client : ''}
              </div>
              {project.data.description && (
                <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">
                  {project.data.description}
                </div>
              )}
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <div className="text-center">
                <div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(projectBudget)}</div>
                <div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-400">{fmtCOP(projectSpent)}</div>
                <div className="text-[10px] text-[var(--af-text3)]">Gastado</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor(prog)}`}
                style={{ width: prog + '%' }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--muted-foreground)]">{prog}%</span>
          </div>

          {projectBudget > 0 && (
            <div className="mt-3">
              <BudgetProgressBar spent={projectSpent} budget={projectBudget} showThresholds />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
        {([
          { key: 'resumen' as const, label: 'Resumen', icon: <Eye size={13} /> },
          { key: 'fotos' as const, label: 'Fotos', icon: <ImageIcon size={13} /> },
          { key: 'facturas' as const, label: 'Facturas', icon: <FileText size={13} /> },
          { key: 'actividad' as const, label: 'Actividad', icon: <MessageSquare size={13} /> },
        ]).map((t) => (
          <button
            key={t.key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'resumen' && <ResumenTab project={project} />}
      {tab === 'fotos' && <FotosTab projectId={projectId} photos={projectPhotos} />}
      {tab === 'facturas' && <FacturasTab invoices={projectInvoices} />}
      {tab === 'actividad' && <ActividadTab comments={projectComments} logs={projectLogs} />}
    </div>
  );
}

/* ===== TAB: RESUMEN ===== */

function ResumenTab({ project }: { project: any }) {
  const fs = useFirestore();
  const proj = project;

  const projectExpenses = useMemo(
    () => fs.expenses.filter((e: any) => e.data.projectId === project.id),
    [fs.expenses, project.id],
  );
  const projectTasks = useMemo(
    () => fs.tasks.filter((t: any) => t.data.projectId === project.id),
    [fs.tasks, project.id],
  );
  const completedTasks = useMemo(
    () => projectTasks.filter((t: any) => t.data.status === 'Completado').length,
    [projectTasks],
  );

  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    projectExpenses.forEach((e: any) => {
      cats[e.data.category] = (cats[e.data.category] || 0) + (Number(e.data.amount) || 0);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [projectExpenses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Info Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-4">Información del Proyecto</div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Cliente</span>
            <span className="font-medium">{proj.data.client || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Ubicación</span>
            <span>{proj.data.location || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fase actual</span>
            <span>{proj.data.phase || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fecha inicio</span>
            <span>{proj.data.startDate || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Fecha entrega</span>
            <span>{proj.data.endDate || '—'}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Presupuesto</span>
              <span className="text-[var(--af-accent)] font-semibold">{fmtCOP(proj.data.budget)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-4">Progreso</div>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-[120px] h-[120px]">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--af-bg4)"
                strokeWidth="2.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={proj.data.progress >= 80 ? '#10b981' : proj.data.progress >= 40 ? '#c8a96e' : '#f59e0b'}
                strokeWidth="2.5"
                strokeDasharray={`${proj.data.progress || 0}, 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[22px] font-bold">{proj.data.progress || 0}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Tareas completadas</span>
            </div>
            <span className="font-semibold">
              {completedTasks}/{projectTasks.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[var(--af-accent)]" />
              <span>Gastos registrados</span>
            </div>
            <span className="font-semibold">{projectExpenses.length}</span>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 md:col-span-2">
          <div className="text-[15px] font-semibold mb-4">Gastos por Categoría</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expensesByCategory.map(([cat, amount]) => {
              const totalExp = expensesByCategory.reduce((s, [, v]) => s + v, 0);
              const pct = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
              return (
                <div key={cat} className="bg-[var(--af-bg3)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium">{cat}</span>
                    <span className="text-[13px] font-semibold text-[var(--af-accent)]">{fmtCOP(amount)}</span>
                  </div>
                  <div className="h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--af-accent)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--af-text3)] mt-1">{pct}% del total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== TAB: FOTOS ===== */

function FotosTab({ projectId, photos }: { projectId: string; photos: any[] }) {
  const gal = useGallery();
  // Set filter to project for lightbox navigation
  const filteredPhotos = photos;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">
          {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">🖼️</div>
          <div className="text-sm">Sin fotos en este proyecto</div>
          <div className="text-xs mt-1">Las fotos del progreso se agregarán aquí</div>
        </div>
      ) : (
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))' }}
        >
          {filteredPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)]/50 transition-all"
              onClick={() => {
                // Set the gallery filter to this project so lightbox navigation works correctly
                gal.setGalleryFilterProject(projectId);
                gal.setGalleryFilterCat('all');
                gal.openLightbox(photo, idx);
              }}
            >
              <img
                src={photo.data.imageData}
                alt={photo.data.caption || 'Foto'}
                className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                loading="lazy"
                onLoad={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '1';
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  {photo.data.caption && (
                    <div className="text-xs text-white font-medium truncate">{photo.data.caption}</div>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white/90 mt-0.5 inline-block">
                    {photo.data.categoryName}
                  </span>
                </div>
              </div>
              {/* Category badge always visible */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/40 text-white/90 backdrop-blur-sm">
                  {photo.data.categoryName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== TAB: FACTURAS ===== */

function FacturasTab({ invoices }: { invoices: any[] }) {
  const totalInvoiced = invoices
    .filter((i) => i.data.status !== 'Cancelada')
    .reduce((s: number, i: any) => s + (i.data.total || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.data.status === 'Pagada')
    .reduce((s: number, i: any) => s + (i.data.total || 0), 0);
  const totalPending = invoices
    .filter((i) => i.data.status === 'Enviada' || i.data.status === 'Borrador')
    .reduce((s: number, i: any) => s + (i.data.total || 0), 0);
  const totalOverdue = invoices
    .filter((i) => i.data.status === 'Vencida')
    .reduce((s: number, i: any) => s + (i.data.total || 0), 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { lbl: 'Facturado', val: fmtCOP(totalInvoiced), color: 'text-[var(--af-accent)]' },
          { lbl: 'Pagado', val: fmtCOP(totalPaid), color: 'text-emerald-400' },
          { lbl: 'Pendiente', val: fmtCOP(totalPending), color: 'text-blue-400' },
          { lbl: 'Vencido', val: fmtCOP(totalOverdue), color: 'text-red-400' },
        ].map((c, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className={`text-lg font-bold ${c.color}`}>{c.val}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">{c.lbl}</div>
          </div>
        ))}
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">🧾</div>
          <div className="text-sm">Sin facturas para este proyecto</div>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{inv.data.number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${invoiceStatusColor(inv.data.status)}`}>
                    {inv.data.status}
                  </span>
                  {(inv.data.status === 'Enviada' || inv.data.status === 'Borrador') && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {inv.data.clientName || inv.data.projectName}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-[var(--af-accent)]">{fmtCOP(inv.data.total)}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">
                  {inv.data.issueDate}
                  {inv.data.dueDate ? ' → ' + inv.data.dueDate : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== TAB: ACTIVIDAD ===== */

function ActividadTab({ comments, logs }: { comments: any[]; logs: any[] }) {
  // Combine and sort by time
  const activity = useMemo(() => {
    const items: {
      id: string;
      type: 'comment' | 'log';
      title: string;
      subtitle: string;
      time: any;
      icon: string;
      userName: string;
    }[] = [];

    comments.forEach((c) => {
      items.push({
        id: c.id,
        type: 'comment',
        title: c.data.text?.substring(0, 120) || '',
        subtitle: '',
        time: c.data.createdAt,
        icon: '💬',
        userName: c.data.userName || 'Usuario',
      });
    });

    logs.forEach((l) => {
      items.push({
        id: l.id,
        type: 'log',
        title: `Bitácora — ${l.data.date}`,
        subtitle: (l.data.activities || []).slice(0, 3).join(', ') || l.data.observations || 'Sin detalles',
        time: l.data.createdAt,
        icon: '📝',
        userName: l.data.supervisor || 'Supervisor',
      });
    });

    items.sort((a, b) => {
      const ta = a.time?.toDate?.() || new Date(0);
      const tb = b.time?.toDate?.() || new Date(0);
      return tb.getTime() - ta.getTime();
    });

    return items;
  }, [comments, logs]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="text-lg font-bold">{comments.length}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Comentarios</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="text-lg font-bold">{logs.length}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">Bitácoras de obra</div>
        </div>
      </div>

      {/* Activity Feed */}
      {activity.length === 0 ? (
        <div className="text-center py-16 text-[var(--af-text3)]">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">Sin actividad registrada</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {activity.map((item) => (
            <div
              key={item.id + item.type}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-base flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">{item.userName}</span>
                    <span className="text-[10px] text-[var(--af-text3)]">
                      {item.type === 'comment' ? 'comentó' : 'registro bitácora'}
                    </span>
                  </div>
                  <div className="text-[13px] text-[var(--foreground)] leading-relaxed">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-1">{item.subtitle}</div>
                  )}
                  <div className="text-[10px] text-[var(--af-text3)] mt-1.5">{fmtDateTime(item.time)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== MAIN PORTAL SCREEN ===== */

export default function PortalScreen() {
  const [view, setView] = useState<PortalTab>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setView('project-detail');
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    setView('overview');
  };

  return (
    <div className="animate-fadeIn">
      {view === 'overview' && <OverviewView onSelectProject={handleSelectProject} />}
      {view === 'project-detail' && selectedProjectId && (
        <ProjectDetailView projectId={selectedProjectId} onBack={handleBack} />
      )}
    </div>
  );
}
