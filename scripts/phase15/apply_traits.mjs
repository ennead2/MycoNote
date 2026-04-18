#!/usr/bin/env node
/**
 * Phase 15 S2/S4 (改修): Trait Circus の生データから各種の visible trait_key の
 * **出現頻度 (count)** を集計し、`src/data/mushrooms.json` の `traits` フィールドに
 * `Record<string, number>` として反映する。
 *
 * 旧: string[] (有無のみ)
 * 新: Record<string, number> (count = 重み)
 *
 * 重みは Trait Circus の 1 trait 1 レコード形式から同一 key の件数を数えて算出。
 * 例: ベニテングタケの stipe_color_white は 19 レコード → 重み 19。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MUSHROOMS = join(ROOT, 'src', 'data', 'mushrooms.json');
const RAW = join(ROOT, 'data', 'phase15', 'species-traits-raw.json');
const LABELS = join(ROOT, 'src', 'data', 'trait-labels.json');

function buildAllowedKeys() {
  const labels = JSON.parse(readFileSync(LABELS, 'utf-8'));
  const s = new Set();
  for (const el of labels.elements) {
    for (const attr of el.attributes) {
      for (const v of attr.values) s.add(v.key);
    }
  }
  return s;
}

function countsFromRaw(speciesRaw, allowed) {
  const counts = {};
  for (const t of speciesRaw.traits) {
    if (!allowed.has(t.trait)) continue;
    counts[t.trait] = (counts[t.trait] || 0) + 1;
  }
  return counts;
}

function main() {
  const rows = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
  const raw = JSON.parse(readFileSync(RAW, 'utf-8'));
  const allowed = buildAllowedKeys();
  const byId = new Map(raw.species.map((s) => [s.id, s]));

  let withTraits = 0;
  let withoutTraits = 0;
  let totalOccurrences = 0;
  let totalUniqKeys = 0;
  for (const m of rows) {
    const rawEntry = byId.get(m.id);
    if (!rawEntry) {
      if ('traits' in m) delete m.traits;
      withoutTraits++;
      continue;
    }
    const counts = countsFromRaw(rawEntry, allowed);
    const uniqKeys = Object.keys(counts).length;
    if (uniqKeys === 0) {
      if ('traits' in m) delete m.traits;
      withoutTraits++;
      continue;
    }
    m.traits = counts;
    withTraits++;
    totalUniqKeys += uniqKeys;
    totalOccurrences += Object.values(counts).reduce((a, b) => a + b, 0);
  }

  writeFileSync(MUSHROOMS, JSON.stringify(rows, null, 2) + '\n', 'utf-8');

  console.log(`Wrote ${MUSHROOMS}`);
  console.log(`  with traits:     ${withTraits}`);
  console.log(`  without traits:  ${withoutTraits}`);
  console.log(`  total unique keys: ${totalUniqKeys}`);
  console.log(`  total occurrences: ${totalOccurrences}`);
  console.log(`  mean uniq / sp:    ${(totalUniqKeys / withTraits).toFixed(1)}`);
  console.log(`  mean occurrences:  ${(totalOccurrences / withTraits).toFixed(1)}`);
}

main();
