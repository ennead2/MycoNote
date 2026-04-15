/**
 * Phase 13-C pilot: 10 種のソース JSON を .cache/phase13/combined/ に出力する。
 * Usage: node scripts/phase13/fetch_pilot_sources.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fetchDaikinrinPage } from './daikinrin.mjs';
import { fetchWikipediaJa, fetchWikipediaEn } from './wikipedia.mjs';
import { fetchMhlwEntry } from './mhlw.mjs';
import { fetchRinyaOverview } from './rinya.mjs';
import { fetchTraitCircus } from './trait-circus.mjs';
import { combineSources } from './fetch_sources.mjs';

// パイロット専用: 期待 japaneseName を直接 wikipediaJa 検索に渡し、daikinrin 欠損を補う。
async function fetchPilotSources({ scientificName, japaneseName, mycoBankId = null }) {
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    fetchDaikinrinPage(scientificName, japaneseName).catch(() => null),
    fetchWikipediaEn({ scientificName }).catch(() => null),
    fetchMhlwEntry(scientificName).catch(() => null),
    fetchRinyaOverview().catch(() => null),
    fetchTraitCircus(scientificName).catch(() => null),
  ]);
  // daikinrin が落ちても、明示的に与えた japaneseName を優先して wikipedia ja を引く
  const jaName = daikinrin?.japaneseName ?? mhlw?.japaneseName ?? japaneseName;
  const wikipediaJa = await fetchWikipediaJa({ japaneseName: jaName, scientificName })
    .catch(() => null);
  return combineSources({
    scientificName,
    daikinrin,
    wikipediaJa,
    wikipediaEn,
    mhlw,
    rinya,
    traitCircus,
  });
}

const PILOT = [
  { sci: 'Lentinula edodes',        ja: 'シイタケ',             safety: 'edible' },
  { sci: 'Amanita caesareoides',    ja: 'タマゴタケ',           safety: 'edible' },
  { sci: 'Morchella esculenta',     ja: 'アミガサタケ',         safety: 'edible' },
  { sci: 'Pholiota squarrosa',      ja: 'スギタケ',             safety: 'caution' },
  { sci: 'Omphalotus guepiniiformis', ja: 'ツキヨタケ',         safety: 'toxic' },
  { sci: 'Amanita muscaria',        ja: 'ベニテングタケ',       safety: 'toxic' },
  { sci: 'Amanita virosa',          ja: 'ドクツルタケ',         safety: 'deadly' },
  { sci: 'Trichoderma cornu-damae', ja: 'カエンタケ',           safety: 'deadly' },
  { sci: 'Hypholoma fasciculare',   ja: 'ニガクリタケ',         safety: 'inedible' },
  { sci: 'Boletus violaceofuscus',  ja: 'ムラサキヤマドリタケ', safety: 'edible' },
];

const OUT_DIR = '.cache/phase13/combined';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const { sci, ja, safety } of PILOT) {
  const slug = sci.replace(/[^A-Za-z0-9]+/g, '_');
  const out = `${OUT_DIR}/${slug}.json`;
  console.log(`FETCH ${sci} (ja=${ja}) ...`);
  const combined = await fetchPilotSources({ scientificName: sci, japaneseName: ja, mycoBankId: null });
  // パイロット用の補助メタを追記
  combined.pilotMeta = { expectedJapaneseName: ja, safety };
  writeFileSync(out, JSON.stringify(combined, null, 2), 'utf8');
  const got = {
    daikinrin: combined.sources.daikinrin ? '✓' : '-',
    wikipediaJa: combined.sources.wikipediaJa ? '✓' : '-',
    wikipediaEn: combined.sources.wikipediaEn ? '✓' : '-',
    mhlw: combined.sources.mhlw ? '✓' : '-',
    rinya: combined.sources.rinya ? '✓' : '-',
    traitCircus: combined.sources.traitCircus ? '✓' : '-',
  };
  console.log(`  sources: ${Object.entries(got).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}

console.log('done.');
