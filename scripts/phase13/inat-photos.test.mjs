import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInatObservationsResponse, checkInatPhotos } from './inat-photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

describe('parseInatObservationsResponse', () => {
  it('returns totalResults and hasPhotos true when observations exist', async () => {
    const json = await readFixture('inat-photos-morchella.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(8742);
    expect(result.hasPhotos).toBe(true);
  });

  it('returns hasPhotos false when empty', async () => {
    const json = await readFixture('inat-photos-empty.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns hasPhotos false when result has no photos', () => {
    const json = { total_results: 5, results: [{ id: 1, photos: [] }] };
    const result = parseInatObservationsResponse(json);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns zero when json is malformed', () => {
    const result = parseInatObservationsResponse({});
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });
});

describe('checkInatPhotos (synonyms fallback)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const uniq = () => `TestGenus_${Date.now()}_${Math.random().toString(36).slice(2, 6)} test`;

  function mockByTaxon(map) {
    const fetchMock = vi.fn(async (url) => {
      const u = new URL(url);
      const name = u.searchParams.get('taxon_name');
      const json = map[name] ?? { total_results: 0, results: [] };
      return { ok: true, json: async () => json };
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('returns matchedName=accepted when accepted has photos', async () => {
    const acc = uniq();
    const syn = uniq();
    mockByTaxon({ [acc]: { total_results: 100, results: [{ id: 1, photos: [{ id: 9 }] }] } });
    const r = await checkInatPhotos(acc, { synonyms: [syn] });
    expect(r.hasPhotos).toBe(true);
    expect(r.matchedName).toBe(acc);
  });

  it('falls through to synonym when accepted is empty', async () => {
    const acc = uniq();
    const syn = uniq();
    mockByTaxon({ [syn]: { total_results: 50, results: [{ id: 2, photos: [{ id: 8 }] }] } });
    const r = await checkInatPhotos(acc, { synonyms: [syn] });
    expect(r.hasPhotos).toBe(true);
    expect(r.matchedName).toBe(syn);
  });

  it('returns best (highest totalResults) when none has photos', async () => {
    const acc = uniq();
    const syn = uniq();
    mockByTaxon({
      [acc]: { total_results: 3, results: [{ id: 1, photos: [] }] },
      [syn]: { total_results: 10, results: [{ id: 2, photos: [] }] },
    });
    const r = await checkInatPhotos(acc, { synonyms: [syn] });
    expect(r.hasPhotos).toBe(false);
    expect(r.totalResults).toBe(10);
    expect(r.matchedName).toBe(syn);
  });
});
