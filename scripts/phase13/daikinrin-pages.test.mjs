import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parsePagesJson } from './daikinrin-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, 'fixtures/daikinrin-pages-sample.json'), 'utf8'));

describe('parsePagesJson', () => {
  it('種レベルエントリ（MycoBank ID 付き）のみ entries に変換する', () => {
    const entries = parsePagesJson(raw);
    // 5 件中 4 件が種レベル（Aaosphaeria_genus.html は属エントリでスキップ）
    expect(entries.length).toBe(4);
  });

  it('各 entry に scientificName, japaneseName, mycoBankId を持つ', () => {
    const entries = parsePagesJson(raw);
    const shi = entries.find(e => e.japaneseName === 'シイタケ');
    expect(shi).toBeDefined();
    expect(shi.scientificName).toBe('Lentinula edodes');
    expect(shi.mycoBankId).toBe(316467);
  });

  it('和名データなしの種は japaneseName=null', () => {
    const entries = parsePagesJson(raw);
    const noJa = entries.find(e => e.scientificName === 'Clitocybe rufoalutacea');
    expect(noJa).toBeDefined();
    expect(noJa.japaneseName).toBeNull();
    expect(noJa.mycoBankId).toBe(999999);
  });

  it('学名内のアンダースコアは空白に変換する', () => {
    const entries = parsePagesJson(raw);
    const tama = entries.find(e => e.japaneseName === 'タマゴタケ');
    expect(tama.scientificName).toBe('Amanita caesareoides');
  });

  it('var./subsp. 等を含む学名も正しく処理する', () => {
    const sample = [{ file: 'Amanita_muscaria_var._flavivolvata_222222.html', japanese_name: null, GBIF_kokunai: 0, GBIF_kaigai: 0 }];
    const entries = parsePagesJson(sample);
    expect(entries.length).toBe(1);
    expect(entries[0].scientificName).toBe('Amanita muscaria var. flavivolvata');
    expect(entries[0].mycoBankId).toBe(222222);
  });
});

import { buildPagesIndex, lookupMycoBankId, lookupEntry } from './daikinrin-pages.mjs';

describe('buildPagesIndex', () => {
  it('entries から sci → entry, ja → entry のマップを構築する', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    expect(idx.byScientific.get('lentinula edodes').mycoBankId).toBe(316467);
    expect(idx.byJapanese.get('シイタケ').scientificName).toBe('Lentinula edodes');
  });

  it('byScientific は lowercase キーで保存する（lookup 側で正規化される前提）', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    expect(idx.byScientific.get('lentinula edodes')).toBeDefined();
    expect(idx.byScientific.has('Lentinula Edodes')).toBe(false);
  });

  it('和名なし種は byJapanese に含まない', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    expect(idx.byJapanese.has(null)).toBe(false);
  });
});

describe('lookupEntry', () => {
  it('和名ヒット時に大菌輪側の正典学名を返す', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    // fixture には登場しないが、実データで起きるケースをシミュレート:
    // GBIF accepted 'Pholiota nameko' だが大菌輪は 'Pholiota microspora' が accepted というケース。
    // fixture では和名「シイタケ」→ 学名 'Lentinula edodes' の対応で同等の挙動を確認。
    const e = lookupEntry(idx, { scientificName: 'Wrong name', japaneseName: 'シイタケ' });
    expect(e).not.toBeNull();
    expect(e.scientificName).toBe('Lentinula edodes');
    expect(e.mycoBankId).toBe(316467);
  });
});

describe('lookupMycoBankId', () => {
  it('学名ヒットを優先', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    const id = lookupMycoBankId(idx, { scientificName: 'Lentinula edodes', japaneseName: 'シイタケ' });
    expect(id).toBe(316467);
  });

  it('学名なし＋和名のみで解決可', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    const id = lookupMycoBankId(idx, { scientificName: null, japaneseName: 'タマゴタケ' });
    expect(id).toBe(447788);
  });

  it('学名ミスヒット時は和名にフォールバック', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    const id = lookupMycoBankId(idx, { scientificName: 'Does not exist', japaneseName: 'シイタケ' });
    expect(id).toBe(316467);
  });

  it('どちらにもヒットしなければ null', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    const id = lookupMycoBankId(idx, { scientificName: 'Nonexistent species', japaneseName: 'ナイヨ' });
    expect(id).toBeNull();
  });

  it('学名入力の大文字小文字は lookup 側で吸収される', () => {
    const idx = buildPagesIndex(parsePagesJson(raw));
    expect(lookupMycoBankId(idx, { scientificName: 'LENTINULA EDODES' })).toBe(316467);
    expect(lookupMycoBankId(idx, { scientificName: 'lentinula EDODES' })).toBe(316467);
  });
});
