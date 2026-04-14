# Phase 13-B: 種選定 + スコアリング Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本産菌類集覧 4429 種を入力として、各候補のシグナル（和名・MycoBank ID・Wikipedia ja 有無・iNat 画像有無・GBIF 国内観察数・毒性分類）を収集し、重み付けスコアで v2.0 / v2.1 / v2.2+ の tier に振り分けた `data/species-ranking.json` を出力する。Phase 13-C（AI 合成）の入力となる。

**Architecture:** Phase 13-A で確立した「1 ソース = 1 `.mjs` モジュール + fixture テスト + キャッシュ」のパターンを踏襲。シグナル収集器を個別モジュールに分離し、オーケストレータが並列で集約してスコア計算する。Tier 0 は手動 JSON（`data/tier0-species.json`）、Tier 1〜3 は自動スコア順カットオフ。

**Tech Stack:** Node.js 20+, ES Modules, vitest, native fetch, Phase 13-A cache 層の再利用。HTML/JSON パースのみ（新規 native 依存なし）。

---

## 設計書参照

本計画は `docs/superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md` §3「種の選定方式」と §6.2 [1]「種リスト決定」の実装。スコア重み・カットオフは同設計書 §3.1〜3.3 に従う。

---

## File Structure

```
scripts/phase13/
├── candidate-pool.mjs           # 候補プール構築（jp-checklist 由来）
├── candidate-pool.test.mjs
├── mycobank-resolve.mjs         # MycoBank ID 解決（daikinrin URL 試行 → GBIF fallback）
├── mycobank-resolve.test.mjs
├── wikipedia-exists.mjs         # Wikipedia ja 記事存在チェッカー
├── wikipedia-exists.test.mjs
├── inat-photos.mjs              # iNat 画像数チェッカー
├── inat-photos.test.mjs
├── gbif-observations.mjs        # GBIF 国内観察数（daikinrin 経由 or GBIF API 直）
├── gbif-observations.test.mjs
├── toxicity-classify.mjs        # 毒性分類シグナル（mhlw + v1 既知データ）
├── toxicity-classify.test.mjs
├── scoring.mjs                  # 重み付けスコア計算 + tier 分類
├── scoring.test.mjs
├── tier0-suggest.mjs            # v1 mushrooms.json から Tier 0 叩き台生成
├── tier0-suggest.test.mjs
├── build_ranking.mjs            # オーケストレータ CLI
├── build_ranking.test.mjs
└── fixtures/
    ├── gbif-species-match-morchella.json
    ├── wikipedia-exists-hit.json
    ├── wikipedia-exists-miss.json
    ├── inat-photos-morchella.json
    └── inat-photos-empty.json

data/
├── tier0-species.json           # ユーザー手動指名リスト（Task 1 で雛形生成、手動調整）
└── species-ranking.json         # 最終出力（Task 9）
```

**責任分離:**
- 各シグナル収集器は「学名（+ 和名）を受け取り、1 つのシグナルを返す」単一責務
- Phase 13-A のキャッシュ層を共有利用（`.cache/phase13/<namespace>/`）
- オーケストレータは「候補 × シグナル」のマトリクスを埋めるだけ、計算ロジックは `scoring.mjs` に集約

---

## Task 1: Tier 0 手動リストの雛形生成

**Files:**
- Create: `scripts/phase13/tier0-suggest.mjs`
- Create: `scripts/phase13/tier0-suggest.test.mjs`
- Create: `data/tier0-species.json`（雛形を出力してコミット → 手動編集前提）

**目的:** v1 `mushrooms.json` の毒性・記録件数・代表性から「Tier 0 に入れる可能性が高い」30〜50 種の叩き台を自動抽出し、ユーザーが手動編集する起点にする。

- [ ] **Step 1: 失敗するテストを書く**

`scripts/phase13/tier0-suggest.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run scripts/phase13/tier0-suggest.test.mjs`
Expected: FAIL — `Failed to resolve import "./tier0-suggest.mjs"`

- [ ] **Step 3: 実装を書く**

`scripts/phase13/tier0-suggest.mjs`:

```javascript
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run scripts/phase13/tier0-suggest.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 雛形 JSON を生成してコミット**

CLI 実行用の末尾を `tier0-suggest.mjs` に追記:

```javascript
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
```

Run:

```bash
node scripts/phase13/tier0-suggest.mjs
```

Expected: `data/tier0-species.json` が 30〜60 エントリーで生成される。

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/tier0-suggest.mjs scripts/phase13/tier0-suggest.test.mjs data/tier0-species.json
git commit -m "feat(phase13b): tier 0 seed list generator from v1 mushrooms"
```

---

## Task 2: 候補プール構築（日本産菌類集覧 → species 候補）

**Files:**
- Create: `scripts/phase13/candidate-pool.mjs`
- Create: `scripts/phase13/candidate-pool.test.mjs`

**目的:** `data/jp-mycology-checklist.json`（4429 エントリー）から「species レベルかつ学名あり」の候補プールを抽出する。genus 単独エントリー（`species: null`）と同一和名の異学名は除外し、重複学名は和名を配列に集約する。

- [ ] **Step 1: 失敗するテストを書く**

`scripts/phase13/candidate-pool.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テスト失敗確認**

Run: `npx vitest run scripts/phase13/candidate-pool.test.mjs`
Expected: FAIL — import error

- [ ] **Step 3: 実装**

`scripts/phase13/candidate-pool.mjs`:

```javascript
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
```

- [ ] **Step 4: テスト通過確認**

Run: `npx vitest run scripts/phase13/candidate-pool.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 実データでスモーク確認**

`scripts/phase13/candidate-pool.mjs` 末尾に CLI entry を追記:

```javascript
import { readFile } from 'node:fs/promises';

if (process.argv[1]?.endsWith('candidate-pool.mjs')) {
  const path = new URL('../../data/jp-mycology-checklist.json', import.meta.url);
  const raw = JSON.parse(await readFile(path, 'utf-8'));
  const pool = buildCandidatePool(raw);
  console.log(`candidates: ${pool.length}`);
  console.log('sample (first 5):');
  console.log(JSON.stringify(pool.slice(0, 5), null, 2));
}
```

Run: `node scripts/phase13/candidate-pool.mjs`
Expected: `candidates: 2500〜3500` 程度（集覧の species レベルエントリー数）

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/candidate-pool.mjs scripts/phase13/candidate-pool.test.mjs
git commit -m "feat(phase13b): candidate pool from jp mycology checklist"
```

---

## Task 3: MycoBank ID resolver（daikinrin URL 試行 → GBIF fallback）

**Files:**
- Create: `scripts/phase13/mycobank-resolve.mjs`
- Create: `scripts/phase13/mycobank-resolve.test.mjs`
- Create: `scripts/phase13/fixtures/gbif-species-match-morchella.json`

**目的:** 学名から MycoBank ID を解決する。戦略:
1. **既知マッピング**: `data/tier0-species.json` や既存 v1 `mushrooms.json` に MycoBank ID があれば優先
2. **daikinrin URL 試行**: `daikinrin.mjs` の `buildPageUrl` + HEAD 相当の存在チェック（実際は GET して 200/404 判定）
3. **GBIF Backbone**: `species/match` → `species/{usageKey}` の `references`/`identifiers` に MycoBank あれば使う
4. 解決不能は `null` 返却（低 tier に落とす）

**注意**: 戦略 2 は MycoBank ID を知らないと URL を組み立てられない。**戦略 1 と 3 がメイン**。戦略 2 は v1 から既知の (学名, MB#) を突合する際の検証用として残す。

- [ ] **Step 1: GBIF レスポンスの fixture を用意**

`scripts/phase13/fixtures/gbif-species-match-morchella.json` を手動取得:

```bash
curl -s "https://api.gbif.org/v1/species/match?name=Morchella%20esculenta&kingdom=Fungi" \
  > scripts/phase13/fixtures/gbif-species-match-morchella.json
```

内容確認:

```bash
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('scripts/phase13/fixtures/gbif-species-match-morchella.json', 'utf-8')), null, 2).slice(0, 500))"
```

Expected: `matchType`, `usageKey`, `scientificName` 等が含まれる。**MycoBank ID がこの endpoint に含まれない場合、Step 3 で `species/{usageKey}` の追加取得を行う**。

- [ ] **Step 2: 失敗するテスト**

`scripts/phase13/mycobank-resolve.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFromKnownMap, extractMycoBankFromGbifSpecies } from './mycobank-resolve.mjs';

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
```

- [ ] **Step 3: テスト失敗確認**

Run: `npx vitest run scripts/phase13/mycobank-resolve.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 4: 実装**

`scripts/phase13/mycobank-resolve.mjs`:

```javascript
/**
 * 学名から MycoBank ID を解決する。
 * 戦略順: known-map → GBIF Backbone (species/match → species/{key})
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

const gbifMatchCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-match' });
const gbifSpeciesCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-species' });

export function resolveFromKnownMap(scientificName, knownMap) {
  if (knownMap[scientificName] !== undefined) return knownMap[scientificName];
  return null;
}

export function extractMycoBankFromGbifSpecies(species) {
  if (!species?.identifiers) return null;
  for (const ident of species.identifiers) {
    const type = (ident.type || '').toUpperCase();
    if (type !== 'MYCOBANK') continue;
    const raw = ident.identifier || '';
    // URL の場合、末尾の数値を取り出す
    const match = raw.match(/(\d+)(?!.*\d)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

async function fetchGbifMatch(scientificName) {
  const cached = await gbifMatchCache.get(scientificName);
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&kingdom=Fungi`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await gbifMatchCache.set(scientificName, json);
  return json;
}

async function fetchGbifSpecies(usageKey) {
  const cached = await gbifSpeciesCache.get(String(usageKey));
  if (cached !== null) return cached;
  const url = `https://api.gbif.org/v1/species/${usageKey}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await gbifSpeciesCache.set(String(usageKey), json);
  return json;
}

/**
 * @param {string} scientificName
 * @param {{ knownMap?: Record<string, number> }} opts
 * @returns {Promise<{ mycobankId: number | null, source: string }>}
 */
export async function resolveMycoBankId(scientificName, opts = {}) {
  const knownMap = opts.knownMap || {};

  // 1. known map
  const known = resolveFromKnownMap(scientificName, knownMap);
  if (known !== null) return { mycobankId: known, source: 'known-map' };

  // 2. GBIF match → species
  const match = await fetchGbifMatch(scientificName);
  if (match?.usageKey) {
    const species = await fetchGbifSpecies(match.usageKey);
    if (species) {
      const mb = extractMycoBankFromGbifSpecies(species);
      if (mb !== null) return { mycobankId: mb, source: 'gbif' };
    }
  }

  return { mycobankId: null, source: 'unresolved' };
}
```

- [ ] **Step 5: テスト通過確認**

Run: `npx vitest run scripts/phase13/mycobank-resolve.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 6: 既知マップを v1 mushrooms から抽出する helper を追加**

`scripts/phase13/mycobank-resolve.mjs` の末尾に:

```javascript
/**
 * v1 mushrooms.json 等から { scientificName: mycobankId } マップを抽出。
 * v1 に MB# が無い場合はこの関数は空マップを返す（将来拡張用）。
 */
export function buildKnownMapFromV1(v1Mushrooms) {
  const map = {};
  for (const m of v1Mushrooms) {
    const sci = m.names?.scientific;
    const mb = m.mycobank_id ?? m.mycobankId;
    if (sci && typeof mb === 'number') map[sci] = mb;
  }
  return map;
}
```

テスト追加（`mycobank-resolve.test.mjs` 末尾）:

```javascript
import { buildKnownMapFromV1 } from './mycobank-resolve.mjs';

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
```

Run: `npx vitest run scripts/phase13/mycobank-resolve.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 7: コミット**

```bash
git add scripts/phase13/mycobank-resolve.mjs scripts/phase13/mycobank-resolve.test.mjs scripts/phase13/fixtures/gbif-species-match-morchella.json
git commit -m "feat(phase13b): mycobank id resolver via known map + gbif backbone"
```

---

## Task 4: Wikipedia ja 記事存在チェッカー

**Files:**
- Create: `scripts/phase13/wikipedia-exists.mjs`
- Create: `scripts/phase13/wikipedia-exists.test.mjs`
- Create: `scripts/phase13/fixtures/wikipedia-exists-hit.json`
- Create: `scripts/phase13/fixtures/wikipedia-exists-miss.json`

**目的:** `Phase 13-A` の `wikipedia.mjs` は本文抽出用で大きい。スコアリングでは「記事が存在するか」の boolean シグナルのみ欲しいので、軽量専用モジュールを作る（MediaWiki API の `query&titles` で extract 不要、`missing` フラグ判定のみ）。和名 → scientificName の順にフォールバック。

- [ ] **Step 1: fixture 作成**

`scripts/phase13/fixtures/wikipedia-exists-hit.json`:

```json
{
  "batchcomplete": "",
  "query": {
    "pages": {
      "12345": {
        "pageid": 12345,
        "ns": 0,
        "title": "アミガサタケ"
      }
    }
  }
}
```

`scripts/phase13/fixtures/wikipedia-exists-miss.json`:

```json
{
  "batchcomplete": "",
  "query": {
    "pages": {
      "-1": {
        "ns": 0,
        "title": "ExistsProbably Not",
        "missing": ""
      }
    }
  }
}
```

- [ ] **Step 2: 失敗するテスト**

`scripts/phase13/wikipedia-exists.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWikipediaExistsResponse } from './wikipedia-exists.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

describe('parseWikipediaExistsResponse', () => {
  it('returns true when page exists', async () => {
    const json = await readFixture('wikipedia-exists-hit.json');
    expect(parseWikipediaExistsResponse(json)).toBe(true);
  });

  it('returns false when page is missing', async () => {
    const json = await readFixture('wikipedia-exists-miss.json');
    expect(parseWikipediaExistsResponse(json)).toBe(false);
  });

  it('returns false when query is empty', () => {
    expect(parseWikipediaExistsResponse({})).toBe(false);
  });

  it('returns false when pages is empty', () => {
    expect(parseWikipediaExistsResponse({ query: { pages: {} } })).toBe(false);
  });
});
```

- [ ] **Step 3: テスト失敗確認**

Run: `npx vitest run scripts/phase13/wikipedia-exists.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 4: 実装**

`scripts/phase13/wikipedia-exists.mjs`:

```javascript
/**
 * Wikipedia ja/en の記事存在チェッカー（本文取得なし、軽量）。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const cache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-exists' });

export function parseWikipediaExistsResponse(json) {
  const pages = json?.query?.pages;
  if (!pages) return false;
  const ids = Object.keys(pages);
  if (ids.length === 0) return false;
  const page = pages[ids[0]];
  return !!page && page.missing === undefined;
}

async function checkTitle(lang, title) {
  const key = `${lang}:${title}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    format: 'json',
    redirects: '1',
    origin: '*',
  });
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    await cache.set(key, false);
    return false;
  }
  const json = await res.json();
  const exists = parseWikipediaExistsResponse(json);
  await cache.set(key, exists);
  return exists;
}

/**
 * @param {{ japaneseName?: string, scientificName: string }} args
 * @returns {Promise<{ jaExists: boolean, matchedTitle: string | null }>}
 */
export async function checkWikipediaJaExists({ japaneseName, scientificName }) {
  if (japaneseName) {
    const hit = await checkTitle('ja', japaneseName);
    if (hit) return { jaExists: true, matchedTitle: japaneseName };
  }
  const hit = await checkTitle('ja', scientificName);
  return { jaExists: hit, matchedTitle: hit ? scientificName : null };
}
```

- [ ] **Step 5: テスト通過確認**

Run: `npx vitest run scripts/phase13/wikipedia-exists.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/wikipedia-exists.mjs scripts/phase13/wikipedia-exists.test.mjs scripts/phase13/fixtures/wikipedia-exists-hit.json scripts/phase13/fixtures/wikipedia-exists-miss.json
git commit -m "feat(phase13b): wikipedia ja article existence checker"
```

---

## Task 5: iNat 画像数チェッカー

**Files:**
- Create: `scripts/phase13/inat-photos.mjs`
- Create: `scripts/phase13/inat-photos.test.mjs`
- Create: `scripts/phase13/fixtures/inat-photos-morchella.json`
- Create: `scripts/phase13/fixtures/inat-photos-empty.json`

**目的:** iNaturalist API で `taxon_name=<学名>` を Research Grade フィルタで検索、`photos` を持つ observation 数を取得。**0 か >0 の boolean + 概算件数**だけ返す（詳細写真取得は Phase 13-C の責務）。

- [ ] **Step 1: fixture 作成**

fixture ファイル 2 つを作る。fixture は既存の `scripts/fetch-photos-v2.mjs` や iNat API のレスポンスを参照し、本物の形を最小限で再現する。

`scripts/phase13/fixtures/inat-photos-morchella.json`:

```json
{
  "total_results": 8742,
  "page": 1,
  "per_page": 1,
  "results": [
    {
      "id": 12345,
      "quality_grade": "research",
      "photos": [{ "id": 1, "url": "https://example.com/p.jpg" }]
    }
  ]
}
```

`scripts/phase13/fixtures/inat-photos-empty.json`:

```json
{
  "total_results": 0,
  "page": 1,
  "per_page": 1,
  "results": []
}
```

- [ ] **Step 2: 失敗するテスト**

`scripts/phase13/inat-photos.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInatObservationsResponse } from './inat-photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

describe('parseInatObservationsResponse', () => {
  it('returns totalResults and hasPhotos true when observations exist', async () => {
    const json = await readFixture('inat-photos-morchella.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(8742);
    expect(result.hasPhotos).toBe(true);
  });

  it('returns hasPhotos false when empty', async () => {
    const json = await readFixture('inat-photos-empty.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns hasPhotos false when result has no photos', () => {
    const json = { total_results: 5, results: [{ id: 1, photos: [] }] };
    const result = parseInatObservationsResponse(json);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns zero when json is malformed', () => {
    const result = parseInatObservationsResponse({});
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });
});
```

- [ ] **Step 3: テスト失敗確認**

Run: `npx vitest run scripts/phase13/inat-photos.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 4: 実装**

`scripts/phase13/inat-photos.mjs`:

```javascript
/**
 * iNaturalist で学名に紐付く Research Grade 観察写真の件数を取得する軽量チェッカー。
 * 実際の画像 URL は取得しない（Phase 13-C でヒーロー画像選定時に別途取得）。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const cache = createCache({ dir: CACHE_DIR, namespace: 'inat-photos' });

export function parseInatObservationsResponse(json) {
  const total = typeof json?.total_results === 'number' ? json.total_results : 0;
  const first = Array.isArray(json?.results) ? json.results[0] : null;
  const hasPhotos = total > 0 && !!first && Array.isArray(first.photos) && first.photos.length > 0;
  return { totalResults: total, hasPhotos };
}

export async function checkInatPhotos(scientificName) {
  const cached = await cache.get(scientificName);
  if (cached !== null) return cached;

  const params = new URLSearchParams({
    taxon_name: scientificName,
    quality_grade: 'research',
    photos: 'true',
    per_page: '1',
    order: 'desc',
    order_by: 'created_at',
  });
  const url = `https://api.inaturalist.org/v1/observations?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    const empty = { totalResults: 0, hasPhotos: false };
    await cache.set(scientificName, empty);
    return empty;
  }
  const json = await res.json();
  const parsed = parseInatObservationsResponse(json);
  await cache.set(scientificName, parsed);
  return parsed;
}
```

- [ ] **Step 5: テスト通過確認**

Run: `npx vitest run scripts/phase13/inat-photos.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/inat-photos.mjs scripts/phase13/inat-photos.test.mjs scripts/phase13/fixtures/inat-photos-morchella.json scripts/phase13/fixtures/inat-photos-empty.json
git commit -m "feat(phase13b): inat research-grade photo existence checker"
```

---

## Task 6: GBIF 国内観察数取得

**Files:**
- Create: `scripts/phase13/gbif-observations.mjs`
- Create: `scripts/phase13/gbif-observations.test.mjs`

**目的:** GBIF 国内観察数を取得する。Phase 13-A の `daikinrin.mjs` の `fetchDaikinrinPage` は既にこの数値を取得するが、MycoBank ID 必須。ここではより汎用な **GBIF API 直接問い合わせ版**を実装（MycoBank ID 不要、学名から usageKey → occurrence count）。

- [ ] **Step 1: 失敗するテスト**

`scripts/phase13/gbif-observations.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseOccurrenceCount } from './gbif-observations.mjs';

describe('parseOccurrenceCount', () => {
  it('returns count when present', () => {
    expect(parseOccurrenceCount({ count: 42 })).toBe(42);
  });

  it('returns 0 when count missing', () => {
    expect(parseOccurrenceCount({})).toBe(0);
  });

  it('returns 0 when count is null', () => {
    expect(parseOccurrenceCount({ count: null })).toBe(0);
  });

  it('handles count as string', () => {
    expect(parseOccurrenceCount({ count: '42' })).toBe(42);
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `npx vitest run scripts/phase13/gbif-observations.test.mjs`
Expected: FAIL

- [ ] **Step 3: 実装**

`scripts/phase13/gbif-observations.mjs`:

```javascript
/**
 * GBIF occurrence API で国内・海外観察数を取得。
 * 注: GBIF usageKey は resolveMycoBankId から取得済みのものを再利用するのが理想だが、
 *     独立ユニットとして taxonKey を自前で解決する。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const obsCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-occurrence-count' });
const matchCache = createCache({ dir: CACHE_DIR, namespace: 'gbif-match' });

export function parseOccurrenceCount(json) {
  const v = json?.count;
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getUsageKey(scientificName) {
  const cached = await matchCache.get(scientificName);
  if (cached?.usageKey !== undefined) return cached.usageKey;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&kingdom=Fungi`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  await matchCache.set(scientificName, json);
  return json.usageKey ?? null;
}

async function countOccurrences(usageKey, country) {
  const key = `${usageKey}:${country || 'all'}`;
  const cached = await obsCache.get(key);
  if (cached !== null) return cached;
  const params = new URLSearchParams({ taxonKey: String(usageKey), limit: '0' });
  if (country) params.set('country', country);
  const url = `https://api.gbif.org/v1/occurrence/search?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    await obsCache.set(key, 0);
    return 0;
  }
  const json = await res.json();
  const count = parseOccurrenceCount(json);
  await obsCache.set(key, count);
  return count;
}

/**
 * @param {string} scientificName
 * @returns {Promise<{ domestic: number, overseas: number }>}
 */
export async function fetchGbifObservations(scientificName) {
  const usageKey = await getUsageKey(scientificName);
  if (!usageKey) return { domestic: 0, overseas: 0 };
  const total = await countOccurrences(usageKey, null);
  const domestic = await countOccurrences(usageKey, 'JP');
  return { domestic, overseas: Math.max(0, total - domestic) };
}
```

- [ ] **Step 4: テスト通過確認**

Run: `npx vitest run scripts/phase13/gbif-observations.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: スモーク確認（実ネットワーク）**

Ad-hoc スクリプトで 1 種だけ確認:

```bash
node -e "import('./scripts/phase13/gbif-observations.mjs').then(m => m.fetchGbifObservations('Morchella esculenta').then(console.log))"
```

Expected: `{ domestic: <数十〜数百>, overseas: <数千〜数万> }` が返る。

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/gbif-observations.mjs scripts/phase13/gbif-observations.test.mjs
git commit -m "feat(phase13b): gbif occurrence count fetcher (domestic/overseas)"
```

---

## Task 7: 毒性分類シグナル

**Files:**
- Create: `scripts/phase13/toxicity-classify.mjs`
- Create: `scripts/phase13/toxicity-classify.test.mjs`

**目的:** 候補種の毒性レベルを推定する。ソース優先度:
1. `data/mushrooms.json` v1 に既に分類されていれば採用
2. `MHLW_TARGET_SPECIES`（mhlw.mjs のリスト）に含まれていれば `toxic` 以上
3. それ以外は `unknown`（スコアリングで低ブースト）

スコアリングは「毒性が明確に判明している」ことをブーストする（強毒 + 有名食用）。

- [ ] **Step 1: 失敗するテスト**

`scripts/phase13/toxicity-classify.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { classifyToxicity, buildV1ToxicityMap } from './toxicity-classify.mjs';

describe('classifyToxicity', () => {
  it('uses v1 map when present', () => {
    const v1Map = { 'Morchella esculenta': 'edible' };
    expect(classifyToxicity('Morchella esculenta', { v1Map })).toEqual({
      toxicity: 'edible',
      source: 'v1',
    });
  });

  it('uses mhlw set when not in v1', () => {
    const mhlwSet = new Set(['Amanita virosa']);
    expect(classifyToxicity('Amanita virosa', { v1Map: {}, mhlwSet })).toEqual({
      toxicity: 'toxic',
      source: 'mhlw',
    });
  });

  it('prefers v1 over mhlw when both present', () => {
    const v1Map = { 'Amanita virosa': 'deadly' };
    const mhlwSet = new Set(['Amanita virosa']);
    expect(classifyToxicity('Amanita virosa', { v1Map, mhlwSet })).toEqual({
      toxicity: 'deadly',
      source: 'v1',
    });
  });

  it('returns unknown when neither source matches', () => {
    expect(classifyToxicity('Obscure obscura', { v1Map: {}, mhlwSet: new Set() })).toEqual({
      toxicity: 'unknown',
      source: 'none',
    });
  });
});

describe('buildV1ToxicityMap', () => {
  it('maps scientificName to toxicity', () => {
    const v1 = [
      { names: { scientific: 'Amanita virosa' }, toxicity: 'deadly' },
      { names: { scientific: 'Morchella esculenta' }, toxicity: 'edible' },
    ];
    expect(buildV1ToxicityMap(v1)).toEqual({
      'Amanita virosa': 'deadly',
      'Morchella esculenta': 'edible',
    });
  });

  it('skips entries without scientificName', () => {
    const v1 = [{ toxicity: 'deadly' }];
    expect(buildV1ToxicityMap(v1)).toEqual({});
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `npx vitest run scripts/phase13/toxicity-classify.test.mjs`
Expected: FAIL

- [ ] **Step 3: 実装**

`scripts/phase13/toxicity-classify.mjs`:

```javascript
/**
 * 毒性分類シグナル。v1 mushrooms → mhlw 名簿 → unknown の順で解決。
 */
import { MHLW_TARGET_SPECIES } from './mhlw.mjs';

export function buildV1ToxicityMap(v1Mushrooms) {
  const map = {};
  for (const m of v1Mushrooms) {
    const sci = m.names?.scientific;
    if (sci && m.toxicity) map[sci] = m.toxicity;
  }
  return map;
}

export function buildMhlwSet() {
  return new Set(MHLW_TARGET_SPECIES.map(s => s.scientificName));
}

/**
 * @param {string} scientificName
 * @param {{ v1Map: Record<string, string>, mhlwSet?: Set<string> }} opts
 * @returns {{ toxicity: string, source: string }}
 */
export function classifyToxicity(scientificName, opts) {
  const v1Map = opts.v1Map || {};
  const mhlwSet = opts.mhlwSet || buildMhlwSet();

  if (v1Map[scientificName]) {
    return { toxicity: v1Map[scientificName], source: 'v1' };
  }
  if (mhlwSet.has(scientificName)) {
    return { toxicity: 'toxic', source: 'mhlw' };
  }
  return { toxicity: 'unknown', source: 'none' };
}
```

- [ ] **Step 4: テスト通過確認**

Run: `npx vitest run scripts/phase13/toxicity-classify.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: コミット**

```bash
git add scripts/phase13/toxicity-classify.mjs scripts/phase13/toxicity-classify.test.mjs
git commit -m "feat(phase13b): toxicity classifier via v1 map + mhlw list"
```

---

## Task 8: スコア計算 + Tier 分類

**Files:**
- Create: `scripts/phase13/scoring.mjs`
- Create: `scripts/phase13/scoring.test.mjs`

**目的:** 収集したシグナルから重み付けスコアを算出し、Tier 0〜3 に振り分ける。設計書 §3.1 の重み案をそのまま実装:

- GBIF 国内観察数（log10 スケール、主軸、`×2.0`）
- 日本産菌類集覧に和名あり（boolean、`+3`）
- Wikipedia ja 記事あり（boolean、`+5`）
- iNat 画像あり（boolean、`+2`）
- 毒性明確（`deadly` → `+10`, `toxic` → `+6`, `caution` → `+3`, `edible` → `+2`, famous_edible → `+5`、`unknown` → 0）
- MycoBank ID 解決済み（boolean、`+1`）

**Tier 分類（v2.0 での分割案）:**
- Tier 0: 手動指定リストに一致するもの
- Tier 1: スコア上位 100 位（v2.0 対象）
- Tier 2: 101〜400 位（v2.1 対象）
- Tier 3: 401 位以降（v2.2+ 対象）

カットオフは実データ確認後に調整可能な設計にする（関数引数で差し替え）。

- [ ] **Step 1: 失敗するテスト**

`scripts/phase13/scoring.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { computeScore, classifyTier, rankAndClassify } from './scoring.mjs';

describe('computeScore', () => {
  it('applies log scale to domestic observations', () => {
    const s1 = computeScore({ observationsDomestic: 1, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    const s2 = computeScore({ observationsDomestic: 10000, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(s2).toBeGreaterThan(s1);
  });

  it('returns 0 base when zero observations', () => {
    const s = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(s).toBe(0);
  });

  it('adds wamei boost', () => {
    const withWamei = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: true, toxicity: 'unknown', mycobankId: null });
    expect(withWamei).toBe(3);
  });

  it('adds wiki ja boost', () => {
    const withWiki = computeScore({ observationsDomestic: 0, wikiJaExists: true, inatHasPhotos: false, hasWamei: false, toxicity: 'unknown', mycobankId: null });
    expect(withWiki).toBe(5);
  });

  it('applies deadly boost', () => {
    const s = computeScore({ observationsDomestic: 0, wikiJaExists: false, inatHasPhotos: false, hasWamei: false, toxicity: 'deadly', mycobankId: null });
    expect(s).toBe(10);
  });

  it('sums all signals additively', () => {
    const s = computeScore({ observationsDomestic: 100, wikiJaExists: true, inatHasPhotos: true, hasWamei: true, toxicity: 'edible', mycobankId: 247978 });
    // log10(100) * 2 = 4, + 5(wiki) + 2(inat) + 3(wamei) + 2(edible) + 1(mb) = 17
    expect(s).toBe(17);
  });
});

describe('classifyTier', () => {
  it('returns tier 0 when scientificName is in tier0 set', () => {
    const tier0Set = new Set(['Amanita virosa']);
    expect(classifyTier('Amanita virosa', 50, 0, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(0);
  });

  it('returns tier 1 for top rankings outside tier 0', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 0, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(1);
  });

  it('returns tier 2 for middle rankings', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 150, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(2);
  });

  it('returns tier 3 for lowest rankings', () => {
    const tier0Set = new Set();
    expect(classifyTier('X', 50, 450, { tier0Set, tier1Size: 100, tier2Size: 300 })).toBe(3);
  });
});

describe('rankAndClassify', () => {
  it('sorts by score desc and assigns tiers', () => {
    const candidates = [
      { scientificName: 'A', score: 10 },
      { scientificName: 'B', score: 30 },
      { scientificName: 'C', score: 20 },
    ];
    const tier0Set = new Set();
    const result = rankAndClassify(candidates, { tier0Set, tier1Size: 1, tier2Size: 1 });
    expect(result[0]).toMatchObject({ scientificName: 'B', tier: 1, rank: 0 });
    expect(result[1]).toMatchObject({ scientificName: 'C', tier: 2, rank: 1 });
    expect(result[2]).toMatchObject({ scientificName: 'A', tier: 3, rank: 2 });
  });

  it('places tier 0 species first regardless of score', () => {
    const candidates = [
      { scientificName: 'high', score: 100 },
      { scientificName: 'manual', score: 5 },
    ];
    const tier0Set = new Set(['manual']);
    const result = rankAndClassify(candidates, { tier0Set, tier1Size: 10, tier2Size: 100 });
    const tier0Entry = result.find(r => r.scientificName === 'manual');
    expect(tier0Entry.tier).toBe(0);
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `npx vitest run scripts/phase13/scoring.test.mjs`
Expected: FAIL

- [ ] **Step 3: 実装**

`scripts/phase13/scoring.mjs`:

```javascript
/**
 * シグナルから重み付けスコアを算出し、tier 分類する。
 * 重み案は docs/superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md §3.1 に基づく。
 */

const TOXICITY_BOOST = {
  deadly: 10,
  toxic: 6,
  caution: 3,
  edible: 2,
  inedible: 0,
  unknown: 0,
};

const WEIGHTS = {
  observationsLog10: 2.0,
  wamei: 3,
  wikiJa: 5,
  inatPhotos: 2,
  mycobank: 1,
};

/**
 * @param {{
 *   observationsDomestic: number,
 *   wikiJaExists: boolean,
 *   inatHasPhotos: boolean,
 *   hasWamei: boolean,
 *   toxicity: string,
 *   mycobankId: number | null,
 * }} signals
 * @returns {number} score (整数、小数切り捨て)
 */
export function computeScore(signals) {
  let score = 0;
  if (signals.observationsDomestic > 0) {
    score += Math.log10(signals.observationsDomestic) * WEIGHTS.observationsLog10;
  }
  if (signals.hasWamei) score += WEIGHTS.wamei;
  if (signals.wikiJaExists) score += WEIGHTS.wikiJa;
  if (signals.inatHasPhotos) score += WEIGHTS.inatPhotos;
  if (signals.mycobankId !== null) score += WEIGHTS.mycobank;
  score += TOXICITY_BOOST[signals.toxicity] ?? 0;
  return Math.round(score * 100) / 100;
}

/**
 * @param {string} scientificName
 * @param {number} score
 * @param {number} rank (0-based, スコア降順)
 * @param {{ tier0Set: Set<string>, tier1Size: number, tier2Size: number }} opts
 * @returns {0 | 1 | 2 | 3}
 */
export function classifyTier(scientificName, score, rank, opts) {
  if (opts.tier0Set.has(scientificName)) return 0;
  if (rank < opts.tier1Size) return 1;
  if (rank < opts.tier1Size + opts.tier2Size) return 2;
  return 3;
}

/**
 * @param {Array<{ scientificName: string, score: number, ... }>} candidates
 * @param {{ tier0Set: Set<string>, tier1Size: number, tier2Size: number }} opts
 * @returns {Array<{ ..., rank: number, tier: 0|1|2|3 }>}
 */
export function rankAndClassify(candidates, opts) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  return sorted.map((c, rank) => ({
    ...c,
    rank,
    tier: classifyTier(c.scientificName, c.score, rank, opts),
  }));
}
```

- [ ] **Step 4: テスト通過確認**

Run: `npx vitest run scripts/phase13/scoring.test.mjs`
Expected: PASS (13 tests)

- [ ] **Step 5: コミット**

```bash
git add scripts/phase13/scoring.mjs scripts/phase13/scoring.test.mjs
git commit -m "feat(phase13b): weighted score + tier classifier"
```

---

## Task 9: オーケストレータ CLI

**Files:**
- Create: `scripts/phase13/build_ranking.mjs`
- Create: `scripts/phase13/build_ranking.test.mjs`

**目的:** すべてのシグナル収集器を束ね、候補プールに対してシグナルを付与し、スコア + tier を付けて `data/species-ranking.json` に書き出す。並列度は怒られない範囲（iNat/Wikipedia/GBIF への負担考慮）で `p-limit` 相当の制御を自前で入れる。

**並列度方針:**
- 外部 API: 並列 5（`createLimiter(5)`）
- 進捗は `console.error` にパーセント出力（stdout は結果 JSON 出力のため）
- 再実行時はキャッシュがあればほぼ瞬時

- [ ] **Step 1: 失敗するテスト（オーケストレータのロジック部分）**

`scripts/phase13/build_ranking.test.mjs`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { enrichCandidate, createLimiter } from './build_ranking.mjs';

describe('enrichCandidate', () => {
  it('aggregates signals from all collectors', async () => {
    const candidate = { scientificName: 'Morchella esculenta', japaneseName: 'アミガサタケ' };
    const deps = {
      resolveMycoBankId: vi.fn().mockResolvedValue({ mycobankId: 247978, source: 'gbif' }),
      checkWikipediaJaExists: vi.fn().mockResolvedValue({ jaExists: true, matchedTitle: 'アミガサタケ' }),
      checkInatPhotos: vi.fn().mockResolvedValue({ totalResults: 8742, hasPhotos: true }),
      fetchGbifObservations: vi.fn().mockResolvedValue({ domestic: 288, overseas: 12670 }),
      classifyToxicity: vi.fn().mockReturnValue({ toxicity: 'edible', source: 'v1' }),
    };
    const result = await enrichCandidate(candidate, deps, {});
    expect(result.scientificName).toBe('Morchella esculenta');
    expect(result.signals.mycobankId).toBe(247978);
    expect(result.signals.wikiJaExists).toBe(true);
    expect(result.signals.inatHasPhotos).toBe(true);
    expect(result.signals.observationsDomestic).toBe(288);
    expect(result.signals.toxicity).toBe('edible');
    expect(result.signals.hasWamei).toBe(true);
  });

  it('is fault tolerant: resolve error becomes null', async () => {
    const candidate = { scientificName: 'X y', japaneseName: 'X' };
    const deps = {
      resolveMycoBankId: vi.fn().mockRejectedValue(new Error('net')),
      checkWikipediaJaExists: vi.fn().mockResolvedValue({ jaExists: false, matchedTitle: null }),
      checkInatPhotos: vi.fn().mockResolvedValue({ totalResults: 0, hasPhotos: false }),
      fetchGbifObservations: vi.fn().mockResolvedValue({ domestic: 0, overseas: 0 }),
      classifyToxicity: vi.fn().mockReturnValue({ toxicity: 'unknown', source: 'none' }),
    };
    const result = await enrichCandidate(candidate, deps, {});
    expect(result.signals.mycobankId).toBeNull();
  });
});

describe('createLimiter', () => {
  it('limits concurrency', async () => {
    const limiter = createLimiter(2);
    let active = 0, maxActive = 0;
    const task = () => new Promise(r => {
      active++;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => { active--; r(); }, 10);
    });
    await Promise.all([1,2,3,4,5].map(() => limiter(task)));
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `npx vitest run scripts/phase13/build_ranking.test.mjs`
Expected: FAIL

- [ ] **Step 3: 実装**

`scripts/phase13/build_ranking.mjs`:

```javascript
/**
 * Phase 13-B オーケストレータ。
 * 日本産菌類集覧 + Tier 0 手動リストを入力として、全候補にシグナル収集 → スコア計算 → tier 分類 →
 * data/species-ranking.json を出力する。
 *
 * Usage:
 *   node scripts/phase13/build_ranking.mjs [--limit N] [--concurrency N] [--tier1 N] [--tier2 N]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCandidatePool } from './candidate-pool.mjs';
import { resolveMycoBankId, buildKnownMapFromV1 } from './mycobank-resolve.mjs';
import { checkWikipediaJaExists } from './wikipedia-exists.mjs';
import { checkInatPhotos } from './inat-photos.mjs';
import { fetchGbifObservations } from './gbif-observations.mjs';
import { classifyToxicity, buildV1ToxicityMap, buildMhlwSet } from './toxicity-classify.mjs';
import { computeScore, rankAndClassify } from './scoring.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const runNext = () => {
    if (active >= concurrency || queue.length === 0) return;
    const { task, resolve, reject } = queue.shift();
    active++;
    Promise.resolve().then(task).then(v => { active--; resolve(v); runNext(); }, e => { active--; reject(e); runNext(); });
  };
  return (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    runNext();
  });
}

export async function enrichCandidate(candidate, deps, opts) {
  const safe = async (p) => {
    try { return await p; } catch { return null; }
  };

  const [mbRes, wikiRes, inatRes, gbifRes] = await Promise.all([
    safe(deps.resolveMycoBankId(candidate.scientificName, opts.mbOpts || {})),
    safe(deps.checkWikipediaJaExists(candidate)),
    safe(deps.checkInatPhotos(candidate.scientificName)),
    safe(deps.fetchGbifObservations(candidate.scientificName)),
  ]);
  const toxRes = deps.classifyToxicity(candidate.scientificName, opts.toxOpts || {});

  return {
    scientificName: candidate.scientificName,
    japaneseName: candidate.japaneseName,
    japaneseNames: candidate.japaneseNames,
    genus: candidate.genus,
    species: candidate.species,
    signals: {
      mycobankId: mbRes?.mycobankId ?? null,
      mycobankSource: mbRes?.source ?? 'error',
      wikiJaExists: wikiRes?.jaExists ?? false,
      inatHasPhotos: inatRes?.hasPhotos ?? false,
      inatTotalResults: inatRes?.totalResults ?? 0,
      observationsDomestic: gbifRes?.domestic ?? 0,
      observationsOverseas: gbifRes?.overseas ?? 0,
      toxicity: toxRes.toxicity,
      toxicitySource: toxRes.source,
      hasWamei: !!candidate.japaneseName,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag, def) => {
    const i = args.indexOf(flag);
    if (i < 0) return def;
    return args[i + 1];
  };
  const limit = parseInt(getArg('--limit', '0'), 10);
  const concurrency = parseInt(getArg('--concurrency', '5'), 10);
  const tier1Size = parseInt(getArg('--tier1', '100'), 10);
  const tier2Size = parseInt(getArg('--tier2', '300'), 10);

  // load inputs
  const checklistPath = join(__dirname, '../../data/jp-mycology-checklist.json');
  const v1Path = join(__dirname, '../../src/data/mushrooms.json');
  const tier0Path = join(__dirname, '../../data/tier0-species.json');

  const checklist = JSON.parse(await readFile(checklistPath, 'utf-8'));
  const v1 = JSON.parse(await readFile(v1Path, 'utf-8'));
  const tier0Doc = JSON.parse(await readFile(tier0Path, 'utf-8'));

  const pool = buildCandidatePool(checklist);
  const candidates = limit > 0 ? pool.slice(0, limit) : pool;
  const tier0Set = new Set(tier0Doc.species.map(e => e.scientificName));
  const knownMap = buildKnownMapFromV1(v1);
  const v1ToxMap = buildV1ToxicityMap(v1);
  const mhlwSet = buildMhlwSet();

  const deps = {
    resolveMycoBankId,
    checkWikipediaJaExists,
    checkInatPhotos,
    fetchGbifObservations,
    classifyToxicity,
  };
  const opts = {
    mbOpts: { knownMap },
    toxOpts: { v1Map: v1ToxMap, mhlwSet },
  };

  const limiter = createLimiter(concurrency);
  let done = 0;
  const total = candidates.length;
  const enriched = await Promise.all(candidates.map(c => limiter(async () => {
    const result = await enrichCandidate(c, deps, opts);
    done++;
    if (done % 10 === 0 || done === total) {
      console.error(`[progress] ${done}/${total} (${Math.round(done / total * 100)}%)`);
    }
    return result;
  })));

  for (const e of enriched) {
    e.score = computeScore(e.signals);
  }

  const ranked = rankAndClassify(enriched, { tier0Set, tier1Size, tier2Size });

  const outPath = join(__dirname, '../../data/species-ranking.json');
  const doc = {
    generatedAt: new Date().toISOString(),
    params: { total, tier1Size, tier2Size, concurrency, limit: limit || null },
    tier0Count: ranked.filter(r => r.tier === 0).length,
    tier1Count: ranked.filter(r => r.tier === 1).length,
    tier2Count: ranked.filter(r => r.tier === 2).length,
    tier3Count: ranked.filter(r => r.tier === 3).length,
    species: ranked,
  };
  await writeFile(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  console.error(`[done] wrote ${total} entries to ${outPath}`);
  console.error(`  tier0=${doc.tier0Count}, tier1=${doc.tier1Count}, tier2=${doc.tier2Count}, tier3=${doc.tier3Count}`);
}

if (process.argv[1]?.endsWith('build_ranking.mjs')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: テスト通過確認**

Run: `npx vitest run scripts/phase13/build_ranking.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: 全 phase13 テスト通過確認（regression check）**

Run: `npx vitest run scripts/phase13/`
Expected: PASS（既存 36 + 新規 45 前後 = 80 程度）

- [ ] **Step 6: スモーク実行（少数候補で動作確認）**

```bash
node scripts/phase13/build_ranking.mjs --limit 30 --concurrency 3
```

Expected:
- `[progress] 10/30 (33%)` 等の進捗が出る
- `data/species-ranking.json` に 30 エントリーが書かれる
- tier0 は `data/tier0-species.json` に含まれるもの、tier1〜3 は --tier1/--tier2 のカットオフに従う

出力を開いて目視確認：

```bash
node -e "const d = require('./data/species-ranking.json'); console.log('top 5:'); console.log(JSON.stringify(d.species.slice(0, 5).map(s => ({ sci: s.scientificName, ja: s.japaneseName, tier: s.tier, score: s.score, sig: s.signals })), null, 2))"
```

- [ ] **Step 7: コミット**

```bash
git add scripts/phase13/build_ranking.mjs scripts/phase13/build_ranking.test.mjs
git commit -m "feat(phase13b): build_ranking orchestrator CLI with concurrency limiter"
```

---

## Task 10: 本番実行 + ドキュメント更新

**Files:**
- Modify: `docs/phase13/README.md`
- Modify: `docs/progress.md`
- Create: `data/species-ranking.json`（全候補で本番実行した結果をコミット）

**目的:** 全候補（~3500 種）で `build_ranking.mjs` を本番実行し、出力を図鑑構築の入力としてコミットする。ドキュメントを Phase 13-B 完了状態に更新する。

- [ ] **Step 1: 本番実行**

```bash
node scripts/phase13/build_ranking.mjs --concurrency 5
```

想定所要時間: キャッシュなしで 30〜60 分（3500 種 × 4 API × 5 並列 = 約 28 分、プラスリトライ等）。実行中は `[progress]` が定期的に出る。

実行後、`data/species-ranking.json` の統計値を控える:

```bash
node -e "const d = require('./data/species-ranking.json'); console.log('total:', d.species.length); console.log('tier0:', d.tier0Count); console.log('tier1:', d.tier1Count); console.log('tier2:', d.tier2Count); console.log('tier3:', d.tier3Count);"
```

- [ ] **Step 2: 出力を目視レビュー**

上位 20 種を確認して、Tier 0 に追加すべき種が tier1 に残っていないか、逆に tier0 のうち明らかに採取対象外のものが混じっていないかを目視:

```bash
node -e "const d = require('./data/species-ranking.json'); d.species.slice(0, 30).forEach(s => console.log(s.tier, s.score.toFixed(1), s.scientificName, '—', s.japaneseName))"
```

**不自然な結果があれば**:
- `data/tier0-species.json` を手動編集して追加/削除
- `build_ranking.mjs` を再実行（キャッシュあるので 1-2 分で完了）

納得できる上位順が出るまで繰り返す。

- [ ] **Step 3: `docs/phase13/README.md` を Phase 13-B 完了状態に更新**

既存 README の「サブフェーズ」セクションを更新:

```markdown
## サブフェーズ

- [x] Phase 13-A: データソース収集基盤 — [計画書](../superpowers/plans/2026-04-13-phase13a-data-source-foundation.md)
- [x] Phase 13-B: 種選定 + スコアリング — [計画書](../superpowers/plans/2026-04-13-phase13b-species-selection-scoring.md)
- [ ] Phase 13-C: AI 合成パイプライン
- [ ] Phase 13-D: レビューツール拡張
- [ ] Phase 13-E: 軽量スキーマ移行
- [ ] Phase 13-F: v2.0 リリース
```

末尾に Phase 13-B の使い方セクションを追加:

```markdown
## Phase 13-B の使い方

### 1. Tier 0 リストを準備

`data/tier0-species.json` を開いて v2.0 で必ず収録したい種を編集（初回は `tier0-suggest.mjs` が叩き台を生成）。

### 2. ランキング構築

\`\`\`bash
node scripts/phase13/build_ranking.mjs --concurrency 5
\`\`\`

出力: `data/species-ranking.json`
- `tier: 0` — 手動指定（v2.0 必須）
- `tier: 1` — 自動スコア上位 100（v2.0 対象）
- `tier: 2` — 101-400 位（v2.1 対象）
- `tier: 3` — 401 位以下（v2.2+ 対象、長期）

カットオフは `--tier1 100 --tier2 300` 等で調整可。
```

- [ ] **Step 4: `docs/progress.md` に Phase 13-B セクション追加**

進捗ファイルに Phase 13-B の完了セクションを追記（Phase 13-A の後に続く形で）。

- [ ] **Step 5: コミット**

```bash
git add data/species-ranking.json docs/phase13/README.md docs/progress.md
git commit -m "feat(phase13b): ranked species dataset + docs"
```

---

## Self-Review

計画全体を見直し:

**1. スペックとの照合（設計書 §3〜§11 vs 本計画）:**

| 設計書要求 | カバータスク |
|---|---|
| §3.1 Tier 0 手動指名 | Task 1（叩き台 + 手動編集） |
| §3.1 自動スコア（GBIF 観察数、和名、wiki、iNat、毒性） | Task 4〜7（各シグナル）+ Task 8（スコア） |
| §3.3 段階リリース（v2.0=50-100, v2.1=300-400） | Task 8（--tier1 --tier2 パラメータ） |
| §6.2 [1] 種リスト決定 | Task 9（orchestrator） |
| Phase 13-A の README が MycoBank ID 自動解決を 13-B で実装と予告 | Task 3（mycobank-resolve） |

**2. プレースホルダースキャン:** "TBD" / "fill in details" / "similar to X" 無し。全 step にコード/コマンド記載。

**3. 型・識別子の一貫性:**
- `scientificName` / `japaneseName` の表記を全タスクで統一
- `signals.mycobankId` / `signals.wikiJaExists` / `signals.hasWamei` が `enrichCandidate` → `computeScore` で一致
- `tier0Set` / `tier1Size` / `tier2Size` が `rankAndClassify` / `classifyTier` で一致

**4. ハードコード値への注釈:** スコア重み (`WEIGHTS`) とカットオフ (`tier1Size=100`, `tier2Size=300`) は Task 10 のレビューステップで実データ確認後に調整する前提。

**5. 依存関係:**
- Task 1 (tier0-suggest) → Task 9（orchestrator 入力）
- Task 2 (candidate-pool) → Task 9
- Task 3〜7 (シグナル収集器) → Task 9
- Task 8 (scoring) → Task 9
- Task 9 → Task 10（本番実行）

---

## 注意事項

- **外部 API レート制限**: Wikipedia/iNat/GBIF に負荷をかけすぎないよう `--concurrency 5` を既定。問題があれば下げる
- **MycoBank ID 解決失敗種**: 多くは資料不足により `null` になる可能性が高い。スコアには `-1` ペナルティでなく「解決済みなら +1」の設計にしたので、解決不能でも Tier 対象からは外れない
- **`.cache/phase13/` の再利用**: Phase 13-A と同じディレクトリで名前空間を切って共存。2 回目以降はほぼ瞬時
- **Tier 0 は「v2.0 の必須コンテンツ」**: スコアが低くても tier0 であれば第1優先。逆に tier0 に入れない種はスコアで勝負
- **カットオフ数値の妥当性**: Task 10 の目視レビューで調整する。初期値の `100/300` は v2.0/v2.1 の設計ゴールに対応
