import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPageUrl, parseDaikinrinPage } from './daikinrin.mjs';

describe('buildPageUrl', () => {
  it('学名と MycoBank ID から大菌輪の Pages URL を構築する', () => {
    const url = buildPageUrl('Morchella esculenta', 247978);
    expect(url).toBe('https://mycoscouter.coolblog.jp/daikinrin/Pages/Morchella_esculenta_247978.html');
  });

  it('属のみ学名（種なし）は例外を投げる', () => {
    expect(() => buildPageUrl('Morchella', 12345)).toThrow(/binomial/);
  });

  it('空白複数・ハイフンを含む学名も正しく処理する', () => {
    const url = buildPageUrl('Amanita muscaria subsp. flavivolvata', 222222);
    expect(url).toContain('Amanita_muscaria_subsp._flavivolvata_222222.html');
  });
});

const FIXTURE = readFileSync(
  join(process.cwd(), 'scripts/phase13/fixtures/daikinrin-morchella-esculenta.html'),
  'utf-8'
);

describe('parseDaikinrinPage', () => {
  const parsed = parseDaikinrinPage(FIXTURE);

  it('学名を抽出する', () => {
    expect(parsed.scientificName).toBe('Morchella esculenta');
  });

  it('和名を抽出する', () => {
    expect(parsed.japaneseName).toBe('アミガサタケ');
  });

  it('MycoBank ID を抽出する', () => {
    expect(parsed.mycoBankId).toBe(247978);
  });

  it('分類階層に必須キーが揃っている', () => {
    expect(parsed.taxonomy).toMatchObject({
      phylum: expect.stringContaining('Ascomycota'),
      class: expect.stringContaining('Pezizomycetes'),
      order: expect.stringContaining('Pezizales'),
      family: expect.stringContaining('Morchellaceae'),
      genus: 'Morchella',
    });
  });

  it('シノニムが1件以上取れる', () => {
    expect(Array.isArray(parsed.synonyms)).toBe(true);
    expect(parsed.synonyms.length).toBeGreaterThan(0);
  });

  it('GBIF 観察数（国内・海外）が数値で取れる', () => {
    expect(typeof parsed.observations.domestic).toBe('number');
    expect(typeof parsed.observations.overseas).toBe('number');
    expect(parsed.observations.overseas).toBeGreaterThan(parsed.observations.domestic);
  });

  it('外部リンクが配列で取れ、url が http(s) で始まる', () => {
    expect(parsed.externalLinks.length).toBeGreaterThan(0);
    for (const link of parsed.externalLinks) {
      expect(link.url).toMatch(/^https?:\/\//);
      expect(typeof link.name).toBe('string');
    }
  });
});
