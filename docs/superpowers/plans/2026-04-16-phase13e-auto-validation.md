# Phase 13-E Implementation Plan: 自動判定強化 + tier0 全再生成 + ラインナップ調整

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** validator/fetcher/prompt の自動判定を強化し、tier0 62 種を新パイプラインで全再生成、かつヤマドリタケモドキ等のラインナップ調整を同時適用して記事品質を底上げする。

**Architecture:** 4 Step 構成。Step 1 でコード変更（TDD）、Step 2 で tier0 targets の canonical 化、Step 3 で combined + wiki-ja キャッシュを破棄して全再生成、Step 4 で種の差し替え/追加を同パイプラインで実施。既存の worktree `phase13d-review-ui` 上で実装する。

**Tech Stack:** Node.js ESM (`.mjs`), Vitest, Next.js 16 (本体)、大菌輪 CC BY 4.0、Wikipedia CC BY-SA 4.0、厚労省/林野庁パブリックドメイン。

**前提ドキュメント:**
- 設計書: `docs/superpowers/specs/2026-04-16-phase13e-auto-validation-design.md`
- 前フェーズ: `docs/superpowers/plans/2026-04-15-phase13d-review-ui.md`
- worktree: `.worktrees/phase13d-review-ui` 上で作業

**ファイル構造:**

```
scripts/phase13/
├── wikipedia.mjs            [MODIFY] redirects:1 除去、requestedTitle 追加
├── wikipedia.test.mjs       [MODIFY] redirect 挙動テスト追加
├── validate_article.mjs     [MODIFY] V9〜V13 追加
├── validate_article.test.mjs[MODIFY] V9〜V13 テスト追加
├── prompt_templates.mjs     [MODIFY] SOURCE_PRIORITY_BLOCK + extract_hint
├── prompt_templates.test.mjs[MODIFY] テスト追加
├── fetch_sources.mjs        [MODIFY] ja_wiki_source_override 対応
├── fetch_tier0_sources.mjs  [MODIFY] --resolve-canonical モード追加、override 伝播
├── fetch_sources.test.mjs   [MODIFY] override テスト追加
├── reset_phase13e.mjs       [CREATE] キャッシュ破棄スクリプト
├── reset_phase13e.test.mjs  [CREATE] 破棄パステスト
└── fixtures/
    ├── article-invalid-romaji-alias.json   [CREATE] V9 反例
    ├── article-invalid-no-wikija-cite.json [CREATE] V10 反例
    ├── combined-wikija-redirect.json       [CREATE] V12 反例入り combined
    └── wikipedia-redirect-response.json    [CREATE] redirect fetch fixture

data/
└── species-ranking.json     [MODIFY] tier0 学名・和名の canonical 化（Step 2）
                             [MODIFY] Boletus/Russula/Lactarius 差し替え・追加（Step 4）
```

---

## Step 1: 検証・fetcher・prompt の強化（コード変更のみ）

### Task 1.1: `wikipedia.mjs` の redirect 挙動変更

**Files:**
- Modify: `scripts/phase13/wikipedia.mjs`
- Modify: `scripts/phase13/wikipedia.test.mjs`

- [ ] **Step 1: 新テストを書く（redirect なしモード + requestedTitle 保存）**

`scripts/phase13/wikipedia.test.mjs` に追記（末尾 describe ブロックの後）：

```js
import { buildApiUrl, parseWikipediaResponse } from './wikipedia.mjs';

describe('buildApiUrl', () => {
  it('redirects パラメータを含まない', () => {
    const url = buildApiUrl('ja', 'アミガサタケ');
    expect(url).not.toMatch(/redirects/);
  });

  it('lang と title をエンコードして組み立てる', () => {
    const url = buildApiUrl('en', 'Morchella esculenta');
    expect(url).toContain('en.wikipedia.org');
    expect(url).toContain('titles=Morchella+esculenta');
  });
});

describe('parseWikipediaResponse with requestedTitle', () => {
  it('requestedTitle を渡すと返却オブジェクトに含む', () => {
    const parsed = parseWikipediaResponse(JA_FIXTURE, 'アミガサタケ');
    expect(parsed.requestedTitle).toBe('アミガサタケ');
  });

  it('requestedTitle が title と異なる場合も両方保持する（redirect 検出用）', () => {
    const redirected = {
      query: {
        pages: {
          '12345': {
            pageid: 12345,
            ns: 0,
            title: 'ヒカゲシビレタケ',
            extract: 'ヒカゲシビレタケは...',
            fullurl: 'https://ja.wikipedia.org/wiki/...',
          },
        },
      },
    };
    const parsed = parseWikipediaResponse(redirected, 'アイゾメシバフタケ');
    expect(parsed.title).toBe('ヒカゲシビレタケ');
    expect(parsed.requestedTitle).toBe('アイゾメシバフタケ');
  });
});
```

- [ ] **Step 2: テスト実行、FAIL を確認**

```bash
cd .worktrees/phase13d-review-ui
npx vitest run scripts/phase13/wikipedia.test.mjs
```
Expected: `buildApiUrl` は未 export のため import エラー、`parseWikipediaResponse` も requestedTitle 引数非対応で FAIL

- [ ] **Step 3: 実装（wikipedia.mjs 書き換え）**

`scripts/phase13/wikipedia.mjs` を以下に差し替え：

```js
/**
 * Wikipedia ja/en 取得。MediaWiki API 利用。
 * License: CC BY-SA 4.0 / GFDL dual. 帰属表示必須。
 *
 * Phase 13-E: redirect を追わない。requestedTitle と title を両方保存して
 *   redirect 被害を validator V12 で検出できるようにする。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCache } from './cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/phase13');
const USER_AGENT = 'MycoNote/1.0 (https://github.com/ennead2/MycoNote; data ingestion; contact: ennead2)';

const jaCache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-ja' });
const enCache = createCache({ dir: CACHE_DIR, namespace: 'wikipedia-en' });

export function buildApiUrl(lang, title) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    explaintext: '1',
    inprop: 'url',
    titles: title,
    format: 'json',
    origin: '*',
  });
  return `${base}?${params.toString()}`;
}

export function parseWikipediaResponse(json, requestedTitle = null) {
  const pages = json?.query?.pages;
  if (!pages) return null;
  const firstKey = Object.keys(pages)[0];
  const page = pages[firstKey];
  if (!page || page.missing !== undefined) return null;
  if (!page.extract || page.extract.length === 0) return null;
  return {
    requestedTitle,
    title: page.title,
    extract: page.extract,
    url: page.fullurl || null,
    pageid: page.pageid,
  };
}

async function fetchLang(lang, title, cache) {
  const cached = await cache.get(title);
  if (cached) return cached;

  const res = await fetch(buildApiUrl(lang, title), { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`wikipedia ${lang} fetch failed: ${res.status}`);
  const json = await res.json();
  const parsed = parseWikipediaResponse(json, title);
  if (!parsed) return null;
  const record = { ...parsed, lang, fetchedAt: new Date().toISOString() };
  await cache.set(title, record);
  return record;
}

export async function fetchWikipediaJa({ japaneseName, scientificName }) {
  if (japaneseName) {
    const hit = await fetchLang('ja', japaneseName, jaCache);
    if (hit) return hit;
  }
  return await fetchLang('ja', scientificName, jaCache);
}

export async function fetchWikipediaEn({ scientificName }) {
  return await fetchLang('en', scientificName, enCache);
}
```

- [ ] **Step 4: テスト再実行して PASS を確認**

```bash
npx vitest run scripts/phase13/wikipedia.test.mjs
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/wikipedia.mjs scripts/phase13/wikipedia.test.mjs
git commit -m "feat(phase13e): wikipedia fetcher から redirects を除去し requestedTitle を保存"
```

---

### Task 1.2: `validate_article.mjs` V9 カタカナ純度チェック

**Files:**
- Modify: `scripts/phase13/validate_article.mjs`
- Modify: `scripts/phase13/validate_article.test.mjs`
- Create: `scripts/phase13/fixtures/article-invalid-romaji-alias.json`

- [ ] **Step 1: 反例 fixture を作成**

`scripts/phase13/fixtures/article-invalid-romaji-alias.json`：

```json
{
  "names": { "aliases": ["アイゾメシバフタケ", "hikageshibiretake"] },
  "season": [{ "start_month": 6, "end_month": 10 }],
  "habitat": ["公園"],
  "regions": ["日本"],
  "tree_association": [],
  "similar_species": [],
  "description": "サンプル記事 [1]。",
  "features": "サンプル [1]。",
  "cooking_preservation": null,
  "poisoning_first_aid": "サンプル [1]。",
  "caution": null,
  "sources": [
    { "name": "Wikipedia ja「X」", "url": "https://ja.wikipedia.org/wiki/X", "license": "CC BY-SA 4.0" }
  ],
  "notes": "V9 反例テスト用"
}
```

- [ ] **Step 2: テスト追加**

`scripts/phase13/validate_article.test.mjs` 末尾に追記：

```js
describe('V9: カタカナ純度チェック', () => {
  it('aliases にラテン文字が混入していると error', () => {
    const result = validateArticle(load('article-invalid-romaji-alias'), { safety: 'toxic' });
    expect(result.errors.some(e => e.startsWith('V9:'))).toBe(true);
  });

  it('aliases が純粋な日本語（漢字・ひらがな・カタカナ・中点・長音符）なら error なし', () => {
    const a = load('article-valid-edible');
    a.names.aliases = ['編笠茸', 'アミガサ・タケ', 'あみがさたけ'];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.filter(e => e.startsWith('V9:'))).toEqual([]);
  });

  it('aliases に空文字が混入していても V9 は発火しない（他 rule で扱う）', () => {
    const a = load('article-valid-edible');
    a.names.aliases = ['編笠茸', ''];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.filter(e => e.startsWith('V9:'))).toEqual([]);
  });
});
```

- [ ] **Step 3: テスト実行、FAIL 確認**

```bash
npx vitest run scripts/phase13/validate_article.test.mjs -t "V9"
```
Expected: V9 未実装で FAIL

- [ ] **Step 4: V9 を validate_article.mjs に実装**

`scripts/phase13/validate_article.mjs` の V8 ブロックの後に追記：

```js
  // V9: aliases のカタカナ純度チェック（ラテン文字・数字の混入を error）
  const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
  if (article.names && Array.isArray(article.names.aliases)) {
    for (const [i, alias] of article.names.aliases.entries()) {
      if (typeof alias === 'string' && alias.length > 0 && LATIN_OR_DIGIT.test(alias)) {
        errors.push(`V9: names.aliases[${i}] "${alias}" にラテン文字/数字が含まれる`);
      }
    }
  }
```

- [ ] **Step 5: テスト再実行、PASS 確認**

```bash
npx vitest run scripts/phase13/validate_article.test.mjs
```
Expected: all PASS（V9 も既存テストも）

- [ ] **Step 6: Commit**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs scripts/phase13/fixtures/article-invalid-romaji-alias.json
git commit -m "feat(phase13e): validate V9 aliases のラテン文字/数字混入を error として検出"
```

---

### Task 1.3: `validate_article.mjs` V10 wikipediaJa 未引用検出

**Files:**
- Modify: `scripts/phase13/validate_article.mjs`
- Modify: `scripts/phase13/validate_article.test.mjs`

**設計上の変更点**: V10 は combined の情報を参照する必要があるため、`validateArticle(article, { safety, combined })` と `combined` を optional 引数として受け取る形に拡張する。

- [ ] **Step 1: テスト追加**

`validate_article.test.mjs` に追記：

```js
describe('V10: wikipediaJa があるのに引用していない', () => {
  const combinedWithJa = {
    sources: {
      wikipediaJa: { title: 'ヒラタケ', extract: 'xxx' },
      wikipediaEn: { title: 'Pleurotus ostreatus', extract: 'yyy' },
    },
  };

  it('wikipediaJa あり、sources に Wikipedia ja がない → warning', () => {
    const a = load('article-valid-edible');
    a.sources = [{ name: 'Wikipedia en「Pleurotus ostreatus」', url: 'https://en.wikipedia.org/wiki/...', license: 'CC BY-SA 4.0' }];
    const result = validateArticle(a, { safety: 'edible', combined: combinedWithJa });
    expect(result.warnings.some(w => w.startsWith('V10:'))).toBe(true);
  });

  it('wikipediaJa あり、sources に Wikipedia ja あり → warning なし', () => {
    const a = load('article-valid-edible');
    // article-valid-edible.json は元々 "Wikipedia ja「アミガサタケ」" を含む
    const result = validateArticle(a, { safety: 'edible', combined: combinedWithJa });
    expect(result.warnings.filter(w => w.startsWith('V10:'))).toEqual([]);
  });

  it('combined が渡されない場合は V10 を発火しない', () => {
    const a = load('article-valid-edible');
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.filter(w => w.startsWith('V10:'))).toEqual([]);
  });

  it('wikipediaJa が null の場合は V10 を発火しない', () => {
    const a = load('article-valid-edible');
    a.sources = [{ name: 'Wikipedia en「X」', url: 'https://en.wikipedia.org/wiki/X', license: 'CC BY-SA 4.0' }];
    const result = validateArticle(a, { safety: 'edible', combined: { sources: { wikipediaJa: null } } });
    expect(result.warnings.filter(w => w.startsWith('V10:'))).toEqual([]);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

```bash
npx vitest run scripts/phase13/validate_article.test.mjs -t "V10"
```
Expected: FAIL

- [ ] **Step 3: V10 を実装**

`validate_article.mjs` の V9 ブロックの後に追記：

```js
  // V10: combined に wikipediaJa があるのに sources[] に Wikipedia ja が無い（warning）
  if (combined?.sources?.wikipediaJa && Array.isArray(article.sources)) {
    const hasWikiJa = article.sources.some(s =>
      typeof s?.name === 'string' && /Wikipedia.*(?:ja|JA|日本語)/u.test(s.name)
    );
    if (!hasWikiJa) {
      warnings.push('V10: combined に wikipediaJa があるが sources に Wikipedia ja 引用なし');
    }
  }
```

また、`validateArticle` のシグネチャを `export function validateArticle(article, { safety, combined } = {}) {` に変更。

- [ ] **Step 4: 既存テストが壊れていないか実行**

```bash
npx vitest run scripts/phase13/validate_article.test.mjs
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs
git commit -m "feat(phase13e): validate V10 wikipediaJa 未引用を warning として検出"
```

---

### Task 1.4: `validate_article.mjs` V11 学名 canonical 一致

**Files:**
- Modify: `scripts/phase13/validate_article.mjs`
- Modify: `scripts/phase13/validate_article.test.mjs`

- [ ] **Step 1: テスト追加**

```js
describe('V11: 学名 canonical 一致', () => {
  it('daikinrin URL から抽出した学名が target と一致 → warning なし', () => {
    const a = load('article-valid-edible');
    const combined = {
      sources: {
        daikinrin: { url: 'https://mycoscouter.coolblog.jp/daikinrin/Pages/Pleurotus_ostreatus_174220.html' },
      },
    };
    const result = validateArticle(a, {
      safety: 'edible',
      combined,
      targetScientificName: 'Pleurotus ostreatus',
    });
    expect(result.warnings.filter(w => w.startsWith('V11:'))).toEqual([]);
  });

  it('daikinrin URL の学名が target と不一致 → warning', () => {
    const a = load('article-valid-edible');
    const combined = {
      sources: {
        daikinrin: { url: 'https://mycoscouter.coolblog.jp/daikinrin/Pages/Pholiota_microspora_235533.html' },
      },
    };
    const result = validateArticle(a, {
      safety: 'edible',
      combined,
      targetScientificName: 'Pholiota nameko',
    });
    expect(result.warnings.some(w => w.startsWith('V11:'))).toBe(true);
  });

  it('daikinrin が null なら V11 は発火しない', () => {
    const a = load('article-valid-edible');
    const result = validateArticle(a, {
      safety: 'edible',
      combined: { sources: { daikinrin: null } },
      targetScientificName: 'Pholiota nameko',
    });
    expect(result.warnings.filter(w => w.startsWith('V11:'))).toEqual([]);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: V11 を実装**

`validate_article.mjs` の V10 の後に追記：

```js
  // V11: daikinrin URL の canonical 学名と target scientificName の不一致（warning）
  const daikinrinUrl = combined?.sources?.daikinrin?.url;
  if (daikinrinUrl && targetScientificName) {
    const m = daikinrinUrl.match(/\/Pages\/([A-Z][a-z]+_[a-z]+(?:_[a-z]+)*)_\d+\.html/);
    if (m) {
      const canonical = m[1].replace(/_/g, ' ');
      if (canonical !== targetScientificName) {
        warnings.push(`V11: target "${targetScientificName}" と daikinrin canonical "${canonical}" が不一致`);
      }
    }
  }
```

シグネチャを `({ safety, combined, targetScientificName } = {})` に拡張。

- [ ] **Step 4: テスト実行、PASS 確認**

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs
git commit -m "feat(phase13e): validate V11 daikinrin canonical 学名の不一致を warning として検出"
```

---

### Task 1.5: `validate_article.mjs` V12 Wikipedia redirect 被害検出

**Files:**
- Modify: `scripts/phase13/validate_article.mjs`
- Modify: `scripts/phase13/validate_article.test.mjs`

- [ ] **Step 1: テスト追加**

```js
describe('V12: Wikipedia redirect 被害検出', () => {
  it('requestedTitle と title が一致 → error なし', () => {
    const a = load('article-valid-edible');
    const combined = {
      sources: {
        wikipediaJa: { requestedTitle: 'アミガサタケ', title: 'アミガサタケ' },
      },
    };
    const result = validateArticle(a, { safety: 'edible', combined });
    expect(result.errors.filter(e => e.startsWith('V12:'))).toEqual([]);
  });

  it('requestedTitle と title が不一致 → error', () => {
    const a = load('article-valid-edible');
    const combined = {
      sources: {
        wikipediaJa: { requestedTitle: 'アイゾメシバフタケ', title: 'ヒカゲシビレタケ' },
      },
    };
    const result = validateArticle(a, { safety: 'edible', combined });
    expect(result.errors.some(e => e.startsWith('V12:'))).toBe(true);
  });

  it('requestedTitle が null（旧キャッシュ）なら V12 は発火しない', () => {
    const a = load('article-valid-edible');
    const combined = {
      sources: { wikipediaJa: { title: 'アミガサタケ' } },
    };
    const result = validateArticle(a, { safety: 'edible', combined });
    expect(result.errors.filter(e => e.startsWith('V12:'))).toEqual([]);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: V12 を実装**

`validate_article.mjs` の V11 の後に追記：

```js
  // V12: Wikipedia ja redirect 被害（requestedTitle ≠ title）を error
  const wj = combined?.sources?.wikipediaJa;
  if (wj?.requestedTitle && wj?.title && wj.requestedTitle !== wj.title) {
    errors.push(`V12: wikipediaJa が "${wj.requestedTitle}" を要求したが "${wj.title}" に redirect された`);
  }
```

- [ ] **Step 4: テスト実行、PASS 確認**

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs
git commit -m "feat(phase13e): validate V12 wikipedia redirect 被害を error として検出"
```

---

### Task 1.6: `validate_article.mjs` V13 season 年中検出

**Files:**
- Modify: `scripts/phase13/validate_article.mjs`
- Modify: `scripts/phase13/validate_article.test.mjs`

- [ ] **Step 1: テスト追加**

```js
describe('V13: season 年中相当の検出', () => {
  it('1 期で 8 ヶ月以上カバーすると warning', () => {
    const a = load('article-valid-edible');
    a.season = [{ start_month: 3, end_month: 11 }];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.some(w => w.startsWith('V13:'))).toBe(true);
  });

  it('1 期で 7 ヶ月以下は warning なし', () => {
    const a = load('article-valid-edible');
    a.season = [{ start_month: 6, end_month: 10 }];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.filter(w => w.startsWith('V13:'))).toEqual([]);
  });

  it('2 期に分かれていれば年中でも warning なし', () => {
    const a = load('article-valid-edible');
    a.season = [
      { start_month: 3, end_month: 5 },
      { start_month: 9, end_month: 11 },
    ];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.filter(w => w.startsWith('V13:'))).toEqual([]);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: V13 を実装**

```js
  // V13: 1 期 season で 8 ヶ月以上カバー（年中扱い）は warning
  if (Array.isArray(article.season) && article.season.length === 1) {
    const s = article.season[0];
    if (Number.isInteger(s?.start_month) && Number.isInteger(s?.end_month)) {
      const span = s.end_month - s.start_month + 1;
      if (span >= 8) {
        warnings.push(`V13: season が 1 期で ${span} ヶ月カバー（年中扱いの疑い）`);
      }
    }
  }
```

- [ ] **Step 4: テスト実行、PASS 確認**

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs
git commit -m "feat(phase13e): validate V13 season 年中扱いを warning として検出"
```

---

### Task 1.7: `generate_articles.mjs` の validate 呼び出しに combined/target を渡す

**Files:**
- Modify: `scripts/phase13/generate_articles.mjs`

V10〜V12 は combined と targetScientificName を必要とするため、generate_articles.mjs の validate 呼び出し側も拡張する。

- [ ] **Step 1: 現状の validate 呼び出し箇所を確認**

```bash
grep -n "validateArticle" scripts/phase13/generate_articles.mjs
```

- [ ] **Step 2: validate モード関数を書き換え**

`validate()` 関数内で、各 manifest entry について combined JSON を読み込み、`validateArticle(article, { safety: entry.safety, combined, targetScientificName: entry.scientificName })` の形で呼び出すよう修正。

具体的な修正は現状コードを読んでから最小差分で行う。既存テスト（`generate_articles.test.mjs`）が通ることを維持する。

- [ ] **Step 3: `generate_articles.test.mjs` を確認して必要なら更新**

```bash
npx vitest run scripts/phase13/generate_articles.test.mjs
```
Expected: all PASS（既存テストは引数増えても optional なので通るはず）

- [ ] **Step 4: Commit**

```bash
git add scripts/phase13/generate_articles.mjs scripts/phase13/generate_articles.test.mjs
git commit -m "feat(phase13e): generate_articles の validate 呼び出しに combined/targetScientificName を渡す"
```

---

### Task 1.8: `prompt_templates.mjs` に SOURCE_PRIORITY_BLOCK を追加

**Files:**
- Modify: `scripts/phase13/prompt_templates.mjs`
- Modify: `scripts/phase13/prompt_templates.test.mjs`

- [ ] **Step 1: テスト追加**

```js
import { buildArticlePrompt, SOURCE_PRIORITY_BLOCK } from './prompt_templates.mjs';

describe('SOURCE_PRIORITY_BLOCK', () => {
  it('ja 優先、en 補助、mhlw 優先の順を含む', () => {
    expect(SOURCE_PRIORITY_BLOCK).toContain('wikipediaJa');
    expect(SOURCE_PRIORITY_BLOCK).toContain('wikipediaEn');
    expect(SOURCE_PRIORITY_BLOCK).toContain('mhlw');
    expect(SOURCE_PRIORITY_BLOCK).toMatch(/ja.*優先|優先.*ja/u);
  });
});

describe('buildArticlePrompt', () => {
  it('SOURCE_PRIORITY_BLOCK を含む', () => {
    const p = buildArticlePrompt({
      japaneseName: 'テスト', scientificName: 'Testus testus', safety: 'edible',
      combinedJsonPath: 'x.json', outputJsonPath: 'y.json',
    });
    expect(p).toContain(SOURCE_PRIORITY_BLOCK);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: SOURCE_PRIORITY_BLOCK を実装**

`prompt_templates.mjs` に追加：

```js
export const SOURCE_PRIORITY_BLOCK = `# ソース採用優先順位
1. wikipediaJa があれば主情報源として最優先。和名・別名・形態・発生生態・食文化すべて ja を基準にする
2. daikinrin は学名・分類・分布の canonical source として併用（license: CC BY 4.0）
3. wikipediaEn は ja に情報がない項目（海外分布、近年の分類変更等）の補助のみ。ja と矛盾する場合は ja を採用
4. mhlw は食毒・中毒情報の一次情報源として最優先（他ソースと矛盾した場合 mhlw 採用）
5. sources[] には実際に使用したソースのみ記載。wikipediaJa を使ったら必ず "Wikipedia ja「<title>」" を含める`;
```

`buildArticlePrompt` のテンプレート内、`# 絶対遵守ルール` の直後に `${SOURCE_PRIORITY_BLOCK}` を挿入。

- [ ] **Step 4: テスト実行、PASS 確認**

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/prompt_templates.mjs scripts/phase13/prompt_templates.test.mjs
git commit -m "feat(phase13e): prompt に SOURCE_PRIORITY_BLOCK を追加し wikipediaJa を最優先"
```

---

### Task 1.9: `prompt_templates.mjs` に extract_hint サポート追加

**Files:**
- Modify: `scripts/phase13/prompt_templates.mjs`
- Modify: `scripts/phase13/prompt_templates.test.mjs`

- [ ] **Step 1: テスト追加**

```js
describe('buildArticlePrompt with extractHint', () => {
  it('extractHint を渡すと prompt に含まれる', () => {
    const p = buildArticlePrompt({
      japaneseName: 'アカハツ',
      scientificName: 'Lactarius akahatsu',
      safety: 'edible',
      combinedJsonPath: 'x.json',
      outputJsonPath: 'y.json',
      extractHint: '記事内の『類似種』セクションのアカハツ部分のみ使用',
    });
    expect(p).toContain('類似種');
    expect(p).toContain('アカハツ部分のみ使用');
  });

  it('extractHint が undefined ならヒントブロックは出ない', () => {
    const p = buildArticlePrompt({
      japaneseName: 'テスト', scientificName: 'Testus testus', safety: 'edible',
      combinedJsonPath: 'x.json', outputJsonPath: 'y.json',
    });
    expect(p).not.toMatch(/部分抽出ヒント|extract_hint/);
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: buildArticlePrompt を拡張**

`buildArticlePrompt({ ..., extractHint })` を受け取り、`extractHint` が truthy なら以下のブロックを prompt に挿入：

```
# 部分抽出ヒント（ja wiki の全文ではなく一部だけ使う）
${extractHint}
```

- [ ] **Step 4: テスト実行、PASS 確認**

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/prompt_templates.mjs scripts/phase13/prompt_templates.test.mjs
git commit -m "feat(phase13e): prompt に extractHint 引数を追加（ja wiki 部分抽出指示用）"
```

---

### Task 1.10: `fetch_sources.mjs` に ja_wiki_source_override 対応

**Files:**
- Modify: `scripts/phase13/fetch_sources.mjs`
- Modify: `scripts/phase13/fetch_sources.test.mjs`

- [ ] **Step 1: 現状の combineSources/fetchFor を確認**

```bash
grep -n "combineSources\|fetchFor\|japaneseName" scripts/phase13/fetch_sources.mjs | head -20
```

- [ ] **Step 2: テスト追加**

`fetch_sources.test.mjs` に、combineSources 関数が `extractHint` と override タイトルを combined に含めるパスのテストを追加：

```js
describe('combineSources with ja_wiki_source_override', () => {
  it('override 経由で fetch された wikipediaJa と extract_hint が combined に入る', () => {
    const combined = combineSources({
      scientificName: 'Lactarius akahatsu',
      daikinrin: null,
      wikipediaJa: { requestedTitle: 'ハツタケ', title: 'ハツタケ', extract: 'ハツタケは...', lang: 'ja' },
      wikipediaEn: null,
      mhlw: null,
      rinya: null,
      traitCircus: null,
      extractHint: '類似種セクションのアカハツ部分のみ使用',
    });
    expect(combined.sources.wikipediaJa.title).toBe('ハツタケ');
    expect(combined.extractHint).toBe('類似種セクションのアカハツ部分のみ使用');
  });
});
```

- [ ] **Step 3: テスト実行、FAIL 確認**

- [ ] **Step 4: combineSources の拡張**

`fetch_sources.mjs` の `combineSources` に `extractHint` オプション引数を追加し、combined の top-level に `extractHint` を含める。

- [ ] **Step 5: テスト実行、PASS 確認**

- [ ] **Step 6: Commit**

```bash
git add scripts/phase13/fetch_sources.mjs scripts/phase13/fetch_sources.test.mjs
git commit -m "feat(phase13e): combineSources に extractHint を受け取る経路を追加"
```

---

### Task 1.11: `fetch_tier0_sources.mjs` に override 伝播と --resolve-canonical モード追加

**Files:**
- Modify: `scripts/phase13/fetch_tier0_sources.mjs`

- [ ] **Step 1: manifest エントリに `jaWikiSourceOverride` を含める**

`generate_articles.mjs` の `buildManifestEntry` と `tier0ToPromptInput` を拡張し、species-ranking.json 上の target が `ja_wiki_source_override: { title, extract_hint }` を持つ場合に manifest に transparent に伝播させる。

- [ ] **Step 2: fetch_tier0_sources.mjs の fetchFor を拡張**

既存 `fetchFor({ scientificName, japaneseName })` を以下のシグネチャへ：

```js
async function fetchFor({ scientificName, japaneseName, jaWikiSourceOverride }) {
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
    fetchWikipediaEn({ scientificName }).catch(() => null),
    fetchMhlwEntry(scientificName).catch(() => null),
    fetchRinyaOverview().catch(() => null),
    fetchTraitCircus(scientificName).catch(() => null),
  ]);
  const jaName = daikinrin?.japaneseName ?? mhlw?.japaneseName ?? japaneseName;
  let wikipediaJa;
  if (jaWikiSourceOverride?.title) {
    wikipediaJa = await fetchWikipediaJa({ japaneseName: jaWikiSourceOverride.title, scientificName: null })
      .catch(() => null);
  } else {
    wikipediaJa = await fetchWikipediaJa({ japaneseName: jaName, scientificName })
      .catch(() => null);
  }
  return combineSources({
    scientificName,
    daikinrin,
    wikipediaJa,
    wikipediaEn,
    mhlw,
    rinya,
    traitCircus,
    extractHint: jaWikiSourceOverride?.extract_hint ?? null,
  });
}
```

main() 内でも manifest エントリから `jaWikiSourceOverride` を取り出して fetchFor に渡す。

- [ ] **Step 3: --resolve-canonical モードを追加**

`fetch_tier0_sources.mjs` の main() を以下のように拡張：

```js
async function main() {
  const args = process.argv.slice(2);
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 3;
  const resolveCanonical = args.includes('--resolve-canonical');

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

  if (resolveCanonical) {
    return runResolveCanonical(manifest, concurrency);
  }

  // 既存の combined 生成ロジックは以下
  const missing = manifest.filter(m => !m.hasCombined);
  // ...
}

async function runResolveCanonical(manifest, concurrency) {
  const diffs = [];
  await runPool(manifest, async (m) => {
    const dk = await fetchDaikinrinPage(m.scientificName, m.japaneseName).catch(() => null);
    if (!dk?.url) return;
    const match = dk.url.match(/\/Pages\/([A-Z][a-z]+_[a-z]+(?:_[a-z]+)*)_\d+\.html/);
    if (!match) return;
    const canonical = match[1].replace(/_/g, ' ');
    if (canonical !== m.scientificName) {
      diffs.push({
        slug: m.slug,
        target: m.scientificName,
        canonical,
        daikinrin_japaneseName: dk.japaneseName ?? null,
        daikinrin_url: dk.url,
      });
    }
  }, concurrency);

  const outPath = '.cache/phase13/canonical-diff.json';
  writeFileSync(outPath, JSON.stringify(diffs, null, 2), 'utf8');
  console.log(`canonical-diff written to ${outPath}: ${diffs.length} mismatches`);
  for (const d of diffs) {
    console.log(`  ${d.slug}: "${d.target}" → "${d.canonical}" (ja=${d.daikinrin_japaneseName})`);
  }
}
```

- [ ] **Step 4: dry-run テスト（手動）**

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs --resolve-canonical --concurrency=5
cat .cache/phase13/canonical-diff.json | head -40
```
Expected: Pholiota_nameko → microspora, Omphalotus_guepiniiformis → japonicus など 3〜5 件の diff が出力される

- [ ] **Step 5: Commit**

```bash
git add scripts/phase13/fetch_tier0_sources.mjs scripts/phase13/generate_articles.mjs
git commit -m "feat(phase13e): fetch_tier0_sources に --resolve-canonical と ja_wiki_source_override 伝播を追加"
```

---

### Task 1.12: `reset_phase13e.mjs` スクリプトを作成

**Files:**
- Create: `scripts/phase13/reset_phase13e.mjs`
- Create: `scripts/phase13/reset_phase13e.test.mjs`

- [ ] **Step 1: テストを書く**

`scripts/phase13/reset_phase13e.test.mjs`：

```js
import { describe, it, expect } from 'vitest';
import { RESET_TARGETS, RESET_PRESERVES } from './reset_phase13e.mjs';

describe('reset_phase13e targets', () => {
  it('破棄リストに combined と wikipedia-ja を含む', () => {
    expect(RESET_TARGETS).toContain('.cache/phase13/combined');
    expect(RESET_TARGETS).toContain('.cache/phase13/wikipedia-ja');
  });

  it('破棄リストに generated/articles と approved を含む', () => {
    expect(RESET_TARGETS).toContain('generated/articles');
    expect(RESET_TARGETS).toContain('generated/articles/approved');
  });

  it('保持リストに wikipedia-en と daikinrin を含む', () => {
    expect(RESET_PRESERVES).toContain('.cache/phase13/wikipedia-en');
    expect(RESET_PRESERVES).toContain('.cache/phase13/daikinrin');
  });

  it('破棄リストと保持リストは排他的', () => {
    for (const t of RESET_TARGETS) {
      expect(RESET_PRESERVES).not.toContain(t);
    }
  });
});
```

- [ ] **Step 2: テスト実行、FAIL 確認**

- [ ] **Step 3: reset_phase13e.mjs を実装**

```js
/**
 * Phase 13-E のキャッシュ破棄スクリプト。
 * redirect 有り状態で作られた wikipedia-ja と combined、および旧パイプラインで
 * 生成された記事・承認・レビュー進捗を破棄して、新パイプラインで再走可能にする。
 *
 * Usage:
 *   node scripts/phase13/reset_phase13e.mjs --dry
 *   node scripts/phase13/reset_phase13e.mjs --confirm
 */
import { rmSync, existsSync } from 'node:fs';

export const RESET_TARGETS = [
  '.cache/phase13/combined',
  '.cache/phase13/wikipedia-ja',
  '.cache/phase13/generated',
  '.cache/phase13/prompts',
  'generated/articles',
  'generated/articles/approved',
  'scripts/temp/review-v2-progress.json',
];

export const RESET_PRESERVES = [
  '.cache/phase13/wikipedia-en',
  '.cache/phase13/daikinrin',
  '.cache/phase13/daikinrin-pages.json',
  '.cache/phase13/mhlw',
  '.cache/phase13/rinya',
  '.cache/phase13/trait-circus',
  '.cache/phase13/gbif',
  '.cache/phase13/inat',
  '.cache/phase13/mycobank',
];

export function runReset({ dry = true } = {}) {
  const deleted = [];
  for (const path of RESET_TARGETS) {
    if (existsSync(path)) {
      if (!dry) rmSync(path, { recursive: true, force: true });
      deleted.push(path);
    }
  }
  return deleted;
}

function main() {
  const args = process.argv.slice(2);
  const isDry = !args.includes('--confirm');
  const deleted = runReset({ dry: isDry });
  console.log(isDry ? '=== DRY RUN ===' : '=== EXECUTED ===');
  console.log('Targets:');
  for (const p of deleted) console.log(`  - ${p}`);
  console.log(`Preserved: ${RESET_PRESERVES.length} paths`);
  if (isDry) {
    console.log('\nTo execute: node scripts/phase13/reset_phase13e.mjs --confirm');
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('reset_phase13e.mjs')) {
  main();
}
```

- [ ] **Step 4: テスト実行、PASS 確認**

```bash
npx vitest run scripts/phase13/reset_phase13e.test.mjs
```

- [ ] **Step 5: dry-run 手動確認**

```bash
node scripts/phase13/reset_phase13e.mjs
```
Expected: `=== DRY RUN ===` で、破棄対象パスがリストされる（実削除なし）

- [ ] **Step 6: Commit**

```bash
git add scripts/phase13/reset_phase13e.mjs scripts/phase13/reset_phase13e.test.mjs
git commit -m "feat(phase13e): reset_phase13e.mjs でキャッシュ破棄スクリプトを追加"
```

---

### Task 1.13: 全テスト通過確認と Step 1 締め commit

- [ ] **Step 1: 全テスト実行**

```bash
cd .worktrees/phase13d-review-ui
npx vitest run
```
Expected: 全テスト PASS（既存 233 + 新規 約 25 = 258 前後）

- [ ] **Step 2: プロダクションビルドが壊れていないか確認**

```bash
npm run build 2>&1 | tail -20
```
Expected: build success（または既存と同じ warning のみ）

- [ ] **Step 3: progress.md 更新**

`docs/progress.md` に Phase 13-E Step 1 完了を追記。

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs(phase13e): Step 1 完了を progress.md に記録"
```

---

## Step 2: tier0_targets の canonical 化

### Task 2.1: canonical-diff を実行して差分確認

- [ ] **Step 1: prepare + resolve-canonical を走らせる**

```bash
cd .worktrees/phase13d-review-ui
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs --resolve-canonical --concurrency=5
```

- [ ] **Step 2: 結果を確認**

```bash
cat .cache/phase13/canonical-diff.json
```

Expected: 以下の既知ケースが含まれる：
- Pholiota_nameko → Pholiota microspora
- Omphalotus_guepiniiformis → Omphalotus japonicus
- Tricholoma_ustale → Tricholoma kakishimeji（user note より）
- その他 daikinrin が別学名を持っているケース

- [ ] **Step 3: ユーザーに diff を見せて判断を仰ぐ**

この step は plan 実行者が**ユーザー確認を挟む**。diff の各エントリについて「差し替える / 据え置く」を決める。

---

### Task 2.2: `data/species-ranking.json` の tier0 エントリを canonical に更新

**Files:**
- Modify: `data/species-ranking.json`

- [ ] **Step 1: canonical-diff.json を元に species-ranking.json の tier0 を編集**

ユーザーが判定した結果に従い、tier0 エントリの `scientificName` と `japaneseName` を修正。例：

```diff
-    { "scientificName": "Pholiota nameko", "japaneseName": "ナメコ", "tier": 0, ... }
+    { "scientificName": "Pholiota microspora", "japaneseName": "ナメコ", "tier": 0, ... }
```

対応予定（canonical-diff と user review から）：
- Pholiota nameko → Pholiota microspora
- Omphalotus guepiniiformis → Omphalotus japonicus
- Tricholoma ustale → Tricholoma kakishimeji（※要確認：daikinrin が Tricholoma kakishimeji を canonical として持つか）
- Laccaria amethystina の japaneseName を "ウラムラサキ" に修正（現状 "カレバキツネタケ"）

※Laccaria は canonical-diff では捕まらない（daikinrin の japaneseName が null なので）。別途手動修正。

- [ ] **Step 2: 既存テスト実行**

```bash
npx vitest run
```
Expected: all PASS（ranking は消費者が柔軟なので通るはず）

- [ ] **Step 3: Commit**

```bash
git add data/species-ranking.json
git commit -m "data(phase13e): tier0 学名と和名を大菌輪 canonical に揃える"
```

---

## Step 3: tier0 全再生成

### Task 3.1: 破棄前スナップショット commit

- [ ] **Step 1: 現状をスナップショット**

```bash
git status
git add -A
git commit -m "chore(phase13e): pre-reset snapshot before Phase 13-E regeneration" --allow-empty
```

Expected: 直前の状態が commit される。

---

### Task 3.2: reset 実行

- [ ] **Step 1: dry-run で破棄対象を確認**

```bash
node scripts/phase13/reset_phase13e.mjs
```
Expected: 破棄対象パスが列挙される

- [ ] **Step 2: 実行**

```bash
node scripts/phase13/reset_phase13e.mjs --confirm
```
Expected: `=== EXECUTED ===` 表示、指定パスが削除される

- [ ] **Step 3: 削除の確認**

```bash
ls .cache/phase13/combined/ 2>&1 | head -5
ls .cache/phase13/wikipedia-ja/ 2>&1 | head -5
ls generated/articles/ 2>&1 | head -5
ls generated/articles/approved/ 2>&1 | head -5
```
Expected: すべて "No such file or directory" or empty

---

### Task 3.3: combined 再 fetch（62 種）

- [ ] **Step 1: prepare を再実行（species-ranking.json 更新後）**

```bash
node scripts/phase13/generate_articles.mjs --prepare
```
Expected: `prepared 62 targets ... missing combined source: 62`

- [ ] **Step 2: combined を再 fetch**

```bash
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=5
```
Expected: 62 種すべて OK ログ、各 summary に `wikiJa=✓ daikinrin=✓` が並ぶ（en は一部 null）

- [ ] **Step 3: wikipediaJa redirect が無いことを抜き打ち確認**

```bash
node -e "
const fs=require('fs');
const slugs=['Psilocybe_subcaerulipes','Pleurotus_ostreatus','Russula_emetica'];
for (const s of slugs) {
  try {
    const c=JSON.parse(fs.readFileSync('.cache/phase13/combined/'+s+'.json','utf8'));
    const w=c.sources?.wikipediaJa;
    console.log(s,'requested=',w?.requestedTitle,'title=',w?.title,'match=',w?.requestedTitle===w?.title);
  } catch(e) { console.log(s,'ERR',e.message); }
}
"
```
Expected: すべて `match=true`（redirect 被害ゼロ）

- [ ] **Step 4: Commit（.cache はコミットしないが、進捗記録として）**

```bash
git add docs/progress.md  # 進捗更新
git commit -m "chore(phase13e): tier0 62 種の combined 再 fetch 完了 (redirect-free)"
```

---

### Task 3.4: LLM で 62 種記事生成

この step は LLM 実行を伴うため、plan executor（Claude Code）が subagent で並列実行する。

- [ ] **Step 1: manifest を再 prepare**

```bash
node scripts/phase13/generate_articles.mjs --prepare
```
Expected: `with combined source: 62`

- [ ] **Step 2: 生成並列実行**

plan 実行時、`.cache/phase13/prompts/manifest.json` の各エントリを subagent に割り振って生成。各 subagent の指示：

```
以下の prompt を読み、指示通りに JSON を生成して Write せよ。
Prompt: .cache/phase13/prompts/<slug>.txt
出力先: .cache/phase13/generated/<slug>.json
```

並列度：5（API rate limit を考慮）。

- [ ] **Step 3: 全生成完了後、validate 実行**

```bash
node scripts/phase13/generate_articles.mjs --validate
cat .cache/phase13/generation-report.json | head -100
```
Expected: errors 合計ゼロ（またはゼロを目指す）。warnings は V10/V11/V13 を含み得る

- [ ] **Step 4: 警告のあるエントリを確認**

```bash
node -e "
const r=JSON.parse(require('fs').readFileSync('.cache/phase13/generation-report.json','utf8'));
const withE=r.filter(x=>x.errors?.length>0);
const withW=r.filter(x=>x.warnings?.length>0);
console.log('errors:',withE.length,'warnings:',withW.length);
for (const x of withE.slice(0,10)) console.log('E',x.slug,x.errors);
for (const x of withW.slice(0,20)) console.log('W',x.slug,x.warnings);
"
```
Expected: errors はゼロが望ましい。errors があれば該当種のみ再生成で対処

- [ ] **Step 5: 記事を generated/articles/ にコピー**

```bash
node -e "
const fs=require('fs');
const path=require('path');
fs.mkdirSync('generated/articles',{recursive:true});
for (const f of fs.readdirSync('.cache/phase13/generated')) {
  if (!f.endsWith('.json')) continue;
  fs.copyFileSync('.cache/phase13/generated/'+f,'generated/articles/'+f);
}
console.log('copied',fs.readdirSync('generated/articles').length,'files');
"
```
Expected: `copied 62 files`

- [ ] **Step 6: Commit**

```bash
git add generated/articles/
git commit -m "data(phase13e): tier0 62 種を新パイプラインで全再生成"
```

---

### Task 3.5: レビュー UI で再レビュー

この step は**ユーザーが UI で判定を行う**。

- [ ] **Step 1: レビューサーバ起動**

```bash
node scripts/review-v2/server.mjs
```
Expected: port 3031 で起動

- [ ] **Step 2: ブラウザでアクセス**

http://localhost:3031 を開き、62 種を順に判定。

- [ ] **Step 3: 判定完了後、結果サマリを確認**

```bash
node -e "
const d=JSON.parse(require('fs').readFileSync('scripts/temp/review-v2-progress.json','utf8'));
const ds=d.decisions;
const counts={};
for (const v of Object.values(ds)) counts[v.decision]=(counts[v.decision]||0)+1;
console.log('total:',Object.keys(ds).length,counts);
"
```
Expected: concern + reject 合計が前回（14）より減少。目標 5 件以下。

- [ ] **Step 4: Commit（approved ディレクトリ + progress を保存）**

```bash
git add generated/articles/approved/ scripts/temp/review-v2-progress.json
git commit -m "data(phase13e): tier0 62 種の再レビュー完了"
```

---

## Step 4: ラインナップ調整（差し替え + 追加）

### Task 4.1: `data/species-ranking.json` のラインナップ更新

**Files:**
- Modify: `data/species-ranking.json`

- [ ] **Step 1: 差し替え 2 件を編集**

```diff
-    { "scientificName": "Boletus edulis", "japaneseName": "ヤマドリタケ", "tier": 0, ... }
+    { "scientificName": "Boletus reticulatus", "japaneseName": "ヤマドリタケモドキ", "tier": 0, ... }

-    { "scientificName": "Russula nobilis", "japaneseName": "ドクベニダマシ", "tier": 0, ... }
+    { "scientificName": "Russula emetica", "japaneseName": "ドクベニタケ", "tier": 0, ... }
```

- [ ] **Step 2: 現 Lactarius hatsudake を「ハツタケ」に再定義**

```diff
-    { "scientificName": "Lactarius hatsudake", "japaneseName": "アカハツ", "tier": 0, ... }
+    { "scientificName": "Lactarius hatsudake", "japaneseName": "ハツタケ", "tier": 0, ... }
```

- [ ] **Step 3: Lactarius akahatsu を新規追加**

```json
    {
      "scientificName": "Lactarius akahatsu",
      "japaneseName": "アカハツ",
      "tier": 0,
      "signals": { "toxicity": "edible", ... },
      "ja_wiki_source_override": {
        "title": "ハツタケ",
        "extract_hint": "記事内の『類似種』または『近縁種』セクションのアカハツに関する記述のみを使用し、ハツタケ本体の記述と混同しないこと"
      }
    }
```

※既存エントリのフォーマット（他フィールド）を保って追記。

- [ ] **Step 4: Commit**

```bash
git add data/species-ranking.json
git commit -m "data(phase13e): ラインナップ調整 (ヤマドリタケモドキ差し替え、アカハツ追加)"
```

---

### Task 4.2: 差し替え/追加種の combined fetch と生成

- [ ] **Step 1: 既存 combined を部分破棄**

```bash
rm -f .cache/phase13/combined/Boletus_edulis.json
rm -f .cache/phase13/combined/Russula_nobilis.json
rm -f .cache/phase13/combined/Lactarius_hatsudake.json
```

- [ ] **Step 2: prepare 再実行**

```bash
node scripts/phase13/generate_articles.mjs --prepare
```
Expected: `prepared 63 targets`（62 から 1 増えた。reticulatus, emetica, hatsudake, akahatsu が missing combined）

- [ ] **Step 3: combined fetch**

```bash
node scripts/phase13/fetch_tier0_sources.mjs --concurrency=3
```
Expected: 4 件の combined 生成

- [ ] **Step 4: akahatsu の combined を目視確認**

```bash
node -e "
const c=JSON.parse(require('fs').readFileSync('.cache/phase13/combined/Lactarius_akahatsu.json','utf8'));
console.log('extractHint:',c.extractHint);
console.log('wikipediaJa.title:',c.sources?.wikipediaJa?.title);
"
```
Expected: extractHint に「類似種」の指示、wikipediaJa.title = "ハツタケ"

- [ ] **Step 5: LLM で 4 種（reticulatus, emetica, hatsudake, akahatsu）生成**

plan executor が subagent で各 slug を生成：

```
Prompt: .cache/phase13/prompts/Boletus_reticulatus.txt → .cache/phase13/generated/Boletus_reticulatus.json
（他 3 件も同様）
```

- [ ] **Step 6: validate 実行**

```bash
node scripts/phase13/generate_articles.mjs --validate
```
Expected: errors ゼロ、V10/V13 等の warnings 最小限

- [ ] **Step 7: generated/articles に反映**

```bash
cp .cache/phase13/generated/Boletus_reticulatus.json generated/articles/
cp .cache/phase13/generated/Russula_emetica.json generated/articles/
cp .cache/phase13/generated/Lactarius_hatsudake.json generated/articles/
cp .cache/phase13/generated/Lactarius_akahatsu.json generated/articles/
rm -f generated/articles/Boletus_edulis.json
rm -f generated/articles/Russula_nobilis.json
```

- [ ] **Step 8: Commit**

```bash
git add generated/articles/
git commit -m "data(phase13e): ラインナップ差し替え/追加 4 種を生成"
```

---

### Task 4.3: 差し替え/追加種のレビュー

- [ ] **Step 1: レビュー UI 再起動**

```bash
node scripts/review-v2/server.mjs
```

- [ ] **Step 2: 4 種（reticulatus, emetica, hatsudake, akahatsu）を判定**

UI で新 slug のみ絞って判定。既判定種は触らない。

- [ ] **Step 3: Commit**

```bash
git add generated/articles/approved/ scripts/temp/review-v2-progress.json
git commit -m "data(phase13e): 差し替え/追加 4 種のレビュー完了"
```

---

## Step 5: 仕上げ

### Task 5.1: 完了基準チェックと progress.md 更新

- [ ] **Step 1: DoD チェックリスト実行**

```bash
# 1. 全テスト通過
npx vitest run

# 2. errors ゼロ
node -e "
const r=JSON.parse(require('fs').readFileSync('.cache/phase13/generation-report.json','utf8'));
const e=r.filter(x=>x.errors?.length>0);
console.log('errors:',e.length);
"

# 3. レビュー判定分布
node -e "
const d=JSON.parse(require('fs').readFileSync('scripts/temp/review-v2-progress.json','utf8'));
const c={};for(const v of Object.values(d.decisions))c[v.decision]=(c[v.decision]||0)+1;
console.log(c);
"
```
Expected: errors=0, concern+reject ≤ 5

- [ ] **Step 2: `docs/progress.md` に Phase 13-E 完了を追記**

Step 別の完了日時・最終レビュー結果・差し替え内訳を記録。

- [ ] **Step 3: memory 更新**

`C:\Users\asaku\.claude\projects\C--Users-asaku-Desktop-pc-data-works-MycoNote\memory\` に Phase 13-E 完了メモを追加し、MEMORY.md の該当行を更新。

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs(phase13e): Phase 13-E 完了を記録"
```

---

### Task 5.2: main へ merge

- [ ] **Step 1: main に戻って merge**

```bash
cd C:\Users\asaku\Desktop\pc_data\works\MycoNote
git checkout main
git merge --no-ff phase13d-review-ui -m "merge: Phase 13-E — 自動判定強化 + tier0 全再生成 + ラインナップ調整"
```

- [ ] **Step 2: push**

```bash
git push origin main
```

- [ ] **Step 3: worktree を削除**

```bash
git worktree remove .worktrees/phase13d-review-ui
git branch -d phase13d-review-ui
```

---

## 付録：LLM 生成ガイダンス（subagent 向け）

各 subagent への指示テンプレ：

```
あなたは MycoNote Phase 13-E の記事生成 subagent です。

以下のプロンプトを読み、そこに書かれた指示に完全に従って JSON を生成してください。

Prompt path: .cache/phase13/prompts/<slug>.txt

プロンプト内に combined JSON のパスと出力先パスが指定されています。
combined JSON を Read ツールで読み、指示された出力パスに Write ツールで JSON を書き込んでください。
応答は `done: <path> (<size>)` のみ。

注意事項:
- sources[] には実際に引用したソースのみ記載
- wikipediaJa を主情報源とすること（SOURCE_PRIORITY_BLOCK 参照）
- 文字数上限・学名混入禁止・散文形式厳守（RULES_BLOCK 参照）
- extract_hint が combined に含まれていれば、その指示に従って該当部分のみ使用
```

---

## Self-Review（計画作成者による）

- [x] Spec の各セクションに対応するタスクあり（Section A → Task 1.2-1.6, Section B → 1.1, Section C → 1.10-1.11, Section D → 1.8-1.9, Section E → 1.12/3.x, Section F → 4.x）
- [x] Placeholder スキャン：TBD/TODO/implement later なし
- [x] Type consistency：`validateArticle({ safety, combined, targetScientificName })` が Task 1.3-1.5 で一貫、`buildArticlePrompt({ ..., extractHint })` が Task 1.9-1.11 で一貫
- [x] reset_phase13e.mjs の RESET_TARGETS/RESET_PRESERVES が設計書の E-1 と一致

**既知の限界**:
- Step 3 Task 3.4 の「LLM 並列実行」は具体的な subagent 呼び出しコマンドではなく「実行者が subagent-driven-development skill 経由で実行する」前提。概念的な指示のみ。
- Lactarius ustaloides（reject 済）の扱いは Step 3 後の判断に委ねる。必要に応じて species-ranking.json から削除する task を追加する（Task 2.2 の延長で対応可能）。
