import type { Mushroom } from '@/types/mushroom';
import { SAFETY_CONFIG } from '@/constants/safety';

/**
 * 簡易識別の 1 候補。hitCount / selectedCount = score。
 * UI は score を百分率で表示し、isDangerous が true の候補は safety パレットで強調する。
 */
export interface IdentifyCandidate {
  mushroom: Mushroom;
  /** 選択 trait_keys のうち種の traits に含まれる数 */
  hitCount: number;
  /** ユーザーが選択した trait_keys の総数 */
  selectedCount: number;
  /** hitCount / selectedCount (0〜1) */
  score: number;
  /** safety=toxic/deadly なら true (UI で強調表示) */
  isDangerous: boolean;
}

export interface IdentifyOptions {
  /** 結果の最大件数 (default: 20) */
  maxResults?: number;
  /**
   * 最低スコア閾値 (0〜1)。score < minScore の候補は除外。
   * default: 0.1。ユーザーが 10 個選択時に 1 個以上マッチで候補入り。
   */
  minScore?: number;
}

/**
 * 大菌輪統制形質ベースの簡易識別マッチャー (Phase 15 S3)。
 *
 * スコアリング:
 *   score = (選択 trait_keys のうち種の traits に含まれる数) / 選択総数
 *
 * ソート:
 *   1. score 降順
 *   2. 同率は safety priority 昇順 (食用 → 要注意 → 猛毒 → 毒 → 不明 → 不食)
 *   3. さらに同率は五十音
 *
 * 備考:
 *   - traits を持たない種 (Trait Circus 未収録、例: Entoloma sarcopus) は除外
 *   - hitCount=0 は除外
 *   - selectedTraits が空なら空配列を返す（UI 側で「特徴を選んでください」表示）
 */
export function matchSpeciesByTraits(
  selectedTraits: readonly string[],
  mushrooms: readonly Mushroom[],
  options: IdentifyOptions = {},
): IdentifyCandidate[] {
  const { maxResults = 20, minScore = 0.1 } = options;
  if (selectedTraits.length === 0) return [];

  const selectedSet = new Set(selectedTraits);
  const candidates: IdentifyCandidate[] = [];

  for (const m of mushrooms) {
    if (!m.traits || m.traits.length === 0) continue;
    let hitCount = 0;
    for (const t of m.traits) {
      if (selectedSet.has(t)) hitCount++;
    }
    if (hitCount === 0) continue;
    const score = hitCount / selectedTraits.length;
    if (score < minScore) continue;
    candidates.push({
      mushroom: m,
      hitCount,
      selectedCount: selectedTraits.length,
      score,
      isDangerous: m.safety === 'toxic' || m.safety === 'deadly',
    });
  }

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
