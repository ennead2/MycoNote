import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NON_FUNGI_GENERA, isNonFungusGenus } from './non-fungi-genera.mjs';

test('NON_FUNGI_GENERA is a frozen array of strings', () => {
  assert.ok(Array.isArray(NON_FUNGI_GENERA));
  assert.ok(Object.isFrozen(NON_FUNGI_GENERA));
  for (const g of NON_FUNGI_GENERA) {
    assert.strictEqual(typeof g, 'string');
    assert.match(g, /^[A-Z][a-z]+$/);
  }
});

test('isNonFungusGenus detects Aspergillus case-insensitively', () => {
  assert.strictEqual(isNonFungusGenus('Aspergillus'), true);
  assert.strictEqual(isNonFungusGenus('aspergillus'), true);
});

test('isNonFungusGenus returns false for mushroom genus', () => {
  assert.strictEqual(isNonFungusGenus('Amanita'), false);
  assert.strictEqual(isNonFungusGenus('Lactifluus'), false);
});

test('isNonFungusGenus handles nullish input', () => {
  assert.strictEqual(isNonFungusGenus(null), false);
  assert.strictEqual(isNonFungusGenus(undefined), false);
  assert.strictEqual(isNonFungusGenus(''), false);
});
