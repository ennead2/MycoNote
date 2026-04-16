import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanJapaneseNames } from './normalize-tier1-names.mjs';

test('cleanJapaneseNames removes entries with ※ annotation', () => {
  const input = ['アイカワラタケ', 'カワラタケ', 'クモ　※クモタケ', 'クロクモタケ'];
  assert.deepStrictEqual(cleanJapaneseNames(input), ['アイカワラタケ', 'カワラタケ', 'クロクモタケ']);
});

test('cleanJapaneseNames trims full-width and half-width whitespace', () => {
  assert.deepStrictEqual(
    cleanJapaneseNames(['　ハツタケ　', ' テングタケ ', 'タマゴタケ']),
    ['ハツタケ', 'テングタケ', 'タマゴタケ']
  );
});

test('cleanJapaneseNames removes empty and duplicate entries', () => {
  assert.deepStrictEqual(
    cleanJapaneseNames(['シイタケ', '', 'シイタケ', 'マイタケ']),
    ['シイタケ', 'マイタケ']
  );
});

test('cleanJapaneseNames returns empty array for nullish input', () => {
  assert.deepStrictEqual(cleanJapaneseNames(null), []);
  assert.deepStrictEqual(cleanJapaneseNames(undefined), []);
  assert.deepStrictEqual(cleanJapaneseNames([]), []);
});

test('cleanJapaneseNames removes internal whitespace (mushroom names have no internal spaces)', () => {
  // checklist 由来の変則エントリや注釈混入を想定
  assert.deepStrictEqual(
    cleanJapaneseNames(['タマゴ タケ', 'シイ　タケ']),
    ['タマゴタケ', 'シイタケ']
  );
});
