/**
 * MycoNote Review Tool — Standalone HTTP Server
 *
 * 全種レビュー用の単独 Node.js サーバー。Next.js 本体に影響しない dev-only ツール。
 *
 * Usage:
 *   node scripts/review/server.mjs
 *   → open http://localhost:3030
 *
 * 依存データ:
 *   - src/data/mushrooms.json          (現行図鑑データ)
 *   - scripts/temp/review-cache.json   (Wikipedia/kinoco-zukan 事前取得結果)
 *   - scripts/temp/gbif-results.json   (GBIF 検証結果; 任意)
 *   - scripts/temp/species-corrections.json (verification issues; 任意)
 *   - public/images/mushrooms/*         (local 画像)
 *
 * 出力:
 *   - scripts/temp/review-progress.json (判定記録; 自動生成 & 追記)
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const PORT = Number(process.env.PORT) || 3030;

const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const CACHE_FILE = join(ROOT, 'scripts/temp/review-cache.json');
const GBIF_FILE = join(ROOT, 'scripts/temp/gbif-results.json');
const CORRECTIONS_FILE = join(ROOT, 'scripts/temp/species-corrections.json');
const PROGRESS_FILE = join(ROOT, 'scripts/temp/review-progress.json');
const PUBLIC_DIR = join(ROOT, 'public');
const INDEX_HTML = join(__dirname, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readJSON(p, fallback = null) {
  try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback; }
  catch { return fallback; }
}

function writeJSON(p, data) {
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function loadProgress() {
  return readJSON(PROGRESS_FILE, {
    started_at: null,
    last_updated: null,
    decisions: {},
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function sendJSON(res, body, status = 200) {
  send(res, status, body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function serveStatic(res, absPath) {
  if (!existsSync(absPath) || !statSync(absPath).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = extname(absPath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(readFileSync(absPath));
}

function buildSpeciesListing(mushrooms, progress) {
  return mushrooms.map((m, idx) => ({
    idx,
    id: m.id,
    ja: m.names.ja,
    scientific: m.names.scientific,
    toxicity: m.toxicity,
    decision: progress.decisions[m.id]?.status || null,
  }));
}

function buildSpeciesDetail(m, cache, gbif, corrections) {
  const issues = [];
  const gbifEntry = gbif?.[m.id];
  if (gbifEntry && !gbifEntry.autoApply) {
    if (gbifEntry.status === 'NONE') {
      issues.push({ level: 'high', msg: `GBIF: "${gbifEntry.input}" が見つからない — 架空種疑い` });
    } else if (gbifEntry.matchType === 'HIGHERRANK') {
      issues.push({ level: 'mid', msg: `GBIF: 属レベルまでしか一致せず (accepted=${gbifEntry.accepted})` });
    } else if (gbifEntry.matchType === 'FUZZY') {
      issues.push({ level: 'low', msg: `GBIF: typo 疑い — "${gbifEntry.accepted}" (c=${gbifEntry.confidence})` });
    }
  }
  const corrEntry = corrections?.[m.id];
  if (corrEntry?.open_issues) {
    for (const iss of corrEntry.open_issues) {
      if (!issues.some(x => x.msg === iss.msg)) issues.push(iss);
    }
  }
  return {
    mushroom: m,
    wikipedia: cache?.[m.id] || null,
    gbif: gbifEntry || null,
    issues,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS (same-origin なので不要だが念のため)
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // ─── API ────────────────────────────────────────────────
    if (path === '/api/list' && req.method === 'GET') {
      const mushrooms = readJSON(MUSHROOMS_JSON, []);
      const progress = loadProgress();
      return sendJSON(res, {
        total: mushrooms.length,
        decisions_count: Object.keys(progress.decisions).length,
        started_at: progress.started_at,
        last_updated: progress.last_updated,
        species: buildSpeciesListing(mushrooms, progress),
      });
    }

    if (path.startsWith('/api/species/') && req.method === 'GET') {
      const id = decodeURIComponent(path.slice('/api/species/'.length));
      const mushrooms = readJSON(MUSHROOMS_JSON, []);
      const m = mushrooms.find(x => x.id === id);
      if (!m) return send(res, 404, { error: 'not found' });
      const cache = readJSON(CACHE_FILE, {});
      const gbif = readJSON(GBIF_FILE, {});
      const corrections = readJSON(CORRECTIONS_FILE, {});
      const progress = loadProgress();
      return sendJSON(res, {
        ...buildSpeciesDetail(m, cache, gbif, corrections),
        decision: progress.decisions[id] || null,
      });
    }

    if (path === '/api/decision' && req.method === 'POST') {
      const body = await readBody(req);
      const { id, status, note } = body;
      if (!id || !['ok', 'replace_image', 'concern', 'delete', 'hold', 'clear'].includes(status)) {
        return send(res, 400, { error: 'invalid payload' });
      }
      const progress = loadProgress();
      if (!progress.started_at) progress.started_at = new Date().toISOString();
      if (status === 'clear') {
        delete progress.decisions[id];
      } else {
        progress.decisions[id] = {
          status,
          note: note || '',
          at: new Date().toISOString(),
        };
      }
      progress.last_updated = new Date().toISOString();
      writeJSON(PROGRESS_FILE, progress);
      return sendJSON(res, { ok: true, decisions_count: Object.keys(progress.decisions).length });
    }

    if (path === '/api/progress' && req.method === 'GET') {
      return sendJSON(res, loadProgress());
    }

    // ─── 静的配信 ──────────────────────────────────────────
    if (path === '/' || path === '/index.html') {
      return serveStatic(res, INDEX_HTML);
    }
    if (path.startsWith('/images/')) {
      return serveStatic(res, join(PUBLIC_DIR, path));
    }
    if (path === '/app.js' || path === '/style.css') {
      return serveStatic(res, join(__dirname, path.slice(1)));
    }

    send(res, 404, { error: 'not found', path });
  } catch (e) {
    console.error('ERR', e);
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ╭──────────────────────────────────────────╮`);
  console.log(`  │  MycoNote Review Tool                    │`);
  console.log(`  │  → http://localhost:${PORT}              │`);
  console.log(`  ╰──────────────────────────────────────────╯\n`);
  console.log(`  データソース:`);
  console.log(`    mushrooms:    ${existsSync(MUSHROOMS_JSON) ? '✓' : '✗'}`);
  console.log(`    review-cache: ${existsSync(CACHE_FILE) ? '✓' : '✗ (事前に prefetch-review-data.mjs 実行が必要)'}`);
  console.log(`    gbif-results: ${existsSync(GBIF_FILE) ? '✓' : '·'}`);
  console.log(`    corrections:  ${existsSync(CORRECTIONS_FILE) ? '✓' : '·'}`);
  console.log(`    progress:     ${existsSync(PROGRESS_FILE) ? '✓ (再開)' : '新規'}`);
  console.log();
});
