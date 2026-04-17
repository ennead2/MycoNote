#!/usr/bin/env node
/**
 * Phase 15 A1: fetch_taxonomy.mjs の出力を src/data/mushrooms.json の
 * `taxonomy` フィールドに反映する。
 *
 * 既存の taxonomy (order/family/genus: string) を新形式 (TaxonomyRank ペア) に置換。
 * fetch で欠損した種は既存 taxonomy を廃棄して undefined にする（UI 側で非表示）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MUSHROOMS = join(ROOT, 'src', 'data', 'mushrooms.json');
const TAXONOMY = join(ROOT, 'data', 'phase15', 'species-taxonomy.json');

function main() {
  const rows = JSON.parse(readFileSync(MUSHROOMS, 'utf-8'));
  const tax = JSON.parse(readFileSync(TAXONOMY, 'utf-8'));

  const byId = new Map(tax.species.map((s) => [s.id, s.taxonomy]));

  let replaced = 0;
  let dropped = 0;
  for (const m of rows) {
    const t = byId.get(m.id);
    if (t) {
      m.taxonomy = t;
      replaced++;
    } else {
      // fetch で取れなかった種は taxonomy を削除（旧 3 階層形式を残すと型不整合になる）
      if (m.taxonomy) {
        delete m.taxonomy;
        dropped++;
      }
    }
  }

  writeFileSync(MUSHROOMS, JSON.stringify(rows, null, 2) + '\n', 'utf-8');
  console.log(`Replaced: ${replaced}`);
  console.log(`Dropped (missing): ${dropped}`);
  console.log(`Wrote ${MUSHROOMS}`);
}

main();
