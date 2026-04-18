import type { Mushroom } from '@/types/mushroom';
import { SAFETY_CONFIG } from '@/constants/safety';
import { isMonthInSeasonRanges } from './season-utils';

/**
 * 簡易識別の 1 候補。score は全候補中の最大値で正規化された 0〜1 値。
 * UI は score を百分率で表示し、isDangerous が true の候補は safety パレットで強調する。
 */
export interface IdentifyCandidate {
  mushroom: Mushroom;
  /** 選択形質のうち種の traits に直接ヒットした key の数 */
  hitCount: number;
  /** 選択した trait_keys の総数（月フィルタは含まない） */
  selectedCount: number;
  /**
   * 最終スコア (0〜1)。候補プール内の最大スコアで正規化済み。
   * UI 表示は `Math.round(score * 100) + '%'`。
   */
  score: number;
  /** 正規化前の rawScore（デバッグ/同率判定用） */
  rawScore: number;
  /** 月指定時: その種が指定月に発生期を持てば true */
  monthMatched: boolean;
  /** safety=toxic/deadly なら true (UI で強調表示) */
  isDangerous: boolean;
}

export interface IdentifyOptions {
  /** 結果の最大件数 (default: 20) */
  maxResults?: number;
  /**
   * 正規化前 rawScore の最低閾値。これ未満は除外。
   * default: 1。month bonus のみ (8点) でも候補に残る設定。
   */
  minRawScore?: number;
  /**
   * 指定されればその月 (1-12) に発生期を持つ種に MONTH_BONUS 点加算。
   * undefined なら月フィルタ無効。
   */
  month?: number;
}

/**
 * presence 系の暗黙マッチに付与する固定点。
 * Trait Circus が annulus_presence_present を落とし、annulus_color_* のみ拾った
 * ケース (例: タマゴタケ) を救済する。直接マッチ (count 値そのまま) より弱めに設定。
 */
const PRESENCE_IMPLICIT_POINTS = 3;

/**
 * 月マッチ時の加点。種あたり max count 中央値 (≒ 8) に合わせ、
 * 「その種で最頻の 1 形質」と同程度の強度にする。
 */
const MONTH_MATCH_POINTS = 8;

/**
 * presence 系 trait_key をパース。
 */
function parsePresence(key: string): { element: string; mode: 'present' | 'absent' } | null {
  const m = key.match(/^(.+)_presence_(present|absent)$/);
  if (!m) return null;
  return { element: m[1], mode: m[2] as 'present' | 'absent' };
}

/**
 * 1 つの選択形質に対する点数を返す。
 * - 直接マッチ: traits[key] の count をそのまま返す
 * - presence 暗黙: PRESENCE_IMPLICIT_POINTS を返す
 * - ヒットせず: 0
 */
function scoreForSelection(selectedKey: string, traits: Record<string, number>): number {
  const direct = traits[selectedKey];
  if (direct) return direct;
  const p = parsePresence(selectedKey);
  if (!p) return 0;
  const prefix = p.element + '_';
  let hasAny = false;
  for (const k of Object.keys(traits)) {
    if (k.startsWith(prefix)) {
      hasAny = true;
      break;
    }
  }
  const implicit = p.mode === 'present' ? hasAny : !hasAny;
  return implicit ? PRESENCE_IMPLICIT_POINTS : 0;
}

/**
 * 大菌輪統制形質ベースの簡易識別マッチャー (Phase 15 S3 改修版)。
 *
 * スコアリング:
 *   rawScore = Σ 選択形質ごとの scoreForSelection(key, species.traits)
 *             + (month が種の season 内なら MONTH_MATCH_POINTS)
 *   score    = rawScore / max(rawScore of all candidates)   (0〜1 に正規化)
 *
 * ソート:
 *   1. score 降順
 *   2. 同率は safety priority 昇順 (食用 → 要注意 → 猛毒 → 毒 → 不明 → 不食)
 *   3. さらに同率は五十音
 */
export function matchSpeciesByTraits(
  selectedTraits: readonly string[],
  mushrooms: readonly Mushroom[],
  options: IdentifyOptions = {},
): IdentifyCandidate[] {
  const { maxResults = 20, minRawScore = 1, month } = options;
  const hasFeatureSelection = selectedTraits.length > 0;
  const hasMonth = typeof month === 'number';
  if (!hasFeatureSelection && !hasMonth) return [];

  interface RawCandidate {
    mushroom: Mushroom;
    hitCount: number;
    rawScore: number;
    monthMatched: boolean;
  }
  const raws: RawCandidate[] = [];

  for (const m of mushrooms) {
    const traits = m.traits;
    let rawScore = 0;
    let hitCount = 0;
    if (traits) {
      for (const sel of selectedTraits) {
        const pts = scoreForSelection(sel, traits);
        if (pts > 0) {
          rawScore += pts;
          hitCount++;
        }
      }
    }
    let monthMatched = false;
    if (hasMonth && isMonthInSeasonRanges(month, m.season)) {
      rawScore += MONTH_MATCH_POINTS;
      monthMatched = true;
    }
    if (rawScore < minRawScore) continue;
    // traits 未収録種は形質で拾えない。月のみマッチした種は許容する。
    if (!traits && !monthMatched) continue;
    raws.push({ mushroom: m, hitCount, rawScore, monthMatched });
  }

  const maxRaw = raws.reduce((m, c) => (c.rawScore > m ? c.rawScore : m), 0);
  const candidates: IdentifyCandidate[] = raws.map((c) => ({
    mushroom: c.mushroom,
    hitCount: c.hitCount,
    selectedCount: selectedTraits.length,
    score: maxRaw === 0 ? 0 : c.rawScore / maxRaw,
    rawScore: c.rawScore,
    monthMatched: c.monthMatched,
    isDangerous: c.mushroom.safety === 'toxic' || c.mushroom.safety === 'deadly',
  }));

  candidates.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const pa = SAFETY_CONFIG[a.mushroom.safety].priority;
    const pb = SAFETY_CONFIG[b.mushroom.safety].priority;
    if (pa !== pb) return pa - pb;
    return a.mushroom.names.ja.localeCompare(b.mushroom.names.ja, 'ja');
  });

  return candidates.slice(0, maxResults);
}

/**
 * 候補群に毒キノコ (toxic/deadly) が含まれるか。UI の警告バナー表示用。
 */
export function hasDangerousCandidate(candidates: readonly IdentifyCandidate[]): boolean {
  return candidates.some((c) => c.isDangerous);
}

/** 調整用の公開定数（将来 UI で tuning したくなった時のため） */
export const SCORING_CONSTANTS = {
  PRESENCE_IMPLICIT_POINTS,
  MONTH_MATCH_POINTS,
} as const;
