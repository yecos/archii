'use client';
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms, default 1200
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  formatFn?: (n: number) => string;
}

export default function AnimatedCounter({ value, duration = 1200, prefix = '', suffix = '', decimals = 0, className = '', formatFn }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = formatFn
    ? formatFn(displayValue)
    : decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString('es-CO');

  return (
    <span className={`font-tabular ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
