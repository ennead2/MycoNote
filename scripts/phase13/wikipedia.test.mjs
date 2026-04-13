import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseWikipediaResponse } from './wikipedia.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JA_FIXTURE = JSON.parse(readFileSync(
  join(__dirname, 'fixtures/wikipedia-morchella-esculenta-ja.json'),
  'utf-8'
));
const EN_FIXTURE = JSON.parse(readFileSync(
  join(__dirname, 'fixtures/wikipedia-morchella-esculenta-en.json'),
  'utf-8'
));

describe('parseWikipediaResponse', () => {
  it('ja: 記事が見つかった場合、title と extract を返す', () => {
    const parsed = parseWikipediaResponse(JA_FIXTURE);
    expect(parsed).not.toBeNull();
    expect(parsed.title).toBe('アミガサタケ');
    expect(parsed.extract.length).toBeGreaterThan(100);
  });

  it('en: 記事が見つかった場合、title と extract を返す', () => {
    const parsed = parseWikipediaResponse(EN_FIXTURE);
    expect(parsed).not.toBeNull();
    expect(parsed.title).toContain('Morchella esculenta');
    expect(parsed.extract.length).toBeGreaterThan(100);
  });

  it('missing ページのレスポンスでは null を返す', () => {
    const missing = { query: { pages: { '-1': { ns: 0, title: 'NotExist', missing: '' } } } };
    expect(parseWikipediaResponse(missing)).toBeNull();
  });

  it('extract が空の場合も null を返す', () => {
    const empty = { query: { pages: { '12345': { ns: 0, title: 'T', extract: '' } } } };
    expect(parseWikipediaResponse(empty)).toBeNull();
  });
});
