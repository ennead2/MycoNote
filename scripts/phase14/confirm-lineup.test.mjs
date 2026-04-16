import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeIntakeGate, applyDecision, needsDecision } from './confirm-lineup.mjs';

test('computeIntakeGate passes when wikiJaExists and daikinrinHit', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: false }, daikinrinHit: true };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: true });
});

test('computeIntakeGate passes when wikiJaExists and inatHasPhotos', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: true }, daikinrinHit: false };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: true });
});

test('computeIntakeGate fails when wikiJaExists is false', () => {
  const sp = { signals: { wikiJaExists: false, inatHasPhotos: true }, daikinrinHit: true };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: false, reason: 'no-wikipedia-ja' });
});

test('computeIntakeGate fails when neither daikinrin nor iNat', () => {
  const sp = { signals: { wikiJaExists: true, inatHasPhotos: false }, daikinrinHit: false };
  assert.deepStrictEqual(computeIntakeGate(sp), { pass: false, reason: 'no-daikinrin-no-inat' });
});

test('needsDecision returns true for NEEDS_REVIEW', () => {
  assert.strictEqual(needsDecision({ suggestion: 'NEEDS_REVIEW' }, { pass: true }), true);
});

test('needsDecision returns true for RENAME_TO', () => {
  assert.strictEqual(needsDecision({ suggestion: 'RENAME_TO' }, { pass: true }), true);
});

test('needsDecision returns true for gate fail', () => {
  assert.strictEqual(needsDecision({ suggestion: 'KEEP' }, { pass: false, reason: 'no-wikipedia-ja' }), true);
});

test('needsDecision returns false for KEEP + gate pass', () => {
  assert.strictEqual(needsDecision({ suggestion: 'KEEP' }, { pass: true }), false);
});

test('applyDecision records exclude with reason', () => {
  const state = { decisions: {} };
  const next = applyDecision(state, 'amanita_virosa', { action: 'exclude', reason: 'test reason' });
  assert.deepStrictEqual(next.decisions.amanita_virosa, { action: 'exclude', reason: 'test reason' });
});

test('applyDecision preserves other decisions (immutable)', () => {
  const state = { decisions: { a: { action: 'include' } } };
  const next = applyDecision(state, 'b', { action: 'defer', reason: 'too obscure' });
  assert.deepStrictEqual(next.decisions.a, { action: 'include' });
  assert.deepStrictEqual(next.decisions.b, { action: 'defer', reason: 'too obscure' });
  assert.notStrictEqual(next, state);
});
