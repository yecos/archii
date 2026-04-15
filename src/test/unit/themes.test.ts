import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ColorThemeId, ColorThemeDefinition } from '@/lib/themes';
import {
  COLOR_THEMES,
  STORAGE_KEY,
  DEFAULT_THEME,
  applyColorTheme,
} from '@/lib/themes';

describe('themes', () => {
  describe('COLOR_THEMES', () => {
    it('has 7 themes', () => {
      expect(COLOR_THEMES).toHaveLength(7);
    });

    it('each theme has required properties', () => {
      for (const theme of COLOR_THEMES) {
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('description');
        expect(theme).toHaveProperty('icon');
        expect(theme).toHaveProperty('previewGradient');
        expect(theme).toHaveProperty('light');
        expect(theme).toHaveProperty('dark');
      }
    });

    it('each theme has light CSS vars with --primary, --accent, --af-accent', () => {
      for (const theme of COLOR_THEMES) {
        expect(theme.light).toHaveProperty('--primary');
        expect(theme.light).toHaveProperty('--accent');
        expect(theme.light).toHaveProperty('--af-accent');
        // Values should be non-empty
        expect(theme.light['--primary'].length).toBeGreaterThan(0);
      }
    });

    it('each theme has dark CSS vars with --primary, --accent, --af-accent', () => {
      for (const theme of COLOR_THEMES) {
        expect(theme.dark).toHaveProperty('--primary');
        expect(theme.dark).toHaveProperty('--accent');
        expect(theme.dark).toHaveProperty('--af-accent');
        expect(theme.dark['--primary'].length).toBeGreaterThan(0);
      }
    });

    it('all theme ids are unique', () => {
      const ids = COLOR_THEMES.map((t) => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('includes dorado as first theme', () => {
      expect(COLOR_THEMES[0].id).toBe('dorado');
    });
  });

  describe('STORAGE_KEY', () => {
    it('is archiflow-color-theme', () => {
      expect(STORAGE_KEY).toBe('archiflow-color-theme');
    });
  });

  describe('DEFAULT_THEME', () => {
    it('is dorado', () => {
      expect(DEFAULT_THEME).toBe('dorado');
    });

    it('is a valid ColorThemeId', () => {
      const validIds: ColorThemeId[] = ['dorado', 'pastel', 'terracota', 'electrico', 'neon', 'arena', 'menta'];
      expect(validIds).toContain(DEFAULT_THEME);
    });
  });

  describe('applyColorTheme', () => {
    const root = document.documentElement;

    beforeEach(() => {
      // Clear all inline styles and attributes before each test
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--af-accent');
      root.removeAttribute('data-color-theme');
    });

    it('sets data-color-theme attribute on documentElement', () => {
      applyColorTheme('dorado', false);
      expect(root.getAttribute('data-color-theme')).toBe('dorado');
    });

    it('applies light vars when isDark=false', () => {
      const theme = COLOR_THEMES.find((t) => t.id === 'pastel')!;
      applyColorTheme('pastel', false);

      expect(root.getAttribute('data-color-theme')).toBe('pastel');
      expect(root.style.getPropertyValue('--primary')).toBe(theme.light['--primary']);
      expect(root.style.getPropertyValue('--accent')).toBe(theme.light['--accent']);
      expect(root.style.getPropertyValue('--af-accent')).toBe(theme.light['--af-accent']);
    });

    it('applies dark vars when isDark=true', () => {
      const theme = COLOR_THEMES.find((t) => t.id === 'neon')!;
      applyColorTheme('neon', true);

      expect(root.getAttribute('data-color-theme')).toBe('neon');
      expect(root.style.getPropertyValue('--primary')).toBe(theme.dark['--primary']);
      expect(root.style.getPropertyValue('--accent')).toBe(theme.dark['--accent']);
      expect(root.style.getPropertyValue('--af-accent')).toBe(theme.dark['--af-accent']);
    });

    it('does nothing for invalid theme id', () => {
      applyColorTheme('nonexistent' as ColorThemeId, false);
      expect(root.getAttribute('data-color-theme')).toBeNull();
    });

    it('switching theme overrides previous CSS variables', () => {
      applyColorTheme('dorado', false);
      const doradoPrimary = root.style.getPropertyValue('--primary');

      applyColorTheme('menta', false);
      const mentaPrimary = root.style.getPropertyValue('--primary');

      expect(doradoPrimary).not.toBe(mentaPrimary);
      expect(root.getAttribute('data-color-theme')).toBe('menta');
    });

    it('switching between light and dark updates variables', () => {
      applyColorTheme('electrico', false);
      const lightPrimary = root.style.getPropertyValue('--primary');

      applyColorTheme('electrico', true);
      const darkPrimary = root.style.getPropertyValue('--primary');

      expect(lightPrimary).not.toBe(darkPrimary);
    });
  });
});
