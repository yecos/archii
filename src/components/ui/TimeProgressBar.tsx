'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';

interface TimeProgressBarProps {
  /** Fecha límite de la tarea (string, Date, o Firestore Timestamp) */
  dueDate: any;
  /** Fecha de creación de la tarea (string, Date, o Firestore Timestamp) — si no se pasa, se asume 7 días antes */
  createdAt?: any;
  /** Si la tarea ya está completada */
  isCompleted?: boolean;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Modo compacto para Kanban cards */
  compact?: boolean;
}

/**
 * Convierte cualquier tipo de fecha a milisegundos (number).
 * Soporta: string ISO, Date nativo, Firestore Timestamp ({toDate, seconds, nanoseconds}), number.
 */
function toMs(value: any): number | null {
  if (value == null) return null;
  // Ya es un number
  if (typeof value === 'number') return value;
  // String
  if (typeof value === 'string') {
    const n = new Date(value).getTime();
    return isNaN(n) ? null : n;
  }
  // Firestore Timestamp — tiene .toDate()
  if (typeof value?.toDate === 'function') {
    try { return value.toDate().getTime(); } catch (_) { /* fall through */ }
  }
  // Tiene .seconds (Firestore Timestamp parcial / serializado)
  if (typeof value?.seconds === 'number') {
    return (value.seconds * 1000) + (value.nanoseconds || 0) / 1e6;
  }
  // Date nativo
  if (value instanceof Date) return value.getTime();
  // Último intento
  try { const n = new Date(value).getTime(); return isNaN(n) ? null : n; } catch (_) { return null; }
}

/**
 * Calcula el tiempo restante y renderiza una barra de progreso visual
 * que indica cuánto tiempo falta para la fecha límite.
 */
export default function TimeProgressBar({
  dueDate,
  createdAt,
  isCompleted = false,
  className = '',
  compact = false,
}: TimeProgressBarProps) {
  const [now, setNow] = useState(() => Date.now());

  // Actualizar cada minuto para mantener la barra fresca
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dueMs = useMemo(() => toMs(dueDate), [dueDate]);

  // No tenemos fecha válida → no renderizar nada
  if (dueMs == null) return null;

  const dueEndOfDay = new Date(dueMs);
  dueEndOfDay.setHours(23, 59, 59, 999);
  const dueEndMs = dueEndOfDay.getTime();

  // Fecha de creación o inicio del rango (default: 7 días antes del due date)
  const createdMs = toMs(createdAt);
  const startMs = createdMs != null ? createdMs : dueEndMs - 7 * 24 * 60 * 60 * 1000;

  const totalDuration = dueEndMs - startMs;
  const elapsed = now - startMs;
  const remaining = dueEndMs - now;

  // Porcentaje de tiempo transcurrido (clamped 0-100)
  const progress = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 100;

  // Determinar el estado visual
  const isOverdue = remaining <= 0 && !isCompleted;
  const isUrgent = remaining > 0 && remaining <= 24 * 60 * 60 * 1000 && !isCompleted; // < 24h
  const isWarning = remaining > 24 * 60 * 60 * 1000 && remaining <= 72 * 60 * 60 * 1000 && !isCompleted; // < 72h

  // Texto descriptivo del tiempo restante
  function getTimeLabel(): string {
    if (isCompleted) return 'Completada';
    if (isOverdue) {
      const overdueMs = Math.abs(remaining);
      const days = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
      if (days > 0) return `Vencida hace ${days}d`;
      const hours = Math.floor(overdueMs / (60 * 60 * 1000));
      if (hours > 0) return `Vencida hace ${hours}h`;
      return 'Vencida';
    }
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h restantes`;
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${minutes}m restantes`;
  }

  // Colores según estado
  function getBarColor(): string {
    if (isCompleted) return 'bg-emerald-500';
    if (isOverdue) return 'bg-red-500';
    if (isUrgent) return 'bg-orange-500';
    if (isWarning) return 'bg-amber-400';
    return 'bg-[var(--af-accent)]';
  }

  function getBarBg(): string {
    return 'bg-[var(--af-bg4)]';
  }

  function getTextColor(): string {
    if (isCompleted) return 'text-emerald-400';
    if (isOverdue) return 'text-red-400';
    if (isUrgent) return 'text-orange-400';
    if (isWarning) return 'text-amber-400';
    return 'text-[var(--muted-foreground)]';
  }

  function getStatusIcon() {
    if (isCompleted) return <CheckCircle2 size={compact ? 10 : 11} />;
    if (isOverdue) return <Flame size={compact ? 10 : 11} />;
    if (isUrgent) return <AlertTriangle size={compact ? 10 : 11} />;
    return <Clock size={compact ? 10 : 11} />;
  }

  const displayProgress = isCompleted ? 100 : progress;
  const label = getTimeLabel();

  if (compact) {
    // Modo compacto para Kanban cards
    return (
      <div className={`flex items-center gap-1.5 w-full ${className}`}>
        <span className={`${getTextColor()} flex-shrink-0 flex items-center gap-0.5`}>
          {getStatusIcon()}
        </span>
        <div className={`flex-1 ${getBarBg()} rounded-full overflow-hidden`} style={{ height: '3px' }}>
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor()}`}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <span className={`${getTextColor()} flex-shrink-0 font-medium tabular-nums`} style={{ fontSize: '9px' }}>
          {label}
        </span>
      </div>
    );
  }

  // Modo normal para lista
  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      <span className={`${getTextColor()} flex-shrink-0 flex items-center gap-1`} style={{ fontSize: '10px' }}>
        {getStatusIcon()}
        <span className="tabular-nums font-medium">{label}</span>
      </span>
      <div className={`flex-1 ${getBarBg()} rounded-full overflow-hidden`} style={{ height: '4px' }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor()} ${
            isUrgent && !isCompleted ? 'animate-pulse' : ''
          }`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      <span className={`${getTextColor()} flex-shrink-0 tabular-nums font-semibold`} style={{ fontSize: '10px' }}>
        {Math.round(displayProgress)}%
      </span>
    </div>
  );
}
