/**
 * レビュー結果を図鑑データに反映
 *
 * scripts/temp/review-progress.json の判定を元に:
 *   - delete        → mushrooms.json から削除、docs/removed-species.md に記録
 *   - replace_image → docs/image-review.md に追記（画像差替の手がかり用）
 *   - concern       → docs/review-concerns.md に追記（修正内容の個別対応用）
 *   - ok / hold     → 何もしない（ok はレビュー完了のマーク）
 *
 * similar_species の参照も削除種を指していたら除去する。
 *
 * Usage:
 *   node scripts/apply-review-decisions.mjs --dry-run
 *   node scripts/apply-review-decisions.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const PROGRESS = join(ROOT, 'scripts/temp/review-progress.json');
const REMOVED_DOC = join(ROOT, 'docs/removed-species.md');
const IMAGE_REVIEW_DOC = join(ROOT, 'docs/image-review.md');
const CONCERN_DOC = join(ROOT, 'docs/review-concerns.md');

const DRY_RUN = process.argv.includes('--dry-run');

function loadJSON(p, fb) { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fb; }

function main() {
  const mushrooms = loadJSON(MUSHROOMS_JSON, []);
  const progress = loadJSON(PROGRESS, { decisions: {} });
  const decisions = progress.decisions;

  const buckets = { ok: [], replace_image: [], concern: [], delete: [], hold: [] };
  for (const m of mushrooms) {
    const d = decisions[m.id];
    if (!d) continue;
    buckets[d.status]?.push({ m, d });
  }

  const deleteIds = new Set(buckets.delete.map(x => x.m.id));

  // ── 削除: mushrooms.json から弾く + similar_species からも除去 ──
  let removed = [];
  let similarCleaned = 0;
  if (deleteIds.size > 0) {
    removed = buckets.delete.map(x => ({
      id: x.m.id,
      ja: x.m.names.ja,
      scientific: x.m.names.scientific,
      note: x.d.note,
      at: x.d.at,
    }));
    const newList = mushrooms
      .filter(m => !deleteIds.has(m.id))
      .map(m => {
        if (m.similar_species?.some(id => deleteIds.has(id))) {
          similarCleaned++;
          return { ...m, similar_species: m.similar_species.filter(id => !deleteIds.has(id)) };
        }
        return m;
      });

    if (!DRY_RUN) {
      writeFileSync(MUSHROOMS_JSON, JSON.stringify(newList, null, 2) + '\n');
    }
  }

  // ── 削除ドキュメント ──
  const removedLines = [];
  removedLines.push('# Phase 12-F 削除種リスト');
  removedLines.push('');
  removedLines.push(`> 生成: ${new Date().toISOString()}`);
  removedLines.push(`> 削除件数: ${removed.length}`);
  removedLines.push('');
  removedLines.push('| id | 和名 | 学名 | 理由 | 削除時刻 |');
  removedLines.push('|---|---|---|---|---|');
  for (const r of removed) {
    removedLines.push(`| \`${r.id}\` | ${r.ja} | \`${r.scientific}\` | ${r.note || '-'} | ${r.at} |`);
  }
  if (!DRY_RUN) writeFileSync(REMOVED_DOC, removedLines.join('\n') + '\n');

  // ── 画像差替ドキュメント ──
  const imageLines = [];
  imageLines.push('# Phase 12-F 画像差替対象');
  imageLines.push('');
  imageLines.push(`> 生成: ${new Date().toISOString()}`);
  imageLines.push(`> 差替対象: ${buckets.replace_image.length} 件`);
  imageLines.push('');
  imageLines.push('| id | 和名 | 学名 | メモ |');
  imageLines.push('|---|---|---|---|');
  for (const { m, d } of buckets.replace_image) {
    imageLines.push(`| \`${m.id}\` | ${m.names.ja} | \`${m.names.scientific}\` | ${d.note || '-'} |`);
  }
  if (!DRY_RUN) writeFileSync(IMAGE_REVIEW_DOC, imageLines.join('\n') + '\n');

  // ── 要修正ドキュメント ──
  const concernLines = [];
  concernLines.push('# Phase 12-F 要修正リスト');
  concernLines.push('');
  concernLines.push(`> 生成: ${new Date().toISOString()}`);
  concernLines.push(`> 対象: ${buckets.concern.length} 件`);
  concernLines.push('');
  concernLines.push('| id | 和名 | 学名 | 要修正内容 |');
  concernLines.push('|---|---|---|---|');
  for (const { m, d } of buckets.concern) {
    concernLines.push(`| \`${m.id}\` | ${m.names.ja} | \`${m.names.scientific}\` | ${d.note || '(未記入)'} |`);
  }
  if (!DRY_RUN) writeFileSync(CONCERN_DOC, concernLines.join('\n') + '\n');

  // ── サマリー ──
  console.log('=== Apply Review Decisions ===');
  console.log(`Mode:             ${DRY_RUN ? 'DRY-RUN' : 'APPLIED'}`);
  console.log(`Total decisions:  ${Object.keys(decisions).length}`);
  console.log(`  ok:             ${buckets.ok.length}`);
  console.log(`  replace_image:  ${buckets.replace_image.length}`);
  console.log(`  concern:        ${buckets.concern.length}`);
  console.log(`  delete:         ${buckets.delete.length}`);
  console.log(`  hold:           ${buckets.hold.length}`);
  console.log(`Similar cleaned:  ${similarCleaned}`);
  console.log();
  console.log(`Removed doc   → ${REMOVED_DOC}`);
  console.log(`Image doc     → ${IMAGE_REVIEW_DOC}`);
  console.log(`Concern doc   → ${CONCERN_DOC}`);
  if (!DRY_RUN && deleteIds.size > 0) {
    console.log(`Mushrooms     → ${MUSHROOMS_JSON} (-${deleteIds.size})`);
  }
}

main();
