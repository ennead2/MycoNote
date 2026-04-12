import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorChip } from './ColorChip';

describe('ColorChip', () => {
  it('renders with provided color as background', () => {
    const { container } = render(<ColorChip color="#C43E3E" label="赤" />);
    const el = container.firstChild as HTMLElement;
    // rgb equivalent of #C43E3E is rgb(196, 62, 62)
    expect(el.style.backgroundColor).toMatch(/rgb\(196,\s*62,\s*62\)/);
  });

  it('exposes color name via aria-label and title for accessibility', () => {
    render(<ColorChip color="#6BA368" label="緑" />);
    const el = screen.getByRole('img', { name: '緑' });
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('title')).toBe('緑');
  });

  it('defaults to circle shape', () => {
    const { container } = render(<ColorChip color="#000" label="黒" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded-full');
  });

  it('uses square shape when specified', () => {
    const { container } = render(<ColorChip color="#000" label="黒" shape="square" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded-sm');
  });

  it('applies size variants', () => {
    const { container: sm } = render(<ColorChip color="#000" label="黒" size="sm" />);
    const { container: md } = render(<ColorChip color="#000" label="黒" size="md" />);
    const { container: lg } = render(<ColorChip color="#000" label="黒" size="lg" />);
    expect((sm.firstChild as HTMLElement).className).toContain('w-2.5');
    expect((md.firstChild as HTMLElement).className).toContain('w-3');
    expect((lg.firstChild as HTMLElement).className).toContain('w-4');
  });
});
