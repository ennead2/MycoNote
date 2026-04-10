// src/components/identify/SimpleIdentifyResult.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleIdentifyResult } from './SimpleIdentifyResult';
import type { MatchResult } from '@/lib/identify-matcher';
import type { Mushroom } from '@/types/mushroom';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const makeMushroom = (overrides: Partial<Mushroom>): Mushroom => ({
  id: 'test',
  names: { ja: 'テスト', scientific: 'Test sp.' },
  toxicity: 'edible',
  season: { start_month: 1, end_month: 12 },
  habitat: [],
  regions: [],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: '',
  features: '',
  similar_species: [],
  ...overrides,
});

const mockResults: MatchResult[] = [
  { mushroom: makeMushroom({ id: 'shiitake', names: { ja: 'シイタケ', scientific: 'Lentinula edodes' }, toxicity: 'edible' }), score: 85, matchedTraits: ['gill_type', 'cap_color'], isToxicWarning: false },
  { mushroom: makeMushroom({ id: 'tsukiyo-take', names: { ja: 'ツキヨタケ', scientific: 'Omphalotus japonicus' }, toxicity: 'toxic' }), score: 60, matchedTraits: ['gill_type'], isToxicWarning: true },
  { mushroom: makeMushroom({ id: 'nameko', names: { ja: 'ナメコ', scientific: 'Pholiota microspora' }, toxicity: 'edible' }), score: 45, matchedTraits: ['cap_color'], isToxicWarning: false },
];

describe('SimpleIdentifyResult', () => {
  it('displays all candidate names', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText('シイタケ')).toBeInTheDocument();
    expect(screen.getByText('ツキヨタケ')).toBeInTheDocument();
    expect(screen.getByText('ナメコ')).toBeInTheDocument();
  });

  it('shows toxicity badges', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getAllByText('食用').length).toBeGreaterThan(0);
    expect(screen.getByText('毒')).toBeInTheDocument();
  });

  it('shows score percentages', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows safety warning', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText(/簡易判定です/)).toBeInTheDocument();
  });

  it('shows retry and detail identify buttons', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText(/条件を変える/)).toBeInTheDocument();
    expect(screen.getByText(/詳細識別へ/)).toBeInTheDocument();
  });
});
