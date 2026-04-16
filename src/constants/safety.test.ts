import { describe, it, expect } from 'vitest';
import { SAFETY_CONFIG, getSafetyConfig } from './safety';
import type { Safety } from '@/types/mushroom';

describe('SAFETY_CONFIG', () => {
  it('defines config for all 5 safety levels', () => {
    const levels: Safety[] = ['edible', 'caution', 'inedible', 'toxic', 'deadly'];
    for (const level of levels) {
      expect(SAFETY_CONFIG[level]).toBeDefined();
      expect(SAFETY_CONFIG[level].label).toBeTruthy();
      expect(SAFETY_CONFIG[level].color).toBeTruthy();
      expect(SAFETY_CONFIG[level].icon).toBeTruthy();
    }
  });

  it('assigns higher priority to more dangerous levels', () => {
    expect(SAFETY_CONFIG.edible.priority).toBeLessThan(SAFETY_CONFIG.toxic.priority);
    expect(SAFETY_CONFIG.toxic.priority).toBeLessThan(SAFETY_CONFIG.deadly.priority);
  });
});

describe('getSafetyConfig', () => {
  it('returns correct config for a given safety', () => {
    const config = getSafetyConfig('deadly');
    expect(config.label).toBe('猛毒');
    expect(config.color).toContain('safety-deadly');
  });
});
