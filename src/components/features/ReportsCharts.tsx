'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { fmtCOP } from '@/lib/helpers';

const COLORS = ['#c8a96e', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

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

function ChartLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
      {payload?.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--muted-foreground)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   1. Task Status Pie (General tab – Estado de Proyectos)
   ───────────────────────────────────────────── */
export function TaskStatusPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return null;
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Distribucion de Tareas</div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend content={<ChartLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. Task Priority Pie (General tab – Tareas y Productividad)
   ───────────────────────────────────────────── */
const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];

export function TaskPriorityPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return null;
  return (
    <div>
      <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Por prioridad</div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend content={<ChartLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3. Monthly Expense Trend Line (General tab – Presupuesto)
   ───────────────────────────────────────────── */
export function MonthlyExpenseTrend({ data }: { data: { name: string; gastos: number }[] }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Tendencia de Gastos</div>
      {data.some(d => d.gastos > 0) ? (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#c8a96e" strokeWidth={2} dot={{ r: 3, fill: '#c8a96e' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-sm text-[var(--muted-foreground)]">Sin gastos en el período</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   4. Role Distribution Pie (General tab – Equipo & Team tab)
   ───────────────────────────────────────────── */
export function RoleDistPie({ data, height = 120, innerRadius = 25, outerRadius = 45 }: {
  data: { name: string; value: number }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  if (!data.length) return null;
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Roles</div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend content={<ChartLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   5. Budget vs Real Bar Chart (Financial tab)
   ───────────────────────────────────────────── */
export function BudgetVsRealBar({ data, budgetPct }: {
  data: { name: string; presupuesto: number; gastado: number }[];
  budgetPct: number;
}) {
  if (!data.length) return <div className="text-sm text-[var(--muted-foreground)]">Sin proyectos con presupuesto</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(200,169,110,0.06)' }} />
        <Legend content={<ChartLegend />} />
        <Bar dataKey="presupuesto" name="Presupuesto" fill="#c8a96e" radius={[4, 4, 0, 0]} barSize={18} />
        <Bar dataKey="gastado" name="Gastado" fill={budgetPct > 90 ? '#ef4444' : '#10b981'} radius={[4, 4, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   6. Expense Category Pie Chart (Financial tab)
   ───────────────────────────────────────────── */
export function ExpenseCategoryPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="text-sm text-[var(--muted-foreground)]">Sin gastos</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend content={<ChartLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   7. Hours by Project Bar Chart (Time tab)
   ───────────────────────────────────────────── */
export function HoursByProjectBar({ data }: { data: { name: string; horas: number }[] }) {
  if (!data.length) return <div className="text-sm text-[var(--muted-foreground)]">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--af-bg4)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="h" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(200,169,110,0.06)' }} />
        <Bar dataKey="horas" name="Horas" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   8. Team Role Distribution Pie (Team tab – larger variant)
   ───────────────────────────────────────────── */
export function TeamRoleDistPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="text-sm text-[var(--muted-foreground)]">Sin miembros</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend content={<ChartLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
