# Phase 13-A Hotfix: 大菌輪 fetcher を MycoBank ID 不要な index 駆動に置き換え

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `scripts/phase13/daikinrin.mjs` を MycoBank ID 必須の旧 URL 形式から、大菌輪の「種名一覧【和名】」インデックスを起点に和名+学名で URL を解決する新方式に置き換え、tier0 62 種の combined JSON を再取得する。

**Architecture:** インデックスページから `(scientificName → URL, japaneseName → URL)` のマップを構築してローカルキャッシュ。`fetchDaikinrinPage(scientificName, japaneseName)` は resolver でマップを引いて該当 URL を fetch、見つからなければ null を返す。MycoBank ID は parse 結果に含めるだけで、URL 構築には使わない。

**Tech Stack:** Node.js 20+, ES Modules, vitest, native fetch, cheerio。新規依存なし。

**前提コンテキスト**:
- 既知 caveat（memory `phase13b_progress.md`）: 「MycoBank ID は依然 0 件解決（GBIF identifiers 未登録）」
- 旧 URL: `https://mycoscouter.coolblog.jp/daikinrin/Pages/<Sci_Name>_<MBID>.html` → ID 不明で全件 fail
- 新 URL: `http://mycoscouter.coolblog.jp/daikinrin/<和名>-<学名>/` → 和名・学名どちらか単独では 404、両方必要、表記揺れあり
- インデックスページ: `http://mycoscouter.coolblog.jp/daikinrin/種名一覧【和名】/` から `<a>` タグで全種ページへリンク

---

## Task 1: インデックスページの実体構造を curl で調査する

**Files:**
- Create: `.cache/phase13/_investigation/daikinrin-index.html`（一時、後で削除）

- [ ] **Step 1: インデックスページを取得して HTML を保存**

```bash
mkdir -p .cache/phase13/_investigation
curl -sS -A "MycoNote/1.0 (https://github.com/ennead2/MycoNote)" \
  "http://mycoscouter.coolblog.jp/daikinrin/%E7%A8%AE%E5%90%8D%E4%B8%80%E8%A6%A7%E3%80%90%E5%92%8C%E5%90%8D%E3%80%91/" \
  -o .cache/phase13/_investigation/daikinrin-index.html
ls -lh .cache/phase13/_investigation/daikinrin-index.html
```

Expected: HTML が数十 KB 〜 数 MB 程度で取得される。

- [ ] **Step 2: HTML から <a> タグの数とパターンを把握**

```bash
node -e "
const fs = require('node:fs');
const { load } = require('cheerio');
const html = fs.readFileSync('.cache/phase13/_investigation/daikinrin-index.html', 'utf8');
const \$ = load(html);
const all = \$('a').toArray();
console.log('total a tags:', all.length);
// 種ページに見えるリンクだけ抽出（href が /daikinrin/<日本語>-<学名>/ 形式）
const speciesLinks = all
  .map(el => ({ href: \$(el).attr('href'), text: \$(el).text().trim() }))
  .filter(x => x.href && /\/daikinrin\/[^/]+-[a-zA-Z]/.test(x.href));
console.log('species-shaped links:', speciesLinks.length);
console.log('first 5:');
speciesLinks.slice(0, 5).forEach(l => console.log(' ', l.text, '→', l.href));
console.log('last 5:');
speciesLinks.slice(-5).forEach(l => console.log(' ', l.text, '→', l.href));
"
```

Expected: 種ページのリンクが数百〜数万件抽出される。先頭・末尾の表記から構造（テキストに `<和名> <学名>` か `<学名>` 単体か等）を把握。

- [ ] **Step 3: ページネーションの有無を確認**

```bash
node -e "
const fs = require('node:fs');
const { load } = require('cheerio');
const html = fs.readFileSync('.cache/phase13/_investigation/daikinrin-index.html', 'utf8');
const \$ = load(html);
// ページネーションらしき要素を探す
const nav = \$('a').toArray()
  .map(el => ({ href: \$(el).attr('href'), text: \$(el).text().trim() }))
  .filter(x => /next|前|次|\/page\/\d/.test(x.href || '') || /^[\d]+$|次の|前の/.test(x.text));
console.log('pagination-like links:', nav.length);
nav.slice(0, 10).forEach(l => console.log(' ', JSON.stringify(l)));
// 五十音別のページがあるか
const kana = \$('a').toArray()
  .map(el => ({ href: \$(el).attr('href'), text: \$(el).text().trim() }))
  .filter(x => /行$/.test(x.text) || /[アカサタナハマヤラワ]行/.test(x.text));
console.log('kana-row links:', kana.length);
kana.slice(0, 10).forEach(l => console.log(' ', JSON.stringify(l)));
"
```

Expected: ページネーションがある場合は遷移先 URL のパターンが見えるはず。

- [ ] **Step 4: 結果を踏まえた決定をメモ**

調査結果に応じて次のいずれかを選ぶ（後続 Task に反映）:
- **A**. インデックス 1 ページに全種が並ぶ → そのまま 1 回 fetch で完了
- **B**. 五十音別のページに分かれる → ア〜ワ＋他の各ページを fetch して merge
- **C**. その他の構造 → fetch 戦略を再設計（このタスクで遭遇したらユーザーに報告して相談）

`.cache/phase13/_investigation/decision.md` に簡易メモを残す。

```bash
cat > .cache/phase13/_investigation/decision.md << 'EOF'
# Daikinrin Index Discovery (2026-04-15)

- Total `<a>` tags: <記入>
- Species-shaped links: <記入>
- Pagination: <none / 五十音 / その他>
- Decision: <A / B / C>
- Notes: <自由記述>
EOF
```

---

## Task 2: インデックス parser モジュール `daikinrin-index.mjs`

**Files:**
- Create: `scripts/phase13/daikinrin-index.mjs`
- Create: `scripts/phase13/daikinrin-index.test.mjs`
- Create: `scripts/phase13/fixtures/daikinrin-index-sample.html`

- [ ] **Step 1: fixture HTML を作成（Task 1 で取得した実 HTML から、識別子テスト用の最小サンプルを抜粋）**

`scripts/phase13/fixtures/daikinrin-index-sample.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <ul>
    <li><a href="http://mycoscouter.coolblog.jp/daikinrin/シイタケ-lentinula-edodes/">シイタケ Lentinula edodes</a></li>
    <li><a href="http://mycoscouter.coolblog.jp/daikinrin/タマゴタケ-Amanita-caesareoides/">タマゴタケ Amanita caesareoides</a></li>
    <li><a href="http://mycoscouter.coolblog.jp/daikinrin/ドクツルタケ-amanita-virosa-2/">ドクツルタケ Amanita virosa</a></li>
    <li><a href="http://mycoscouter.coolblog.jp/daikinrin/%EF%BC%88%E5%92%8C%E5%90%8D%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AA%E3%81%97%EF%BC%89-clitocybe-rufoalutacea/">（和名データなし）Clitocybe rufoalutacea</a></li>
    <li><a href="/non-species-link.html">無関係なリンク</a></li>
  </ul>
</body>
</html>
```

- [ ] **Step 2: 失敗するテストを書く**

`scripts/phase13/daikinrin-index.test.mjs`:

```javascript
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseDaikinrinIndex } from './daikinrin-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, 'fixtures/daikinrin-index-sample.html'), 'utf8');

describe('parseDaikinrinIndex', () => {
  it('種ページのみ抽出して entry 配列を返す', () => {
    const entries = parseDaikinrinIndex(html);
    // 5 件中 4 件が種ページ（最後の 1 件は無関係リンク）
    expect(entries.length).toBe(4);
  });

  it('各 entry に scientificName, japaneseName, url を持つ', () => {
    const entries = parseDaikinrinIndex(html);
    const shi = entries.find(e => e.japaneseName === 'シイタケ');
    expect(shi).toBeDefined();
    expect(shi.scientificName).toBe('Lentinula edodes');
    expect(shi.url).toBe('http://mycoscouter.coolblog.jp/daikinrin/シイタケ-lentinula-edodes/');
  });

  it('和名データなしの種は japaneseName=null', () => {
    const entries = parseDaikinrinIndex(html);
    const noJa = entries.find(e => e.scientificName === 'Clitocybe rufoalutacea');
    expect(noJa).toBeDefined();
    expect(noJa.japaneseName).toBeNull();
  });

  it('学名は元の大文字小文字を保持する', () => {
    const entries = parseDaikinrinIndex(html);
    const tama = entries.find(e => e.japaneseName === 'タマゴタケ');
    expect(tama.scientificName).toBe('Amanita caesareoides');
  });
});
```

- [ ] **Step 3: テストを実行して fail することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-index.test.mjs`
Expected: FAIL — `parseDaikinrinIndex` が定義されていない

- [ ] **Step 4: `daikinrin-index.mjs` を実装**

`scripts/phase13/daikinrin-index.mjs`:

```javascript
/**
 * 大菌輪「種名一覧【和名】」インデックスページの fetch + parse + キャッシュ。
 *
 * 旧 fetcher (daikinrin.mjs) は MycoBank ID 必須の URL 構築に依存していたが、
 * GBIF Backbone Taxonomy には MycoBank ID が登録されていないため事実上 0 件解決という
 * 既知 caveat があり、結果として全種で fetch が失敗していた。
 *
 * 本モジュールはインデックスページから (scientificName, japaneseName, url) の対応表を
 * 1 度だけ構築し、以降の resolve はメモリマップ参照で完結する。
 */
import { load } from 'cheerio';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const INDEX_CACHE_PATH = join(CACHE_DIR, 'daikinrin-index.json');

const INDEX_URL = 'http://mycoscouter.coolblog.jp/daikinrin/%E7%A8%AE%E5%90%8D%E4%B8%80%E8%A6%A7%E3%80%90%E5%92%8C%E5%90%8D%E3%80%91/';
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion)';
const SPECIES_URL_PATTERN = /\/daikinrin\/[^/]+-[a-zA-Z]/;
const NO_JA_PREFIX = '（和名データなし）';

/**
 * インデックス HTML を parse して entries 配列を返す。
 * @param {string} html
 * @returns {{ scientificName: string, japaneseName: string | null, url: string }[]}
 */
export function parseDaikinrinIndex(html) {
  const $ = load(html);
  const entries = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href || !SPECIES_URL_PATTERN.test(href)) return;
    if (!text) return;
    const { scientificName, japaneseName } = splitText(text);
    if (!scientificName) return;
    entries.push({ scientificName, japaneseName, url: href });
  });
  return entries;
}

/**
 * リンクテキスト「<和名> <学名>」を分割。
 * 「（和名データなし）<学名>」の場合は japaneseName=null。
 */
function splitText(text) {
  if (text.startsWith(NO_JA_PREFIX)) {
    const sci = text.slice(NO_JA_PREFIX.length).trim();
    return { scientificName: sci, japaneseName: null };
  }
  // 学名は最後のスペースより右側 + 大文字始まりの単語列という想定
  const m = text.match(/^(.+?)\s+([A-Z][a-zA-Z. ]+)$/);
  if (!m) {
    // 学名のみの場合（先頭大文字）
    if (/^[A-Z][a-zA-Z]/.test(text)) {
      return { scientificName: text.trim(), japaneseName: null };
    }
    return { scientificName: null, japaneseName: null };
  }
  return { scientificName: m[2].trim(), japaneseName: m[1].trim() };
}
```

- [ ] **Step 5: テストを実行して pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-index.test.mjs`
Expected: PASS — 4 tests ok

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/daikinrin-index.mjs scripts/phase13/daikinrin-index.test.mjs scripts/phase13/fixtures/daikinrin-index-sample.html
git commit -m "feat(phase13a-hotfix): parseDaikinrinIndex で種名一覧 HTML を解析"
```

---

## Task 3: インデックスの fetch + キャッシュ + ルックアップ

**Files:**
- Modify: `scripts/phase13/daikinrin-index.mjs`
- Modify: `scripts/phase13/daikinrin-index.test.mjs`

- [ ] **Step 1: 失敗するテストを書く（追記）**

`scripts/phase13/daikinrin-index.test.mjs` の末尾に追記:

```javascript
import { buildIndexMap, resolveSpeciesUrl } from './daikinrin-index.mjs';

describe('buildIndexMap', () => {
  it('entries 配列から sci → url, ja → url の双方向マップを構築する', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    expect(map.byScientific.get('Lentinula edodes')).toContain('シイタケ-lentinula-edodes');
    expect(map.byJapanese.get('シイタケ')).toContain('シイタケ-lentinula-edodes');
  });

  it('和名なし種は byJapanese に含まない', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    expect(map.byJapanese.get(null)).toBeUndefined();
  });

  it('学名検索は大文字小文字を区別しない', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    expect(map.byScientific.get('lentinula edodes')).toBeDefined();
    expect(map.byScientific.get('LENTINULA EDODES')).toBeDefined();
  });
});

describe('resolveSpeciesUrl', () => {
  it('学名ヒットを優先', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    const url = resolveSpeciesUrl(map, { scientificName: 'Lentinula edodes', japaneseName: 'シイタケ' });
    expect(url).toContain('シイタケ-lentinula-edodes');
  });

  it('学名なし＋和名のみで解決可', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    const url = resolveSpeciesUrl(map, { scientificName: null, japaneseName: 'タマゴタケ' });
    expect(url).toContain('Amanita-caesareoides');
  });

  it('どちらにもヒットしなければ null', () => {
    const entries = parseDaikinrinIndex(html);
    const map = buildIndexMap(entries);
    const url = resolveSpeciesUrl(map, { scientificName: 'Nonexistent species', japaneseName: 'ナイヨ' });
    expect(url).toBeNull();
  });
});
```

- [ ] **Step 2: テストを実行して fail することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-index.test.mjs`
Expected: FAIL — `buildIndexMap` 未定義

- [ ] **Step 3: 実装を追記**

`scripts/phase13/daikinrin-index.mjs` の末尾に追記:

```javascript
/**
 * entries 配列から検索用マップを構築。
 * @param {{ scientificName: string, japaneseName: string | null, url: string }[]} entries
 * @returns {{ byScientific: Map<string, string>, byJapanese: Map<string, string> }}
 */
export function buildIndexMap(entries) {
  const byScientific = new Map();
  const byJapanese = new Map();
  for (const e of entries) {
    if (e.scientificName) byScientific.set(e.scientificName.toLowerCase(), e.url);
    if (e.japaneseName) byJapanese.set(e.japaneseName, e.url);
  }
  return { byScientific, byJapanese };
}

/**
 * 学名 → 和名 の順で URL を引く。両方失敗で null。
 * @param {{ byScientific: Map<string, string>, byJapanese: Map<string, string> }} map
 * @param {{ scientificName?: string | null, japaneseName?: string | null }} key
 * @returns {string | null}
 */
export function resolveSpeciesUrl(map, { scientificName, japaneseName }) {
  if (scientificName) {
    const u = map.byScientific.get(scientificName.toLowerCase());
    if (u) return u;
  }
  if (japaneseName) {
    const u = map.byJapanese.get(japaneseName);
    if (u) return u;
  }
  return null;
}

/**
 * インデックスをネットから fetch（または fresh=false ならキャッシュから返す）。
 * 戻り値は entries 配列で、buildIndexMap の入力として使う。
 *
 * @param {{ fresh?: boolean }} [opts]
 * @returns {Promise<{ scientificName: string, japaneseName: string | null, url: string }[]>}
 */
export async function fetchDaikinrinIndex({ fresh = false } = {}) {
  if (!fresh && existsSync(INDEX_CACHE_PATH)) {
    const cached = JSON.parse(readFileSync(INDEX_CACHE_PATH, 'utf8'));
    if (cached?.entries) return cached.entries;
  }
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`daikinrin index fetch failed: ${res.status}`);
  const html = await res.text();
  const entries = parseDaikinrinIndex(html);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(INDEX_CACHE_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), entries }, null, 2));
  return entries;
}
```

- [ ] **Step 4: テストを実行して pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin-index.test.mjs`
Expected: PASS — 7 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/phase13/daikinrin-index.mjs scripts/phase13/daikinrin-index.test.mjs
git commit -m "feat(phase13a-hotfix): buildIndexMap + resolveSpeciesUrl + fetchDaikinrinIndex"
```

---

## Task 4: 実インデックスを取得してキャッシュ生成（手動実行 + 検証）

**Files:**
- Create: `.cache/phase13/daikinrin-index.json`（gitignore 対象）

- [ ] **Step 1: インデックスを実 fetch**

```bash
node -e "
import('./scripts/phase13/daikinrin-index.mjs').then(async (m) => {
  const entries = await m.fetchDaikinrinIndex({ fresh: true });
  console.log('entries:', entries.length);
  console.log('first 3:', entries.slice(0, 3));
});
"
```

Expected: 数百〜数万件取得され `.cache/phase13/daikinrin-index.json` が生成される。0 件なら **Task 1 のページネーション対応が必要** → Task 1 の調査結果に戻って B シナリオの実装を別 Task として追加。

- [ ] **Step 2: tier0 62 種の解決率を確認**

```bash
node -e "
import('./scripts/phase13/daikinrin-index.mjs').then(async (m) => {
  const fs = await import('node:fs');
  const tier0 = JSON.parse(fs.readFileSync('./data/tier0-species.json', 'utf8')).species;
  const entries = await m.fetchDaikinrinIndex();
  const map = m.buildIndexMap(entries);
  let hit = 0, miss = [];
  for (const s of tier0) {
    const url = m.resolveSpeciesUrl(map, { scientificName: s.scientificName, japaneseName: s.japaneseName });
    if (url) hit++;
    else miss.push(\`\${s.scientificName} (\${s.japaneseName})\`);
  }
  console.log(\`hit: \${hit} / \${tier0.length}\`);
  console.log('miss:');
  miss.forEach(m => console.log(' ', m));
});
"
```

Expected: 大半（50/62 以上想定）が hit、残りはユーザーへの判断材料として保存。**ヒット率 0% なら parser のバグ** → Task 2 に戻る。

- [ ] **Step 3: 結果をメモ**

```bash
# 上記出力を .cache/phase13/_investigation/tier0-resolve.txt に保存
node -e "<以下省略 — 上記コマンドの出力をリダイレクト>" > .cache/phase13/_investigation/tier0-resolve.txt
```

ユーザーが目視できる位置に置く（後の Task 7 で参照）。

---

## Task 5: `daikinrin.mjs` の `fetchDaikinrinPage` を index 駆動に置き換え

**Files:**
- Modify: `scripts/phase13/daikinrin.mjs`
- Modify: `scripts/phase13/daikinrin.test.mjs`

- [ ] **Step 1: テストの方針**

`scripts/phase13/daikinrin.test.mjs` の既存 `buildPageUrl`/`parseDaikinrinPage` テストはそのまま残す（`buildPageUrl` は deprecated 化するが API 後方互換テストとして維持）。

`resolveDaikinrinUrl` の単体テストは追加しない理由:
- `daikinrin-index.test.mjs` 側で純粋関数 `resolveSpeciesUrl` をすでに完全カバー
- ラッパー側の動作は Task 7 の実 fetch で integration test として確認
- ネットワーク依存テストを CI に残すと flaky になる

- [ ] **Step 2: 既存 `fetchDaikinrinPage` のシグネチャを変更**

`scripts/phase13/daikinrin.mjs` の末尾を以下に置き換え:

```javascript
import { fetchDaikinrinIndex, buildIndexMap, resolveSpeciesUrl } from './daikinrin-index.mjs';

let _indexMapPromise = null;
async function getIndexMap() {
  if (!_indexMapPromise) {
    _indexMapPromise = fetchDaikinrinIndex().then(buildIndexMap);
  }
  return _indexMapPromise;
}

/**
 * 学名と和名から大菌輪のページ URL を引く。
 * @param {{ scientificName?: string | null, japaneseName?: string | null }} key
 * @returns {Promise<string | null>}
 */
export async function resolveDaikinrinUrl(key) {
  const map = await getIndexMap();
  return resolveSpeciesUrl(map, key);
}

/**
 * 大菌輪の種ページを fetch + parse + キャッシュ。
 * MycoBank ID は不要（旧 API との非互換変更）。
 *
 * @param {string} scientificName
 * @param {string | null} japaneseName
 * @returns {Promise<object | null>}
 */
export async function fetchDaikinrinPage(scientificName, japaneseName) {
  const url = await resolveDaikinrinUrl({ scientificName, japaneseName });
  if (!url) return null;
  const cacheKey = url; // URL 自体をキャッシュキーに（一意）
  const cached = await daikinrinCache.get(cacheKey);
  if (cached) return cached;

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

旧 `buildPageUrl` 関数はコメントブロックを追加して deprecated とマーク（caller 削除後にこの関数も消す）:

```javascript
/**
 * @deprecated MycoBank ID 必須の旧 URL 形式。GBIF に MycoBank ID が登録されていないため
 * 事実上使えなかった。互換のため一時残置。Phase 13-A hotfix 完了後に削除予定。
 */
export function buildPageUrl(scientificName, mycoBankId) {
  // ... 既存の実装をそのまま残す ...
}
```

- [ ] **Step 3: テストを実行して pass することを確認**

Run: `npx vitest run scripts/phase13/daikinrin.test.mjs scripts/phase13/daikinrin-index.test.mjs`
Expected: PASS — 既存 `buildPageUrl`/`parseDaikinrinPage` テスト + 新規 `resolveDaikinrinUrl` テストが ok

- [ ] **Step 4: コミット**

```bash
git add scripts/phase13/daikinrin.mjs scripts/phase13/daikinrin.test.mjs
git commit -m "feat(phase13a-hotfix): fetchDaikinrinPage を index 駆動に置き換え (mycoBankId 不要)"
```

---

## Task 6: caller 3 ファイルを新シグネチャに更新

**Files:**
- Modify: `scripts/phase13/fetch_sources.mjs:54`
- Modify: `scripts/phase13/fetch_tier0_sources.mjs:24`
- Modify: `scripts/phase13/fetch_pilot_sources.mjs:16`

- [ ] **Step 1: `fetch_sources.mjs` の呼び出しを更新**

`scripts/phase13/fetch_sources.mjs` の該当行（54 行目付近）を以下に変更:

変更前:
```javascript
fetchDaikinrinPage(scientificName, mycoBankId).catch(e => { console.error('daikinrin:', e.message); return null; }),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(e => { console.error('daikinrin:', e.message); return null; }),
```

呼び出し元の関数シグネチャに `japaneseName` が含まれていない場合、上位から伝播させるため `combineSources` の呼び出しも合わせて確認:

```bash
grep -n "fetchDaikinrinPage\|combineSources" scripts/phase13/fetch_sources.mjs
```

引数チェーンに `japaneseName` を追加（実装時の責務）。

- [ ] **Step 2: `fetch_tier0_sources.mjs` の呼び出しを更新**

該当行（24 行目付近）:

変更前:
```javascript
fetchDaikinrinPage(scientificName, null).catch(() => null),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
```

`fetchFor` 関数の引数に `japaneseName` がすでに渡されているか確認し、なければ追加。

- [ ] **Step 3: `fetch_pilot_sources.mjs` の呼び出しを更新**

該当行（16 行目付近）:

変更前:
```javascript
fetchDaikinrinPage(scientificName, mycoBankId).catch(() => null),
```

変更後:
```javascript
fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
```

`japaneseName` を引数として追加（pilot は和名引数を持っていなければ tier0 wamei or null を渡す）。

- [ ] **Step 4: 既存テストが全 pass することを確認**

```bash
npx vitest run scripts/phase13
```

Expected: 既存 149 + 新規 daikinrin-index 7 = 156 tests ok（resolveDaikinrinUrl が cache 必要なら -1 で 155）

- [ ] **Step 5: コミット**

```bash
git add scripts/phase13/fetch_sources.mjs scripts/phase13/fetch_tier0_sources.mjs scripts/phase13/fetch_pilot_sources.mjs
git commit -m "refactor(phase13a-hotfix): caller 3 ファイルを fetchDaikinrinPage の新シグネチャに更新"
```

---

## Task 7: tier0 62 種を re-fetch して combined JSON を再構築

**Files:**
- Create/Modify: `.cache/phase13/combined/<slug>.json` × 62（gitignore 対象）

- [ ] **Step 1: 既存 combined cache を退避（ロールバック用）**

```bash
mv .cache/phase13/combined .cache/phase13/combined.bak 2>/dev/null || true
mkdir -p .cache/phase13/combined
```

- [ ] **Step 2: tier0 用の prepare + fetch を実行**

```bash
# manifest.json を再生成
node scripts/phase13/generate_articles.mjs --prepare

# tier0 全種を fetch（concurrency 5、~5-10 分想定）
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```

Expected: `.cache/phase13/combined/<slug>.json` が 62 件生成。

- [ ] **Step 3: 大菌輪 source の hit 率を集計**

```bash
node -e "
const fs = require('node:fs');
const dir = '.cache/phase13/combined';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let hit = 0, miss = [];
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
- 新 fetcher: 50+ hit / 62（残り 10 件前後は本当に大菌輪未収録 → tier0 修正候補）

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

Expected: シイタケ・マツタケ・ベニテングタケがそれぞれ正しく和名と URL を持つ。

- [ ] **Step 5: 退避 cache を削除（リカバリ不要と判断したら）**

```bash
rm -rf .cache/phase13/combined.bak
```

このタスクには commit はなし（cache は gitignore）。

---

## Task 8: 大菌輪未収録の tier0 species を確定し、tier0 リストの hygiene 結論を出す

**Files:**
- Modify: `data/tier0-species.json`（必要があれば）
- Create: `docs/phase13/daikinrin-hotfix-report.md`

- [ ] **Step 1: Task 7 Step 3 の miss リストに対し、和名/学名のスペル違い・表記揺れを目視確認**

例: 「Boletus sensibilis (ドクヤマドリモドキ)」が miss なら、`buildIndexMap` で "Boletus sensibilis" を引いて確認。本当に未収録か、和名違いで引けない可能性があるかを判定。

調査メモを `docs/phase13/daikinrin-hotfix-report.md` に追記:

```markdown
# Phase 13-A Hotfix: 大菌輪 fetcher 改修レポート (2026-04-15)

## ヒット率

- 旧 fetcher (MycoBank ID 必須): 0 / 62
- 新 fetcher (index 駆動): <hit数> / 62

## 大菌輪未収録と判定された種

| slug | tier0 wamei | 判断 (excluded / kept-no-source / wamei-fix-needed) | 備考 |
|---|---|---|---|
| Boletus_sensibilis | ドクヤマドリモドキ | excluded | 北米種、和名は架空 |
| ... | ... | ... | ... |

## 取った措置

- tier0 から除外: <件数>
- 和名修正: <件数>
- そのまま保持（大菌輪なしでも採用）: <件数>
```

- [ ] **Step 2: ユーザー判断ゲート**

ここで一旦止めてユーザーに miss リストを共有し、「除外する種・和名修正する種・保持する種」の判断を仰ぐ。

判断結果に従って `data/tier0-species.json` を編集（除外する種は array から削除、和名修正はその場で）。

- [ ] **Step 3: 編集後の tier0 で combined を再生成（必要なら）**

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```

- [ ] **Step 4: tier0 の確定状態をコミット**

```bash
git add data/tier0-species.json docs/phase13/daikinrin-hotfix-report.md
git commit -m "data(phase13a-hotfix): tier0 を大菌輪検証で更新 + report 追加"
```

---

## Task 9: 既存 generated/articles の取り扱いを判断

**Files:**
- 影響: `generated/articles/<slug>.json` × 62

- [ ] **Step 1: 現状を確認**

既存記事は **大菌輪 null の前提で AI 合成された**。新たに大菌輪情報が取得できた種について、記事内容との齟齬が生じている可能性がある。

選択肢:
- **A**. **記事はそのまま、Phase 13-D レビューでソース照合**: 新 combined JSON があれば右パネルに大菌輪情報が出るので、レビュワーが目視で齟齬を判定。齟齬大なら concern/reject。
- **B**. **全 62 件を Phase 13-C で再合成**: Opus concurrency=5 で 1〜2 時間。記事内容も大菌輪由来になるが API コストとブランチが膨らむ。
- **C**. **大菌輪情報が新規取得できた種のみ部分再合成**: 中庸。ただし「どの種を再合成すべきか」の自動判定が難しい。

- [ ] **Step 2: 推奨は A、ユーザー判断ゲート**

A を採用すれば、本タスクで追加コードなし、Phase 13-D に戻ってレビューに移れる。

ユーザーが B or C を希望する場合は、本計画の範囲を超えるため別 plan として `2026-04-XX-phase13c-resynthesis.md` を新規作成する。

- [ ] **Step 3: A 採用の場合の合意記録のみコミット**

```bash
echo "# 既存記事の取り扱い: A 採用（記事 retain、Phase 13-D で目視照合）" >> docs/phase13/daikinrin-hotfix-report.md
git add docs/phase13/daikinrin-hotfix-report.md
git commit -m "docs(phase13a-hotfix): 既存記事は retain して Phase 13-D で照合する方針を記録"
```

---

## Task 10: progress.md 更新 + Phase 13-A 既知 caveat の解消を記録

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/phase13/README.md`（簡易追記）

- [ ] **Step 1: progress.md に hotfix セクションを追加**

`docs/progress.md` の Phase 13-D セクション末尾、または Phase 13-D 直前に以下を挿入:

```markdown
## Phase 13-A Hotfix: 大菌輪 fetcher の index 駆動化 — 完了 (2026-04-15)

設計/計画書: [docs/superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md](./superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md)
レポート: [docs/phase13/daikinrin-hotfix-report.md](./phase13/daikinrin-hotfix-report.md)

### 背景

Phase 13-A の `daikinrin.mjs` は MycoBank ID 必須の旧 URL 形式 (`/Pages/<sci>_<id>.html`) を使っていたが、
GBIF Backbone Taxonomy に MycoBank ID が登録されていないため事実上 0 件解決という既知 caveat があり、
すべての daikinrin fetch が失敗していた。Phase 13-D レビュー UI で「大菌輪 null」が頻発して発覚。

### 修正

- 大菌輪「種名一覧【和名】」インデックスを 1 度 fetch して `.cache/phase13/daikinrin-index.json` にキャッシュ
- (scientificName, japaneseName) → URL の双方向マップを構築
- `fetchDaikinrinPage(scientificName, japaneseName)` に API 変更（mycoBankId 引数を削除）
- caller 3 ファイル (fetch_sources, fetch_tier0_sources, fetch_pilot_sources) を新シグネチャに更新

### 結果

- 旧 fetcher: tier0 daikinrin hit = 0 / 62
- 新 fetcher: tier0 daikinrin hit = <数値> / 62
- 大菌輪未収録判定で tier0 から除外: <件数>
- 既存 generated/articles は retain し、Phase 13-D レビューで新ソースと目視照合する方針

### 既知 caveat の解消

| 旧 caveat | 解消状態 |
|---|---|
| MycoBank ID 0 件解決 → 大菌輪 fetch 全失敗 | ✓ 解消（index 駆動で MycoBank ID 不要） |
```

- [ ] **Step 2: docs/phase13/README.md に追記**

`docs/phase13/README.md` の Phase 13-A の使い方セクションに caveat 解消を脚注:

```markdown
**注 (2026-04-15 hotfix)**: 大菌輪 fetcher は MycoBank ID 必須の旧 URL 形式から
インデックス駆動の新方式に置き換えられた。MycoBank ID なしで全種解決可能。
詳細は [hotfix レポート](./daikinrin-hotfix-report.md)。
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
| 大菌輪 fetcher を MycoBank ID 不要に | Task 2, 3, 5 |
| index 起点で URL 解決 | Task 2, 3 |
| index キャッシュ | Task 3, 4 |
| caller 更新 | Task 6 |
| tier0 re-fetch で実害確認 | Task 7 |
| 大菌輪未収録の tier0 species 判定 | Task 8 |
| 既存記事の取り扱い決定 | Task 9 |
| ドキュメント更新 | Task 10 |

---

## 実装中の落とし穴

- **インデックスがページネーション**ならば Task 1 で発覚。Task 2/3 を「複数ページ fetch + merge」にする変更が必要
- **WebFetch ツールは大菌輪を 404**で返すが curl/Node fetch は通る → 開発時は curl で動作確認
- **学名の表記揺れ**（先頭文字大文字/小文字、`-2` suffix 等）は URL 側のもので、parseDaikinrinIndex で text を分解した時点で正規化しておけば lookup は安定する
- **tier0 wamei が大菌輪表記と異なる**ケース（例: 旧字体 vs 新字体）が発生したら resolveSpeciesUrl が miss する。Task 8 で個別判定
- **キャッシュキー変更**: 旧コードは `${scientificName}_${mycoBankId}` を cache key にしていた。新コードは URL を使う → 既存キャッシュは無効化される（gitignore なので問題なし、ただし worktree 移動時に combined を使い回せない）
- **API 互換破壊**: `fetchDaikinrinPage` の第 2 引数が `mycoBankId` から `japaneseName` に変わる。caller 3 ファイル全更新が必須（Task 6）

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-phase13a-hotfix-daikinrin-index.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 各 Task を fresh subagent にディスパッチ、タスク間でレビュー、fast iteration
2. **Inline Execution** — 本セッション内で executing-plans を使いバッチ実行、チェックポイントでレビュー

Task 1 (調査) と Task 7 (実 fetch + spot check) は対話的判断が必要なので Inline 向き。Task 2, 3, 5, 6 は機械的な実装で subagent にも適する。

どちらで進めますか？
