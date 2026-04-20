#!/usr/bin/env node
/**
 * Phase 17 S8: 新 master JSON 作成時の「既存記事流用判定マップ」を構築する。
 *
 * 大菌輪 4204 エントリに対して、以下の優先順で流用可否を判定:
 *  1. 和名が旧 approved (src/data/mushrooms.json) に存在 → 'approved' 流用
 *  2. 学名が phase16 generated/articles/ の現存 article に一致 かつ
 *     phase16 tier2-diff の removed 配列に含まれない → 'phase16' 流用
 *  3. 上記どちらも該当しない → 'new' (新規合成待ち)
 *
 * user 確定方針:
 *  - 対応 key は和名 (approved 層)、phase16 層は学名一致で構わない
 *    (大菌輪 A 方式では和名と学名が 1:1 なので等価)
 *  - phase16 の removed (tier2-diff) 全件を「流用不可」とする (category A/B/E の
 *    細分化は流用可否判定に影響しない: B = approved 層に吸収される、A/E は新規合成)
 *  - 旧 mushrooms.json / generated/articles は不可侵 (参照のみ)
 *
 * 入力:
 *  - .cache/phase13/daikinrin-pages.json (4204 件)
 *  - src/data/mushrooms.json (旧 approved 113)
 *  - ../hopeful-brattain-19fc23/generated/articles/*.json (phase16 article ファイル名)
 *  - data/phase17/phase16-artifacts/tier2-diff.json
 *
 * 出力:
 *  - data/phase17/article-map.json
 *  - data/phase17/article-map-stats.json (統計)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaikinrinPagesIndex } from '../phase13/daikinrin-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const PHASE16_ARTICLES_DIR = join(ROOT, '../hopeful-brattain-19fc23/generated/articles');
const TIER2_DIFF = join(ROOT, 'data/phase17/phase16-artifacts/tier2-diff.json');
const JA_OVERRIDES = join(ROOT, 'data/phase17/ja-name-overrides.json');
const OUTPUT_MAP = join(ROOT, 'data/phase17/article-map.json');
const OUTPUT_STATS = join(ROOT, 'data/phase17/article-map-stats.json');

async function main() {
  mkdirSync(dirname(OUTPUT_MAP), { recursive: true });

  const entries = await fetchDaikinrinPagesIndex();
  const daikinrinWithJa = entries.filter((e) => e.japaneseName);
  console.log(`大菌輪 ja-named entries: ${daikinrinWithJa.length}`);

  // 手動 override: 大菌輪に和名がないが図鑑に残したい種
  const overrides = JSON.parse(readFileSync(JA_OVERRIDES, 'utf-8'));
  console.log(`手動 override エントリ: ${overrides.length}`);

  // 統合リスト: 大菌輪 primary + override 追加分
  const withJa = [
    ...daikinrinWithJa,
    ...overrides.map((o) => ({
      scientificName: o.scientificName,
      japaneseName: o.japaneseName,
      mycoBankId: o.mycoBankId,
      _isOverride: true,
      _overrideNote: o.note,
    })),
  ];
  console.log(`統合後 ja-named entries (大菌輪 + override): ${withJa.length}`);

  // 1. 旧 approved: 和名 → mushroom データ
  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf-8'));
  const approvedByJa = new Map();
  for (const m of mushrooms) {
    const ja = m.names?.ja;
    if (ja) approvedByJa.set(ja, m);
  }
  console.log(`旧 approved (mushrooms.json): ${approvedByJa.size} ja names`);

  // 2. phase16 article ファイル一覧 (学名 slug ベース)
  // _tier2_removed_backup や approved subdir は参照しない
  const phase16Files = readdirSync(PHASE16_ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.json'))
    .map((d) => d.name);
  const phase16ScisSet = new Set(
    phase16Files.map((f) => f.replace(/\.json$/, '').replace(/_/g, ' ')),
  );
  console.log(`phase16 generated/articles (.json files): ${phase16Files.length}`);

  // 3. phase16 removed の学名
  const tier2Diff = JSON.parse(readFileSync(TIER2_DIFF, 'utf-8'));
  const removedScisSet = new Set((tier2Diff.removed || []).map((r) => r.scientificName));
  console.log(`phase16 tier2-diff removed: ${removedScisSet.size} species`);

  // 判定
  const map = [];
  const stats = {
    total: withJa.length,
    daikinrin_source: daikinrinWithJa.length,
    override_source: overrides.length,
    approved: 0,
    phase16: 0,
    new: 0,
    override_approved: 0,
    override_new: 0,
    phase16_removed_ignored: 0,
    notes: [],
  };

  for (const e of withJa) {
    const ja = e.japaneseName;
    const sci = e.scientificName;

    // 1. approved 流用
    if (approvedByJa.has(ja)) {
      map.push({
        japaneseName: ja,
        scientificName: sci,
        mycoBankId: e.mycoBankId,
        source: e._isOverride ? 'override' : 'daikinrin',
        article_origin: 'approved',
        article_ref: {
          file: 'src/data/mushrooms.json',
          id: approvedByJa.get(ja).id,
        },
        notes: e._overrideNote || null,
      });
      stats.approved++;
      if (e._isOverride) stats.override_approved++;
      continue;
    }

    // 2. phase16 流用 (学名一致 + removed でない)
    if (phase16ScisSet.has(sci)) {
      if (removedScisSet.has(sci)) {
        map.push({
          japaneseName: ja,
          scientificName: sci,
          mycoBankId: e.mycoBankId,
          source: e._isOverride ? 'override' : 'daikinrin',
          article_origin: 'new',
          article_ref: null,
          notes: 'phase16 article exists but flagged as removed in tier2-diff',
        });
        stats.new++;
        stats.phase16_removed_ignored++;
        if (e._isOverride) stats.override_new++;
        continue;
      }
      map.push({
        japaneseName: ja,
        scientificName: sci,
        mycoBankId: e.mycoBankId,
        source: e._isOverride ? 'override' : 'daikinrin',
        article_origin: 'phase16',
        article_ref: {
          file: `generated/articles/${sci.replace(/ /g, '_')}.json`,
          worktree: 'hopeful-brattain-19fc23',
        },
        notes: e._overrideNote || null,
      });
      stats.phase16++;
      continue;
    }

    // 3. new
    map.push({
      japaneseName: ja,
      scientificName: sci,
      mycoBankId: e.mycoBankId,
      source: e._isOverride ? 'override' : 'daikinrin',
      article_origin: 'new',
      article_ref: null,
      notes: e._overrideNote || null,
    });
    stats.new++;
    if (e._isOverride) stats.override_new++;
  }

  writeFileSync(OUTPUT_MAP, JSON.stringify(map, null, 2));
  writeFileSync(OUTPUT_STATS, JSON.stringify(stats, null, 2));

  console.log('\n=== Article Map Stats ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nMap written to ${OUTPUT_MAP}`);
  console.log(`Stats written to ${OUTPUT_STATS}`);

  // 和名重複の警告 (既存 approved 内部重複、memory に言及ある: テングタケモドキ等)
  const jaCounts = new Map();
  for (const m of mushrooms) {
    const ja = m.names?.ja;
    if (ja) jaCounts.set(ja, (jaCounts.get(ja) || 0) + 1);
  }
  const approvedDupes = [...jaCounts.entries()].filter(([, c]) => c > 1);
  if (approvedDupes.length > 0) {
    console.log('\nWarning: 旧 approved 内で和名重複 (user memory 既知):');
    for (const [ja, c] of approvedDupes) console.log(`  ${ja}: ${c} entries`);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
