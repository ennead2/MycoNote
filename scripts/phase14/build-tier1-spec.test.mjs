import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTier1Spec } from './build-tier1-spec.mjs';

test('buildTier1Spec filters out excluded and deferred decisions', () => {
  const normalized = [
    { scientificName: 'Amanita virosa', japaneseName: 'ドクツルタケ', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'ACCEPTED', suggestion: 'KEEP' },
    { scientificName: 'Aspergillus niger', japaneseName: 'クロカビ', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'ACCEPTED', suggestion: 'EXCLUDE_NOT_MUSHROOM' },
    { scientificName: 'Foo bar', japaneseName: 'フー', synonyms: [], cleanedJapaneseNames: [], normalizationStatus: 'UNKNOWN', suggestion: 'NEEDS_REVIEW' },
  ];
  const confirmed = {
    decisions: {
      amanita_virosa: { action: 'include', usedName: 'ドクツルタケ' },
      aspergillus_niger: { action: 'exclude', reason: 'カビ類' },
      foo_bar: { action: 'defer', reason: 'obscure' },
    },
  };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species.length, 1);
  assert.strictEqual(spec.species[0].scientificName, 'Amanita virosa');
  assert.strictEqual(spec.species[0].japaneseName, 'ドクツルタケ');
});

test('buildTier1Spec applies rename decision (uses daikinrinTitle)', () => {
  const normalized = [
    { scientificName: 'Boletus sensibilis', japaneseName: 'ドクヤマドリモドキ', synonyms: ['Boletus sensibilis'], cleanedJapaneseNames: ['ドクヤマドリモドキ'], normalizationStatus: 'ACCEPTED', suggestion: 'RENAME_TO', daikinrinTitle: 'ミヤマイロガワリ' },
  ];
  const confirmed = {
    decisions: {
      boletus_sensibilis: { action: 'rename', renameTo: 'ミヤマイロガワリ' },
    },
  };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species[0].japaneseName, 'ミヤマイロガワリ');
  assert.ok(spec.species[0].aliases.includes('ドクヤマドリモドキ'));
  assert.strictEqual(spec.species[0].ja_wiki_source_override.title, 'ミヤマイロガワリ');
});

test('buildTier1Spec includes synonyms and normalizationStatus', () => {
  const normalized = [
    { scientificName: 'Lactifluus volemus', japaneseName: 'チチタケ', synonyms: ['Lactarius volemus'], cleanedJapaneseNames: ['チチタケ'], normalizationStatus: 'SYNONYM', suggestion: 'KEEP' },
  ];
  const confirmed = { decisions: { lactifluus_volemus: { action: 'include', usedName: 'チチタケ' } } };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.deepStrictEqual(spec.species[0].synonyms, ['Lactarius volemus']);
  assert.strictEqual(spec.species[0].normalizationStatus, 'SYNONYM');
});

test('buildTier1Spec records curator notes for force_include decisions', () => {
  const normalized = [
    { scientificName: 'Trichoderma cornu-damae', japaneseName: 'カエンタケ', synonyms: [], cleanedJapaneseNames: ['カエンタケ'], normalizationStatus: 'ACCEPTED', suggestion: 'NEEDS_REVIEW' },
  ];
  const confirmed = { decisions: { trichoderma_cornu_damae: { action: 'include', usedName: 'カエンタケ', reason: 'force_include: 猛毒代表種' } } };

  const spec = buildTier1Spec(normalized, confirmed);
  assert.strictEqual(spec.species[0].curator_notes, 'force_include: 猛毒代表種');
});
