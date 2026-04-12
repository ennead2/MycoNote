import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders with shimmer animation class', () => {
    const { container } = render(<LoadingSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-shimmer');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<LoadingSkeleton className="h-20 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-20');
    expect(el.className).toContain('w-full');
  });

  it('uses rounded-lg by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded-lg');
  });

  it('has aria-busy and aria-hidden for accessibility', () => {
    const { container } = render(<LoadingSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
