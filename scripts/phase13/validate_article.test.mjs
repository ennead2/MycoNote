import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateArticle, LIMITS } from './validate_article.mjs';

function load(name) {
  return JSON.parse(readFileSync(`scripts/phase13/fixtures/${name}.json`, 'utf8'));
}

describe('validateArticle', () => {
  it('valid-edible は errors なし', () => {
    const result = validateArticle(load('article-valid-edible'), { safety: 'edible' });
    expect(result.errors).toEqual([]);
  });

  it('valid-edible は warnings も空', () => {
    const result = validateArticle(load('article-valid-edible'), { safety: 'edible' });
    expect(result.warnings).toEqual([]);
  });

  it('valid-deadly は errors なし', () => {
    const result = validateArticle(load('article-valid-deadly'), { safety: 'deadly' });
    expect(result.errors).toEqual([]);
  });

  it('V1: 必須フィールド欠損を検出', () => {
    const a = load('article-valid-edible');
    delete a.description;
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors).toContain('V1: description が存在しない');
  });

  it('V1: names.aliases が配列でない を検出', () => {
    const a = load('article-valid-edible');
    a.names = { aliases: '編笠茸' };
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors).toContain('V1: names.aliases が配列でない');
  });

  it('V2: description の文字数超過を検出', () => {
    const result = validateArticle(load('article-invalid-over-length'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V2: description'))).toBe(true);
  });

  it('V3: 箇条書きマーカーを検出', () => {
    const result = validateArticle(load('article-invalid-bullet'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V3:'))).toBe(true);
  });

  it('V4: 自由文の学名パターンは warning に止まる', () => {
    const a = load('article-valid-edible');
    a.description = 'Morchella esculenta は春のきのこ [1]。';
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V4:'))).toBe(false);
    expect(result.warnings.some(w => w.startsWith('V4:'))).toBe(true);
  });

  it('V5: season の不正値を検出', () => {
    const a = load('article-valid-edible');
    a.season = [{ start_month: 5, end_month: 3 }];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V5:'))).toBe(true);
  });

  it('V5: season 空配列を検出', () => {
    const result = validateArticle(load('article-invalid-missing-season'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V5:'))).toBe(true);
  });

  it('V6: edible で cooking_preservation が null だと error', () => {
    const a = load('article-valid-edible');
    a.cooking_preservation = null;
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V6:'))).toBe(true);
  });

  it('V6: deadly で poisoning_first_aid が null だと error', () => {
    const a = load('article-valid-deadly');
    a.poisoning_first_aid = null;
    const result = validateArticle(a, { safety: 'deadly' });
    expect(result.errors.some(e => e.startsWith('V6:'))).toBe(true);
  });

  it('V7: sources 空配列を検出', () => {
    const a = load('article-valid-edible');
    a.sources = [];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V7:'))).toBe(true);
  });

  it('V8: 出典番号が一度もない自由文は warning', () => {
    const a = load('article-valid-edible');
    a.description = '出典なしの文章です。';
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.some(w => w.startsWith('V8:'))).toBe(true);
  });
});

describe('V9: カタカナ純度チェック', () => {
  it('aliases にラテン文字が混入していると error', () => {
    const result = validateArticle(load('article-invalid-romaji-alias'), { safety: 'toxic' });
    expect(result.errors.some(e => e.startsWith('V9:'))).toBe(true);
  });

  it('aliases が純粋な日本語（漢字・ひらがな・カタカナ・中点・長音符）なら error なし', () => {
    const a = load('article-valid-edible');
    a.names.aliases = ['編笠茸', 'アミガサ・タケ', 'あみがさたけ'];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.filter(e => e.startsWith('V9:'))).toEqual([]);
  });

  it('aliases に空文字が混入していても V9 は発火しない（他 rule で扱う）', () => {
    const a = load('article-valid-edible');
    a.names.aliases = ['編笠茸', ''];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.filter(e => e.startsWith('V9:'))).toEqual([]);
  });

  it('aliases に全角数字・全角ラテンが混入していると error', () => {
    const a = load('article-valid-edible');
    a.names.aliases = ['ホンシメジ１号', 'ベニテングタケＡ'];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.filter(e => e.startsWith('V9:')).length).toBe(2);
  });
});

describe('LIMITS', () => {
  it('各自由文の上限が定義されている', () => {
    expect(LIMITS.description).toBe(400);
    expect(LIMITS.features).toBe(400);
    expect(LIMITS.cooking_preservation).toBe(400);
    expect(LIMITS.poisoning_first_aid).toBe(400);
    expect(LIMITS.caution).toBe(100);
  });
});
