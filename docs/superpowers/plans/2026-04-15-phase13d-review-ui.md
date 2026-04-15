# Phase 13-D: v2 レビュー UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `generated/articles/*.json` × 62（tier0）を人間判定するための dev-only レビュー UI を `scripts/review-v2/` に構築し、approve 済み記事を `generated/articles/approved/` に揃える。

**Architecture:** Phase 12-F `scripts/review/` と同じ作法で Node HTTP サーバー + vanilla JS + HTML + CSS の単独ツール（no build、no framework）。server のビジネスロジックは unit test で固め、UI 部分は手動確認。port は 3031（既存 3030 と衝突しない）。

**Tech Stack:** Node.js 20+ (native http + fs + node:test), ES Modules, vanilla JS (ES Module `<script type="module">`), CSS Grid。新規依存なし。

**Spec:** `docs/superpowers/specs/2026-04-15-phase13d-review-ui-design.md`

---

## Task 1: ディレクトリ構成と README、fixture 準備

**Files:**
- Create: `scripts/review-v2/README.md`
- Create: `scripts/review-v2/fixtures/generated-articles/Sample_valid.json`
- Create: `scripts/review-v2/fixtures/generated-articles/Sample_warning.json`
- Create: `scripts/review-v2/fixtures/combined/Sample_valid.json`
- Create: `scripts/review-v2/fixtures/generation-report.json`
- Create: `generated/articles/approved/.gitkeep`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p scripts/review-v2/fixtures/generated-articles
mkdir -p scripts/review-v2/fixtures/combined
mkdir -p generated/articles/approved
touch generated/articles/approved/.gitkeep
```

- [ ] **Step 2: README.md を作成**

`scripts/review-v2/README.md`:

````markdown
# MycoNote Phase 13-D Review Tool (v2)

Phase 13-C で合成された `generated/articles/*.json` × 62（tier0）を人間判定する dev-only ツール。

## 事前準備（初回のみ）

combined JSON（右パネルのソース表示用）を揃える。`.cache/` は gitignore されているため、worktree から main に戻った場合などは再生成が必要。

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs
```

combined JSON がない種は「情報なし」で審査画面を表示するので、この手順はスキップ可能。

## 起動

```bash
node scripts/review-v2/server.mjs
# → http://localhost:3031 を Chrome で開く
```

## フロー

1. 画面上部に 62 種の進捗バーが表示される
2. 未判定の最初の種から順に表示
3. 1 種ごとに判定:

| キー | 判定 | 意味 |
|---|---|---|
| `1` | approve | 採用可、本番投入 OK |
| `2` | concern | 一部問題あり（セクション選択 + メモ入力） |
| `3` | reject | 全面再生成が必要 |
| `0` | クリア | 判定取消 |
| `N` | メモ欄フォーカス | |
| `G` | Google 画像検索を新タブで開く | |
| `Enter` / `→` | 次の種へ | |
| `←` | 前の種へ | |

4. approve 判定された記事は `generated/articles/approved/<slug>.json` に自動コピーされる
5. 判定履歴は `scripts/temp/review-v2-progress.json` に autosave（途中終了 → 再起動で継続）

## 出力

- `scripts/temp/review-v2-progress.json` — 判定履歴（autosave）
- `generated/articles/approved/<slug>.json` — approve 済み記事のコピー（Phase 13-F の入力）
````

- [ ] **Step 3: fixture（valid サンプル記事）を作成**

`scripts/review-v2/fixtures/generated-articles/Sample_valid.json`:

```json
{
  "names": { "aliases": ["サンプル食用きのこ"] },
  "season": [{ "start_month": 9, "end_month": 10 }],
  "habitat": ["広葉樹林"],
  "regions": ["本州"],
  "tree_association": ["コナラ"],
  "similar_species": [{ "ja": "似たきのこ", "note": "見分け方の記述" }],
  "description": "サンプル記事の概要セクションです。出典付きで記述されています[1]。",
  "features": "傘は5〜10cm、色は褐色、ヒダは密[1]。",
  "cooking_preservation": "バター炒めや汁物に適する[1]。",
  "poisoning_first_aid": null,
  "caution": null,
  "sources": [
    { "name": "Wikipedia ja「サンプル」", "url": "https://ja.wikipedia.org/wiki/Sample", "license": "CC BY-SA 4.0" }
  ],
  "notes": "テスト用フィクスチャ"
}
```

- [ ] **Step 4: fixture（warning 付きサンプル記事）を作成**

`scripts/review-v2/fixtures/generated-articles/Sample_warning.json`:

```json
{
  "names": { "aliases": ["警告付きサンプル"] },
  "season": [{ "start_month": 8, "end_month": 11 }],
  "habitat": ["雑木林"],
  "regions": ["北海道", "本州"],
  "tree_association": [],
  "similar_species": [],
  "description": "警告が付いているサンプル記事。Amanita muscaria のような学名が本文に混入している[1]。",
  "features": "傘は10cm前後の毒きのこ[1]。",
  "cooking_preservation": null,
  "poisoning_first_aid": "嘔吐や下痢を引き起こす場合がある。",
  "caution": "幻覚作用を伴う中毒症状が報告されている。",
  "sources": [
    { "name": "厚生労働省 自然毒プロファイル", "url": "https://www.mhlw.go.jp/topics/syokuchu/poison/dock_sample.html", "license": "政府標準利用規約" }
  ],
  "notes": "テスト用フィクスチャ（warning あり）"
}
```

- [ ] **Step 5: fixture（combined JSON）を作成**

`scripts/review-v2/fixtures/combined/Sample_valid.json`:

```json
{
  "scientificName": "Sample sample",
  "japaneseName": "サンプル食用きのこ",
  "taxonomy": { "phylum": "Basidiomycota", "class": "Agaricomycetes", "order": "Agaricales", "family": "Samplaceae", "genus": "Sample" },
  "synonyms": [],
  "sources": {
    "daikinrin": { "title": "Sample sample", "extract": "大菌輪のサンプル抜粋" },
    "wikipediaJa": { "title": "サンプル", "extract": "Wikipedia ja のサンプル抜粋" },
    "wikipediaEn": null,
    "mhlw": null,
    "rinya": null,
    "traitCircus": null
  }
}
```

- [ ] **Step 6: fixture（generation-report）を作成**

`scripts/review-v2/fixtures/generation-report.json`:

```json
[
  {
    "slug": "Sample_valid",
    "japaneseName": "サンプル食用きのこ",
    "status": "pass",
    "errors": [],
    "warnings": [],
    "outputBytes": 500
  },
  {
    "slug": "Sample_warning",
    "japaneseName": "警告付きサンプル",
    "status": "pass",
    "errors": [],
    "warnings": ["V4: description に学名パターンが含まれる"],
    "outputBytes": 600
  }
]
```

- [ ] **Step 7: コミット**

```bash
git add scripts/review-v2/README.md scripts/review-v2/fixtures/ generated/articles/approved/.gitkeep
git commit -m "chore(phase13d): scripts/review-v2/ ディレクトリと fixture を追加"
```

---

## Task 2: server.mjs 骨格と root serve テスト

**Files:**
- Create: `scripts/review-v2/server.mjs`
- Create: `scripts/review-v2/index.html` (plain stub)
- Create: `scripts/review-v2/server.test.mjs`

- [ ] **Step 1: `index.html` を最小ページで作成**

`scripts/review-v2/index.html`:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>MycoNote Phase 13-D Review</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 失敗する test を書く**

`scripts/review-v2/server.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewServer } from './server.mjs';

const FIXTURE_CONFIG = {
  articlesDir: './scripts/review-v2/fixtures/generated-articles',
  approvedDir: './scripts/temp/test-approved',
  combinedDir: './scripts/review-v2/fixtures/combined',
  reportPath: './scripts/review-v2/fixtures/generation-report.json',
  progressPath: './scripts/temp/test-progress.json',
  indexHtmlPath: './scripts/review-v2/index.html',
  appJsPath: './scripts/review-v2/app.js',
  styleCssPath: './scripts/review-v2/style.css',
};

describe('server GET /', () => {
  it('returns index.html content', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    const body = await res.text();
    assert.match(body, /MycoNote Phase 13-D Review/);
    await new Promise((resolve) => server.close(resolve));
  });
});
```

- [ ] **Step 3: test を実行して fail することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: FAIL — `createReviewServer` が定義されていない

- [ ] **Step 4: 最小の server.mjs を書く**

`scripts/review-v2/server.mjs`:

```javascript
/**
 * MycoNote Phase 13-D Review Tool — Standalone HTTP Server
 *
 * Phase 13-C で合成された tier0 62 種の審査用 dev-only ツール。
 * Phase 12-F の scripts/review/ と同じ作法で vanilla JS + HTTP の単独ツール。
 *
 * Usage:
 *   node scripts/review-v2/server.mjs
 *   → open http://localhost:3031
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const PORT = Number(process.env.PORT) || 3031;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const DEFAULT_CONFIG = {
  articlesDir: join(ROOT, 'generated/articles'),
  approvedDir: join(ROOT, 'generated/articles/approved'),
  combinedDir: join(ROOT, '.cache/phase13/combined'),
  reportPath: join(ROOT, '.cache/phase13/generation-report.json'),
  progressPath: join(ROOT, 'scripts/temp/review-v2-progress.json'),
  indexHtmlPath: join(__dirname, 'index.html'),
  appJsPath: join(__dirname, 'app.js'),
  styleCssPath: join(__dirname, 'style.css'),
};

function sendJSON(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendError(res, status, message) {
  sendJSON(res, { error: message }, status);
}

function serveFile(res, absPath, contentType) {
  if (!existsSync(absPath)) {
    return sendError(res, 404, 'not found');
  }
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  res.end(readFileSync(absPath));
}

export function createReviewServer(config = DEFAULT_CONFIG) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);
    const path = url.pathname;
    try {
      if (path === '/' || path === '/index.html') {
        return serveFile(res, config.indexHtmlPath, MIME['.html']);
      }
      if (path === '/app.js') {
        return serveFile(res, config.appJsPath, MIME['.js']);
      }
      if (path === '/style.css') {
        return serveFile(res, config.styleCssPath, MIME['.css']);
      }
      sendError(res, 404, 'not found');
    } catch (e) {
      console.error('ERR', e);
      sendError(res, 500, e.message);
    }
  });
}

// CLI 起動時のみ listen（import されたときは listen しない）
const argvUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (argvUrl && import.meta.url === argvUrl) {
  const server = createReviewServer();
  server.listen(PORT, () => {
    console.log(`\n  MycoNote Phase 13-D Review Tool`);
    console.log(`  → http://localhost:${PORT}\n`);
  });
}
```

- [ ] **Step 5: app.js と style.css を空ファイルで作成（404 を防ぐため）**

```bash
touch scripts/review-v2/app.js
touch scripts/review-v2/style.css
```

- [ ] **Step 6: test を実行して pass することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: PASS — 1 test ok

- [ ] **Step 7: コミット**

```bash
git add scripts/review-v2/server.mjs scripts/review-v2/server.test.mjs scripts/review-v2/index.html scripts/review-v2/app.js scripts/review-v2/style.css
git commit -m "feat(phase13d): server.mjs 骨格 + GET / root serve"
```

---

## Task 3: GET /api/articles エンドポイント（一覧）

**Files:**
- Modify: `scripts/review-v2/server.mjs`
- Modify: `scripts/review-v2/server.test.mjs`

- [ ] **Step 1: 失敗する test を書く（test ファイルに追記）**

```javascript
describe('GET /api/articles', () => {
  it('returns list of articles with warnings info and decisions', async () => {
    // 既存 progress を削除してクリーンスタート
    if (existsSync(FIXTURE_CONFIG.progressPath)) unlinkSync(FIXTURE_CONFIG.progressPath);
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/articles`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.equal(body.articles.length, 2);
    const valid = body.articles.find(a => a.slug === 'Sample_valid');
    assert.ok(valid);
    assert.equal(valid.ja, 'サンプル食用きのこ');
    assert.equal(valid.scientific, 'Sample_valid');
    assert.equal(valid.warningsCount, 0);
    assert.equal(valid.decision, null);
    const warn = body.articles.find(a => a.slug === 'Sample_warning');
    assert.equal(warn.warningsCount, 1);
    await new Promise((resolve) => server.close(resolve));
  });
});
```

追記 imports at the top of test file:
```javascript
import { existsSync, unlinkSync } from 'node:fs';
```

- [ ] **Step 2: test を実行して fail することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: FAIL — `/api/articles` が 404 を返す

- [ ] **Step 3: server.mjs に `/api/articles` を実装**

`server.mjs` の `createReviewServer` に以下を追記（`sendError(res, 404, 'not found')` の手前）:

```javascript
      if (path === '/api/articles' && req.method === 'GET') {
        const articles = listArticles(config);
        return sendJSON(res, { total: articles.length, articles });
      }
```

`server.mjs` に helper 関数を追加（`serveFile` の下）:

```javascript
function readJSON(path, fallback = null) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback; }
  catch { return fallback; }
}

function loadProgress(progressPath) {
  return readJSON(progressPath, { started_at: null, last_updated: null, decisions: {} });
}

function listArticles(config) {
  if (!existsSync(config.articlesDir)) return [];
  // approved/ サブディレクトリは除外（isFile() フィルタ）
  const files = readdirSync(config.articlesDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.json'))
    .map(d => d.name);
  const report = readJSON(config.reportPath, []);
  const reportBySlug = Object.fromEntries(report.map(r => [r.slug, r]));
  const progress = loadProgress(config.progressPath);
  return files.map(f => {
    const slug = f.replace(/\.json$/, '');
    const article = readJSON(join(config.articlesDir, f), {});
    const r = reportBySlug[slug];
    return {
      slug,
      scientific: slug,
      ja: (article.names && article.names.aliases && article.names.aliases[0]) || slug,
      safety: article.safety || null,
      warningsCount: r ? (r.warnings || []).length : 0,
      decision: progress.decisions[slug]?.decision || null,
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}
```

- [ ] **Step 4: test を実行して pass することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: PASS — 2 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/review-v2/server.mjs scripts/review-v2/server.test.mjs
git commit -m "feat(phase13d): GET /api/articles で記事一覧を返却"
```

---

## Task 4: GET /api/articles/:slug エンドポイント（詳細 + combined）

**Files:**
- Modify: `scripts/review-v2/server.mjs`
- Modify: `scripts/review-v2/server.test.mjs`

- [ ] **Step 1: 失敗する test を書く（追記）**

```javascript
describe('GET /api/articles/:slug', () => {
  it('returns article, combined sources, warnings, decision', async () => {
    if (existsSync(FIXTURE_CONFIG.progressPath)) unlinkSync(FIXTURE_CONFIG.progressPath);
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/articles/Sample_valid`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.slug, 'Sample_valid');
    assert.equal(body.article.description.startsWith('サンプル記事'), true);
    assert.equal(body.combined.scientificName, 'Sample sample');
    assert.deepEqual(body.warnings, []);
    assert.equal(body.decision, null);
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns 404 for unknown slug', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/articles/does_not_exist`);
    assert.equal(res.status, 404);
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns null combined if combined JSON missing', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/articles/Sample_warning`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.combined, null);
    assert.equal(body.warnings.length, 1);
    await new Promise((resolve) => server.close(resolve));
  });
});
```

- [ ] **Step 2: test を実行して fail することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: FAIL — 404 for Sample_valid

- [ ] **Step 3: `/api/articles/:slug` を実装**

`server.mjs` の createReviewServer 内、`/api/articles` より上に追記:

```javascript
      if (path.startsWith('/api/articles/') && req.method === 'GET') {
        const slug = decodeURIComponent(path.slice('/api/articles/'.length));
        if (!/^[\w-]+$/.test(slug)) return sendError(res, 400, 'invalid slug');
        const articlePath = join(config.articlesDir, `${slug}.json`);
        if (!existsSync(articlePath)) return sendError(res, 404, 'article not found');
        const article = readJSON(articlePath);
        const combined = readJSON(join(config.combinedDir, `${slug}.json`), null);
        const report = readJSON(config.reportPath, []);
        const reportEntry = report.find(r => r.slug === slug);
        const progress = loadProgress(config.progressPath);
        return sendJSON(res, {
          slug,
          article,
          combined,
          warnings: reportEntry?.warnings || [],
          decision: progress.decisions[slug] || null,
        });
      }
```

- [ ] **Step 4: test を実行して pass することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: PASS — 5 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/review-v2/server.mjs scripts/review-v2/server.test.mjs
git commit -m "feat(phase13d): GET /api/articles/:slug で詳細 + combined を返却"
```

---

## Task 5: POST /api/decisions エンドポイント（判定保存 + approved コピー）

**Files:**
- Modify: `scripts/review-v2/server.mjs`
- Modify: `scripts/review-v2/server.test.mjs`

- [ ] **Step 1: 失敗する test を書く（追記）**

```javascript
import { rmSync } from 'node:fs';

describe('POST /api/decisions', () => {
  it('saves approve decision and copies to approved/', async () => {
    // クリーンアップ
    if (existsSync(FIXTURE_CONFIG.progressPath)) unlinkSync(FIXTURE_CONFIG.progressPath);
    if (existsSync(FIXTURE_CONFIG.approvedDir)) rmSync(FIXTURE_CONFIG.approvedDir, { recursive: true });
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Sample_valid', decision: 'approve', sections: [], note: '' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    const progress = JSON.parse(readFileSync(FIXTURE_CONFIG.progressPath, 'utf8'));
    assert.equal(progress.decisions.Sample_valid.decision, 'approve');
    const approved = join(FIXTURE_CONFIG.approvedDir, 'Sample_valid.json');
    assert.equal(existsSync(approved), true);
    await new Promise((resolve) => server.close(resolve));
  });

  it('removes approved copy when decision changes from approve to concern', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    // approve
    await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Sample_valid', decision: 'approve', sections: [], note: '' }),
    });
    assert.equal(existsSync(join(FIXTURE_CONFIG.approvedDir, 'Sample_valid.json')), true);
    // concern に変更
    await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Sample_valid', decision: 'concern', sections: ['features'], note: 'サイズ記述が曖昧' }),
    });
    assert.equal(existsSync(join(FIXTURE_CONFIG.approvedDir, 'Sample_valid.json')), false);
    const progress = JSON.parse(readFileSync(FIXTURE_CONFIG.progressPath, 'utf8'));
    assert.equal(progress.decisions.Sample_valid.decision, 'concern');
    assert.deepEqual(progress.decisions.Sample_valid.sections, ['features']);
    assert.equal(progress.decisions.Sample_valid.note, 'サイズ記述が曖昧');
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects invalid decision value', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Sample_valid', decision: 'bogus', sections: [], note: '' }),
    });
    assert.equal(res.status, 400);
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects unknown slug', async () => {
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Does_not_exist', decision: 'approve', sections: [], note: '' }),
    });
    assert.equal(res.status, 404);
    await new Promise((resolve) => server.close(resolve));
  });
});
```

追記 imports:
```javascript
import { readFileSync, existsSync, unlinkSync, rmSync } from 'node:fs';
```

- [ ] **Step 2: test を実行して fail することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: FAIL — POST /api/decisions が 404

- [ ] **Step 3: readBody helper と `/api/decisions` を実装**

`server.mjs` の helper 関数に追記:

```javascript
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function saveDecision(config, { slug, decision, sections, note }) {
  const articlePath = join(config.articlesDir, `${slug}.json`);
  if (!existsSync(articlePath)) {
    const err = new Error('article not found');
    err.status = 404;
    throw err;
  }
  const progress = loadProgress(config.progressPath);
  if (!progress.started_at) progress.started_at = new Date().toISOString();
  progress.decisions[slug] = {
    decision,
    sections: Array.isArray(sections) ? sections : [],
    note: typeof note === 'string' ? note : '',
    reviewed_at: new Date().toISOString(),
  };
  progress.last_updated = new Date().toISOString();
  // 親ディレクトリを確保
  mkdirSync(dirname(config.progressPath), { recursive: true });
  writeJSON(config.progressPath, progress);
  // approved/ への反映
  mkdirSync(config.approvedDir, { recursive: true });
  const approvedPath = join(config.approvedDir, `${slug}.json`);
  if (decision === 'approve') {
    copyFileSync(articlePath, approvedPath);
  } else if (existsSync(approvedPath)) {
    unlinkSync(approvedPath);
  }
  return progress;
}

const VALID_DECISIONS = new Set(['approve', 'concern', 'reject']);
```

`createReviewServer` 内に追記:

```javascript
      if (path === '/api/decisions' && req.method === 'POST') {
        const body = await readBody(req);
        const { slug, decision, sections, note } = body;
        if (!slug || !/^[\w-]+$/.test(slug)) return sendError(res, 400, 'invalid slug');
        if (!VALID_DECISIONS.has(decision)) return sendError(res, 400, 'invalid decision');
        try {
          saveDecision(config, { slug, decision, sections, note });
          return sendJSON(res, { ok: true });
        } catch (e) {
          if (e.status === 404) return sendError(res, 404, e.message);
          throw e;
        }
      }
```

（Task 2 で imports 済: `mkdirSync, copyFileSync, unlinkSync`、追加 import 不要）

- [ ] **Step 4: test を実行して pass することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: PASS — 9 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/review-v2/server.mjs scripts/review-v2/server.test.mjs
git commit -m "feat(phase13d): POST /api/decisions で判定保存 + approved/ 反映"
```

---

## Task 6: DELETE /api/decisions/:slug エンドポイント（判定クリア）

**Files:**
- Modify: `scripts/review-v2/server.mjs`
- Modify: `scripts/review-v2/server.test.mjs`

- [ ] **Step 1: 失敗する test を書く（追記）**

```javascript
describe('DELETE /api/decisions/:slug', () => {
  it('clears decision and removes approved copy', async () => {
    if (existsSync(FIXTURE_CONFIG.progressPath)) unlinkSync(FIXTURE_CONFIG.progressPath);
    if (existsSync(FIXTURE_CONFIG.approvedDir)) rmSync(FIXTURE_CONFIG.approvedDir, { recursive: true });
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    // approve しておく
    await fetch(`http://localhost:${port}/api/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Sample_valid', decision: 'approve', sections: [], note: '' }),
    });
    assert.equal(existsSync(join(FIXTURE_CONFIG.approvedDir, 'Sample_valid.json')), true);
    // clear
    const res = await fetch(`http://localhost:${port}/api/decisions/Sample_valid`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    const progress = JSON.parse(readFileSync(FIXTURE_CONFIG.progressPath, 'utf8'));
    assert.equal(progress.decisions.Sample_valid, undefined);
    assert.equal(existsSync(join(FIXTURE_CONFIG.approvedDir, 'Sample_valid.json')), false);
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns 200 even if slug had no decision', async () => {
    if (existsSync(FIXTURE_CONFIG.progressPath)) unlinkSync(FIXTURE_CONFIG.progressPath);
    const server = createReviewServer(FIXTURE_CONFIG);
    await server.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/decisions/Sample_valid`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    await new Promise((resolve) => server.close(resolve));
  });
});
```

- [ ] **Step 2: test を実行して fail することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: FAIL — DELETE が 404

- [ ] **Step 3: 実装**

`server.mjs` の helper に追記:

```javascript
function clearDecision(config, slug) {
  const progress = loadProgress(config.progressPath);
  delete progress.decisions[slug];
  progress.last_updated = new Date().toISOString();
  mkdirSync(dirname(config.progressPath), { recursive: true });
  writeJSON(config.progressPath, progress);
  const approvedPath = join(config.approvedDir, `${slug}.json`);
  if (existsSync(approvedPath)) unlinkSync(approvedPath);
}
```

`createReviewServer` 内に追記:

```javascript
      if (path.startsWith('/api/decisions/') && req.method === 'DELETE') {
        const slug = decodeURIComponent(path.slice('/api/decisions/'.length));
        if (!/^[\w-]+$/.test(slug)) return sendError(res, 400, 'invalid slug');
        clearDecision(config, slug);
        return sendJSON(res, { ok: true });
      }
```

- [ ] **Step 4: test を実行して pass することを確認**

Run: `node --test scripts/review-v2/server.test.mjs`
Expected: PASS — 11 tests ok

- [ ] **Step 5: コミット**

```bash
git add scripts/review-v2/server.mjs scripts/review-v2/server.test.mjs
git commit -m "feat(phase13d): DELETE /api/decisions/:slug で判定クリア"
```

---

## Task 7: HTML + CSS 骨組み（2 カラムレイアウト）

**Files:**
- Modify: `scripts/review-v2/index.html`
- Modify: `scripts/review-v2/style.css`

- [ ] **Step 1: `index.html` を完成形に更新**

`scripts/review-v2/index.html`:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>MycoNote Phase 13-D Review</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header id="header">
    <div id="header-left">
      <h1>Phase 13-D Review</h1>
      <span id="progress-text">0 / 0</span>
      <div id="progress-bar"><div id="progress-bar-fill"></div></div>
    </div>
    <div id="header-right">
      <label><input type="checkbox" id="warnings-only"> warnings only</label>
    </div>
  </header>

  <section id="species-header">
    <img id="hero-image" alt="">
    <div id="species-meta">
      <h2 id="species-name-ja"></h2>
      <div id="species-name-sci"></div>
      <div id="species-badges"></div>
      <a id="google-search" target="_blank" rel="noopener">Google 画像検索で開く ↗</a>
    </div>
  </section>

  <main id="main">
    <section id="article-panel"></section>
    <section id="sources-panel"></section>
  </main>

  <footer id="footer">
    <div id="decision-row">
      <button data-decision="approve">1 Approve</button>
      <button data-decision="concern">2 Concern</button>
      <button data-decision="reject">3 Reject</button>
      <button data-decision="clear">0 Clear</button>
      <input type="text" id="note" placeholder="メモ (N)">
    </div>
    <div id="sections-row" hidden>
      <label><input type="checkbox" data-section="description"> 概要</label>
      <label><input type="checkbox" data-section="features"> 形態</label>
      <label><input type="checkbox" data-section="habitat_ecology"> 発生・生態</label>
      <label><input type="checkbox" data-section="similar_species"> 類似種</label>
      <label><input type="checkbox" data-section="cooking_preservation"> 食用</label>
      <label><input type="checkbox" data-section="poisoning_first_aid"> 中毒</label>
      <label><input type="checkbox" data-section="misc"> 雑学</label>
      <label><input type="checkbox" data-section="structured"> 構造化</label>
    </div>
    <div id="nav-row">
      <button id="prev">← 前</button>
      <button id="next">→ 次</button>
      <span id="stats"></span>
    </div>
  </footer>

  <script type="module" src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css` を作成**

`scripts/review-v2/style.css`:

```css
/* MycoNote Phase 13-D Review — DESIGN.md 準拠 */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Noto Sans JP", system-ui, sans-serif;
  background: #f6f3ea; /* washi-cream */
  color: #2a2420;     /* soil-ink */
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100vh;
  overflow: hidden;
}
header#header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #3a5f3a; /* moss-primary */
  color: #f6f3ea;
}
#header-left { display: flex; align-items: center; gap: 16px; }
#header h1 { font-size: 16px; font-weight: 600; }
#progress-text { font-family: "JetBrains Mono", monospace; font-size: 14px; }
#progress-bar { width: 200px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; }
#progress-bar-fill { height: 100%; background: #e8c547; /* moss-accent */ border-radius: 4px; transition: width 0.2s; }

section#species-header {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #d9d1c1;
}
#hero-image { width: 320px; height: 240px; object-fit: cover; background: #eee; }
#species-meta h2 { font-family: "Noto Serif JP", serif; font-size: 24px; margin-bottom: 4px; }
#species-name-sci { font-family: "Inter", sans-serif; font-style: italic; color: #6c635a; margin-bottom: 8px; }
#species-badges { display: flex; gap: 8px; font-family: "JetBrains Mono", monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
#species-badges .badge { padding: 2px 8px; border-radius: 4px; background: #e9e3d3; }
#species-badges .badge.warning { background: #fde4c9; color: #8a4a1a; }
#google-search { font-size: 13px; color: #3a5f3a; text-decoration: none; display: inline-block; margin-top: 8px; }

main#main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}
section#article-panel, section#sources-panel {
  overflow-y: auto;
  padding: 12px;
  background: #fff;
  border: 1px solid #d9d1c1;
  border-radius: 4px;
}
#article-panel h3, #sources-panel h3 {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6c635a;
  margin: 12px 0 4px;
}
#article-panel h3:first-child, #sources-panel h3:first-child { margin-top: 0; }
#article-panel p { margin-bottom: 8px; line-height: 1.7; }
#article-panel .warning { text-decoration: underline wavy #d9534f; }
#sources-panel .source-block { margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px dashed #d9d1c1; }
#sources-panel .source-block:last-child { border-bottom: none; }
#sources-panel .extract { font-size: 13px; color: #443c35; }

footer#footer {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #d9d1c1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
#decision-row, #nav-row { display: flex; gap: 8px; align-items: center; }
#sections-row { display: flex; gap: 12px; flex-wrap: wrap; padding: 8px 0; }
#sections-row label { font-size: 13px; cursor: pointer; }
button {
  padding: 6px 14px;
  font-size: 14px;
  font-family: inherit;
  background: #eee;
  border: 1px solid #bbb;
  border-radius: 4px;
  cursor: pointer;
}
button:hover { background: #e0e0e0; }
button.active[data-decision="approve"] { background: #9dc69d; border-color: #3a5f3a; }
button.active[data-decision="concern"] { background: #fde4c9; border-color: #c98024; }
button.active[data-decision="reject"] { background: #f2b8b0; border-color: #a83a33; }
#note { flex: 1; padding: 6px 10px; font-family: inherit; border: 1px solid #bbb; border-radius: 4px; }
#stats { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: 12px; color: #6c635a; }
```

- [ ] **Step 3: 手動確認: `node scripts/review-v2/server.mjs` を起動して Chrome で http://localhost:3031 を開き、レイアウトが表示されることを確認**

現時点では JavaScript 未実装なのでヘッダーやフッターの骨組みだけ見える。

- [ ] **Step 4: コミット**

```bash
git add scripts/review-v2/index.html scripts/review-v2/style.css
git commit -m "feat(phase13d): HTML + CSS 骨組み（2 カラム Grid レイアウト）"
```

---

## Task 8: app.js — Store + API + 初期描画

**Files:**
- Modify: `scripts/review-v2/app.js`

- [ ] **Step 1: app.js 全体を作成**

`scripts/review-v2/app.js`:

```javascript
// Phase 13-D Review UI — vanilla JS ES Module
const API = {
  async listArticles() {
    const res = await fetch('/api/articles');
    if (!res.ok) throw new Error('failed to list');
    return res.json();
  },
  async getArticle(slug) {
    const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`failed to get ${slug}`);
    return res.json();
  },
  async saveDecision(payload) {
    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('failed to save decision');
    return res.json();
  },
  async clearDecision(slug) {
    const res = await fetch(`/api/decisions/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('failed to clear decision');
    return res.json();
  },
};

const Store = {
  articles: [],       // [{slug, ja, scientific, warningsCount, decision}, ...]
  currentIndex: 0,
  currentData: null,  // {slug, article, combined, warnings, decision}
  warningsOnly: false,

  get visibleArticles() {
    return this.warningsOnly ? this.articles.filter(a => a.warningsCount > 0) : this.articles;
  },
  get currentSlug() {
    return this.visibleArticles[this.currentIndex]?.slug;
  },
  async loadList() {
    const { articles } = await API.listArticles();
    this.articles = articles;
    // 未判定の最初の種へジャンプ
    const firstUndecided = this.visibleArticles.findIndex(a => !a.decision);
    this.currentIndex = firstUndecided >= 0 ? firstUndecided : 0;
  },
  async loadCurrent() {
    if (!this.currentSlug) { this.currentData = null; return; }
    this.currentData = await API.getArticle(this.currentSlug);
  },
  async setDecision(decision, sections = [], note = '') {
    if (!this.currentSlug) return;
    if (decision === 'clear') {
      await API.clearDecision(this.currentSlug);
      const entry = this.articles.find(a => a.slug === this.currentSlug);
      if (entry) entry.decision = null;
      if (this.currentData) this.currentData.decision = null;
    } else {
      await API.saveDecision({ slug: this.currentSlug, decision, sections, note });
      const entry = this.articles.find(a => a.slug === this.currentSlug);
      if (entry) entry.decision = decision;
      if (this.currentData) this.currentData.decision = { decision, sections, note, reviewed_at: new Date().toISOString() };
    }
  },
  next() { if (this.currentIndex < this.visibleArticles.length - 1) this.currentIndex++; },
  prev() { if (this.currentIndex > 0) this.currentIndex--; },
  jumpTo(slug) {
    const idx = this.visibleArticles.findIndex(a => a.slug === slug);
    if (idx >= 0) this.currentIndex = idx;
  },
};

// 最低限の初期描画（ヘッダーの件数・種名のみ）
async function init() {
  await Store.loadList();
  await Store.loadCurrent();
  renderHeader();
  renderSpeciesHeader();
}

function renderHeader() {
  const total = Store.visibleArticles.length;
  const decided = Store.visibleArticles.filter(a => a.decision).length;
  document.getElementById('progress-text').textContent = `${decided} / ${total}`;
  const pct = total > 0 ? (decided / total) * 100 : 0;
  document.getElementById('progress-bar-fill').style.width = `${pct}%`;
}

function renderSpeciesHeader() {
  const d = Store.currentData;
  if (!d) return;
  const a = d.article;
  document.getElementById('species-name-ja').textContent = (a.names?.aliases?.[0]) || d.slug;
  document.getElementById('species-name-sci').textContent = d.slug.replace(/_/g, ' ');
  const scientific = d.slug.replace(/_/g, ' ');
  document.getElementById('google-search').href = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(scientific)}`;
  const badges = document.getElementById('species-badges');
  badges.innerHTML = '';
  if (a.safety) badges.appendChild(makeBadge(a.safety));
  if (Array.isArray(a.season) && a.season.length > 0) {
    const months = a.season.map(s => `${s.start_month}-${s.end_month}`).join(' / ');
    badges.appendChild(makeBadge(`season ${months}`));
  }
  if (d.warnings.length > 0) {
    badges.appendChild(makeBadge(`⚠ w:${d.warnings.length}`, 'warning'));
  }
  const hero = document.getElementById('hero-image');
  hero.src = a.hero_image?.url || '';
  hero.style.visibility = a.hero_image?.url ? 'visible' : 'hidden';
}

function makeBadge(text, cls = '') {
  const el = document.createElement('span');
  el.className = `badge ${cls}`.trim();
  el.textContent = text;
  return el;
}

init().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre>Error: ${e.message}</pre>`;
});

// Store を window に露出（デバッグ用）
window.Store = Store;
```

- [ ] **Step 2: 手動確認: `node scripts/review-v2/server.mjs` を起動して Chrome で http://localhost:3031 を開き、fixture の 2 件が表示されるかを確認（進捗バー 0/2、最初の種が表示）**

実データで確認する場合は、事前に `generated/articles/*.json` が 62 件揃っていること（すでに commit 済）。

- [ ] **Step 3: コミット**

```bash
git add scripts/review-v2/app.js
git commit -m "feat(phase13d): app.js Store + API + ヘッダ初期描画"
```

---

## Task 9: Renderer — 記事セクション + ソースパネル + warning 下線

**Files:**
- Modify: `scripts/review-v2/app.js`

- [ ] **Step 1: app.js にセクションレンダラを追加**

`app.js` の `renderSpeciesHeader` の下に追記:

```javascript
const ARTICLE_SECTIONS = [
  { key: 'description', label: '概要', type: 'text' },
  { key: 'features', label: '形態的特徴', type: 'text' },
  { key: 'habitat_ecology', label: '発生・生態', type: 'computed' }, // habitat + regions + tree_association
  { key: 'similar_species', label: '類似種・見分け方', type: 'similar' },
  { key: 'cooking_preservation', label: '食用利用・食文化', type: 'text' },
  { key: 'poisoning_first_aid', label: '中毒症状・対処', type: 'text' },
  { key: 'caution', label: '注意事項', type: 'text' },
];

function renderArticlePanel() {
  const panel = document.getElementById('article-panel');
  panel.innerHTML = '';
  const d = Store.currentData;
  if (!d) { panel.textContent = '(no article)'; return; }
  const a = d.article;
  const warningsText = (d.warnings || []).join(' / ');

  for (const s of ARTICLE_SECTIONS) {
    const h = document.createElement('h3');
    h.textContent = s.label;
    panel.appendChild(h);

    const content = document.createElement('div');
    if (s.type === 'text') {
      const v = a[s.key];
      if (!v) { content.textContent = '(情報なし)'; content.style.color = '#b8ac9e'; }
      else {
        const p = document.createElement('p');
        p.textContent = v;
        if (warningsText && warningContainsSection(warningsText, s.key)) p.classList.add('warning');
        content.appendChild(p);
      }
    } else if (s.type === 'similar') {
      const list = a.similar_species || [];
      if (list.length === 0) content.textContent = '(情報なし)';
      else {
        const ul = document.createElement('ul');
        for (const sp of list) {
          const li = document.createElement('li');
          li.textContent = `${sp.ja || sp.scientific || '?'}${sp.note ? ' — ' + sp.note : ''}`;
          ul.appendChild(li);
        }
        content.appendChild(ul);
      }
    } else if (s.type === 'computed') {
      const parts = [];
      if (Array.isArray(a.habitat) && a.habitat.length) parts.push(`habitat: ${a.habitat.join(', ')}`);
      if (Array.isArray(a.regions) && a.regions.length) parts.push(`regions: ${a.regions.join(', ')}`);
      if (Array.isArray(a.tree_association) && a.tree_association.length) parts.push(`trees: ${a.tree_association.join(', ')}`);
      content.textContent = parts.length ? parts.join(' / ') : '(情報なし)';
    }
    panel.appendChild(content);
  }

  // sources
  const h = document.createElement('h3');
  h.textContent = '出典';
  panel.appendChild(h);
  if (Array.isArray(a.sources) && a.sources.length) {
    const ol = document.createElement('ol');
    a.sources.forEach((src, i) => {
      const li = document.createElement('li');
      li.innerHTML = `[${i + 1}] <a href="${src.url}" target="_blank" rel="noopener">${src.name}</a> (${src.license})`;
      ol.appendChild(li);
    });
    panel.appendChild(ol);
  } else {
    panel.appendChild(document.createTextNode('(出典なし)'));
  }
}

function warningContainsSection(warningsText, sectionKey) {
  // 警告メッセージにセクション名 (description, features 等) が含まれているかチェック
  return warningsText.toLowerCase().includes(sectionKey.toLowerCase());
}

function renderSourcesPanel() {
  const panel = document.getElementById('sources-panel');
  panel.innerHTML = '';
  const d = Store.currentData;
  if (!d || !d.combined) {
    panel.textContent = '(combined JSON なし — fetch_tier0_sources.mjs を実行すると表示されます)';
    return;
  }
  const sources = d.combined.sources || {};
  const order = [
    ['wikipediaJa', 'Wikipedia ja'],
    ['wikipediaEn', 'Wikipedia en'],
    ['daikinrin', '大菌輪'],
    ['mhlw', '厚労省（自然毒）'],
    ['rinya', '林野庁'],
    ['traitCircus', 'Trait Circus'],
  ];
  for (const [key, label] of order) {
    const src = sources[key];
    if (!src) continue;
    const block = document.createElement('div');
    block.className = 'source-block';
    const h = document.createElement('h3');
    h.textContent = label;
    block.appendChild(h);
    const extract = document.createElement('div');
    extract.className = 'extract';
    extract.textContent = src.extract || JSON.stringify(src).slice(0, 500);
    block.appendChild(extract);
    panel.appendChild(block);
  }
  if (!panel.hasChildNodes()) {
    panel.textContent = '(どのソースも情報なし)';
  }
}
```

`init` と `renderSpeciesHeader` の後続呼び出しを更新:

```javascript
async function init() {
  await Store.loadList();
  await Store.loadCurrent();
  renderAll();
}

function renderAll() {
  renderHeader();
  renderSpeciesHeader();
  renderArticlePanel();
  renderSourcesPanel();
  renderDecisionState();
}

function renderDecisionState() {
  document.querySelectorAll('#decision-row button[data-decision]').forEach((btn) => {
    btn.classList.toggle('active', Store.currentData?.decision?.decision === btn.dataset.decision);
  });
  const noteEl = document.getElementById('note');
  noteEl.value = Store.currentData?.decision?.note || '';
  const sectionsRow = document.getElementById('sections-row');
  const show = Store.currentData?.decision?.decision === 'concern';
  sectionsRow.hidden = !show;
  if (show) {
    const selected = new Set(Store.currentData.decision.sections || []);
    sectionsRow.querySelectorAll('input[data-section]').forEach((cb) => {
      cb.checked = selected.has(cb.dataset.section);
    });
  }
  const stats = document.getElementById('stats');
  const counts = { approve: 0, concern: 0, reject: 0 };
  for (const a of Store.articles) { if (a.decision) counts[a.decision]++; }
  stats.textContent = `approved:${counts.approve} / concern:${counts.concern} / reject:${counts.reject}`;
}
```

- [ ] **Step 2: 手動確認: Chrome で表示して、記事本文とソースパネルが描画されることを確認**

- [ ] **Step 3: コミット**

```bash
git add scripts/review-v2/app.js
git commit -m "feat(phase13d): Renderer — 記事セクション + ソースパネル + warning 下線"
```

---

## Task 10: KeyHandler + Navigation + 判定送信

**Files:**
- Modify: `scripts/review-v2/app.js`

- [ ] **Step 1: app.js にキーハンドラ + ボタンハンドラを追加**

`app.js` の末尾（`init().catch` の直前）に追記:

```javascript
function bindEvents() {
  // キーボード
  document.addEventListener('keydown', async (ev) => {
    // メモ欄フォーカス中は Enter 以外スキップ
    const inNote = document.activeElement?.id === 'note';
    if (inNote && ev.key !== 'Enter' && ev.key !== 'Escape') return;

    if (ev.key === '1') { await decide('approve'); goNext(); }
    else if (ev.key === '2') { await decide('concern'); focusFirstSection(); }
    else if (ev.key === '3') { await decide('reject'); goNext(); }
    else if (ev.key === '0') { await decide('clear'); }
    else if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); document.getElementById('note').focus(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (inNote) document.activeElement.blur(); goNext(); }
    else if (ev.key === 'ArrowRight') { goNext(); }
    else if (ev.key === 'ArrowLeft') { goPrev(); }
    else if (ev.key === 'g' || ev.key === 'G') {
      const a = document.getElementById('google-search');
      if (a?.href) window.open(a.href, '_blank', 'noopener');
    }
  });

  // 判定ボタン
  document.querySelectorAll('#decision-row button[data-decision]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const d = btn.dataset.decision;
      await decide(d);
      if (d === 'approve' || d === 'reject') goNext();
      else if (d === 'concern') focusFirstSection();
    });
  });

  // セクションチェックボックス（debounced autosave）
  let sectionSaveTimer = null;
  document.querySelectorAll('#sections-row input[data-section]').forEach((cb) => {
    cb.addEventListener('change', () => {
      clearTimeout(sectionSaveTimer);
      sectionSaveTimer = setTimeout(saveCurrentConcern, 300);
    });
  });

  // メモ（debounced autosave）
  let noteSaveTimer = null;
  document.getElementById('note').addEventListener('input', () => {
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(saveCurrentConcern, 300);
  });

  // 前後ナビ
  document.getElementById('prev').addEventListener('click', goPrev);
  document.getElementById('next').addEventListener('click', goNext);

  // warnings only
  document.getElementById('warnings-only').addEventListener('change', async (ev) => {
    Store.warningsOnly = ev.target.checked;
    Store.currentIndex = 0;
    await Store.loadCurrent();
    renderAll();
  });
}

async function decide(decision) {
  if (decision === 'clear') {
    await Store.setDecision('clear');
  } else {
    const sections = collectSelectedSections();
    const note = document.getElementById('note').value;
    await Store.setDecision(decision, sections, note);
  }
  renderAll();
}

async function saveCurrentConcern() {
  if (Store.currentData?.decision?.decision !== 'concern') return;
  const sections = collectSelectedSections();
  const note = document.getElementById('note').value;
  await Store.setDecision('concern', sections, note);
  renderHeader();
}

function collectSelectedSections() {
  return [...document.querySelectorAll('#sections-row input[data-section]:checked')].map(cb => cb.dataset.section);
}

function focusFirstSection() {
  const first = document.querySelector('#sections-row input[data-section]');
  if (first) first.focus();
}

async function goNext() {
  Store.next();
  await Store.loadCurrent();
  document.getElementById('article-panel').scrollTop = 0;
  document.getElementById('sources-panel').scrollTop = 0;
  renderAll();
}

async function goPrev() {
  Store.prev();
  await Store.loadCurrent();
  document.getElementById('article-panel').scrollTop = 0;
  document.getElementById('sources-panel').scrollTop = 0;
  renderAll();
}
```

`init()` を更新:

```javascript
async function init() {
  await Store.loadList();
  await Store.loadCurrent();
  renderAll();
  bindEvents();
}
```

- [ ] **Step 2: 手動確認**

Chrome で以下を確認:
1. `1` キーで approve → 次の種へ遷移
2. `2` キーで concern → セクションチェックボックス表示
3. `3` キーで reject → 次の種へ
4. `0` キーで clear
5. `←` `→` で前後遷移
6. `N` でメモ欄フォーカス、Enter で次へ
7. `G` で Google 画像検索新タブ
8. approve した種のファイルが `generated/articles/approved/<slug>.json` に出現
9. ブラウザ閉じて再起動 → 未判定の次の種から再開

- [ ] **Step 3: コミット**

```bash
git add scripts/review-v2/app.js
git commit -m "feat(phase13d): KeyHandler + ナビゲーション + 判定送信"
```

---

## Task 11: 実データで総合確認とドキュメント更新

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/phase13/README.md`

- [ ] **Step 1: 実データで combined を準備（任意、~15 分）**

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs
```

combined JSON が `.cache/phase13/combined/` に 62 件揃う。スキップする場合はソースパネルが「combined JSON なし」で表示される（記事審査は可能）。

- [ ] **Step 2: サーバ起動して実データで手動確認**

```bash
node scripts/review-v2/server.mjs
```

Chrome で http://localhost:3031 を開き、62 件の記事が正しく一覧・詳細・判定・approve コピーができることを確認。数件 approve/concern/reject して動作確認のみ行い、**本番判定は別セッションで行う**。

- [ ] **Step 3: テスト全件 pass を確認**

```bash
node --test scripts/review-v2/server.test.mjs
```

Expected: 11 tests ok

- [ ] **Step 4: docs/phase13/README.md にレビューツールの記述を追加**

`docs/phase13/README.md` の「Phase 13-C の使い方」の後に追記:

```markdown
## Phase 13-D の使い方（レビュー）

tier0 62 件を人間判定するための dev-only レビュー UI。詳細は [scripts/review-v2/README.md](../../scripts/review-v2/README.md)。

```bash
# 事前準備（combined JSON 不足時のみ、~15 分）
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs

# レビュー起動
node scripts/review-v2/server.mjs
# → http://localhost:3031
```

judgments are saved to `scripts/temp/review-v2-progress.json`、approve された記事は `generated/articles/approved/<slug>.json` にコピーされる（Phase 13-F の入力）。
```

サブフェーズ一覧の Phase 13-D を完了に更新:

```markdown
- [x] Phase 13-D: レビューツール拡張 — [計画書](../superpowers/plans/2026-04-15-phase13d-review-ui.md) / [設計書](../superpowers/specs/2026-04-15-phase13d-review-ui-design.md)
```

- [ ] **Step 5: docs/progress.md に Phase 13-D 完了記録を追加**

`docs/progress.md` の末尾（Phase 13-C の後）に追記:

```markdown
---

## Phase 13-D: レビューツール拡張 — 完了 (2026-04-15)

設計書: [docs/superpowers/specs/2026-04-15-phase13d-review-ui-design.md](./superpowers/specs/2026-04-15-phase13d-review-ui-design.md)
計画書: [docs/superpowers/plans/2026-04-15-phase13d-review-ui.md](./superpowers/plans/2026-04-15-phase13d-review-ui.md)

### 成果

- `scripts/review-v2/` — tier0 62 件の人間判定用 dev-only ツール（port 3031）
- vanilla JS + HTML + CSS、Next.js 本体に影響なし
- 3 択判定（approve / concern / reject）+ concern 時のセクション指定 + メモ
- キーボード中心（1/2/3/0/N/Enter/←→/G）
- autosave + ブラウザ閉じて再開で状態復元
- approve 判定で `generated/articles/approved/<slug>.json` に自動コピー
- server.mjs に unit test（11 tests）

### パネル構成

- 左: v2 記事の 7 セクション（概要 / 形態 / 発生・生態 / 類似種 / 食用 / 中毒 / 注意）
- 右: combined JSON のソース抜粋（Wikipedia ja/en / 大菌輪 / 厚労省 / 林野庁 / Trait Circus）
- warning 付きセクションは赤波下線で強調

### 次フェーズ

Phase 13-E（軽量スキーマ移行）で v2 スキーマ対応の型・ローダを実装、起動時に bookmarks 初期化 + records の mushroom_id リセット。
Phase 13-F（v2.0 リリース）で `generated/articles/approved/` を `src/data/mushrooms.json` に組み立てて図鑑 UI を v2 に切替。
```

- [ ] **Step 6: コミット**

```bash
git add docs/phase13/README.md docs/progress.md
git commit -m "docs(phase13d): README と progress.md に Phase 13-D 完了を記録"
```

---

## Spec Coverage Self-Review

| 設計書 §  | 内容 | Task |
|---|---|---|
| §1.2 | スコープ = tier0 62 | Task 3（listArticles は articlesDir の JSON を列挙） |
| §2.1 | ディレクトリ構成 | Task 1 |
| §2.2 | 入出力（generated/articles, combined, generation-report, progress, approved） | Task 3, 4, 5, 6 |
| §2.3 | port 3031 | Task 2 |
| §3.1 | 画面レイアウト | Task 7（HTML + CSS）、Task 8〜10（描画） |
| §3.2 | 2 カラム Grid、スクロール独立 | Task 7（CSS）、Task 10（goNext/goPrev で scrollTop=0） |
| §4.1 | 3 択の定義、判定変更時の approved 反映 | Task 5 |
| §4.2 | キーボード操作 | Task 10 |
| §4.3 | autosave、progress 形式 | Task 5, 6（progress.json 書き出し）、Task 10（debounce autosave） |
| §5.1 | server.mjs エンドポイント | Task 2〜6 |
| §5.2 | app.js 責務分割（Store/Renderer/KeyHandler/API） | Task 8, 9, 10 |
| §5.3 | style.css、DESIGN.md トークン | Task 7 |
| §5.4 | 警告表示仕様 | Task 8（バッジ）、Task 9（セクション赤下線） |
| §6.1 | server.mjs unit test | Task 2〜6（各 Task で test） |
| §6.2 | app.js 手動確認 | Task 8, 9, 10, 11 |
| §7 | リスク対策（progress.json 書き込み競合、combined 欠損など） | Task 5（mkdirSync、単一プロセス前提）、Task 9（combined null 時の表示） |
| §8 | 成功基準 | Task 11（実データ確認 + 11 tests pass） |

---

## 実装中の落とし穴

- **`files` の filter**: `readdirSync(articlesDir)` は `approved/` サブディレクトリも含むため、`withFileTypes: true` + `isFile()` で filter（Task 3）
- **slug validation**: `/api/articles/:slug` と `/api/decisions` で `/^[\w-]+$/` チェック（path traversal 防止）
- **progress.json の親ディレクトリ**: `scripts/temp/` が存在しないと write が失敗するため、write 前に `mkdirSync(dirname(path), { recursive: true })`
- **メモ欄の autosave 抑制**: Input イベントで即 POST すると 1 文字ごとに保存 → debounce 300ms を挟む
- **Enter キーのメモ欄 focus**: `<input>` の Enter はブラウザデフォルトで form submit 動作になる可能性があるので `ev.preventDefault()`
- **hero_image URL が generated/articles JSON にない種**: 現在の tier0 合成出力には `hero_image` が含まれていないケースが多い。その場合は画像要素を hidden にして空欄で表示（Task 8 の renderSpeciesHeader で対応）
- **warnings のセクション対応付け**: 警告文 (例 `"V4: description に学名パターンが含まれる"`) にセクションキー (例 `description`) が含まれているかで単純マッチ（Task 9 の `warningContainsSection`）。完璧ではないが初期実装として十分

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-phase13d-review-ui.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 各 Task を fresh subagent にディスパッチ、タスク間でレビュー、fast iteration
2. **Inline Execution** — 本セッション内で executing-plans を使いバッチ実行、チェックポイントでレビュー

vanilla JS + HTML + CSS のシンプルな実装なので Inline Execution でも管理できるサイズ。subagent にすると並列化効果は limited（Task 間依存が多い）。

どちらで進めますか？
