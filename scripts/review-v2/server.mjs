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

export function createReviewServer(config = DEFAULT_CONFIG) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);
    const path = url.pathname;
    try {
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
        return sendJSON(res, {
          slug,
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
