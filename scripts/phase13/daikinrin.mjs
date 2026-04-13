/**
 * 大菌輪（Daikinrin）ページの URL 解決・fetch・パース。
 * License: 大菌輪は CC BY 4.0。帰属表示はクライアント側で処理。
 */

const BASE = 'https://mycoscouter.coolblog.jp/daikinrin/Pages';

export function buildPageUrl(scientificName, mycoBankId) {
  const parts = scientificName.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`scientific name must be binomial: got "${scientificName}"`);
  }
  const slug = scientificName.trim().replace(/\s+/g, '_');
  return `${BASE}/${slug}_${mycoBankId}.html`;
}
