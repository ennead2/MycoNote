import { describe, it, expect } from 'vitest';
import { parseScientificName } from './parse-scientific-name.mjs';

describe('parseScientificName', () => {
  it('二名法を scientificName に格納する', () => {
    const r = parseScientificName('Lentinula edodes');
    expect(r).toEqual({
      scientificName: 'Lentinula edodes',
      scientificNameRaw: 'Lentinula edodes',
      infraspecificRank: null,
      infraspecificEpithet: null,
      authorship: null,
    });
  });

  it('前後空白は trim される', () => {
    const r = parseScientificName('  Morchella esculenta  ');
    expect(r.scientificName).toBe('Morchella esculenta');
    expect(r.scientificNameRaw).toBe('Morchella esculenta');
  });

  it('f. (forma) 形式を分離する', () => {
    const r = parseScientificName('Amanita sychnopyramis f. subannulata');
    expect(r).toEqual({
      scientificName: 'Amanita sychnopyramis',
      scientificNameRaw: 'Amanita sychnopyramis f. subannulata',
      infraspecificRank: 'f.',
      infraspecificEpithet: 'subannulata',
      authorship: null,
    });
  });

  it('ハイフンを含む epithet（Genus-species）を許容する', () => {
    // 大菌輪実例: 複合学名 (x-で結合) には対応しないが、日本産には通常含まれない
    const r = parseScientificName('Genus some-species');
    expect(r.scientificName).toBe('Genus some-species');
  });

  it('属名のみ（1 語）は例外を投げる', () => {
    expect(() => parseScientificName('Amanita')).toThrow(/unsupported format/);
  });

  it('5 語以上は例外を投げる', () => {
    expect(() => parseScientificName('Genus species subsp. foo var. bar')).toThrow(
      /unsupported format/,
    );
  });

  it('3 語目が f. 以外の 4 語は例外を投げる', () => {
    expect(() => parseScientificName('Genus species var. foo')).toThrow(/unsupported format/);
    expect(() => parseScientificName('Genus species subsp. foo')).toThrow(/unsupported format/);
  });

  it('属名が小文字で始まる場合は例外', () => {
    expect(() => parseScientificName('amanita muscaria')).toThrow(/invalid genus/);
  });

  it('epithet が大文字で始まる場合は例外', () => {
    expect(() => parseScientificName('Amanita Muscaria')).toThrow(/invalid species epithet/);
  });

  it('空文字列は例外を投げる', () => {
    expect(() => parseScientificName('')).toThrow(/empty input/);
    expect(() => parseScientificName('   ')).toThrow(/empty input/);
  });

  it('非文字列入力は TypeError', () => {
    expect(() => parseScientificName(null)).toThrow(TypeError);
    expect(() => parseScientificName(123)).toThrow(TypeError);
    expect(() => parseScientificName(undefined)).toThrow(TypeError);
  });
});
