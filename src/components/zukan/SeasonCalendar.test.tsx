import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeasonCalendar } from './SeasonCalendar';
import { mushrooms } from '@/data/mushrooms';

describe('SeasonCalendar', () => {
  it('renders all mushroom names', () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    expect(screen.getByText('マツタケ')).toBeInTheDocument();
    expect(screen.getByText('シイタケ')).toBeInTheDocument();
  });

  it('renders 12 month headers', () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    for (let i = 1; i <= 12; i++) { expect(screen.getByText(String(i))).toBeInTheDocument(); }
  });

  it('renders a row for each mushroom', () => {
    const { container } = render(<SeasonCalendar mushrooms={mushrooms} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(mushrooms.length);
  });

  it('links mushroom names to detail pages', () => {
    render(<SeasonCalendar mushrooms={mushrooms} />);
    const link = screen.getByRole('link', { name: 'マツタケ' });
    expect(link.getAttribute('href')).toBe('/zukan/matsutake');
  });
});
