import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnimatedTabs } from '@/components/ui/AnimatedTabs';

// Mock ResizeObserver and scrollIntoView for jsdom
beforeEach(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AnimatedTabs', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab Uno' },
    { id: 'tab2', label: 'Tab Dos' },
    { id: 'tab3', label: 'Tab Tres' },
  ];

  it('renders all tab labels', () => {
    render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} />
    );
    expect(screen.getByText('Tab Uno')).toBeDefined();
    expect(screen.getByText('Tab Dos')).toBeDefined();
    expect(screen.getByText('Tab Tres')).toBeDefined();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
    );
    fireEvent.click(screen.getByText('Tab Dos'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('renders tab icons when provided', () => {
    const tabsWithIcons = [
      { id: 'a', label: 'Home', icon: <span data-testid="icon-home">H</span> },
      { id: 'b', label: 'Settings', icon: <span data-testid="icon-settings">S</span> },
    ];
    render(
      <AnimatedTabs tabs={tabsWithIcons} activeTab="a" onTabChange={vi.fn()} />
    );
    expect(screen.getByTestId('icon-home')).toBeDefined();
    expect(screen.getByTestId('icon-settings')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} className="my-class" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-class');
  });

  it('renders sliding pill indicator', () => {
    const { container } = render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} />
    );
    const pill = container.querySelector('.card-elevated.rounded-lg');
    expect(pill).not.toBeNull();
  });

  it('active tab has font-medium class', () => {
    render(
      <AnimatedTabs tabs={tabs} activeTab="tab2" onTabChange={vi.fn()} />
    );
    const activeBtn = screen.getByText('Tab Dos');
    expect(activeBtn.className).toContain('font-medium');
  });

  it('inactive tab has muted color class', () => {
    render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} />
    );
    const inactiveBtn = screen.getByText('Tab Dos');
    expect(inactiveBtn.className).toContain('text-[var(--muted-foreground)]');
  });

  it('all tabs are rendered as buttons', () => {
    render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('container has skeuo-well class', () => {
    const { container } = render(
      <AnimatedTabs tabs={tabs} activeTab="tab1" onTabChange={vi.fn()} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('skeuo-well');
  });
});
