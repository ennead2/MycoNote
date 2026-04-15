# Phase 13-A Hotfix: 大菌輪 fetcher を pages.json 駆動に置き換え

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `scripts/phase13/daikinrin.mjs` の MycoBank ID 解決を GBIF 依存（0 件解決）から大菌輪公式 `pages.json`（50,686 件の全種インデックス、MycoBank ID 埋め込み）駆動に置き換え、tier0 62 種の combined JSON を再取得する。

**Architecture:** 大菌輪の `search_page.html` が内部で使っている `https://mycoscouter.coolblog.jp/daikinrin/pages.json`（7.7MB, 50,686 エントリ）を 1 度 fetch して `.cache/phase13/daikinrin-pages.json` にキャッシュ。各エントリから `(scientificName → mycoBankId, japaneseName → mycoBankId)` の双方向マップを構築。`fetchDaikinrinPage(scientificName, japaneseName)` は内部でマップから ID を引いて既存の `buildPageUrl` で URL を組み立てる。URL 形式は変更せず、ID 解決経路だけを差し替える。

**Tech Stack:** Node.js 20+, ES Modules, vitest, native fetch。新規依存なし。

**前提コンテキスト**:
- 既知 caveat: 「MycoBank ID は GBIF identifiers に未登録のため 0 件解決」→ 大菌輪 fetch が全失敗
- 調査で判明: `pages.json` は全種エントリを `{file, japanese_name, GBIF_kokunai, GBIF_kaigai}` 形式で保持
- `file` フィールドは `<Scientific_Name>_<MycoBankId>.html` 形式 → 学名と ID が埋め込み済み
- 旧 URL `/Pages/<Sci_Name>_<MBID>.html` は引き続き有効、既存 `buildPageUrl` は再利用可能

---

## Task 1: pages.json parser モジュール `daikinrin-pages.mjs`

**Files:**
- Create: `scripts/phase13/daikinrin-pages.mjs`
- Create: `scripts/phase13/daikinrin-pages.test.mjs`
- Create: `scripts/phase13/fixtures/daikinrin-pages-sample.json`

- [ ] **Step 1: fixture を作成（実データから抜粋した最小サンプル）**

`scripts/phase13/fixtures/daikinrin-pages-sample.json`:

```json
[
  {
    "file": "Lentinula_edodes_316467.html",
    "japanese_name": "シイタケ",
    "GBIF_kokunai": 150,
    "GBIF_kaigai": 1150
  },
  {
    "file": "Amanita_caesareoides_447788.html",
    "japanese_name": "タマゴタケ",
    "GBIF_kokunai": 190,
    "GBIF_kaigai": 50
  },
  {
    "file": "Amanita_virosa_123456.html",
    "japanese_name": "ドクツルタケ",
    "GBIF_kokunai": 200,
    "GBIF_kaigai": 300
  },
  {
    "file": "Clitocybe_rufoalutacea_999999.html",
    "japanese_name": null,
    "GBIF_kokunai": 0,
    "GBIF_kaigai": 10
  },
  {
    "file": "Aaosphaeria_genus.html",
    "japanese_name": null,
    "GBIF_kokunai": 0,
    "GBIF_kaigai": 597
  }
]
```

注: `Aaosphaeria_genus.html` のような属レベルエントリ（MycoBank ID なし）が実データに混ざっているため、parser はこれをスキップする。

- [ ] **Step 2: 失敗するテストを書く**

`scripts/phase13/daikinrin-pages.test.mjs`:

```javascript
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
```

- [ ] **Step 3: テストを実行して fail することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-pages.test.mjs`
Expected: FAIL — `parsePagesJson` 未定義

- [ ] **Step 4: `daikinrin-pages.mjs` を実装**

`scripts/phase13/daikinrin-pages.mjs`:

```javascript
/**
 * 大菌輪の公式インデックス pages.json の fetch + parse + キャッシュ + ルックアップ。
 *
 * 旧 fetcher は MycoBank ID が必要だが GBIF に登録されていないため 0 件解決だった。
 * このモジュールは大菌輪公式の全種インデックスを起点に ID を解決する。
 *
 * pages.json の 1 エントリ:
 *   { "file": "Lentinula_edodes_316467.html", "japanese_name": "シイタケ", "GBIF_kokunai": 150, "GBIF_kaigai": 1150 }
 *
 * file フィールドは <Scientific_Name>_<MycoBankId>.html 形式で ID が埋め込み済み。
 * 属レベルエントリ（<Genus>_genus.html）は MycoBank ID を持たないためスキップする。
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const PAGES_CACHE_PATH = join(CACHE_DIR, 'daikinrin-pages.json');

const PAGES_URL = 'https://mycoscouter.coolblog.jp/daikinrin/pages.json';
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';

// <ScientificName>_<mycoBankId>.html を解析する正規表現。
// 学名部分はアンダースコア区切り、末尾アンダースコア + 数値 + .html。
const FILENAME_RE = /^(.+)_(\d+)\.html$/;

/**
 * pages.json の raw 配列を parse して種レベル entries に変換。
 * @param {{ file: string, japanese_name: string | null, GBIF_kokunai?: number, GBIF_kaigai?: number }[]} raw
 * @returns {{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]}
 */
export function parsePagesJson(raw) {
  const entries = [];
  for (const row of raw) {
    if (!row?.file) continue;
    const m = FILENAME_RE.exec(row.file);
    if (!m) continue; // <Genus>_genus.html 等の非種エントリは除外
    const scientificName = m[1].replace(/_/g, ' ');
    const mycoBankId = parseInt(m[2], 10);
    if (!Number.isFinite(mycoBankId)) continue;
    entries.push({
      scientificName,
      japaneseName: row.japanese_name || null,
      mycoBankId,
    });
  }
  return entries;
}
```

- [ ] **Step 5: テストを実行して pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-pages.test.mjs`
Expected: PASS — 5 tests ok

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/daikinrin-pages.mjs scripts/phase13/daikinrin-pages.test.mjs scripts/phase13/fixtures/daikinrin-pages-sample.json
git commit -m "feat(phase13a-hotfix): parsePagesJson で大菌輪 pages.json を解析"
```

---

## Task 2: lookupMycoBankId + fetchDaikinrinPagesIndex

**Files:**
- Modify: `scripts/phase13/daikinrin-pages.mjs`
- Modify: `scripts/phase13/daikinrin-pages.test.mjs`

- [ ] **Step 1: 失敗するテストを追記**

`scripts/phase13/daikinrin-pages.test.mjs` の末尾に追記:

```javascript
import { buildPagesIndex, lookupMycoBankId } from './daikinrin-pages.mjs';

describe('buildPagesIndex', () => {
  it('entries から sci → mbid, ja → mbid のマップを構築する', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    expect(idx.byScientific.get('lentinula edodes')).toBe(316467);
    expect(idx.byJapanese.get('シイタケ')).toBe(316467);
  });

  it('学名検索は大文字小文字を区別しない', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    expect(idx.byScientific.get('LENTINULA EDODES')).toBe(316467);
    expect(idx.byScientific.get('lentinula EDODES')).toBe(316467);
  });

  it('和名なし種は byJapanese に含まない', () => {
    const entries = parsePagesJson(raw);
    const idx = buildPagesIndex(entries);
    // null キーは Map に登録しない
    expect(idx.byJapanese.has(null)).toBe(false);
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
});
```

- [ ] **Step 2: テストを実行して fail することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-pages.test.mjs`
Expected: FAIL — `buildPagesIndex` 未定義

- [ ] **Step 3: 実装を `daikinrin-pages.mjs` に追記**

```javascript
/**
 * entries 配列から (学名 → MycoBankId, 和名 → MycoBankId) のマップを構築。
 * @param {{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]} entries
 * @returns {{ byScientific: Map<string, number>, byJapanese: Map<string, number> }}
 */
export function buildPagesIndex(entries) {
  const byScientific = new Map();
  const byJapanese = new Map();
  for (const e of entries) {
    if (e.scientificName) byScientific.set(e.scientificName.toLowerCase(), e.mycoBankId);
    if (e.japaneseName) byJapanese.set(e.japaneseName, e.mycoBankId);
  }
  return { byScientific, byJapanese };
}

/**
 * 学名 → 和名 の順で MycoBank ID を引く。両方失敗で null。
 * @param {{ byScientific: Map<string, number>, byJapanese: Map<string, number> }} index
 * @param {{ scientificName?: string | null, japaneseName?: string | null }} key
 * @returns {number | null}
 */
export function lookupMycoBankId(index, { scientificName, japaneseName }) {
  if (scientificName) {
    const id = index.byScientific.get(scientificName.toLowerCase());
    if (id) return id;
  }
  if (japaneseName) {
    const id = index.byJapanese.get(japaneseName);
    if (id) return id;
  }
  return null;
}

/**
 * 大菌輪 pages.json をネットから fetch（または fresh=false かつキャッシュがあればそこから返す）。
 * 戻り値は parse 済みの entries 配列。
 *
 * @param {{ fresh?: boolean }} [opts]
 * @returns {Promise<{ scientificName: string, japaneseName: string | null, mycoBankId: number }[]>}
 */
export async function fetchDaikinrinPagesIndex({ fresh = false } = {}) {
  if (!fresh && existsSync(PAGES_CACHE_PATH)) {
    const cached = JSON.parse(readFileSync(PAGES_CACHE_PATH, 'utf8'));
    if (cached?.entries) return cached.entries;
  }
  const res = await fetch(PAGES_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`daikinrin pages.json fetch failed: ${res.status}`);
  const raw = await res.json();
  const entries = parsePagesJson(raw);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(PAGES_CACHE_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), entries }, null, 2));
  return entries;
}
```

- [ ] **Step 4: テストを実行して pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-pages.test.mjs`
Expected: PASS — 12 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/phase13/daikinrin-pages.mjs scripts/phase13/daikinrin-pages.test.mjs
git commit -m "feat(phase13a-hotfix): buildPagesIndex + lookupMycoBankId + fetchDaikinrinPagesIndex"
```

---

## Task 3: 実 pages.json を取得して tier0 解決率を確認

**Files:**
- Create: `.cache/phase13/daikinrin-pages.json`（gitignore 対象）
- Create: `.cache/phase13/_investigation/tier0-resolve.txt`（gitignore 対象）

- [ ] **Step 1: pages.json を実 fetch（約 7.7MB、数秒）**

```bash
node -e "
import('./scripts/phase13/daikinrin-pages.mjs').then(async (m) => {
  const entries = await m.fetchDaikinrinPagesIndex({ fresh: true });
  console.log('entries:', entries.length);
  console.log('first 3:', entries.slice(0, 3));
});
"
```

Expected: 5 万件以上の entries が生成される。

- [ ] **Step 2: tier0 62 種の解決率を確認**

```bash
node -e "
import('./scripts/phase13/daikinrin-pages.mjs').then(async (m) => {
  const fs = await import('node:fs');
  const tier0 = JSON.parse(fs.readFileSync('./data/tier0-species.json', 'utf8')).species;
  const entries = await m.fetchDaikinrinPagesIndex();
  const idx = m.buildPagesIndex(entries);
  let hit = 0;
  const miss = [];
  for (const s of tier0) {
    const id = m.lookupMycoBankId(idx, { scientificName: s.scientificName, japaneseName: s.japaneseName });
    if (id) hit++;
    else miss.push(\`\${s.scientificName} (\${s.japaneseName})\`);
  }
  console.log(\`hit: \${hit} / \${tier0.length}\`);
  console.log('miss:');
  miss.forEach(x => console.log(' ', x));
});
" | tee .cache/phase13/_investigation/tier0-resolve.txt
```

Expected: 大半（50/62 以上想定）が hit。ヒット 0% なら parser のバグ → Task 1 に戻る。

---

## Task 4: `daikinrin.mjs` の `fetchDaikinrinPage` を pages index 駆動に置き換え

**Files:**
- Modify: `scripts/phase13/daikinrin.mjs`

- [ ] **Step 1: `fetchDaikinrinPage` のシグネチャを変更して内部で lookup する**

`scripts/phase13/daikinrin.mjs` の末尾 (`fetchDaikinrinPage` 関数) を置換:

```javascript
import { fetchDaikinrinPagesIndex, buildPagesIndex, lookupMycoBankId } from './daikinrin-pages.mjs';

let _pagesIndexPromise = null;
async function getPagesIndex() {
  if (!_pagesIndexPromise) {
    _pagesIndexPromise = fetchDaikinrinPagesIndex().then(buildPagesIndex);
  }
  return _pagesIndexPromise;
}

/**
 * 大菌輪の種ページを fetch + parse + キャッシュ。
 * 旧 API は mycoBankId を呼び出し側から受け取っていたが、
 * GBIF が MycoBank ID を持たない問題のため現在は内部で pages.json から解決する。
 *
 * @param {string} scientificName
 * @param {string | null} japaneseName 和名（pages.json で学名ヒットしない時の fallback key）
 * @returns {Promise<object | null>}
 */
export async function fetchDaikinrinPage(scientificName, japaneseName) {
  const index = await getPagesIndex();
  const mycoBankId = lookupMycoBankId(index, { scientificName, japaneseName });
  if (!mycoBankId) return null;

  const cacheKey = `${scientificName}_${mycoBankId}`;
  const cached = await daikinrinCache.get(cacheKey);
  if (cached) return cached;

  const url = buildPageUrl(scientificName, mycoBankId);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`daikinrin fetch failed: ${res.status} ${url}`);
  }
  const html = await res.text();
  const parsed = parseDaikinrinPage(html);
  const record = { url, fetchedAt: new Date().toISOString(), ...parsed };
  await daikinrinCache.set(cacheKey, record);
  return record;
}
```

`buildPageUrl` と `parseDaikinrinPage` は変更なし。

- [ ] **Step 2: 既存テストが pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin.test.mjs scripts/phase13/daikinrin-pages.test.mjs`
Expected: PASS — 既存 `buildPageUrl`/`parseDaikinrinPage` + 新規 12 tests ok

- [ ] **Step 3: コミット**

```bash
git add scripts/phase13/daikinrin.mjs
git commit -m "feat(phase13a-hotfix): fetchDaikinrinPage を pages.json index 駆動に置き換え"
```

---

## Task 5: caller 3 ファイルを新シグネチャ `(scientificName, japaneseName)` に更新

**Files:**
- Modify: `scripts/phase13/fetch_sources.mjs`
- Modify: `scripts/phase13/fetch_tier0_sources.mjs`
- Modify: `scripts/phase13/fetch_pilot_sources.mjs`

- [ ] **Step 1: 各 caller の現状を確認**

```bash
grep -n "fetchDaikinrinPage" scripts/phase13/fetch_sources.mjs scripts/phase13/fetch_tier0_sources.mjs scripts/phase13/fetch_pilot_sources.mjs
```

期待される出力（行番号は前確認済み）:
- `fetch_sources.mjs:54`: `fetchDaikinrinPage(scientificName, mycoBankId)`
- `fetch_tier0_sources.mjs:24`: `fetchDaikinrinPage(scientificName, null)`
- `fetch_pilot_sources.mjs:16`: `fetchDaikinrinPage(scientificName, mycoBankId)`

- [ ] **Step 2: `fetch_sources.mjs` を更新**

該当箇所の周辺を `grep -B3 -A3 "fetchDaikinrinPage" scripts/phase13/fetch_sources.mjs` で確認して、

変更前:
```javascript
fetchDaikinrinPage(scientificName, mycoBankId).catch(e => { console.error('daikinrin:', e.message); return null; }),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(e => { console.error('daikinrin:', e.message); return null; }),
```

この fetcher 関数のシグネチャにも `japaneseName` が入っているか確認し、なければ引数として追加。caller 側の呼び出し元（manifest 生成等）で `japaneseName` を伝播させる。

- [ ] **Step 3: `fetch_tier0_sources.mjs` を更新**

変更前:
```javascript
fetchDaikinrinPage(scientificName, null).catch(() => null),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
```

`fetchFor` 関数（呼び出し元）のシグネチャに `japaneseName` が含まれていることを確認。含まれていなければ追加。

- [ ] **Step 4: `fetch_pilot_sources.mjs` を更新**

変更前:
```javascript
fetchDaikinrinPage(scientificName, mycoBankId).catch(() => null),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
```

pilot 実行時に `japaneseName` が tier0 リスト由来で与えられるように、呼び出し元チェーンを整える。

- [ ] **Step 5: 既存テストが全 pass することを確認**

```bash
npx vitest run scripts/phase13
```

Expected: 既存 149 + 新規 daikinrin-pages 12 = 161 tests ok

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/fetch_sources.mjs scripts/phase13/fetch_tier0_sources.mjs scripts/phase13/fetch_pilot_sources.mjs
git commit -m "refactor(phase13a-hotfix): caller 3 ファイルを fetchDaikinrinPage の新シグネチャに更新"
```

---

## Task 6: tier0 62 種を re-fetch して combined JSON を再構築

**Files:**
- Create/Modify: `.cache/phase13/combined/<slug>.json` × 62（gitignore 対象）

- [ ] **Step 1: 既存 combined cache を退避（ロールバック用）**

```bash
mv .cache/phase13/combined .cache/phase13/combined.bak 2>/dev/null || true
mkdir -p .cache/phase13/combined
```

- [ ] **Step 2: prepare + fetch を実行**

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```

Expected: `.cache/phase13/combined/<slug>.json` が 62 件生成。

- [ ] **Step 3: 大菌輪 source の hit 率を集計**

```bash
node -e "
const fs = require('node:fs');
const dir = '.cache/phase13/combined';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let hit = 0;
const miss = [];
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(\`\${dir}/\${f}\`, 'utf8'));
  if (c?.sources?.daikinrin) hit++;
  else miss.push(f.replace(/\.json$/, ''));
}
console.log(\`daikinrin hit: \${hit} / \${files.length}\`);
console.log('miss:');
miss.forEach(s => console.log(' ', s));
" | tee .cache/phase13/_investigation/tier0-daikinrin-hit.txt
```

Expected:
- 旧 fetcher: 0 hit / 62
- 新 fetcher: 50+ hit / 62

- [ ] **Step 4: ヒットした種の daikinrin 取得が正しいか spot check**

```bash
node -e "
const fs = require('node:fs');
for (const slug of ['Tricholoma_matsutake', 'Lentinula_edodes', 'Amanita_muscaria']) {
  const c = JSON.parse(fs.readFileSync(\`.cache/phase13/combined/\${slug}.json\`, 'utf8'));
  console.log('---', slug, '---');
  console.log('  scientificName:', c.scientificName);
  console.log('  daikinrin japaneseName:', c.sources?.daikinrin?.japaneseName);
  console.log('  daikinrin URL:', c.sources?.daikinrin?.url);
  console.log('  observations:', c.sources?.daikinrin?.observations);
}
"
```

Expected: シイタケ・マツタケ・ベニテングタケが正しい和名と URL を持つ。

- [ ] **Step 5: 退避 cache を削除**

```bash
rm -rf .cache/phase13/combined.bak
```

コミットなし（cache は gitignore）。

---

## Task 7: 大菌輪未収録の tier0 species 確定 + tier0 hygiene

**Files:**
- Create: `docs/phase13/daikinrin-hotfix-report.md`
- Modify: `data/tier0-species.json`（必要に応じて）

- [ ] **Step 1: Task 6 Step 3 の miss リストに対し、表記揺れ・スペル違いを確認**

各 miss について以下のチェックを行い、どれに該当するかを判定:
- **excluded**: 本当に大菌輪未収録（北米種・架空和名など）→ tier0 から除外
- **wamei-fix-needed**: 和名表記違いで引けない（旧字体・別表記など）→ tier0 の japaneseName を修正
- **kept-no-source**: 大菌輪未収録だが有名種で tier0 残す → そのまま維持

判定には実 pages.json を目視参照:

```bash
node -e "
const fs = require('node:fs');
const cache = JSON.parse(fs.readFileSync('.cache/phase13/daikinrin-pages.json', 'utf8'));
const query = '<miss した学名の一部 or 和名>';
const hits = cache.entries.filter(e =>
  (e.scientificName && e.scientificName.toLowerCase().includes(query.toLowerCase())) ||
  (e.japaneseName && e.japaneseName.includes(query))
);
console.log('matches:', hits.length);
hits.slice(0, 10).forEach(h => console.log(' ', h));
"
```

- [ ] **Step 2: レポート `docs/phase13/daikinrin-hotfix-report.md` を作成**

```markdown
# Phase 13-A Hotfix: 大菌輪 fetcher 改修レポート (2026-04-15)

## 背景

Phase 13-A の `daikinrin.mjs` は MycoBank ID 必須の旧 URL 形式を使っていたが、
GBIF に MycoBank ID が登録されていないため 0 件解決という既知 caveat があった。
Phase 13-D レビュー UI で「大菌輪 null」が頻発して発覚。

## 修正

- 大菌輪公式 `pages.json`（50,686 件）を 1 度 fetch してキャッシュ
- (scientificName, japaneseName) → MycoBank ID のマップを構築
- `fetchDaikinrinPage(scientificName, japaneseName)` 内部で ID を lookup し、既存 `buildPageUrl` で URL を組み立てる
- URL 形式と `parseDaikinrinPage` は変更なし

## ヒット率

- 旧 fetcher: tier0 daikinrin hit = 0 / 62
- 新 fetcher: tier0 daikinrin hit = <数値> / 62

## 大菌輪未収録と判定された種

| slug | tier0 wamei | 判断 | 備考 |
|---|---|---|---|
| Boletus_sensibilis | ドクヤマドリモドキ | excluded | 北米種、和名は架空 |
| ... | ... | ... | ... |

## 取った措置

- tier0 から除外: <件数>
- 和名修正: <件数>
- そのまま保持（大菌輪なしでも採用）: <件数>

## 既存 generated/articles の扱い

retain（Phase 13-D レビューで新 combined JSON と目視照合）。Phase 13-C 再合成は別 plan 化。
```

- [ ] **Step 3: ユーザー判断ゲート**

ここで一旦止めて miss リストをユーザーに共有し、excluded / wamei-fix-needed / kept-no-source の判断を仰ぐ。

判断結果に従って `data/tier0-species.json` を編集。

- [ ] **Step 4: 編集後の tier0 で combined を再生成（必要な場合）**

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```

- [ ] **Step 5: コミット**

```bash
git add data/tier0-species.json docs/phase13/daikinrin-hotfix-report.md
git commit -m "data(phase13a-hotfix): tier0 を大菌輪検証で更新 + report 追加"
```

---

## Task 8: progress.md 更新 + Phase 13-A 既知 caveat の解消を記録

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/phase13/README.md`

- [ ] **Step 1: progress.md に hotfix セクションを追加**

`docs/progress.md` の末尾に以下を挿入:

```markdown
---

## Phase 13-A Hotfix: 大菌輪 fetcher の pages.json 駆動化 — 完了 (2026-04-15)

計画書: [docs/superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md](./superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md)
レポート: [docs/phase13/daikinrin-hotfix-report.md](./phase13/daikinrin-hotfix-report.md)

### 背景

Phase 13-A の `daikinrin.mjs` は MycoBank ID 必須の旧 URL 形式を使っていたが、
GBIF Backbone Taxonomy に MycoBank ID が登録されていないため事実上 0 件解決という
既知 caveat があり、すべての daikinrin fetch が失敗していた。
Phase 13-D レビュー UI で「大菌輪 null」が頻発して発覚。

### 修正

- 大菌輪公式 `pages.json`（50,686 件、7.7MB）を `.cache/phase13/daikinrin-pages.json` にキャッシュ
- `(scientificName, japaneseName) → MycoBank ID` の lookup モジュール `daikinrin-pages.mjs` を追加
- `fetchDaikinrinPage(scientificName, japaneseName)` 内部で ID を解決、既存 `buildPageUrl` で URL を組み立て
- URL 形式と `parseDaikinrinPage` 既存実装は変更なし

### 結果

- 旧 fetcher: tier0 daikinrin hit = 0 / 62
- 新 fetcher: tier0 daikinrin hit = <数値> / 62
- 大菌輪未収録判定で tier0 から除外: <件数>
- 既存 generated/articles は retain し、Phase 13-D レビューで新ソースと目視照合

### 既知 caveat の解消

| 旧 caveat | 解消状態 |
|---|---|
| MycoBank ID 0 件解決 → 大菌輪 fetch 全失敗 | ✓ 解消（pages.json 経由で全解決可能） |
```

- [ ] **Step 2: `docs/phase13/README.md` に追記**

Phase 13-A の使い方セクションに caveat 解消を脚注:

```markdown
**注 (2026-04-15 hotfix)**: 大菌輪 fetcher は MycoBank ID の解決経路を GBIF から
大菌輪公式 pages.json に切り替えた。詳細は [hotfix レポート](./daikinrin-hotfix-report.md)。
```

- [ ] **Step 3: コミット**

```bash
git add docs/progress.md docs/phase13/README.md
git commit -m "docs(phase13a-hotfix): progress.md と README に hotfix 完了を記録"
```

---

## Spec Coverage Self-Review

| Goal の要素 | 対応 Task |
|---|---|
| pages.json 駆動の MycoBank ID 解決 | Task 1, 2 |
| 実データで解決率確認 | Task 3 |
| daikinrin.mjs の fetcher を置換 | Task 4 |
| caller 3 ファイル更新 | Task 5 |
| tier0 re-fetch | Task 6 |
| 大菌輪未収録判定 + tier0 hygiene | Task 7 |
| ドキュメント更新 | Task 8 |

---

## 実装中の落とし穴

- **pages.json が構造変更された場合**: fixture とテストで parser を固定しているので、実データで突然 parser が落ちるリスクは低い。将来的な構造変更には `parsePagesJson` の変更で吸収
- **学名の表記揺れ**: pages.json の学名はアンダースコア区切りで正規化済み。lower-case 比較で大文字小文字を吸収
- **属エントリのスキップ**: `<Genus>_genus.html` は `FILENAME_RE` にマッチしないため自動的にスキップ
- **API 互換破壊**: `fetchDaikinrinPage` の第 2 引数が `mycoBankId`（number）から `japaneseName`（string|null）に変わる。caller 3 ファイル全更新が必須
- **キャッシュキー**: 旧コードも `${scientificName}_${mycoBankId}` を cache key にしていたため、新コードでも同じ形式を維持 → 旧キャッシュがあれば引き継げる（gitignore なので実害なし）
- **pages.json サイズ**: 7.7MB、parse 済み entries は ~数 MB のメモリ消費。一度 process 内で構築したら `_pagesIndexPromise` に保持して再利用
- **tier0 wamei と pages.json 和名の不一致**: 旧字体・別表記がずれると miss 扱いになる。Task 7 で個別確認

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 各 Task を fresh subagent にディスパッチ
2. **Inline Execution** — 本セッション内で executing-plans を使いバッチ実行

Task 3 (実 fetch 検証) と Task 7 (ユーザー判断) は対話的なので Inline 向き。Task 1, 2, 4, 5 は機械的。

どちらで進めますか？
