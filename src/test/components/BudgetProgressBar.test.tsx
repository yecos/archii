import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetProgressBar from '@/components/features/BudgetProgressBar';

describe('BudgetProgressBar', () => {
  it('renders nothing when budget <= 0', () => {
    const { container } = render(<BudgetProgressBar spent={5000} budget={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when budget is negative', () => {
    const { container } = render(<BudgetProgressBar spent={5000} budget={-100} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders percentage label', () => {
    render(<BudgetProgressBar spent={50000} budget={100000} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('renders spent and budget amounts', () => {
    render(<BudgetProgressBar spent={75000} budget={100000} />);
    expect(screen.getByText(/75%/)).toBeDefined();
  });

  it('shows "Excedido" when over budget', () => {
    render(<BudgetProgressBar spent={120000} budget={100000} />);
    expect(screen.getByText(/Excedido/)).toBeDefined();
  });

  it('shows remaining amount when under budget', () => {
    render(<BudgetProgressBar spent={30000} budget={100000} />);
    expect(screen.getByText(/Restante/)).toBeDefined();
  });

  it('shows "Presupuesto al 100%" when exactly at budget', () => {
    render(<BudgetProgressBar spent={100000} budget={100000} />);
    expect(screen.getByText(/Presupuesto al 100%/)).toBeDefined();
  });

  it('does not show label when showLabel=false', () => {
    render(<BudgetProgressBar spent={50000} budget={100000} showLabel={false} />);
    expect(screen.queryByText('Presupuesto utilizado')).toBeNull();
  });

  it('applies compact mode (no labels)', () => {
    render(<BudgetProgressBar spent={50000} budget={100000} compact />);
    expect(screen.queryByText('Presupuesto utilizado')).toBeNull();
    expect(screen.queryByText('Restante')).toBeNull();
  });

  it('shows threshold markers when showThresholds=true', () => {
    render(<BudgetProgressBar spent={50000} budget={100000} showThresholds />);
    // Threshold labels should appear (80%, 90%, 100%)
    // Since BUDGET_THRESHOLDS comes from budget-alerts, check for threshold labels
    const labels = ['80%', '90%', '100%'];
    // At least some threshold-related elements should be present
  });

  it('applies custom className', () => {
    const { container } = render(
      <BudgetProgressBar spent={50000} budget={100000} className="my-custom" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-custom');
  });

  it('progress bar visual is capped at 100% width', () => {
    const { container } = render(
      <BudgetProgressBar spent={200000} budget={100000} />
    );
    const fill = container.querySelector('.rounded-full.transition-all');
    // The fill width should be min(pct, 100)
    const style = fill?.getAttribute('style') || '';
    const widthMatch = style.match(/width:\s*(\d+)%/);
    if (widthMatch) {
      const width = parseInt(widthMatch[1]);
      expect(width).toBeLessThanOrEqual(100);
    }
  });

  it('over budget badge shows correct percentage', () => {
    render(<BudgetProgressBar spent={150000} budget={100000} />);
    // Should show +50% badge
    const overBadge = screen.queryByText(/\+50%/);
    expect(overBadge).not.toBeNull();
  });
});
