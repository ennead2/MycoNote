#!/usr/bin/env node
/**
 * Phase 15 S2: species-traits-visible.json の trait_keys を
 * src/data/mushrooms.json の `traits` フィールドに反映する。
 *
 * 前提:
 *   - measure_coverage.mjs を先に実行して species-traits-visible.json を生成済み
 *
 * 挙動:
 *   - 各種の visible_traits を mushrooms.json の `traits` 配列に格納
 *   - Trait Circus マッチ失敗種 (例: Entoloma sarcopus) は traits を付与しない
 *   - 既存 `traits` は上書き
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MUSHROOMS = join(ROOT, 'src', 'data', 'mushrooms.json');
const VISIBLE = join(ROOT, 'data', 'phase15', 'species-traits-visible.json');

function main() {
  const rows = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
  const visible = JSON.parse(readFileSync(VISIBLE, 'utf-8'));
  const byId = new Map(visible.species.map((s) => [s.id, s.visible_traits]));

  let withTraits = 0;
  let withoutTraits = 0;
  for (const m of rows) {
    const traits = byId.get(m.id);
    if (traits && traits.length > 0) {
      m.traits = traits;
      withTraits++;
    } else {
      if ('traits' in m) delete m.traits;
      withoutTraits++;
    }
  }

  writeFileSync(MUSHROOMS, JSON.stringify(rows, null, 2) + '\n', 'utf-8');

  const totalKeys = rows.reduce((n, m) => n + (m.traits?.length || 0), 0);
  const meanKeys = withTraits === 0 ? 0 : (totalKeys / withTraits).toFixed(1);

  console.log(`Wrote ${MUSHROOMS}`);
  console.log(`  with traits:    ${withTraits}`);
  console.log(`  without traits: ${withoutTraits}`);
  console.log(`  total trait keys: ${totalKeys}`);
  console.log(`  mean per species: ${meanKeys}`);
}

main();
