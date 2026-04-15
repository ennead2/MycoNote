/**
 * Phase 13-E のキャッシュ破棄スクリプト。
 * redirect 有り状態で作られた wikipedia-ja と combined、および旧パイプラインで
 * 生成された記事・承認・レビュー進捗を破棄して、新パイプラインで再走可能にする。
 *
 * Usage:
 *   node scripts/phase13/reset_phase13e.mjs          # dry-run
 *   node scripts/phase13/reset_phase13e.mjs --confirm
 */
import { rmSync, existsSync } from 'node:fs';

export const RESET_TARGETS = [
  '.cache/phase13/combined',
  '.cache/phase13/wikipedia-ja',
  '.cache/phase13/generated',
  '.cache/phase13/prompts',
  'generated/articles',
  'generated/articles/approved',
  'scripts/temp/review-v2-progress.json',
];

export const RESET_PRESERVES = [
  '.cache/phase13/wikipedia-en',
  '.cache/phase13/daikinrin',
  '.cache/phase13/daikinrin-pages.json',
  '.cache/phase13/mhlw',
  '.cache/phase13/rinya',
  '.cache/phase13/trait-circus',
  '.cache/phase13/gbif',
  '.cache/phase13/inat',
  '.cache/phase13/mycobank',
];

export function runReset({ dry = true } = {}) {
  const deleted = [];
  for (const path of RESET_TARGETS) {
    if (existsSync(path)) {
      if (!dry) rmSync(path, { recursive: true, force: true });
      deleted.push(path);
    }
  }
  return deleted;
}

function main() {
  const args = process.argv.slice(2);
  const isDry = !args.includes('--confirm');
  const deleted = runReset({ dry: isDry });
  console.log(isDry ? '=== DRY RUN ===' : '=== EXECUTED ===');
  console.log('Targets:');
  for (const p of deleted) console.log(`  - ${p}`);
  console.log(`Preserved: ${RESET_PRESERVES.length} paths`);
  if (isDry) {
    console.log('\nTo execute: node scripts/phase13/reset_phase13e.mjs --confirm');
  }
}

if (process.argv[1]?.endsWith('reset_phase13e.mjs')) {
  main();
}
