import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSimilarSpecies, buildV1Index } from './similar_species_resolve.mjs';

const v1 = JSON.parse(readFileSync('scripts/phase13/fixtures/mushrooms-v1-sample.json', 'utf8'));

describe('buildV1Index', () => {
  it('ja → entry の Map を作る', () => {
    const idx = buildV1Index(v1);
    expect(idx.get('ツキヨタケ').id).toBe('tsukiyotake');
  });

  it('aliases も引けるキーに含める', () => {
    const idx = buildV1Index(v1);
    expect(idx.get('月夜茸').id).toBe('tsukiyotake');
    expect(idx.get('卵茸').id).toBe('tamagotake');
  });
});

describe('resolveSimilarSpecies', () => {
  it('ja が v1 にあれば v1_id と scientific を補完', () => {
    const input = [{ ja: 'ツキヨタケ', note: '夜光る点で区別' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tsukiyotake');
    expect(out[0].scientific).toBe('Omphalotus guepiniiformis');
    expect(out[0].note).toBe('夜光る点で区別');
  });

  it('ja が aliases にマッチしても解決', () => {
    const input = [{ ja: '卵茸', note: '赤い傘' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tamagotake');
    expect(out[0].scientific).toBe('Amanita caesareoides');
  });

  it('ja が v1 に不在の場合 ja と note のみ残る', () => {
    const input = [{ ja: 'ムニャムニャタケ', note: '架空' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].ja).toBe('ムニャムニャタケ');
    expect(out[0].note).toBe('架空');
    expect(out[0].v1_id).toBeUndefined();
    expect(out[0].scientific).toBeUndefined();
  });

  it('空配列を返せる', () => {
    expect(resolveSimilarSpecies([], v1)).toEqual([]);
  });

  it('複数件を独立に解決', () => {
    const input = [
      { ja: 'ツキヨタケ', note: 'A' },
      { ja: 'ムニャムニャタケ', note: 'B' },
      { ja: 'シャグマアミガサタケ', note: 'C' },
    ];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tsukiyotake');
    expect(out[1].v1_id).toBeUndefined();
    expect(out[2].v1_id).toBe('shaguma_amigasatake');
  });
});
