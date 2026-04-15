import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  const allIllustrations = [
    'projects', 'tasks', 'search', 'chat', 'gallery',
    'calendar', 'files', 'team', 'generic',
  ] as const;

  it('renders title text', () => {
    render(<EmptyState illustration="projects" title="No hay proyectos" />);
    expect(screen.getByText('No hay proyectos')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        illustration="tasks"
        title="Sin tareas"
        description="Crea tu primera tarea para comenzar"
      />
    );
    expect(screen.getByText('Crea tu primera tarea para comenzar')).toBeDefined();
  });

  it('does not render description when not provided', () => {
    const { container } = render(
      <EmptyState illustration="generic" title="Vacío" />
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        illustration="projects"
        title="No hay proyectos"
        action={{ label: 'Crear proyecto', onClick }}
      />
    );
    const btn = screen.getByText('Crear proyecto');
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when not provided', () => {
    render(<EmptyState illustration="tasks" title="Sin tareas" />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('applies compact class when compact=true', () => {
    const { container } = render(
      <EmptyState illustration="chat" title="Vacío" compact />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-10');
    expect(wrapper.className).not.toContain('py-16');
  });

  it('applies non-compact class (py-16) by default', () => {
    const { container } = render(
      <EmptyState illustration="files" title="Vacío" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-16');
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState illustration="gallery" title="Vacío" className="my-custom" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-custom');
  });

  it('renders SVG container for all 9 illustration types', () => {
    allIllustrations.forEach((ill) => {
      const { container, unmount } = render(
        <EmptyState illustration={ill} title={`Test ${ill}`} />
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      unmount();
    });
  });

  it('has card-elevated class on wrapper', () => {
    const { container } = render(
      <EmptyState illustration="team" title="Vacío" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('card-elevated');
  });

  it('SVG has viewBox="0 0 160 160" in non-compact mode', () => {
    const { container } = render(
      <EmptyState illustration="calendar" title="Vacío" />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 160 160');
  });
});
