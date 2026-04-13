import { describe, it, expect } from 'vitest';
import { combineSources, resolveJapaneseName } from './fetch_sources.mjs';

describe('combineSources', () => {
  it('全ソースの結果をまとめた単一オブジェクトを返す', () => {
    const input = {
      scientificName: 'Morchella esculenta',
      daikinrin: { japaneseName: 'アミガサタケ', taxonomy: { genus: 'Morchella' } },
      wikipediaJa: { extract: 'アミガサタケは...', title: 'アミガサタケ' },
      wikipediaEn: { extract: 'Morchella esculenta is...', title: 'Morchella esculenta' },
      mhlw: null,
      rinya: { text: '林野庁...', sourceUrl: 'https://...' },
      traitCircus: { summary: { pileus: { color: ['brown'] } } },
    };
    const out = combineSources(input);
    expect(out.scientificName).toBe('Morchella esculenta');
    expect(out.japaneseName).toBe('アミガサタケ');
    expect(out.sources.daikinrin).toBeDefined();
    expect(out.sources.wikipediaJa).toBeDefined();
    expect(out.sources.mhlw).toBeNull();
  });

  it('大菌輪がない場合でも他ソースは保持する', () => {
    const input = {
      scientificName: 'Rare species',
      daikinrin: null,
      wikipediaJa: null,
      wikipediaEn: { extract: 'text' },
      mhlw: null,
      rinya: null,
      traitCircus: null,
    };
    const out = combineSources(input);
    expect(out.japaneseName).toBeNull();
    expect(out.sources.wikipediaEn).toBeDefined();
  });

  it('daikinrin が無くても mhlw の japaneseName で combine される', () => {
    const input = {
      scientificName: 'Amanita virosa',
      daikinrin: null,
      wikipediaJa: null,
      wikipediaEn: null,
      mhlw: { japaneseName: 'ドクツルタケ', scientificName: 'Amanita virosa', text: '...' },
      rinya: null,
      traitCircus: null,
    };
    const out = combineSources(input);
    expect(out.japaneseName).toBe('ドクツルタケ');
  });
});

describe('resolveJapaneseName', () => {
  it('daikinrin の japaneseName を最優先', () => {
    expect(resolveJapaneseName({
      daikinrin: { japaneseName: 'アミガサタケ' },
      mhlw: { japaneseName: 'ドクツルタケ' },
    })).toBe('アミガサタケ');
  });

  it('daikinrin が無ければ mhlw から取る', () => {
    expect(resolveJapaneseName({
      daikinrin: null,
      mhlw: { japaneseName: 'ドクツルタケ' },
    })).toBe('ドクツルタケ');
  });

  it('両方無ければ null', () => {
    expect(resolveJapaneseName({ daikinrin: null, mhlw: null })).toBeNull();
  });
});
