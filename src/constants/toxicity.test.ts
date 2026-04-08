import { describe, it, expect } from 'vitest';
import { TOXICITY_CONFIG, getToxicityConfig } from './toxicity';
import type { Toxicity } from '@/types/mushroom';

describe('TOXICITY_CONFIG', () => {
  it('defines config for all 5 toxicity levels', () => {
    const levels: Toxicity[] = ['edible', 'edible_caution', 'inedible', 'toxic', 'deadly_toxic'];
    for (const level of levels) {
      expect(TOXICITY_CONFIG[level]).toBeDefined();
      expect(TOXICITY_CONFIG[level].label).toBeTruthy();
      expect(TOXICITY_CONFIG[level].color).toBeTruthy();
      expect(TOXICITY_CONFIG[level].icon).toBeTruthy();
    }
  });

  it('assigns higher priority to more dangerous toxicity levels', () => {
    expect(TOXICITY_CONFIG.edible.priority).toBeLessThan(TOXICITY_CONFIG.toxic.priority);
    expect(TOXICITY_CONFIG.toxic.priority).toBeLessThan(TOXICITY_CONFIG.deadly_toxic.priority);
  });
});

describe('getToxicityConfig', () => {
  it('returns correct config for a given toxicity', () => {
    const config = getToxicityConfig('deadly_toxic');
    expect(config.label).toBe('猛毒');
    expect(config.color).toContain('red');
  });
});
