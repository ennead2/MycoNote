import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToxicityBadge } from './ToxicityBadge';
import { TOXICITY_CONFIG } from '@/constants/toxicity';
import type { Toxicity } from '@/types/mushroom';

describe('ToxicityBadge', () => {
  const allToxicities: Toxicity[] = ['edible', 'edible_caution', 'inedible', 'toxic', 'deadly_toxic'];

  it.each(allToxicities)('renders correct label for %s', (toxicity) => {
    render(<ToxicityBadge toxicity={toxicity} />);
    expect(screen.getByText(TOXICITY_CONFIG[toxicity].label)).toBeInTheDocument();
  });

  it('renders larger badge for toxic and deadly_toxic', () => {
    const { container: toxicContainer } = render(<ToxicityBadge toxicity="toxic" />);
    const { container: edibleContainer } = render(<ToxicityBadge toxicity="edible" />);
    const toxicBadge = toxicContainer.firstChild as HTMLElement;
    const edibleBadge = edibleContainer.firstChild as HTMLElement;
    expect(toxicBadge.className).toContain('text-sm');
    expect(edibleBadge.className).toContain('text-xs');
  });

  it('includes icon in the badge', () => {
    render(<ToxicityBadge toxicity="deadly_toxic" />);
    expect(screen.getByText(/☠/)).toBeInTheDocument();
  });
});
