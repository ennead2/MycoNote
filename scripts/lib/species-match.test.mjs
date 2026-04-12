/**
 * scripts/lib/species-match.mjs の pure helper に対する単体テスト。
 * vitest から node ESM として直接 import する。
 */
import { describe, it, expect } from 'vitest';
import {
  normalize,
  stripInfraspecific,
  editDistance,
  sciEquivalent,
  filterSynonyms,
} from './species-match.mjs';

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Amanita Muscaria  ')).toBe('amanita muscaria');
  });
  it('handles nullish', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('stripInfraspecific', () => {
  it('strips var. qualifier', () => {
    expect(stripInfraspecific('Laetiporus sulphureus var. miniatus')).toBe('laetiporus sulphureus');
  });
  it('strips f. forma qualifier', () => {
    expect(stripInfraspecific('Pleurotus djamor f. djamor')).toBe('pleurotus djamor');
    expect(stripInfraspecific('Pleurotus djamor forma djamor')).toBe('pleurotus djamor');
  });
  it('strips subsp. qualifier', () => {
    expect(stripInfraspecific('Amanita muscaria subsp. flavivolvata')).toBe('amanita muscaria');
  });
  it('keeps species-level unchanged', () => {
    expect(stripInfraspecific('Tricholoma matsutake')).toBe('tricholoma matsutake');
  });
});

describe('editDistance', () => {
  it('returns 0 for identical', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
  });
  it('counts one substitution', () => {
    expect(editDistance('abc', 'abd')).toBe(1);
  });
  it('catches orthographic variants', () => {
    // rhacodes / rachodes — 2 substitutions
    expect(editDistance('chlorophyllum rhacodes', 'chlorophyllum rachodes')).toBeLessThanOrEqual(2);
  });
});

describe('sciEquivalent', () => {
  it('matches exact', () => {
    expect(sciEquivalent('Amanita muscaria', 'Amanita muscaria')).toBe(true);
  });
  it('matches case-insensitively', () => {
    expect(sciEquivalent('AMANITA MUSCARIA', 'amanita muscaria')).toBe(true);
  });
  it('accepts var. rank difference', () => {
    expect(sciEquivalent('Laetiporus sulphureus', 'Laetiporus sulphureus var. miniatus')).toBe(true);
  });
  it('accepts forma rank difference', () => {
    expect(sciEquivalent('Pleurotus djamor', 'Pleurotus djamor forma djamor')).toBe(true);
  });
  it('accepts orthographic variant in same genus', () => {
    expect(sciEquivalent('Chlorophyllum rhacodes', 'Chlorophyllum rachodes')).toBe(true);
  });
  it('rejects different species', () => {
    expect(sciEquivalent('Amanita muscaria', 'Amanita phalloides')).toBe(false);
  });
  it('rejects similar species across different genera (防止: Amanita / Amanitella)', () => {
    // 同属制約: 属名が違うと編集距離許容は効かない
    expect(sciEquivalent('Foo nuda', 'Bar nuda')).toBe(false);
  });
  it('rejects null/empty', () => {
    expect(sciEquivalent(null, 'Amanita muscaria')).toBe(false);
    expect(sciEquivalent('', 'Amanita muscaria')).toBe(false);
  });
});

describe('filterSynonyms', () => {
  it('puts old name first', () => {
    const out = filterSynonyms(
      ['Agaricus volemus', 'Galorrheus volemus'],
      'Lactifluus volemus',
      'Lactarius volemus',
    );
    expect(out[0]).toBe('Lactarius volemus');
  });

  it('drops 3-word names (var./forma)', () => {
    const out = filterSynonyms(
      ['Agaricus bisporus hortensis', 'Agaricus bisporus'],
      'Agaricus bisporus',
      'Agaricus campestris',
    );
    expect(out).toContain('Agaricus campestris');
    expect(out).not.toContain('Agaricus bisporus hortensis');
  });

  it('drops synonyms whose species epithet starts with uppercase (bad data)', () => {
    const out = filterSynonyms(
      ['Agaricus Foo', 'Agaricus bar'],
      'Genus sp',
      null,
    );
    expect(out).not.toContain('Agaricus Foo');
    expect(out).toContain('Agaricus bar');
  });

  it('caps at maxCount', () => {
    const out = filterSynonyms(
      ['Genus a', 'Genus b', 'Genus c', 'Genus d', 'Genus e'],
      'Genus accepted',
      'Genus old',
      3,
    );
    expect(out.length).toBe(3);
    expect(out[0]).toBe('Genus old');
  });

  it('deduplicates', () => {
    const out = filterSynonyms(
      ['Genus foo', 'GENUS FOO', 'genus foo'],
      'Genus accepted',
      null,
    );
    expect(out).toEqual(['Genus foo']);
  });

  it('returns only old name when rawSynonyms empty', () => {
    expect(filterSynonyms([], 'Genus new', 'Genus old')).toEqual(['Genus old']);
    expect(filterSynonyms(null, 'Genus new', 'Genus old')).toEqual(['Genus old']);
  });

  it('returns empty when no old name and no valid synonyms', () => {
    expect(filterSynonyms([], 'Genus new', null)).toEqual([]);
    expect(filterSynonyms(['Genus new'], 'Genus new', 'Genus new')).toEqual([]);
  });
});
