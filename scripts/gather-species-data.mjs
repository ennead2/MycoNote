/**
 * 図鑑データ収集・検証スクリプト
 *
 * 3ソース (iNaturalist / Wikipedia / kinoco-zukan.net) から情報を収集し、
 * 種ごとにJSONファイルとして保存する。
 *
 * Usage:
 *   node scripts/gather-species-data.mjs              # 全種処理 (未処理分から再開)
 *   node scripts/gather-species-data.mjs --reset      # 進捗リセットして最初から
 *   node scripts/gather-species-data.mjs --only=matsutake,shiitake  # 特定種のみ
 *   node scripts/gather-species-data.mjs --dry-run    # API呼び出しなし (テスト用)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const RAW_DIR = join(ROOT, 'scripts/temp/species-raw');
const PROGRESS_FILE = join(ROOT, 'scripts/temp/verification-progress.json');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const RESET = ARGS.includes('--reset');
const ONLY = ARGS.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Progress tracking ────────────────────────────────

function loadProgress() {
  if (RESET || !existsSync(PROGRESS_FILE)) {
    return { phase: 'gathering', species: {} };
  }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
}

function saveProgress(progress) {
  progress.last_updated = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2) + '\n');
}

// ─── HTTP helpers ──────────────────────────────────────

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MycoNote/1.0 (https://github.com/ennead2/MycoNote)' },
      });
      if (res.ok) return await res.json();
      if (res.status === 429) {
        console.log(`    429 rate limited, waiting ${(i + 1) * 5}s...`);
        await sleep((i + 1) * 5000);
        continue;
      }
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000);
    }
  }
  return null;
}

async function fetchText(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MycoNote/1.0 (https://github.com/ennead2/MycoNote)' },
      });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      if (res.status === 429) {
        await sleep((i + 1) * 5000);
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000);
    }
  }
  return null;
}

// ─── Source 1: iNaturalist Taxa API ────────────────────

async function fetchINaturalist(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=5`;
  const data = await fetchJSON(url);
  if (!data || !data.results || data.results.length === 0) {
    return { found: false, query: scientificName };
  }

  // Find exact match or closest match
  const exact = data.results.find(t =>
    t.name.toLowerCase() === scientificName.toLowerCase()
  );
  const taxon = exact || data.results[0];

  // Fetch full taxon details (includes ancestors with names)
  await sleep(1000);
  const detailUrl = `https://api.inaturalist.org/v1/taxa/${taxon.id}`;
  const detail = await fetchJSON(detailUrl);
  const fullTaxon = detail?.results?.[0] || taxon;

  // Extract taxonomy from ancestors
  const taxonomy = {};
  if (fullTaxon.ancestors) {
    for (const a of fullTaxon.ancestors) {
      if (a.rank === 'order') taxonomy.order = a.name;
      if (a.rank === 'family') taxonomy.family = a.name;
      if (a.rank === 'genus') taxonomy.genus = a.name;
    }
  }

  // Name mismatch detection
  const nameMatch = taxon.name.toLowerCase() === scientificName.toLowerCase();

  return {
    found: true,
    taxon_id: taxon.id,
    name: taxon.name,
    preferred_common_name: taxon.preferred_common_name,
    rank: taxon.rank,
    observations_count: taxon.observations_count,
    is_active: taxon.is_active,
    wikipedia_url: taxon.wikipedia_url,
    taxonomy,
    exact_match: nameMatch,
    suggested_name: nameMatch ? null : taxon.name,
    query: scientificName,
  };
}

// ─── Source 2: Wikipedia ja ────────────────────────────

async function fetchWikipediaJa(jaName) {
  const params = new URLSearchParams({
    action: 'query',
    titles: jaName,
    prop: 'extracts|revisions',
    exintro: '0',
    explaintext: '1',
    exlimit: '1',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
    format: 'json',
    origin: '*',
  });

  const url = `https://ja.wikipedia.org/w/api.php?${params}`;
  const data = await fetchJSON(url);
  if (!data?.query?.pages) return { found: false, query: jaName };

  const page = Object.values(data.query.pages)[0];
  if (page.missing !== undefined) return { found: false, query: jaName };

  const extract = page.extract || '';
  const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';

  // Try to extract scientific name from wikitext
  // Common patterns: {{生物分類表 | ... | 学名 = Xxx yyy | ...}}
  let scientificName = null;
  const sciMatch = wikitext.match(/学名\s*[=＝]\s*['']?([A-Z][a-z]+\s+[a-z]+)/);
  if (sciMatch) scientificName = sciMatch[1];

  // Try to extract family/order from classification table
  let family = null;
  let order = null;
  const familyMatch = wikitext.match(/科\s*[=＝]\s*\[\[([^\]|]+)/);
  if (familyMatch) family = familyMatch[1];
  const orderMatch = wikitext.match(/目\s*[=＝]\s*\[\[([^\]|]+)/);
  if (orderMatch) order = orderMatch[1];

  return {
    found: true,
    title: page.title,
    extract: extract.slice(0, 2000), // Limit size
    scientific_name_from_article: scientificName,
    family_from_article: family,
    order_from_article: order,
    page_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(jaName)}`,
    query: jaName,
  };
}

// ─── Source 3: kinoco-zukan.net ────────────────────────

async function fetchKinocoZukan(id, jaName) {
  // Try common URL patterns
  const urls = [
    `https://kinoco-zukan.net/${id.replace(/-/g, '')}.php`,
    `https://kinoco-zukan.net/${id}.php`,
  ];

  for (const url of urls) {
    const html = await fetchText(url);
    if (!html || html.includes('404') || html.includes('見つかりません')) continue;

    // Extract scientific name
    let scientificName = null;
    const sciMatch = html.match(/学名[：:]\s*(?:<[^>]+>)*\s*([A-Z][a-z]+\s+[a-z]+(?:\s+[a-z]+)?)/);
    if (sciMatch) scientificName = sciMatch[1];

    // Extract family name
    let family = null;
    const famMatch = html.match(/([ァ-ヴー]+科)/);
    if (famMatch) family = famMatch[1];

    // Extract description/features text
    let features = null;
    const featMatch = html.match(/特徴[^<]*<[^>]*>([\s\S]*?)<\/(?:p|div)/);
    if (featMatch) features = featMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 1000);

    return {
      found: true,
      url,
      scientific_name: scientificName,
      family,
      features,
      query: id,
    };
  }

  return { found: false, query: id };
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const progress = loadProgress();
  const targets = ONLY
    ? mushrooms.filter(m => ONLY.includes(m.id))
    : mushrooms;

  // Count pending
  const pending = targets.filter(m => {
    const s = progress.species[m.id];
    return !s || s.status === 'pending';
  });

  console.log(`\n=== 図鑑データ収集 ===`);
  console.log(`対象: ${targets.length}種 (未処理: ${pending.length}種)${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  let processed = 0;
  const issues = [];

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;

    // Skip already gathered
    const status = progress.species[m.id]?.status;
    if (status && status !== 'pending' && !ONLY) {
      continue;
    }

    console.log(`${prefix} ${m.names.ja} (${m.names.scientific}) [${m.id}]`);

    if (DRY_RUN) {
      progress.species[m.id] = { status: 'gathered', timestamp: new Date().toISOString() };
      continue;
    }

    const rawData = {
      id: m.id,
      names: m.names,
      toxicity: m.toxicity,
      current_data: {
        description: m.description,
        features: m.features,
        caution: m.caution,
      },
    };

    try {
      // ── Source 1: iNaturalist ──
      console.log(`  [1/3] iNaturalist...`);
      rawData.inaturalist = await fetchINaturalist(m.names.scientific);
      if (rawData.inaturalist.found) {
        const t = rawData.inaturalist;
        const family = t.taxonomy.family || '?';
        if (t.exact_match) {
          console.log(`    ✓ 学名一致: ${t.name} — ${t.observations_count} obs — ${family}科`);
        } else {
          console.log(`    ⚠ 学名不一致: 検索="${m.names.scientific}" → 候補="${t.name}" — ${family}科`);
          issues.push({ id: m.id, name: m.names.ja, issue: `iNaturalist学名不一致: DB="${m.names.scientific}" → 候補="${t.name}"` });
        }
      } else {
        console.log(`    ✗ NOT FOUND — 架空種の疑い`);
        issues.push({ id: m.id, name: m.names.ja, issue: `iNaturalist: 学名"${m.names.scientific}"が見つからない — 架空種の疑い` });
      }
      await sleep(1500);

      // ── Source 2: Wikipedia ja ──
      console.log(`  [2/3] Wikipedia ja...`);
      rawData.wikipedia = await fetchWikipediaJa(m.names.ja);
      if (rawData.wikipedia.found) {
        const w = rawData.wikipedia;
        const wikiSci = w.scientific_name_from_article;
        if (wikiSci && wikiSci.toLowerCase() !== m.names.scientific.toLowerCase()) {
          console.log(`    ⚠ 学名不一致: DB="${m.names.scientific}" Wiki="${wikiSci}"`);
          issues.push({ id: m.id, name: m.names.ja, issue: `学名不一致: DB="${m.names.scientific}" vs Wiki="${wikiSci}"` });
        } else if (wikiSci) {
          console.log(`    ✓ 学名一致: ${wikiSci}`);
        } else {
          console.log(`    ✓ 記事あり (学名抽出不可)`);
        }
      } else {
        console.log(`    - 記事なし`);
      }
      await sleep(1500);

      // ── Source 3: kinoco-zukan.net ──
      console.log(`  [3/3] kinoco-zukan.net...`);
      rawData.kinoco_zukan = await fetchKinocoZukan(m.id, m.names.ja);
      if (rawData.kinoco_zukan.found) {
        const k = rawData.kinoco_zukan;
        if (k.scientific_name && k.scientific_name.toLowerCase() !== m.names.scientific.toLowerCase()) {
          console.log(`    ⚠ 学名不一致: DB="${m.names.scientific}" kinoco="${k.scientific_name}"`);
          issues.push({ id: m.id, name: m.names.ja, issue: `学名不一致: DB="${m.names.scientific}" vs kinoco="${k.scientific_name}"` });
        } else if (k.scientific_name) {
          console.log(`    ✓ 学名一致: ${k.scientific_name}`);
        } else {
          console.log(`    ✓ ページあり (学名抽出不可)`);
        }
      } else {
        console.log(`    - ページなし`);
      }
      await sleep(3000);

      // ── Save raw data ──
      writeFileSync(
        join(RAW_DIR, `${m.id}.json`),
        JSON.stringify(rawData, null, 2) + '\n'
      );

      // ── Detect cross-source issues ──
      const inatFound = rawData.inaturalist.found;
      const wikiFound = rawData.wikipedia.found;
      if (!inatFound && !wikiFound) {
        issues.push({ id: m.id, name: m.names.ja, issue: 'iNaturalist・Wikipedia共に情報なし — ハルシネーションの疑い' });
      }

      progress.species[m.id] = { status: 'gathered', timestamp: new Date().toISOString() };
      saveProgress(progress);
      processed++;

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      issues.push({ id: m.id, name: m.names.ja, issue: `Error: ${err.message}` });
      progress.species[m.id] = { status: 'error', error: err.message, timestamp: new Date().toISOString() };
      saveProgress(progress);
      await sleep(3000);
    }
  }

  // ── Summary ──
  console.log(`\n=== 収集完了 ===`);
  console.log(`処理: ${processed}種`);
  console.log(`問題検出: ${issues.length}件`);

  if (issues.length > 0) {
    console.log('\n問題一覧:');
    for (const iss of issues) {
      console.log(`  - ${iss.name} (${iss.id}): ${iss.issue}`);
    }

    // Save issues to markdown
    const issuesMd = [
      '# 検証で検出された問題\n',
      `> 自動生成: ${new Date().toISOString()}\n`,
      '| # | id | 和名 | 問題内容 | status | 対応 |',
      '|---|-----|------|----------|--------|------|',
      ...issues.map((iss, i) =>
        `| ${i + 1} | ${iss.id} | ${iss.name} | ${iss.issue} | `+'`open`'+` | |`
      ),
      '',
    ].join('\n');
    writeFileSync(join(ROOT, 'docs/verification-issues.md'), issuesMd);
    console.log('\n問題リストを docs/verification-issues.md に保存しました');
  }

  // Progress summary
  const statuses = Object.values(progress.species).reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  console.log('\n進捗:');
  for (const [k, v] of Object.entries(statuses)) {
    console.log(`  ${k}: ${v}`);
  }
}

main().catch(console.error);
