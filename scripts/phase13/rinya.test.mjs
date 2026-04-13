import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRinyaOverview } from './rinya.mjs';

const FIXTURE = readFileSync(
  join(process.cwd(), 'scripts/phase13/fixtures/rinya-overview.html'),
  'utf-8'
);

describe('parseRinyaOverview', () => {
  it('本文テキストが抽出される', () => {
    const parsed = parseRinyaOverview(FIXTURE);
    expect(parsed.text.length).toBeGreaterThan(300);
    expect(parsed.text).toMatch(/きのこ/);
  });

  it('俗説否定の記述を含む', () => {
    const parsed = parseRinyaOverview(FIXTURE);
    expect(parsed.text).toMatch(/縦に裂け|色鮮やか|虫が食/);
  });

  it('ページ URL を保持する', () => {
    const parsed = parseRinyaOverview(FIXTURE);
    expect(parsed.sourceUrl).toBe('https://www.rinya.maff.go.jp/j/tokuyou/kinoko/');
  });
});
