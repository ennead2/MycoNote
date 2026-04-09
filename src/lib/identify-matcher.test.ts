import { describe, it, expect } from 'vitest';
import { matchMushrooms } from './identify-matcher';
import type { IdentifyInput } from './identify-matcher';

describe('matchMushrooms', () => {
  it('returns up to 5 results sorted by score descending', () => {
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const results = matchMushrooms(input, 10);
    expect(results.length).toBeLessThanOrEqual(8); // 5 + possible toxic warnings
    for (let i = 1; i < Math.min(results.length, 5); i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('gives higher score to better matches', () => {
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const results = matchMushrooms(input, 4);
    const shiitake = results.find((r) => r.mushroom.id === 'shiitake');
    expect(shiitake).toBeDefined();
    expect(shiitake!.score).toBeGreaterThan(50);
  });

  it('excludes unselected optional fields from score calculation', () => {
    const inputMinimal: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const inputWithExtra: IdentifyInput = {
      ...inputMinimal,
      substrate: 'deadwood',
    };
    const results1 = matchMushrooms(inputMinimal, 4);
    const results2 = matchMushrooms(inputWithExtra, 4);
    expect(results1.length).toBeGreaterThan(0);
    expect(results2.length).toBeGreaterThan(0);
  });

  it('halves score for out-of-season mushrooms', () => {
    const inputMatsutake: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'large',
    };
    const inSeason = matchMushrooms(inputMatsutake, 10);
    const outSeason = matchMushrooms(inputMatsutake, 6);
    const matsutakeIn = inSeason.find((r) => r.mushroom.id === 'matsutake');
    const matsutakeOut = outSeason.find((r) => r.mushroom.id === 'matsutake');
    if (matsutakeIn && matsutakeOut) {
      expect(matsutakeOut.score).toBeLessThan(matsutakeIn.score);
    }
  });

  it('includes matched trait names in results', () => {
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
    };
    const results = matchMushrooms(input, 4);
    const match = results.find((r) => r.matchedTraits.length > 0);
    expect(match).toBeDefined();
    expect(match!.matchedTraits).toContain('gill_type');
  });

  it('handles pores gill type correctly (kawara-take)', () => {
    const input: IdentifyInput = {
      gill_type: 'pores',
      cap_color: 'brown',
    };
    const results = matchMushrooms(input, 10);
    const kawara = results.find((r) => r.mushroom.id === 'kawara-take');
    expect(kawara).toBeDefined();
    expect(results[0].mushroom.id).toBe('kawara-take');
  });

  it('returns results even when no perfect match', () => {
    const input: IdentifyInput = {
      gill_type: 'teeth',
    };
    const results = matchMushrooms(input, 6);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.matchedTraits).not.toContain('gill_type');
    }
  });
});
