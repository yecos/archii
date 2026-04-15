'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUI } from '@/hooks/useDomain';
import {
  COLOR_THEMES,
  applyColorTheme,
  STORAGE_KEY,
  DEFAULT_THEME,
  type ColorThemeId,
} from '@/lib/themes';
import { Check, Sun, Moon, Monitor, Palette, Info } from 'lucide-react';

/* ─── Color Theme Card ─── */
function ThemeCard({
  theme,
  isActive,
  onClick,
}: {
  theme: (typeof COLOR_THEMES)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]
        card-elevated
        ${isActive ? 'border-[var(--af-accent)] shadow-[var(--skeuo-shadow-btn)]' : 'border-[var(--border)] hover:border-[var(--af-accent)]/30'}
      `}
      aria-label={`Tema ${theme.name}`}
      aria-pressed={isActive}
    >
      {/* Gradient Preview Strip */}
      <div
        className="w-full h-12 rounded-lg"
        style={{ background: theme.previewGradient }}
      />

      {/* Active Checkmark Badge */}
      {isActive && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[var(--af-accent)] flex items-center justify-center shadow-sm">
          <Check size={12} className="stroke-[var(--primary-foreground)]" strokeWidth={3} />
        </div>
      )}

      {/* Theme Info */}
      <div className="text-center">
        <div className="text-base mb-0.5">{theme.icon}</div>
        <div className="text-[13px] font-semibold text-[var(--foreground)]">{theme.name}</div>
        <div className="text-[11px] text-[var(--muted-foreground)] leading-tight mt-0.5">
          {theme.description}
        </div>
      </div>
    </button>
  );
}

/* ─── Display Mode Toggle ─── */
const DISPLAY_MODES = [
  { value: 'light' as const, label: 'Claro', icon: Sun },
  { value: 'dark' as const, label: 'Oscuro', icon: Moon },
  { value: 'system' as const, label: 'Sistema', icon: Monitor },
];

function DisplayModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      {DISPLAY_MODES.map((mode) => {
        const isActive = theme === mode.value;
        const Icon = mode.icon;
        return (
          <button
            key={mode.value}
            onClick={() => setTheme(mode.value)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium
              transition-all duration-200 cursor-pointer border
              ${
                isActive
                  ? 'bg-[var(--af-accent)] text-[var(--primary-foreground)] border-[var(--af-accent)] shadow-[var(--skeuo-shadow-btn)]'
                  : 'skeuo-btn text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }
            `}
            aria-label={`Modo ${mode.label}`}
            aria-pressed={isActive}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Settings Screen ─── */
export default function SettingsScreen() {
  const [activeTheme, setActiveTheme] = useState<ColorThemeId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as ColorThemeId) || DEFAULT_THEME;
    }
    return DEFAULT_THEME;
  });

  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const ui = useUI();

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Re-apply color theme when dark mode changes */
  useEffect(() => {
    if (resolvedTheme) {
      applyColorTheme(activeTheme, resolvedTheme === 'dark');
    }
  }, [resolvedTheme, activeTheme]);

  const handleThemeChange = (themeId: ColorThemeId) => {
    setActiveTheme(themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
    const isDark = resolvedTheme === 'dark';
    applyColorTheme(themeId, isDark);
  };

  /* Don't render interactive controls until hydrated to avoid mismatch */
  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--af-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full animate-fadeIn">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <Palette size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <h1
            className="text-xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Configuración
          </h1>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] ml-[42px]">
          Personaliza la apariencia de ArchiFlow
        </p>
      </div>

      {/* ── Section 1: Color Theme ── */}
      <section className="mb-6" aria-labelledby="color-theme-heading">
        <h2
          id="color-theme-heading"
          className="text-[15px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2"
        >
          <span className="text-base">🎨</span>
          Tema de Color
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COLOR_THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={activeTheme === theme.id}
              onClick={() => handleThemeChange(theme.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Section 2: Display Mode ── */}
      <section className="mb-6" aria-labelledby="display-mode-heading">
        <h2
          id="display-mode-heading"
          className="text-[15px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2"
        >
          <span className="text-base">🖱️</span>
          Modo de visualización
        </h2>
        <DisplayModeToggle />
        <p className="text-[11px] text-[var(--muted-foreground)] mt-2">
          El modo «Sistema» sigue la preferencia de tu dispositivo.
        </p>
      </section>

      {/* ── Section 3: App Info ── */}
      <section className="mb-6" aria-labelledby="app-info-heading">
        <h2
          id="app-info-heading"
          className="text-[15px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2"
        >
          <Info size={16} className="stroke-[var(--muted-foreground)]" />
          Información
        </h2>
        <div className="card-elevated rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--muted-foreground)]">Aplicación</span>
            <span className="font-medium text-[var(--foreground)]">ArchiFlow 2.0</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--muted-foreground)]">Tema activo</span>
            <span className="font-medium text-[var(--foreground)]">
              {COLOR_THEMES.find((t) => t.id === activeTheme)?.icon}{' '}
              {COLOR_THEMES.find((t) => t.id === activeTheme)?.name}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--muted-foreground)]">Modo</span>
            <span className="font-medium text-[var(--foreground)] capitalize">
              {resolvedTheme === 'dark' ? 'Oscuro' : resolvedTheme === 'light' ? 'Claro' : 'Sistema'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--muted-foreground)]">Versión</span>
            <span className="font-medium text-[var(--foreground)]">2.0.0</span>
          </div>
        </div>
      </section>
    </div>
  );
}
