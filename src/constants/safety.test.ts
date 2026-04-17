import { describe, it, expect } from 'vitest';
import { SAFETY_CONFIG, getSafetyConfig } from './safety';
import type { Safety } from '@/types/mushroom';

describe('SAFETY_CONFIG', () => {
  it('defines config for all 6 safety levels', () => {
    const levels: Safety[] = ['edible', 'caution', 'inedible', 'toxic', 'deadly', 'unknown'];
    for (const level of levels) {
      expect(SAFETY_CONFIG[level]).toBeDefined();
      expect(SAFETY_CONFIG[level].label).toBeTruthy();
      expect(SAFETY_CONFIG[level].color).toBeTruthy();
      expect(SAFETY_CONFIG[level].icon).toBeTruthy();
    }
  });

  it('orders priority as edible → caution → deadly → toxic → unknown → inedible', () => {
    expect(SAFETY_CONFIG.edible.priority).toBe(0);
    expect(SAFETY_CONFIG.caution.priority).toBe(1);
    expect(SAFETY_CONFIG.deadly.priority).toBe(2);
    expect(SAFETY_CONFIG.toxic.priority).toBe(3);
    expect(SAFETY_CONFIG.unknown.priority).toBe(4);
    expect(SAFETY_CONFIG.inedible.priority).toBe(5);
  });
});

describe('getSafetyConfig', () => {
  it('returns correct config for a given safety', () => {
    const config = getSafetyConfig('deadly');
    expect(config.label).toBe('猛毒');
    expect(config.color).toContain('safety-deadly');
  });
});
