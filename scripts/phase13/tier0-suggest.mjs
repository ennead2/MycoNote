/**
 * v1 mushrooms.json から Tier 0 の叩き台を抽出する。
 * 判定: (1) 毒性 deadly/toxic は自動採用 (2) 有名食用の allow-list は採用。
 * 出力: ユーザーが手動で追加/削除する前提の叩き台。
 */

const FAMOUS_EDIBLE = new Set([
  'Lentinula edodes',         // シイタケ
  'Amanita caesareoides',     // タマゴタケ
  'Morchella esculenta',      // アミガサタケ
  'Flammulina velutipes',     // エノキタケ
  'Hypsizygus marmoreus',     // ブナシメジ
  'Grifola frondosa',         // マイタケ
  'Pleurotus ostreatus',      // ヒラタケ
  'Tricholoma matsutake',     // マツタケ
  'Lyophyllum decastes',      // シャカシメジ
  'Lactarius hatsudake',      // ハツタケ
  'Suillus luteus',           // ヌメリイグチ
  'Boletus edulis',           // ヤマドリタケ
  'Agaricus campestris',      // ハラタケ
  'Pholiota nameko',          // ナメコ
]);

export function suggestTier0(v1Mushrooms) {
  const selected = [];
  for (const m of v1Mushrooms) {
    const sciName = m.names?.scientific;
    const jaName = m.names?.ja;
    if (!sciName || !jaName) continue;

    let rationale = null;
    if (m.toxicity === 'deadly') rationale = 'deadly: 絶対に誤食を防ぐべき';
    else if (m.toxicity === 'toxic') rationale = 'toxic: 主要な毒きのこ';
    else if (FAMOUS_EDIBLE.has(sciName)) rationale = 'famous_edible: 採取対象の主要種';

    if (rationale) {
      selected.push({
        scientificName: sciName,
        japaneseName: jaName,
        rationale,
      });
    }
  }
  // 学名昇順
  selected.sort((a, b) => a.scientificName.localeCompare(b.scientificName));
  return selected;
}

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('tier0-suggest.mjs')) {
  const v1Path = new URL('../../src/data/mushrooms.json', import.meta.url);
  const outPath = new URL('../../data/tier0-species.json', import.meta.url);
  const v1 = JSON.parse(await readFile(v1Path, 'utf-8'));
  const suggested = suggestTier0(v1);
  const doc = {
    description: 'Tier 0 手動指名リスト。自動生成した叩き台を手動で編集する。',
    generatedAt: new Date().toISOString(),
    editedBy: null,
    species: suggested,
  };
  await writeFile(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  console.log(`wrote ${suggested.length} entries to ${outPath.pathname}`);
}
