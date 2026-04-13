'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getFirebase } from '@/lib/firebase-service';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  Wind,
  Thermometer,
  Users,
  FileText,
  Save,
  Trash2,
  Pencil,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Check,
  X,
  Plus,
  Loader2,
  AlertCircle,
  Construction,
} from 'lucide-react';

/* ===== TYPES ===== */
interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  temperature: number;
  activities: string[];
  personnel: number;
  notes: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

/* ===== CONSTANTS ===== */
const WEATHER_OPTIONS = [
  { value: 'Soleado', icon: Sun, color: '#f59e0b' },
  { value: 'Parcialmente nublado', icon: CloudSun, color: '#fbbf24' },
  { value: 'Nublado', icon: Cloud, color: '#94a3b8' },
  { value: 'Lluvia ligera', icon: CloudDrizzle, color: '#60a5fa' },
  { value: 'Lluvia fuerte', icon: CloudRain, color: '#3b82f6' },
  { value: 'Tormenta', icon: CloudLightning, color: '#8b5cf6' },
  { value: 'Viento fuerte', icon: Wind, color: '#64748b' },
];

const ACTIVITY_OPTIONS = [
  'Excavación',
  'Cimentación',
  'Estructura',
  'Mampostería',
  'Instalaciones eléctricas',
  'Instalaciones hidráulicas',
  'Acabados',
  'Pintura',
  'Pisos',
  'Carpintería',
  'Limpieza',
  'Otro',
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/* ===== HELPERS ===== */
function formatDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`;
}

function getWeatherIcon(weatherValue: string) {
  return WEATHER_OPTIONS.find(w => w.value === weatherValue);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ===== COMPONENT ===== */
export default function BitacoraScreen() {
  const {
    projects,
    authUser,
    teamUsers,
    showToast,
    loading,
  } = useApp();

  /* --- State --- */
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Form state
  const [formWeather, setFormWeather] = useState('');
  const [formTemp, setFormTemp] = useState<number | ''>('');
  const [formActivities, setFormActivities] = useState<string[]>([]);
  const [formPersonnel, setFormPersonnel] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // View toggle
  const [viewMode, setViewMode] = useState<'calendar' | 'form' | 'list'>('calendar');

  const unsubRef = useRef<(() => void) | null>(null);

  /* --- Derived --- */
  const activeProjects = useMemo(
    () => projects.filter((p: any) => p.data?.status !== 'Terminado'),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((p: any) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // Dates with logs (for calendar highlighting)
  const datesWithLogs = useMemo(() => {
    return new Set(logs.map(l => l.date));
  }, [logs]);

  // Find existing log for selected date
  const existingLogForDate = useMemo(() => {
    if (!selectedDate) return null;
    return logs.find(l => l.date === selectedDate) || null;
  }, [logs, selectedDate]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const logsThisMonth = logs.filter(l => {
      const [y, m] = l.date.split('-').map(Number);
      return y === currentYear && m === currentMonth + 1;
    });

    const activityCount: Record<string, number> = {};
    logs.forEach(l => {
      l.activities?.forEach(a => {
        activityCount[a] = (activityCount[a] || 0) + 1;
      });
    });

    const sortedActivities = Object.entries(activityCount)
      .sort(([, a], [, b]) => b - a);
    const mostCommon = sortedActivities.length > 0 ? sortedActivities[0] : null;

    return {
      totalLogs: logs.length,
      daysThisMonth: logsThisMonth.length,
      mostCommonActivity: mostCommon,
    };
  }, [logs]);

  /* --- Firestore Listener --- */
  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!authUser || !selectedProjectId) {
      setLogs([]);
      return;
    }

    setLogsLoading(true);
    let fb: any;
    try {
      fb = getFirebase();
    } catch {
      setLogsLoading(false);
      return;
    }
    const db = fb.firestore();

    const unsub = db
      .collection('dailyLogs')
      .where('projectId', '==', selectedProjectId)
      .orderBy('date', 'desc')
      .onSnapshot(
        snap => {
          const loaded = snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
          })) as DailyLog[];
          setLogs(loaded);
          setLogsLoading(false);
        },
        err => {
          console.error('[Bitacora] Firestore error:', err);
          setLogsLoading(false);
        }
      );

    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [authUser, selectedProjectId]);

  /* --- Calendar Navigation --- */
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    setSelectedDate(toDateStr(now));
    setViewMode('form');
  };

  /* --- Calendar Grid --- */
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [calYear, calMonth]);

  /* --- Form Handlers --- */
  const resetForm = () => {
    setFormWeather('');
    setFormTemp('');
    setFormActivities([]);
    setFormPersonnel('');
    setFormNotes('');
    setEditingLogId(null);
  };

  const openFormForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = logs.find(l => l.date === dateStr);
    if (existing) {
      setEditingLogId(existing.id);
      setFormWeather(existing.weather || '');
      setFormTemp(existing.temperature || '');
      setFormActivities(existing.activities || []);
      setFormPersonnel(existing.personnel || '');
      setFormNotes(existing.notes || '');
    } else {
      resetForm();
    }
    setViewMode('form');
  };

  const toggleActivity = (activity: string) => {
    setFormActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const saveLog = async () => {
    if (!selectedDate || !selectedProjectId) {
      showToast('Selecciona un proyecto y una fecha', 'warning');
      return;
    }
    if (!formWeather) {
      showToast('Selecciona el clima del día', 'warning');
      return;
    }

    setFormSaving(true);
    let fb: any;
    try {
      fb = getFirebase();
    } catch {
      showToast('Error de conexión', 'error');
      setFormSaving(false);
      return;
    }
    const db = fb.firestore();
    const colRef = db.collection('dailyLogs');

    try {
      const logData = {
        projectId: selectedProjectId,
        date: selectedDate,
        weather: formWeather,
        temperature: Number(formTemp) || 0,
        activities: formActivities,
        personnel: Number(formPersonnel) || 0,
        notes: formNotes,
        createdBy: authUser?.uid || '',
        updatedAt: fb.firestore.FieldValue.serverTimestamp(),
      };

      if (editingLogId) {
        await colRef.doc(editingLogId).update(logData);
        showToast('Bitácora actualizada');
      } else {
        logData.createdAt = fb.firestore.FieldValue.serverTimestamp();
        await colRef.add(logData);
        showToast('Bitácora guardada');
      }

      resetForm();
      setViewMode('list');
    } catch (err) {
      console.error('[Bitacora] Save error:', err);
      showToast('Error al guardar', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    let fb: any;
    try {
      fb = getFirebase();
    } catch {
      showToast('Error de conexión', 'error');
      return;
    }

    try {
      await fb.firestore().collection('dailyLogs').doc(logId).delete();
      showToast('Registro eliminado');
      setDeleteConfirmId(null);
      if (editingLogId === logId) {
        resetForm();
        setViewMode('list');
      }
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const editLog = (log: DailyLog) => {
    setSelectedDate(log.date);
    setEditingLogId(log.id);
    setFormWeather(log.weather || '');
    setFormTemp(log.temperature || '');
    setFormActivities(log.activities || []);
    setFormPersonnel(log.personnel || '');
    setFormNotes(log.notes || '');
    setViewMode('form');
  };

  /* ===== WEATHER ICON COMPONENT ===== */
  const WeatherBadge = ({ weather, size = 16 }: { weather: string; size?: number }) => {
    const wInfo = getWeatherIcon(weather);
    if (!wInfo) return <Cloud size={size} className="text-[var(--af-text3)]" />;
    const Icon = wInfo.icon;
    return <Icon size={size} style={{ color: wInfo.color }} />;
  };

  /* ===== RENDER ===== */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[var(--af-accent)]" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4">
      {/* ====== HEADER ====== */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xl font-semibold mb-1 flex items-center gap-2">
              <BookOpen size={20} className="text-[var(--af-accent)]" />
              Bitácora de Obra
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)]">
                v2.0
              </span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Registro diario de actividades en obra
            </div>
          </div>
          {selectedProjectId && (
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
                onClick={goToToday}
              >
                <CalendarDays size={14} />
                Hoy
              </button>
              <button
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]'
                    : 'bg-[var(--af-bg3)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/40'
                }`}
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays size={14} />
                Calendario
              </button>
              <button
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]'
                    : 'bg-[var(--af-bg3)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--af-accent)]/40'
                }`}
                onClick={() => setViewMode('list')}
              >
                <FileText size={14} />
                Lista
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====== PROJECT SELECTOR ====== */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="text-[15px] font-semibold mb-3 flex items-center gap-2">
          <Construction size={16} className="text-[var(--af-accent)]" />
          Seleccionar Proyecto
        </div>
        {activeProjects.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)]">
            <div className="text-3xl mb-2">🏗️</div>
            <div className="text-sm">Sin proyectos activos</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeProjects.map((p: any) => {
              const isSelected = selectedProjectId === p.id;
              const projLogs = logs.filter(l => l.projectId === p.id);
              return (
                <div
                  key={p.id}
                  className={`bg-[var(--af-bg3)] border rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--af-accent)] ring-1 ring-[var(--af-accent)]/20'
                      : 'border-[var(--border)] hover:border-[var(--af-accent)]/40'
                  }`}
                  onClick={() => {
                    setSelectedProjectId(isSelected ? '' : p.id);
                    if (isSelected) {
                      setLogs([]);
                      setSelectedDate('');
                      resetForm();
                      setViewMode('calendar');
                    }
                  }}
                >
                  <div className="text-sm font-semibold truncate mb-1">
                    {p.data?.name || 'Sin nombre'}
                  </div>
                  <div className="text-[10px] text-[var(--af-text3)] mb-2">
                    {p.data?.client && p.data?.location
                      ? `${p.data.client} · ${p.data.location}`
                      : p.data?.client || p.data?.location || ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-[var(--af-text3)]" />
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {projLogs.length} registro{projLogs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== NO PROJECT SELECTED ====== */}
      {!selectedProjectId && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📒</div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Selecciona un proyecto para comenzar la bitácora
          </div>
          <div className="text-xs text-[var(--af-text3)] mt-1">
            Registra el clima, actividades y personal diario
          </div>
        </div>
      )}

      {/* ====== STATS SECTION ====== */}
      {selectedProjectId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-[var(--af-accent)]" />
              <span className="text-[12px] text-[var(--muted-foreground)]">Total registros</span>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{stats.totalLogs}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={16} className="text-emerald-400" />
              <span className="text-[12px] text-[var(--muted-foreground)]">Este mes</span>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{stats.daysThisMonth}</div>
            <div className="text-[10px] text-[var(--af-text3)]">
              de {getDaysInMonth(new Date().getFullYear(), new Date().getMonth())} días
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-400" />
              <span className="text-[12px] text-[var(--muted-foreground)]">Actividad más común</span>
            </div>
            {stats.mostCommonActivity ? (
              <div className="text-sm font-bold text-[var(--foreground)] truncate">
                {stats.mostCommonActivity[0]}
              </div>
            ) : (
              <div className="text-sm text-[var(--af-text3)]">Sin datos</div>
            )}
            {stats.mostCommonActivity && (
              <div className="text-[10px] text-[var(--af-text3)]">
                {stats.mostCommonActivity[1]} vez{stats.mostCommonActivity[1] !== 1 ? 'es' : ''}
              </div>
            )}
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ====== CALENDAR VIEW ====== */}
        {selectedProjectId && viewMode === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                className="p-2 rounded-lg hover:bg-[var(--af-bg3)] cursor-pointer border-none bg-transparent text-[var(--foreground)] transition-colors"
                onClick={prevMonth}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-[15px] font-semibold">
                {MESES[calMonth]} {calYear}
              </div>
              <button
                className="p-2 rounded-lg hover:bg-[var(--af-bg3)] cursor-pointer border-none bg-transparent text-[var(--foreground)] transition-colors"
                onClick={nextMonth}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map(d => (
                <div
                  key={d}
                  className="text-center text-[11px] text-[var(--af-text3)] font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-10" />;
                }
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasLog = datesWithLogs.has(dateStr);
                const isToday = dateStr === toDateStr(new Date());
                const isSelected = selectedDate === dateStr;
                const logForDay = logs.find(l => l.date === dateStr);

                return (
                  <button
                    key={dateStr}
                    className={`h-10 rounded-lg text-[13px] font-medium cursor-pointer border-none relative transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-[var(--af-accent)] text-background'
                        : isToday
                          ? 'bg-[var(--af-accent)]/15 text-[var(--af-accent)] ring-1 ring-[var(--af-accent)]/30'
                          : 'bg-[var(--af-bg3)] text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
                    }`}
                    onClick={() => openFormForDate(dateStr)}
                  >
                    {day}
                    {hasLog && !isSelected && (
                      <span
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: logForDay
                            ? getWeatherIcon(logForDay.weather)?.color || '#c8a96e'
                            : '#c8a96e',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-[var(--af-text3)]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--af-accent)]/15 ring-1 ring-[var(--af-accent)]/30" />
                Hoy
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)]" />
                Con registro
              </div>
            </div>
          </motion.div>
        )}

        {/* ====== FORM VIEW ====== */}
        {selectedProjectId && viewMode === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-5"
          >
            {/* Form Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-semibold flex items-center gap-2">
                  {editingLogId ? (
                    <>
                      <Pencil size={16} className="text-amber-400" />
                      Editar registro
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="text-[var(--af-accent)]" />
                      Nuevo registro
                    </>
                  )}
                </div>
                <div className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                  {selectedDate ? formatDateStr(selectedDate) : 'Sin fecha'}
                  {selectedProject ? ` — ${selectedProject.data?.name}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer border-none hover:bg-[var(--af-bg4)] transition-colors"
                  onClick={() => {
                    resetForm();
                    setViewMode(selectedDate ? 'calendar' : 'calendar');
                  }}
                >
                  <X size={14} />
                  Cancelar
                </button>
              </div>
            </div>

            {/* Weather Selection */}
            <div>
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                <Thermometer size={14} className="text-[var(--af-accent)]" />
                Clima
              </div>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map(w => {
                  const Icon = w.icon;
                  const isSelected = formWeather === w.value;
                  return (
                    <button
                      key={w.value}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] cursor-pointer border transition-all ${
                        isSelected
                          ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/10 ring-1 ring-[var(--af-accent)]/20'
                          : 'border-[var(--border)] bg-[var(--af-bg3)] hover:border-[var(--af-accent)]/40'
                      }`}
                      style={
                        isSelected
                          ? { color: w.color, borderColor: w.color + '60' }
                          : { color: 'var(--foreground)' }
                      }
                      onClick={() => setFormWeather(w.value)}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{w.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temperature */}
            <div>
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                <Thermometer size={14} className="text-red-400" />
                Temperatura (°C)
              </div>
              <input
                type="number"
                value={formTemp}
                onChange={e => setFormTemp(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ej: 28"
                className="w-full max-w-[200px] text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors"
              />
            </div>

            {/* Activities */}
            <div>
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                <Construction size={14} className="text-[var(--af-accent)]" />
                Actividades realizadas
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map(act => {
                  const isSelected = formActivities.includes(act);
                  return (
                    <button
                      key={act}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] cursor-pointer border transition-all ${
                        isSelected
                          ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/10 text-[var(--af-accent)]'
                          : 'border-[var(--border)] bg-[var(--af-bg3)] text-[var(--foreground)] hover:border-[var(--af-accent)]/40'
                      }`}
                      onClick={() => toggleActivity(act)}
                    >
                      {isSelected && <Check size={12} />}
                      {act}
                    </button>
                  );
                })}
              </div>
              {formActivities.length === 0 && (
                <div className="text-[11px] text-[var(--af-text3)] mt-1.5">
                  Selecciona al menos una actividad
                </div>
              )}
            </div>

            {/* Personnel */}
            <div>
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                <Users size={14} className="text-[var(--af-accent)]" />
                Personal en obra
              </div>
              <input
                type="number"
                value={formPersonnel}
                onChange={e =>
                  setFormPersonnel(e.target.value ? Number(e.target.value) : '')
                }
                placeholder="Número de trabajadores"
                min={0}
                className="w-full max-w-[200px] text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-[var(--af-accent)]" />
                Notas / Observaciones
              </div>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Observaciones adicionales del día, incidencias, materiales entregados..."
                rows={3}
                className="w-full text-[13px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] transition-colors resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                className={`flex items-center gap-2 bg-[var(--af-accent)] text-background px-5 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors ${
                  formSaving ? 'opacity-70 pointer-events-none' : ''
                }`}
                onClick={saveLog}
                disabled={formSaving}
              >
                {formSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editingLogId ? 'Actualizar registro' : 'Guardar registro'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ====== LOG LIST VIEW ====== */}
        {selectedProjectId && viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold flex items-center gap-2">
                <FileText size={16} className="text-[var(--af-accent)]" />
                Registros ({logs.length})
              </div>
              <button
                className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
                onClick={() => {
                  resetForm();
                  setSelectedDate(toDateStr(new Date()));
                  setViewMode('form');
                }}
              >
                <Plus size={14} />
                Nuevo
              </button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-[var(--af-accent)]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">📝</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Sin registros de bitácora
                </div>
                <div className="text-xs text-[var(--af-text3)] mt-1">
                  Selecciona una fecha en el calendario o crea un nuevo registro
                </div>
                <button
                  className="mt-4 flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors mx-auto"
                  onClick={() => {
                    resetForm();
                    setSelectedDate(toDateStr(new Date()));
                    setViewMode('form');
                  }}
                >
                  <Plus size={14} />
                  Crear primer registro
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {logs.map((log, idx) => {
                  const wInfo = getWeatherIcon(log.weather);
                  const creatorName =
                    teamUsers.find((u: any) => u.id === log.createdBy)?.data
                      ?.name || 'Desconocido';

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--af-accent)]/30 transition-colors"
                    >
                      {/* Log card header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {/* Weather circle */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor:
                                (wInfo?.color || '#94a3b8') + '18',
                            }}
                          >
                            <WeatherBadge weather={log.weather} size={20} />
                          </div>
                          <div>
                            <div className="text-[14px] font-semibold text-[var(--foreground)]">
                              {formatDateStr(log.date)}
                            </div>
                            <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2">
                              <span>{log.weather || 'Sin clima'}</span>
                              {log.temperature > 0 && (
                                <span>
                                  · {log.temperature}°C
                                </span>
                              )}
                              <span>· por {creatorName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            className="p-1.5 rounded-lg hover:bg-[var(--af-bg3)] cursor-pointer border-none bg-transparent text-[var(--af-text3)] hover:text-[var(--af-accent)] transition-colors"
                            onClick={() => editLog(log)}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirmId === log.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-red-500/10 text-red-400 cursor-pointer border-none hover:bg-red-500/20 transition-colors"
                                onClick={() => deleteLog(log.id)}
                              >
                                <Trash2 size={11} />
                                Sí
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg text-[11px] bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none hover:bg-[var(--af-bg3)] transition-colors"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer border-none bg-transparent text-[var(--af-text3)] hover:text-red-400 transition-colors"
                              onClick={() => setDeleteConfirmId(log.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Activities */}
                      {log.activities && log.activities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {log.activities.map((act, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--af-bg3)] text-[var(--foreground)] border border-[var(--border)]"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Personnel */}
                      {log.personnel > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 text-[12px] text-[var(--muted-foreground)]">
                          <Users size={13} />
                          <span>
                            {log.personnel} persona{log.personnel !== 1 ? 's' : ''} en obra
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {log.notes && (
                        <div className="bg-[var(--af-bg3)] rounded-lg p-3 text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                          {log.notes}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
