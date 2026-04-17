/**
 * Phase 13-C: AI 合成オーケストレータ（非 AI 部分）。
 * - 対象種の解決
 * - プロンプト組立と書き出し
 * - 生成結果の検証レポート
 *
 * Usage:
 *   node scripts/phase13/generate_articles.mjs --prepare
 *   node scripts/phase13/generate_articles.mjs --validate
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildArticlePrompt } from './prompt_templates.mjs';
import { validateArticle } from './validate_article.mjs';

const RANKING_PATH = 'data/species-ranking.json';
const COMBINED_DIR = '.cache/phase13/combined';
const GENERATED_DIR = '.cache/phase13/generated';
const PROMPTS_DIR = '.cache/phase13/prompts';
const REPORT_PATH = '.cache/phase13/generation-report.json';

export function scientificNameToSlug(sci) {
  return sci.replace(/[^A-Za-z0-9]+/g, '_');
}

export function resolveTier0Targets(ranking) {
  return (ranking.species ?? []).filter(s => s.tier === 0);
}

/**
 * spec ファイル配列と ranking を突合し、AI 合成対象の target 配列を返す。
 * 複数 spec を渡すとマージされる（dedupe は scientificName 基準）。
 *
 * spec にあり ranking にない種は spec の safety / synonyms から minimal target を組む。
 * spec.safety が無くて ranking にもない場合は throw。
 *
 * @param {object} ranking species-ranking.json 全体
 * @param {Array<{species: Array<{scientificName: string, japaneseName: string, safety?: string, synonyms?: string[], ja_wiki_source_override?: object}>}>} specs
 * @returns {Array<object>} target entries
 */
export function resolveTargetsFromSpecs(ranking, specs) {
  const rankingMap = new Map();
  const synonymMap = new Map();
  for (const s of ranking.species ?? []) {
    rankingMap.set(s.scientificName, s);
    for (const syn of s.synonyms ?? []) synonymMap.set(syn, s);
    for (const on of s.originalNames ?? []) synonymMap.set(on, s);
  }
  const seen = new Set();
  const targets = [];
  for (const spec of specs) {
    for (const entry of spec.species ?? []) {
      if (seen.has(entry.scientificName)) continue;
      seen.add(entry.scientificName);
      const rank = rankingMap.get(entry.scientificName) ?? synonymMap.get(entry.scientificName);
      if (rank) {
        targets.push({
          ...rank,
          scientificName: entry.scientificName,
          japaneseName: entry.japaneseName,
          ja_wiki_source_override: entry.ja_wiki_source_override ?? rank.ja_wiki_source_override ?? null,
        });
      } else {
        if (!entry.safety) {
          throw new Error(`spec species missing from ranking and has no safety: ${entry.scientificName}`);
        }
        targets.push({
          scientificName: entry.scientificName,
          japaneseName: entry.japaneseName,
          signals: { toxicity: entry.safety },
          synonyms: entry.synonyms ?? [],
          ja_wiki_source_override: entry.ja_wiki_source_override ?? null,
        });
      }
    }
  }
  return targets;
}

export function normalizeSafety(toxicity) {
  if (toxicity === 'edible_caution') return 'caution';
  if (toxicity === 'deadly_toxic') return 'deadly';
  return toxicity;
}

export function tier0ToPromptInput(target) {
  const slug = scientificNameToSlug(target.scientificName);
  const toxicity = target.signals?.toxicity ?? target.toxicity;
  return {
    japaneseName: target.japaneseName,
    scientificName: target.scientificName,
    safety: normalizeSafety(toxicity),
    combinedJsonPath: `${COMBINED_DIR}/${slug}.json`,
    outputJsonPath: `${GENERATED_DIR}/${slug}.json`,
    jaWikiSourceOverride: target.ja_wiki_source_override ?? null,
  };
}

export function buildManifestEntry(target, { promptPath, hasCombined }) {
  const input = tier0ToPromptInput(target);
  return {
    slug: scientificNameToSlug(target.scientificName),
    japaneseName: target.japaneseName,
    scientificName: target.scientificName,
    safety: input.safety,
    hasCombined,
    promptPath,
    outputPath: input.outputJsonPath,
    jaWikiSourceOverride: input.jaWikiSourceOverride,
  };
}

function prepare(specPaths = []) {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const targets = specPaths.length > 0
    ? resolveTargetsFromSpecs(ranking, specPaths.map((p) => JSON.parse(readFileSync(p, 'utf8'))))
    : resolveTier0Targets(ranking);
  mkdirSync(PROMPTS_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const manifest = [];
  for (const t of targets) {
    const input = tier0ToPromptInput(t);
    const slug = scientificNameToSlug(t.scientificName);
    const hasCombined = existsSync(input.combinedJsonPath);
    const prompt = buildArticlePrompt({
      ...input,
      extractHint: input.jaWikiSourceOverride?.extract_hint ?? undefined,
    });
    const promptPath = `${PROMPTS_DIR}/${slug}.txt`;
    writeFileSync(promptPath, prompt, 'utf8');
    manifest.push(buildManifestEntry(t, { promptPath, hasCombined }));
  }
  writeFileSync(`${PROMPTS_DIR}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`prepared ${targets.length} targets`);
  console.log(`  with combined source: ${manifest.filter(m => m.hasCombined).length}`);
  console.log(`  missing combined source: ${manifest.filter(m => !m.hasCombined).length}`);
  console.log(`manifest: ${PROMPTS_DIR}/manifest.json`);
}

function validate() {
  const manifest = JSON.parse(readFileSync(`${PROMPTS_DIR}/manifest.json`, 'utf8'));
  const report = [];
  for (const m of manifest) {
    if (!existsSync(m.outputPath)) {
      report.push({ slug: m.slug, status: 'missing', errors: [], warnings: [] });
      continue;
    }
    const article = JSON.parse(readFileSync(m.outputPath, 'utf8'));

    const combinedPath = `${COMBINED_DIR}/${m.slug}.json`;
    const combined = existsSync(combinedPath)
      ? JSON.parse(readFileSync(combinedPath, 'utf8'))
      : null;

    const { errors, warnings } = validateArticle(article, {
      safety: m.safety,
      combined,
      targetScientificName: m.scientificName,
    });
    report.push({
      slug: m.slug,
      japaneseName: m.japaneseName,
      status: errors.length === 0 ? 'pass' : 'needs_regeneration',
      errors,
      warnings,
      outputBytes: statSync(m.outputPath).size,
    });
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  const pass = report.filter(r => r.status === 'pass').length;
  const missing = report.filter(r => r.status === 'missing').length;
  const ng = report.filter(r => r.status === 'needs_regeneration').length;
  console.log(`validated: ${pass} pass / ${ng} needs_regeneration / ${missing} missing`);
  console.log(`report: ${REPORT_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const specPaths = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec' && args[i + 1]) {
      specPaths.push(args[i + 1]);
      i++;
    }
  }
  if (args.includes('--prepare')) {
    prepare(specPaths);
  } else if (args.includes('--validate')) {
    validate();
  } else {
    console.error('Usage: --prepare [--spec <path> ...]  |  --validate');
    process.exit(1);
  }
}
