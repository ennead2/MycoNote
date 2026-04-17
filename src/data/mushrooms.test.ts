import { describe, it, expect } from 'vitest';
import { mushrooms, getMushroomById, searchMushrooms, getMushroomsBySeason } from './mushrooms';

describe('mushrooms data (v2)', () => {
  it('loads at least 113 v2 entries (Phase 14 tier0+tier1)', () => {
    expect(mushrooms.length).toBeGreaterThanOrEqual(113);
  });

  it('every entry has required v2 fields', () => {
    for (const m of mushrooms) {
      expect(m.id, `${m.id}: id must be defined`).toBeTruthy();
      expect(m.names.ja, `${m.id}: names.ja must be defined`).toBeTruthy();
      expect(m.names.scientific, `${m.id}: names.scientific must be defined`).toBeTruthy();
      expect(['edible', 'caution', 'inedible', 'unknown', 'toxic', 'deadly'], `${m.id}: safety must be valid`).toContain(m.safety);
      expect(Array.isArray(m.season), `${m.id}: season must be array`).toBe(true);
      expect(m.season.length, `${m.id}: season must have at least one range`).toBeGreaterThan(0);
      for (const r of m.season) {
        expect(r.start_month, `${m.id}: start_month`).toBeGreaterThanOrEqual(1);
        expect(r.start_month, `${m.id}: start_month`).toBeLessThanOrEqual(12);
        expect(r.end_month, `${m.id}: end_month`).toBeGreaterThanOrEqual(1);
        expect(r.end_month, `${m.id}: end_month`).toBeLessThanOrEqual(12);
      }
      expect(m.sources, `${m.id}: sources must be present`).toBeDefined();
      expect(m.sources.length, `${m.id}: sources must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('id format is scientific underscore lowercase slug', () => {
    for (const m of mushrooms) {
      expect(m.id).toMatch(/^[a-z][a-z0-9_]+$/);
    }
  });
});

describe('getMushroomById', () => {
  it('returns mushroom for valid v2 id', () => {
    const result = getMushroomById('amanita_muscaria');
    expect(result).toBeDefined();
    expect(result?.names.scientific).toBe('Amanita muscaria');
  });

  it('returns undefined for invalid id', () => {
    expect(getMushroomById('nonexistent-mushroom')).toBeUndefined();
  });
});

describe('searchMushrooms', () => {
  it('filters by Japanese name query', () => {
    const results = searchMushrooms({ query: 'ベニテング' });
    expect(results.some((m) => m.id === 'amanita_muscaria')).toBe(true);
  });

  it('filters by scientific name query', () => {
    const results = searchMushrooms({ query: 'Amanita' });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by alias query', () => {
    const results = searchMushrooms({ query: '紅天狗茸' });
    expect(results.some((m) => m.id === 'amanita_muscaria')).toBe(true);
  });

  it('filters by safety', () => {
    const results = searchMushrooms({ safety: ['deadly'] });
    expect(results.every((m) => m.safety === 'deadly')).toBe(true);
  });

  it('filters by multiple safety values', () => {
    const results = searchMushrooms({ safety: ['toxic', 'deadly'] });
    expect(results.every((m) => m.safety === 'toxic' || m.safety === 'deadly')).toBe(true);
  });

  it('combines query and safety filters', () => {
    const results = searchMushrooms({ query: 'テング', safety: ['toxic'] });
    expect(results.every((m) => m.safety === 'toxic')).toBe(true);
  });

  it('returns all mushrooms when no filters', () => {
    const results = searchMushrooms({});
    expect(results.length).toBe(mushrooms.length);
  });

  it('filters by hiragana query (matches katakana names)', () => {
    const results = searchMushrooms({ query: 'べにてんぐ' });
    expect(results.some((m) => m.id === 'amanita_muscaria')).toBe(true);
  });
});

describe('getMushroomsBySeason', () => {
  it('returns mushrooms with at least one range covering July', () => {
    const results = getMushroomsBySeason(7);
    expect(results.length).toBeGreaterThan(0);
    for (const m of results) {
      expect(
        m.season.some((r) =>
          r.start_month <= r.end_month
            ? 7 >= r.start_month && 7 <= r.end_month
            : 7 >= r.start_month || 7 <= r.end_month
        )
      ).toBe(true);
    }
  });
});

describe('searchMushrooms — scientific_synonyms (Phase 12 / 13-F 互換)', () => {
  it('finds species by GBIF synonym when present', () => {
    // Find a v2 species that has scientific_synonyms populated
    const withSyn = mushrooms.find((m) => m.names.scientific_synonyms && m.names.scientific_synonyms.length > 0);
    if (!withSyn) {
      // None in v2 corpus — skip rather than fail
      return;
    }
    const synonym = withSyn.names.scientific_synonyms![0];
    const results = searchMushrooms({ query: synonym });
    expect(results.some((m) => m.id === withSyn.id)).toBe(true);
  });
});
