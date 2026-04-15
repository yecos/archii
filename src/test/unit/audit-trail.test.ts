import { describe, it, expect } from 'vitest';
import { extractChanges, formatChange, formatValue } from '@/lib/audit-trail';
import type { AuditEntityType } from '@/lib/audit-trail';

describe('extractChanges', () => {
  it('detects status change', () => {
    const changes = extractChanges('project', { status: 'Concepto' }, { status: 'Ejecucion' });
    expect(changes).toHaveProperty('status');
    expect(changes.status.old).toBe('Concepto');
    expect(changes.status.new).toBe('Ejecucion');
  });

  it('detects budget change', () => {
    const changes = extractChanges('project', { budget: 1000 }, { budget: 2000 });
    expect(changes).toHaveProperty('budget');
    expect(changes.budget.old).toBe(1000);
    expect(changes.budget.new).toBe(2000);
  });

  it('ignores untracked fields', () => {
    const changes = extractChanges('project', { someRandomField: 'old' }, { someRandomField: 'new' });
    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('returns empty for same values', () => {
    const changes = extractChanges('task', { status: 'En progreso' }, { status: 'En progreso' });
    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('returns empty for both empty objects', () => {
    const changes = extractChanges('project', {}, {});
    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('detects change from null to string', () => {
    const changes = extractChanges('project', { status: null }, { status: 'Ejecucion' });
    // null is converted to '' by the function
    expect(changes).toHaveProperty('status');
    expect(changes.status.old).toBe('');
    expect(changes.status.new).toBe('Ejecucion');
  });

  it('detects change from undefined to string', () => {
    const changes = extractChanges('project', {}, { status: 'Concepto' });
    expect(changes).toHaveProperty('status');
    expect(changes.status.old).toBe('');
    expect(changes.status.new).toBe('Concepto');
  });

  it('detects change from string to empty string', () => {
    const changes = extractChanges('task', { title: 'Old Title' }, { title: '' });
    expect(changes).toHaveProperty('title');
    expect(changes.title.old).toBe('Old Title');
    expect(changes.title.new).toBe('');
  });

  it('handles task-specific fields', () => {
    const changes = extractChanges('task', { priority: 'Baja' }, { priority: 'Alta' });
    expect(changes).toHaveProperty('priority');
    expect(changes.priority.old).toBe('Baja');
    expect(changes.priority.new).toBe('Alta');
  });

  it('handles expense-specific fields', () => {
    const changes = extractChanges('expense', { amount: 100 }, { amount: 200 });
    expect(changes).toHaveProperty('amount');
    expect(changes.amount.old).toBe(100);
    expect(changes.amount.new).toBe(200);
  });

  it('skips when both values are null', () => {
    const changes = extractChanges('project', { status: null }, { status: null });
    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('skips when both values are empty strings', () => {
    const changes = extractChanges('project', { name: '' }, { name: '' });
    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('skips when both values are undefined', () => {
    const changes = extractChanges('project', {}, {});
    expect(Object.keys(changes)).toHaveLength(0);
  });
});

describe('formatChange', () => {
  it('formats status change with Spanish label "Estado"', () => {
    const result = formatChange('status', { old: 'En progreso', new: 'Completado' });
    expect(result).toBe('Estado: En progreso → Completado');
  });

  it('formats budget change with Spanish label "Presupuesto"', () => {
    const result = formatChange('budget', { old: 1000, new: 2000 });
    expect(result).toContain('Presupuesto:');
  });

  it('uses raw field name for unknown fields', () => {
    const result = formatChange('unknownField', { old: 'a', new: 'b' });
    expect(result).toContain('unknownField:');
    expect(result).toContain('a → b');
  });

  it('formats priority change', () => {
    const result = formatChange('priority', { old: 'Baja', new: 'Alta' });
    expect(result).toContain('Prioridad:');
  });
});

describe('formatValue', () => {
  it('returns "(vacío)" for null', () => {
    expect(formatValue(null)).toBe('(vacío)');
  });

  it('returns "(vacío)" for undefined', () => {
    expect(formatValue(undefined)).toBe('(vacío)');
  });

  it('returns "(vacío)" for empty string', () => {
    expect(formatValue('')).toBe('(vacío)');
  });

  it('formats numbers with locale', () => {
    const result = formatValue(1500000);
    // es-CO locale formatting
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('(vacío)');
  });

  it('returns string as-is', () => {
    expect(formatValue('Hello World')).toBe('Hello World');
  });

  it('returns numbers as formatted string', () => {
    const result = formatValue(0);
    expect(result).toBe('0');
  });
});
