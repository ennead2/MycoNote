import { describe, it, expect } from 'vitest';
import { resolveTier0Targets, tier0ToPromptInput } from './generate_articles.mjs';

describe('resolveTier0Targets', () => {
  it('ranking から tier=0 のみ抽出', () => {
    const ranking = {
      species: [
        { scientificName: 'A sp1', japaneseName: 'ア', tier: 0, toxicity: 'edible' },
        { scientificName: 'B sp2', japaneseName: 'イ', tier: 1, toxicity: 'edible' },
        { scientificName: 'C sp3', japaneseName: 'ウ', tier: 0, toxicity: 'deadly' },
      ],
    };
    const out = resolveTier0Targets(ranking);
    expect(out.map(x => x.japaneseName)).toEqual(['ア', 'ウ']);
  });
});

describe('tier0ToPromptInput', () => {
  it('prompt_templates.mjs の入力形式に整形', () => {
    const target = { scientificName: 'Morchella esculenta', japaneseName: 'アミガサタケ', toxicity: 'edible' };
    const out = tier0ToPromptInput(target);
    expect(out.scientificName).toBe('Morchella esculenta');
    expect(out.japaneseName).toBe('アミガサタケ');
    expect(out.safety).toBe('edible');
    expect(out.combinedJsonPath).toBe('.cache/phase13/combined/Morchella_esculenta.json');
    expect(out.outputJsonPath).toBe('.cache/phase13/generated/Morchella_esculenta.json');
  });

  it('v1 の edible_caution を v2 の caution に正規化', () => {
    const target = { scientificName: 'Foo bar', japaneseName: 'フー', toxicity: 'edible_caution' };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('caution');
  });

  it('v1 の deadly_toxic を v2 の deadly に正規化', () => {
    const target = { scientificName: 'Foo bar', japaneseName: 'フー', toxicity: 'deadly_toxic' };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('deadly');
  });

  it('空白を含む学名もスラッグ化', () => {
    const target = { scientificName: 'Amanita cf. muscaria', japaneseName: 'ア', toxicity: 'toxic' };
    const out = tier0ToPromptInput(target);
    expect(out.combinedJsonPath).toBe('.cache/phase13/combined/Amanita_cf_muscaria.json');
  });
});
