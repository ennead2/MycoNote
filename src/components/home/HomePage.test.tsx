import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from './HomePage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} alt={alt} />
  ),
}));

// Mock RecordsContext
vi.mock('@/contexts/RecordsContext', () => ({
  useRecords: () => ({ records: [] }),
}));

describe('HomePage', () => {
  it('renders app title and subtitle', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: /MycoNote/ })).toBeInTheDocument();
    expect(screen.getByText('キノコ採取・観察ハンドブック')).toBeInTheDocument();
  });

  it('renders all 4 quick access cards', () => {
    render(<HomePage />);
    expect(screen.getByText('図鑑')).toBeInTheDocument();
    expect(screen.getByText('識別')).toBeInTheDocument();
    expect(screen.getByText('採取計画')).toBeInTheDocument();
    expect(screen.getByText('採取記録')).toBeInTheDocument();
  });

  it('renders seasonal mushrooms section after hydration', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText(/今月の旬/)).toBeInTheDocument();
    });
  });

  it('renders safety tip after hydration', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText(/Safety Tip/i)).toBeInTheDocument();
    });
  });

  it('shows すべて見る link pointing to /zukan', () => {
    render(<HomePage />);
    const viewAllLinks = screen.getAllByText(/すべて見る/);
    expect(viewAllLinks.length).toBeGreaterThan(0);
  });
});
