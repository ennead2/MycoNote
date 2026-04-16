import { describe, it, expect } from 'vitest';
import {
  scientificToSlug,
  normalizeSafety,
  resolveJapaneseName,
  buildMushroom,
  resolveSimilarSpeciesIds,
  approvedFileToScientific,
  buildAll,
} from './build_v2_mushrooms.mjs';

describe('scientificToSlug', () => {
  it('converts binomial to lowercase underscore', () => {
    expect(scientificToSlug('Amanita muscaria')).toBe('amanita_muscaria');
    expect(scientificToSlug('Boletus edulis')).toBe('boletus_edulis');
  });

  it('handles trinomial and special chars', () => {
    expect(scientificToSlug('Amanita pantherina var. multisquamosa')).toBe('amanita_pantherina_var_multisquamosa');
    expect(scientificToSlug('  Russula  emetica  ')).toBe('russula_emetica');
  });
});

describe('normalizeSafety', () => {
  it('maps v1 toxicity enums to v2 safety', () => {
    expect(normalizeSafety('edible_caution')).toBe('caution');
    expect(normalizeSafety('deadly_toxic')).toBe('deadly');
  });

  it('passes through values unchanged', () => {
    expect(normalizeSafety('edible')).toBe('edible');
    expect(normalizeSafety('inedible')).toBe('inedible');
    expect(normalizeSafety('toxic')).toBe('toxic');
  });

  it('throws on unknown', () => {
    expect(() => normalizeSafety('unknown')).toThrow(/unknown safety/);
  });
});

describe('resolveJapaneseName', () => {
  it('returns tier0 japaneseName by default', () => {
    expect(resolveJapaneseName({ japaneseName: 'タマゴタケ' })).toBe('タマゴタケ');
  });

  it('prefers ja_wiki_source_override.title when set', () => {
    expect(
      resolveJapaneseName({
        japaneseName: 'キイボガサタケ',
        ja_wiki_source_override: { title: 'キイボカサタケ' },
      })
    ).toBe('キイボカサタケ');
  });

  it('falls back to japaneseName if override has no title', () => {
    expect(
      resolveJapaneseName({
        japaneseName: 'カキシメジ',
        ja_wiki_source_override: { extract_hint: 'foo' },
      })
    ).toBe('カキシメジ');
  });
});

describe('buildMushroom', () => {
  const tier0Entry = {
    scientificName: 'Amanita muscaria',
    japaneseName: 'ベニテングタケ',
    rationale: 'toxic: 主要な毒きのこ',
  };
  const rankingEntry = {
    scientificName: 'Amanita muscaria',
    japaneseName: 'ベニテングタケ',
    genus: 'Amanita',
    synonyms: ['Agaricus muscarius'],
    signals: { toxicity: 'toxic' },
  };
  const approved = {
    names: { aliases: ['紅天狗茸', 'ハエトリタケ'] },
    season: [{ start_month: 7, end_month: 10 }],
    habitat: ['針葉樹林', '広葉樹林'],
    regions: ['日本'],
    tree_association: ['シラカンバ'],
    similar_species: [
      { ja: 'タマゴタケ', note: '柄とヒダが黄色' },
    ],
    description: 'desc',
    features: 'feat',
    cooking_preservation: null,
    poisoning_first_aid: 'aid',
    caution: 'caution text',
    sources: [{ name: 'wiki', url: 'https://w.example', license: 'CC BY-SA' }],
    notes: 'note',
  };

  it('produces v2 schema entry', () => {
    const m = buildMushroom({ approved, ranking: rankingEntry, tier0: tier0Entry });
    expect(m.id).toBe('amanita_muscaria');
    expect(m.names.ja).toBe('ベニテングタケ');
    expect(m.names.scientific).toBe('Amanita muscaria');
    expect(m.names.aliases).toEqual(['紅天狗茸', 'ハエトリタケ']);
    expect(m.names.scientific_synonyms).toEqual(['Agaricus muscarius']);
    expect(m.taxonomy).toEqual({ genus: 'Amanita' });
    expect(m.safety).toBe('toxic');
    expect(m.season).toEqual([{ start_month: 7, end_month: 10 }]);
    expect(m.habitat).toEqual(['針葉樹林', '広葉樹林']);
    expect(m.regions).toEqual(['日本']);
    expect(m.tree_association).toEqual(['シラカンバ']);
    expect(m.description).toBe('desc');
    expect(m.features).toBe('feat');
    expect(m.cooking_preservation).toBeNull();
    expect(m.poisoning_first_aid).toBe('aid');
    expect(m.caution).toBe('caution text');
    expect(m.similar_species).toEqual([{ ja: 'タマゴタケ', note: '柄とヒダが黄色' }]);
    expect(m.sources).toEqual([{ name: 'wiki', url: 'https://w.example', license: 'CC BY-SA' }]);
    expect(m.notes).toBe('note');
    expect(m.image_local).toBeNull();
    expect(m.images_remote).toEqual([]);
  });

  it('uses ja_wiki_source_override for ja name', () => {
    const m = buildMushroom({
      approved,
      ranking: rankingEntry,
      tier0: { ...tier0Entry, japaneseName: 'foo', ja_wiki_source_override: { title: 'BAR' } },
    });
    expect(m.names.ja).toBe('BAR');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalApproved = {
      names: {},
      season: [{ start_month: 1, end_month: 12 }],
      habitat: [],
      regions: [],
      similar_species: [],
      description: 'd',
      features: 'f',
      cooking_preservation: null,
      poisoning_first_aid: null,
      caution: null,
      sources: [{ name: 'x', url: 'https://x', license: 'CC0' }],
    };
    const minimalRanking = { genus: 'Test', signals: { toxicity: 'edible' } };
    const m = buildMushroom({ approved: minimalApproved, ranking: minimalRanking, tier0: tier0Entry });
    expect(m.names.aliases).toBeUndefined();
    expect(m.names.scientific_synonyms).toBeUndefined();
    expect(m.tree_association).toBeUndefined();
    expect(m.notes).toBeUndefined();
  });

  it('normalizes safety from v1 enum', () => {
    const m = buildMushroom({
      approved,
      ranking: { ...rankingEntry, signals: { toxicity: 'edible_caution' } },
      tier0: tier0Entry,
    });
    expect(m.safety).toBe('caution');
  });
});

describe('resolveSimilarSpeciesIds', () => {
  it('fills similar_species[].id for v2 internal matches by ja', () => {
    const mushrooms = [
      {
        id: 'amanita_muscaria',
        names: { ja: 'ベニテングタケ', scientific: 'Amanita muscaria' },
        similar_species: [{ ja: 'タマゴタケ', note: 'n1' }],
      },
      {
        id: 'amanita_caesareoides',
        names: { ja: 'タマゴタケ', scientific: 'Amanita caesareoides' },
        similar_species: [],
      },
    ];
    const out = resolveSimilarSpeciesIds(mushrooms);
    expect(out[0].similar_species[0].id).toBe('amanita_caesareoides');
  });

  it('does not crash when no match', () => {
    const mushrooms = [
      {
        id: 'amanita_muscaria',
        names: { ja: 'ベニテングタケ', scientific: 'Amanita muscaria' },
        similar_species: [{ ja: 'unknown_species', note: 'n' }],
      },
    ];
    const out = resolveSimilarSpeciesIds(mushrooms);
    expect(out[0].similar_species[0].id).toBeUndefined();
  });

  it('matches by scientific name when ja is ambiguous', () => {
    const mushrooms = [
      {
        id: 'a_x',
        names: { ja: 'X', scientific: 'A x' },
        similar_species: [{ ja: 'Z', note: 'n', scientific: 'A y' }],
      },
      {
        id: 'a_y',
        names: { ja: 'Y', scientific: 'A y' },
        similar_species: [],
      },
    ];
    const out = resolveSimilarSpeciesIds(mushrooms);
    expect(out[0].similar_species[0].id).toBe('a_y');
  });
});

describe('approvedFileToScientific', () => {
  it('reverses underscore to space', () => {
    expect(approvedFileToScientific('Amanita_muscaria.json')).toBe('Amanita muscaria');
    expect(approvedFileToScientific('Lactarius_volemus.json')).toBe('Lactarius volemus');
  });

  it('handles trinomial', () => {
    expect(approvedFileToScientific('Amanita_pantherina_var_multisquamosa.json')).toBe(
      'Amanita pantherina var multisquamosa'
    );
  });
});

describe('buildAll', () => {
  const tier0Mosc = { scientificName: 'Amanita muscaria', japaneseName: 'ベニテングタケ' };
  const rankingMosc = { scientificName: 'Amanita muscaria', genus: 'Amanita', signals: { toxicity: 'toxic' } };
  const approvedMosc = {
    names: {},
    season: [{ start_month: 7, end_month: 10 }],
    habitat: [],
    regions: [],
    similar_species: [],
    description: 'd',
    features: 'f',
    cooking_preservation: null,
    poisoning_first_aid: null,
    caution: null,
    sources: [{ name: 'x', url: 'https://x', license: 'CC0' }],
  };

  it('builds from approved files driving the iteration', () => {
    const { mushrooms, skipped } = buildAll({
      approvedFiles: ['Amanita_muscaria.json'],
      rankingByScientific: new Map([['Amanita muscaria', rankingMosc]]),
      tier0ByScientific: new Map([['Amanita muscaria', tier0Mosc]]),
      loader: () => approvedMosc,
    });
    expect(mushrooms).toHaveLength(1);
    expect(mushrooms[0].id).toBe('amanita_muscaria');
    expect(skipped).toEqual([]);
  });

  it('skips when ranking entry missing', () => {
    const { mushrooms, skipped } = buildAll({
      approvedFiles: ['Amanita_muscaria.json'],
      rankingByScientific: new Map(),
      tier0ByScientific: new Map([['Amanita muscaria', tier0Mosc]]),
      loader: () => approvedMosc,
    });
    expect(mushrooms).toEqual([]);
    expect(skipped[0]).toMatchObject({ scientificName: 'Amanita muscaria', reason: 'ranking-missing' });
  });

  it('skips when tier0 entry missing', () => {
    const { mushrooms, skipped } = buildAll({
      approvedFiles: ['Amanita_muscaria.json'],
      rankingByScientific: new Map([['Amanita muscaria', rankingMosc]]),
      tier0ByScientific: new Map(),
      loader: () => approvedMosc,
    });
    expect(mushrooms).toEqual([]);
    expect(skipped[0]).toMatchObject({ scientificName: 'Amanita muscaria', reason: 'tier0-missing' });
  });

  it('captures build errors per entry without crashing the run', () => {
    const { mushrooms, skipped } = buildAll({
      approvedFiles: ['Amanita_muscaria.json', 'Boletus_edulis.json'],
      rankingByScientific: new Map([
        ['Amanita muscaria', rankingMosc],
        ['Boletus edulis', { genus: 'Boletus', signals: { toxicity: 'unknown' } }],
      ]),
      tier0ByScientific: new Map([
        ['Amanita muscaria', tier0Mosc],
        ['Boletus edulis', { scientificName: 'Boletus edulis', japaneseName: 'ヤマドリタケ' }],
      ]),
      loader: () => approvedMosc,
    });
    expect(mushrooms).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/build-error: unknown safety: unknown/);
  });
});
