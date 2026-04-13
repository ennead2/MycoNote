/**
 * 日本産菌類集覧から候補プールを構築する。
 * 除外: genus-only (species=null), 変種/品種/亜種 (rank 非 null)
 * 集約: 同一学名の和名を japaneseNames[] にまとめ、先頭を japaneseName に
 */

export function buildCandidatePool(checklistEntries) {
  const bySciName = new Map();
  for (const entry of checklistEntries) {
    if (!entry.species) continue;        // genus-only 除外
    if (entry.rank) continue;            // 種内ランク除外
    if (!entry.scientific || !entry.ja) continue;

    const key = entry.scientific.trim();
    if (!bySciName.has(key)) {
      bySciName.set(key, {
        scientificName: key,
        genus: entry.genus,
        species: entry.species,
        japaneseNames: [entry.ja],
      });
    } else {
      const bucket = bySciName.get(key);
      if (!bucket.japaneseNames.includes(entry.ja)) {
        bucket.japaneseNames.push(entry.ja);
      }
    }
  }

  const pool = [];
  for (const e of bySciName.values()) {
    pool.push({
      scientificName: e.scientificName,
      japaneseName: e.japaneseNames[0],
      japaneseNames: e.japaneseNames,
      genus: e.genus,
      species: e.species,
    });
  }
  return pool;
}

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = new URL('../../data/jp-mycology-checklist.json', import.meta.url);
  const raw = JSON.parse(await readFile(path, 'utf-8'));
  const pool = buildCandidatePool(raw);
  console.log(`candidates: ${pool.length}`);
  console.log('sample (first 5):');
  console.log(JSON.stringify(pool.slice(0, 5), null, 2));
}
