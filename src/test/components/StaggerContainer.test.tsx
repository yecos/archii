import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerContainer';

describe('StaggerContainer', () => {
  it('renders children', () => {
    render(
      <StaggerContainer>
        <p>Child 1</p>
        <p>Child 2</p>
      </StaggerContainer>
    );
    expect(screen.getByText('Child 1')).toBeDefined();
    expect(screen.getByText('Child 2')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StaggerContainer className="flex gap-4">
        <p>Item</p>
      </StaggerContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('gap-4');
  });
});

describe('StaggerItem', () => {
  it('renders children', () => {
    render(<StaggerItem><span>Content</span></StaggerItem>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('has animate-fadeIn class by default', () => {
    const { container } = render(<StaggerItem><span>X</span></StaggerItem>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-fadeIn');
  });

  it('applies additional className', () => {
    const { container } = render(
      <StaggerItem className="p-4">X</StaggerItem>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-fadeIn');
    expect(wrapper.className).toContain('p-4');
  });
});
