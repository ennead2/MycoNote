/**
 * Phase 13-C pilot: Sonnet / Opus の出力を集約して docs/phase13/samples/ に書き出す。
 * Usage: node scripts/phase13/aggregate_pilot.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';

const PILOT = [
  { slug: 'Lentinula_edodes',          ja: 'シイタケ',             sci: 'Lentinula edodes',          safety: 'edible' },
  { slug: 'Amanita_caesareoides',      ja: 'タマゴタケ',           sci: 'Amanita caesareoides',      safety: 'edible' },
  { slug: 'Morchella_esculenta',       ja: 'アミガサタケ',         sci: 'Morchella esculenta',       safety: 'edible' },
  { slug: 'Pholiota_squarrosa',        ja: 'スギタケ',             sci: 'Pholiota squarrosa',        safety: 'caution' },
  { slug: 'Omphalotus_guepiniiformis', ja: 'ツキヨタケ',           sci: 'Omphalotus guepiniiformis', safety: 'toxic' },
  { slug: 'Amanita_muscaria',          ja: 'ベニテングタケ',       sci: 'Amanita muscaria',          safety: 'toxic' },
  { slug: 'Amanita_virosa',            ja: 'ドクツルタケ',         sci: 'Amanita virosa',            safety: 'deadly' },
  { slug: 'Trichoderma_cornu_damae',   ja: 'カエンタケ',           sci: 'Trichoderma cornu-damae',   safety: 'deadly' },
  { slug: 'Hypholoma_fasciculare',     ja: 'ニガクリタケ',         sci: 'Hypholoma fasciculare',     safety: 'inedible' },
  { slug: 'Boletus_violaceofuscus',    ja: 'ムラサキヤマドリタケ', sci: 'Boletus violaceofuscus',    safety: 'edible' },
];

// 実測メタ（Agent 結果から転記）
const STATS = {
  sonnet: {
    Lentinula_edodes:          { tokens: 45057, ms: 211322 },
    Amanita_caesareoides:      { tokens: 31663, ms: 127031 },
    Morchella_esculenta:       { tokens: 38059, ms: 188933 },
    Pholiota_squarrosa:        { tokens: 27224, ms: 86494 },
    Omphalotus_guepiniiformis: { tokens: 46311, ms: 231337 },
    Amanita_muscaria:          { tokens: 69184, ms: 305955 },
    Amanita_virosa:            { tokens: 44183, ms: 228328 },
    Trichoderma_cornu_damae:   { tokens: 37980, ms: 138164 },
    Hypholoma_fasciculare:     { tokens: 25887, ms: 68120 },
    Boletus_violaceofuscus:    { tokens: 25318, ms: 59186 },
  },
  opus: {
    Lentinula_edodes:          { tokens: 52282, ms: 172958 },
    Amanita_caesareoides:      { tokens: 45974, ms: 123321 },
    Morchella_esculenta:       { tokens: 55213, ms: 223380 },
    Pholiota_squarrosa:        { tokens: 42683, ms: 98113 },
    Omphalotus_guepiniiformis: { tokens: 59168, ms: 221218 },
    Amanita_muscaria:          { tokens: 66980, ms: 237645 },
    Amanita_virosa:            { tokens: 60029, ms: 242629 },
    Trichoderma_cornu_damae:   { tokens: 68914, ms: 256200 },
    Hypholoma_fasciculare:     { tokens: 40601, ms: 65731 },
    Boletus_violaceofuscus:    { tokens: 39787, ms: 65495 },
  },
};

const SAFETY_LABEL = {
  edible: '🍳 食用',
  caution: '⚠️ 食用要注意',
  toxic: '☠️ 毒',
  deadly: '💀 猛毒',
  inedible: '🚫 不食（毒扱い）',
};

function buildDoc(model) {
  const lines = [];
  const label = model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-opus-4-6';
  lines.push(`# Phase 13-C パイロット — ${label} 10 種サンプル`);
  lines.push('');
  lines.push(`**生成日**: 2026-04-14`);
  lines.push(`**モデル**: ${label}`);
  lines.push(`**プロンプト**: docs/superpowers/specs/2026-04-13-phase13-daikinrin-rag-rewrite-design.md §4.3 準拠（文字数上限なし）`);
  lines.push(`**ソース状況**: Wikipedia ja=9/10, Wikipedia en=9/10, 厚労省=4/10, 林野庁=10/10, 大菌輪=0/10 (MycoBank未解決), TraitCircus=0/10 (カバレッジ外)`);
  lines.push('');
  lines.push('## 実行統計');
  lines.push('');
  lines.push('| # | 和名 | 学名 | safety | 出力 bytes | total_tokens | duration (s) |');
  lines.push('|---|---|---|---|---:|---:|---:|');
  let totalBytes = 0;
  let totalTokens = 0;
  let totalMs = 0;
  PILOT.forEach((s, i) => {
    const path = `.cache/phase13/pilot-output/${model}/${s.slug}.md`;
    const bytes = statSync(path).size;
    const { tokens, ms } = STATS[model][s.slug];
    totalBytes += bytes;
    totalTokens += tokens;
    totalMs += ms;
    lines.push(`| ${i + 1} | ${s.ja} | *${s.sci}* | ${SAFETY_LABEL[s.safety]} | ${bytes.toLocaleString()} | ${tokens.toLocaleString()} | ${(ms / 1000).toFixed(1)} |`);
  });
  lines.push(`| | **合計** | | | **${totalBytes.toLocaleString()}** | **${totalTokens.toLocaleString()}** | **${(totalMs / 1000).toFixed(1)}** |`);
  lines.push(`| | **平均/種** | | | ${Math.round(totalBytes / PILOT.length).toLocaleString()} | ${Math.round(totalTokens / PILOT.length).toLocaleString()} | ${(totalMs / PILOT.length / 1000).toFixed(1)} |`);
  lines.push('');
  lines.push('※ 並列実行のため `duration` は wall-clock 合計ではない（各サブエージェントの個別実行時間）。');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Concatenate species
  PILOT.forEach((s, i) => {
    const content = readFileSync(`.cache/phase13/pilot-output/${model}/${s.slug}.md`, 'utf8');
    // Strip frontmatter if present
    const stripped = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    lines.push(`# ${i + 1}. ${s.ja} *${s.sci}* (${SAFETY_LABEL[s.safety]})`);
    lines.push('');
    lines.push(stripped.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

const outDir = 'docs/phase13/samples';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const model of ['sonnet', 'opus']) {
  const doc = buildDoc(model);
  const out = `${outDir}/2026-04-14-${model}-10species.md`;
  writeFileSync(out, doc, 'utf8');
  console.log(`wrote ${out} (${statSync(out).size.toLocaleString()} bytes)`);
}
