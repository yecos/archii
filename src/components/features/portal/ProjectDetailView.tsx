import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { type DetailTab } from './statusHelpers';
import type { Expense, GalleryPhoto, Invoice, DailyLog } from '@/lib/types';
import ProjectDetailHeader from './ProjectDetailHeader';
import DetailTabBar from './DetailTabBar';
import ResumenTab from './ResumenTab';
import FotosTab from './FotosTab';
import FacturasTab from './FacturasTab';
import ActividadTab from './ActividadTab';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const [tab, setTab] = useState<DetailTab>('resumen');
  const fs = useFirestore();
  const gal = useGallery();
  const inv = useInvoice();
  const cmt = useComments();

  const project = useMemo(
    () => fs.projects.find((p) => p.id === projectId),
    [fs.projects, projectId],
  );

  const projectExpenses = useMemo(
    () => fs.expenses.filter((e: Expense) => e.data.projectId === projectId),
    [fs.expenses, projectId],
  );
  const projectSpent = useMemo(
    () => projectExpenses.reduce((s: number, e: Expense) => s + (Number(e.data.amount) || 0), 0),
    [projectExpenses],
  );
  const projectBudget = project?.data?.budget || 0;

  const projectPhotos = useMemo(
    () => gal.galleryPhotos.filter((p: GalleryPhoto) => p.data.projectId === projectId),
    [gal.galleryPhotos, projectId],
  );

  const projectInvoices = useMemo(
    () => inv.invoices.filter((i: Invoice) => i.data.projectId === projectId),
    [inv.invoices, projectId],
  );

  const projectComments = useMemo(
    () => cmt.comments.filter((c) => c.data.projectId === projectId),
    [cmt.comments, projectId],
  );

  const projectLogs = useMemo(
    () => cmt.dailyLogs.filter((l: DailyLog) => l.data.projectId === projectId),
    [cmt.dailyLogs, projectId],
  );

  if (!project) {
    return (
      <div className="text-center py-16 text-[var(--af-text3)]">
        <div className="text-4xl mb-3">📁</div>
        <div className="text-sm">Proyecto no encontrado</div>
        <button
          className="mt-4 text-xs text-[var(--af-accent)] cursor-pointer hover:underline"
          onClick={onBack}
        >
          ← Volver al portal
        </button>
      </div>
    );
  }

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
      <ProjectDetailHeader
        project={project}
        budget={projectBudget}
        spent={projectSpent}
      />

      {/* Tabs */}
      <DetailTabBar activeTab={tab} onTabChange={setTab} />

      {/* Tab Content */}
      {tab === 'resumen' && <ResumenTab project={project} />}
      {tab === 'fotos' && <FotosTab projectId={projectId} photos={projectPhotos} />}
      {tab === 'facturas' && <FacturasTab invoices={projectInvoices} />}
      {tab === 'actividad' && <ActividadTab comments={projectComments} logs={projectLogs} />}
    </div>
  );
}
