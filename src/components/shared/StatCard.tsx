'use client';

import React from 'react';

interface StatCardProps {
  icon?: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string; // tailwind text color class
  bgColor?: string; // tailwind bg class
}

export default function StatCard({ icon, label, value, sub, color = 'text-[var(--af-accent)]', bgColor = 'bg-[var(--af-bg3)]' }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-[var(--border)]`}>
      {icon && <div className="text-xl mb-1">{icon}</div>}
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[var(--af-text3)] mt-0.5">{sub}</div>}
    </div>
  );
}
