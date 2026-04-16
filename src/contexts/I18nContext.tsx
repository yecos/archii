/**
 * I18nContext.tsx — React context provider for internationalization.
 * Persists language preference in localStorage.
 * Exports hook: useI18n() → { locale, setLocale, t, tArray }
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale } from '@/lib/i18n';
import { DEFAULT_LOCALE, LOCALES, translate, getTranslatedArray, detectBrowserLocale } from '@/lib/i18n';

const STORAGE_KEY = 'archiflow-locale';

interface I18nContextValue {
  /** Current locale code (es, en, pt) */
  locale: Locale;
  /** Change locale */
  setLocale: (l: Locale) => void;
  /** Translate a key with optional params: t('common.items', { count: 5 }) */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Get translated comma-separated array: tArray('calendar.months') */
  tArray: (key: string) => string[];
  /** Whether the i18n system is ready (hydrated) */
  ready: boolean;
  /** All available locales */
  locales: typeof LOCALES;
  /** Direction: 'ltr' for all supported locales */
  dir: 'ltr';
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
  tArray: (key) => [],
  ready: false,
  locales: LOCALES,
  dir: 'ltr',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LOCALES.includes(saved as Locale)) {
        setLocaleState(saved as Locale);
      } else {
        const detected = detectBrowserLocale();
        setLocaleState(detected);
        localStorage.setItem(STORAGE_KEY, detected);
      }
    } catch {
      setLocaleState(DEFAULT_LOCALE);
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (!LOCALES.includes(l)) return;
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, locale, params);
  }, [locale]);

  const tArray = useCallback((key: string) => {
    return getTranslatedArray(key, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
    tArray,
    ready,
    locales: LOCALES,
    dir: 'ltr',
  }), [locale, setLocale, t, tArray, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
