#!/usr/bin/env node
/**
 * Phase 17: 特定和名リストのみに対する合成 prompt + combined JSON 生成。
 * prepare_tier0_prompts と違い、tier や article_origin の制約を持たない。
 * tier に応じて prompt を切り替える。
 *
 * 使い方:
 *   node scripts/phase17/prepare_targeted_prompts.mjs --ja "シロオオハラタケ,ツクリタケ,..."
 *
 * 出力:
 *   - .cache/phase17/combined/<slug>.json
 *   - .cache/phase17/prompts/<slug>.txt
 *   - .cache/phase17/prompts/manifest.json (同名で上書き)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCache } from '../phase13/cache.mjs';
import { fetchWikipediaJa, fetchWikipediaEn } from '../phase13/wikipedia.mjs';
import { fetchMhlwEntry } from '../phase13/mhlw.mjs';
import { resolveSafety } from './resolve_safety.mjs';
import { buildPhase17Prompt } from './prompt_templates_v17.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const ARTICLE_MAP = join(ROOT, 'data/phase17/article-map.json');
const WIKI_AVAIL = join(ROOT, 'data/phase17/wikipedia-availability.json');
const COMBINED_DIR = join(ROOT, '.cache/phase17/combined');
const PROMPTS_DIR = join(ROOT, '.cache/phase17/prompts');
const MANIFEST_PATH = join(PROMPTS_DIR, 'manifest.json');

const daikinrinCache = createCache({ dir: join(ROOT, '.cache/phase13'), namespace: 'daikinrin' });

function parseArgs() {
  const args = process.argv.slice(2);
  const jaIndex = args.indexOf('--ja');
  return {
    jaNames: jaIndex >= 0 ? args[jaIndex + 1].split(',').map((s) => s.trim()) : null,
  };
}

function scientificNameToSlug(sci) {
  return sci.replace(/[^A-Za-z0-9]+/g, '_');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const { jaNames } = parseArgs();
  if (!jaNames || jaNames.length === 0) {
    console.error('Usage: --ja "<和名1>,<和名2>,..."');
    process.exit(1);
  }

  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const wikiAvail = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const wikiMap = new Map(wikiAvail.map((w) => [w.scientificName, w]));

  const targets = [];
  for (const ja of jaNames) {
    const entry = articleMap.find((e) => e.japaneseName === ja);
    if (!entry) {
      console.warn(`not found in article-map: ${ja}`);
      continue;
    }
    const wiki = wikiMap.get(entry.scientificName);
    targets.push({
      japaneseName: ja,
      scientificName: entry.scientificName,
      mycoBankId: entry.mycoBankId,
      tier: wiki?.tier ?? 2,
      wikipediaJaMatchedTitle: wiki?.wikipediaJa?.matchedTitle ?? null,
      wikipediaEnMatchedTitle: wiki?.wikipediaEn?.matchedTitle ?? null,
    });
  }
  console.log(`targets: ${targets.length} / ${jaNames.length}`);

  mkdirSync(COMBINED_DIR, { recursive: true });
  mkdirSync(PROMPTS_DIR, { recursive: true });

  const manifest = [];
  for (const t of targets) {
    const slug = scientificNameToSlug(t.scientificName);

    // 大菌輪 cache (override 等で mbId=null なら空 fallback)
    const dkKey = `${t.scientificName}_${t.mycoBankId}`;
    const daikinrin = t.mycoBankId ? await daikinrinCache.get(dkKey) : null;

    // Wikipedia JA 本文 (matchedTitle を使用、tier0 でなくても取れれば取る)
    let wikipediaJa = null;
    if (t.wikipediaJaMatchedTitle) {
      try {
        wikipediaJa = await fetchWikipediaJa({
          japaneseName: t.wikipediaJaMatchedTitle,
          scientificName: t.scientificName,
        });
      } catch (e) {
        console.warn(`  [wp ja err] ${t.scientificName}: ${e.message}`);
      }
    }

    // Wikipedia EN
    let wikipediaEn = null;
    if (t.wikipediaEnMatchedTitle) {
      try {
        wikipediaEn = await fetchWikipediaEn({ scientificName: t.scientificName });
      } catch (e) {
        console.warn(`  [wp en err] ${t.scientificName}: ${e.message}`);
      }
    }

    // mhlw
    const safetyResult = resolveSafety({
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      synonyms: daikinrin?.synonyms || [],
    });
    const isMhlw = safetyResult.confidence === 'mhlw';
    let mhlw = null;
    if (isMhlw) {
      try {
        mhlw = await fetchMhlwEntry(t.scientificName);
      } catch (e) {
        console.warn(`  [mhlw err] ${t.scientificName}: ${e.message}`);
      }
    }

    // combined JSON
    const combined = {
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      tier: t.tier,
      safety: safetyResult.safety,
      safetyConfidence: safetyResult.confidence,
      isMhlw,
      sources: {
        daikinrin: daikinrin
          ? {
              url: daikinrin.url,
              synonyms: daikinrin.synonyms,
              taxonomy: daikinrin.taxonomy,
              habitat: daikinrin.habitat,
              season: daikinrin.season,
              featuresRaw: daikinrin.featuresRaw,
              similarSuggestion: daikinrin.similarSuggestion,
              externalLinks: daikinrin.externalLinks,
              observations: daikinrin.observations,
            }
          : null,
        wikipediaJa: wikipediaJa
          ? { title: wikipediaJa.title, url: wikipediaJa.url, extract: wikipediaJa.extract }
          : null,
        wikipediaEn: wikipediaEn
          ? { title: wikipediaEn.title, url: wikipediaEn.url, extract: wikipediaEn.extract }
          : null,
        mhlw: mhlw ? { url: mhlw.url, text: mhlw.text } : null,
      },
    };
    writeFileSync(join(COMBINED_DIR, `${slug}.json`), JSON.stringify(combined, null, 2));

    // prompt (tier に応じて)
    const prompt = buildPhase17Prompt({
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      tier: t.tier,
      safety: safetyResult.safety,
      isMhlw,
      daikinrinSummary: combined.sources.daikinrin,
      combinedJsonPath: `.cache/phase17/combined/${slug}.json`,
      outputJsonPath: `.cache/phase17/generated/${slug}.json`,
    });
    writeFileSync(join(PROMPTS_DIR, `${slug}.txt`), prompt, 'utf-8');

    manifest.push({
      slug,
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      mycoBankId: t.mycoBankId,
      safety: safetyResult.safety,
      tier: t.tier,
      isMhlw,
      combinedPath: `.cache/phase17/combined/${slug}.json`,
      promptPath: `.cache/phase17/prompts/${slug}.txt`,
      outputPath: `.cache/phase17/generated/${slug}.json`,
      hasDaikinrin: !!daikinrin,
      hasWikipediaJa: !!wikipediaJa,
      hasWikipediaEn: !!wikipediaEn,
      hasMhlw: !!mhlw,
    });

    console.log(
      `[${manifest.length}/${targets.length}] ${t.japaneseName} tier=${t.tier} safety=${safetyResult.safety} ja=${!!wikipediaJa} en=${!!wikipediaEn}`,
    );
    await sleep(1000);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote manifest: ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
