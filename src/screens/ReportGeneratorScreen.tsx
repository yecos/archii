'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { getFirebase, snapToDocs } from '@/lib/firebase-service';
import { FileText, Building2, DollarSign, HardHat, Calendar, Download, Loader2, ChevronDown, Filter, Sparkles, Image, PenTool, BarChart3 } from 'lucide-react';
import type { Project, FieldNote, Inspection, DailyLog, Company } from '@/lib/types';
import {
  generateProjectReport,
  generateFinancialReport,
  generateFieldReport,
  type ReportOptions,
  type DateRange,
  type FieldReportData,
} from '@/lib/export-report-generator';

/* ─── Report Type Definitions ─── */

type ReportType = 'project' | 'financial' | 'field';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  {
    id: 'project',
    label: 'Reporte de Proyecto',
    icon: <Building2 size={24} />,
    description: 'Resumen ejecutivo con progreso, presupuesto, tareas, equipo y cronograma',
    color: 'text-[var(--af-accent)]',
  },
  {
    id: 'financial',
    label: 'Reporte Financiero',
    icon: <DollarSign size={24} />,
    description: 'Presupuesto vs ejecución, gastos por categoría y estado de facturación',
    color: 'text-emerald-400',
  },
  {
    id: 'field',
    label: 'Reporte de Obra',
    icon: <HardHat size={24} />,
    description: 'Bitácora diaria, minutas, inspecciones y compromisos de campo',
    color: 'text-blue-400',
  },
];

const DEFAULT_OPTIONS: ReportOptions = {
  includeCharts: true,
  includePhotos: false,
  includeSignatures: true,
  includeDetails: true,
};

export default function ReportGeneratorScreen() {
  const { showToast } = useUI();
  const { projects, tasks, expenses } = useFirestore();
  const { teamUsers } = useAuth();
  const { invoices } = useInvoice();

  const [reportType, setReportType] = useState<ReportType>('project');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [options, setOptions] = useState<ReportOptions>(DEFAULT_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Field data for field report
  const [fieldNotes, setFieldNotes] = useState<FieldNote[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);

  // Load field data
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();

    const unsub1 = db.collection('fieldNotes').orderBy('date', 'desc').limit(100).onSnapshot(
      (snap) => setFieldNotes(snapToDocs(snap) as FieldNote[]),
      (err) => console.error('[ReportGen] fieldNotes error:', err),
    );
    const unsub2 = db.collection('inspections').orderBy('date', 'desc').limit(100).onSnapshot(
      (snap) => setInspections(snapToDocs(snap) as Inspection[]),
      (err) => console.error('[ReportGen] inspections error:', err),
    );
    const unsub3 = db.collection('dailyLogs').orderBy('date', 'desc').limit(100).onSnapshot(
      (snap) => setDailyLogs(snapToDocs(snap) as DailyLog[]),
      (err) => console.error('[ReportGen] dailyLogs error:', err),
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  // Company data (first company)
  const [company, setCompany] = useState<Company | undefined>();

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    const db = fb.firestore();
    const unsub = db.collection('companies').limit(1).onSnapshot(
      (snap) => {
        const docs = snapToDocs(snap) as Company[];
        if (docs.length > 0) setCompany(docs[0]);
      },
      () => {},
    );
    return () => unsub();
  }, []);

  const selectedProjectData = useMemo(
    () => projects.find((p) => p.id === selectedProject) || null,
    [projects, selectedProject],
  );

  const dateRange = useMemo<DateRange>(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (reportType === 'project') {
        await generateProjectReport(
          selectedProjectData,
          projects,
          tasks,
          expenses,
          invoices,
          teamUsers,
          company,
          dateRange,
          options,
        );
        showToast('Reporte de Proyecto generado exitosamente');
      } else if (reportType === 'financial') {
        await generateFinancialReport(
          selectedProjectData,
          projects,
          expenses,
          invoices,
          company,
          dateRange,
          options,
        );
        showToast('Reporte Financiero generado exitosamente');
      } else if (reportType === 'field') {
        const fieldData: FieldReportData = {
          dailyLogs: selectedProjectData
            ? dailyLogs.filter((l) => l.data.projectId === selectedProjectData.id)
            : dailyLogs,
          fieldNotes: selectedProjectData
            ? fieldNotes.filter((n) => n.data.projectId === selectedProjectData.id)
            : fieldNotes,
          inspections: selectedProjectData
            ? inspections.filter((i) => i.data.projectId === selectedProjectData.id)
            : inspections,
        };
        await generateFieldReport(selectedProjectData, fieldData, company, dateRange, options);
        showToast('Reporte de Obra generado exitosamente');
      }
    } catch (err) {
      console.error('[ReportGen] Generate error:', err);
      showToast('Error al generar el reporte PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentReport = REPORT_TYPES.find((r) => r.id === reportType)!;

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center">
          <Sparkles size={20} className="text-[var(--af-accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Generador de Reportes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Crea reportes PDF profesionales con branding de tu empresa</p>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            className={`card-elevated rounded-xl p-4 text-left cursor-pointer transition-all duration-200 ${
              reportType === rt.id
                ? 'border-[var(--af-accent)]/50 shadow-[0_0_20px_rgba(var(--af-accent-rgb,200,169,110),0.15)]'
                : 'hover:border-[var(--af-accent)]/20'
            }`}
            onClick={() => setReportType(rt.id)}
          >
            <div className={`mb-3 ${rt.color}`}>
              {rt.icon}
            </div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{rt.label}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">{rt.description}</div>
            {reportType === rt.id && (
              <div className="mt-3 flex items-center gap-1.5 text-[var(--af-accent)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)]" />
                <span className="text-[11px] font-medium">Seleccionado</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Configuration Panel */}
      <div className="card-elevated rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 text-[var(--foreground)]">
          <Filter size={16} className="text-[var(--af-accent)]" />
          <span className="text-sm font-semibold">Configuración del Reporte</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
              <Building2 size={12} />
              Proyecto (opcional)
            </label>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full skeuo-well rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] bg-transparent appearance-none cursor-pointer border-none outline-none"
              >
                <option value="">Todos los Proyectos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.data.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
              <Calendar size={12} />
              Período
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 skeuo-well rounded-lg px-3 py-2 text-sm text-[var(--foreground)] bg-transparent border-none outline-none min-w-0"
                placeholder="Desde"
              />
              <span className="text-[var(--muted-foreground)] text-xs">a</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 skeuo-well rounded-lg px-3 py-2 text-sm text-[var(--foreground)] bg-transparent border-none outline-none min-w-0"
                placeholder="Hasta"
              />
            </div>
          </div>
        </div>

        {/* Sections Toggles */}
        <div>
          <button
            className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer hover:text-[var(--af-accent)] transition-colors"
            onClick={() => setShowOptions(!showOptions)}
          >
            <BarChart3 size={14} className="text-[var(--af-accent)]" />
            <span className="font-medium">Secciones incluidas</span>
            <ChevronDown size={14} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
          </button>

          {showOptions && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ToggleOption
                icon={<BarChart3 size={14} />}
                label="Gráficos y resumen KPI"
                checked={options.includeCharts}
                onChange={() => toggleOption('includeCharts')}
              />
              <ToggleOption
                icon={<Image size={14} />}
                label="Fotos adjuntas"
                checked={options.includePhotos}
                onChange={() => toggleOption('includePhotos')}
              />
              <ToggleOption
                icon={<PenTool size={14} />}
                label="Firmas de aprobación"
                checked={options.includeSignatures}
                onChange={() => toggleOption('includeSignatures')}
              />
              <ToggleOption
                icon={<FileText size={14} />}
                label="Detalle de tablas"
                checked={options.includeDetails}
                onChange={() => toggleOption('includeDetails')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview Summary */}
      <div className="card-elevated rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[var(--af-accent)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">Vista Previa del Reporte</span>
        </div>

        <div className="skeuo-well rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reportType === 'project' ? 'bg-[var(--af-accent)]/10' : reportType === 'financial' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                {currentReport.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{currentReport.label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {selectedProjectData ? selectedProjectData.data.name : 'Todos los proyectos'}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] text-right">
              {company?.data?.name && <div>{company.data.name}</div>}
              {company?.data?.nit && <div>{company.data.nit}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <PreviewBadge label="Tipo" value={currentReport.label.split(' ').pop() || ''} />
            <PreviewBadge label="Proyecto" value={selectedProjectData ? 'Individual' : 'General'} />
            <PreviewBadge label="Período" value={dateFrom && dateTo ? 'Personalizado' : 'Todo'} />
            <PreviewBadge label="Secciones" value={`${Object.values(options).filter(Boolean).length} activas`} />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ${
          isGenerating
            ? 'bg-[var(--af-accent)]/30 text-[var(--foreground)]/60 cursor-not-allowed'
            : 'bg-[var(--af-accent)] text-background hover:brightness-110 active:scale-[0.98]'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generando reporte...
          </>
        ) : (
          <>
            <Download size={16} />
            Generar y Descargar PDF
          </>
        )}
      </button>

      {/* Info Footer */}
      <div className="text-center text-[11px] text-[var(--muted-foreground)] pb-4">
        Los reportes se generan con el branding de tu empresa usando {company?.data?.name || 'la configuración predeterminada'}
      </div>
    </div>
  );
}

/* ─── Toggle Option Component ─── */

function ToggleOption({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all ${
        checked
          ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20'
          : 'bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)]'
      }`}
    >
      <div
        className={`w-8 h-5 rounded-full flex items-center transition-all ${
          checked ? 'bg-[var(--af-accent)] justify-end px-0.5' : 'bg-[var(--muted-foreground)]/30 justify-start px-0.5'
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all" />
      </div>
      <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

/* ─── Preview Badge ─── */

function PreviewBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xs font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}
