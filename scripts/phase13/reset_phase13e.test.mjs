import { describe, it, expect } from 'vitest';
import { RESET_TARGETS, RESET_PRESERVES } from './reset_phase13e.mjs';

describe('reset_phase13e targets', () => {
  it('破棄リストに combined と wikipedia-ja を含む', () => {
    expect(RESET_TARGETS).toContain('.cache/phase13/combined');
    expect(RESET_TARGETS).toContain('.cache/phase13/wikipedia-ja');
  });

  it('破棄リストに generated/articles と approved を含む', () => {
    expect(RESET_TARGETS).toContain('generated/articles');
    expect(RESET_TARGETS).toContain('generated/articles/approved');
  });

  it('保持リストに wikipedia-en と daikinrin を含む', () => {
    expect(RESET_PRESERVES).toContain('.cache/phase13/wikipedia-en');
    expect(RESET_PRESERVES).toContain('.cache/phase13/daikinrin');
  });

  it('破棄リストと保持リストは排他的', () => {
    for (const t of RESET_TARGETS) {
      expect(RESET_PRESERVES).not.toContain(t);
    }
  });
});
