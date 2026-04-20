import { describe, it, expect } from 'vitest';
import { matchMhlw, resolveSafety, validateSafetyAgainstMhlw } from './resolve_safety.mjs';

describe('matchMhlw', () => {
  it('和名一致で致死種を検出', () => {
    const r = matchMhlw({ japaneseName: 'カエンタケ', scientificName: 'foo' });
    expect(r?.matched.japaneseName).toBe('カエンタケ');
    expect(r?.severity).toBe('deadly');
  });

  it('和名一致で重篤種 (非致死) を検出', () => {
    const r = matchMhlw({ japaneseName: 'ツキヨタケ', scientificName: 'foo' });
    expect(r?.severity).toBe('toxic');
  });

  it('学名一致でも検出', () => {
    const r = matchMhlw({ japaneseName: 'foo', scientificName: 'Amanita virosa' });
    expect(r?.matched.japaneseName).toBe('ドクツルタケ');
    expect(r?.severity).toBe('deadly');
  });

  it('synonyms 経由でも検出', () => {
    const r = matchMhlw({
      japaneseName: 'foo',
      scientificName: 'unrelated',
      synonyms: ['Amanita virosa', 'Other name'],
    });
    expect(r?.matched.japaneseName).toBe('ドクツルタケ');
  });

  it('非該当は null', () => {
    expect(matchMhlw({ japaneseName: 'シイタケ', scientificName: 'Lentinula edodes' })).toBeNull();
  });
});

describe('resolveSafety', () => {
  it('mhlw 致死種 → deadly', () => {
    const r = resolveSafety({ japaneseName: 'カエンタケ', scientificName: 'Trichoderma cornu-damae' });
    expect(r.safety).toBe('deadly');
    expect(r.confidence).toBe('mhlw');
    expect(r.evidence[0].source).toBe('mhlw');
  });

  it('mhlw 重篤種 → toxic', () => {
    const r = resolveSafety({ japaneseName: 'ツキヨタケ', scientificName: 'Omphalotus guepiniformis' });
    expect(r.safety).toBe('toxic');
  });

  it('mhlw 該当なし + Wikipedia 情報なし → unknown', () => {
    const r = resolveSafety({ japaneseName: 'シイタケ', scientificName: 'Lentinula edodes' });
    expect(r.safety).toBe('unknown');
    expect(r.confidence).toBe('no_data');
  });
});

describe('validateSafetyAgainstMhlw', () => {
  it('mhlw 該当 + safety=edible は致命、throw', () => {
    expect(() =>
      validateSafetyAgainstMhlw('edible', {
        japaneseName: 'ドクツルタケ',
        scientificName: 'Amanita virosa',
      }),
    ).toThrow(/lethal misidentification/);
  });

  it('mhlw 該当 + safety=toxic は許容', () => {
    expect(() =>
      validateSafetyAgainstMhlw('toxic', {
        japaneseName: 'ツキヨタケ',
        scientificName: 'Omphalotus guepiniformis',
      }),
    ).not.toThrow();
  });

  it('mhlw 非該当 + safety=edible は許容', () => {
    expect(() =>
      validateSafetyAgainstMhlw('edible', {
        japaneseName: 'シイタケ',
        scientificName: 'Lentinula edodes',
      }),
    ).not.toThrow();
  });

  it('mhlw 該当 + safety=deadly は許容 (正しい判定)', () => {
    expect(() =>
      validateSafetyAgainstMhlw('deadly', {
        japaneseName: 'カエンタケ',
        scientificName: 'Trichoderma cornu-damae',
      }),
    ).not.toThrow();
  });
});
