# Phase 13-B': シノニム正規化層の追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 13-B のスコアリング層に **GBIF accepted name 正規化 + synonyms フォールバック** を導入し、新旧学名の乖離で発生していた (1) tier0 指名の取りこぼし (2) 候補プールの重複 (3) 外部 API のシグナル取りこぼし を解消する。Phase 12 で検出されていたシノニム問題（例: `Amanita caesareoides` ↔ `A. hemibapha`）を Phase 13 の実行パスで恒常的に解決する。

**Architecture:** Phase 12 の `scripts/gbif-resolve.mjs` パターンと Phase 13-A のキャッシュ層を再利用し、新規 `gbif-normalize.mjs` モジュールで学名 → `{ acceptedName, acceptedUsageKey, synonyms[], status }` への正規化を集約する。候補プール構築・tier0 照合・全シグナル収集器で正規化結果を共有利用する。

**Tech Stack:** 変更なし（Node.js 20+, ES Modules, vitest, native fetch）。

---

## 設計書参照

本計画は `docs/superpowers/plans/2026-04-13-phase13b-species-selection-scoring.md` の拡張であり、Phase 13-A の成果物 (`scripts/phase13/cache.mjs` 他) と Phase 12 の成果物 (`scripts/gbif-resolve.mjs`, `scripts/lib/species-match.mjs`) を前提とする。

---

## 背景: 現状の問題

### 既存の Phase 13-B 実行で判明した事象

本番実行（3,145 候補）の結果、`data/tier0-species.json` 73 entries のうち実際に `tier=0` 分類されたのは 52 件。欠落 19 件の原因:

1. **tier0 側のスペルミス (2件)**: `Amanita virginoides`, `Omphalotus guepiniiformis`
2. **新旧学名の不一致 (13件)**: tier0 は v1 MycoNote DB（新学名）由来、checklist は菌類集覧（旧学名）由来
   - 例: `Amanita caesareoides` (tier0) ↔ `Amanita hemibapha` (checklist)
3. **和名のみで一致するが別分類群の疑い (4件)**: 人間判断が必要、本計画の対象外

### Phase 13-B のシノニム対応状況（問題の分布）

| モジュール | 現状 |
|---|---|
| `candidate-pool.mjs` | ❌ 学名完全一致でキー化。旧名/新名は別候補 |
| `mycobank-resolve.mjs` | ⚠️ GBIF `usageKey` は取得するが `acceptedUsageKey` を辿らない |
| `wikipedia-exists.mjs` | ❌ 入力学名そのままクエリ |
| `inat-photos.mjs` | ❌ 入力学名そのままクエリ |
| `gbif-observations.mjs` | ❌ 入力学名そのままクエリ |
| `build_ranking.mjs` | ❌ tier0 との照合は文字列完全一致、pool 不在なら黙って脱落 |

---

## File Structure

```
scripts/phase13/
├── gbif-normalize.mjs            # 新規: 学名 → accepted name + synonyms 解決
├── gbif-normalize.test.mjs       # 新規
├── candidate-pool.mjs            # 改修: accepted name で dedupe, synonyms 付与
├── candidate-pool.test.mjs       # テスト追加
├── wikipedia-exists.mjs          # 改修: synonyms fallback
├── wikipedia-exists.test.mjs     # テスト追加
├── inat-photos.mjs               # 改修: synonyms fallback
├── inat-photos.test.mjs          # テスト追加
├── gbif-observations.mjs         # 改修: acceptedUsageKey を直接使用
├── gbif-observations.test.mjs    # テスト追加
├── mycobank-resolve.mjs          # 改修: acceptedUsageKey 経由
├── mycobank-resolve.test.mjs     # テスト追加
├── build_ranking.mjs             # 改修: tier0 正規化 + 強制追加, pool 正規化
├── build_ranking.test.mjs        # テスト追加
└── fixtures/
    ├── gbif-normalize-accepted.json      # 新規: ACCEPTED ケース
    ├── gbif-normalize-synonym.json       # 新規: SYNONYM ケース
    ├── gbif-normalize-unknown.json       # 新規: 未解決ケース
    └── gbif-synonyms-amanita-hemibapha.json  # 新規: synonyms list fixture
```

**責任分離:**
- `gbif-normalize.mjs` のみが GBIF の `status/acceptedUsageKey` を解釈する。他モジュールは正規化済の `{ scientificName, acceptedName, synonyms[] }` を受け取る。
- シグナル収集器は「accepted を試す → miss なら synonyms を順に試す」の共通プロトコルに従う。
- `.cache/phase13/` 名前空間を共有（既存 `gbif-match`, `gbif-species` に加えて新規 `gbif-synonyms`）。

---

## Task 1: `gbif-normalize.mjs` 新規作成

**Files:**
- Create: `scripts/phase13/gbif-normalize.mjs`
- Create: `scripts/phase13/gbif-normalize.test.mjs`
- Create: `scripts/phase13/fixtures/gbif-normalize-accepted.json`
- Create: `scripts/phase13/fixtures/gbif-normalize-synonym.json`
- Create: `scripts/phase13/fixtures/gbif-normalize-unknown.json`
- Create: `scripts/phase13/fixtures/gbif-synonyms-amanita-hemibapha.json`

**目的:** 学名を入力として、GBIF Backbone Taxonomy で accepted name に正規化し synonyms を列挙する単一責務モジュール。

- [ ] **Step 1: 失敗するテストを書く**

テスト要件:
1. `normalizeName('Morchella esculenta')` が ACCEPTED ケースを正しく処理
2. `normalizeName('Amanita hemibapha')` が SYNONYM ケースで accepted 寄せ + synonyms 列挙
3. GBIF match が返らないケースで `status: 'UNKNOWN'`, acceptedName = input にフォールバック
4. キャッシュヒット時に fetch を呼ばない
5. 同一 accepted に複数の入力が来た場合、synonyms は必ず unique

- [ ] **Step 2: 実装**

API 仕様:
```javascript
/**
 * @param {string} scientificName
 * @param {{ fetchFn?, matchCache?, synonymsCache? }} opts
 * @returns {Promise<{
 *   input: string,
 *   acceptedName: string,      // ACCEPTED の場合 = input, SYNONYM の場合 = acceptedUsage.canonicalName, UNKNOWN の場合 = input
 *   acceptedUsageKey: number | null,
 *   synonyms: string[],         // input, acceptedName を除いた unique リスト
 *   status: 'ACCEPTED' | 'SYNONYM' | 'DOUBTFUL' | 'UNKNOWN'
 * }>}
 */
export async function normalizeName(scientificName, opts = {}) { ... }
```

実装方針:
- `fetchGbifMatch` と `fetchGbifSpecies` は `mycobank-resolve.mjs` から共通化（または同等ロジック）
- 新規 `fetchGbifSynonyms(usageKey)`: `GET /v1/species/{key}/synonyms?limit=100` → `results[]` から `canonicalName` を抽出
- エラー時は `status: 'UNKNOWN'`, acceptedName = input で返す（throw しない）
- cache namespace: `gbif-synonyms`

- [ ] **Step 3: テストを通す**

Run: `npx vitest run scripts/phase13/gbif-normalize.test.mjs`
Expected: 全テスト pass

- [ ] **Step 4: commit**
```
git add scripts/phase13/gbif-normalize.mjs scripts/phase13/gbif-normalize.test.mjs scripts/phase13/fixtures/gbif-normalize-*.json scripts/phase13/fixtures/gbif-synonyms-*.json
git commit -m "feat(phase13b-prime): gbif normalize module (accepted name + synonyms)"
```

---

## Task 2: `candidate-pool.mjs` 改修（accepted で dedupe）

**Files:**
- Modify: `scripts/phase13/candidate-pool.mjs`
- Modify: `scripts/phase13/candidate-pool.test.mjs`

**目的:** checklist 由来の全候補を normalize し、accepted name で dedupe する。旧名の wamei は accepted エントリの `japaneseNames[]` に統合される。

- [ ] **Step 1: テスト追加**

新規テストケース:
1. 同一 accepted の 2 候補（例: `Amanita caesareoides` + `Amanita hemibapha`）が 1 つにマージされ、wamei が配列結合される
2. `synonyms[]` フィールドが各候補に付与される
3. `status: 'UNKNOWN'` の候補は元の学名のまま残る（fallback 動作）

- [ ] **Step 2: API 変更**

```javascript
// before
export function buildCandidatePool(checklistEntries) { ... }

// after
export async function buildCandidatePool(checklistEntries, opts = {}) {
  // opts.normalizeName: injectable for testing
  // 1. 従来通り checklist を species-level + wamei ありでフィルタ
  // 2. 各候補を await opts.normalizeName(scientificName)
  // 3. acceptedName をキーに Map で dedupe、wamei を union
  // 4. 返り値: [{ scientificName (= acceptedName), originalNames[], japaneseName, japaneseNames[], genus, species, synonyms[], status }]
}
```

注意:
- `scientificName` は **accepted name** に差し替える（ダウンストリームの全ロジックでここが主キー）
- `originalNames[]` に元の入力学名を保持（トレース用）
- 並列実行: `Promise.all` で normalize。concurrency 制限は呼び出し側で行う

- [ ] **Step 3: テスト通す**

Run: `npx vitest run scripts/phase13/candidate-pool.test.mjs`

- [ ] **Step 4: commit**
```
git commit -m "feat(phase13b-prime): normalize candidate pool via gbif accepted names"
```

---

## Task 3: シグナル収集器に synonyms fallback 追加

**Files:**
- Modify: `scripts/phase13/wikipedia-exists.mjs` + test
- Modify: `scripts/phase13/inat-photos.mjs` + test
- Modify: `scripts/phase13/gbif-observations.mjs` + test
- Modify: `scripts/phase13/mycobank-resolve.mjs` + test

**目的:** 各コレクタに「accepted 試行 → miss なら synonyms を順に試す」を実装。どのシノニムでヒットしたかを返り値に含める。

- [ ] **Step 1: wikipedia-exists.mjs**

API 変更:
```javascript
// before: checkWikipediaJaExists(candidate) where candidate = { scientificName, japaneseName, japaneseNames }
// after: checkWikipediaJaExists(candidate) where candidate additionally has { synonyms: string[] }
//   内部動作: 従来通り和名で検索。和名 miss なら accepted, 次に synonyms[] を順に試す（学名記事は en 優先だが ja 記事も学名存在しうる）
//   返り値追加: matchedVia: 'japaneseName' | 'accepted' | 'synonym:<name>' | null
```

- [ ] **Step 2: inat-photos.mjs**

API 変更:
```javascript
// 検索プロトコル: accepted → synonyms[] の順に /v1/taxa?q= を試し、最初に hasPhotos=true の taxon を採用
// 返り値追加: matchedName: string | null
```

- [ ] **Step 3: gbif-observations.mjs**

**重要**: GBIF occurrence search は `taxonKey` で指定すると synonyms を自動包含する。`candidate.acceptedUsageKey` があればそれを優先使用し、**shallow な synonyms fallback は不要**。ない場合のみ scientificName で試行。

API 変更:
```javascript
// fetchGbifObservations(candidate)
//   if candidate.acceptedUsageKey: use taxonKey=... (synonyms 包含)
//   else: 従来通り scientificName= で試行
```

- [ ] **Step 4: mycobank-resolve.mjs**

`acceptedUsageKey` があればそれを `fetchGbifSpecies` に渡す（従来は match.usageKey）。Phase 12 の既知 issue（GBIF identifiers に MycoBank が入っていない）は解決しないが、誤った usageKey で探す無駄を削減。

- [ ] **Step 5: テスト通す**

Run: `npx vitest run scripts/phase13/wikipedia-exists.test.mjs scripts/phase13/inat-photos.test.mjs scripts/phase13/gbif-observations.test.mjs scripts/phase13/mycobank-resolve.test.mjs`

- [ ] **Step 6: commit**
```
git commit -m "feat(phase13b-prime): synonyms fallback across signal collectors"
```

---

## Task 4: `build_ranking.mjs` 改修（tier0 正規化 + 強制追加）

**Files:**
- Modify: `scripts/phase13/build_ranking.mjs`
- Modify: `scripts/phase13/build_ranking.test.mjs`

**目的:** tier0 指名も normalize し、pool に存在しない場合は強制的に enrich 対象に追加する。照合は accepted name ベース。

- [ ] **Step 1: テスト追加**

1. tier0 の旧名（例: `Amanita caesareoides`）が、pool の accepted 名（`Amanita hemibapha`）と正しくマッチして tier=0 になる
2. tier0 指名が pool に全く存在しない（GBIF 未解決）場合、強制追加されて enrich・ranking 対象に含まれる
3. tier0 重複登録（同一 accepted）は 1 エントリに統合される

- [ ] **Step 2: 実装**

```javascript
// main() 内の変更:
// 1. pool = await buildCandidatePool(checklist, { normalizeName })  // 既に normalize 済
// 2. tier0Normalized = await Promise.all(tier0Doc.species.map(e => normalizeName(e.scientificName)))
// 3. tier0AcceptedSet = new Set(tier0Normalized.map(n => n.acceptedName))
// 4. pool に accepted で無い tier0 エントリは、仮候補として pool に push（japaneseName は tier0 doc から継承）
// 5. ranking 時の tier=0 判定は scientificName (= acceptedName) in tier0AcceptedSet
```

- [ ] **Step 3: テスト通す**

- [ ] **Step 4: commit**
```
git commit -m "feat(phase13b-prime): tier0 normalized matching + force-inclusion in pool"
```

---

## Task 5: tier0-species.json の typo 修正

**Files:**
- Modify: `data/tier0-species.json`

**目的:** Task 1-4 で学名正規化が効くようになっても、明らかな typo は別途修正が必要。

- [ ] **Step 1: 2 件修正**
- `Amanita virginoides` → `Amanita virgineoides` (オオシロオニタケの正しい学名)
- `Omphalotus guepiniiformis` → `Omphalotus guepiniformis` (`i` 重複削除)

- [ ] **Step 2: `Lactarius hatsudake` 重複整理**
同一学名・異なる和名（ハツタケ/アカハツ）で 2 エントリ登録されている。accepted 正規化で自動 dedupe されるが、ドキュメント側も 1 行に統合し `japaneseNames: ['ハツタケ', 'アカハツ']` とする。

- [ ] **Step 3: commit**
```
git commit -m "fix(phase13b-prime): tier0 species typos and duplicates"
```

---

## Task 6: スモーク実行（`--limit 500 --concurrency 3`）

- [ ] **Step 1: cache ウォームアップ確認**

既存 `.cache/phase13/gbif-match` は 3,145 件分存在。synonyms 層は新規なので 500 候補 × 新 fetch が発生。

- [ ] **Step 2: スモーク実行**
```bash
node scripts/phase13/build_ranking.mjs --limit 500 --concurrency 3
```

- [ ] **Step 3: 期待する結果**
- tier0=8〜10（500 件範囲内での tier0 数、従来 9 件から増減は 0 〜 +2）
- Wikipedia ja ヒット率: 従来 48/500 → +10% 以上の改善を期待
- iNat ヒット率: 従来 131/500 → +5% 以上
- エラーなく完走

- [ ] **Step 4: 問題なければ次タスクへ**

---

## Task 7: 全量本番実行

- [ ] **Step 1: 全量実行**
```bash
node scripts/phase13/build_ranking.mjs --concurrency 3
```

- [ ] **Step 2: 検証**
- tier0 カウントが `tier0-species.json` の unique accepted 数と一致
- 上位 30 件目視（従来と同等かそれ以上の妥当性）
- 各種シグナルヒット率比較（before/after）

- [ ] **Step 3: ユーザーレビュー**

上位 30 件をユーザーに提示して承認を得る。

---

## Task 8: docs 更新 + commit

**Files:**
- Modify: `docs/phase13/README.md`
- Modify: `docs/progress.md`
- Create: ranking の before/after 統計を簡潔に追記

- [ ] **Step 1: `docs/phase13/README.md`**
Phase 13-B' の成果を追記（シノニム正規化層、before/after 統計）。

- [ ] **Step 2: `docs/progress.md`**
Phase 13-B 完了セクションに「Phase 13-B' シノニム正規化追補」を追加。

- [ ] **Step 3: commit**
```
git add docs/ data/species-ranking.json data/tier0-species.json
git commit -m "docs(phase13b-prime): record synonym normalization outcomes"
```

---

## Task 9: 完了確認 + worktree マージ

- [ ] 全テスト pass (`npx vitest run scripts/phase13/`)
- [ ] 上位 30 件がユーザー承認済
- [ ] tier0 カウント一致を確認
- [ ] worktree → main マージはユーザー承認後に実施

---

## 懸念事項・トレードオフ

| 項目 | 対応 |
|---|---|
| GBIF API 負荷 | 全 3,145 候補に synonyms fetch 追加（新規 ~3,145 req）。concurrency 3 維持、User-Agent 設定継続 |
| 実行時間 | 初回 +30〜45 分（synonyms cache 構築）。2 回目以降 cache で 5 分以下 |
| tier0 重複（ハツタケ/アカハツ問題） | accepted で自動統合。ドキュメント側も整理 |
| C カテゴリ 4 件（和名衝突疑い） | **本計画のスコープ外**。ユーザー判断後に別途 tier0 から削除 or 保留 |
| D カテゴリ 3 件（GBIF 未収録） | Task 4 の「強制追加」で救済。ただし他のシグナルも miss するため低スコアになる可能性あり |
| v1 mushrooms.json の学名更新 | 本計画の非スコープ。`species-corrections.json` で別途対応 |

---

## 成功基準

1. `data/tier0-species.json` の unique accepted 学名数 = `species-ranking.json` の `tier0Count`
2. Wikipedia ja / iNat ヒット率が従来比で改善
3. 既存テスト全パス + 新規テスト全パス
4. 上位 30 件の妥当性が従来と同等以上
