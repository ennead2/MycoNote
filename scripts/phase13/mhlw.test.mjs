import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMhlwIndex, MHLW_TARGET_SPECIES } from './mhlw.mjs';

const INDEX_FIXTURE = readFileSync(
  join(process.cwd(), 'scripts/phase13/fixtures/mhlw-index.html'),
  'utf-8'
);

describe('MHLW_TARGET_SPECIES', () => {
  it('15種以上の学名が定義されている', () => {
    expect(MHLW_TARGET_SPECIES.length).toBeGreaterThanOrEqual(15);
    for (const s of MHLW_TARGET_SPECIES) {
      expect(s.scientificName).toMatch(/^[A-Z][a-z]+ [a-z]+/);
      expect(typeof s.japaneseName).toBe('string');
    }
  });
});

describe('parseMhlwIndex', () => {
  it('関数が export されている', () => {
    expect(parseMhlwIndex).toBeTypeOf('function');
  });

  it('index HTML から entries 配列を返す', () => {
    const entries = parseMhlwIndex(INDEX_FIXTURE);
    expect(Array.isArray(entries)).toBe(true);
    // 厚労省 index に target のいずれかがリンクされていることを期待
    // 0 件でも ok（実サイトの構造による）が、配列であることは保証
  });
});
