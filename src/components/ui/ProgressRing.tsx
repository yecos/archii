'use client';
import React from 'react';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number; // px, default 80
  strokeWidth?: number; // default 6
  color?: string; // CSS variable or hex, default --af-accent
  bgColor?: string; // default --skeuo-inset
  children?: React.ReactNode; // content inside the ring
  className?: string;
}

export default function ProgressRing({ value, size = 80, strokeWidth = 6, color = 'var(--af-accent)', bgColor = 'var(--skeuo-inset)', children, className = '' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-animated"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
