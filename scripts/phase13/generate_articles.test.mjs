import { describe, it, expect } from 'vitest';
import { resolveTier0Targets, tier0ToPromptInput, buildManifestEntry, resolveTargetsFromSpecs } from './generate_articles.mjs';

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

  it('toxicity が signals.toxicity にネストされている ranking エントリを解決', () => {
    const target = {
      scientificName: 'Pseudosperma rimosum',
      japaneseName: 'アセタケ',
      signals: { toxicity: 'toxic' },
    };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('toxic');
  });

  it('signals.toxicity が top-level toxicity より優先される', () => {
    const target = {
      scientificName: 'Foo bar',
      japaneseName: 'フー',
      toxicity: 'edible',
      signals: { toxicity: 'deadly_toxic' },
    };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('deadly');
  });
});

describe('buildManifestEntry', () => {
  it('Task 7 契約となる manifest キー集合を固定する', () => {
    const target = { scientificName: 'Morchella esculenta', japaneseName: 'アミガサタケ', toxicity: 'edible' };
    const entry = buildManifestEntry(target, {
      promptPath: '.cache/phase13/prompts/Morchella_esculenta.txt',
      hasCombined: true,
    });
    expect(Object.keys(entry).sort()).toEqual([
      'hasCombined',
      'jaWikiSourceOverride',
      'japaneseName',
      'outputPath',
      'promptPath',
      'safety',
      'scientificName',
      'slug',
    ]);
  });

  it('値が target と options から導出される', () => {
    const entry = buildManifestEntry(
      { scientificName: 'Amanita phalloides', japaneseName: 'ドクツルタケ', toxicity: 'deadly_toxic' },
      { promptPath: 'p/x.txt', hasCombined: false },
    );
    expect(entry.slug).toBe('Amanita_phalloides');
    expect(entry.japaneseName).toBe('ドクツルタケ');
    expect(entry.scientificName).toBe('Amanita phalloides');
    expect(entry.safety).toBe('deadly');
    expect(entry.hasCombined).toBe(false);
    expect(entry.promptPath).toBe('p/x.txt');
    expect(entry.outputPath).toBe('.cache/phase13/generated/Amanita_phalloides.json');
  });
});

describe('resolveTargetsFromSpecs', () => {
  it('merges tier0 + tier1 with deduplication', () => {
    const ranking = {
      species: [
        { scientificName: 'Amanita muscaria', japaneseName: 'ベニテングタケ', tier: 0, signals: { toxicity: 'toxic' } },
        { scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ', tier: 1, signals: { toxicity: 'edible' } },
        { scientificName: 'Random sp', japaneseName: 'ランダム', tier: 2, signals: { toxicity: 'inedible' } },
      ],
    };
    const tier0Spec = { species: [{ scientificName: 'Amanita muscaria', japaneseName: 'ベニテングタケ' }] };
    const tier1Spec = { species: [{ scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ' }] };

    const targets = resolveTargetsFromSpecs(ranking, [tier0Spec, tier1Spec]);
    expect(targets.length).toBe(2);
    expect(targets.map((t) => t.scientificName).sort()).toEqual(['Amanita muscaria', 'Lactifluus volemus']);
  });

  it('uses ranking signals for toxicity when species in ranking', () => {
    const ranking = { species: [{ scientificName: 'A b', japaneseName: 'AB', tier: 1, signals: { toxicity: 'toxic' }, synonyms: ['X y'] }] };
    const spec = { species: [{ scientificName: 'A b', japaneseName: 'AB' }] };
    const targets = resolveTargetsFromSpecs(ranking, [spec]);
    expect(targets[0].signals.toxicity).toBe('toxic');
    expect(targets[0].synonyms).toEqual(['X y']);
  });

  it('applies spec-level ja_wiki_source_override', () => {
    const ranking = { species: [{ scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', tier: 1, signals: { toxicity: 'toxic' } }] };
    const spec = { species: [{ scientificName: 'Boletus sensibilis', japaneseName: 'ミヤマイロガワリ', ja_wiki_source_override: { title: 'ミヤマイロガワリ', reason: 'x' } }] };
    const targets = resolveTargetsFromSpecs(ranking, [spec]);
    expect(targets[0].japaneseName).toBe('ミヤマイロガワリ');
    expect(targets[0].ja_wiki_source_override.title).toBe('ミヤマイロガワリ');
  });

  it('accepts spec species NOT in ranking when spec provides safety', () => {
    const ranking = { species: [] };
    const spec = { species: [{ scientificName: 'Sarcomyxa edulis', japaneseName: 'ムキタケ', safety: 'edible', synonyms: ['Panellus edulis'] }] };
    const targets = resolveTargetsFromSpecs(ranking, [spec]);
    expect(targets.length).toBe(1);
    expect(targets[0].scientificName).toBe('Sarcomyxa edulis');
    expect(targets[0].signals.toxicity).toBe('edible');
    expect(targets[0].synonyms).toEqual(['Panellus edulis']);
  });

  it('throws when spec species missing from ranking and has no safety', () => {
    const ranking = { species: [] };
    const spec = { species: [{ scientificName: 'Unknown x', japaneseName: '不明' }] };
    expect(() => resolveTargetsFromSpecs(ranking, [spec])).toThrow(/missing from ranking/);
  });

  it('spec scientific が ranking synonyms にヒットすれば accepted name から signals 引用', () => {
    const ranking = {
      species: [
        {
          scientificName: 'Tylopilus nigropurpureus',
          japaneseName: 'クロニガイグチ',
          tier: 1,
          signals: { toxicity: 'toxic' },
          synonyms: ['Anthracoporus nigropurpureus'],
        },
      ],
    };
    const spec = { species: [{ scientificName: 'Anthracoporus nigropurpureus', japaneseName: 'クロニガイグチ' }] };
    const targets = resolveTargetsFromSpecs(ranking, [spec]);
    expect(targets.length).toBe(1);
    expect(targets[0].scientificName).toBe('Anthracoporus nigropurpureus'); // spec 側を保持
    expect(targets[0].signals.toxicity).toBe('toxic'); // ranking accepted から引用
  });

  it('spec scientific が ranking originalNames にもヒットする', () => {
    const ranking = {
      species: [
        {
          scientificName: 'Lactifluus volemus',
          japaneseName: 'チチタケ',
          tier: 1,
          signals: { toxicity: 'edible' },
          synonyms: [],
          originalNames: ['Lactarius volemus'],
        },
      ],
    };
    const spec = { species: [{ scientificName: 'Lactarius volemus', japaneseName: 'チチタケ' }] };
    const targets = resolveTargetsFromSpecs(ranking, [spec]);
    expect(targets.length).toBe(1);
    expect(targets[0].scientificName).toBe('Lactarius volemus');
    expect(targets[0].signals.toxicity).toBe('edible');
  });
});
