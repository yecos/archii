'use client';
import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fmtCOP } from '@/lib/helpers';
import type { TooltipProps } from 'recharts';

/* ===== Chart Tooltip ===== */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated px-3 py-2 shadow-lg text-[12px]">
      {label && <div className="font-semibold text-[var(--foreground)] mb-1">{label}</div>}
      {payload.map((p, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-[var(--muted-foreground)]">{p.name}:</span>
          <span className="font-semibold">{typeof p.value === 'number' && p.value > 9999 ? fmtCOP(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ===== Props ===== */
interface WidgetChartsProps {
  type: 'pie' | 'budget' | 'workload';
  data: { name: string; value?: number; presupuesto?: number; gastado?: number; activas?: number; completadas?: number; pendientes?: number }[];
  accent?: string;
}

export default function WidgetCharts({ type, data, accent: propAccent }: WidgetChartsProps) {
  const { accent: hookAccent, accentRGB } = useThemeColors();
  const accent = propAccent || hookAccent;

  const CHART_COLORS = accent
    ? [accent, '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899']
    : ['#c8a96e', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

  const accentFill = accentRGB ? `rgba(${accentRGB},0.1)` : 'rgba(200,169,110,0.1)';
  const accentFill4 = accentRGB ? `rgba(${accentRGB},0.4)` : 'rgba(200,169,110,0.4)';
  const accentFill06 = accentRGB ? `rgba(${accentRGB},0.06)` : 'rgba(200,169,110,0.06)';

  /* ─── Pie Chart: Task Distribution ─── */
  if (type === 'pie') {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
          <div className="text-2xl mb-2">🥧</div>
          <div className="text-xs">Sin datos de tareas</div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
              {data.map((_, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {data.map((d, i: number) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[var(--muted-foreground)]">{d.name}</span>
              <span className="font-semibold">{d.value ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Bar Chart: Budget Overview ─── */
  if (type === 'budget') {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-xs">Sin datos presupuestarios</div>
        </div>
      );
    }
    const budgetData = data.map(d => ({
      name: d.name,
      presupuesto: d.presupuesto || 0,
      gastado: d.gastado || 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={budgetData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="presupuesto" name="Presupuesto" fill={accentFill4} radius={[4, 4, 0, 0]} barSize={16} />
          <Bar dataKey="gastado" name="Gastado" fill={accent} radius={[4, 4, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ─── Stacked Bar: Team Workload ─── */
  if (type === 'workload') {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--af-text3)]">
          <div className="text-2xl mb-2">👥</div>
          <div className="text-xs">Sin tareas asignadas</div>
        </div>
      );
    }
    const workloadData = data.map(d => ({
      name: d.name,
      activas: d.activas || 0,
      completadas: d.completadas || 0,
      pendientes: d.pendientes || 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={workloadData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="activas" name="Activas" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" barSize={20} />
          <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" barSize={20} />
          <Bar dataKey="pendientes" name="Pendientes" fill={accentFill4} radius={[2, 2, 0, 0]} stackId="a" barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
