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
import { join, dirname } from 'node:path';
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
  tier0Path: join(ROOT, 'data/tier0-species.json'),
  tier1Path: join(ROOT, 'data/tier1-species.json'),
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

function readJSON(path, fallback = null) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback; }
  catch { return fallback; }
}

function loadProgress(progressPath) {
  return readJSON(progressPath, { started_at: null, last_updated: null, decisions: {} });
}

function loadTier0Map(tier0Path) {
  // scientific name 正典 → 標準カタカナ和名 のマップを構築。
  // slug 形式 (Genus_species) でも引けるように両方キーを持たせる。
  const data = readJSON(tier0Path, null);
  const out = {};
  if (!data || !Array.isArray(data.species)) return out;
  for (const s of data.species) {
    if (!s.scientificName || !s.japaneseName) continue;
    const slug = s.scientificName.replace(/\s+/g, '_');
    out[s.scientificName] = s.japaneseName;
    out[slug] = s.japaneseName;
  }
  return out;
}

function loadSpeciesNameMap(paths) {
  // tier0 + tier1 を合成して lookup を作る。tier0 が優先（先に追加）。
  // slug は空白 と ハイフンをアンダースコアに変換（例: Trichoderma cornu-damae → Trichoderma_cornu_damae）
  const out = {};
  for (const p of paths) {
    if (!p) continue;
    const data = readJSON(p, null);
    const list = data && Array.isArray(data.species) ? data.species
      : Array.isArray(data) ? data : null;
    if (!list) continue;
    for (const s of list) {
      if (!s.scientificName || !s.japaneseName) continue;
      const slug = s.scientificName.replace(/[\s-]+/g, '_');
      if (!(s.scientificName in out)) out[s.scientificName] = s.japaneseName;
      if (!(slug in out)) out[slug] = s.japaneseName;
    }
  }
  return out;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

const VALID_DECISIONS = new Set(['approve', 'concern', 'reject']);

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
  mkdirSync(dirname(config.progressPath), { recursive: true });
  writeJSON(config.progressPath, progress);
  mkdirSync(config.approvedDir, { recursive: true });
  const approvedPath = join(config.approvedDir, `${slug}.json`);
  if (decision === 'approve') {
    copyFileSync(articlePath, approvedPath);
  } else if (existsSync(approvedPath)) {
    unlinkSync(approvedPath);
  }
  return progress;
}

function clearDecision(config, slug) {
  const progress = loadProgress(config.progressPath);
  delete progress.decisions[slug];
  progress.last_updated = new Date().toISOString();
  mkdirSync(dirname(config.progressPath), { recursive: true });
  writeJSON(config.progressPath, progress);
  const approvedPath = join(config.approvedDir, `${slug}.json`);
  if (existsSync(approvedPath)) unlinkSync(approvedPath);
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
  const nameMap = loadSpeciesNameMap([config.tier0Path, config.tier1Path]);
  return files.map(f => {
    const slug = f.replace(/\.json$/, '');
    const article = readJSON(join(config.articlesDir, f), {});
    const r = reportBySlug[slug];
    // tier0/tier1 curated wamei を優先、なければ aliases[0]、それもなければ slug
    const ja = nameMap[slug] || (article.names && article.names.aliases && article.names.aliases[0]) || slug;
    return {
      slug,
      scientific: slug,
      ja,
      safety: article.safety || null,
      warningsCount: r ? (r.warnings || []).length : 0,
      decision: progress.decisions[slug]?.decision || null,
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}

export function createReviewServer(config = DEFAULT_CONFIG) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);
    const path = url.pathname;
    try {
      if (path.startsWith('/api/decisions/') && req.method === 'DELETE') {
        const slug = decodeURIComponent(path.slice('/api/decisions/'.length));
        if (!/^[\w-]+$/.test(slug)) return sendError(res, 400, 'invalid slug');
        clearDecision(config, slug);
        return sendJSON(res, { ok: true });
      }
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
      if (path === '/api/articles' && req.method === 'GET') {
        const articles = listArticles(config);
        return sendJSON(res, { total: articles.length, articles });
      }
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
        const nameMap = loadSpeciesNameMap([config.tier0Path, config.tier1Path]);
        const primaryName = nameMap[slug] || (article.names && article.names.aliases && article.names.aliases[0]) || slug;
        return sendJSON(res, {
          slug,
          primaryName,
          article,
          combined,
          warnings: reportEntry?.warnings || [],
          decision: progress.decisions[slug] || null,
        });
      }
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
