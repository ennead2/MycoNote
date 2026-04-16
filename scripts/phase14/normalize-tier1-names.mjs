import { isNonFungusGenus } from './non-fungi-genera.mjs';
import { lookupEntry } from '../phase13/daikinrin-pages.mjs';

/**
 * tier1 和名リストから checklist ノイズを除去する。
 *
 * 日本語キノコ和名は内部空白を持たない前提で、全ての全角/半角空白を除去する
 * （checklist の「クモ　※クモタケ」のような空白+注釈混入に対応するため）。
 *
 * 除去対象:
 *   - "※" を含むエントリ（checklist 側の注釈）
 *   - 全ての全角/半角空白（前後・内部すべて）
 *   - 空文字・重複
 *
 * @param {string[] | null | undefined} names 非配列/nullish は [] として扱う
 * @returns {string[]} 正規化済み和名配列（空白なし、重複なし、空文字なし）
 */
export function cleanJapaneseNames(names) {
  if (!Array.isArray(names)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of names) {
    if (typeof raw !== 'string') continue;
    if (raw.includes('※')) continue;
    const trimmed = raw.replace(/[\s　]+/g, '').trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/**
 * 種を以下の suggestion に分類する:
 *   - KEEP: 大菌輪ヒット かつ 和名一致
 *   - RENAME_TO: 大菌輪ヒット かつ 和名不一致（daikinrinTitle に候補）
 *   - EXCLUDE_NOT_MUSHROOM: 大菌輪未ヒット かつ 非キノコ属
 *   - NEEDS_REVIEW: 大菌輪未ヒット かつ 非キノコ属ではない
 *
 * @param {{scientificName: string, japaneseName: string, genus: string}} sp
 * @param {{byScientific: Map, byJapanese: Map}} daikinrinIndex
 * @returns {{suggestion: string, daikinrinHit: boolean, daikinrinTitle?: string, daikinrinScientificName?: string, excludeReason?: string}}
 */
export function classifySpecies(sp, daikinrinIndex) {
  const entry = lookupEntry(daikinrinIndex, {
    scientificName: sp.scientificName,
    japaneseName: sp.japaneseName,
  });

  if (entry) {
    const matches = entry.japaneseName === sp.japaneseName;
    return {
      suggestion: matches ? 'KEEP' : 'RENAME_TO',
      daikinrinHit: true,
      daikinrinTitle: entry.japaneseName,
      daikinrinScientificName: entry.scientificName,
    };
  }

  if (isNonFungusGenus(sp.genus)) {
    return {
      suggestion: 'EXCLUDE_NOT_MUSHROOM',
      daikinrinHit: false,
      excludeReason: `子実体を形成しないカビ・酵母属 (${sp.genus})`,
    };
  }

  return {
    suggestion: 'NEEDS_REVIEW',
    daikinrinHit: false,
  };
}
