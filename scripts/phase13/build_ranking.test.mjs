import { describe, it, expect, vi } from 'vitest';
import { enrichCandidate, createLimiter, resolveTier0 } from './build_ranking.mjs';

describe('enrichCandidate', () => {
  it('aggregates signals from all collectors', async () => {
    const candidate = { scientificName: 'Morchella esculenta', japaneseName: 'アミガサタケ' };
    const deps = {
      resolveMycoBankId: vi.fn().mockResolvedValue({ mycobankId: 247978, source: 'gbif' }),
      checkWikipediaJaExists: vi.fn().mockResolvedValue({ jaExists: true, matchedTitle: 'アミガサタケ' }),
      checkInatPhotos: vi.fn().mockResolvedValue({ totalResults: 8742, hasPhotos: true }),
      fetchGbifObservations: vi.fn().mockResolvedValue({ domestic: 288, overseas: 12670 }),
      classifyToxicity: vi.fn().mockReturnValue({ toxicity: 'edible', source: 'v1' }),
    };
    const result = await enrichCandidate(candidate, deps, {});
    expect(result.scientificName).toBe('Morchella esculenta');
    expect(result.signals.mycobankId).toBe(247978);
    expect(result.signals.wikiJaExists).toBe(true);
    expect(result.signals.inatHasPhotos).toBe(true);
    expect(result.signals.observationsDomestic).toBe(288);
    expect(result.signals.toxicity).toBe('edible');
    expect(result.signals.hasWamei).toBe(true);
  });

  it('is fault tolerant: resolve error becomes null', async () => {
    const candidate = { scientificName: 'X y', japaneseName: 'X' };
    const deps = {
      resolveMycoBankId: vi.fn().mockRejectedValue(new Error('net')),
      checkWikipediaJaExists: vi.fn().mockResolvedValue({ jaExists: false, matchedTitle: null }),
      checkInatPhotos: vi.fn().mockResolvedValue({ totalResults: 0, hasPhotos: false }),
      fetchGbifObservations: vi.fn().mockResolvedValue({ domestic: 0, overseas: 0 }),
      classifyToxicity: vi.fn().mockReturnValue({ toxicity: 'unknown', source: 'none' }),
    };
    const result = await enrichCandidate(candidate, deps, {});
    expect(result.signals.mycobankId).toBeNull();
  });
});

describe('createLimiter', () => {
  it('limits concurrency', async () => {
    const limiter = createLimiter(2);
    let active = 0, maxActive = 0;
    const task = () => new Promise(r => {
      active++;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => { active--; r(); }, 10);
    });
    await Promise.all([1,2,3,4,5].map(() => limiter(task)));
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe('resolveTier0', () => {
  function norm(acceptedMap) {
    return async (sci) => acceptedMap[sci] ?? {
      input: sci, acceptedName: sci, acceptedUsageKey: null, synonyms: [], status: 'UNKNOWN',
    };
  }

  it('matches tier0 to pool via accepted name when checklist has only the synonym', async () => {
    const tier0Doc = { species: [
      { scientificName: 'Amanita caesareoides', japaneseName: 'タマゴタケ', rationale: 'famous' },
    ]};
    const poolAcceptedSet = new Set(['Amanita caesareoides']);
    const normalizeName = norm({
      'Amanita caesareoides': {
        input: 'Amanita caesareoides', acceptedName: 'Amanita caesareoides',
        acceptedUsageKey: 7002222, synonyms: ['Amanita hemibapha'], status: 'ACCEPTED',
      },
    });
    const r = await resolveTier0(tier0Doc, { normalizeName, poolAcceptedSet, concurrency: 1 });
    expect(r.acceptedSet.has('Amanita caesareoides')).toBe(true);
    expect(r.missingFromPool).toHaveLength(0);
  });

  it('force-adds tier0 entries not present in pool', async () => {
    const tier0Doc = { species: [
      { scientificName: 'Entoloma murrayi', japaneseName: 'キイボカサタケ', rationale: 'toxic' },
    ]};
    const poolAcceptedSet = new Set(); // 空プール
    const normalizeName = norm({
      'Entoloma murrayi': {
        input: 'Entoloma murrayi', acceptedName: 'Entoloma murrayi',
        acceptedUsageKey: null, synonyms: [], status: 'UNKNOWN',
      },
    });
    const r = await resolveTier0(tier0Doc, { normalizeName, poolAcceptedSet, concurrency: 1 });
    expect(r.missingFromPool).toHaveLength(1);
    expect(r.missingFromPool[0].scientificName).toBe('Entoloma murrayi');
    expect(r.missingFromPool[0].japaneseName).toBe('キイボカサタケ');
    expect(r.missingFromPool[0].tier0Forced).toBe(true);
  });

  it('dedupes multiple tier0 entries pointing to the same accepted name', async () => {
    const tier0Doc = { species: [
      { scientificName: 'Lactarius hatsudake', japaneseName: 'ハツタケ', rationale: 'edible' },
      { scientificName: 'Lactarius hatsudake', japaneseName: 'アカハツ',  rationale: 'edible' },
    ]};
    const poolAcceptedSet = new Set(['Lactarius lividatus']);
    const normalizeName = norm({
      'Lactarius hatsudake': {
        input: 'Lactarius hatsudake', acceptedName: 'Lactarius lividatus',
        acceptedUsageKey: 9999, synonyms: ['Lactarius hatsudake'], status: 'SYNONYM',
      },
    });
    const r = await resolveTier0(tier0Doc, { normalizeName, poolAcceptedSet, concurrency: 1 });
    expect(r.acceptedSet.size).toBe(1);
    expect(r.acceptedSet.has('Lactarius lividatus')).toBe(true);
    expect(r.missingFromPool).toHaveLength(0);
    const detail = r.details.get('Lactarius lividatus');
    expect(detail.japaneseNames).toEqual(['ハツタケ', 'アカハツ']);
  });
});
