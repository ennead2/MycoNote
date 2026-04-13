import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTraitCircusRecord, summarizeTraits } from './trait-circus.mjs';

const FIXTURE = JSON.parse(readFileSync(
  join(process.cwd(), 'scripts/phase13/fixtures/trait-circus-morchella-esculenta.json'),
  'utf-8'
));

describe('parseTraitCircusRecord', () => {
  it('fixture を受け取り currentName と traits を返す', () => {
    const parsed = parseTraitCircusRecord(FIXTURE);
    expect(parsed.currentName).toBe('Morchella esculenta');
    expect(Array.isArray(parsed.traits)).toBe(true);
    expect(parsed.traits.length).toBeGreaterThan(0);
  });
});

describe('summarizeTraits', () => {
  it('traits を element/attribute/value の 3 層に分解してグループ化する', () => {
    const parsed = parseTraitCircusRecord(FIXTURE);
    const summary = summarizeTraits(parsed.traits);
    expect(Object.keys(summary).length).toBeGreaterThan(0);
    const firstElement = Object.values(summary)[0];
    expect(typeof firstElement).toBe('object');
  });

  it('trait が "element_attribute_value" 形式でない行はスキップ', () => {
    const traits = [
      { trait: 'pileus_color_brown', hitword: 'brown', raw: '...', source: 'x' },
      { trait: 'invalid', hitword: 'x', raw: '...', source: 'y' },
    ];
    const summary = summarizeTraits(traits);
    expect(summary.pileus?.color).toContain('brown');
    expect(summary.invalid).toBeUndefined();
  });
});
