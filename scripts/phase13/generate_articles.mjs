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

export function normalizeSafety(toxicity) {
  if (toxicity === 'edible_caution') return 'caution';
  if (toxicity === 'deadly_toxic') return 'deadly';
  return toxicity;
}

export function tier0ToPromptInput(target) {
  const slug = scientificNameToSlug(target.scientificName);
  return {
    japaneseName: target.japaneseName,
    scientificName: target.scientificName,
    safety: normalizeSafety(target.toxicity),
    combinedJsonPath: `${COMBINED_DIR}/${slug}.json`,
    outputJsonPath: `${GENERATED_DIR}/${slug}.json`,
  };
}

function prepare() {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const targets = resolveTier0Targets(ranking);
  mkdirSync(PROMPTS_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const manifest = [];
  for (const t of targets) {
    const input = tier0ToPromptInput(t);
    const slug = scientificNameToSlug(t.scientificName);
    const hasCombined = existsSync(input.combinedJsonPath);
    const prompt = buildArticlePrompt(input);
    const promptPath = `${PROMPTS_DIR}/${slug}.txt`;
    writeFileSync(promptPath, prompt, 'utf8');
    manifest.push({
      slug,
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      safety: input.safety,
      hasCombined,
      promptPath,
      outputPath: input.outputJsonPath,
    });
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
    const { errors, warnings } = validateArticle(article, { safety: m.safety });
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
  const mode = process.argv[2];
  if (mode === '--prepare') prepare();
  else if (mode === '--validate') validate();
  else {
    console.error('Usage: node generate_articles.mjs [--prepare|--validate]');
    process.exit(1);
  }
}
