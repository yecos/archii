'use client';
import React, { useRef, useCallback } from 'react';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default function RippleButton({ children, variant = 'primary', className = '', onClick, ...props }: RippleButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    onClick?.(e);
  }, [onClick]);

  const variantClass = {
    primary: 'skeuo-btn bg-[var(--af-accent)] text-background',
    secondary: 'skeuo-btn bg-[var(--skeuo-raised)] text-[var(--foreground)] border border-[var(--skeuo-edge-light)]',
    ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--skeuo-raised)]',
  }[variant];

  return (
    <button
      ref={btnRef}
      className={`ripple-container ${variantClass} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
