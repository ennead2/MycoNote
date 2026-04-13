import { describe, it, expect } from 'vitest';
import { suggestTier0 } from './tier0-suggest.mjs';

describe('suggestTier0', () => {
  const v1Sample = [
    { id: 'tamago', names: { ja: 'タマゴタケ', scientific: 'Amanita caesareoides' }, toxicity: 'edible' },
    { id: 'doku',   names: { ja: 'ドクツルタケ', scientific: 'Amanita virosa' },    toxicity: 'deadly' },
    { id: 'shii',   names: { ja: 'シイタケ', scientific: 'Lentinula edodes' },       toxicity: 'edible' },
    { id: 'kaen',   names: { ja: 'カエンタケ', scientific: 'Trichoderma cornu-damae' }, toxicity: 'deadly' },
    { id: 'tsuki',  names: { ja: 'ツキヨタケ', scientific: 'Omphalotus guepiniformis' }, toxicity: 'toxic' },
    { id: 'obscure', names: { ja: '無名種', scientific: 'Obscure obscura' },        toxicity: 'inedible' },
  ];

  it('includes all deadly species', () => {
    const out = suggestTier0(v1Sample);
    const names = out.map(e => e.scientificName);
    expect(names).toContain('Amanita virosa');
    expect(names).toContain('Trichoderma cornu-damae');
  });

  it('includes toxic species', () => {
    const out = suggestTier0(v1Sample);
    expect(out.map(e => e.scientificName)).toContain('Omphalotus guepiniformis');
  });

  it('includes famous edible species by hardcoded allow-list', () => {
    const out = suggestTier0(v1Sample);
    expect(out.map(e => e.scientificName)).toContain('Lentinula edodes');
    expect(out.map(e => e.scientificName)).toContain('Amanita caesareoides');
  });

  it('excludes obscure inedible species', () => {
    const out = suggestTier0(v1Sample);
    expect(out.map(e => e.scientificName)).not.toContain('Obscure obscura');
  });

  it('returns entries with required fields', () => {
    const out = suggestTier0(v1Sample);
    expect(out[0]).toHaveProperty('scientificName');
    expect(out[0]).toHaveProperty('japaneseName');
    expect(out[0]).toHaveProperty('rationale');
  });
});
