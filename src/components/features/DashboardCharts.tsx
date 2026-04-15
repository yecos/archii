'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Zap } from 'lucide-react';
import { fmtCOP } from '@/lib/helpers';
import { useThemeColors } from '@/hooks/useThemeColors';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated px-3 py-2 shadow-lg text-[12px]">
      {label && <div className="font-semibold text-[var(--foreground)] mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-[var(--muted-foreground)]">{p.name}:</span>
          <span className="font-semibold">{typeof p.value === 'number' && p.value > 9999 ? fmtCOP(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface DashboardChartsProps {
  taskStatusData: { name: string; value: number }[];
  burndownData: { name: string; pendientes: number; completadas: number }[];
  revenueTrend: { name: string; facturado: number; cobrado: number }[];
  teamWorkload: { name: string; activas: number; completadas: number; pendientes: number }[];
  expenseByCategory: { name: string; value: number }[];
  navigateTo: (screen: string) => void;
}

export default function DashboardCharts({
  taskStatusData,
  burndownData,
  revenueTrend,
  teamWorkload,
  expenseByCategory,
  navigateTo,
}: DashboardChartsProps) {
  const { accent, accentRGB } = useThemeColors();

  // Theme-aware chart colors: accent + semantic palette
  const CHART_COLORS = accent
    ? [accent, '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899']
    : ['#c8a96e', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

  const accentFill = accentRGB ? `rgba(${accentRGB},0.1)` : 'rgba(200,169,110,0.1)';
  const accentFill4 = accentRGB ? `rgba(${accentRGB},0.4)` : 'rgba(200,169,110,0.4)';
  const accentFill06 = accentRGB ? `rgba(${accentRGB},0.06)` : 'rgba(200,169,110,0.06)';

  return (
    <>
      {/* Task Distribution Pie */}
      <div className="card-elevated p-5">
        <div className="text-[15px] font-semibold mb-3">Distribución Tareas</div>
        {taskStatusData.length === 0 ? (
          <div className="text-center py-6 text-[var(--af-text3)] text-[12px]">Sin datos</div>
        ) : (
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} dataKey="value" stroke="none">
                {taskStatusData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {taskStatusData.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[var(--muted-foreground)]">{d.name}</span>
              <span className="font-semibold">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Charts v2.0 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold flex items-center gap-2"><Zap size={16} className="text-[var(--af-accent)]" /> Tendencia de Ingresos</div>
            <span className="text-[10px] text-[var(--af-text3)]">Últimos 6 meses</span>
          </div>
          {revenueTrend.some(d => d.facturado > 0 || d.cobrado > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="facturado" name="Facturado" stroke={accent} fill={accentFill} strokeWidth={2} />
                <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke="#10b981" fill="rgba(16,185,129,0.08)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin datos de facturación</div>
          )}
        </div>

        {/* Burndown Chart */}
        <div className="card-elevated p-5">
          <div className="text-[15px] font-semibold mb-4">Burndown Semanal</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={burndownData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: accentFill06 }} />
              <Bar dataKey="pendientes" name="Pendientes" fill={accentFill4} radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Team Workload + Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Workload */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Carga de Trabajo</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('reports')}>Reporte completo →</button>
          </div>
          {teamWorkload.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-sm">Sin tareas asignadas</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={teamWorkload} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="activas" name="Activas" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" barSize={16} />
                <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" barSize={16} />
                <Bar dataKey="pendientes" name="Pendientes" fill={accentFill4} radius={[2, 2, 0, 0]} stackId="a" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense by Category */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold">Gastos por Categoría</div>
            <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => navigateTo('budget')}>Ver presupuesto →</button>
          </div>
          {expenseByCategory.length === 0 ? (
            <div className="text-center py-10 text-[var(--af-text3)] text-sm">Sin gastos registrados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={expenseByCategory} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Gasto" fill={accent} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
