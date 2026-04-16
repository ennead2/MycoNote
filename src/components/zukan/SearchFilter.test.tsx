import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilter } from './SearchFilter';
import type { FilterOptions } from '@/types/mushroom';

const defaultFilters: FilterOptions = {};

describe('SearchFilter', () => {
  it('renders search input with correct placeholder', () => {
    render(<SearchFilter filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('名前で検索...')).toBeInTheDocument();
  });

  it('calls onFilterChange when text changes', () => {
    const onFilterChange = vi.fn();
    render(<SearchFilter filters={defaultFilters} onFilterChange={onFilterChange} />);
    const input = screen.getByPlaceholderText('名前で検索...');
    fireEvent.change(input, { target: { value: 'マツタケ' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ query: 'マツタケ' }));
  });

  it('renders safety filter buttons', () => {
    render(<SearchFilter filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByText('食用')).toBeInTheDocument();
    expect(screen.getByText('要注意')).toBeInTheDocument();
    expect(screen.getByText('不食')).toBeInTheDocument();
    expect(screen.getByText('毒')).toBeInTheDocument();
    expect(screen.getByText('猛毒')).toBeInTheDocument();
  });

  it('toggles safety filter on click', () => {
    const onFilterChange = vi.fn();
    render(<SearchFilter filters={defaultFilters} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('食用'));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ safety: expect.arrayContaining(['edible']) })
    );
  });

  it('removes safety filter when clicked again', () => {
    const onFilterChange = vi.fn();
    const filtersWithEdible: FilterOptions = { safety: ['edible'] };
    render(<SearchFilter filters={filtersWithEdible} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('食用'));
    const called = onFilterChange.mock.calls[0][0] as FilterOptions;
    expect(called.safety).not.toContain('edible');
  });

  it('does not render cap color filter (Phase 13-F: traits removed)', () => {
    render(<SearchFilter filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.queryByText('傘の色')).not.toBeInTheDocument();
  });
});
