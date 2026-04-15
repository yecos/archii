/**
 * themes.ts
 * Multi-theme color system for ArchiFlow 2.0.
 * Each theme overrides accent/primary colors while keeping base backgrounds/foregrounds.
 * Uses CSS variable overrides applied to <html> via inline styles.
 *
 * Themes extracted from user-provided UI reference images.
 */

export type ColorThemeId =
  | 'dorado'
  | 'pastel'
  | 'terracota'
  | 'electrico'
  | 'neon'
  | 'arena'
  | 'menta';

export interface ColorThemeDefinition {
  id: ColorThemeId;
  name: string;
  description: string;
  icon: string;
  previewGradient: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  /* ─── 1. Dorado (default) ─── */
  /* IMG_2641: Smart Home UI — Green accent (#4CD964), clean light mode */
  /* Adapted as warm gold to match ArchiFlow brand identity */
  {
    id: 'dorado',
    name: 'Dorado',
    description: 'Dorado cálido clásico',
    icon: '✨',
    previewGradient: 'linear-gradient(135deg, #9e7c3e, #c8a96e, #e2c898)',
    light: {
      '--primary': '#9e7c3e',
      '--primary-foreground': '#ffffff',
      '--ring': '#9e7c3e',
      '--accent': 'rgba(158,124,62,0.08)',
      '--accent-foreground': '#9e7c3e',
      '--sidebar-primary': '#9e7c3e',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(158,124,62,0.08)',
      '--sidebar-accent-foreground': '#9e7c3e',
      '--sidebar-ring': '#9e7c3e',
      '--af-accent': '#9e7c3e',
      '--af-accent2': '#b8933f',
      '--chart-1': '#9e7c3e',
      '--shadow-glow': '0 0 20px rgba(158,124,62,0.15)',
    },
    dark: {
      '--primary': '#c8a96e',
      '--primary-foreground': '#0e0f11',
      '--ring': '#c8a96e',
      '--accent': 'rgba(200,169,110,0.1)',
      '--accent-foreground': '#e2c898',
      '--sidebar-primary': '#c8a96e',
      '--sidebar-primary-foreground': '#0e0f11',
      '--sidebar-accent': 'rgba(200,169,110,0.1)',
      '--sidebar-accent-foreground': '#e2c898',
      '--sidebar-ring': '#c8a96e',
      '--af-accent': '#c8a96e',
      '--af-accent2': '#e2c898',
      '--chart-1': '#c8a96e',
      '--shadow-glow': '0 0 20px rgba(200,169,110,0.2)',
    },
  },

  /* ─── 2. Pastel ─── */
  /* IMG_2636: Warm beige dashboard — Multi-pastel (sky blue #A8D8EA, mint #B2E5D8, blush #F8C8D4) */
  /* Combined into a soft teal as the primary accent for cohesion */
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Tonos pastel cálidos y orgánicos',
    icon: '🎨',
    previewGradient: 'linear-gradient(135deg, #F5F1ED, #A8D8EA, #F8C8D4, #B2E5D8)',
    light: {
      '--primary': '#5BA4A4',
      '--primary-foreground': '#ffffff',
      '--ring': '#5BA4A4',
      '--accent': 'rgba(91,164,164,0.08)',
      '--accent-foreground': '#5BA4A4',
      '--sidebar-primary': '#5BA4A4',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(91,164,164,0.08)',
      '--sidebar-accent-foreground': '#5BA4A4',
      '--sidebar-ring': '#5BA4A4',
      '--af-accent': '#5BA4A4',
      '--af-accent2': '#7BC5C5',
      '--chart-1': '#5BA4A4',
      '--shadow-glow': '0 0 20px rgba(91,164,164,0.12)',
    },
    dark: {
      '--primary': '#7BC5C5',
      '--primary-foreground': '#0e0f11',
      '--ring': '#7BC5C5',
      '--accent': 'rgba(123,197,197,0.1)',
      '--accent-foreground': '#A8D8EA',
      '--sidebar-primary': '#7BC5C5',
      '--sidebar-primary-foreground': '#0e0f11',
      '--sidebar-accent': 'rgba(123,197,197,0.1)',
      '--sidebar-accent-foreground': '#A8D8EA',
      '--sidebar-ring': '#7BC5C5',
      '--af-accent': '#7BC5C5',
      '--af-accent2': '#A8D8EA',
      '--chart-1': '#7BC5C5',
      '--shadow-glow': '0 0 20px rgba(123,197,197,0.18)',
    },
  },

  /* ─── 3. Terracota ─── */
  /* IMG_2637: Dark mode — Tactile orange buttons (#D2691E), neo-skeuomorphic, high contrast */
  {
    id: 'terracota',
    name: 'Terracota',
    description: 'Naranja oscuro y texturas táctiles',
    icon: '🧱',
    previewGradient: 'linear-gradient(135deg, #1A1A1A, #D2691E, #FFA500)',
    light: {
      '--primary': '#C05A18',
      '--primary-foreground': '#ffffff',
      '--ring': '#C05A18',
      '--accent': 'rgba(192,90,24,0.08)',
      '--accent-foreground': '#C05A18',
      '--sidebar-primary': '#C05A18',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(192,90,24,0.08)',
      '--sidebar-accent-foreground': '#C05A18',
      '--sidebar-ring': '#C05A18',
      '--af-accent': '#C05A18',
      '--af-accent2': '#D2691E',
      '--chart-1': '#D2691E',
      '--shadow-glow': '0 0 20px rgba(210,105,30,0.15)',
    },
    dark: {
      '--primary': '#D2691E',
      '--primary-foreground': '#1A1A1A',
      '--ring': '#D2691E',
      '--accent': 'rgba(210,105,30,0.1)',
      '--accent-foreground': '#E89040',
      '--sidebar-primary': '#D2691E',
      '--sidebar-primary-foreground': '#1A1A1A',
      '--sidebar-accent': 'rgba(210,105,30,0.1)',
      '--sidebar-accent-foreground': '#E89040',
      '--sidebar-ring': '#D2691E',
      '--af-accent': '#D2691E',
      '--af-accent2': '#E89040',
      '--chart-1': '#D2691E',
      '--shadow-glow': '0 0 20px rgba(210,105,30,0.2)',
    },
  },

  /* ─── 4. Eléctrico ─── */
  /* IMG_2638: Dark mode — Blue accent (#4A90E2), glassmorphism panels, component library */
  {
    id: 'electrico',
    name: 'Eléctrico',
    description: 'Azul eléctrico y paneles translúcidos',
    icon: '⚡',
    previewGradient: 'linear-gradient(135deg, #1A1A1A, #4A90E2, #6BA3F5)',
    light: {
      '--primary': '#3A7CC4',
      '--primary-foreground': '#ffffff',
      '--ring': '#3A7CC4',
      '--accent': 'rgba(58,124,196,0.08)',
      '--accent-foreground': '#3A7CC4',
      '--sidebar-primary': '#3A7CC4',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(58,124,196,0.08)',
      '--sidebar-accent-foreground': '#3A7CC4',
      '--sidebar-ring': '#3A7CC4',
      '--af-accent': '#3A7CC4',
      '--af-accent2': '#4A90E2',
      '--chart-1': '#3A7CC4',
      '--shadow-glow': '0 0 20px rgba(74,144,226,0.15)',
    },
    dark: {
      '--primary': '#4A90E2',
      '--primary-foreground': '#1A1A1A',
      '--ring': '#4A90E2',
      '--accent': 'rgba(74,144,226,0.1)',
      '--accent-foreground': '#6BA3F5',
      '--sidebar-primary': '#4A90E2',
      '--sidebar-primary-foreground': '#1A1A1A',
      '--sidebar-accent': 'rgba(74,144,226,0.1)',
      '--sidebar-accent-foreground': '#6BA3F5',
      '--sidebar-ring': '#4A90E2',
      '--af-accent': '#4A90E2',
      '--af-accent2': '#6BA3F5',
      '--chart-1': '#4A90E2',
      '--shadow-glow': '0 0 20px rgba(74,144,226,0.2)',
    },
  },

  /* ─── 5. Neon ─── */
  /* IMG_2639: Dark mode — Vibrant pink (#FF6B9D), neon accents, component showcase */
  {
    id: 'neon',
    name: 'Neon',
    description: 'Rosa neón vibrante y alto contraste',
    icon: '💜',
    previewGradient: 'linear-gradient(135deg, #2A323C, #FF6B9D, #4ADE80)',
    light: {
      '--primary': '#E0487A',
      '--primary-foreground': '#ffffff',
      '--ring': '#E0487A',
      '--accent': 'rgba(224,72,122,0.08)',
      '--accent-foreground': '#E0487A',
      '--sidebar-primary': '#E0487A',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(224,72,122,0.08)',
      '--sidebar-accent-foreground': '#E0487A',
      '--sidebar-ring': '#E0487A',
      '--af-accent': '#E0487A',
      '--af-accent2': '#FF6B9D',
      '--chart-1': '#E0487A',
      '--shadow-glow': '0 0 20px rgba(255,107,157,0.15)',
    },
    dark: {
      '--primary': '#FF6B9D',
      '--primary-foreground': '#2A323C',
      '--ring': '#FF6B9D',
      '--accent': 'rgba(255,107,157,0.1)',
      '--accent-foreground': '#FF8DB8',
      '--sidebar-primary': '#FF6B9D',
      '--sidebar-primary-foreground': '#2A323C',
      '--sidebar-accent': 'rgba(255,107,157,0.1)',
      '--sidebar-accent-foreground': '#FF8DB8',
      '--sidebar-ring': '#FF6B9D',
      '--af-accent': '#FF6B9D',
      '--af-accent2': '#FF8DB8',
      '--chart-1': '#FF6B9D',
      '--shadow-glow': '0 0 20px rgba(255,107,157,0.25)',
    },
  },

  /* ─── 6. Arena ─── */
  /* IMG_2640: Light beige/cream (#F5F2F0) — Pastel coral (#F8B4B4) + soft blue (#A8D0E6) */
  /* Clean minimalist with warm organic feel */
  {
    id: 'arena',
    name: 'Arena',
    description: 'Beige arena y tonos cálidos suaves',
    icon: '🏖️',
    previewGradient: 'linear-gradient(135deg, #F5F2F0, #E8956A, #A8D0E6)',
    light: {
      '--primary': '#C07A50',
      '--primary-foreground': '#ffffff',
      '--ring': '#C07A50',
      '--accent': 'rgba(192,122,80,0.08)',
      '--accent-foreground': '#C07A50',
      '--sidebar-primary': '#C07A50',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(192,122,80,0.08)',
      '--sidebar-accent-foreground': '#C07A50',
      '--sidebar-ring': '#C07A50',
      '--af-accent': '#C07A50',
      '--af-accent2': '#D4956C',
      '--chart-1': '#C07A50',
      '--shadow-glow': '0 0 20px rgba(192,122,80,0.12)',
    },
    dark: {
      '--primary': '#E8956A',
      '--primary-foreground': '#0e0f11',
      '--ring': '#E8956A',
      '--accent': 'rgba(232,149,106,0.1)',
      '--accent-foreground': '#F0B090',
      '--sidebar-primary': '#E8956A',
      '--sidebar-primary-foreground': '#0e0f11',
      '--sidebar-accent': 'rgba(232,149,106,0.1)',
      '--sidebar-accent-foreground': '#F0B090',
      '--sidebar-ring': '#E8956A',
      '--af-accent': '#E8956A',
      '--af-accent2': '#F0B090',
      '--chart-1': '#E8956A',
      '--shadow-glow': '0 0 20px rgba(232,149,106,0.18)',
    },
  },

  /* ─── 7. Menta ─── */
  /* IMG_2641: Light mode — Green accent (#4CD964), purple secondary (#B39DDB), smart home UI */
  /* IMG_2635: Smart Home — Gold (#D4AF37), warm off-white, glassmorphic overlays */
  /* Combined: green primary accent, clean and fresh */
  {
    id: 'menta',
    name: 'Menta',
    description: 'Verde menta fresco y limpio',
    icon: '🌿',
    previewGradient: 'linear-gradient(135deg, #F5F5F5, #4CD964, #B39DDB)',
    light: {
      '--primary': '#2EBD52',
      '--primary-foreground': '#ffffff',
      '--ring': '#2EBD52',
      '--accent': 'rgba(46,189,82,0.08)',
      '--accent-foreground': '#2EBD52',
      '--sidebar-primary': '#2EBD52',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(46,189,82,0.08)',
      '--sidebar-accent-foreground': '#2EBD52',
      '--sidebar-ring': '#2EBD52',
      '--af-accent': '#2EBD52',
      '--af-accent2': '#4CD964',
      '--chart-1': '#2EBD52',
      '--shadow-glow': '0 0 20px rgba(76,217,100,0.15)',
    },
    dark: {
      '--primary': '#4CD964',
      '--primary-foreground': '#0e0f11',
      '--ring': '#4CD964',
      '--accent': 'rgba(76,217,100,0.1)',
      '--accent-foreground': '#6CE07E',
      '--sidebar-primary': '#4CD964',
      '--sidebar-primary-foreground': '#0e0f11',
      '--sidebar-accent': 'rgba(76,217,100,0.1)',
      '--sidebar-accent-foreground': '#6CE07E',
      '--sidebar-ring': '#4CD964',
      '--af-accent': '#4CD964',
      '--af-accent2': '#6CE07E',
      '--chart-1': '#4CD964',
      '--shadow-glow': '0 0 20px rgba(76,217,100,0.2)',
    },
  },
];

export const STORAGE_KEY = 'archiflow-color-theme';
export const DEFAULT_THEME: ColorThemeId = 'dorado';

/**
 * Apply a color theme by overriding CSS variables on <html>.
 * Called at runtime after hydration and whenever dark mode changes.
 */
export function applyColorTheme(themeId: ColorThemeId, isDark: boolean): void {
  const theme = COLOR_THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const vars = isDark ? theme.dark : theme.light;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-color-theme', themeId);
}
