import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MushroomDetail } from './MushroomDetail';
import type { Mushroom } from '@/types/mushroom';

vi.mock('next/image', () => ({ default: (props: any) => <img {...props} /> }));

vi.mock('@/contexts/RecordsContext', () => ({
  useRecords: () => ({
    getRecordsByMushroomId: () => [],
  }),
}));

vi.mock('@/contexts/BookmarksContext', () => ({
  useBookmarks: () => ({
    bookmarks: [],
    isLoading: false,
    isBookmarked: () => false,
    toggleBookmark: vi.fn(),
    reload: vi.fn(),
  }),
}));

const mockMushroom: Mushroom = {
  id: 'mock-toxic-kinoko',
  names: {
    ja: 'モックキノコ',
    scientific: 'Mockus fungus toxicus',
    aliases: ['モックタケ'],
  },
  toxicity: 'toxic',
  season: { start_month: 6, end_month: 10 },
  habitat: ['広葉樹林', '針葉樹林'],
  regions: ['本州', '北海道'],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: 'テスト説明文。',
  features: 'テスト特徴文。',
  similar_species: ['shiitake'],
  caution: 'これは危険なキノコです。絶対に食べないでください。',
};

const edibleMushroom: Mushroom = {
  id: 'mock-edible-kinoko',
  names: {
    ja: '食べられるキノコ',
    scientific: 'Edibilis fungus',
  },
  toxicity: 'edible',
  season: { start_month: 4, end_month: 6 },
  habitat: ['広葉樹林'],
  regions: ['本州'],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: '食べられます。',
  features: '美味しそう。',
  similar_species: [],
};

describe('MushroomDetail', () => {
  it('renders Japanese and scientific name', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('モックキノコ')).toBeInTheDocument();
    expect(screen.getByText('Mockus fungus toxicus')).toBeInTheDocument();
  });

  it('renders toxicity badge', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    // 'toxic' toxicity renders "毒" label
    expect(screen.getByText('毒')).toBeInTheDocument();
  });

  it('renders caution box for toxic mushrooms (red border, red bg)', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const cautionBox = screen.getByRole('alert');
    expect(cautionBox).toBeInTheDocument();
    expect(cautionBox.className).toMatch(/border-red-500/);
    expect(cautionBox.className).toMatch(/bg-red-950/);
    expect(screen.getByText('これは危険なキノコです。絶対に食べないでください。')).toBeInTheDocument();
  });

  it('does NOT render caution box when caution is absent (edible mushroom without caution)', () => {
    render(<MushroomDetail mushroom={edibleMushroom} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders season bar (check table element exists)', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders habitat list', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('広葉樹林')).toBeInTheDocument();
    expect(screen.getByText('針葉樹林')).toBeInTheDocument();
  });

  it('renders similar species links (link to /zukan/shiitake with text "シイタケ")', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const link = screen.getByRole('link', { name: /シイタケ/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/zukan/shiitake');
  });

  it('renders Google image search link with correct URL', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const link = screen.getByRole('link', { name: /Google で画像を検索/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('google.com/search?tbm=isch');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('モックキノコ キノコ'));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
