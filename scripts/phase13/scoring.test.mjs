import { describe, it, expect } from 'vitest';
import { computeScore, classifyTier, rankAndClassify } from './scoring.mjs';

describe('computeScore', () => {
  it('applies log scale to domestic observations', () => {
    const s1 = computeScore({ observationsDomestic: 1, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    const s2 = computeScore({ observationsDomestic: 10000, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(s2).toBeGreaterThan(s1);
  });

  it('returns 0 base when zero observations', () => {
    const s = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(s).toBe(0);
  });

  it('adds wamei boost', () => {
    const withWamei = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: true, toxicity: 'unknown', mycobankId: null });
    expect(withWamei).toBe(3);
  });

  it('adds wiki ja boost', () => {
    const withWiki = computeScore({ observationsDomestic: 0, wikiJaExists: true, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(withWiki).toBe(5);
  });

  it('applies deadly boost', () => {
    const s = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'deadly', mycobankId: null });
    expect(s).toBe(10);
  });

  it('sums all signals additively', () => {
    const s = computeScore({ observationsDomestic: 100, wikiJaExists: true, inatHasPhotos: true, hasWamei: true, toxicity: 'edible', mycobankId: 247978 });
    // log10(100) * 2 = 4, + 5(wiki) + 2(inat) + 3(wamei) + 2(edible) + 1(mb) = 17
    expect(s).toBe(17);
  });
});

describe('classifyTier', () => {
  it('returns tier 0 when scientificName is in tier0 set', () => {
    const tier0Set = new Set(['Amanita virosa']);
    expect(classifyTier('Amanita virosa', 50, 0, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(0);
  });

  it('returns tier 1 for top rankings outside tier 0', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 0, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(1);
  });

  it('returns tier 2 for middle rankings', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 150, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(2);
  });

  it('returns tier 3 for lowest rankings', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 450, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(3);
  });
});

describe('rankAndClassify', () => {
  it('sorts by score desc and assigns tiers', () => {
    const candidates = [
      { scientificName: 'A', score: 10 },
      { scientificName: 'B', score: 30 },
      { scientificName: 'C', score: 20 },
    ];
    const tier0Set = new Set();
    const result = rankAndClassify(candidates, { tier0Set, tier1Size: 1, tier2Size: 1 });
    expect(result[0]).toMatchObject({ scientificName: 'B', tier: 1, rank: 0 });
    expect(result[1]).toMatchObject({ scientificName: 'C', tier: 2, rank: 1 });
    expect(result[2]).toMatchObject({ scientificName: 'A', tier: 3, rank: 2 });
  });

  it('places tier 0 species first regardless of score', () => {
    const candidates = [
      { scientificName: 'high', score: 100 },
      { scientificName: 'manual', score: 5 },
    ];
    const tier0Set = new Set(['manual']);
    const result = rankAndClassify(candidates, { tier0Set, tier1Size: 10, tier2Size: 100 });
    const tier0Entry = result.find(r => r.scientificName === 'manual');
    expect(tier0Entry.tier).toBe(0);
  });
});
