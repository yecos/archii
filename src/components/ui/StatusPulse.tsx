'use client';
import React from 'react';

interface StatusPulseProps {
  color?: 'green' | 'amber' | 'red' | 'blue';
  size?: number; // px
  label?: string;
  className?: string;
}

const colorMap = {
  green: 'bg-[var(--af-green)] status-pulse-green',
  amber: 'bg-[var(--af-amber)] status-pulse-amber',
  red: 'bg-[var(--af-red)] status-pulse-red',
  blue: 'bg-[var(--af-blue)] status-pulse-blue',
};

export default function StatusPulse({ color = 'green', size = 8, label, className = '' }: StatusPulseProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`status-pulse rounded-full ${colorMap[color]}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
      {label && <span className="text-xs text-[var(--muted-foreground)]">{label}</span>}
    </span>
  );
}
