'use client';
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  hover?: boolean;
  subtle?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function GlassCard({ children, hover = false, subtle = false, className = '', onClick }: GlassCardProps) {
  const baseClass = subtle
    ? 'card-glass-subtle rounded-xl p-4'
    : 'card-glass rounded-xl p-4';

  return (
    <div
      className={`${baseClass} ${hover ? 'card-glass-hover cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
