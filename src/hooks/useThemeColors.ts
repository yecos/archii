'use client';
import { useState, useEffect } from 'react';

/** Reads a CSS custom property from :root at runtime. */
function readVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Reactive hook that returns the current theme accent color values.
 * Updates automatically when dark/light mode or color theme changes.
 * Used by Recharts components that need hardcoded color strings.
 */
export function useThemeColors() {
  const [accent, setAccent] = useState('');
  const [accentRGB, setAccentRGB] = useState('');

  useEffect(() => {
    const update = () => {
      setAccent(readVar('--af-accent'));
      setAccentRGB(readVar('--af-accent-rgb'));
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-color-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return { accent, accentRGB };
}
