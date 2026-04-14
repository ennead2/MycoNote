/**
 * 毒性分類シグナル。v1 mushrooms → mhlw 名簿 → unknown の順で解決。
 */
import { MHLW_TARGET_SPECIES } from './mhlw.mjs';

export function buildV1ToxicityMap(v1Mushrooms) {
  const map = {};
  for (const m of v1Mushrooms) {
    const sci = m.names?.scientific;
    if (sci && m.toxicity) map[sci] = m.toxicity;
  }
  return map;
}

export function buildMhlwSet() {
  return new Set(MHLW_TARGET_SPECIES.map(s => s.scientificName));
}

/**
 * @param {string} scientificName
 * @param {{ v1Map: Record<string, string>, mhlwSet?: Set<string> }} opts
 * @returns {{ toxicity: string, source: string }}
 */
export function classifyToxicity(scientificName, opts) {
  const v1Map = opts.v1Map || {};
  const mhlwSet = opts.mhlwSet || buildMhlwSet();

  if (v1Map[scientificName]) {
    return { toxicity: v1Map[scientificName], source: 'v1' };
  }
  if (mhlwSet.has(scientificName)) {
    return { toxicity: 'toxic', source: 'mhlw' };
  }
  return { toxicity: 'unknown', source: 'none' };
}
