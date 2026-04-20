import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPageUrl, parseDaikinrinPage, extractTraitSection } from './daikinrin.mjs';
import { load } from 'cheerio';

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

  it('生息環境（habitat）が統制タグ dict で取れる', () => {
    expect(parsed.habitat).toBeTypeOf('object');
    // Morchella esculenta は位置・基質・場所が確定
    expect(parsed.habitat['位置']).toEqual(expect.arrayContaining(['群生', '単生']));
    expect(parsed.habitat['場所']).toEqual(expect.arrayContaining(['森林']));
    expect(Array.isArray(parsed.habitat['基質'])).toBe(true);
    expect(parsed.habitat['基質'].length).toBeGreaterThan(0);
  });

  it('フェノロジー（season）から季節タグと月範囲が取れる', () => {
    expect(parsed.season.tags).toContain('春');
    // 春 → 3〜5 月
    expect(parsed.season.months).toEqual(
      expect.arrayContaining([{ start_month: 3, end_month: 5 }]),
    );
  });

  it('formの形態記載 (featuresRaw) に主要セクションが含まれる', () => {
    expect(parsed.featuresRaw['子実体']).toBeDefined();
    expect(parsed.featuresRaw['傘']).toBeDefined();
    expect(parsed.featuresRaw['柄']).toBeDefined();
    expect(parsed.featuresRaw['胞子紋']).toBeDefined();
    // 色の値は複数あるはず
    expect(parsed.featuresRaw['子実体']['色'].length).toBeGreaterThan(0);
  });

  it('比較対象としてのみ掲載の suggestion は配列（0 件もありうる）', () => {
    expect(Array.isArray(parsed.similarSuggestion)).toBe(true);
    for (const s of parsed.similarSuggestion) {
      expect(s.href).toMatch(/\/daikinrin\/Pages\//);
      expect(s.href).not.toMatch(/_genus\.html$/);
      expect(typeof s.displayName).toBe('string');
    }
  });
});

describe('extractTraitSection', () => {
  it('存在しないタイトルは空 dict を返す', () => {
    const $ = load('<html><body><h3>別のセクション</h3></body></html>');
    expect(extractTraitSection($, '生息環境')).toEqual({});
  });

  it('attribute-group を name → values[] の dict に変換する', () => {
    const html = `
      <h3>テスト</h3>
      <div class="trait-attributes">
        <div class="attribute-group">
          <div class="attribute-name">位置</div>
          <div class="value-list">
            <div class="value-item"><span class="value-text">群生</span></div>
            <div class="value-item"><span class="value-text">単生</span></div>
          </div>
        </div>
      </div>
      <h3>次のセクション</h3>
    `;
    const $ = load(html);
    expect(extractTraitSection($, 'テスト')).toEqual({ 位置: ['群生', '単生'] });
  });

  it('同じ attribute-name が複数 group で出現した場合は merge + 重複除去', () => {
    const html = `
      <h3>テスト</h3>
      <div class="trait-attributes">
        <div class="attribute-group">
          <div class="attribute-name">色</div>
          <div class="value-list">
            <div class="value-item"><span class="value-text">白</span></div>
            <div class="value-item"><span class="value-text">灰</span></div>
          </div>
        </div>
        <div class="attribute-group">
          <div class="attribute-name">色</div>
          <div class="value-list">
            <div class="value-item"><span class="value-text">灰</span></div>
            <div class="value-item"><span class="value-text">褐</span></div>
          </div>
        </div>
      </div>
      <h3>次</h3>
    `;
    const $ = load(html);
    const result = extractTraitSection($, 'テスト');
    expect(result['色'].sort()).toEqual(['灰', '白', '褐'].sort());
  });
});
