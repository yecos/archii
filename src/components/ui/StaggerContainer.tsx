'use client';

export function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`animate-fadeIn ${className || ''}`}>{children}</div>;
}
