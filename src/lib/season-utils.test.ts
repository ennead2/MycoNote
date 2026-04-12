import { describe, it, expect } from 'vitest';
import { getSeasonalMushrooms, getSafetyTip, SAFETY_TIPS, isMonthInSeason } from './season-utils';

describe('isMonthInSeason', () => {
  it('returns true when month is in a normal range', () => {
    expect(isMonthInSeason(10, 9, 11)).toBe(true);
    expect(isMonthInSeason(9, 9, 11)).toBe(true);
    expect(isMonthInSeason(11, 9, 11)).toBe(true);
  });

  it('returns false when month is outside a normal range', () => {
    expect(isMonthInSeason(8, 9, 11)).toBe(false);
    expect(isMonthInSeason(12, 9, 11)).toBe(false);
  });

  it('handles wrap-around ranges (e.g. 11-2)', () => {
    expect(isMonthInSeason(12, 11, 2)).toBe(true);
    expect(isMonthInSeason(1, 11, 2)).toBe(true);
    expect(isMonthInSeason(2, 11, 2)).toBe(true);
    expect(isMonthInSeason(3, 11, 2)).toBe(false);
    expect(isMonthInSeason(10, 11, 2)).toBe(false);
  });
});

describe('getSeasonalMushrooms', () => {
  it('returns mushrooms in season for the given month', () => {
    const results = getSeasonalMushrooms(10);
    expect(results.length).toBeGreaterThan(0);
    for (const m of results) {
      expect(isMonthInSeason(10, m.season.start_month, m.season.end_month)).toBe(true);
    }
  });

  it('limits results when maxCount is specified', () => {
    const results = getSeasonalMushrooms(10, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('returns empty-ish without crashing for any month', () => {
    for (let m = 1; m <= 12; m++) {
      const results = getSeasonalMushrooms(m);
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

describe('getSafetyTip', () => {
  it('returns a string from SAFETY_TIPS', () => {
    const tip = getSafetyTip(0);
    expect(SAFETY_TIPS).toContain(tip);
  });

  it('cycles deterministically based on seed', () => {
    const a = getSafetyTip(0);
    const b = getSafetyTip(SAFETY_TIPS.length);
    expect(a).toBe(b);
  });

  it('handles negative seed', () => {
    const tip = getSafetyTip(-1);
    expect(SAFETY_TIPS).toContain(tip);
  });
});
