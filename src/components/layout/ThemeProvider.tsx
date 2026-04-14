'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * ArchiFlow ThemeProvider wrapping next-themes.
 *
 * - attribute="class"  → toggles `.dark` on <html> so CSS custom properties
 *   defined in globals.css under `.dark { … }` take effect automatically.
 * - defaultTheme="system" → respects the OS preference out of the box.
 * - enableSystem → allows "system" as a valid resolvedTheme value.
 * - storageKey="archiflow-theme" → keeps backward-compat with existing
 *   localStorage entries already written by the legacy toggleTheme handler.
 * - disableTransitionOnChange → prevents ugly colour-transition flash when
 *   switching themes at runtime.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="archiflow-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
