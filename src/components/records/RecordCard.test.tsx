import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { RecordCard } from './RecordCard';
import type { MushroomRecord } from '@/types/record';

// Next.js の Link コンポーネントをモック
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockRecord: MushroomRecord = {
  id: 'test-1',
  mushroom_name_ja: 'マツタケ',
  observed_at: '2026-04-08T10:00:00Z',
  location: { lat: 35.6, lng: 139.6, description: '高尾山' },
  photos: [],
  harvested: true,
  created_at: '2026-04-08T10:00:00Z',
  updated_at: '2026-04-08T10:00:00Z',
};

describe('RecordCard', () => {
  it('renders mushroom name', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('マツタケ')).toBeInTheDocument();
  });

  it('renders date (expect some part of "2026" visible)', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders location description', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('高尾山')).toBeInTheDocument();
  });

  it('links to /records/{id}', () => {
    render(<RecordCard record={mockRecord} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/records/detail?id=test-1');
  });

  it('shows "採取" badge when harvested=true', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('採取')).toBeInTheDocument();
  });

  it('shows "観察" badge when harvested=false', () => {
    const observedRecord: MushroomRecord = { ...mockRecord, harvested: false };
    render(<RecordCard record={observedRecord} />);
    expect(screen.getByText('観察')).toBeInTheDocument();
  });
});
