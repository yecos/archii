import { describe, it, expect } from 'vitest';
import * as types from '@/lib/types';
import * as helpers from '@/lib/helpers';

describe('Regression: Type exports integrity', () => {
  it('exports all required type constants', () => {
    expect(types.DEFAULT_PHASES).toBeDefined();
    expect(types.EXPENSE_CATS).toBeDefined();
    expect(types.SUPPLIER_CATS).toBeDefined();
    expect(types.PHOTO_CATS).toBeDefined();
    expect(types.INV_UNITS).toBeDefined();
    expect(types.INV_WAREHOUSES).toBeDefined();
    expect(types.TRANSFER_STATUSES).toBeDefined();
    expect(types.CAT_COLORS).toBeDefined();
    expect(types.ADMIN_EMAILS).toBeDefined();
    expect(types.USER_ROLES).toBeDefined();
    expect(types.MESES).toBeDefined();
    expect(types.DIAS_SEMANA).toBeDefined();
    expect(types.NAV_ITEMS).toBeDefined();
    expect(types.SCREEN_TITLES).toBeDefined();
  });

  it('DEFAULT_PHASES has expected construction phases', () => {
    const expected = ['Planos', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'];
    expect(types.DEFAULT_PHASES).toEqual(expected);
  });

  it('EXPENSE_CATS has expected categories', () => {
    expect(types.EXPENSE_CATS).toContain('Materiales');
    expect(types.EXPENSE_CATS).toContain('Mano de obra');
    expect(types.EXPENSE_CATS).toContain('Mobiliario');
    expect(types.EXPENSE_CATS).toContain('Acabados');
    expect(types.EXPENSE_CATS).toContain('Imprevistos');
  });

  it('USER_ROLES includes Admin and Miembro', () => {
    expect(types.USER_ROLES).toContain('Admin');
    expect(types.USER_ROLES).toContain('Director');
    expect(types.USER_ROLES).toContain('Miembro');
  });

  it('NOTIF_EVENT_TYPES and related configs are defined', () => {
    expect(types.NOTIF_EVENT_TYPES).toBeDefined();
    expect(types.DEFAULT_NOTIF_PREFERENCES).toBeDefined();
    expect(types.NOTIF_EVENT_CONFIG).toBeDefined();
    expect(types.NOTIF_EVENT_TYPES.length).toBeGreaterThan(0);
  });

  it('ROLE_COLORS and ROLE_ICONS cover all USER_ROLES', () => {
    for (const role of types.USER_ROLES) {
      expect(types.ROLE_COLORS[role]).toBeDefined();
      expect(types.ROLE_ICONS[role]).toBeDefined();
    }
  });

  it('MESES has 12 months', () => {
    expect(types.MESES).toHaveLength(12);
  });

  it('DIAS_SEMANA has 7 days', () => {
    expect(types.DIAS_SEMANA).toHaveLength(7);
  });
});

describe('Regression: Helper functions exist', () => {
  it('exports all formatting functions', () => {
    expect(typeof helpers.fmtCOP).toBe('function');
    expect(typeof helpers.fmtDate).toBe('function');
    expect(typeof helpers.fmtDateTime).toBe('function');
    expect(typeof helpers.fmtSize).toBe('function');
    expect(typeof helpers.fmtRecTime).toBe('function');
    expect(typeof helpers.fmtDuration).toBe('function');
    expect(typeof helpers.fmtTimer).toBe('function');
  });

  it('exports all utility functions', () => {
    expect(typeof helpers.getInitials).toBe('function');
    expect(typeof helpers.statusColor).toBe('function');
    expect(typeof helpers.prioColor).toBe('function');
    expect(typeof helpers.taskStColor).toBe('function');
    expect(typeof helpers.avatarColor).toBe('function');
    expect(typeof helpers.getWeekStart).toBe('function');
    expect(typeof helpers.fileToBase64).toBe('function');
    expect(typeof helpers.getPlatform).toBe('function');
    expect(typeof helpers.uniqueId).toBe('function');
  });

  it('fmtCOP formats zero correctly', () => {
    expect(helpers.fmtCOP(0)).toBe('$0');
  });

  it('fmtCOP formats millions with M suffix', () => {
    expect(helpers.fmtCOP(1500000)).toBe('$1.5M');
  });

  it('fmtCOP formats thousands with K suffix', () => {
    expect(helpers.fmtCOP(50000)).toBe('$50K');
  });

  it('fmtCOP formats small numbers with locale', () => {
    expect(helpers.fmtCOP(999)).toMatch(/^\$\d+$/);
  });

  it('fmtDate returns dash for null/undefined', () => {
    expect(helpers.fmtDate(null)).toBe('—');
    expect(helpers.fmtDate(undefined)).toBe('—');
  });

  it('getInitials returns uppercase initials', () => {
    expect(helpers.getInitials('Juan Perez')).toBe('JP');
    expect(helpers.getInitials('Single')).toBe('S');
    expect(helpers.getInitials('')).toBe('?');
  });

  it('uniqueId generates unique ids with prefix', () => {
    const id1 = helpers.uniqueId('test');
    const id2 = helpers.uniqueId('test');
    expect(id1).toMatch(/^test-/);
    expect(id2).toMatch(/^test-/);
    expect(id1).not.toBe(id2);
  });

  it('fmtSize formats bytes correctly', () => {
    expect(helpers.fmtSize(500)).toBe('500 B');
    expect(helpers.fmtSize(2048)).toMatch(/KB/);
    expect(helpers.fmtSize(1048576)).toMatch(/MB/);
  });

  it('fmtDuration formats minutes correctly', () => {
    expect(helpers.fmtDuration(0)).toBe('0m');
    expect(helpers.fmtDuration(45)).toBe('45m');
    expect(helpers.fmtDuration(90)).toBe('1h 30m');
    expect(helpers.fmtDuration(120)).toBe('2h');
  });
});

describe('Regression: Screen files exist', () => {
  const screens = [
    'DashboardScreen',
    'ProjectsScreen',
    'TasksScreen',
    'BudgetScreen',
    'ChatScreen',
    'FilesScreen',
    'GalleryScreen',
    'InventoryScreen',
    'CalendarScreen',
    'TeamScreen',
    'ReportsScreen',
    'SettingsScreen',
    'AdminScreen',
    'ProfileScreen',
    'SuppliersScreen',
    'CompaniesScreen',
    'InvoicesScreen',
    'ObraScreen',
    'TimeTrackingScreen',
    'PortalScreen',
    'InstallScreen',
    'ProjectDetailScreen',
  ];

  for (const screen of screens) {
    it(`${screen} module exists`, async () => {
      const mod = await import(`@/screens/${screen}`);
      expect(mod).toBeDefined();
    });
  }
});

describe('Regression: NAV_ITEMS and SCREEN_TITLES consistency', () => {
  it('every NAV_ITEM has a matching SCREEN_TITLE', () => {
    for (const item of types.NAV_ITEMS) {
      if ('id' in item) {
        expect(
          types.SCREEN_TITLES[item.id as string],
          `NAV_ITEM '${item.label}' (id: '${item.id}') has no matching SCREEN_TITLE`,
        ).toBeDefined();
      }
    }
  });

  it('SCREEN_TITLES has entries for all expected screens', () => {
    const expectedIds = [
      'dashboard', 'profile', 'projects', 'tasks', 'timeTracking',
      'chat', 'budget', 'files', 'obra', 'suppliers', 'team',
      'companies', 'invoices', 'calendar', 'portal', 'gallery',
      'inventory', 'reports', 'admin', 'settings',
    ];
    for (const id of expectedIds) {
      expect(
        types.SCREEN_TITLES[id],
        `SCREEN_TITLES is missing entry for '${id}'`,
      ).toBeDefined();
    }
  });
});
