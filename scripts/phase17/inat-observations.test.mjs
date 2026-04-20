import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTotalResults } from './inat-observations.mjs';

describe('parseTotalResults', () => {
  it('total_results が数値なら返す', () => {
    expect(parseTotalResults({ total_results: 42 })).toBe(42);
  });

  it('total_results が欠落している場合は 0', () => {
    expect(parseTotalResults({})).toBe(0);
    expect(parseTotalResults({ results: [] })).toBe(0);
  });

  it('非オブジェクト入力は 0', () => {
    expect(parseTotalResults(null)).toBe(0);
    expect(parseTotalResults(undefined)).toBe(0);
    expect(parseTotalResults('string')).toBe(0);
    expect(parseTotalResults(5)).toBe(0);
  });

  it('total_results が非数値なら 0', () => {
    expect(parseTotalResults({ total_results: 'many' })).toBe(0);
    expect(parseTotalResults({ total_results: NaN })).toBe(0);
    expect(parseTotalResults({ total_results: Infinity })).toBe(0);
  });
});

/*
 * fetchInatDomesticCount / fetchDomesticCountOnce の integration テストは
 * 実ネットワーク依存のため除外。mock する場合も cache の永続化で flaky に
 * なりやすいので、parseTotalResults の純粋関数テストに限定する。
 * 実 fetch の動作確認は S6 (4204 件 fetch) 実行時の統計レポートで代替。
 */
