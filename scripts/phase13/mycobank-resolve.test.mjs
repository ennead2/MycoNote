import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveFromKnownMap,
  extractMycoBankFromGbifSpecies,
  buildKnownMapFromV1,
} from './mycobank-resolve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = path => join(__dirname, 'fixtures', path);

describe('resolveFromKnownMap', () => {
  it('returns id when scientificName matches', () => {
    const map = { 'Morchella esculenta': 247978 };
    expect(resolveFromKnownMap('Morchella esculenta', map)).toBe(247978);
  });

  it('returns null when not in map', () => {
    expect(resolveFromKnownMap('Unknown species', {})).toBe(null);
  });

  it('is case-sensitive', () => {
    const map = { 'Morchella esculenta': 247978 };
    expect(resolveFromKnownMap('morchella esculenta', map)).toBe(null);
  });
});

describe('extractMycoBankFromGbifSpecies', () => {
  it('finds MycoBank in identifiers when present', () => {
    const species = {
      key: 12345,
      identifiers: [
        { type: 'MYCOBANK', identifier: '247978' },
        { type: 'GBIF', identifier: '12345' },
      ],
    };
    expect(extractMycoBankFromGbifSpecies(species)).toBe(247978);
  });

  it('returns null when no MycoBank identifier exists', () => {
    const species = { key: 12345, identifiers: [{ type: 'GBIF', identifier: '12345' }] };
    expect(extractMycoBankFromGbifSpecies(species)).toBe(null);
  });

  it('returns null when identifiers is empty', () => {
    expect(extractMycoBankFromGbifSpecies({ key: 12345 })).toBe(null);
  });

  it('parses numeric strings', () => {
    const species = { identifiers: [{ type: 'MycoBank', identifier: '247978' }] };
    expect(extractMycoBankFromGbifSpecies(species)).toBe(247978);
  });

  it('handles MycoBank URL format', () => {
    const species = { identifiers: [{ type: 'MYCOBANK', identifier: 'http://www.mycobank.org/BioloMICS.aspx?Table=Mycobank&MycoBankNr_=247978' }] };
    expect(extractMycoBankFromGbifSpecies(species)).toBe(247978);
  });
});

describe('buildKnownMapFromV1', () => {
  it('extracts mycobank_id when present', () => {
    const v1 = [{ names: { scientific: 'Morchella esculenta' }, mycobank_id: 247978 }];
    expect(buildKnownMapFromV1(v1)).toEqual({ 'Morchella esculenta': 247978 });
  });

  it('skips entries without mycobank_id', () => {
    const v1 = [{ names: { scientific: 'A b' } }];
    expect(buildKnownMapFromV1(v1)).toEqual({});
  });
});
