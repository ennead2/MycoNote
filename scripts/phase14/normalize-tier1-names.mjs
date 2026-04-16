/**
 * tier1 和名リストから checklist ノイズを除去する。
 * 除去対象:
 *   - "※" 以降が続く注釈エントリ（例: "クモ　※クモタケ"）
 *   - 前後の全角/半角空白
 *   - 空文字・重複
 *
 * @param {string[] | null | undefined} names
 * @returns {string[]}
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
