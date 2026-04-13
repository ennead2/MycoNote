import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWikipediaExistsResponse } from './wikipedia-exists.mjs';

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
