import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildArticlePrompt, SCHEMA_BLOCK, RULES_BLOCK, SOURCE_PRIORITY_BLOCK } from './prompt_templates.mjs';

const fixture = JSON.parse(readFileSync('scripts/phase13/fixtures/prompt-input-morchella.json', 'utf8'));

describe('buildArticlePrompt', () => {
  it('必要セクションが含まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('# 対象種');
    expect(prompt).toContain('# 一次ソース');
    expect(prompt).toContain('# 絶対遵守ルール');
    expect(prompt).toContain('# 出力 JSON スキーマ');
    expect(prompt).toContain('# season 仕様');
    expect(prompt).toContain('# 完了後');
  });

  it('japaneseName / scientificName / safety が埋め込まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('アミガサタケ');
    expect(prompt).toContain('Morchella esculenta');
    expect(prompt).toContain('edible');
  });

  it('combinedJsonPath と outputJsonPath が埋め込まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('.cache/phase13/combined/Morchella_esculenta.json');
    expect(prompt).toContain('.cache/phase13/generated/Morchella_esculenta.json');
  });

  it('safety=edible では hints ブロックで poisoning_first_aid が null を返すよう指示される', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('- poisoning_first_aid: null を返す');
    expect(prompt).toContain('- cooking_preservation: 必須（400字以内）');
  });

  it('safety=deadly では hints ブロックで cooking_preservation が null を返すよう指示される', () => {
    const prompt = buildArticlePrompt({ ...fixture, safety: 'deadly' });
    expect(prompt).toContain('- cooking_preservation: null を返す');
    expect(prompt).toContain('- poisoning_first_aid: 必須（400字以内）');
  });

  it('SCHEMA_BLOCK に必須フィールドが全て含まれる', () => {
    const required = [
      'names', 'aliases', 'season', 'habitat', 'regions',
      'tree_association', 'similar_species',
      'description', 'features', 'cooking_preservation',
      'poisoning_first_aid', 'caution', 'sources', 'notes',
    ];
    for (const f of required) {
      expect(SCHEMA_BLOCK).toContain(f);
    }
  });

  it('RULES_BLOCK に 8 条のルールが含まれる', () => {
    for (let i = 1; i <= 8; i++) {
      expect(RULES_BLOCK).toMatch(new RegExp(`^${i}\\.`, 'm'));
    }
  });
});

describe('SOURCE_PRIORITY_BLOCK', () => {
  it('ja 優先、en 補助、mhlw 優先の順を含む', () => {
    expect(SOURCE_PRIORITY_BLOCK).toContain('wikipediaJa');
    expect(SOURCE_PRIORITY_BLOCK).toContain('wikipediaEn');
    expect(SOURCE_PRIORITY_BLOCK).toContain('mhlw');
    expect(SOURCE_PRIORITY_BLOCK).toMatch(/ja.*優先|優先.*ja/u);
  });
});

describe('buildArticlePrompt contains SOURCE_PRIORITY_BLOCK', () => {
  it('SOURCE_PRIORITY_BLOCK を含む', () => {
    const p = buildArticlePrompt({
      japaneseName: 'テスト', scientificName: 'Testus testus', safety: 'edible',
      combinedJsonPath: 'x.json', outputJsonPath: 'y.json',
    });
    expect(p).toContain(SOURCE_PRIORITY_BLOCK);
  });
});

describe('buildArticlePrompt with extractHint', () => {
  it('extractHint を渡すと prompt に含まれる', () => {
    const p = buildArticlePrompt({
      japaneseName: 'アカハツ',
      scientificName: 'Lactarius akahatsu',
      safety: 'edible',
      combinedJsonPath: 'x.json',
      outputJsonPath: 'y.json',
      extractHint: '記事内の『類似種』セクションのアカハツ部分のみ使用',
    });
    expect(p).toContain('類似種');
    expect(p).toContain('アカハツ部分のみ使用');
  });

  it('extractHint が undefined ならヒントブロックは出ない', () => {
    const p = buildArticlePrompt({
      japaneseName: 'テスト', scientificName: 'Testus testus', safety: 'edible',
      combinedJsonPath: 'x.json', outputJsonPath: 'y.json',
    });
    expect(p).not.toMatch(/部分抽出ヒント|extract_hint/);
  });
});
