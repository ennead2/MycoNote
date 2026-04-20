/**
 * Phase 17 S9: safety (食毒) 判定ロジック。
 *
 * 判定優先順位:
 *  1. 厚労省「自然毒のリスクプロファイル」19 種 → toxic or deadly を自動確定 (mhlwSeverity 表)
 *  2. Wikipedia JA infobox「食毒」欄パース (未実装、将来拡張)
 *  3. Wikipedia EN infobox "Edibility" パース (未実装、将来拡張)
 *  4. 情報なし → 'unknown'
 *
 * validator:
 *  - safety='edible' で厚労省リスト該当は絶対 throw (誤食事故防止)
 *
 * 出力:
 *  - safety: 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly' | 'unknown'
 *  - confidence: 'mhlw' | 'wikipedia_ja_infobox' | 'wikipedia_en_infobox' | 'no_data'
 *  - evidence: マッチ情報 (mhlw エントリ or infobox 抜粋)
 */
import { MHLW_TARGET_SPECIES } from '../phase13/mhlw.mjs';

/**
 * 厚労省 19 種の重症度分類。
 * 致死事例のある種を 'deadly'、それ以外の mhlw 収録種は 'toxic'。
 * 出典: 厚労省「自然毒のリスクプロファイル」および同省食中毒統計
 */
const MHLW_SEVERITY = {
  // 死亡事例多数・猛毒
  'カエンタケ': 'deadly',
  'ドクツルタケ': 'deadly',
  'シロタマゴテングタケ': 'deadly',
  'ニセクロハツ': 'deadly',
  'タマゴタケモドキ': 'deadly',
  'ヒメアジロガサ': 'deadly',
  'ドクヤマドリ': 'deadly',
  'スギヒラタケ': 'deadly', // 急性脳症による死亡事例あり
  'ドクササコ': 'toxic',    // 四肢末端疼痛、長期後遺症あるが死亡稀
  // 重篤だが死亡事例稀
  'ツキヨタケ': 'toxic',
  'カキシメジ': 'toxic',
  'クサウラベニタケ': 'toxic',
  'テングタケ': 'toxic',
  'ベニテングタケ': 'toxic',
  'ニガクリダケ': 'toxic',
  'ニセショウロ': 'toxic',
  'ネズミシメジ': 'toxic',
  'ハイイロシメジ': 'toxic',
  'ヒカゲシビレタケ': 'toxic', // 幻覚性、麻薬指定
};

/**
 * 厚労省マッチ: 和名 / 学名 / synonyms いずれかで 19 種と一致するか。
 * @returns {{ matched: object, severity: 'toxic' | 'deadly' } | null}
 */
export function matchMhlw({ japaneseName, scientificName, synonyms = [] }) {
  for (const t of MHLW_TARGET_SPECIES) {
    if (japaneseName === t.japaneseName) {
      return { matched: t, severity: MHLW_SEVERITY[t.japaneseName] || 'toxic' };
    }
    if (scientificName === t.scientificName) {
      return { matched: t, severity: MHLW_SEVERITY[t.japaneseName] || 'toxic' };
    }
    for (const syn of synonyms) {
      if (syn === t.scientificName) {
        return { matched: t, severity: MHLW_SEVERITY[t.japaneseName] || 'toxic' };
      }
    }
  }
  return null;
}

/**
 * safety 判定のメイン。
 * 現時点で Wikipedia infobox 解析は未実装 (後続フェーズで追加予定)。
 *
 * @param {{
 *   japaneseName: string,
 *   scientificName: string,
 *   synonyms?: string[],
 *   wikipediaJaHtml?: string | null,
 *   wikipediaEnHtml?: string | null,
 * }} input
 * @returns {{
 *   safety: 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly' | 'unknown',
 *   confidence: 'mhlw' | 'wikipedia_ja_infobox' | 'wikipedia_en_infobox' | 'no_data',
 *   evidence: any[],
 * }}
 */
export function resolveSafety(input) {
  // 1. mhlw 19 種
  const mhlw = matchMhlw(input);
  if (mhlw) {
    return {
      safety: mhlw.severity,
      confidence: 'mhlw',
      evidence: [{ source: 'mhlw', matched: mhlw.matched }],
    };
  }

  // 2,3. Wikipedia infobox 解析 (未実装、no-op)
  // TODO: 後続フェーズで infobox から edible/inedible/caution/toxic を抽出

  // 4. no data
  return {
    safety: 'unknown',
    confidence: 'no_data',
    evidence: [],
  };
}

/**
 * 外部で合成された safety 値と mhlw を突合するバリデータ。
 * safety='edible' かつ mhlw 該当 → throw (致命的誤判定を防ぐ)。
 *
 * @param {string} safety - 'edible' | 'caution' | ... 合成後の safety
 * @param {{ japaneseName, scientificName, synonyms? }} input
 */
export function validateSafetyAgainstMhlw(safety, input) {
  const mhlw = matchMhlw(input);
  if (!mhlw) return;
  if (safety === 'edible') {
    throw new Error(
      `safety validator: ${input.japaneseName} (${input.scientificName}) is in mhlw 19-species list but safety=edible. ` +
        `Expected ${mhlw.severity}. This would cause lethal misidentification.`,
    );
  }
  // mhlw 該当で safety が toxic/deadly/caution/inedible/unknown はすべて許容 (厳格すぎると override で矛盾するため)
}
