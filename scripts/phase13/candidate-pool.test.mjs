import { describe, it, expect } from 'vitest';
import { buildCandidatePool } from './candidate-pool.mjs';

describe('buildCandidatePool', () => {
  it('excludes genus-only entries', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta', rank: null },
      { id: 2, ja: 'アミガサタケ属', scientific: 'Morchella', genus: 'Morchella', species: null, rank: null },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
    expect(pool[0].scientificName).toBe('Morchella esculenta');
  });

  it('groups duplicate scientific names under japaneseNames[]', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ',   scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
      { id: 2, ja: 'トガリアミガサ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
    expect(pool[0].japaneseNames).toEqual(['アミガサタケ', 'トガリアミガサ']);
  });

  it('uses first japaneseName as primary', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ',   scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
      { id: 2, ja: 'トガリアミガサ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool[0].japaneseName).toBe('アミガサタケ');
  });

  it('skips entries with infraspecific rank (var./f./subsp.)', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta', rank: null },
      { id: 2, ja: '変種',         scientific: 'Morchella esculenta var. alba', genus: 'Morchella', species: 'esculenta', rank: 'var.' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool).toHaveLength(1);
  });

  it('preserves genus and species fields', () => {
    const checklist = [
      { id: 1, ja: 'アミガサタケ', scientific: 'Morchella esculenta', genus: 'Morchella', species: 'esculenta' },
    ];
    const pool = buildCandidatePool(checklist);
    expect(pool[0].genus).toBe('Morchella');
    expect(pool[0].species).toBe('esculenta');
  });
});
