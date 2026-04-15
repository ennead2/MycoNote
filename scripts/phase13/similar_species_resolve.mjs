/**
 * Phase 13-C: AI が返した similar_species[] を v1 mushrooms.json と照合し、
 * v1_id / scientific を可能な範囲で補完する純関数。
 */

export function buildV1Index(mushrooms) {
  const idx = new Map();
  for (const m of mushrooms) {
    if (m.names?.ja) idx.set(m.names.ja, m);
    for (const alias of m.names?.aliases ?? []) {
      if (!idx.has(alias)) idx.set(alias, m);
    }
  }
  return idx;
}

export function resolveSimilarSpecies(items, v1Mushrooms) {
  const idx = buildV1Index(v1Mushrooms);
  return items.map(({ ja, note }) => {
    const hit = idx.get(ja);
    if (hit) {
      return {
        ja,
        note,
        v1_id: hit.id,
        scientific: hit.names.scientific,
      };
    }
    return { ja, note };
  });
}
