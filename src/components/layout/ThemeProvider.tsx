'use client';

/**
 * ThemeProvider — wraps next-themes for ArchiFlow
 * Supports 3 modes: light, dark, system
 * Also supports 7 color themes via data-color-theme attribute
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
