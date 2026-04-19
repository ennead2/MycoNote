import { describe, it, expect } from 'vitest';
import { validatePhase17Article } from './validate_article_v17.mjs';

const validArticle = {
  description: 'テスト概要。',
  features: '形態の説明。',
  cooking_preservation: null,
  poisoning_first_aid: '症状と応急措置。',
  caution: '要注意。',
  similar_species: [{ ja: 'テスト種', note: '識別点' }],
  regions: ['日本', 'ヨーロッパ'],
  tree_association: [],
  aliases: [],
  sources: [{ name: 'Wikipedia ja', url: 'https://ja.wikipedia.org/wiki/foo', license: 'CC BY-SA' }],
  notes: 'ログ',
};

describe('validatePhase17Article', () => {
  it('valid article passes', () => {
    const r = validatePhase17Article(validArticle, {
      tier: 0,
      safety: 'toxic',
      japaneseName: 'テング',
      scientificName: 'Amanita test',
      synonyms: [],
      similarSuggestionJas: ['テスト種'],
    });
    expect(r.errors).toEqual([]);
  });

  it('tier 0 description > 400 字 → error', () => {
    const long = 'あ'.repeat(401);
    const r = validatePhase17Article(
      { ...validArticle, description: long },
      { tier: 0, safety: 'toxic', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors.some((e) => e.includes('description > 400'))).toBe(true);
  });

  it('tier 2 description > 160 字 → error', () => {
    const long = 'あ'.repeat(161);
    const r = validatePhase17Article(
      { ...validArticle, description: long, cooking_preservation: null },
      { tier: 2, safety: 'toxic', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors.some((e) => e.includes('description > 160'))).toBe(true);
  });

  it('safety=edible + cooking_preservation != null は OK', () => {
    const r = validatePhase17Article(
      { ...validArticle, cooking_preservation: '美味', caution: null, poisoning_first_aid: null },
      { tier: 0, safety: 'edible', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors).toEqual([]);
  });

  it('safety=edible + poisoning_first_aid != null → error', () => {
    const r = validatePhase17Article(
      { ...validArticle, poisoning_first_aid: '毒症状', caution: null },
      { tier: 0, safety: 'edible', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors.some((e) => e.includes('poisoning_first_aid must be null'))).toBe(true);
  });

  it('mhlw 該当 + safety=edible は CRITICAL error', () => {
    const r = validatePhase17Article(validArticle, {
      tier: 0,
      safety: 'edible',
      japaneseName: 'カエンタケ',
      scientificName: 'Trichoderma cornu-damae',
    });
    expect(r.errors.some((e) => e.includes('CRITICAL'))).toBe(true);
  });

  it('自由文に学名が含まれるとエラー', () => {
    const r = validatePhase17Article(
      { ...validArticle, description: 'Amanita test は毒。', caution: null, poisoning_first_aid: null },
      { tier: 0, safety: 'edible', japaneseName: 'x', scientificName: 'Amanita test' },
    );
    expect(r.errors.some((e) => e.includes('scientific name'))).toBe(true);
  });

  it('similar_species.note > 50 字 → error', () => {
    const note = 'あ'.repeat(51);
    const r = validatePhase17Article(
      { ...validArticle, similar_species: [{ ja: 'テスト種', note }] },
      { tier: 0, safety: 'toxic', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors.some((e) => e.includes('> 50 chars'))).toBe(true);
  });

  it('allowlist 外の similar_species は warning', () => {
    const r = validatePhase17Article(
      { ...validArticle, similar_species: [{ ja: 'NotInList', note: 'x' }] },
      {
        tier: 0,
        safety: 'toxic',
        japaneseName: 'x',
        scientificName: 'X y',
        similarSuggestionJas: ['A', 'B'],
      },
    );
    expect(r.warnings.some((w) => w.includes('allowlist'))).toBe(true);
  });

  it('sources 空 → error', () => {
    const r = validatePhase17Article(
      { ...validArticle, sources: [] },
      { tier: 0, safety: 'toxic', japaneseName: 'x', scientificName: 'X y' },
    );
    expect(r.errors.some((e) => e.includes('sources missing'))).toBe(true);
  });
});
