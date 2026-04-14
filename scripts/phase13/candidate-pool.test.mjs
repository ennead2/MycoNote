import { describe, it, expect } from 'vitest';
import { buildCandidatePool, buildCandidatePoolNormalized } from './candidate-pool.mjs';

describe('buildCandidatePool', () => {
  it('excludes genus-only entries', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta', rank: null },
      { id: 2, ja: 'アミガサタケ属', scientific: 'Morchella', genus: 'Morchella', species: null, rank: null },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
    expect(pool[0].scientificName).toBe('Morchella esculenta');
  });

  it('groups duplicate scientific names under japaneseNames[]', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ',   scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
      { id: 2, ja: 'トガリアミガサ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
    expect(pool[0].japaneseNames).toEqual(['アミガサタケ', 'トガリアミガサ']);
  });

  it('uses first japaneseName as primary', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ',   scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
      { id: 2, ja: 'トガリアミガサ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool[0].japaneseName).toBe('アミガサタケ');
  });

  it('skips entries with infraspecific rank (var./f./subsp.)', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta', rank: null },
      { id: 2, ja: '変種',         scientific: 'Morchella esculenta var. alba', genus: 'Morchella', species: 'esculenta', rank: 'var.' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
  });

  it('preserves genus and species fields', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool[0].genus).toBe('Morchella');
    expect(pool[0].species).toBe('esculenta');
  });
});

describe('buildCandidatePoolNormalized', () => {
  function makeNormalizer(map) {
    return async (sci) => {
      if (map[sci]) return map[sci];
      return { input: sci, acceptedName: sci, acceptedUsageKey: null, synonyms: [], status: 'UNKNOWN' };
    };
  }

  it('merges old-name and new-name entries into one accepted bucket', async () => {
    const checklist = [
      { id: 1, ja: 'タマゴタケ旧',  scientific: 'Amanita hemibapha',     genus: 'Amanita', species: 'hemibapha' },
      { id: 2, ja: 'タマゴタケ新',  scientific: 'Amanita caesareoides',  genus: 'Amanita', species: 'caesareoides' },
    ];
    const normalizeName = makeNormalizer({
      'Amanita hemibapha': {
        input: 'Amanita hemibapha',
        acceptedName: 'Amanita caesareoides',
        acceptedUsageKey: 7002222,
        synonyms: ['Amanita hemibapha'],
        status: 'SYNONYM',
      },
      'Amanita caesareoides': {
        input: 'Amanita caesareoides',
        acceptedName: 'Amanita caesareoides',
        acceptedUsageKey: 7002222,
        synonyms: ['Amanita hemibapha'],
        status: 'ACCEPTED',
      },
    });

    const pool = await buildCandidatePoolNormalized(checklist, { normalizeName, concurrency: 2 });
    expect(pool).toHaveLength(1);
    expect(pool[0].scientificName).toBe('Amanita caesareoides');
    expect(pool[0].japaneseNames).toEqual(expect.arrayContaining(['タマゴタケ旧', 'タマゴタケ新']));
    expect(pool[0].originalNames).toEqual(expect.arrayContaining(['Amanita hemibapha', 'Amanita caesareoides']));
    expect(pool[0].synonyms).toContain('Amanita hemibapha');
    expect(pool[0].synonyms).not.toContain('Amanita caesareoides');
    expect(pool[0].status).toBe('ACCEPTED');
    expect(pool[0].acceptedUsageKey).toBe(7002222);
  });

  it('leaves UNKNOWN-status entries as-is (identity fallback)', async () => {
    const checklist = [
      { id: 1, ja: '謎種', scientific: 'Genus unknownus', genus: 'Genus', species: 'unknownus' },
    ];
    const normalizeName = makeNormalizer({});
    const pool = await buildCandidatePoolNormalized(checklist, { normalizeName, concurrency: 1 });
    expect(pool).toHaveLength(1);
    expect(pool[0].scientificName).toBe('Genus unknownus');
    expect(pool[0].status).toBe('UNKNOWN');
    expect(pool[0].synonyms).toEqual([]);
  });

  it('throws when normalizeName is missing', async () => {
    await expect(buildCandidatePoolNormalized([], {})).rejects.toThrow();
  });

  it('reports progress via onProgress', async () => {
    const checklist = [
      { id: 1, ja: 'a', scientific: 'A a', genus: 'A', species: 'a' },
      { id: 2, ja: 'b', scientific: 'B b', genus: 'B', species: 'b' },
    ];
    const ticks = [];
    const normalizeName = makeNormalizer({});
    await buildCandidatePoolNormalized(checklist, {
      normalizeName,
      concurrency: 1,
      onProgress: (d, t) => ticks.push([d, t]),
    });
    expect(ticks.at(-1)).toEqual([2, 2]);
  });
});
