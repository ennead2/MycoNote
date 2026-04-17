/**
 * Phase 14 S2: ラインナップ確定の純粋ロジック。
 * 対話 CLI は別ファイル (confirm_lineup_cli.mjs) で readline ベースに実装する。
 */

/**
 * intake gate: wikiJaExists AND (daikinrinHit OR inatHasPhotos)
 * @param {{signals: object, daikinrinHit: boolean}} sp
 * @returns {{pass: true} | {pass: false, reason: string}}
 */
export function computeIntakeGate(sp) {
  const wiki = sp.signals?.wikiJaExists === true;
  const dk = sp.daikinrinHit === true;
  const inat = sp.signals?.inatHasPhotos === true;
  if (!wiki) return { pass: false, reason: 'no-wikipedia-ja' };
  if (!dk && !inat) return { pass: false, reason: 'no-daikinrin-no-inat' };
  return { pass: true };
}

/**
 * 人間判定が必要かどうか。KEEP + gate pass のみ自動通過。
 * @param {{suggestion: string}} sp
 * @param {{pass: boolean}} gate
 * @returns {boolean}
 */
export function needsDecision(sp, gate) {
  if (!gate.pass) return true;
  if (sp.suggestion === 'KEEP') return false;
  return true;
}

/**
 * 判定結果を state に追記して新 state を返す（immutable）。
 * @param {{decisions: object}} state
 * @param {string} slug
 * @param {{action: 'include' | 'exclude' | 'defer' | 'rename', reason?: string, renameTo?: string}} decision
 * @returns {{decisions: object}}
 */
export function applyDecision(state, slug, decision) {
  return {
    ...state,
    decisions: {
      ...state.decisions,
      [slug]: decision,
    },
  };
}
