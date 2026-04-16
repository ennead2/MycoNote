/**
 * Phase 14 S2: ラインナップ確定 対話 CLI。
 * 入力:  data/phase14/tier1-names-normalized.json
 * 出力:  data/phase14/tier1-lineup-confirmed.json （1 件ごとに autosave）
 *
 * 対話操作:
 *   k = KEEP そのまま採用 (RENAME_TO でも現在の和名を採用)
 *   r = RENAME 大菌輪の正典和名に差し替え (RENAME_TO でのみ有効)
 *   e = EXCLUDE 除外 (理由入力必須)
 *   d = DEFER tier demote / 後回し (理由入力必須)
 *   ?   再表示
 *   q   中断 (再開可能)
 *
 * Usage:
 *   node scripts/phase14/confirm_lineup_cli.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { computeIntakeGate, needsDecision, applyDecision } from './confirm-lineup.mjs';

const IN_PATH = 'data/phase14/tier1-names-normalized.json';
const OUT_PATH = 'data/phase14/tier1-lineup-confirmed.json';

function slugOf(sp) {
  return sp.scientificName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function loadState() {
  if (existsSync(OUT_PATH)) {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  }
  return { generatedAt: new Date().toISOString(), decisions: {} };
}

function saveState(state) {
  mkdirSync('data/phase14', { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function formatSpecies(sp, gate) {
  return [
    `---`,
    `  scientific:  ${sp.scientificName}`,
    `  japanese:    ${sp.japaneseName}`,
    `  genus:       ${sp.genus}`,
    `  suggestion:  ${sp.suggestion}${sp.daikinrinTitle ? ` (大菌輪: ${sp.daikinrinTitle})` : ''}`,
    `  gate:        ${gate.pass ? 'PASS' : `FAIL (${gate.reason})`}`,
    `  signals:     wikiJa=${sp.signals.wikiJaExists} inat=${sp.signals.inatHasPhotos} daikinrin=${sp.daikinrinHit}`,
    `  synonyms:    ${sp.synonyms.slice(0, 3).join(', ')}${sp.synonyms.length > 3 ? ` ... (+${sp.synonyms.length - 3})` : ''}`,
  ].join('\n');
}

async function promptDecision(rl, sp, gate) {
  console.log(formatSpecies(sp, gate));
  const renameAllowed = sp.suggestion === 'RENAME_TO' && sp.daikinrinTitle;
  const hint = renameAllowed ? '[k/r/e/d/?/q]' : '[k/e/d/?/q]';
  const answer = (await rl.question(`decision ${hint}: `)).trim().toLowerCase();
  if (answer === 'k') return { action: 'include', usedName: sp.japaneseName };
  if (answer === 'r' && renameAllowed) return { action: 'rename', renameTo: sp.daikinrinTitle };
  if (answer === 'e') {
    const reason = (await rl.question('exclude reason: ')).trim();
    return { action: 'exclude', reason: reason || sp.excludeReason || '(no reason)' };
  }
  if (answer === 'd') {
    const reason = (await rl.question('defer reason: ')).trim();
    return { action: 'defer', reason: reason || '(no reason)' };
  }
  if (answer === '?') return null;
  if (answer === 'q') return 'QUIT';
  console.log(`unknown: "${answer}"`);
  return null;
}

async function main() {
  const { species } = JSON.parse(readFileSync(IN_PATH, 'utf8'));
  let state = loadState();
  const rl = createInterface({ input, output });

  const queue = species.filter((sp) => {
    const slug = slugOf(sp);
    if (state.decisions[slug]) return false;
    const gate = computeIntakeGate(sp);
    return needsDecision(sp, gate);
  });

  console.log(`pending decisions: ${queue.length} / ${species.length}`);
  console.log('commands: k=keep, r=rename, e=exclude, d=defer, ?=redisplay, q=quit\n');

  for (let i = 0; i < queue.length; i++) {
    const sp = queue[i];
    const gate = computeIntakeGate(sp);
    console.log(`\n[${i + 1}/${queue.length}]`);
    let decision = null;
    while (decision === null) {
      decision = await promptDecision(rl, sp, gate);
    }
    if (decision === 'QUIT') {
      console.log('quit (state saved, re-run to resume)');
      break;
    }
    state = applyDecision(state, slugOf(sp), decision);
    saveState(state);
  }

  // 自動通過 (KEEP + gate pass) も記録
  for (const sp of species) {
    const slug = slugOf(sp);
    if (state.decisions[slug]) continue;
    const gate = computeIntakeGate(sp);
    if (sp.suggestion === 'KEEP' && gate.pass) {
      state = applyDecision(state, slug, { action: 'include', usedName: sp.japaneseName, auto: true });
    }
  }
  saveState(state);

  rl.close();
  const counts = { include: 0, exclude: 0, defer: 0, rename: 0 };
  for (const d of Object.values(state.decisions)) counts[d.action]++;
  console.log(`\ndecisions: ${JSON.stringify(counts)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
