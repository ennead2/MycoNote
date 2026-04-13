import { describe, it, expect, vi } from 'vitest';
import { enrichCandidate, createLimiter } from './build_ranking.mjs';

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
