/**
 * 大菌輪 `h1.scientific-name` テキストを構造化する parser。
 *
 * 大菌輪 4204 種の実測:
 *  - 98.5% (4063/4204) が Genus species の二名法
 *  - 3.5% (141/4204) が "Genus species f. epithet" 形式（品種 form）
 *  - subsp. / var. / sp. / aff. / cf. は 0 件
 *  - authorship (命名者) は h1 に含まれない
 *
 * そのため parser は authorship を考慮せず、binomial + 任意の form のみ扱う。
 * 想定外入力（属名のみ、5 語以上、未知の infraspecific rank）は例外を投げる。
 *
 * 出力は Phase 17 master JSON の names フィールドに直接流し込める形。
 */

/**
 * @param {string} raw - 大菌輪 h1 の生テキスト
 * @returns {{
 *   scientificName: string,          // 二名法（Genus + species）
 *   scientificNameRaw: string,       // 入力をそのまま保持（trim のみ）
 *   infraspecificRank: 'f.' | null,
 *   infraspecificEpithet: string | null,
 *   authorship: null,                // 大菌輪には無いので常に null
 * }}
 */
export function parseScientificName(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError(`parseScientificName: expected string, got ${typeof raw}`);
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('parseScientificName: empty input');
  }
  const parts = trimmed.split(/\s+/);

  if (parts.length === 2) {
    assertBinomial(parts, trimmed);
    return {
      scientificName: `${parts[0]} ${parts[1]}`,
      scientificNameRaw: trimmed,
      infraspecificRank: null,
      infraspecificEpithet: null,
      authorship: null,
    };
  }

  if (parts.length === 4 && parts[2] === 'f.') {
    assertBinomial(parts, trimmed);
    assertEpithet(parts[3], trimmed);
    return {
      scientificName: `${parts[0]} ${parts[1]}`,
      scientificNameRaw: trimmed,
      infraspecificRank: 'f.',
      infraspecificEpithet: parts[3],
      authorship: null,
    };
  }

  throw new Error(`parseScientificName: unsupported format "${trimmed}"`);
}

function assertBinomial(parts, original) {
  if (!/^[A-Z][a-z-]+$/.test(parts[0])) {
    throw new Error(`parseScientificName: invalid genus "${parts[0]}" in "${original}"`);
  }
  if (!/^[a-z][a-z-]+$/.test(parts[1])) {
    throw new Error(`parseScientificName: invalid species epithet "${parts[1]}" in "${original}"`);
  }
}

function assertEpithet(epithet, original) {
  if (!/^[a-z][a-z-]+$/.test(epithet)) {
    throw new Error(`parseScientificName: invalid infraspecific epithet "${epithet}" in "${original}"`);
  }
}
