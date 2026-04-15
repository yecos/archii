import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project, Expense } from '@/lib/types';
import {
  getBudgetColorClass,
  getBudgetTextColorClass,
  getBudgetBorderColorClass,
  getBudgetBgClass,
  getBudgetColor,
  checkBudgetAlerts,
  getActiveAlerts,
  formatBudgetAlertMessage,
  resetProjectAlerts,
} from '@/lib/budget-alerts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// Helper to create mock Project
function mockProject(id: string, name: string, budget: number): Project {
  return {
    id,
    data: {
      name,
      status: 'En ejecución',
      client: '',
      location: '',
      budget,
      description: '',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    },
  } as Project;
}

// Helper to create mock Expense
function mockExpense(id: string, projectId: string, amount: number): Expense {
  return {
    id,
    data: {
      concept: 'Test',
      projectId,
      category: 'General',
      amount,
      date: '2025-01-15',
      createdAt: null,
    },
  } as Expense;
}

// ===== Color function tests =====

describe('getBudgetColorClass', () => {
  it('returns emerald for pct < 80', () => {
    expect(getBudgetColorClass(79)).toBe('bg-emerald-500');
  });

  it('returns amber for 80 <= pct < 90', () => {
    expect(getBudgetColorClass(80)).toBe('bg-amber-500');
    expect(getBudgetColorClass(89)).toBe('bg-amber-500');
  });

  it('returns orange for 90 <= pct < 100', () => {
    expect(getBudgetColorClass(90)).toBe('bg-orange-500');
    expect(getBudgetColorClass(99)).toBe('bg-orange-500');
  });

  it('returns red for pct >= 100', () => {
    expect(getBudgetColorClass(100)).toBe('bg-red-500');
    expect(getBudgetColorClass(101)).toBe('bg-red-500');
  });
});

describe('getBudgetTextColorClass', () => {
  it('returns emerald for pct < 80', () => {
    expect(getBudgetTextColorClass(79)).toBe('text-emerald-400');
  });

  it('returns amber for 80 <= pct < 90', () => {
    expect(getBudgetTextColorClass(80)).toBe('text-amber-400');
    expect(getBudgetTextColorClass(89)).toBe('text-amber-400');
  });

  it('returns orange for 90 <= pct < 100', () => {
    expect(getBudgetTextColorClass(90)).toBe('text-orange-400');
    expect(getBudgetTextColorClass(99)).toBe('text-orange-400');
  });

  it('returns red for pct >= 100', () => {
    expect(getBudgetTextColorClass(100)).toBe('text-red-400');
    expect(getBudgetTextColorClass(101)).toBe('text-red-400');
  });
});

describe('getBudgetBorderColorClass', () => {
  it('returns emerald for pct < 80', () => {
    expect(getBudgetBorderColorClass(79)).toBe('border-emerald-500/30');
  });

  it('returns amber for 80 <= pct < 90', () => {
    expect(getBudgetBorderColorClass(80)).toBe('border-amber-500/30');
    expect(getBudgetBorderColorClass(89)).toBe('border-amber-500/30');
  });

  it('returns orange for 90 <= pct < 100', () => {
    expect(getBudgetBorderColorClass(90)).toBe('border-orange-500/30');
    expect(getBudgetBorderColorClass(99)).toBe('border-orange-500/30');
  });

  it('returns red for pct >= 100', () => {
    expect(getBudgetBorderColorClass(100)).toBe('border-red-500/30');
    expect(getBudgetBorderColorClass(101)).toBe('border-red-500/30');
  });
});

describe('getBudgetBgClass', () => {
  it('returns emerald for pct < 80', () => {
    expect(getBudgetBgClass(79)).toBe('bg-emerald-500/10');
  });

  it('returns amber for 80 <= pct < 90', () => {
    expect(getBudgetBgClass(80)).toBe('bg-amber-500/10');
    expect(getBudgetBgClass(89)).toBe('bg-amber-500/10');
  });

  it('returns orange for 90 <= pct < 100', () => {
    expect(getBudgetBgClass(90)).toBe('bg-orange-500/10');
    expect(getBudgetBgClass(99)).toBe('bg-orange-500/10');
  });

  it('returns red for pct >= 100', () => {
    expect(getBudgetBgClass(100)).toBe('bg-red-500/10');
    expect(getBudgetBgClass(101)).toBe('bg-red-500/10');
  });
});

describe('getBudgetColor', () => {
  it('returns emerald hex for pct < 80', () => {
    expect(getBudgetColor(79)).toBe('#10b981');
  });

  it('returns amber hex for 80 <= pct < 90', () => {
    expect(getBudgetColor(80)).toBe('#f59e0b');
    expect(getBudgetColor(89)).toBe('#f59e0b');
  });

  it('returns orange hex for 90 <= pct < 100', () => {
    expect(getBudgetColor(90)).toBe('#f97316');
    expect(getBudgetColor(99)).toBe('#f97316');
  });

  it('returns red hex for pct >= 100', () => {
    expect(getBudgetColor(100)).toBe('#ef4444');
    expect(getBudgetColor(101)).toBe('#ef4444');
  });
});

// ===== checkBudgetAlerts =====

describe('checkBudgetAlerts', () => {
  it('no alert for project at 50%', () => {
    const projects = [mockProject('p1', 'Test', 1000)];
    const expenses = [mockExpense('e1', 'p1', 500)];
    const { statuses, newAlerts } = checkBudgetAlerts(projects, expenses);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].percentage).toBe(50);
    expect(statuses[0].highestThreshold).toBeUndefined();
    expect(newAlerts).toHaveLength(0);
  });

  it('fires alert for project at 85% (crosses 80%)', () => {
    const projects = [mockProject('p1', 'Test', 1000)];
    const expenses = [mockExpense('e1', 'p1', 850)];
    const { statuses, newAlerts } = checkBudgetAlerts(projects, expenses);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].percentage).toBe(85);
    expect(statuses[0].highestThreshold).toBeDefined();
    expect(statuses[0].highestThreshold!.threshold).toBe(80);
    expect(newAlerts).toHaveLength(1);
    expect(newAlerts[0].threshold).toBe(80);
  });

  it('fires alert for project at 95% (crosses 90%)', () => {
    const projects = [mockProject('p1', 'Test', 1000)];
    const expenses = [mockExpense('e1', 'p1', 950)];
    const { statuses, newAlerts } = checkBudgetAlerts(projects, expenses);

    expect(statuses[0].percentage).toBe(95);
    expect(statuses[0].highestThreshold!.threshold).toBe(90);
    expect(newAlerts).toHaveLength(1);
    expect(newAlerts[0].threshold).toBe(90);
  });

  it('fires alert for project at 105% (crosses 100%)', () => {
    const projects = [mockProject('p1', 'Test', 1000)];
    const expenses = [mockExpense('e1', 'p1', 1050)];
    const { statuses, newAlerts } = checkBudgetAlerts(projects, expenses);

    expect(statuses[0].percentage).toBe(105);
    expect(statuses[0].highestThreshold!.threshold).toBe(100);
    expect(newAlerts).toHaveLength(1);
    expect(newAlerts[0].severity).toBe('critical');
  });

  it('skips project with budget = 0', () => {
    const projects = [mockProject('p1', 'No Budget', 0)];
    const expenses = [];
    const { statuses, newAlerts } = checkBudgetAlerts(projects, expenses);

    expect(statuses).toHaveLength(0);
    expect(newAlerts).toHaveLength(0);
  });

  it('deduplicates alerts via localStorage — calling twice only fires once', () => {
    const projects = [mockProject('p1', 'Test', 1000)];
    const expenses = [mockExpense('e1', 'p1', 850)];

    // First call — should fire
    const result1 = checkBudgetAlerts(projects, expenses);
    expect(result1.newAlerts).toHaveLength(1);

    // Second call — should not fire again
    const result2 = checkBudgetAlerts(projects, expenses);
    expect(result2.newAlerts).toHaveLength(0);
  });
});

// ===== getActiveAlerts =====

describe('getActiveAlerts', () => {
  it('returns all projects that crossed thresholds', () => {
    const projects = [
      mockProject('p1', 'Over Budget', 1000),
      mockProject('p2', 'Warning', 1000),
      mockProject('p3', 'Safe', 1000),
    ];
    const expenses = [
      mockExpense('e1', 'p1', 1050),
      mockExpense('e2', 'p2', 850),
    ];

    const alerts = getActiveAlerts(projects, expenses);
    expect(alerts).toHaveLength(2);
    // Sorted by threshold desc
    expect(alerts[0].projectId).toBe('p1');
    expect(alerts[0].threshold).toBe(100);
    expect(alerts[1].projectId).toBe('p2');
    expect(alerts[1].threshold).toBe(80);
  });
});

// ===== formatBudgetAlertMessage =====

describe('formatBudgetAlertMessage', () => {
  it('critical (100%) title says "excedido"', () => {
    const alert = {
      projectId: 'p1',
      projectName: 'Test Project',
      threshold: 100,
      label: '100%',
      severity: 'critical' as const,
      emoji: '🚨',
      spent: 1050,
      budget: 1000,
      percentage: 105,
      timestamp: Date.now(),
    };
    const msg = formatBudgetAlertMessage(alert);
    expect(msg.title).toContain('excedido');
    expect(msg.title).toContain('Test Project');
    expect(msg.body).toContain('105%');
  });

  it('warning (80%) title says "cercano al límite"', () => {
    const alert = {
      projectId: 'p1',
      projectName: 'Test Project',
      threshold: 80,
      label: '80%',
      severity: 'warning' as const,
      emoji: '⚠️',
      spent: 850,
      budget: 1000,
      percentage: 85,
      timestamp: Date.now(),
    };
    const msg = formatBudgetAlertMessage(alert);
    expect(msg.title).toContain('cercano al límite');
    expect(msg.title).toContain('Test Project');
    expect(msg.body).toContain('85%');
  });
});

// ===== resetProjectAlerts =====

describe('resetProjectAlerts', () => {
  it('clears localStorage keys for the project', () => {
    // Pre-populate localStorage
    const record = JSON.stringify({
      'p1:80': Date.now(),
      'p1:90': Date.now(),
      'p2:80': Date.now(),
    });
    localStorageMock.getItem.mockReturnValue(record);

    resetProjectAlerts('p1');

    // setItem should have been called with the p2 keys only
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const lastCall = localStorageMock.setItem.mock.calls.at(-1);
    const stored = JSON.parse(lastCall![1]);
    expect(stored['p1:80']).toBeUndefined();
    expect(stored['p1:90']).toBeUndefined();
    expect(stored['p2:80']).toBeDefined();
  });
});
