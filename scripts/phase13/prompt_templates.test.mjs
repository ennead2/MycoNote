import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildArticlePrompt, SCHEMA_BLOCK, RULES_BLOCK } from './prompt_templates.mjs';

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

  it('safety=edible では poisoning_first_aid の指示が null 化されている', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toMatch(/poisoning_first_aid.*null/);
  });

  it('safety=deadly では cooking_preservation の指示が null 化されている', () => {
    const prompt = buildArticlePrompt({ ...fixture, safety: 'deadly' });
    expect(prompt).toMatch(/cooking_preservation.*null/);
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
