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
