/**
 * 子実体を形成しないため図鑑対象外とする属のリスト。
 * ranking.json の tier1 に紛れ込む可能性のある anamorphic fungi / mold / yeast 属。
 * 大菌輪 pages.json 未ヒット種の自動除外判定に使う。
 */
export const NON_FUNGI_GENERA = Object.freeze([
  'Aspergillus',
  'Penicillium',
  'Saccharomyces',
  'Candida',
  'Fusarium',
  'Alternaria',
  'Cladosporium',
  'Trichoderma', // 注意: カエンタケ (Trichoderma cornu-damae) は除外しない（S2 で例外処理）
  'Rhizopus',
  'Mucor',
]);

/**
 * genus が非キノコ属に含まれるか判定。大文字小文字を区別しない。
 * @param {string | null | undefined} genus
 * @returns {boolean}
 */
export function isNonFungusGenus(genus) {
  if (!genus) return false;
  const g = genus.toLowerCase();
  return NON_FUNGI_GENERA.some((n) => n.toLowerCase() === g);
}
