import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Skeleton, {
  SkeletonKPI,
  SkeletonListItem,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonChart,
  SkeletonGallery,
  SkeletonDashboard,
  SkeletonProjects,
  SkeletonTasks,
} from '@/components/ui/SkeletonLoaders';

describe('SkeletonLoaders', () => {
  describe('Skeleton (base)', () => {
    it('renders with default rounded-lg class', () => {
      const { container } = render(<Skeleton className="w-full h-4" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('af-skeleton');
      expect(el.className).toContain('rounded-lg');
    });

    it('renders with custom rounded variant', () => {
      const { container } = render(<Skeleton rounded="full" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('rounded-full');
    });

    it('renders with no rounding', () => {
      const { container } = render(<Skeleton rounded="none" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('rounded-none');
    });

    it('accepts custom style prop', () => {
      const { container } = render(<Skeleton style={{ height: '200px' }} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.height).toBe('200px');
    });
  });

  describe('SkeletonKPI', () => {
    it('renders KPI card structure with card-elevated', () => {
      const { container } = render(<SkeletonKPI />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card-elevated');
    });

    it('renders 3 skeleton elements (icon + value + label)', () => {
      const { container } = render(<SkeletonKPI />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(3);
    });
  });

  describe('SkeletonListItem', () => {
    it('renders list item structure', () => {
      const { container } = render(<SkeletonListItem />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      // Default: 2 lines (main + sub)
      expect(skeletons.length).toBe(2);
    });

    it('renders avatar when hasAvatar=true', () => {
      const { container } = render(<SkeletonListItem hasAvatar />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(3); // avatar + 2 lines
    });

    it('renders tag when hasTag=true', () => {
      const { container } = render(<SkeletonListItem hasTag />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(3); // 2 lines + tag
    });

    it('renders with 1 line when lines=1', () => {
      const { container } = render(<SkeletonListItem lines={1} />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(1);
    });
  });

  describe('SkeletonCard', () => {
    it('renders card structure', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card-elevated');
    });

    it('renders multiple skeleton elements', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('SkeletonTableRow', () => {
    it('renders default 5 columns', () => {
      const { container } = render(<SkeletonTableRow />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(5);
    });

    it('renders custom number of columns', () => {
      const { container } = render(<SkeletonTableRow cols={3} />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(3);
    });
  });

  describe('SkeletonChart', () => {
    it('renders chart placeholder with 7 bars', () => {
      const { container } = render(<SkeletonChart />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      // 1 header + 7 bars = 8
      expect(skeletons.length).toBe(8);
    });

    it('accepts custom height', () => {
      const { container } = render(<SkeletonChart height={300} />);
      const chartArea = container.querySelector('[style]');
      expect(chartArea).not.toBeNull();
    });
  });

  describe('SkeletonGallery', () => {
    it('renders default 6 gallery items', () => {
      const { container } = render(<SkeletonGallery />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(6);
    });

    it('renders custom count', () => {
      const { container } = render(<SkeletonGallery count={9} />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBe(9);
    });
  });

  describe('SkeletonDashboard', () => {
    it('renders dashboard structure with KPIs', () => {
      const { container } = render(<SkeletonDashboard />);
      const kpis = container.querySelectorAll('.card-elevated');
      // 4 KPIs + 1 chart card = 5 (but skeuo-panel for lists)
      expect(kpis.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('SkeletonProjects', () => {
    it('renders default 6 project cards', () => {
      const { container } = render(<SkeletonProjects />);
      const skeletons = container.querySelectorAll('.af-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(6);
    });

    it('renders custom count', () => {
      const { container } = render(<SkeletonProjects count={3} />);
      const cardElevated = container.querySelectorAll('.card-elevated');
      expect(cardElevated.length).toBe(3);
    });
  });

  describe('SkeletonTasks', () => {
    it('renders task skeleton groups', () => {
      const { container } = render(<SkeletonTasks />);
      // 3 priority groups
      const cardElevated = container.querySelectorAll('.card-elevated');
      expect(cardElevated.length).toBe(3);
    });
  });
});
