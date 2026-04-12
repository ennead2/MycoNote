/**
 * 種名マッチングの pure helpers (Phase 12)
 *
 * verify-species-v2.mjs と apply-corrections.mjs で共有するユーティリティ。
 * 副作用なし・ネットワーク不使用なので vitest から直接テストできる。
 */

export function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

/** 種内ランク (var. / subsp. / f. / forma) を除いた種レベルの学名 */
export function stripInfraspecific(s) {
  return normalize(s).replace(/\s+(var|subsp|ssp|f|forma|subvar)\.?\s+.*$/, '').trim();
}

/** Levenshtein 編集距離 — 綴り異本判定用 */
export function editDistance(a, b) {
  a = normalize(a); b = normalize(b);
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * 2 つの学名が「実質同一」と見なせるか。
 * - 完全一致
 * - 種内ランク (var./f./subsp.) を除いた種レベルで一致
 * - 同一属かつ種小名の編集距離 <= 2 (正書法揺れ: rhacodes/rachodes など)
 */
export function sciEquivalent(a, b) {
  if (!a || !b) return false;
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  const sa = stripInfraspecific(a), sb = stripInfraspecific(b);
  if (sa === sb) return true;
  const genusA = sa.split(' ')[0], genusB = sb.split(' ')[0];
  if (genusA && genusA === genusB && editDistance(sa, sb) <= 2) return true;
  return false;
}

/**
 * GBIF synonyms から現代的で意味のあるシノニムのみを抽出。
 * - 旧名を必ず先頭に置く
 * - 属 + 種小名 の 2 語のみ (var./f. 付き 3 語は除外)
 * - 種小名が Capital 始まりは異常データとして除外
 * - 最大 maxCount 件
 */
export function filterSynonyms(rawSynonyms, accepted, oldName, maxCount = 3) {
  if (!rawSynonyms || rawSynonyms.length === 0) return oldName && oldName !== accepted ? [oldName] : [];
  const seen = new Set([normalize(accepted)]);
  const result = [];
  if (oldName && normalize(oldName) !== normalize(accepted)) {
    result.push(oldName);
    seen.add(normalize(oldName));
  }
  for (const s of rawSynonyms) {
    if (!s) continue;
    const key = normalize(s);
    if (seen.has(key)) continue;
    const parts = s.trim().split(/\s+/);
    if (parts.length !== 2) continue;
    if (/^[A-Z]/.test(parts[1])) continue;
    result.push(s);
    seen.add(key);
    if (result.length >= maxCount) break;
  }
  return result;
}
