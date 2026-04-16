import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderColorText, resolveColorHex } from './color-text';

describe('renderColorText', () => {
  function getColored(text: string): string[] {
    const parts = renderColorText(text);
    const { container } = render(<>{parts}</>);
    return Array.from(container.querySelectorAll('span')).map((s) => s.textContent ?? '');
  }

  it('highlights compound color terms', () => {
    expect(getColored('傘は赤色で白い')).toEqual(['赤色', '白い']);
  });

  it('highlights bare single-char colors at end of text', () => {
    expect(getColored('ヒダは白')).toEqual(['白']);
  });

  it('highlights bare single-char colors before punctuation', () => {
    expect(getColored('赤、白、黒。')).toEqual(['赤', '白', '黒']);
  });

  it('does NOT highlight single-char colors that are part of place names', () => {
    expect(getColored('青森県や黒部、赤坂、紫陽花の名所')).toEqual([]);
  });

  it('still highlights longer compound forms even when followed by Japanese chars', () => {
    expect(getColored('白い帽子をかぶる赤色の傘')).toEqual(['白い', '赤色']);
  });

  it('highlights bare colors before katakana when separated by space (no Japanese char immediately after)', () => {
    expect(getColored('赤 タケ')).toEqual(['赤']);
  });

  it('does NOT highlight 茶 inside 茶碗', () => {
    expect(getColored('茶碗の中に茶色の液体')).toEqual(['茶色']);
  });
});

describe('resolveColorHex', () => {
  it('returns hex for known color name', () => {
    expect(resolveColorHex('赤')).toBe('#C43E3E');
    expect(resolveColorHex('青')).toBe('#3E5A7A');
  });

  it('returns undefined for unknown', () => {
    expect(resolveColorHex('未知の色')).toBeUndefined();
  });
});
