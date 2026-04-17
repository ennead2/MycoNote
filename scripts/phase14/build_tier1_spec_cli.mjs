/**
 * Phase 14 S3: tier1-species.json 実行 CLI。
 * 入力: data/phase14/tier1-names-normalized.json
 * 入力: data/phase14/tier1-lineup-confirmed.json
 * 出力: data/tier1-species.json
 *
 * Usage:
 *   node scripts/phase14/build_tier1_spec_cli.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTier1Spec } from './build-tier1-spec.mjs';

const NORMALIZED_PATH = 'data/phase14/tier1-names-normalized.json';
const CONFIRMED_PATH = 'data/phase14/tier1-lineup-confirmed.json';
const OUT_PATH = 'data/tier1-species.json';

function main() {
  const normalized = JSON.parse(readFileSync(NORMALIZED_PATH, 'utf8'));
  const confirmed = JSON.parse(readFileSync(CONFIRMED_PATH, 'utf8'));
  const spec = buildTier1Spec(normalized.species, confirmed);
  writeFileSync(OUT_PATH, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  console.log(`wrote ${OUT_PATH}: ${spec.species.length} species`);
}

main();
