import { describe, it, expect } from 'vitest';
import { parseOccurrenceCount } from './gbif-observations.mjs';

describe('parseOccurrenceCount', () => {
  it('returns count when present', () => {
    expect(parseOccurrenceCount({ count: 42 })).toBe(42);
  });

  it('returns 0 when count missing', () => {
    expect(parseOccurrenceCount({})).toBe(0);
  });

  it('returns 0 when count is null', () => {
    expect(parseOccurrenceCount({ count: null })).toBe(0);
  });

  it('handles count as string', () => {
    expect(parseOccurrenceCount({ count: '42' })).toBe(42);
  });
});
