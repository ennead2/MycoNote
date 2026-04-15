import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'node:fs';
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

describe('GET /api/articles', () => {
  it('returns list of articles with warnings info and decisions', async () => {
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
