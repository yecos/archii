/**
 * ArchiFlow Theme Registry
 * 
 * Sistema extensible de temas. Para agregar un nuevo tema:
 * 1. Agregar una entrada en THEME_REGISTRY con su id y CSS variables
 * 2. Las variables CSS se inyectan automáticamente en <html> como atributo data-theme
 * 3. El store (ui-store) maneja la persistencia y el toggle
 */

export interface ThemeDefinition {
  id: string;
  label: string;
  icon: string;          // Emoji para el selector
  isDark: boolean;       // ¿Usa la clase .dark?
  description: string;   // Descripción corta
  colors: {
    '--background': string;
    '--foreground': string;
    '--card': string;
    '--card-foreground': string;
    '--popover': string;
    '--popover-foreground': string;
    '--primary': string;
    '--primary-foreground': string;
    '--secondary': string;
    '--secondary-foreground': string;
    '--muted': string;
    '--muted-foreground': string;
    '--accent': string;
    '--accent-foreground': string;
    '--destructive': string;
    '--border': string;
    '--input': string;
    '--ring': string;
    '--chart-1': string;
    '--chart-2': string;
    '--chart-3': string;
    '--chart-4': string;
    '--chart-5': string;
    '--sidebar': string;
    '--sidebar-foreground': string;
    '--sidebar-primary': string;
    '--sidebar-primary-foreground': string;
    '--sidebar-accent': string;
    '--sidebar-accent-foreground': string;
    '--sidebar-border': string;
    '--sidebar-ring': string;
    '--af-green': string;
    '--af-amber': string;
    '--af-red': string;
    '--af-blue': string;
    '--af-purple': string;
    '--af-bg3': string;
    '--af-bg4': string;
    '--af-text3': string;
    '--af-accent': string;
    '--af-accent2': string;
  };
}

export const THEME_REGISTRY: ThemeDefinition[] = [
  {
    id: 'dark',
    label: 'Nocturno',
    icon: '🌙',
    isDark: true,
    description: 'Oscuro elegante con acentos dorados',
    colors: {
      '--background': '#0e0f11',
      '--foreground': '#f0f0ee',
      '--card': '#16181c',
      '--card-foreground': '#f0f0ee',
      '--popover': '#16181c',
      '--popover-foreground': '#f0f0ee',
      '--primary': '#c8a96e',
      '--primary-foreground': '#0e0f11',
      '--secondary': '#1e2128',
      '--secondary-foreground': '#f0f0ee',
      '--muted': '#252830',
      '--muted-foreground': '#9a9b9e',
      '--accent': 'rgba(200,169,110,0.1)',
      '--accent-foreground': '#e2c898',
      '--destructive': '#e05555',
      '--border': 'rgba(255,255,255,0.07)',
      '--input': 'rgba(255,255,255,0.12)',
      '--ring': '#c8a96e',
      '--chart-1': '#c8a96e',
      '--chart-2': '#4caf7d',
      '--chart-3': '#e09855',
      '--chart-4': '#5b9bd5',
      '--chart-5': '#9b7ed4',
      '--sidebar': '#16181c',
      '--sidebar-foreground': '#f0f0ee',
      '--sidebar-primary': '#c8a96e',
      '--sidebar-primary-foreground': '#0e0f11',
      '--sidebar-accent': 'rgba(200,169,110,0.1)',
      '--sidebar-accent-foreground': '#e2c898',
      '--sidebar-border': 'rgba(255,255,255,0.07)',
      '--sidebar-ring': '#c8a96e',
      '--af-green': '#4caf7d',
      '--af-amber': '#e09855',
      '--af-red': '#e05555',
      '--af-blue': '#5b9bd5',
      '--af-purple': '#9b7ed4',
      '--af-bg3': '#1e2128',
      '--af-bg4': '#252830',
      '--af-text3': '#5e5f63',
      '--af-accent': '#c8a96e',
      '--af-accent2': '#e2c898',
    },
  },
  {
    id: 'light',
    label: 'Diurno',
    icon: '☀️',
    isDark: false,
    description: 'Claro cálido con tonos crema',
    colors: {
      '--background': '#f8f7f4',
      '--foreground': '#1a1a1a',
      '--card': '#ffffff',
      '--card-foreground': '#1a1a1a',
      '--popover': '#ffffff',
      '--popover-foreground': '#1a1a1a',
      '--primary': '#9e7c3e',
      '--primary-foreground': '#ffffff',
      '--secondary': '#f0ece4',
      '--secondary-foreground': '#1a1a1a',
      '--muted': '#e8e5dd',
      '--muted-foreground': '#737373',
      '--accent': 'rgba(158,124,62,0.08)',
      '--accent-foreground': '#9e7c3e',
      '--destructive': '#dc3545',
      '--border': 'rgba(0,0,0,0.08)',
      '--input': 'rgba(0,0,0,0.1)',
      '--ring': '#9e7c3e',
      '--chart-1': '#9e7c3e',
      '--chart-2': '#2d8f5e',
      '--chart-3': '#c47a28',
      '--chart-4': '#3a7cc4',
      '--chart-5': '#7b5bbf',
      '--sidebar': '#ffffff',
      '--sidebar-foreground': '#1a1a1a',
      '--sidebar-primary': '#9e7c3e',
      '--sidebar-primary-foreground': '#ffffff',
      '--sidebar-accent': 'rgba(158,124,62,0.08)',
      '--sidebar-accent-foreground': '#9e7c3e',
      '--sidebar-border': 'rgba(0,0,0,0.08)',
      '--sidebar-ring': '#9e7c3e',
      '--af-green': '#2d8f5e',
      '--af-amber': '#c47a28',
      '--af-red': '#dc3545',
      '--af-blue': '#3a7cc4',
      '--af-purple': '#7b5bbf',
      '--af-bg3': '#f0ece4',
      '--af-bg4': '#e8e5dd',
      '--af-text3': '#a3a3a3',
      '--af-accent': '#9e7c3e',
      '--af-accent2': '#b8933f',
    },
  },
];

/** Obtener un tema por su ID */
export function getThemeById(id: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find(t => t.id === id);
}

/** Obtener los temas disponibles agrupados */
export function getThemeGroups(): { dark: ThemeDefinition[]; light: ThemeDefinition[] } {
  return {
    dark: THEME_REGISTRY.filter(t => t.isDark),
    light: THEME_REGISTRY.filter(t => !t.isDark),
  };
}
