'use client';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BottomNav from './BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/zukan',
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders all 5 navigation tabs', () => {
    render(<BottomNav />);
    expect(screen.getByText('図鑑')).toBeInTheDocument();
    expect(screen.getByText('識別')).toBeInTheDocument();
    expect(screen.getByText('計画')).toBeInTheDocument();
    expect(screen.getByText('記録')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('renders correct hrefs', () => {
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: /図鑑/ })).toHaveAttribute('href', '/zukan');
    expect(screen.getByRole('link', { name: /識別/ })).toHaveAttribute('href', '/identify');
    expect(screen.getByRole('link', { name: /計画/ })).toHaveAttribute('href', '/plan');
    expect(screen.getByRole('link', { name: /記録/ })).toHaveAttribute('href', '/records');
    expect(screen.getByRole('link', { name: /設定/ })).toHaveAttribute('href', '/settings');
  });

  it('highlights active tab based on pathname', () => {
    render(<BottomNav />);
    const zukanLink = screen.getByRole('link', { name: /図鑑/ });
    const identifyLink = screen.getByRole('link', { name: /識別/ });
    expect(zukanLink).toHaveClass('text-forest-300');
    expect(identifyLink).not.toHaveClass('text-forest-300');
  });
});
