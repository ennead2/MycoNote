import { describe, it, expect } from 'vitest';
import { mushrooms, getMushroomById, searchMushrooms, getMushroomsBySeason } from './mushrooms';

describe('mushrooms data', () => {
  it('loads all mushroom entries', () => {
    expect(mushrooms.length).toBe(279);
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
    expect(results.length).toBe(26);
    expect(results.every((m) => m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('filters by multiple toxicity values', () => {
    const results = searchMushrooms({ toxicity: ['toxic', 'deadly_toxic'] });
    expect(results.length).toBe(83);
    expect(results.every((m) => m.toxicity === 'toxic' || m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('combines query and toxicity filters', () => {
    const results = searchMushrooms({ query: 'テング', toxicity: ['deadly_toxic'] });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((m) => m.toxicity === 'deadly_toxic')).toBe(true);
  });

  it('returns all mushrooms when no filters', () => {
    const results = searchMushrooms({});
    expect(results.length).toBe(279);
  });

  it('filters by hiragana query (matches katakana names)', () => {
    const results = searchMushrooms({ query: 'まつたけ' });
    expect(results.some((m) => m.id === 'matsutake')).toBe(true);
  });

  it('filters by mixed kana query', () => {
    const results = searchMushrooms({ query: 'しいたけ' });
    expect(results.some((m) => m.id === 'shiitake')).toBe(true);
  });
});

describe('mushroom traits', () => {
  it('all mushrooms have traits field', () => {
    for (const m of mushrooms) {
      expect(m.traits, `${m.id} is missing traits`).toBeDefined();
    }
  });

  it('all traits have required fields', () => {
    for (const m of mushrooms) {
      if (!m.traits) continue;
      expect(m.traits.gill_type.length, `${m.id} gill_type is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_color.length, `${m.id} cap_color is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_shape.length, `${m.id} cap_shape is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_size, `${m.id} cap_size is missing`).toBeDefined();
    }
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

// Phase 12: GBIF シノニム解決で追加された scientific_synonyms による検索
describe('searchMushrooms — scientific_synonyms (Phase 12)', () => {
  it('finds ツキヨタケ by 旧学名 "Omphalotus japonicus"', () => {
    const results = searchMushrooms({ query: 'Omphalotus japonicus' });
    expect(results.some((m) => m.id === 'tsukiyo-take')).toBe(true);
  });

  it('finds ツキヨタケ by 新学名 "Omphalotus guepiniiformis"', () => {
    const results = searchMushrooms({ query: 'Omphalotus guepiniiformis' });
    expect(results.some((m) => m.id === 'tsukiyo-take')).toBe(true);
  });

  it('finds タモギタケ by 旧学名 var. 表記', () => {
    const results = searchMushrooms({ query: 'Pleurotus cornucopiae' });
    expect(results.some((m) => m.id === 'tamogitake')).toBe(true);
  });

  it('finds ドクササコ by 旧学名 "Clitocybe acromelalga"', () => {
    const results = searchMushrooms({ query: 'Clitocybe acromelalga' });
    expect(results.some((m) => m.id === 'dokusasako')).toBe(true);
  });

  it('scientific_synonyms が付与された種の数が Phase 12 自動訂正と一致', () => {
    const withSyn = mushrooms.filter((m) => m.names.scientific_synonyms && m.names.scientific_synonyms.length > 0);
    expect(withSyn.length).toBe(27);
  });
});
