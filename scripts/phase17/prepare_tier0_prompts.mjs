#!/usr/bin/env node
/**
 * Phase 17 S11: tier0 × article_origin=new の対象について、
 *  - combined source JSON (大菌輪 + Wikipedia JA/EN + mhlw)
 *  - 合成プロンプト (buildPhase17Prompt)
 *  - manifest.json
 * を書き出す。
 *
 * 前提:
 *  - data/phase17/article-map.json (S8)
 *  - data/phase17/wikipedia-availability.json (S5) ← 完成済みである必要あり
 *  - .cache/phase13/daikinrin/<sci>_<mbId>.json (S4) ← 完成済みである必要あり
 *
 * 出力:
 *  - .cache/phase17/combined/<slug>.json
 *  - .cache/phase17/prompts/<slug>.txt
 *  - .cache/phase17/prompts/manifest.json
 *
 * 使い方:
 *   node scripts/phase17/prepare_tier0_prompts.mjs
 *   node scripts/phase17/prepare_tier0_prompts.mjs --limit 5
 *   node scripts/phase17/prepare_tier0_prompts.mjs --dry-run   # prompt 書かずに対象数のみ
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
  const i = args.indexOf('--limit');
  return {
    limit: i >= 0 ? parseInt(args[i + 1], 10) : Infinity,
    dryRun: args.includes('--dry-run'),
  };
}

function scientificNameToSlug(sci) {
  return sci.replace(/[^A-Za-z0-9]+/g, '_');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { limit, dryRun } = parseArgs();

  if (!existsSync(ARTICLE_MAP)) {
    console.error(`Missing ${ARTICLE_MAP}`);
    process.exit(1);
  }
  if (!existsSync(WIKI_AVAIL)) {
    console.error(`Missing ${WIKI_AVAIL}. Run fetch_all_wikipedia_availability.mjs to completion first.`);
    process.exit(1);
  }

  const articleMap = JSON.parse(readFileSync(ARTICLE_MAP, 'utf-8'));
  const wikiAvail = JSON.parse(readFileSync(WIKI_AVAIL, 'utf-8'));
  const wikiMap = new Map(wikiAvail.map((w) => [w.scientificName, w]));

  // tier0 & new を抽出
  const targets = [];
  for (const e of articleMap) {
    if (e.article_origin !== 'new') continue;
    const wiki = wikiMap.get(e.scientificName);
    if (!wiki || wiki.tier !== 0) continue;
    targets.push({
      japaneseName: e.japaneseName,
      scientificName: e.scientificName,
      mycoBankId: e.mycoBankId,
      wikipediaJaMatchedTitle: wiki.wikipediaJa?.matchedTitle ?? null,
      wikipediaEnMatchedTitle: wiki.wikipediaEn?.matchedTitle ?? null,
    });
  }
  console.log(`tier0 × new targets: ${targets.length}`);
  const effective = targets.slice(0, Math.min(targets.length, limit));
  console.log(`preparing ${effective.length} (limit=${limit === Infinity ? 'none' : limit})`);

  if (dryRun) {
    console.log('dry-run: first 10 targets:');
    for (const t of effective.slice(0, 10)) {
      console.log(`  ${t.japaneseName} / ${t.scientificName}`);
    }
    return;
  }

  mkdirSync(COMBINED_DIR, { recursive: true });
  mkdirSync(PROMPTS_DIR, { recursive: true });

  const manifest = [];
  const stats = { ok: 0, missingDaikinrin: 0, missingWikipediaJa: 0 };

  for (let i = 0; i < effective.length; i++) {
    const t = effective[i];
    const slug = scientificNameToSlug(t.scientificName);

    // 大菌輪 cache load
    const dkKey = `${t.scientificName}_${t.mycoBankId}`;
    const daikinrin = await daikinrinCache.get(dkKey);
    if (!daikinrin) {
      stats.missingDaikinrin++;
      console.warn(`  [skip] 大菌輪 cache 欠落: ${t.japaneseName} (${t.scientificName})`);
      continue;
    }

    // Wikipedia JA 本文 (tier0 は必須)
    const wpJaInput = t.wikipediaJaMatchedTitle === t.japaneseName
      ? { japaneseName: t.japaneseName, scientificName: t.scientificName }
      : { japaneseName: t.wikipediaJaMatchedTitle || t.japaneseName, scientificName: t.scientificName };
    let wikipediaJa = null;
    try {
      wikipediaJa = await fetchWikipediaJa(wpJaInput);
    } catch (e) {
      console.warn(`  [wp ja err] ${t.scientificName}: ${e.message}`);
    }
    if (!wikipediaJa) stats.missingWikipediaJa++;

    // Wikipedia EN (あれば)
    let wikipediaEn = null;
    if (t.wikipediaEnMatchedTitle) {
      try {
        wikipediaEn = await fetchWikipediaEn({ scientificName: t.scientificName });
      } catch (e) {
        console.warn(`  [wp en err] ${t.scientificName}: ${e.message}`);
      }
    }

    // mhlw (該当時)
    const safetyResult = resolveSafety({
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      synonyms: daikinrin.synonyms,
    });
    let mhlw = null;
    const isMhlw = safetyResult.confidence === 'mhlw';
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
      tier: 0,
      safety: safetyResult.safety,
      safetyConfidence: safetyResult.confidence,
      isMhlw,
      sources: {
        daikinrin: {
          url: daikinrin.url,
          synonyms: daikinrin.synonyms,
          taxonomy: daikinrin.taxonomy,
          habitat: daikinrin.habitat,
          season: daikinrin.season,
          featuresRaw: daikinrin.featuresRaw,
          similarSuggestion: daikinrin.similarSuggestion,
          externalLinks: daikinrin.externalLinks,
          observations: daikinrin.observations,
        },
        wikipediaJa: wikipediaJa
          ? {
              title: wikipediaJa.title,
              url: wikipediaJa.url,
              extract: wikipediaJa.extract,
            }
          : null,
        wikipediaEn: wikipediaEn
          ? {
              title: wikipediaEn.title,
              url: wikipediaEn.url,
              extract: wikipediaEn.extract,
            }
          : null,
        mhlw: mhlw
          ? {
              url: mhlw.url,
              text: mhlw.text,
            }
          : null,
      },
    };
    const combinedPath = join(COMBINED_DIR, `${slug}.json`);
    writeFileSync(combinedPath, JSON.stringify(combined, null, 2));

    // prompt
    const prompt = buildPhase17Prompt({
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      tier: 0,
      safety: safetyResult.safety,
      isMhlw,
      daikinrinSummary: combined.sources.daikinrin,
      combinedJsonPath: `.cache/phase17/combined/${slug}.json`,
      outputJsonPath: `.cache/phase17/generated/${slug}.json`,
    });
    const promptPath = join(PROMPTS_DIR, `${slug}.txt`);
    writeFileSync(promptPath, prompt, 'utf-8');

    manifest.push({
      slug,
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      mycoBankId: t.mycoBankId,
      safety: safetyResult.safety,
      tier: 0,
      isMhlw,
      combinedPath: `.cache/phase17/combined/${slug}.json`,
      promptPath: `.cache/phase17/prompts/${slug}.txt`,
      outputPath: `.cache/phase17/generated/${slug}.json`,
      hasWikipediaJa: !!wikipediaJa,
      hasWikipediaEn: !!wikipediaEn,
      hasMhlw: !!mhlw,
    });
    stats.ok++;

    // Wikipedia 本文 fetch を挟んだので rate を考慮して 1 秒 sleep
    await sleep(1000);

    if ((i + 1) % 20 === 0 || i + 1 === effective.length) {
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      console.log(`[${i + 1}/${effective.length}] ok=${stats.ok} missingDk=${stats.missingDaikinrin} missingWpJa=${stats.missingWikipediaJa}`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('\n=== Preparation Summary ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Prompts: ${PROMPTS_DIR}`);
  console.log(`Combined: ${COMBINED_DIR}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
