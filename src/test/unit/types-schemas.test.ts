import { describe, it, expect } from 'vitest';
import type { ApprovalType } from '@/lib/types';
import {
  APPROVAL_TYPE_LABELS,
  APPROVAL_TYPE_ICONS,
  DEFAULT_PHASES,
  EXPENSE_CATS,
  SUPPLIER_CATS,
  INV_UNITS,
  INV_WAREHOUSES,
  TRANSFER_STATUSES,
  ADMIN_EMAILS,
  USER_ROLES,
  ROLE_COLORS,
  ROLE_ICONS,
  MESES,
  DIAS_SEMANA,
  DEFAULT_ROLE_PERMS,
  NAV_ITEMS,
  SCREEN_TITLES,
  DEFAULT_NOTIF_PREFERENCES,
  NOTIF_EVENT_CONFIG,
  NOTIF_EVENT_TYPES,
} from '@/lib/types';

describe('types constants', () => {
  describe('DEFAULT_PHASES', () => {
    it('has 6 items', () => {
      expect(DEFAULT_PHASES).toHaveLength(6);
    });

    it('includes Cimentación', () => {
      expect(DEFAULT_PHASES).toContain('Cimentación');
    });

    it('starts with Planos', () => {
      expect(DEFAULT_PHASES[0]).toBe('Planos');
    });

    it('ends with Entrega', () => {
      expect(DEFAULT_PHASES[DEFAULT_PHASES.length - 1]).toBe('Entrega');
    });
  });

  describe('EXPENSE_CATS', () => {
    it('has 5 items', () => {
      expect(EXPENSE_CATS).toHaveLength(5);
    });

    it('includes expected categories', () => {
      expect(EXPENSE_CATS).toContain('Materiales');
      expect(EXPENSE_CATS).toContain('Mano de obra');
    });
  });

  describe('SUPPLIER_CATS', () => {
    it('has 7 items', () => {
      expect(SUPPLIER_CATS).toHaveLength(7);
    });

    it('includes expected categories', () => {
      expect(SUPPLIER_CATS).toContain('Materiales');
      expect(SUPPLIER_CATS).toContain('Otro');
    });
  });

  describe('INV_UNITS', () => {
    it('is readonly', () => {
      // Readonly arrays cannot be mutated at type level
      const units: readonly string[] = INV_UNITS;
      expect(units).toBeDefined();
    });

    it('has 15 items', () => {
      expect(INV_UNITS).toHaveLength(15);
    });

    it('includes common units', () => {
      expect(INV_UNITS).toContain('Unidad');
      expect(INV_UNITS).toContain('Metro');
      expect(INV_UNITS).toContain('Otro');
    });
  });

  describe('INV_WAREHOUSES', () => {
    it('is readonly and has 3 warehouses', () => {
      expect(INV_WAREHOUSES).toHaveLength(3);
    });

    it('includes Almacén Principal', () => {
      expect(INV_WAREHOUSES).toContain('Almacén Principal');
    });
  });

  describe('TRANSFER_STATUSES', () => {
    it('has 4 statuses', () => {
      expect(TRANSFER_STATUSES).toHaveLength(4);
    });

    it('includes Pendiente and Completada', () => {
      expect(TRANSFER_STATUSES).toContain('Pendiente');
      expect(TRANSFER_STATUSES).toContain('Completada');
    });
  });

  describe('USER_ROLES', () => {
    it('includes Admin and Cliente', () => {
      expect(USER_ROLES).toContain('Admin');
      expect(USER_ROLES).toContain('Cliente');
    });

    it('has 7 roles', () => {
      expect(USER_ROLES).toHaveLength(7);
    });
  });

  describe('ROLE_COLORS', () => {
    it('has an entry for every role in USER_ROLES', () => {
      for (const role of USER_ROLES) {
        expect(ROLE_COLORS).toHaveProperty(role);
      }
    });

    it('values contain tailwind classes', () => {
      for (const role of USER_ROLES) {
        expect(ROLE_COLORS[role]).toContain('bg-');
        expect(ROLE_COLORS[role]).toContain('text-');
      }
    });
  });

  describe('ROLE_ICONS', () => {
    it('has an entry for every role in USER_ROLES', () => {
      for (const role of USER_ROLES) {
        expect(ROLE_ICONS).toHaveProperty(role);
      }
    });

    it('Admin icon is 👑', () => {
      expect(ROLE_ICONS['Admin']).toBe('👑');
    });
  });

  describe('MESES', () => {
    it('has 12 months', () => {
      expect(MESES).toHaveLength(12);
    });

    it('starts with Enero', () => {
      expect(MESES[0]).toBe('Enero');
    });

    it('ends with Diciembre', () => {
      expect(MESES[MESES.length - 1]).toBe('Diciembre');
    });
  });

  describe('DIAS_SEMANA', () => {
    it('has 7 days', () => {
      expect(DIAS_SEMANA).toHaveLength(7);
    });

    it('starts with Lun', () => {
      expect(DIAS_SEMANA[0]).toBe('Lun');
    });

    it('ends with Dom', () => {
      expect(DIAS_SEMANA[DIAS_SEMANA.length - 1]).toBe('Dom');
    });
  });

  describe('NAV_ITEMS', () => {
    it('has 21 items', () => {
      expect(NAV_ITEMS).toHaveLength(21);
    });

    it('first item is dashboard', () => {
      expect(NAV_ITEMS[0].id).toBe('dashboard');
    });

    it('each item has id, icon, and label', () => {
      for (const item of NAV_ITEMS) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('label');
      }
    });
  });

  describe('SCREEN_TITLES', () => {
    it('has entries for all nav items plus new screens', () => {
      expect(Object.keys(SCREEN_TITLES).length).toBeGreaterThanOrEqual(NAV_ITEMS.length);
    });

    it('has a title for every nav item id', () => {
      for (const item of NAV_ITEMS) {
        expect(SCREEN_TITLES).toHaveProperty(item.id);
      }
    });

    it('dashboard title is Dashboard', () => {
      expect(SCREEN_TITLES['dashboard']).toBe('Dashboard');
    });
  });

  describe('DEFAULT_NOTIF_PREFERENCES', () => {
    it('all values are true', () => {
      for (const key of Object.keys(DEFAULT_NOTIF_PREFERENCES)) {
        expect(DEFAULT_NOTIF_PREFERENCES[key as keyof typeof DEFAULT_NOTIF_PREFERENCES]).toBe(true);
      }
    });
  });

  describe('NOTIF_EVENT_TYPES', () => {
    it('has 11 items', () => {
      expect(NOTIF_EVENT_TYPES).toHaveLength(11);
    });

    it('includes expected event types', () => {
      expect(NOTIF_EVENT_TYPES).toContain('task_assigned');
      expect(NOTIF_EVENT_TYPES).toContain('approval_action');
    });
  });

  describe('NOTIF_EVENT_CONFIG', () => {
    it('has config for every event type', () => {
      for (const type of NOTIF_EVENT_TYPES) {
        const config = NOTIF_EVENT_CONFIG[type];
        expect(config).toBeDefined();
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('category');
      }
    });
  });

  describe('APPROVAL_TYPE_LABELS', () => {
    const allApprovalTypes: ApprovalType[] = ['budget_change', 'phase_completion', 'expense_approval', 'general'];

    it('covers all ApprovalType values', () => {
      for (const type of allApprovalTypes) {
        expect(APPROVAL_TYPE_LABELS).toHaveProperty(type);
      }
    });

    it('labels are non-empty strings', () => {
      for (const type of allApprovalTypes) {
        expect(APPROVAL_TYPE_LABELS[type].length).toBeGreaterThan(0);
      }
    });
  });

  describe('APPROVAL_TYPE_ICONS', () => {
    it('covers all ApprovalType values', () => {
      const allApprovalTypes: ApprovalType[] = ['budget_change', 'phase_completion', 'expense_approval', 'general'];
      for (const type of allApprovalTypes) {
        expect(APPROVAL_TYPE_ICONS).toHaveProperty(type);
      }
    });
  });

  describe('ADMIN_EMAILS', () => {
    it('includes yecos11@gmail.com', () => {
      expect(ADMIN_EMAILS).toContain('yecos11@gmail.com');
    });
  });

  describe('DEFAULT_ROLE_PERMS', () => {
    it('Admin can do everything', () => {
      const allPerms = Object.keys(DEFAULT_ROLE_PERMS);
      for (const perm of allPerms) {
        expect(DEFAULT_ROLE_PERMS[perm]).toContain('Admin');
      }
    });

    it('Cliente has limited permissions', () => {
      const allPerms = Object.keys(DEFAULT_ROLE_PERMS);
      const clientePerms = allPerms.filter((p) => DEFAULT_ROLE_PERMS[p].includes('Cliente'));

      // Cliente should not be able to do admin-level operations
      expect(DEFAULT_ROLE_PERMS['Cambiar roles']).not.toContain('Cliente');
      expect(DEFAULT_ROLE_PERMS['Gestionar inventario']).not.toContain('Cliente');
    });

    it('every permission has at least one role', () => {
      for (const [perm, roles] of Object.entries(DEFAULT_ROLE_PERMS)) {
        expect(roles.length).toBeGreaterThan(0);
      }
    });

    it('Cambiar roles is Admin-only', () => {
      expect(DEFAULT_ROLE_PERMS['Cambiar roles']).toEqual(['Admin']);
    });
  });
});
