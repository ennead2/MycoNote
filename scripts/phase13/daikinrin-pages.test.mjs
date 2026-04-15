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
