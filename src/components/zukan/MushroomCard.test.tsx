import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MushroomCard } from './MushroomCard';
import type { Mushroom } from '@/types/mushroom';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));

const mockMushroom: Mushroom = {
  id: 'test-kinoko',
  names: { ja: 'テストキノコ', scientific: 'Testus fungus' },
  toxicity: 'edible',
  season: { start_month: 4, end_month: 6 },
  habitat: ['広葉樹林'], regions: ['本州'],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [], description: 'テスト', features: 'テスト',
  similar_species: [],
};

describe('MushroomCard', () => {
  it('renders Japanese name', () => {
    render(<MushroomCard mushroom={mockMushroom} />);
    expect(screen.getByText('テストキノコ')).toBeInTheDocument();
  });
  it('renders toxicity badge', () => {
    render(<MushroomCard mushroom={mockMushroom} />);
    expect(screen.getByText('食用')).toBeInTheDocument();
  });
  it('links to detail page', () => {
    render(<MushroomCard mushroom={mockMushroom} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/zukan/test-kinoko');
  });
  it('renders deadly_toxic badge', () => {
    render(<MushroomCard mushroom={{ ...mockMushroom, toxicity: 'deadly_toxic' }} />);
    expect(screen.getByText('猛毒')).toBeInTheDocument();
  });
});
