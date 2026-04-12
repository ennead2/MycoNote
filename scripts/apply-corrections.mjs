/**
 * 自動訂正適用: species-corrections.json → src/data/mushrooms.json
 *
 * scripts/verify-species-v2.mjs が出力する species-corrections.json の
 * 学名自動訂正 (GBIF SYNONYM/ACCEPTED で autoApply=true + 名前変化あり) を
 * mushrooms.json に適用する。
 *
 * 変更内容:
 *   - names.scientific を新学名に更新
 *   - names.scientific_synonyms[] に旧学名 + GBIF 種ランクシノニム上位数件を追加
 *   - taxonomy を GBIF ソース値で埋める（既存値がない場合のみ）
 *
 * Usage:
 *   node scripts/apply-corrections.mjs --dry-run   # 変更プレビュー
 *   node scripts/apply-corrections.mjs             # 実適用
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_JSON = join(ROOT, 'src/data/mushrooms.json');
const CORRECTIONS = join(ROOT, 'scripts/temp/species-corrections.json');
const DIFF_OUT = join(ROOT, 'docs/corrections-applied.md');

const DRY_RUN = process.argv.includes('--dry-run');

const MAX_SYNONYMS = 3;

// ── 種ランクで現代的な (属+種小名 2語) シノニムのみ残す ──
function filterSynonyms(list, accepted, oldName) {
  if (!list || list.length === 0) return [];
  const seen = new Set([accepted.toLowerCase()]);
  const result = [];
  // 旧名は必ず先頭に含める
  if (oldName && oldName.toLowerCase() !== accepted.toLowerCase()) {
    result.push(oldName);
    seen.add(oldName.toLowerCase());
  }
  for (const s of list) {
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    const parts = s.trim().split(/\s+/);
    // 2 語 (属 + 種小名) のみ、3 語は variety/forma/subsp の可能性が高いので除外
    if (parts.length !== 2) continue;
    // 種小名が Capital 始まりは異常なので除外
    if (/^[A-Z]/.test(parts[1])) continue;
    result.push(s);
    seen.add(key);
    if (result.length >= MAX_SYNONYMS) break;
  }
  return result;
}

function main() {
  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_JSON, 'utf8'));
  const corrections = JSON.parse(readFileSync(CORRECTIONS, 'utf8'));

  const diffs = [];
  let sciChanged = 0;
  let synAdded = 0;
  let taxoFilled = 0;

  for (const m of mushrooms) {
    const c = corrections[m.id];
    if (!c) continue;

    const before = {
      scientific: m.names.scientific,
      synonyms: m.names.scientific_synonyms ? [...m.names.scientific_synonyms] : null,
      taxonomy: m.taxonomy ? { ...m.taxonomy } : null,
    };

    let touched = false;

    // 1. 学名訂正 (autoApply 済みの訂正のみ)
    if (c.scientific_new && c.scientific_old && c.scientific_new !== m.names.scientific) {
      m.names.scientific = c.scientific_new;
      sciChanged++;
      touched = true;
    }

    // 2. synonyms[] 反映 — 学名が変わった種のみ (旧名を検索対象に保持するため)
    if (c.scientific_new && c.scientific_old && c.synonyms && c.synonyms.length > 0) {
      const oldName = c.scientific_old;
      const filtered = filterSynonyms(c.synonyms, m.names.scientific, oldName);
      if (filtered.length > 0) {
        // 既存 synonyms と結合・重複排除
        const existing = m.names.scientific_synonyms || [];
        const merged = [...existing];
        for (const s of filtered) {
          if (!merged.some(x => x.toLowerCase() === s.toLowerCase())) {
            merged.push(s);
          }
        }
        if (JSON.stringify(merged) !== JSON.stringify(existing)) {
          m.names.scientific_synonyms = merged;
          synAdded++;
          touched = true;
        }
      }
    }

    // 3. taxonomy 補完 (既存に order/family/genus がなければ GBIF 値を入れる)
    if (c.taxonomy && c.taxonomy.order && c.taxonomy.family && c.taxonomy.genus) {
      if (!m.taxonomy || !m.taxonomy.order || !m.taxonomy.family || !m.taxonomy.genus) {
        m.taxonomy = {
          order: c.taxonomy.order,
          family: c.taxonomy.family,
          genus: c.taxonomy.genus,
        };
        taxoFilled++;
        touched = true;
      }
    }

    if (touched) {
      diffs.push({
        id: m.id,
        ja: m.names.ja,
        before,
        after: {
          scientific: m.names.scientific,
          synonyms: m.names.scientific_synonyms || null,
          taxonomy: m.taxonomy || null,
        },
      });
    }
  }

  // ── 出力 ──
  if (!DRY_RUN) {
    writeFileSync(MUSHROOMS_JSON, JSON.stringify(mushrooms, null, 2) + '\n');
  }

  // diff markdown
  const lines = [];
  lines.push('# Phase 12: 自動学名訂正 適用ログ');
  lines.push('');
  lines.push(`> 生成: ${new Date().toISOString()}`);
  lines.push(`> ${DRY_RUN ? '**DRY-RUN（未適用）**' : '適用済み'}`);
  lines.push('');
  lines.push(`- 学名変更: ${sciChanged} 件`);
  lines.push(`- synonyms 追加: ${synAdded} 件`);
  lines.push(`- taxonomy 補完: ${taxoFilled} 件`);
  lines.push(`- 合計 touched: ${diffs.length} 件`);
  lines.push('');
  lines.push('## 学名変更');
  lines.push('');
  lines.push('| id | 和名 | 旧学名 | → 新学名 | 旧名残存 synonyms |');
  lines.push('|---|---|---|---|---|');
  for (const d of diffs) {
    if (d.before.scientific !== d.after.scientific) {
      const syns = (d.after.synonyms || []).slice(0, 3).map(s => `\`${s}\``).join(', ');
      lines.push(`| ${d.id} | ${d.ja} | \`${d.before.scientific}\` | \`${d.after.scientific}\` | ${syns} |`);
    }
  }
  lines.push('');
  lines.push('## synonyms 追加のみ（学名変更なし）');
  lines.push('');
  lines.push('| id | 和名 | 学名 | synonyms (先頭3) |');
  lines.push('|---|---|---|---|');
  for (const d of diffs) {
    if (d.before.scientific === d.after.scientific && JSON.stringify(d.before.synonyms) !== JSON.stringify(d.after.synonyms)) {
      const syns = (d.after.synonyms || []).slice(0, 3).map(s => `\`${s}\``).join(', ');
      lines.push(`| ${d.id} | ${d.ja} | \`${d.after.scientific}\` | ${syns} |`);
    }
  }
  lines.push('');

  writeFileSync(DIFF_OUT, lines.join('\n'));

  console.log('=== Apply Corrections ===');
  console.log(`Mode:             ${DRY_RUN ? 'DRY-RUN' : 'APPLIED'}`);
  console.log(`Scientific fix:   ${sciChanged}`);
  console.log(`Synonyms added:   ${synAdded}`);
  console.log(`Taxonomy filled:  ${taxoFilled}`);
  console.log(`Total touched:    ${diffs.length}`);
  console.log();
  console.log(`Diff log → ${DIFF_OUT}`);
  if (!DRY_RUN) console.log(`Updated  → ${MUSHROOMS_JSON}`);
}

main();
