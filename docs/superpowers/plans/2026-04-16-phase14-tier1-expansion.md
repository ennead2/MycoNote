# Phase 14: v2 図鑑拡充（tier1 合成）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2 図鑑を tier0 の 60 種から tier1 を加えた約 121 種に拡充し、v2.1 として一括リリースする。

**Architecture:** Phase 13 の AI 合成パイプラインを spec 駆動に拡張して再利用。tier1 は事前キュレーション（和名正規化 + intake gate）を経てから合成 → レビュー → 画像取得 → `src/data/mushrooms.json` 再ビルドで反映。

**Tech Stack:** Node.js ESM (`.mjs`) / `node --test` / 既存 `scripts/phase13/*.mjs` モジュール群 / Next.js 16 / TypeScript / lucide-react / Tailwind CSS v4

設計書: `docs/superpowers/specs/2026-04-16-phase14-tier1-expansion-design.md`

---

## File Structure

### 新規作成

| Path | 責任 |
|---|---|
| `scripts/phase14/non-fungi-genera.mjs` | キノコ対象外属（カビ・酵母）の定数リスト |
| `scripts/phase14/non-fungi-genera.test.mjs` | 定数の形式チェック |
| `scripts/phase14/normalize-tier1-names.mjs` | 和名クレンジング + 大菌輪突合 + suggestion 判定 |
| `scripts/phase14/normalize-tier1-names.test.mjs` | 純粋関数の単体テスト |
| `scripts/phase14/normalize_tier1_names_cli.mjs` | S1 の実行 CLI（ranking 読込 → normalized.json 書出） |
| `scripts/phase14/confirm-lineup.mjs` | intake gate 判定 + 対話 state 遷移（純粋関数） |
| `scripts/phase14/confirm-lineup.test.mjs` | 純粋関数の単体テスト |
| `scripts/phase14/confirm_lineup_cli.mjs` | S2 の対話 CLI（readline、再開対応） |
| `scripts/phase14/build-tier1-spec.mjs` | `tier1-species.json` 生成ロジック |
| `scripts/phase14/build-tier1-spec.test.mjs` | 単体テスト |
| `scripts/phase14/build_tier1_spec_cli.mjs` | S3 の実行 CLI |
| `data/tier1-species.json` | tier1 採用種のメタデータ（S3 出力、tier0-species.json と同形式） |
| `data/phase14/tier1-names-normalized.json` | S1 出力（中間成果物） |
| `data/phase14/tier1-lineup-confirmed.json` | S2 出力（中間成果物） |

### 既存ファイル変更

| Path | 変更内容 |
|---|---|
| `scripts/phase13/generate_articles.mjs` | `--spec <path>` オプション追加、`resolveTargets` を tier 複数対応に拡張 |
| `scripts/phase13/generate_articles.test.mjs` | `--spec` 挙動テスト追加 |
| `scripts/phase13/build_v2_mushrooms.mjs` | `loadAllSources` が tier0 + tier1 両方読む、`tier !== 0 && tier !== 1` フィルタ |
| `scripts/phase13/build_v2_mushrooms.test.mjs` | tier1 マージテスト追加 |
| `scripts/review-v2/index.html` (または相当ファイル) | sidebar に `[tier0/tier1/all]` フィルタチップ追加 |
| `scripts/review-v2/server.mjs` | approved/ 既存 slug を tier 判定して返す API 追加 |
| `src/components/layout/V2ReleaseBanner.tsx` | STORAGE_KEY 変更、文言の ui-text キー参照変更 |
| `src/constants/ui-text.ts` | `banner.v21Title` / `banner.v21Body` 追加、お知らせセクションに v2.1 エントリ追加 |
| `src/app/settings/page.tsx` | v2.1 リリース履歴エントリ追加（既存 v2 エントリの下） |
| `README.md` | v2.1 追記セクション、種数 60 → 121 更新 |
| `e2e/zukan.spec.ts` | 60 種 → 121 種期待値更新、tier1 slug fixture 追加 |

---

## Task 1: 非キノコ属リスト定数

**Files:**
- Create: `scripts/phase14/non-fungi-genera.mjs`
- Test: `scripts/phase14/non-fungi-genera.test.mjs`

- [ ] **Step 1.1: 定数モジュールとテストを同時作成**

ファイル `scripts/phase14/non-fungi-genera.mjs`:

```javascript
/**
 * 子実体を形成しないため図鑑対象外とする属のリスト。
 * ranking.json の tier1 に紛れ込む可能性のある anamorphic fungi / mold / yeast 属。
 * 大菌輪 pages.json 未ヒット種の自動除外判定に使う。
 */
export const NON_FUNGI_GENERA = Object.freeze([
  'Aspergillus',
  'Penicillium',
  'Saccharomyces',
  'Candida',
  'Fusarium',
  'Alternaria',
  'Cladosporium',
  'Trichoderma', // 注意: カエンタケ (Trichoderma cornu-damae) は除外しない（S2 で例外処理）
  'Rhizopus',
  'Mucor',
]);

/**
 * genus が非キノコ属に含まれるか判定。大文字小文字を区別しない。
 * @param {string | null | undefined} genus
 * @returns {boolean}
 */
export function isNonFungusGenus(genus) {
  if (!genus) return false;
  const g = genus.toLowerCase();
  return NON_FUNGI_GENERA.some((n) => n.toLowerCase() === g);
}
```

ファイル `scripts/phase14/non-fungi-genera.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NON_FUNGI_GENERA, isNonFungusGenus } from './non-fungi-genera.mjs';

test('NON_FUNGI_GENERA is a frozen array of strings', () => {
  assert.ok(Array.isArray(NON_FUNGI_GENERA));
  assert.ok(Object.isFrozen(NON_FUNGI_GENERA));
  for (const g of NON_FUNGI_GENERA) {
    assert.strictEqual(typeof g, 'string');
    assert.match(g, /^[A-Z][a-z]+$/);
  }
});

test('isNonFungusGenus detects Aspergillus case-insensitively', () => {
  assert.strictEqual(isNonFungusGenus('Aspergillus'), true);
  assert.strictEqual(isNonFungusGenus('aspergillus'), true);
});

test('isNonFungusGenus returns false for mushroom genus', () => {
  assert.strictEqual(isNonFungusGenus('Amanita'), false);
  assert.strictEqual(isNonFungusGenus('Lactifluus'), false);
});

test('isNonFungusGenus handles nullish input', () => {
  assert.strictEqual(isNonFungusGenus(null), false);
  assert.strictEqual(isNonFungusGenus(undefined), false);
  assert.strictEqual(isNonFungusGenus(''), false);
});
```

- [ ] **Step 1.2: テスト実行**

Run: `node --test scripts/phase14/non-fungi-genera.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 1.3: Commit**

```bash
git add scripts/phase14/non-fungi-genera.mjs scripts/phase14/non-fungi-genera.test.mjs
git commit -m "feat(phase14): 非キノコ属リスト定数を追加"
```

---

## Task 2: 和名クレンジング関数

**Files:**
- Create: `scripts/phase14/normalize-tier1-names.mjs`
- Test: `scripts/phase14/normalize-tier1-names.test.mjs`

- [ ] **Step 2.1: 失敗するテストを書く**

ファイル `scripts/phase14/normalize-tier1-names.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanJapaneseNames } from './normalize-tier1-names.mjs';

test('cleanJapaneseNames removes entries with ※ annotation', () => {
  const input = ['アイカワラタケ', 'カワラタケ', 'クモ　※クモタケ', 'クロクモタケ'];
  assert.deepStrictEqual(cleanJapaneseNames(input), ['アイカワラタケ', 'カワラタケ', 'クロクモタケ']);
});

test('cleanJapaneseNames trims full-width and half-width whitespace', () => {
  assert.deepStrictEqual(
    cleanJapaneseNames(['　ハツタケ　', ' テングタケ ', 'タマゴタケ']),
    ['ハツタケ', 'テングタケ', 'タマゴタケ']
  );
});

test('cleanJapaneseNames removes empty and duplicate entries', () => {
  assert.deepStrictEqual(
    cleanJapaneseNames(['シイタケ', '', 'シイタケ', 'マイタケ']),
    ['シイタケ', 'マイタケ']
  );
});

test('cleanJapaneseNames returns empty array for nullish input', () => {
  assert.deepStrictEqual(cleanJapaneseNames(null), []);
  assert.deepStrictEqual(cleanJapaneseNames(undefined), []);
  assert.deepStrictEqual(cleanJapaneseNames([]), []);
});
```

- [ ] **Step 2.2: テスト失敗を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: FAIL with "Cannot find module" or "cleanJapaneseNames is not defined".

- [ ] **Step 2.3: 実装**

ファイル `scripts/phase14/normalize-tier1-names.mjs`（新規作成）:

```javascript
/**
 * tier1 和名リストから checklist ノイズを除去する。
 * 除去対象:
 *   - "※" 以降が続く注釈エントリ（例: "クモ　※クモタケ"）
 *   - 前後の全角/半角空白
 *   - 空文字・重複
 *
 * @param {string[] | null | undefined} names
 * @returns {string[]}
 */
export function cleanJapaneseNames(names) {
  if (!Array.isArray(names)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of names) {
    if (typeof raw !== 'string') continue;
    if (raw.includes('※')) continue;
    const trimmed = raw.replace(/[\s　]+/g, '').trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
```

- [ ] **Step 2.4: テスト成功を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add scripts/phase14/normalize-tier1-names.mjs scripts/phase14/normalize-tier1-names.test.mjs
git commit -m "feat(phase14): 和名 checklist ノイズ除去関数を追加"
```

---

## Task 3: suggestion 判定関数

**Files:**
- Modify: `scripts/phase14/normalize-tier1-names.mjs` (追記)
- Modify: `scripts/phase14/normalize-tier1-names.test.mjs` (追記)

- [ ] **Step 3.1: 失敗するテストを追記**

`scripts/phase14/normalize-tier1-names.test.mjs` の末尾に追記:

```javascript
import { classifySpecies } from './normalize-tier1-names.mjs';

test('classifySpecies returns KEEP when daikinrin matches species name', () => {
  const sp = { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', genus: 'Trametes' };
  const index = {
    byScientific: new Map([['trametes versicolor', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 123 }]]),
    byJapanese: new Map([['アイカワラタケ', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 123 }]]),
  };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'KEEP');
  assert.strictEqual(r.daikinrinHit, true);
  assert.strictEqual(r.daikinrinTitle, 'アイカワラタケ');
});

test('classifySpecies returns RENAME_TO when daikinrin title differs', () => {
  const sp = { scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', genus: 'Boletus' };
  const index = {
    byScientific: new Map([['boletus sensibilis', { scientificName: 'Boletus sensibilis', japaneseName: 'ミヤマイロガワリ', mycoBankId: 456 }]]),
    byJapanese: new Map(),
  };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'RENAME_TO');
  assert.strictEqual(r.daikinrinTitle, 'ミヤマイロガワリ');
});

test('classifySpecies returns EXCLUDE_NOT_MUSHROOM for Aspergillus', () => {
  const sp = { scientificName: 'Aspergillus niger', japaneseName: 'クロカビ', genus: 'Aspergillus' };
  const index = { byScientific: new Map(), byJapanese: new Map() };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'EXCLUDE_NOT_MUSHROOM');
  assert.strictEqual(r.daikinrinHit, false);
  assert.strictEqual(r.excludeReason, '子実体を形成しないカビ・酵母属 (Aspergillus)');
});

test('classifySpecies returns NEEDS_REVIEW when no daikinrin and not non-fungi', () => {
  const sp = { scientificName: 'Weird species', japaneseName: 'フシギタケ', genus: 'Weird' };
  const index = { byScientific: new Map(), byJapanese: new Map() };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'NEEDS_REVIEW');
  assert.strictEqual(r.daikinrinHit, false);
});
```

- [ ] **Step 3.2: テスト失敗を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: 前の 4 つは pass、新規 4 つが FAIL（classifySpecies not defined）。

- [ ] **Step 3.3: 実装を追記**

`scripts/phase14/normalize-tier1-names.mjs` の末尾に追記:

```javascript
import { isNonFungusGenus } from './non-fungi-genera.mjs';
import { lookupEntry } from '../phase13/daikinrin-pages.mjs';

/**
 * 種を以下の suggestion に分類する:
 *   - KEEP: 大菌輪ヒット かつ 和名一致
 *   - RENAME_TO: 大菌輪ヒット かつ 和名不一致（daikinrinTitle に候補）
 *   - EXCLUDE_NOT_MUSHROOM: 大菌輪未ヒット かつ 非キノコ属
 *   - NEEDS_REVIEW: 大菌輪未ヒット かつ 非キノコ属ではない
 *
 * @param {{scientificName: string, japaneseName: string, genus: string}} sp
 * @param {{byScientific: Map, byJapanese: Map}} daikinrinIndex
 * @returns {{suggestion: string, daikinrinHit: boolean, daikinrinTitle?: string, daikinrinScientificName?: string, excludeReason?: string}}
 */
export function classifySpecies(sp, daikinrinIndex) {
  const entry = lookupEntry(daikinrinIndex, {
    scientificName: sp.scientificName,
    japaneseName: sp.japaneseName,
  });

  if (entry) {
    const matches = entry.japaneseName === sp.japaneseName;
    return {
      suggestion: matches ? 'KEEP' : 'RENAME_TO',
      daikinrinHit: true,
      daikinrinTitle: entry.japaneseName,
      daikinrinScientificName: entry.scientificName,
    };
  }

  if (isNonFungusGenus(sp.genus)) {
    return {
      suggestion: 'EXCLUDE_NOT_MUSHROOM',
      daikinrinHit: false,
      excludeReason: `子実体を形成しないカビ・酵母属 (${sp.genus})`,
    };
  }

  return {
    suggestion: 'NEEDS_REVIEW',
    daikinrinHit: false,
  };
}
```

- [ ] **Step 3.4: テスト成功を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: 8 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add scripts/phase14/normalize-tier1-names.mjs scripts/phase14/normalize-tier1-names.test.mjs
git commit -m "feat(phase14): classifySpecies で tier1 種を 4 分類"
```

---

## Task 4: normalizeTier1 オーケストレータ

**Files:**
- Modify: `scripts/phase14/normalize-tier1-names.mjs`
- Modify: `scripts/phase14/normalize-tier1-names.test.mjs`

- [ ] **Step 4.1: 失敗するテストを追記**

`scripts/phase14/normalize-tier1-names.test.mjs` の末尾に追記:

```javascript
import { normalizeTier1 } from './normalize-tier1-names.mjs';

test('normalizeTier1 produces normalized entries with daikinrinHit and cleanedJapaneseNames', () => {
  const rankingSpecies = [
    {
      scientificName: 'Trametes versicolor',
      japaneseName: 'アイカワラタケ',
      japaneseNames: ['アイカワラタケ', 'カワラタケ', 'クモ　※クモタケ'],
      genus: 'Trametes',
      synonyms: [],
      signals: { wikiJaExists: true, inatHasPhotos: true },
      normalizationStatus: 'ACCEPTED',
      tier: 1,
    },
    {
      scientificName: 'Aspergillus niger',
      japaneseName: 'クロカビ',
      japaneseNames: ['クロカビ'],
      genus: 'Aspergillus',
      synonyms: [],
      signals: { wikiJaExists: true, inatHasPhotos: false },
      normalizationStatus: 'ACCEPTED',
      tier: 1,
    },
  ];
  const daikinrinIndex = {
    byScientific: new Map([['trametes versicolor', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 1 }]]),
    byJapanese: new Map([['アイカワラタケ', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 1 }]]),
  };

  const r = normalizeTier1(rankingSpecies, daikinrinIndex);

  assert.strictEqual(r.species.length, 2);
  assert.strictEqual(r.species[0].suggestion, 'KEEP');
  assert.deepStrictEqual(r.species[0].cleanedJapaneseNames, ['アイカワラタケ', 'カワラタケ']);
  assert.strictEqual(r.species[1].suggestion, 'EXCLUDE_NOT_MUSHROOM');

  assert.strictEqual(r.summary.total, 2);
  assert.strictEqual(r.summary.daikinrinHit, 1);
  assert.strictEqual(r.summary.autoExcludeCandidates, 1);
});
```

- [ ] **Step 4.2: テスト失敗を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: normalizeTier1 not defined で新規テスト FAIL。

- [ ] **Step 4.3: 実装を追記**

`scripts/phase14/normalize-tier1-names.mjs` の末尾に追記:

```javascript
/**
 * tier1 種全件を正規化してサマリ付き JSON 構造で返す。
 * @param {Array<object>} tier1Species ranking.json 由来の tier===1 entries
 * @param {{byScientific: Map, byJapanese: Map}} daikinrinIndex
 * @returns {{species: Array<object>, summary: {total: number, daikinrinHit: number, renameCandidates: number, autoExcludeCandidates: number, needsReview: number}}}
 */
export function normalizeTier1(tier1Species, daikinrinIndex) {
  const species = [];
  const summary = { total: 0, daikinrinHit: 0, renameCandidates: 0, autoExcludeCandidates: 0, needsReview: 0 };

  for (const sp of tier1Species) {
    const classification = classifySpecies(sp, daikinrinIndex);
    const cleanedJapaneseNames = cleanJapaneseNames(sp.japaneseNames);
    species.push({
      scientificName: sp.scientificName,
      japaneseName: sp.japaneseName,
      cleanedJapaneseNames,
      genus: sp.genus ?? null,
      synonyms: sp.synonyms ?? [],
      signals: sp.signals ?? {},
      normalizationStatus: sp.normalizationStatus ?? 'UNKNOWN',
      ...classification,
    });
    summary.total++;
    if (classification.daikinrinHit) summary.daikinrinHit++;
    if (classification.suggestion === 'RENAME_TO') summary.renameCandidates++;
    if (classification.suggestion === 'EXCLUDE_NOT_MUSHROOM') summary.autoExcludeCandidates++;
    if (classification.suggestion === 'NEEDS_REVIEW') summary.needsReview++;
  }

  return { species, summary };
}
```

- [ ] **Step 4.4: テスト成功を確認**

Run: `node --test scripts/phase14/normalize-tier1-names.test.mjs`
Expected: 9 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add scripts/phase14/normalize-tier1-names.mjs scripts/phase14/normalize-tier1-names.test.mjs
git commit -m "feat(phase14): normalizeTier1 オーケストレータを追加"
```

---

## Task 5: S1 実行 CLI

**Files:**
- Create: `scripts/phase14/normalize_tier1_names_cli.mjs`

- [ ] **Step 5.1: CLI スクリプト作成**

ファイル `scripts/phase14/normalize_tier1_names_cli.mjs`:

```javascript
/**
 * Phase 14 S1: tier1 和名正規化実行 CLI。
 * 入力: data/species-ranking.json （tier === 1 抽出）
 * 入力: .cache/phase13/daikinrin-pages.json （既キャッシュ、なければ fetch）
 * 出力: data/phase14/tier1-names-normalized.json
 *
 * Usage:
 *   node scripts/phase14/normalize_tier1_names_cli.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fetchDaikinrinPagesIndex, buildPagesIndex } from '../phase13/daikinrin-pages.mjs';
import { normalizeTier1 } from './normalize-tier1-names.mjs';

const RANKING_PATH = 'data/species-ranking.json';
const OUT_DIR = 'data/phase14';
const OUT_PATH = `${OUT_DIR}/tier1-names-normalized.json`;

async function main() {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const tier1 = (ranking.species ?? []).filter((s) => s.tier === 1);
  console.log(`tier1 species: ${tier1.length}`);

  const entries = await fetchDaikinrinPagesIndex();
  const index = buildPagesIndex(entries);
  console.log(`daikinrin entries: ${entries.length}`);

  const { species, summary } = normalizeTier1(tier1, index);

  mkdirSync(OUT_DIR, { recursive: true });
  const output = {
    generatedAt: new Date().toISOString(),
    source: `${RANKING_PATH} (ranking.generatedAt=${ranking.generatedAt})`,
    species,
    summary,
  };
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`wrote ${OUT_PATH}`);
  console.log(`summary: ${JSON.stringify(summary)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5.2: 実行してみる**

Run: `node scripts/phase14/normalize_tier1_names_cli.mjs`
Expected: 標準出力に `tier1 species: 61`、`summary: {...}` が出て `data/phase14/tier1-names-normalized.json` が生成される。

中身を目視確認:
- `summary.daikinrinHit` が 50 以上あるはず（tier1 は wikiJaExists=true 前提で十分な大菌輪カバレッジ）
- `クロカビ` 等が `EXCLUDE_NOT_MUSHROOM` になっていること

- [ ] **Step 5.3: Commit**

```bash
git add scripts/phase14/normalize_tier1_names_cli.mjs data/phase14/tier1-names-normalized.json
git commit -m "feat(phase14): S1 tier1 和名正規化 CLI + 初回実行結果"
```

---

## Task 6: intake gate + state 遷移関数

**Files:**
- Create: `scripts/phase14/confirm-lineup.mjs`
- Test: `scripts/phase14/confirm-lineup.test.mjs`

- [ ] **Step 6.1: 失敗するテストを書く**

ファイル `scripts/phase14/confirm-lineup.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeIntakeGate, applyDecision, needsDecision } from './confirm-lineup.mjs';

test('computeIntakeGate passes when wikiJaExists and daikinrinHit', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: false }, daikinrinHit: true };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: true });
});

test('computeIntakeGate passes when wikiJaExists and inatHasPhotos', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: true }, daikinrinHit: false };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: true });
});

test('computeIntakeGate fails when wikiJaExists is false', () => {
  const sp = { signals: { wikiJaExists: false, inatHasPhotos: true }, daikinrinHit: true };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: false, reason: 'no-wikipedia-ja' });
});

test('computeIntakeGate fails when neither daikinrin nor iNat', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: false }, daikinrinHit: false };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: false, reason: 'no-daikinrin-no-inat' });
});

test('needsDecision returns true for NEEDS_REVIEW', () => {
  assert.strictEqual(needsDecision({ suggestion: 'NEEDS_REVIEW' }, { pass: true }), true);
});

test('needsDecision returns true for RENAME_TO', () => {
  assert.strictEqual(needsDecision({ suggestion: 'RENAME_TO' }, { pass: true }), true);
});

test('needsDecision returns true for gate fail', () => {
  assert.strictEqual(needsDecision({ suggestion: 'KEEP' }, { pass: false, reason: 'no-wikipedia-ja' }), true);
});

test('needsDecision returns false for KEEP + gate pass', () => {
  assert.strictEqual(needsDecision({ suggestion: 'KEEP' }, { pass: true }), false);
});

test('applyDecision records exclude with reason', () => {
  const state = { decisions: {} };
  const next = applyDecision(state, 'amanita_virosa', { action: 'exclude', reason: 'test reason' });
  assert.deepStrictEqual(next.decisions.amanita_virosa, { action: 'exclude', reason: 'test reason' });
});

test('applyDecision preserves other decisions (immutable)', () => {
  const state = { decisions: { a: { action: 'include' } } };
  const next = applyDecision(state, 'b', { action: 'defer', reason: 'too obscure' });
  assert.deepStrictEqual(next.decisions.a, { action: 'include' });
  assert.deepStrictEqual(next.decisions.b, { action: 'defer', reason: 'too obscure' });
  assert.notStrictEqual(next, state);
});
```

- [ ] **Step 6.2: テスト失敗を確認**

Run: `node --test scripts/phase14/confirm-lineup.test.mjs`
Expected: FAIL "Cannot find module".

- [ ] **Step 6.3: 実装**

ファイル `scripts/phase14/confirm-lineup.mjs`:

```javascript
/**
 * Phase 14 S2: ラインナップ確定の純粋ロジック。
 * 対話 CLI は別ファイル (confirm_lineup_cli.mjs) で readline ベースに実装する。
 */

/**
 * intake gate: wikiJaExists AND (daikinrinHit OR inatHasPhotos)
 * @param {{signals: object, daikinrinHit: boolean}} sp
 * @returns {{pass: true} | {pass: false, reason: string}}
 */
export function computeIntakeGate(sp) {
  const wiki = sp.signals?.wikiJaExists === true;
  const dk = sp.daikinrinHit === true;
  const inat = sp.signals?.inatHasPhotos === true;
  if (!wiki) return { pass: false, reason: 'no-wikipedia-ja' };
  if (!dk && !inat) return { pass: false, reason: 'no-daikinrin-no-inat' };
  return { pass: true };
}

/**
 * 人間判定が必要かどうか。KEEP + gate pass のみ自動通過。
 * @param {{suggestion: string}} sp
 * @param {{pass: boolean}} gate
 * @returns {boolean}
 */
export function needsDecision(sp, gate) {
  if (!gate.pass) return true;
  if (sp.suggestion === 'KEEP') return false;
  return true;
}

/**
 * 判定結果を state に追記して新 state を返す（immutable）。
 * @param {{decisions: object}} state
 * @param {string} slug
 * @param {{action: 'include' | 'exclude' | 'defer' | 'rename', reason?: string, renameTo?: string}} decision
 * @returns {{decisions: object}}
 */
export function applyDecision(state, slug, decision) {
  return {
    ...state,
    decisions: {
      ...state.decisions,
      [slug]: decision,
    },
  };
}
```

- [ ] **Step 6.4: テスト成功を確認**

Run: `node --test scripts/phase14/confirm-lineup.test.mjs`
Expected: 9 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add scripts/phase14/confirm-lineup.mjs scripts/phase14/confirm-lineup.test.mjs
git commit -m "feat(phase14): S2 intake gate + decision 純粋ロジックを追加"
```

---

## Task 7: S2 対話 CLI

**Files:**
- Create: `scripts/phase14/confirm_lineup_cli.mjs`

- [ ] **Step 7.1: CLI スクリプト作成**

ファイル `scripts/phase14/confirm_lineup_cli.mjs`:

```javascript
/**
 * Phase 14 S2: ラインナップ確定 対話 CLI。
 * 入力:  data/phase14/tier1-names-normalized.json
 * 出力:  data/phase14/tier1-lineup-confirmed.json （1 件ごとに autosave）
 *
 * 対話操作:
 *   k = KEEP そのまま採用 (RENAME_TO でも現在の和名を採用)
 *   r = RENAME 大菌輪の正典和名に差し替え (RENAME_TO でのみ有効)
 *   e = EXCLUDE 除外 (理由入力必須)
 *   d = DEFER tier demote / 後回し (理由入力必須)
 *   ?   再表示
 *   q   中断 (再開可能)
 *
 * Usage:
 *   node scripts/phase14/confirm_lineup_cli.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { computeIntakeGate, needsDecision, applyDecision } from './confirm-lineup.mjs';

const IN_PATH = 'data/phase14/tier1-names-normalized.json';
const OUT_PATH = 'data/phase14/tier1-lineup-confirmed.json';

function slugOf(sp) {
  return sp.scientificName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function loadState() {
  if (existsSync(OUT_PATH)) {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  }
  return { generatedAt: new Date().toISOString(), decisions: {} };
}

function saveState(state) {
  mkdirSync('data/phase14', { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function formatSpecies(sp, gate) {
  return [
    `---`,
    `  scientific:  ${sp.scientificName}`,
    `  japanese:    ${sp.japaneseName}`,
    `  genus:       ${sp.genus}`,
    `  suggestion:  ${sp.suggestion}${sp.daikinrinTitle ? ` (大菌輪: ${sp.daikinrinTitle})` : ''}`,
    `  gate:        ${gate.pass ? 'PASS' : `FAIL (${gate.reason})`}`,
    `  signals:     wikiJa=${sp.signals.wikiJaExists} inat=${sp.signals.inatHasPhotos} daikinrin=${sp.daikinrinHit}`,
    `  synonyms:    ${sp.synonyms.slice(0, 3).join(', ')}${sp.synonyms.length > 3 ? ` ... (+${sp.synonyms.length - 3})` : ''}`,
  ].join('\n');
}

async function promptDecision(rl, sp, gate) {
  console.log(formatSpecies(sp, gate));
  const renameAllowed = sp.suggestion === 'RENAME_TO';
  const hint = renameAllowed ? '[k/r/e/d/?/q]' : '[k/e/d/?/q]';
  const answer = (await rl.question(`decision ${hint}: `)).trim().toLowerCase();
  if (answer === 'k') return { action: 'include', usedName: sp.japaneseName };
  if (answer === 'r' && renameAllowed) return { action: 'rename', renameTo: sp.daikinrinTitle };
  if (answer === 'e') {
    const reason = (await rl.question('exclude reason: ')).trim();
    return { action: 'exclude', reason: reason || sp.excludeReason || '(no reason)' };
  }
  if (answer === 'd') {
    const reason = (await rl.question('defer reason: ')).trim();
    return { action: 'defer', reason: reason || '(no reason)' };
  }
  if (answer === '?') return null;
  if (answer === 'q') return 'QUIT';
  console.log(`unknown: "${answer}"`);
  return null;
}

async function main() {
  const { species } = JSON.parse(readFileSync(IN_PATH, 'utf8'));
  let state = loadState();
  const rl = createInterface({ input, output });

  const queue = species.filter((sp) => {
    const slug = slugOf(sp);
    if (state.decisions[slug]) return false;
    const gate = computeIntakeGate(sp);
    return needsDecision(sp, gate);
  });

  console.log(`pending decisions: ${queue.length} / ${species.length}`);
  console.log('commands: k=keep, r=rename, e=exclude, d=defer, ?=redisplay, q=quit\n');

  for (let i = 0; i < queue.length; i++) {
    const sp = queue[i];
    const gate = computeIntakeGate(sp);
    console.log(`\n[${i + 1}/${queue.length}]`);
    let decision = null;
    while (decision === null) {
      decision = await promptDecision(rl, sp, gate);
    }
    if (decision === 'QUIT') {
      console.log('quit (state saved, re-run to resume)');
      break;
    }
    state = applyDecision(state, slugOf(sp), decision);
    saveState(state);
  }

  // 自動通過 (KEEP + gate pass) も記録
  for (const sp of species) {
    const slug = slugOf(sp);
    if (state.decisions[slug]) continue;
    const gate = computeIntakeGate(sp);
    if (sp.suggestion === 'KEEP' && gate.pass) {
      state = applyDecision(state, slug, { action: 'include', usedName: sp.japaneseName, auto: true });
    }
  }
  saveState(state);

  rl.close();
  const counts = { include: 0, exclude: 0, defer: 0, rename: 0 };
  for (const d of Object.values(state.decisions)) counts[d.action]++;
  console.log(`\ndecisions: ${JSON.stringify(counts)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 7.2: 対話実行**

Run: `node scripts/phase14/confirm_lineup_cli.mjs`
Expected: pending decisions の数が表示され、各種について対話プロンプトが出る。

**注意**: この CLI は人間判断を要求する。`q` で中断すれば状態保存され再開可能。

**判定方針ガイドライン**（実行中の参考）:
- ドクツルタケ / カエンタケ / ホンシメジ: include（gate fail でも force_include）
- 大菌輪ヒットで和名乖離 → rename（大菌輪正典に寄せる）
- クロカビ等: exclude 確認
- 不明 / obscure 種: defer（Phase 15 以降再検討）

- [ ] **Step 7.3: 結果確認 + Commit**

`data/phase14/tier1-lineup-confirmed.json` を目視:
- include が 50 件前後
- exclude が 2-5 件
- defer が 5-10 件
- rename が 0-5 件

```bash
git add scripts/phase14/confirm_lineup_cli.mjs data/phase14/tier1-lineup-confirmed.json
git commit -m "feat(phase14): S2 tier1 ラインナップ確定 CLI + 判定結果"
```

---

## Task 8: S3 buildTier1Spec 純粋関数

**Files:**
- Create: `scripts/phase14/build-tier1-spec.mjs`
- Test: `scripts/phase14/build-tier1-spec.test.mjs`

- [ ] **Step 8.1: 失敗するテストを書く**

ファイル `scripts/phase14/build-tier1-spec.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTier1Spec } from './build-tier1-spec.mjs';

test('buildTier1Spec filters out excluded and deferred decisions', () => {
  const normalized = [
    { scientificName: 'Amanita virosa', japaneseName: 'ドクツルタケ', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'ACCEPTED', suggestion: 'KEEP' },
    { scientificName: 'Aspergillus niger', japaneseName: 'クロカビ', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'ACCEPTED', suggestion: 'EXCLUDE_NOT_MUSHROOM' },
    { scientificName: 'Foo bar', japaneseName: 'フー', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'UNKNOWN', suggestion: 'NEEDS_REVIEW' },
  ];
  const confirmed = {
    decisions: {
      amanita_virosa: { action: 'include', usedName: 'ドクツルタケ' },
      aspergillus_niger: { action: 'exclude', reason: 'カビ類' },
      foo_bar: { action: 'defer', reason: 'obscure' },
    },
  };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species.length, 1);
  assert.strictEqual(spec.species[0].scientificName, 'Amanita virosa');
  assert.strictEqual(spec.species[0].japaneseName, 'ドクツルタケ');
});

test('buildTier1Spec applies rename decision (uses daikinrinTitle)', () => {
  const normalized = [
    { scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', synonyms: ['Boletus sensibilis'], cleanedJapaneseNames: ['ドクヤマドリモドキ'], normalizationStatus: 'ACCEPTED', suggestion: 'RENAME_TO', daikinrinTitle: 'ミヤマイロガワリ' },
  ];
  const confirmed = {
    decisions: {
      boletus_sensibilis: { action: 'rename', renameTo: 'ミヤマイロガワリ' },
    },
  };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species[0].japaneseName, 'ミヤマイロガワリ');
  assert.ok(spec.species[0].aliases.includes('ドクヤマドリモドキ'));
  assert.strictEqual(spec.species[0].ja_wiki_source_override.title, 'ミヤマイロガワリ');
});

test('buildTier1Spec includes synonyms and normalizationStatus', () => {
  const normalized = [
    { scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ', synonyms: ['Lactarius volemus'], cleanedJapaneseNames: ['チチタケ'], normalizationStatus: 'SYNONYM', suggestion: 'KEEP' },
  ];
  const confirmed = { decisions: { lactifluus_volemus: { action: 'include', usedName: 'チチタケ' } } };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.deepStrictEqual(spec.species[0].synonyms, ['Lactarius volemus']);
  assert.strictEqual(spec.species[0].normalizationStatus, 'SYNONYM');
});

test('buildTier1Spec records curator notes for force_include decisions', () => {
  const normalized = [
    { scientificName: 'Trichoderma cornu-damae', japaneseName: 'カエンタケ', synonyms: [], cleanedJapaneseNames: ['カエンタケ'], normalizationStatus: 'ACCEPTED', suggestion: 'NEEDS_REVIEW' },
  ];
  const confirmed = { decisions: { trichoderma_cornu_damae: { action: 'include', usedName: 'カエンタケ', reason: 'force_include: 猛毒代表種' } } };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species[0].curator_notes, 'force_include: 猛毒代表種');
});
```

- [ ] **Step 8.2: テスト失敗を確認**

Run: `node --test scripts/phase14/build-tier1-spec.test.mjs`
Expected: FAIL "Cannot find module".

- [ ] **Step 8.3: 実装**

ファイル `scripts/phase14/build-tier1-spec.mjs`:

```javascript
/**
 * Phase 14 S3: tier1-species.json 生成。
 * data/tier0-species.json と同 schema で出力。
 */

function slugOf(sci) {
  return sci.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * @param {Array<object>} normalizedSpecies S1 出力の species[]
 * @param {{decisions: Record<string, object>}} confirmed S2 出力
 * @returns {{description: string, generatedAt: string, species: Array<object>}}
 */
export function buildTier1Spec(normalizedSpecies, confirmed) {
  const out = [];
  for (const sp of normalizedSpecies) {
    const slug = slugOf(sp.scientificName);
    const d = confirmed.decisions[slug];
    if (!d || d.action === 'exclude' || d.action === 'defer') continue;

    const finalJa = d.action === 'rename' ? d.renameTo : (d.usedName ?? sp.japaneseName);

    const entry = {
      scientificName: sp.scientificName,
      japaneseName: finalJa,
      aliases: sp.cleanedJapaneseNames.filter((n) => n !== finalJa),
      synonyms: sp.synonyms,
      normalizationStatus: sp.normalizationStatus,
    };

    if (d.action === 'rename') {
      entry.ja_wiki_source_override = {
        title: d.renameTo,
        reason: `Phase 14 S2: 大菌輪正典和名に寄せる (from ${sp.japaneseName})`,
      };
    }
    if (d.reason && d.reason.startsWith('force_include')) {
      entry.curator_notes = d.reason;
    }

    out.push(entry);
  }

  return {
    description: 'Phase 14 tier1 spec. Phase 13-C の AI 合成パイプラインに入力する。',
    generatedAt: new Date().toISOString(),
    species: out,
  };
}
```

- [ ] **Step 8.4: テスト成功を確認**

Run: `node --test scripts/phase14/build-tier1-spec.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add scripts/phase14/build-tier1-spec.mjs scripts/phase14/build-tier1-spec.test.mjs
git commit -m "feat(phase14): S3 tier1-species.json 生成ロジック"
```

---

## Task 9: S3 実行 CLI

**Files:**
- Create: `scripts/phase14/build_tier1_spec_cli.mjs`

- [ ] **Step 9.1: CLI スクリプト作成**

ファイル `scripts/phase14/build_tier1_spec_cli.mjs`:

```javascript
/**
 * Phase 14 S3: tier1-species.json 実行 CLI。
 * 入力: data/phase14/tier1-names-normalized.json
 * 入力: data/phase14/tier1-lineup-confirmed.json
 * 出力: data/tier1-species.json
 *
 * Usage:
 *   node scripts/phase14/build_tier1_spec_cli.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTier1Spec } from './build-tier1-spec.mjs';

const NORMALIZED_PATH = 'data/phase14/tier1-names-normalized.json';
const CONFIRMED_PATH = 'data/phase14/tier1-lineup-confirmed.json';
const OUT_PATH = 'data/tier1-species.json';

function main() {
  const normalized = JSON.parse(readFileSync(NORMALIZED_PATH, 'utf8'));
  const confirmed = JSON.parse(readFileSync(CONFIRMED_PATH, 'utf8'));
  const spec = buildTier1Spec(normalized.species, confirmed);
  writeFileSync(OUT_PATH, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  console.log(`wrote ${OUT_PATH}: ${spec.species.length} species`);
}

main();
```

- [ ] **Step 9.2: 実行**

Run: `node scripts/phase14/build_tier1_spec_cli.mjs`
Expected: `wrote data/tier1-species.json: N species` （N は include 判定された数、見込み 50-60）。

- [ ] **Step 9.3: 中身目視確認 + Commit**

`data/tier1-species.json` を開いて、`species[]` の数・主要種（ドクツルタケ、カエンタケ、チチタケ等）が含まれることを確認。

```bash
git add scripts/phase14/build_tier1_spec_cli.mjs data/tier1-species.json
git commit -m "feat(phase14): S3 tier1-species.json 実行 + 初回生成"
```

---

## Task 10: generate_articles に --spec オプション追加

**Files:**
- Modify: `scripts/phase13/generate_articles.mjs`
- Modify: `scripts/phase13/generate_articles.test.mjs`

- [ ] **Step 10.1: 既存テストで失敗パターンを追記**

`scripts/phase13/generate_articles.test.mjs` の末尾に追記:

```javascript
import { resolveTargetsFromSpecs } from './generate_articles.mjs';

test('resolveTargetsFromSpecs merges tier0 + tier1 with deduplication', () => {
  const ranking = {
    species: [
      { scientificName: 'Amanita muscaria', japaneseName: 'ベニテングタケ', tier: 0, signals: { toxicity: 'toxic' } },
      { scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ', tier: 1, signals: { toxicity: 'edible' } },
      { scientificName: 'Random sp', japaneseName: 'ランダム', tier: 2, signals: { toxicity: 'inedible' } },
    ],
  };
  const tier0Spec = { species: [{ scientificName: 'Amanita muscaria', japaneseName: 'ベニテングタケ' }] };
  const tier1Spec = { species: [{ scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ' }] };

  const targets = resolveTargetsFromSpecs(ranking, [tier0Spec, tier1Spec]);
  assert.strictEqual(targets.length, 2);
  assert.deepStrictEqual(targets.map((t) => t.scientificName).sort(), ['Amanita muscaria', 'Lactifluus volemus']);
});

test('resolveTargetsFromSpecs uses ranking signals as source for toxicity', () => {
  const ranking = { species: [{ scientificName: 'A b', japaneseName: 'AB', tier: 1, signals: { toxicity: 'toxic' }, synonyms: ['X y'] }] };
  const spec = { species: [{ scientificName: 'A b', japaneseName: 'AB' }] };
  const targets = resolveTargetsFromSpecs(ranking, [spec]);
  assert.strictEqual(targets[0].signals.toxicity, 'toxic');
  assert.deepStrictEqual(targets[0].synonyms, ['X y']);
});

test('resolveTargetsFromSpecs applies spec-level ja_wiki_source_override', () => {
  const ranking = { species: [{ scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', tier: 1, signals: { toxicity: 'toxic' } }] };
  const spec = { species: [{ scientificName: 'Boletus sensibilis', japaneseName: 'ミヤマイロガワリ', ja_wiki_source_override: { title: 'ミヤマイロガワリ', reason: 'x' } }] };
  const targets = resolveTargetsFromSpecs(ranking, [spec]);
  assert.strictEqual(targets[0].japaneseName, 'ミヤマイロガワリ');
  assert.strictEqual(targets[0].ja_wiki_source_override.title, 'ミヤマイロガワリ');
});
```

- [ ] **Step 10.2: テスト失敗を確認**

Run: `node --test scripts/phase13/generate_articles.test.mjs`
Expected: 新規 3 テストが FAIL（resolveTargetsFromSpecs 未定義）。

- [ ] **Step 10.3: 実装追加**

`scripts/phase13/generate_articles.mjs` の `resolveTier0Targets` の次（約 27 行目以降）に追記:

```javascript
/**
 * spec ファイル配列と ranking を突合し、AI 合成対象の target 配列を返す。
 * spec の species[] にある scientificName を ranking から引いて signals/synonyms を付与。
 * 複数 spec を渡すとマージされる（dedupe は scientificName 基準）。
 *
 * @param {object} ranking species-ranking.json 全体
 * @param {Array<{species: Array<{scientificName: string, japaneseName: string, ja_wiki_source_override?: object}>}>} specs
 * @returns {Array<object>} target entries (ranking.species の形に japaneseName / override を上書き)
 */
export function resolveTargetsFromSpecs(ranking, specs) {
  const rankingMap = new Map();
  for (const s of ranking.species ?? []) {
    rankingMap.set(s.scientificName, s);
  }
  const seen = new Set();
  const targets = [];
  for (const spec of specs) {
    for (const entry of spec.species ?? []) {
      if (seen.has(entry.scientificName)) continue;
      seen.add(entry.scientificName);
      const rank = rankingMap.get(entry.scientificName);
      if (!rank) {
        throw new Error(`spec has species not in ranking.json: ${entry.scientificName}`);
      }
      targets.push({
        ...rank,
        japaneseName: entry.japaneseName,
        ja_wiki_source_override: entry.ja_wiki_source_override ?? rank.ja_wiki_source_override ?? null,
      });
    }
  }
  return targets;
}
```

同ファイルの `prepare()` 関数を以下に書き換え（冒頭付近）:

```javascript
function prepare(specPaths) {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const targets = specPaths.length > 0
    ? resolveTargetsFromSpecs(ranking, specPaths.map((p) => JSON.parse(readFileSync(p, 'utf8'))))
    : resolveTier0Targets(ranking);
  mkdirSync(PROMPTS_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const manifest = [];
  for (const t of targets) {
    const input = tier0ToPromptInput(t);
    const slug = scientificNameToSlug(t.scientificName);
    const hasCombined = existsSync(input.combinedJsonPath);
    const prompt = buildArticlePrompt({
      ...input,
      extractHint: input.jaWikiSourceOverride?.extract_hint ?? undefined,
    });
    const promptPath = `${PROMPTS_DIR}/${slug}.txt`;
    writeFileSync(promptPath, prompt, 'utf8');
    manifest.push(buildManifestEntry(t, { promptPath, hasCombined }));
  }
  writeFileSync(`${PROMPTS_DIR}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`prepared ${targets.length} targets`);
  console.log(`  with combined source: ${manifest.filter(m => m.hasCombined).length}`);
  console.log(`  missing combined source: ${manifest.filter(m => !m.hasCombined).length}`);
  console.log(`manifest: ${PROMPTS_DIR}/manifest.json`);
}
```

最下部の CLI 呼び出し部を以下に書き換え:

```javascript
const args = process.argv.slice(2);
const specPaths = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--spec' && args[i + 1]) {
    specPaths.push(args[i + 1]);
    i++;
  }
}
if (args.includes('--prepare')) {
  prepare(specPaths);
} else if (args.includes('--validate')) {
  validate();
} else {
  console.error('Usage: --prepare [--spec <path> ...]  |  --validate');
  process.exit(1);
}
```

- [ ] **Step 10.4: テスト成功を確認**

Run: `node --test scripts/phase13/generate_articles.test.mjs`
Expected: 既存 + 新規 3 テストすべて pass。

- [ ] **Step 10.5: 後方互換実行確認**

Run: `node scripts/phase13/generate_articles.mjs --prepare`
Expected: spec 指定なしで tier0 60 件の manifest が作られる（既存動作）。

- [ ] **Step 10.6: Commit**

```bash
git add scripts/phase13/generate_articles.mjs scripts/phase13/generate_articles.test.mjs
git commit -m "feat(phase14): generate_articles に --spec 複数対応を追加"
```

---

## Task 11: tier1 用 manifest 準備 + 合成実行

**Files:** (運用タスク、コード変更なし)

- [ ] **Step 11.1: manifest 生成**

Run:
```bash
node scripts/phase13/generate_articles.mjs --prepare --spec data/tier0-species.json --spec data/tier1-species.json
```
Expected: `prepared (60 + N) targets` が出る。`.cache/phase13/prompts/manifest.json` に tier0 + tier1 両方のエントリが入る。

- [ ] **Step 11.2: combined source fetch**

Run:
```bash
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```
Expected: tier0 既存分は `already cached` で SKIP、tier1 新規分のみ `.cache/phase13/combined/<slug>.json` に書き出される。

- [ ] **Step 11.3: AI 合成（subagent 並列）**

**注意**: このステップは Claude Code subagent を使って並列実行する。以下のテンプレートを使用して `Agent` ツールを concurrency 5 で発行する:

```
prompt: "以下の合成仕様に従って Phase 14 tier1 種の記事を合成してください。

入力プロンプトファイル: .cache/phase13/prompts/<slug>.txt
combined source: .cache/phase13/combined/<slug>.json
出力先: generated/articles/<slug>.json

Phase 13-C で確立したスキーマ (season 配列, sources[] 必須, safety enum, caution, notes 等) に厳密に従う。
既存の generated/articles/amanita_muscaria.json などを schema の参考にしてよい。
validator V1-V13 を pass することが必須 (特に V5 冬またぎ, V6 cooking_preservation 必須, V9 aliases 日本語のみ)。
合成が完了したら node scripts/phase13/generate_articles.mjs --validate を実行して自分の slug が pass することを確認する。
"
```

実行ログは `docs/phase13/generation-log.md` (既存) に tier1 追記セクションを作って記録する。

- [ ] **Step 11.4: validate 全件通過まで繰り返し**

Run: `node scripts/phase13/generate_articles.mjs --validate`
Expected: 全 (60 + N) 件 `pass`。fail があれば該当 slug を再合成。

- [ ] **Step 11.5: generated/articles を commit**

```bash
git add generated/articles/ .cache/phase13/prompts/manifest.json docs/phase13/generation-log.md
git commit -m "feat(phase14): tier1 N 種 AI 合成完了 (validator 全 pass)"
```

---

## Task 12: review-v2 UI に tier フィルタチップ追加

**Files:**
- Modify: `scripts/review-v2/server.mjs`
- Modify: `scripts/review-v2/` 内の HTML / JS（tier 判定が使える箇所）

- [ ] **Step 12.1: server.mjs の articles 一覧 API に tier 情報を追加**

`scripts/review-v2/server.mjs` で articles 一覧を返している箇所を特定し、各 article に `tier` フィールドを付与する。判定は `data/tier0-species.json` と `data/tier1-species.json` の `scientificName` を lookup:

```javascript
// 例: articles 一覧 API のハンドラ内
import { readFileSync } from 'node:fs';

function loadTierMap() {
  const t0 = JSON.parse(readFileSync('data/tier0-species.json', 'utf8'));
  const t1Path = 'data/tier1-species.json';
  let t1 = { species: [] };
  try { t1 = JSON.parse(readFileSync(t1Path, 'utf8')); } catch {}
  const map = new Map();
  for (const s of t0.species) map.set(s.scientificName, 0);
  for (const s of t1.species) map.set(s.scientificName, 1);
  return map;
}

// article 一覧を返す際:
const tierMap = loadTierMap();
const articles = files.map((f) => {
  const art = JSON.parse(readFileSync(`generated/articles/${f}`, 'utf8'));
  return { ...art, _tier: tierMap.get(art.names?.scientific) ?? null };
});
```

- [ ] **Step 12.2: server.mjs テスト追加**

`scripts/review-v2/server.test.mjs` に tier 付与テストを追加:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTierMap } from './server.mjs'; // export が必要

test('loadTierMap maps scientific names to tier number', () => {
  const map = loadTierMap();
  assert.ok(map.size > 0);
  // tier0 に確実にある代表種
  assert.strictEqual(map.get('Amanita muscaria'), 0);
});
```

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: pass（既存テストも含めて全 pass）。

- [ ] **Step 12.3: UI にフィルタチップ追加**

`scripts/review-v2/` 配下の sidebar HTML に以下のチップを追加（既存 UI の構造に合わせて挿入）:

```html
<div class="tier-filter" style="display:flex;gap:6px;margin:8px 0;">
  <button data-tier="all" class="tier-chip active">All</button>
  <button data-tier="0" class="tier-chip">Tier 0</button>
  <button data-tier="1" class="tier-chip">Tier 1</button>
</div>
```

JS 側でチップクリック時に `article._tier` で filter:

```javascript
let currentTierFilter = 'all';
document.querySelectorAll('.tier-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTierFilter = btn.dataset.tier;
    document.querySelectorAll('.tier-chip').forEach((b) => b.classList.toggle('active', b === btn));
    renderArticleList();
  });
});

function filterArticles(articles) {
  if (currentTierFilter === 'all') return articles;
  const t = Number(currentTierFilter);
  return articles.filter((a) => a._tier === t);
}
```

- [ ] **Step 12.4: 起動 + 目視確認**

Run: `node scripts/review-v2/server.mjs`（port 3031）

ブラウザで http://localhost:3031 を開き:
- All / Tier 0 / Tier 1 チップが表示される
- Tier 1 をクリックで tier1 分のみ表示される

- [ ] **Step 12.5: Commit**

```bash
git add scripts/review-v2/
git commit -m "feat(phase14): review-v2 UI に tier フィルタチップを追加"
```

---

## Task 13: 人間レビュー（tier1 合成結果）

**Files:** (運用タスク)

- [ ] **Step 13.1: 1st round レビュー**

Run: `node scripts/review-v2/server.mjs`

Tier 1 フィルタで tier1 分のみ表示 → 全件 3 択判定（approve / concern / reject）。
- approve → `generated/articles/approved/<slug>.json` に自動コピー
- concern → 理由メモ、次ラウンドで対応
- reject → tier demote 候補

- [ ] **Step 13.2: concern 対応**

1st round で concern 判定された記事について:
1. 問題部分を特定（セクション指定済み）
2. `.cache/phase13/prompts/<slug>.txt` を更新するか、subagent に修正依頼
3. 再合成 → validate
4. 再レビュー

- [ ] **Step 13.3: 2nd round 確定**

全件 approve or reject が確定するまで繰り返す。reject された種は `data/tier1-species.json` から除去 + `generated/articles/approved/` から削除。

想定: 2-3 ラウンドで収束（include 50-55 件 approve 確定）。

- [ ] **Step 13.4: Commit**

```bash
git add generated/articles/approved/ data/tier1-species.json
git commit -m "feat(phase14): tier1 人間レビュー完了 (N 種 approve)"
```

---

## Task 14: tier1 画像取得

**Files:** (運用タスク)

- [ ] **Step 14.1: approved slug リスト抽出 + 画像取得**

Run:
```bash
node scripts/phase13/fetch_v2_photos.mjs
```
Expected: `generated/articles/approved/` 全件を処理。tier0 既存分は `image_local` が設定済みなら SKIP。tier1 新規分のみ Wikipedia / iNaturalist から CC ライセンス画像を取得。

- [ ] **Step 14.2: hit 率確認**

実行ログで:
- Hero (Wikipedia): tier1 の N 件中 M 件（80% 目標）
- iNat (any): tier1 の N 件中 M 件（90% 目標）

下回る場合は `scientific_synonyms` フォールバックが効いているか確認。大きく下回る場合は画像なしのまま先へ進める（Google 画像検索リンクで補完）。

- [ ] **Step 14.3: Commit**

```bash
git add public/images/mushrooms/ generated/articles/approved/
git commit -m "feat(phase14): tier1 画像取得 (hero M/N, iNat M/N)"
```

---

## Task 15: build_v2_mushrooms で tier0 + tier1 マージ

**Files:**
- Modify: `scripts/phase13/build_v2_mushrooms.mjs`
- Modify: `scripts/phase13/build_v2_mushrooms.test.mjs`

- [ ] **Step 15.1: 失敗するテストを追記**

`scripts/phase13/build_v2_mushrooms.test.mjs` の末尾に追記:

```javascript
import { loadAllSourcesFromPaths } from './build_v2_mushrooms.mjs';

test('loadAllSourcesFromPaths merges tier0 and tier1 ranking entries', () => {
  const rankingSpecies = [
    { scientificName: 'A', japaneseName: 'エー', tier: 0 },
    { scientificName: 'B', japaneseName: 'ビー', tier: 1 },
    { scientificName: 'C', japaneseName: 'シー', tier: 2 },
  ];
  const tier0 = { species: [{ scientificName: 'A', japaneseName: 'エー' }] };
  const tier1 = { species: [{ scientificName: 'B', japaneseName: 'ビー' }] };

  const { rankingByScientific, tier0ByScientific } = loadAllSourcesFromPaths({
    ranking: { species: rankingSpecies },
    tierSpecs: [tier0, tier1],
  });

  assert.strictEqual(rankingByScientific.size, 2);
  assert.ok(rankingByScientific.has('A'));
  assert.ok(rankingByScientific.has('B'));
  assert.strictEqual(rankingByScientific.has('C'), false);
  assert.strictEqual(tier0ByScientific.size, 2);
  assert.ok(tier0ByScientific.has('A'));
  assert.ok(tier0ByScientific.has('B'));
});

test('buildAll works with merged tier0+tier1 maps', () => {
  const approvedFiles = ['A.json', 'B.json'];
  const rankingByScientific = new Map([
    ['A', { scientificName: 'A', signals: { toxicity: 'edible' } }],
    ['B', { scientificName: 'B', signals: { toxicity: 'toxic' } }],
  ]);
  const tier0ByScientific = new Map([
    ['A', { scientificName: 'A', japaneseName: 'エー' }],
    ['B', { scientificName: 'B', japaneseName: 'ビー' }],
  ]);
  const loader = (fname) => ({
    season: [], habitat: [], regions: [], description: 'x', features: 'y',
    similar_species: [], sources: [], caution: null, notes: null,
    names: { aliases: [] },
  });
  const { mushrooms, skipped } = buildAll({ approvedFiles, rankingByScientific, tier0ByScientific, loader });
  assert.strictEqual(mushrooms.length, 2);
  assert.strictEqual(skipped.length, 0);
});
```

- [ ] **Step 15.2: テスト失敗を確認**

Run: `node --test scripts/phase13/build_v2_mushrooms.test.mjs`
Expected: 新規テスト FAIL（loadAllSourcesFromPaths 未定義）。

- [ ] **Step 15.3: 実装変更**

`scripts/phase13/build_v2_mushrooms.mjs` の上部 path 定数を以下に変更:

```javascript
const APPROVED_DIR = 'generated/articles/approved';
const RANKING_PATH = 'data/species-ranking.json';
const TIER_SPEC_PATHS = ['data/tier0-species.json', 'data/tier1-species.json'];
const OUT_PATH = 'src/data/mushrooms.json';
const REPORT_PATH = 'data/v2-build-report.json';
```

`loadAllSources` を以下に置換:

```javascript
/**
 * path から読み込むパブリック API（既存）。
 */
function loadAllSources() {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const tierSpecs = TIER_SPEC_PATHS
    .filter((p) => existsSync(p))
    .map((p) => JSON.parse(readFileSync(p, 'utf8')));
  return loadAllSourcesFromPaths({ ranking, tierSpecs });
}

/**
 * ランキングと複数 tier spec からマージ済みマップを返す pure 関数（テスト用）。
 * @param {{ranking: object, tierSpecs: Array<object>}} args
 * @returns {{rankingByScientific: Map, tier0ByScientific: Map}}
 */
export function loadAllSourcesFromPaths({ ranking, tierSpecs }) {
  const specScientificNames = new Set();
  for (const spec of tierSpecs) {
    for (const t of spec.species ?? []) specScientificNames.add(t.scientificName);
  }

  const rankingByScientific = new Map();
  for (const s of ranking.species ?? []) {
    if (!specScientificNames.has(s.scientificName)) continue;
    rankingByScientific.set(s.scientificName, s);
  }

  const tier0ByScientific = new Map();
  for (const spec of tierSpecs) {
    for (const t of spec.species ?? []) {
      tier0ByScientific.set(t.scientificName, t);
    }
  }

  return { rankingByScientific, tier0ByScientific };
}
```

（注: 変数名 `tier0ByScientific` は既存の `buildMushroom` で使われているため維持。実際は tier0+tier1 混在マップ。変数名リネームは後続タスクの DRY 改善で行い、本タスクでは互換性を優先。）

- [ ] **Step 15.4: テスト成功を確認**

Run: `node --test scripts/phase13/build_v2_mushrooms.test.mjs`
Expected: 既存 + 新規テストすべて pass。

- [ ] **Step 15.5: Commit**

```bash
git add scripts/phase13/build_v2_mushrooms.mjs scripts/phase13/build_v2_mushrooms.test.mjs
git commit -m "feat(phase14): build_v2_mushrooms で tier0+tier1 マージ対応"
```

---

## Task 16: mushrooms.json 再ビルド + ID 衝突確認

**Files:** (運用 + 検証)

- [ ] **Step 16.1: dry-run で差分確認**

Run: `node scripts/phase13/build_v2_mushrooms.mjs --dry-run`
Expected: `built 121 mushrooms (skipped 0)`（見込み）。`similar resolved` が tier0 だけの時より向上しているはず（tier1 種が類似種として resolve されるため）。

- [ ] **Step 16.2: tier0 既存 ID が変化していないことを確認**

Run:
```bash
node -e "
const old = JSON.parse(require('fs').readFileSync('src/data/mushrooms.json', 'utf8'));
const { execSync } = require('child_process');
execSync('node scripts/phase13/build_v2_mushrooms.mjs');
const now = JSON.parse(require('fs').readFileSync('src/data/mushrooms.json', 'utf8'));
const oldIds = new Set(old.map(m => m.id));
const nowIds = new Set(now.map(m => m.id));
const missing = [...oldIds].filter(id => !nowIds.has(id));
const added = [...nowIds].filter(id => !oldIds.has(id));
console.log('tier0 missing after rebuild:', missing.length, missing);
console.log('tier1 added:', added.length);
if (missing.length > 0) process.exit(1);
"
```
Expected: `tier0 missing after rebuild: 0`、`tier1 added: N`（見込み 50-60）。

- [ ] **Step 16.3: Commit**

```bash
git add src/data/mushrooms.json data/v2-build-report.json
git commit -m "feat(phase14): mushrooms.json 再ビルド (60 → 121 種)"
```

---

## Task 17: V2ReleaseBanner を v2.1 向けに更新

**Files:**
- Modify: `src/components/layout/V2ReleaseBanner.tsx`
- Modify: `src/constants/ui-text.ts`

- [ ] **Step 17.1: ui-text 追加**

`src/constants/ui-text.ts` の `banner` セクションに v21 キーを追加（既存 v2Title/v2Body は保持）:

```typescript
  banner: {
    v2Title: 'データを刷新しました',
    v2Body: '2026 年 4 月、出典付き・人間レビュー済みの 60 種で図鑑を作り直しました。収録種は順次拡充されます。詳細は設定 > お知らせをご覧ください。',
    v21Title: '図鑑を拡充しました（v2.1）',
    v21Body: '2026 年 4 月、tier1 の N 種を追加し、合計 121 種になりました。収録種は今後も順次拡充されます。詳細は設定 > お知らせをご覧ください。',
    dismiss: '閉じる',
  },
```

（N は実際の approve 数に後で置換）

- [ ] **Step 17.2: Banner の STORAGE_KEY とテキスト参照を更新**

`src/components/layout/V2ReleaseBanner.tsx` を以下に書き換え（既存 import/structure は維持、行 8 と 40-46 を変更）:

```typescript
const STORAGE_KEY = 'v2-1-release-banner-dismissed';
```

```typescript
      aria-label="v2.1 リリース告知"
```

```typescript
          <p className="font-bold text-washi-cream mb-0.5">{UI_TEXT.banner.v21Title}</p>
          <p className="text-washi-muted">
            {UI_TEXT.banner.v21Body.split('設定 > お知らせ')[0]}
            <Link href="/settings" className="text-moss-light hover:text-washi-cream underline mx-0.5">
              設定 &gt; お知らせ
            </Link>
            {UI_TEXT.banner.v21Body.split('設定 > お知らせ')[1] ?? ''}
          </p>
```

- [ ] **Step 17.3: dev server で目視確認**

Run: `npm run dev`（既定 port は次のフリーポート、通常 3000）

ブラウザで http://localhost:3000 を開き:
- 初回アクセスで v2.1 バナーが表示される
- × を押すと localStorage に `v2-1-release-banner-dismissed=true` が保存される
- リロードしても再表示されない

（旧 v2-release-banner-dismissed を true にしていた既ユーザーも、新 key なので再度告知される）

- [ ] **Step 17.4: Commit**

```bash
git add src/components/layout/V2ReleaseBanner.tsx src/constants/ui-text.ts
git commit -m "feat(phase14): V2ReleaseBanner を v2.1 向けに更新 (key も更新)"
```

---

## Task 18: 設定 > お知らせ に v2.1 エントリ追加

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 18.1: 既存 v2 エントリの直下に v2.1 エントリを追加**

`src/app/settings/page.tsx` のお知らせセクションで v2 エントリが記述されている箇所を探し、その**直前**に（新しい順で表示するため）v2.1 エントリを挿入。以下のテンプレート:

```tsx
<article className="rounded-lg border border-soil-elevated bg-soil-surface p-4">
  <header className="mb-2">
    <h3 className="font-serif-display text-lg text-washi-cream">図鑑を拡充しました（v2.1）</h3>
    <p className="mono-data text-xs text-washi-dim uppercase tracking-wider">2026-04 / tier1 拡充</p>
  </header>
  <div className="text-sm leading-relaxed text-washi-muted space-y-2">
    <p>
      tier1 の N 種を追加し、合計 <strong>121 種</strong> になりました。追加された種も v2.0 と同じ
      「出典付き・人間レビュー済み」の基準で合成しています。
    </p>
    <p>
      データ元: GBIF Backbone Taxonomy（学名）/ 日本産菌類集覧（日本菌学会, CC BY 4.0）/ 大菌輪（和名の正典）/ Wikipedia ja/en / iNaturalist （画像）。
    </p>
    <p className="text-xs text-washi-dim">
      既存のブックマーク・記録はそのまま維持されます。新規種の bookmark・記録は通常通り登録できます。
    </p>
  </div>
</article>
```

（N は実際の approve 数）

- [ ] **Step 18.2: dev server で目視確認**

Run: `npm run dev`
ブラウザで http://localhost:3000/settings を開き、お知らせセクションに v2.1 エントリが表示されていることを確認。

- [ ] **Step 18.3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(phase14): 設定 > お知らせに v2.1 エントリを追加"
```

---

## Task 19: README.md 更新

**Files:**
- Modify: `README.md`

- [ ] **Step 19.1: v2.0 リリース告知の直後に v2.1 追記セクション**

`README.md` の v2.0 リリース告知セクションを探し、種数を 60 → 121 に更新、または v2.1 追記セクションを追加。以下を参考に:

```markdown
## v2.1 リリース (2026-04)

tier1 の N 種を追加し、図鑑の収録種が 121 種になりました。v2.0 と同じく出典付き・人間レビュー済みの
合成パイプラインで生成されています。

### データソース (変更なし)

- **学名**: [GBIF Backbone Taxonomy](https://www.gbif.org/species/search)
- **和名**: [日本産菌類集覧](https://www.mycology-jp.org/)（日本菌学会, CC BY 4.0）
- **和名の正典突合**: [大菌輪](https://mycoscouter.coolblog.jp/daikinrin/)
- **本文記述**: Wikipedia ja/en, Claude Opus 4.6 合成 + 人間レビュー
- **画像**: Wikipedia (CC), iNaturalist Research Grade (CC)
```

- [ ] **Step 19.2: Commit**

```bash
git add README.md
git commit -m "docs(phase14): README に v2.1 リリース記載を追加"
```

---

## Task 20: e2e テスト更新

**Files:**
- Modify: `e2e/zukan.spec.ts`

- [ ] **Step 20.1: 種数期待値を 60 → 121 に更新**

`e2e/zukan.spec.ts` 内で `60` がハードコードされている箇所を探し（例: `expect(rows).toHaveLength(60)` や `expect(count).toBe(60)`）、121（または `>=` アサーションなら `>= 121`）に変更。

- [ ] **Step 20.2: tier1 代表種の詳細ページテストを追加**

`zukan.spec.ts` に tier1 の代表種（例: チチタケ `lactifluus_volemus`）の詳細ページが表示できるテストを追加:

```typescript
test('zukan detail page renders a tier1 species (Lactifluus volemus)', async ({ page }) => {
  await page.goto('/zukan/lactifluus_volemus');
  await expect(page.getByRole('heading', { name: 'チチタケ' })).toBeVisible();
  await expect(page.getByText('Lactifluus volemus')).toBeVisible();
  // sources セクションが表示されている
  await expect(page.getByText(/出典|sources/i)).toBeVisible();
});
```

- [ ] **Step 20.3: e2e 実行**

Run: `npm run test:e2e`（または `npx playwright test e2e/zukan.spec.ts`）
Expected: すべて pass。

- [ ] **Step 20.4: Commit**

```bash
git add e2e/zukan.spec.ts
git commit -m "test(phase14): e2e を 121 種 + tier1 slug 対応に更新"
```

---

## Task 21: 総合検証 + リリース

**Files:** (最終検証)

- [ ] **Step 21.1: 全 unit test 通過**

Run: `npm test`
Expected: 既存 455 + Phase 14 追加分（見込み +25）= 約 480 tests pass。

- [ ] **Step 21.2: 本番ビルド成功**

Run: `npm run build`
Expected: 121 個の v2 species pages + static export 成功。エラーなし。

- [ ] **Step 21.3: lint**

Run: `npm run lint`
Expected: error 0。warning があれば対応。

- [ ] **Step 21.4: dev server で目視確認（チェックリスト）**

Run: `npm run dev`

ブラウザで以下を確認:
- [ ] 起動時に v2.1 バナーが表示される（初回のみ）
- [ ] `/zukan` でリスト表示、件数が 121 になっている
- [ ] `/zukan?tab=list&sort=kana` で五十音順ソート、tier1 種（チチタケ等）が正しい位置に入る
- [ ] tier1 種の詳細ページ（例: `/zukan/lactifluus_volemus`）で sources セクション、caution、similar species が表示される
- [ ] `/settings` > お知らせセクションに v2.1 エントリ
- [ ] 既存 bookmarks / records が維持されている（migration 不要を実証）
- [ ] 新規種を bookmark → 新規記録登録できる

- [ ] **Step 21.5: progress.md 更新**

`docs/progress.md` に Phase 14 完了記録を追加（既存 Phase 13-F セクションと同じフォーマット）:

```markdown
## Phase 14: v2 図鑑拡充（tier1 合成） — 完了 (2026-04-XX)

計画書: `docs/superpowers/plans/2026-04-16-phase14-tier1-expansion.md`
設計書: `docs/superpowers/specs/2026-04-16-phase14-tier1-expansion-design.md`

### Step 1-4: 事前キュレーション
- [x] S1 和名正規化 (normalize_tier1_names.mjs + tests)
- [x] S2 ラインナップ確定 対話 CLI (confirm_lineup + tests)
- [x] S3 tier1-species.json 生成 (build_tier1_spec + tests)

### Step 5-6: AI 合成
- [x] generate_articles.mjs に --spec 複数対応追加
- [x] tier1 N 種の manifest 準備 → combined fetch → subagent 並列合成 → validate 全 pass

### Step 7: 人間レビュー
- [x] review-v2 UI に tier フィルタチップ追加
- [x] tier1 N 件 approve 確定

### Step 8: 画像取得
- [x] Hero (Wikipedia): M/N (%)
- [x] iNat (any): M/N (%)

### Step 9: ビルド + リリース
- [x] build_v2_mushrooms で tier0+tier1 マージ
- [x] src/data/mushrooms.json 121 種更新 (tier0 既存 ID 保持)
- [x] V2ReleaseBanner v2.1 対応 (storage key 刷新)
- [x] 設定 > お知らせ v2.1 エントリ追加
- [x] README v2.1 追記

### 検証
- [x] Unit tests: 480 PASS
- [x] Build: static export 成功 (121 pages)
- [x] Dev server: 目視確認完了
- [x] E2E: zukan.spec.ts 更新後全 pass
```

- [ ] **Step 21.6: Commit + push**

```bash
git add docs/progress.md
git commit -m "docs(phase14): progress.md に Phase 14 完了記録を追加"
git push origin main
```

- [ ] **Step 21.7: Vercel 本番反映確認**

数分待って https://myco-note.vercel.app/ を開く:
- [ ] 121 種表示
- [ ] v2.1 バナー
- [ ] tier1 種の詳細ページ

---

## Self-review checklist

- [x] Phase 14-A S1/S2/S3 → Task 1-9 (全カバー)
- [x] Phase 14-B AI 合成パイプライン拡張 → Task 10-11
- [x] Phase 14-C レビュー → Task 12-13
- [x] Phase 14-D 画像取得 → Task 14
- [x] Phase 14-E ビルド + リリース → Task 15-21
- [x] テスト方針（約 25 追加）→ Task 1, 2, 3, 4, 6, 8, 10, 15, 20 でカバー
- [x] ID 衝突チェック → Task 16 Step 2
- [x] DB migration 不要確認 → Task 21 Step 4 の目視チェックリスト
- [x] 既存 bookmarks/records の維持確認 → Task 21 Step 4
- [x] 後方互換性（tier0 単独動作維持）→ Task 10 Step 5
