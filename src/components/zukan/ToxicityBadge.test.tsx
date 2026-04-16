import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToxicityBadge } from './ToxicityBadge';
import { SAFETY_CONFIG } from '@/constants/safety';
import type { Safety } from '@/types/mushroom';

describe('ToxicityBadge', () => {
  const allSafety: Safety[] = ['edible', 'caution', 'inedible', 'toxic', 'deadly'];

  it.each(allSafety)('renders correct label for %s', (safety) => {
    render(<ToxicityBadge safety={safety} />);
    expect(screen.getByText(SAFETY_CONFIG[safety].label)).toBeInTheDocument();
  });

  it('renders larger badge for toxic and deadly', () => {
    const { container: toxicContainer } = render(<ToxicityBadge safety="toxic" />);
    const { container: edibleContainer } = render(<ToxicityBadge safety="edible" />);
    const toxicBadge = toxicContainer.firstChild as HTMLElement;
    const edibleBadge = edibleContainer.firstChild as HTMLElement;
    expect(toxicBadge.className).toContain('text-sm');
    expect(edibleBadge.className).toContain('text-xs');
  });

  it('includes icon in the badge', () => {
    render(<ToxicityBadge safety="deadly" />);
    expect(screen.getByText(/☠/)).toBeInTheDocument();
  });
});
