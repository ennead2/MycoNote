/**
 * 図鑑データ検証 v2: GBIF + 日本産菌類集覧
 *
 * Phase 12 版の軽量検証スクリプト。
 *   - Stage 0: GBIF Backbone (scripts/temp/gbif-results.json) を参照
 *   - Stage 1: 日本産菌類集覧 (data/jp-mycology-checklist.json) を参照
 *   - 自動クローズできる item は docs/verification-issues.md から除外し
 *     代わりに scripts/temp/species-corrections.json に訂正候補として出す。
 *
 * 前提: 事前に node scripts/gbif-resolve.mjs と
 *       node scripts/import-jp-mycology-checklist.mjs を実行済み。
 *
 * Usage:
 *   node scripts/verify-species-v2.mjs
 *   node scripts/verify-species-v2.mjs --only=koutake,chichitake
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalize, sciEquivalent } from './lib/species-match.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const GBIF_RESULTS = join(ROOT, 'scripts/temp/gbif-results.json');
const CHECKLIST_JSON = join(ROOT, 'data/jp-mycology-checklist.json');
const CORRECTIONS_OUT = join(ROOT, 'scripts/temp/species-corrections.json');
const ISSUES_OUT = join(ROOT, 'docs/verification-issues.md');

const ARGS = process.argv.slice(2);
const ONLY = ARGS.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',');

const AUTO_APPLY_THRESHOLD = 90;


function buildCheckList() {
  const list = JSON.parse(readFileSync(CHECKLIST_JSON, 'utf8'));
  const byJa = new Map();
  const bySci = new Map();
  for (const e of list) {
    if (e.ja) byJa.set(e.ja, e);
    if (e.scientific) {
      const key = normalize(e.scientific);
      if (!bySci.has(key)) bySci.set(key, []);
      bySci.get(key).push(e);
    }
  }
  return { byJa, bySci };
}

function classify(species, gbif, checklist) {
  const issues = [];
  const corrections = {};
  const ja = species.names.ja;
  const sci = species.names.scientific;

  // ── Stage 0: GBIF シノニム解決 ──
  if (!gbif || gbif.status === 'ERROR') {
    issues.push({ level: 'warn', msg: 'GBIF 結果なし（resolver 未実行 or エラー）' });
  } else if (gbif.autoApply && gbif.accepted && gbif.accepted !== gbif.input) {
    corrections.scientific_new = gbif.accepted;
    corrections.scientific_old = gbif.input;
    corrections.synonyms = gbif.synonyms || [];
    corrections.taxonomy = gbif.taxonomy || null;
    corrections.source = `GBIF ${gbif.status} ${gbif.matchType} c=${gbif.confidence}`;
  } else if (gbif.autoApply) {
    // 学名は正しい（ACCEPTED + EXACT）
    corrections.synonyms = gbif.synonyms || [];
    corrections.taxonomy = gbif.taxonomy || null;
  } else {
    // autoApply=false → 要レビュー
    if (gbif.status === 'NONE') {
      issues.push({ level: 'high', msg: `GBIF: "${sci}" が見つからない — 架空種の強い疑い` });
    } else if (gbif.matchType === 'HIGHERRANK') {
      issues.push({ level: 'mid', msg: `GBIF: 属レベルまでしか一致せず (accepted=${gbif.accepted}) — 種未登録または学名誤り` });
    } else if (gbif.matchType === 'FUZZY') {
      issues.push({ level: 'low', msg: `GBIF: typo 疑い — 近似種 "${gbif.accepted}" (c=${gbif.confidence})` });
      corrections.fuzzy_candidate = gbif.accepted;
    } else {
      issues.push({ level: 'mid', msg: `GBIF: ${gbif.status} ${gbif.matchType} c=${gbif.confidence} — 要確認` });
    }
  }

  // ── Stage 1: 日本産菌類集覧 ──
  const resolvedSci = corrections.scientific_new || sci;
  const byJaHit = checklist.byJa.get(ja);
  const bySciHits = checklist.bySci.get(normalize(resolvedSci));
  // 旧学名でも照合（DB 学名が旧名ならそちらで検索）
  const bySciHitsOld = checklist.bySci.get(normalize(sci));

  const sciMatchPool = [
    ...(bySciHits || []),
    ...(bySciHitsOld || []),
  ];

  if (byJaHit) {
    // 和名一致 — 学名の整合性チェック
    const matchAccepted = sciEquivalent(byJaHit.scientific, resolvedSci);
    const matchOld = sciEquivalent(byJaHit.scientific, sci);
    const matchSynonym = (gbif?.synonyms || []).some(s => sciEquivalent(s, byJaHit.scientific));
    if (matchAccepted || matchOld || matchSynonym) {
      corrections.checklist_status = 'match';
    } else {
      issues.push({
        level: 'mid',
        msg: `菌類集覧: 和名 "${ja}" に対応する学名が "${byJaHit.scientific}" — DB 学名 "${sci}" と不一致`,
      });
      corrections.checklist_status = 'ja_hit_sci_mismatch';
      corrections.checklist_scientific = byJaHit.scientific;
    }
  } else if (sciMatchPool.length > 0) {
    // 学名は一致するが和名が異なる → DB 和名が独自 or AI 誤り
    const alt = sciMatchPool[0];
    issues.push({
      level: 'high',
      msg: `菌類集覧: 学名 "${resolvedSci}" の正式和名は "${alt.ja}" — DB 和名 "${ja}" と不一致（AI 命名の疑い）`,
    });
    corrections.checklist_status = 'sci_hit_ja_mismatch';
    corrections.checklist_ja = alt.ja;
  } else {
    // 両方ミス
    issues.push({
      level: 'high',
      msg: `菌類集覧: 和名 "${ja}" も 学名 "${resolvedSci}" も未収録（2008年以降の新種、もしくはハルシネーションの可能性）`,
    });
    corrections.checklist_status = 'both_miss';
  }

  return { issues, corrections };
}

function main() {
  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const gbif = JSON.parse(readFileSync(GBIF_RESULTS, 'utf8'));
  const checklist = buildCheckList();

  const targets = ONLY
    ? mushrooms.filter(m => ONLY.includes(m.id))
    : mushrooms;

  const allCorrections = {};
  const allIssues = [];
  let autoCloseCount = 0;
  let hasIssueCount = 0;

  for (const m of targets) {
    const { issues, corrections } = classify(m, gbif[m.id], checklist);
    allCorrections[m.id] = {
      ja: m.names.ja,
      ...corrections,
      open_issues: issues,
    };
    if (issues.length === 0) {
      autoCloseCount++;
    } else {
      hasIssueCount++;
      for (const iss of issues) {
        allIssues.push({ id: m.id, ja: m.names.ja, sci: m.names.scientific, ...iss });
      }
    }
  }

  writeFileSync(CORRECTIONS_OUT, JSON.stringify(allCorrections, null, 2) + '\n');

  // verification-issues.md 再生成
  const byLevel = { high: [], mid: [], low: [], warn: [] };
  for (const iss of allIssues) byLevel[iss.level].push(iss);

  const lines = [];
  lines.push('# 検証で検出された問題 (v2: GBIF + 日本産菌類集覧)');
  lines.push('');
  lines.push(`> 自動生成: ${new Date().toISOString()}`);
  lines.push(`> Phase 12 検証: 対象 ${targets.length} 種 / 自動クローズ ${autoCloseCount} / 要レビュー ${hasIssueCount}`);
  lines.push('');
  for (const [level, label] of [['high','🔴 高 (架空種・和名誤りの強い疑い)'], ['mid','🟡 中 (HIGHERRANK / 学名不一致)'], ['low','🟢 低 (typo 候補)'], ['warn','⚪ 警告']]) {
    if (byLevel[level].length === 0) continue;
    lines.push(`## ${label} — ${byLevel[level].length} 件`);
    lines.push('');
    lines.push('| id | 和名 | 学名 | 問題内容 |');
    lines.push('|---|---|---|---|');
    for (const iss of byLevel[level]) {
      lines.push(`| ${iss.id} | ${iss.ja} | \`${iss.sci}\` | ${iss.msg.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }

  // 自動訂正サマリー
  const nameChanges = Object.entries(allCorrections).filter(([, c]) => c.scientific_new);
  lines.push(`## ✅ 自動学名訂正 (GBIF シノニム解決) — ${nameChanges.length} 件`);
  lines.push('');
  lines.push('これらは Phase 12 で自動的に新学名へ更新され、旧名は synonyms として保持されます。');
  lines.push('');
  lines.push('| id | 和名 | 旧学名 | → 新学名 | 出典 |');
  lines.push('|---|---|---|---|---|');
  for (const [id, c] of nameChanges) {
    lines.push(`| ${id} | ${c.ja} | \`${c.scientific_old}\` | \`${c.scientific_new}\` | ${c.source} |`);
  }
  lines.push('');

  writeFileSync(ISSUES_OUT, lines.join('\n'));

  console.log('=== Verification v2 Summary ===');
  console.log(`Target:         ${targets.length}`);
  console.log(`Auto-close:     ${autoCloseCount}`);
  console.log(`Needs review:   ${hasIssueCount}`);
  console.log(`  🔴 high:      ${byLevel.high.length}`);
  console.log(`  🟡 mid:       ${byLevel.mid.length}`);
  console.log(`  🟢 low:       ${byLevel.low.length}`);
  console.log(`  ⚪ warn:      ${byLevel.warn.length}`);
  console.log(`Name changes:   ${nameChanges.length}`);
  console.log();
  console.log(`Corrections →  ${CORRECTIONS_OUT}`);
  console.log(`Issues MD   →  ${ISSUES_OUT}`);
}

main();
