#!/usr/bin/env node
/**
 * similar_species リンク検証スクリプト。
 *
 * 以下の 2 種の問題を検出する:
 *   ERROR:   similar_species[].id が指定されているが、v3 に存在しない slug
 *   WARNING: similar_species[].id が未指定で、ja が v3 内の和名と完全一致（リンク化可能）
 *
 * 使い方:
 *   node scripts/phase17/validate_similar_species_links.mjs
 *   node scripts/phase17/validate_similar_species_links.mjs --fix   # WARNING を自動補完
 *
 * 終了コード:
 *   0: エラーなし（warning のみの場合も 0 だが --fix なしでは警告を表示）
 *   1: ERROR が 1 件以上
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const MUSHROOMS = join(ROOT, 'src/data/mushrooms.json');

const fix = process.argv.includes('--fix');

const mushrooms = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
const idSet = new Set(mushrooms.map((m) => m.id));
const jaToId = new Map(mushrooms.map((m) => [m.names.ja, m.id]));

let errors = 0;
let warnings = 0;
let fixed = 0;

for (const m of mushrooms) {
  for (const sp of m.similar_species ?? []) {
    const spId = sp.id;
    const spJa = sp.ja ?? '';

    if (spId) {
      if (!idSet.has(spId)) {
        console.error(`ERROR  [${m.id}] similar_species "${spJa}": id="${spId}" は v3 に存在しない`);
        errors++;
      }
    } else {
      const matched = jaToId.get(spJa);
      if (matched) {
        if (fix) {
          sp.id = matched;
          fixed++;
          console.log(`FIXED  [${m.id}] similar_species "${spJa}": id="${matched}" を補完`);
        } else {
          console.warn(`WARN   [${m.id}] similar_species "${spJa}": id 未設定だが "${matched}" でリンク可能`);
          warnings++;
        }
      }
    }
  }
}

if (fix && fixed > 0) {
  writeFileSync(MUSHROOMS, JSON.stringify(mushrooms, null, 2) + '\n', 'utf-8');
  console.log(`\n${fixed} 件を補完して ${MUSHROOMS} を更新しました。`);
}

const status = errors > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'OK';
console.log(`\n=== 検証結果: ${status} ===`);
console.log(`  ERROR:   ${errors} 件`);
console.log(`  WARNING: ${warnings} 件${fix ? ` (${fixed} 件 --fix で補完済み)` : ''}`);

if (errors > 0) process.exit(1);
