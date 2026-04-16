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

import { classifySpecies } from './normalize-tier1-names.mjs';

test('classifySpecies returns KEEP when daikinrin matches species name', () => {
  const sp = { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', genus: 'Trametes' };
  const index = {
    byScientific: new Map([['trametes versicolor', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 123 }]]),
    byJapanese: new Map([['アイカワラタケ', { scientificName: 'Trametes versicolor', japaneseName: 'アイカワラタケ', mycoBankId: 123 }]]),
  };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'KEEP');
  assert.strictEqual(r.daikinrinHit, true);
  assert.strictEqual(r.daikinrinTitle, 'アイカワラタケ');
});

test('classifySpecies returns RENAME_TO when daikinrin title differs', () => {
  const sp = { scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', genus: 'Boletus' };
  const index = {
    byScientific: new Map([['boletus sensibilis', { scientificName: 'Boletus sensibilis', japaneseName: 'ミヤマイロガワリ', mycoBankId: 456 }]]),
    byJapanese: new Map(),
  };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'RENAME_TO');
  assert.strictEqual(r.daikinrinTitle, 'ミヤマイロガワリ');
});

test('classifySpecies returns EXCLUDE_NOT_MUSHROOM for Aspergillus', () => {
  const sp = { scientificName: 'Aspergillus niger', japaneseName: 'クロカビ', genus: 'Aspergillus' };
  const index = { byScientific: new Map(), byJapanese: new Map() };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'EXCLUDE_NOT_MUSHROOM');
  assert.strictEqual(r.daikinrinHit, false);
  assert.strictEqual(r.excludeReason, '子実体を形成しないカビ・酵母属 (Aspergillus)');
});

test('classifySpecies returns NEEDS_REVIEW when no daikinrin and not non-fungi', () => {
  const sp = { scientificName: 'Weird species', japaneseName: 'フシギタケ', genus: 'Weird' };
  const index = { byScientific: new Map(), byJapanese: new Map() };
  const r = classifySpecies(sp, index);
  assert.strictEqual(r.suggestion, 'NEEDS_REVIEW');
  assert.strictEqual(r.daikinrinHit, false);
});
