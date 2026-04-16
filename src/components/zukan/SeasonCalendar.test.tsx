import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SeasonCalendar } from './SeasonCalendar';
import { mushrooms } from '@/data/mushrooms';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('SeasonCalendar', () => {
  it('renders all 12 month tab labels', async () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByRole('button', { name: `${i}月` })).toBeInTheDocument();
    }
  });

  it('renders すべて tab for showing all species', () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument();
  });

  it('defaults to current month selected after hydration', async () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    const currentMonth = new Date().getMonth() + 1;
    await waitFor(() => {
      const tab = screen.getByRole('button', { name: `${currentMonth}月` });
      expect(tab.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('filters mushrooms when a month tab is clicked', async () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    // Click "すべて" to show all
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    const allRows = document.querySelectorAll('tbody tr');
    const allCount = allRows.length;
    // Click month 7
    fireEvent.click(screen.getByRole('button', { name: '7月' }));
    const filteredRows = document.querySelectorAll('tbody tr');
    expect(filteredRows.length).toBeLessThanOrEqual(allCount);
  });

  it('shows empty message when no mushrooms match', () => {
    render(<SeasonCalendar mushrooms={[]} />);
    // Click a month that will yield 0
    // With empty input, "すべて" already has 0, so click it
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    expect(screen.getByText(/この月が旬のキノコはありません/)).toBeInTheDocument();
  });

  it('links mushroom names to detail pages', () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    // Pick the first v2 species and assert its name links to its slug.
    const sample = mushrooms[0];
    const links = screen.getAllByRole('link', { name: new RegExp(sample.names.ja) });
    const targetLink = links.find((l) => l.getAttribute('href') === `/zukan/${sample.id}`);
    expect(targetLink).toBeDefined();
  });
});
