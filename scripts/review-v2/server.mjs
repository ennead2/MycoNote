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
