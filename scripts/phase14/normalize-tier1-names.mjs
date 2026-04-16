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
