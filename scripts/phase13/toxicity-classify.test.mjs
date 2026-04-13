import { describe, it, expect } from 'vitest';
import { classifyToxicity, buildV1ToxicityMap } from './toxicity-classify.mjs';

describe('classifyToxicity', () => {
  it('uses v1 map when present', () => {
    const v1Map = { 'Morchella esculenta': 'edible' };
    expect(classifyToxicity('Morchella esculenta', { v1Map })).toEqual({
      toxicity: 'edible',
      source: 'v1',
    });
  });

  it('uses mhlw set when not in v1', () => {
    const mhlwSet = new Set(['Amanita virosa']);
    expect(classifyToxicity('Amanita virosa', { v1Map: {}, mhlwSet })).toEqual({
      toxicity: 'toxic',
      source: 'mhlw',
    });
  });

  it('prefers v1 over mhlw when both present', () => {
    const v1Map = { 'Amanita virosa': 'deadly' };
    const mhlwSet = new Set(['Amanita virosa']);
    expect(classifyToxicity('Amanita virosa', { v1Map, mhlwSet })).toEqual({
      toxicity: 'deadly',
      source: 'v1',
    });
  });

  it('returns unknown when neither source matches', () => {
    expect(classifyToxicity('Obscure obscura', { v1Map: {}, mhlwSet: new Set() })).toEqual({
      toxicity: 'unknown',
      source: 'none',
    });
  });
});

describe('buildV1ToxicityMap', () => {
  it('maps scientificName to toxicity', () => {
    const v1 = [
      { names: { scientific: 'Amanita virosa' }, toxicity: 'deadly' },
      { names: { scientific: 'Morchella esculenta' }, toxicity: 'edible' },
    ];
    expect(buildV1ToxicityMap(v1)).toEqual({
      'Amanita virosa': 'deadly',
      'Morchella esculenta': 'edible',
    });
  });

  it('skips entries without scientificName', () => {
    const v1 = [{ toxicity: 'deadly' }];
    expect(buildV1ToxicityMap(v1)).toEqual({});
  });
});
