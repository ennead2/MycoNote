import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWikipediaExistsResponse, checkWikipediaJaExists } from './wikipedia-exists.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

describe('parseWikipediaExistsResponse', () => {
  it('returns true when page exists', async () => {
    const json = await readFixture('wikipedia-exists-hit.json');
    expect(parseWikipediaExistsResponse(json)).toBe(true);
  });

  it('returns false when page is missing', async () => {
    const json = await readFixture('wikipedia-exists-miss.json');
    expect(parseWikipediaExistsResponse(json)).toBe(false);
  });

  it('returns false when query is empty', () => {
    expect(parseWikipediaExistsResponse({})).toBe(false);
  });

  it('returns false when pages is empty', () => {
    expect(parseWikipediaExistsResponse({ query: { pages: {} } })).toBe(false);
  });
});

describe('checkWikipediaJaExists (synonyms fallback)', () => {
  let hits, miss, fetchMock;

  beforeEach(async () => {
    hits = await readFixture('wikipedia-exists-hit.json');
    miss = await readFixture('wikipedia-exists-miss.json');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponses(resolver) {
    fetchMock = vi.fn(async (url) => {
      const u = new URL(url);
      const title = u.searchParams.get('titles');
      const isHit = resolver(title);
      return { ok: true, json: async () => (isHit ? hits : miss) };
    });
    vi.stubGlobal('fetch', fetchMock);
  }

  // 永続キャッシュ汚染回避のためテスト名にランダム suffix を付ける
  const uniq = () => `__test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  it('returns matchedVia="japaneseName" when ja article exists for primary wamei', async () => {
    const ja = `wamei_${uniq()}`;
    const sci = `Sci ${uniq()}`;
    const syn = `Syn ${uniq()}`;
    mockResponses(t => t === ja);
    const r = await checkWikipediaJaExists({
      japaneseName: ja,
      scientificName: sci,
      synonyms: [syn],
    });
    expect(r.jaExists).toBe(true);
    expect(r.matchedVia).toBe('japaneseName');
    expect(r.matchedTitle).toBe(ja);
  });

  it('falls through to accepted scientificName when wamei miss', async () => {
    const ja = `wamei_${uniq()}`;
    const sci = `Sci ${uniq()}`;
    mockResponses(t => t === sci);
    const r = await checkWikipediaJaExists({
      japaneseName: ja,
      scientificName: sci,
      synonyms: [],
    });
    expect(r.jaExists).toBe(true);
    expect(r.matchedVia).toBe('accepted');
  });

  it('falls through to synonym when accepted miss', async () => {
    const ja = `wamei_${uniq()}`;
    const sci = `Sci ${uniq()}`;
    const syn = `Syn ${uniq()}`;
    mockResponses(t => t === syn);
    const r = await checkWikipediaJaExists({
      japaneseName: ja,
      scientificName: sci,
      synonyms: [syn],
    });
    expect(r.jaExists).toBe(true);
    expect(r.matchedVia).toBe(`synonym:${syn}`);
  });

  it('returns null matchedVia when nothing hits', async () => {
    const ja = `wamei_${uniq()}`;
    const sci = `Sci ${uniq()}`;
    const syn = `Syn ${uniq()}`;
    mockResponses(() => false);
    const r = await checkWikipediaJaExists({
      japaneseName: ja,
      scientificName: sci,
      synonyms: [syn],
    });
    expect(r.jaExists).toBe(false);
    expect(r.matchedVia).toBe(null);
  });
});
