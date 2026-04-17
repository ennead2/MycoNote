/**
 * Phase 14 S3: tier1-species.json 生成。
 * data/tier0-species.json と同 schema で出力。
 */

function slugOf(sci) {
  return sci.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * @param {Array<object>} normalizedSpecies S1 出力の species[]
 * @param {{decisions: Record<string, object>}} confirmed S2 出力
 * @returns {{description: string, generatedAt: string, species: Array<object>}}
 */
export function buildTier1Spec(normalizedSpecies, confirmed) {
  const out = [];
  for (const sp of normalizedSpecies) {
    const slug = slugOf(sp.scientificName);
    const d = confirmed.decisions[slug];
    if (!d || d.action === 'exclude' || d.action === 'defer') continue;

    const finalJa = d.action === 'rename' ? d.renameTo : (d.usedName ?? sp.japaneseName);

    const entry = {
      scientificName: sp.scientificName,
      japaneseName: finalJa,
      aliases: sp.cleanedJapaneseNames.filter((n) => n !== finalJa),
      synonyms: sp.synonyms,
      normalizationStatus: sp.normalizationStatus,
    };

    if (d.action === 'rename') {
      entry.ja_wiki_source_override = {
        title: d.renameTo,
        reason: `Phase 14 S2: 大菌輪正典和名に寄せる (from ${sp.japaneseName})`,
      };
    }
    if (d.reason && d.reason.startsWith('force_include')) {
      entry.curator_notes = d.reason;
    }

    out.push(entry);
  }

  return {
    description: 'Phase 14 tier1 spec. Phase 13-C の AI 合成パイプラインに入力する。',
    generatedAt: new Date().toISOString(),
    species: out,
  };
}
