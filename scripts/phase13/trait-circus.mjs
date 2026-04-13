/**
 * Trait Circus 読み込み（Python 前処理済み JSON）。
 * License: CC BY 4.0 (Atsushi/fungi_trait_circus_database)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BY_SPECIES_DIR = join(__dirname, '../../.cache/phase13/trait-circus/by-species');

export function parseTraitCircusRecord(record) {
  return {
    currentName: record.currentName,
    traits: record.traits || [],
  };
}

/**
 * trait 文字列 "element_attribute_value" を分解して
 * { [element]: { [attribute]: value[] } } に集約。
 */
export function summarizeTraits(traits) {
  const out = {};
  for (const t of traits) {
    if (!t.trait || typeof t.trait !== 'string') continue;
    const parts = t.trait.split('_');
    if (parts.length < 3) continue;
    const element = parts[0];
    const attribute = parts[1];
    const value = parts.slice(2).join('_');
    out[element] ??= {};
    out[element][attribute] ??= [];
    if (!out[element][attribute].includes(value)) {
      out[element][attribute].push(value);
    }
  }
  return out;
}

export async function fetchTraitCircus(scientificName) {
  const safe = scientificName.replace(/\s+/g, '_');
  const path = join(BY_SPECIES_DIR, `${safe}.json`);
  if (!existsSync(path)) return null;
  const record = JSON.parse(readFileSync(path, 'utf-8'));
  const parsed = parseTraitCircusRecord(record);
  return {
    ...parsed,
    summary: summarizeTraits(parsed.traits),
    fetchedAt: new Date().toISOString(),
  };
}
