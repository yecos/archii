'use client';

import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 text-[var(--af-text3)]">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-[15px] font-medium text-[var(--muted-foreground)] mb-1">{title}</div>
      {description && <div className="text-[13px]">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
