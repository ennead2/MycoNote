import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeName, extractSpeciesSynonyms } from './gbif-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const loadFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

function makeCache() {
  const store = new Map();
  return {
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) { store.set(k, v); },
    async has(k) { return store.has(k); },
    async invalidate(k) { store.delete(k); },
    _store: store,
  };
}

describe('extractSpeciesSynonyms', () => {
  it('extracts canonicalName for SPECIES and VARIETY ranks', () => {
    const data = {
      results: [
        { canonicalName: 'A b', rank: 'SPECIES' },
        { canonicalName: 'A b var. c', rank: 'VARIETY' },
        { canonicalName: 'A b subsp. d', rank: 'SUBSPECIES' },
        { canonicalName: 'A', rank: 'GENUS' },
      ],
    };
    expect(extractSpeciesSynonyms(data)).toEqual([
      'A b',
      'A b var. c',
      'A b subsp. d',
    ]);
  });

  it('dedupes identical canonicalName', () => {
    const data = {
      results: [
        { canonicalName: 'X y', rank: 'SPECIES' },
        { canonicalName: 'X y', rank: 'SPECIES' },
      ],
    };
    expect(extractSpeciesSynonyms(data)).toEqual(['X y']);
  });

  it('returns [] for null/empty', () => {
    expect(extractSpeciesSynonyms(null)).toEqual([]);
    expect(extractSpeciesSynonyms({ results: [] })).toEqual([]);
  });
});

describe('normalizeName (ACCEPTED case)', () => {
  it('returns status=ACCEPTED with synonyms[] for a canonical match', async () => {
    const fx = await loadFixture('gbif-normalize-accepted.json');
    const fetchFn = vi.fn()
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.match }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.synonyms }));

    const result = await normalizeName('Morchella esculenta', {
      fetchFn,
      matchCache: makeCache(),
      synonymsCache: makeCache(),
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.acceptedName).toBe('Morchella esculenta');
    expect(result.acceptedUsageKey).toBe(5239509);
    expect(result.synonyms).toContain('Morellus esculentus');
    expect(result.synonyms).not.toContain('Morchella esculenta');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeName (SYNONYM case)', () => {
  it('follows acceptedUsageKey and puts input into synonyms', async () => {
    const fx = await loadFixture('gbif-normalize-synonym.json');
    const fetchFn = vi.fn()
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.match }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.accepted }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.synonyms }));

    const result = await normalizeName('Amanita hemibapha', {
      fetchFn,
      matchCache: makeCache(),
      synonymsCache: makeCache(),
    });

    expect(result.status).toBe('SYNONYM');
    expect(result.acceptedName).toBe('Amanita caesareoides');
    expect(result.acceptedUsageKey).toBe(7002222);
    expect(result.synonyms).toContain('Amanita hemibapha');
    expect(result.synonyms).not.toContain('Amanita caesareoides');
  });
});

describe('normalizeName (UNKNOWN case)', () => {
  it('falls back to input name when match has no usageKey', async () => {
    const fx = await loadFixture('gbif-normalize-unknown.json');
    const fetchFn = vi.fn()
      .mockImplementationOnce(async () => ({ ok: true, json: async () => fx.match }));

    const result = await normalizeName('Nonexistent species', {
      fetchFn,
      matchCache: makeCache(),
      synonymsCache: makeCache(),
    });

    expect(result.status).toBe('UNKNOWN');
    expect(result.acceptedName).toBe('Nonexistent species');
    expect(result.acceptedUsageKey).toBe(null);
    expect(result.synonyms).toEqual([]);
  });

  it('falls back to UNKNOWN when fetch throws', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network'));
    const result = await normalizeName('X y', {
      fetchFn,
      matchCache: makeCache(),
      synonymsCache: makeCache(),
    });
    expect(result.status).toBe('UNKNOWN');
    expect(result.acceptedName).toBe('X y');
  });
});

describe('normalizeName caching', () => {
  it('skips fetch when matchCache hits for an ACCEPTED record', async () => {
    const fx = await loadFixture('gbif-normalize-accepted.json');
    const matchCache = makeCache();
    const synonymsCache = makeCache();
    await matchCache.set('Morchella esculenta', fx.match);
    await synonymsCache.set(String(fx.match.usageKey), fx.synonyms);

    const fetchFn = vi.fn();
    const result = await normalizeName('Morchella esculenta', {
      fetchFn, matchCache, synonymsCache,
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.acceptedName).toBe('Morchella esculenta');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
