import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns the same string with a single string argument', () => {
    expect(cn('flex')).toBe('flex');
  });

  it('merges multiple strings', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('filters out falsy values', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'extra')).toBe('base extra');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled');
    expect(result).toBe('btn btn-active');
  });

  it('handles negated conditional classes', () => {
    const condition = false;
    const result = cn('base', condition && 'active', !condition && 'inactive');
    expect(result).toBe('base inactive');
  });

  it('deduplicates identical classes via tailwind-merge', () => {
    const result = cn('flex', 'flex');
    expect(result).toBe('flex');
  });

  it('resolves tailwind conflicts: p-4 vs p-2 → p-2 wins', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('resolves tailwind conflicts: text-red-500 vs text-blue-500 → text-blue-500 wins', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('resolves tailwind conflicts: px-4 px-2 → px-2 wins', () => {
    const result = cn('px-4', 'px-2');
    expect(result).toBe('px-2');
  });

  it('keeps independent classes when no conflict', () => {
    const result = cn('flex', 'text-center', 'bg-white');
    expect(result).toBe('flex text-center bg-white');
  });

  it('handles arrays of classes', () => {
    const result = cn(['flex', 'gap-4']);
    expect(result).toBe('flex gap-4');
  });

  it('handles mixed arguments (strings, arrays, conditionals)', () => {
    const active = true;
    const result = cn('card', ['p-4', active && 'ring-2'], active && 'border-primary');
    expect(result).toBe('card p-4 ring-2 border-primary');
  });

  it('handles empty strings gracefully', () => {
    const result = cn('flex', '', 'gap-2');
    expect(result).toBe('flex gap-2');
  });
});
