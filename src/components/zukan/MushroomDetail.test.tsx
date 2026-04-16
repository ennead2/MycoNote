import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MushroomDetail } from './MushroomDetail';
import type { Mushroom } from '@/types/mushroom';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));

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
  id: 'mock_toxic_kinoko',
  names: {
    ja: 'モックキノコ',
    scientific: 'Mockus fungus toxicus',
    aliases: ['モックタケ'],
  },
  safety: 'toxic',
  season: [{ start_month: 6, end_month: 10 }],
  habitat: ['広葉樹林', '針葉樹林'],
  regions: ['本州', '北海道'],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: 'テスト説明文。',
  features: 'テスト特徴文。',
  cooking_preservation: null,
  poisoning_first_aid: '応急処置文。',
  caution: 'これは危険なキノコです。絶対に食べないでください。',
  similar_species: [{ ja: 'シイタケ風キノコ', note: '見分けポイント' }],
  sources: [
    { name: 'Wikipedia', url: 'https://example.org/wiki', license: 'CC BY-SA 4.0' },
  ],
};

const edibleMushroom: Mushroom = {
  id: 'mock_edible_kinoko',
  names: {
    ja: '食べられるキノコ',
    scientific: 'Edibilis fungus',
  },
  safety: 'edible',
  season: [{ start_month: 4, end_month: 6 }],
  habitat: ['広葉樹林'],
  regions: ['本州'],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: '食べられます。',
  features: '美味しそう。',
  cooking_preservation: '焼くと美味。',
  poisoning_first_aid: null,
  caution: null,
  similar_species: [],
  sources: [{ name: 'Wikipedia', url: 'https://example.org/wiki2', license: 'CC BY-SA 4.0' }],
};

describe('MushroomDetail (v2)', () => {
  it('renders Japanese and scientific name', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('モックキノコ')).toBeInTheDocument();
    expect(screen.getByText('Mockus fungus toxicus')).toBeInTheDocument();
  });

  it('renders safety badge', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('毒')).toBeInTheDocument();
  });

  it('renders caution box for toxic mushrooms with safety palette', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const cautionBox = screen.getByRole('alert');
    expect(cautionBox).toBeInTheDocument();
    expect(cautionBox.className).toMatch(/border-safety-toxic/);
    expect(screen.getByText('これは危険なキノコです。絶対に食べないでください。')).toBeInTheDocument();
  });

  it('does NOT render caution box when caution is null', () => {
    render(<MushroomDetail mushroom={edibleMushroom} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders season bar', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders habitat tags', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('広葉樹林')).toBeInTheDocument();
    expect(screen.getByText('針葉樹林')).toBeInTheDocument();
  });

  it('renders text-only similar species when v2 internal id does not resolve', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('シイタケ風キノコ')).toBeInTheDocument();
    expect(screen.getByText('見分けポイント')).toBeInTheDocument();
  });

  it('renders sources section with links and license', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const wikiLink = screen.getByRole('link', { name: /Wikipedia/ });
    expect(wikiLink.getAttribute('href')).toBe('https://example.org/wiki');
    expect(wikiLink.getAttribute('target')).toBe('_blank');
    expect(screen.getByText('CC BY-SA 4.0')).toBeInTheDocument();
  });

  it('renders cooking_preservation only for edible species with content', () => {
    render(<MushroomDetail mushroom={edibleMushroom} />);
    expect(screen.getByText('焼くと美味。')).toBeInTheDocument();
  });

  it('renders poisoning_first_aid only when content present', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    expect(screen.getByText('応急処置文。')).toBeInTheDocument();
  });

  it('renders Google image search link with correct URL', () => {
    render(<MushroomDetail mushroom={mockMushroom} />);
    const link = screen.getByRole('link', { name: /Google で画像を検索/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('google.com/search?tbm=isch');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('モックキノコ キノコ'));
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
