import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeasonBar } from './SeasonBar';

describe('SeasonBar', () => {
  it('renders 12 month cells', () => {
    render(<SeasonBar startMonth={4} endMonth={6} />);
    const cells = screen.getAllByRole('cell');
    expect(cells).toHaveLength(12);
  });

  it('highlights months within season (normal range)', () => {
    const { container } = render(<SeasonBar startMonth={9} endMonth={11} />);
    const cells = container.querySelectorAll('[data-month]');
    cells.forEach((cell) => {
      const month = Number(cell.getAttribute('data-month'));
      if (month >= 9 && month <= 11) {
        expect(cell.className).toContain('bg-moss-light');
      } else {
        expect(cell.className).not.toContain('bg-moss-light');
      }
    });
  });

  it('highlights months across year boundary', () => {
    const { container } = render(<SeasonBar startMonth={11} endMonth={3} />);
    const cells = container.querySelectorAll('[data-month]');
    cells.forEach((cell) => {
      const month = Number(cell.getAttribute('data-month'));
      const isActive = month >= 11 || month <= 3;
      if (isActive) expect(cell.className).toContain('bg-moss-light');
      else expect(cell.className).not.toContain('bg-moss-light');
    });
  });
});
