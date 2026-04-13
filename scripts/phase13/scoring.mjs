/**
 * シグナルから重み付けスコアを算出し、tier 分類する。
 * 重み案は docs/superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md §3.1 に基づく。
 */

const TOXICITY_BOOST = {
  deadly: 10,
  toxic: 6,
  caution: 3,
  edible: 2,
  inedible: 0,
  unknown: 0,
};

const WEIGHTS = {
  observationsLog10: 2.0,
  wamei: 3,
  wikiJa: 5,
  inatPhotos: 2,
  mycobank: 1,
};

/**
 * @param {{
 *   observationsDomestic: number,
 *   wikiJaExists: boolean,
 *   inatHasPhotos: boolean,
 *   hasWamei: boolean,
 *   toxicity: string,
 *   mycobankId: number | null,
 * }} signals
 * @returns {number} score (整数、小数切り捨て)
 */
export function computeScore(signals) {
  let score = 0;
  if (signals.observationsDomestic > 0) {
    score += Math.log10(signals.observationsDomestic) * WEIGHTS.observationsLog10;
  }
  if (signals.hasWamei) score += WEIGHTS.wamei;
  if (signals.wikiJaExists) score += WEIGHTS.wikiJa;
  if (signals.inatHasPhotos) score += WEIGHTS.inatPhotos;
  if (signals.mycobankId !== null) score += WEIGHTS.mycobank;
  score += TOXICITY_BOOST[signals.toxicity] ?? 0;
  return Math.round(score * 100) / 100;
}

/**
 * @param {string} scientificName
 * @param {number} score
 * @param {number} rank (0-based, スコア降順)
 * @param {{ tier0Set: Set<string>, tier1Size: number, tier2Size: number }} opts
 * @returns {0 | 1 | 2 | 3}
 */
export function classifyTier(scientificName, score, rank, opts) {
  if (opts.tier0Set.has(scientificName)) return 0;
  if (rank < opts.tier1Size) return 1;
  if (rank < opts.tier1Size + opts.tier2Size) return 2;
  return 3;
}

/**
 * @param {Array<{ scientificName: string, score: number, ... }>} candidates
 * @param {{ tier0Set: Set<string>, tier1Size: number, tier2Size: number }} opts
 * @returns {Array<{ ..., rank: number, tier: 0|1|2|3 }>}
 */
export function rankAndClassify(candidates, opts) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  return sorted.map((c, rank) => ({
    ...c,
    rank,
    tier: classifyTier(c.scientificName, c.score, rank, opts),
  }));
}
