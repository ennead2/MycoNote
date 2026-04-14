/**
 * 日本産菌類集覧から候補プールを構築する。
 * 除外: genus-only (species=null), 変種/品種/亜種 (rank 非 null)
 * 集約: 同一学名の和名を japaneseNames[] にまとめ、先頭を japaneseName に
 *
 * buildCandidatePool: 文字列完全一致で dedupe（従来挙動、テスト互換）
 * buildCandidatePoolNormalized: GBIF accepted name で dedupe（Phase 13-B' 追加）
 *   同一種の旧名/新名が 1 エントリに統合され、wamei もすべて集約される。
 *   scientificName は accepted name に差し替わり、synonyms[] と originalNames[] が付与される。
 */

function filterChecklist(checklistEntries) {
  return checklistEntries.filter(e =>
    e.species && !e.rank && e.scientific && e.ja
  );
}

/**
 * @deprecated 新規コードは buildCandidatePoolNormalized を使うこと。
 * シノニム・旧新学名の乖離に対応できない。
 */
export function buildCandidatePool(checklistEntries) {
  const bySciName = new Map();
  for (const entry of filterChecklist(checklistEntries)) {
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

/**
 * accepted name で dedupe したプールを返す。
 * @param {Array} checklistEntries
 * @param {{
 *   normalizeName: (sci: string) => Promise<{
 *     acceptedName: string, acceptedUsageKey: number|null,
 *     synonyms: string[], status: string
 *   }>,
 *   concurrency?: number,
 *   onProgress?: (done: number, total: number) => void,
 * }} opts
 */
export async function buildCandidatePoolNormalized(checklistEntries, opts) {
  if (typeof opts?.normalizeName !== 'function') {
    throw new Error('buildCandidatePoolNormalized requires opts.normalizeName');
  }
  const concurrency = opts.concurrency ?? 3;
  const onProgress = opts.onProgress;

  // Step 1: 従来フィルタ + 文字列 dedupe（checklist 内の単純重複のみ）
  const rawPool = buildCandidatePool(checklistEntries);
  const total = rawPool.length;

  // Step 2: 各候補を並列で normalize（concurrency 制限）
  const normalized = new Array(rawPool.length);
  let done = 0;
  const limit = createLimiter(concurrency);
  await Promise.all(rawPool.map((c, i) => limit(async () => {
    const norm = await opts.normalizeName(c.scientificName);
    normalized[i] = { ...c, norm };
    done++;
    if (onProgress) onProgress(done, total);
  })));

  // Step 3: acceptedName をキーに merge
  const byAccepted = new Map();
  for (const { norm, ...c } of normalized) {
    const key = norm.acceptedName;
    if (!byAccepted.has(key)) {
      byAccepted.set(key, {
        scientificName: key,
        genus: c.genus,
        species: c.species,
        japaneseName: c.japaneseName,
        japaneseNames: [...c.japaneseNames],
        originalNames: [c.scientificName],
        synonyms: [...(norm.synonyms || [])],
        acceptedUsageKey: norm.acceptedUsageKey,
        status: norm.status,
      });
    } else {
      const bucket = byAccepted.get(key);
      for (const ja of c.japaneseNames) {
        if (!bucket.japaneseNames.includes(ja)) bucket.japaneseNames.push(ja);
      }
      if (!bucket.originalNames.includes(c.scientificName)) {
        bucket.originalNames.push(c.scientificName);
      }
      // 入力学名自身も synonyms に蓄積（accepted 以外）
      if (c.scientificName !== key && !bucket.synonyms.includes(c.scientificName)) {
        bucket.synonyms.push(c.scientificName);
      }
      for (const s of (norm.synonyms || [])) {
        if (s !== key && !bucket.synonyms.includes(s)) bucket.synonyms.push(s);
      }
      // accepted が未解決 (UNKNOWN) で入ってきた場合、既に SYNONYM/ACCEPTED のバケットに合流する
      // 優先順位: ACCEPTED > SYNONYM > DOUBTFUL > UNKNOWN
      bucket.status = preferStatus(bucket.status, norm.status);
      if (!bucket.acceptedUsageKey && norm.acceptedUsageKey) {
        bucket.acceptedUsageKey = norm.acceptedUsageKey;
      }
    }
  }

  return Array.from(byAccepted.values());
}

function preferStatus(a, b) {
  const order = { ACCEPTED: 0, SYNONYM: 1, DOUBTFUL: 2, UNKNOWN: 3 };
  return (order[a] ?? 99) <= (order[b] ?? 99) ? a : b;
}

function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const runNext = () => {
    if (active >= concurrency || queue.length === 0) return;
    const { task, resolve, reject } = queue.shift();
    active++;
    Promise.resolve().then(task).then(
      v => { active--; resolve(v); runNext(); },
      e => { active--; reject(e); runNext(); }
    );
  };
  return (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    runNext();
  });
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
