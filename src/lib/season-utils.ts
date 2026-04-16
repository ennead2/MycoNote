import { mushrooms } from '@/data/mushrooms';
import type { Mushroom, SeasonRange } from '@/types/mushroom';

/** 安全Tips — ホーム画面でランダム表示 */
export const SAFETY_TIPS: readonly string[] = [
  '食用と判断できないキノコは絶対に食べないでください。',
  'キノコの識別は複数の特徴を総合的に判断してください。一つの特徴だけで判断は危険です。',
  '採取したキノコは専門家に確認してもらうまで食べないでください。',
  '毒キノコには「見た目が良い」ものも多くあります。見た目だけで判断しないでください。',
  'キノコ採取は経験者と一緒に行くことをお勧めします。',
  '同じ場所に生えているキノコでも種類が異なる場合があります。一本ずつ確認してください。',
  '調理しても毒が消えない種類があります。「加熱すれば安全」は誤りです。',
  '野生キノコによる食中毒は毎年報告されています。慎重な判断を心がけてください。',
  '似た毒キノコと食用種のペアは、慣れた人でも誤認します。一緒に出る種も確認してください。',
  '幼菌・老菌は特徴が分かりにくい。成熟した個体で識別してください。',
] as const;

/**
 * 指定月が発生期間内にあるかを判定（単一 range 版）。
 * start_month <= end_month の通常パターンと、
 * 冬をまたぐパターン（例: start=11, end=2）両方に対応。
 */
export function isMonthInSeason(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }
  // wrap-around (e.g. Nov - Feb)
  return month >= startMonth || month <= endMonth;
}

/** 任意の SeasonRange[] のいずれかに月が含まれれば true。v2 schema 用。 */
export function isMonthInSeasonRanges(month: number, ranges: readonly SeasonRange[]): boolean {
  return ranges.some((r) => isMonthInSeason(month, r.start_month, r.end_month));
}

/**
 * 指定月が旬のキノコ一覧を返す。
 * @param month 1-12
 * @param maxCount 先頭から取得する最大件数（省略時は全件）
 */
export function getSeasonalMushrooms(month: number, maxCount?: number): Mushroom[] {
  const seasonal = mushrooms.filter((m) => isMonthInSeasonRanges(month, m.season));
  if (maxCount !== undefined && seasonal.length > maxCount) {
    return seasonal.slice(0, maxCount);
  }
  return seasonal;
}

/**
 * 決定論的にシードから安全Tipsを1つ返す。
 * ホーム画面表示用: 日付ベースのシードで日替わり表示を実現するため、
 * `Math.random` を直接使わずハイドレーションミスマッチを避ける。
 */
export function getSafetyTip(seed: number): string {
  const normalized = ((seed % SAFETY_TIPS.length) + SAFETY_TIPS.length) % SAFETY_TIPS.length;
  return SAFETY_TIPS[normalized];
}

/**
 * 現在の日付 (YYYYMMDD) からシード値を生成。
 * 例: 2026-04-12 → 20260412
 * ハイドレーション時に date 依存の値を安定化するため、呼び出し元でクライアント側で算出すること。
 */
export function dateToSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}
