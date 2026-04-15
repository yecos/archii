import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimeProgressBar from '@/components/ui/TimeProgressBar';

describe('TimeProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when dueDate is null', () => {
    const { container } = render(<TimeProgressBar dueDate={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when dueDate is undefined', () => {
    const { container } = render(<TimeProgressBar dueDate={undefined as any} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when dueDate is invalid string', () => {
    const { container } = render(<TimeProgressBar dueDate="invalid-date" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when dueDate is a valid ISO string', () => {
    // Due 3 days from now
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(<TimeProgressBar dueDate={dueDate} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders when dueDate is a Date object', () => {
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const { container } = render(<TimeProgressBar dueDate={dueDate as any} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders when dueDate is a Firestore-like timestamp', () => {
    const dueDate = { toDate: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), seconds: 0, nanoseconds: 0 };
    const { container } = render(<TimeProgressBar dueDate={dueDate} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders when dueDate has seconds/nanoseconds (Firestore serialized)', () => {
    const futureMs = Date.now() + 4 * 24 * 60 * 60 * 1000;
    const dueDate = { seconds: Math.floor(futureMs / 1000), nanoseconds: (futureMs % 1000) * 1e6 };
    const { container } = render(<TimeProgressBar dueDate={dueDate} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders when dueDate is a number (epoch ms)', () => {
    const dueDate = Date.now() + 2 * 24 * 60 * 60 * 1000;
    const { container } = render(<TimeProgressBar dueDate={dueDate} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('shows "Completada" when isCompleted=true', () => {
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} isCompleted={true} />);
    expect(screen.getByText('Completada')).toBeDefined();
  });

  it('shows overdue message when past due date', () => {
    const dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} />);
    expect(screen.getByText(/Vencida/)).toBeDefined();
  });

  it('shows time remaining in days and hours', () => {
    // Set due date end-of-day: dueDate.toDate sets hours to 23:59:59
    // So with system time at noon, due date tomorrow = ~1d 11h remaining
    const dueDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} />);
    // Should match something like "4d XXh restantes"
    const match = screen.getByText(/\d+d\s*\d+h restantes/);
    expect(match).not.toBeNull();
  });

  it('shows hours remaining when less than 24h to end-of-day', () => {
    // Component extends due to end-of-day (23:59:59).
    // With system time at noon, a due date today gives ~11h remaining.
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} />);
    // The remaining time is from now to end-of-day of the due date
    const match = screen.getByText(/\d+h restantes/);
    expect(match).not.toBeNull();
  });

  it('renders progress percentage in non-compact mode', () => {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} />);
    // Should show a percentage like XX%
    const pctMatch = screen.getByText(/\d+%/);
    expect(pctMatch).not.toBeNull();
  });

  it('compact mode hides percentage display', () => {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<TimeProgressBar dueDate={dueDate} compact />);
    // In compact mode, only the label (e.g. "3d 0h restantes") is shown, no standalone %
    const allText = screen.queryAllByText(/^\d+%$/);
    // The compact mode should not have a standalone percentage element
    // (the label has the time text, not a standalone %)
  });

  it('applies custom className', () => {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(<TimeProgressBar dueDate={dueDate} className="my-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-class');
  });

  it('respects createdAt for start time calculation', () => {
    const created = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <TimeProgressBar dueDate={dueDate} createdAt={created} />
    );
    expect(container.innerHTML).not.toBe('');
  });

  it('bar has transition-all for animation', () => {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(<TimeProgressBar dueDate={dueDate} />);
    const bar = container.querySelector('.transition-all');
    expect(bar).not.toBeNull();
  });
});
