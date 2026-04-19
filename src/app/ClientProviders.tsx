'use client';
import React from 'react';
import AppProvider from '@/contexts/AppContext';

/**
 * ClientProviders — Client-side wrapper for layout.tsx
 *
 * Wraps all page content in AppProvider so that useApp() works
 * everywhere in the component tree, regardless of dynamic imports.
 * This fixes the "useApp must be used within AppProvider" error
 * that occurred with Next.js 16 + dynamic() + React 19 context.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
