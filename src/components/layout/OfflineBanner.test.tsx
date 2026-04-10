'use client';

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '@/contexts/AppContext';
import OfflineBanner from './OfflineBanner';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ back: vi.fn() }),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('OfflineBanner', () => {
  it('does not show banner when online', () => {
    renderWithProvider(<OfflineBanner />);
    expect(screen.queryByText(/オフラインモード/)).not.toBeInTheDocument();
    expect(screen.queryByText(/オンラインに復帰/)).not.toBeInTheDocument();
  });

  it('shows banner when offline event fires', async () => {
    renderWithProvider(<OfflineBanner />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/オフラインモード/)).toBeInTheDocument();
  });
});
