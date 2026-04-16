/**
 * Phase 14 S1: tier1 和名正規化実行 CLI。
 * 入力: data/species-ranking.json （tier === 1 抽出）
 * 入力: .cache/phase13/daikinrin-pages.json （既キャッシュ、なければ fetch）
 * 出力: data/phase14/tier1-names-normalized.json
 *
 * Usage:
 *   node scripts/phase14/normalize_tier1_names_cli.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fetchDaikinrinPagesIndex, buildPagesIndex } from '../phase13/daikinrin-pages.mjs';
import { normalizeTier1 } from './normalize-tier1-names.mjs';

const RANKING_PATH = 'data/species-ranking.json';
const OUT_DIR = 'data/phase14';
const OUT_PATH = `${OUT_DIR}/tier1-names-normalized.json`;

async function main() {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const tier1 = (ranking.species ?? []).filter((s) => s.tier === 1);
  console.log(`tier1 species: ${tier1.length}`);

  const entries = await fetchDaikinrinPagesIndex();
  const index = buildPagesIndex(entries);
  console.log(`daikinrin entries: ${entries.length}`);

  const { species, summary } = normalizeTier1(tier1, index);

  mkdirSync(OUT_DIR, { recursive: true });
  const output = {
    generatedAt: new Date().toISOString(),
    source: `${RANKING_PATH} (ranking.generatedAt=${ranking.generatedAt})`,
    species,
    summary,
  };
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`wrote ${OUT_PATH}`);
  console.log(`summary: ${JSON.stringify(summary)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
