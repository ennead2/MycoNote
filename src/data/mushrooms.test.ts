import { describe, it, expect } from 'vitest';
import { mushrooms, getMushroomById, searchMushrooms, getMushroomsBySeason } from './mushrooms';

describe('mushrooms data', () => {
  it('loads all mushroom entries', () => {
    expect(mushrooms.length).toBe(13);
  });

  it('every entry has required fields', () => {
    for (const m of mushrooms) {
      expect(m.id, `${m.id}: id must be defined`).toBeTruthy();
      expect(m.names.ja, `${m.id}: names.ja must be defined`).toBeTruthy();
      expect(m.names.scientific, `${m.id}: names.scientific must be defined`).toBeTruthy();
      expect(
        ['edible', 'edible_caution', 'inedible', 'toxic', 'deadly_toxic'],
        `${m.id}: toxicity must be valid`
      ).toContain(m.toxicity);
      expect(m.season.start_month, `${m.id}: season.start_month must be defined`).toBeTruthy();
      expect(m.season.end_month, `${m.id}: season.end_month must be defined`).toBeTruthy();
    }
  });

  it('toxic and deadly_toxic entries have caution text', () => {
    const dangerous = mushrooms.filter(
      (m) => m.toxicity === 'toxic' || m.toxicity === 'deadly_toxic'
    );
    for (const m of dangerous) {
      expect(m.caution, `${m.id}: caution must be defined for toxic species`).toBeTruthy();
    }
  });
});

describe('getMushroomById', () => {
  it('returns mushroom for valid id', () => {
    const result = getMushroomById('matsutake');
    expect(result).toBeDefined();
    expect(result?.id).toBe('matsutake');
    expect(result?.names.ja).toBe('マツタケ');
  });

  it('returns undefined for invalid id', () => {
    const result = getMushroomById('nonexistent-mushroom');
    expect(result).toBeUndefined();
  });
});

describe('searchMushrooms', () => {
  it('filters by Japanese name query', () => {
    const results = searchMushrooms({ query: 'マツ' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((m) => m.id === 'matsutake')).toBe(true);
  });

  it('filters by scientific name query', () => {
    const results = searchMushrooms({ query: 'Amanita' });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by alias query', () => {
    const results = searchMushrooms({ query: '松茸' });
    expect(results.some((m) => m.id === 'matsutake')).toBe(true);
  });

  it('filters by toxicity', () => {
    const results = searchMushrooms({ toxicity: ['deadly_toxic'] });
    expect(results.length).toBe(3);
    expect(results.every((m) => m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('filters by multiple toxicity values', () => {
    const results = searchMushrooms({ toxicity: ['toxic', 'deadly_toxic'] });
    expect(results.length).toBe(6);
    expect(results.every((m) => m.toxicity === 'toxic' || m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('combines query and toxicity filters', () => {
    const results = searchMushrooms({ query: 'テング', toxicity: ['deadly_toxic'] });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((m) => m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('returns all mushrooms when no filters', () => {
    const results = searchMushrooms({});
    expect(results.length).toBe(13);
  });
});

describe('getMushroomsBySeason', () => {
  it('returns mushrooms available in September', () => {
    const results = getMushroomsBySeason(9);
    expect(results.some((m) => m.id === 'matsutake')).toBe(true);
    expect(results.some((m) => m.id === 'nameko')).toBe(true);
  });

  it('handles season wrapping across year boundary', () => {
    // enokitake (11-3): appears in Jan and Dec, NOT in Jul
    const janResults = getMushroomsBySeason(1);
    expect(janResults.some((m) => m.id === 'enokitake')).toBe(true);

    const decResults = getMushroomsBySeason(12);
    expect(decResults.some((m) => m.id === 'enokitake')).toBe(true);

    const julResults = getMushroomsBySeason(7);
    expect(julResults.some((m) => m.id === 'enokitake')).toBe(false);
  });

  it('returns year-round mushrooms for any month', () => {
    // kawara-take (1-12): appears in every month
    for (let month = 1; month <= 12; month++) {
      const results = getMushroomsBySeason(month);
      expect(results.some((m) => m.id === 'kawara-take'), `kawara-take should appear in month ${month}`).toBe(true);
    }
  });
});
