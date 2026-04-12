import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { replaceEmojisWithIcons, replaceEmojisInChildren } from './emoji-to-icon';

describe('replaceEmojisWithIcons', () => {
  it('passes through plain text unchanged', () => {
    const nodes = replaceEmojisWithIcons('こんにちは、世界');
    expect(nodes).toEqual(['こんにちは、世界']);
  });

  it('replaces mapped emoji with an icon node', () => {
    const nodes = replaceEmojisWithIcons('🍄 マツタケ');
    // First node should be a React element (icon), rest should be the trailing text
    expect(typeof nodes[0]).not.toBe('string');
    expect(nodes[nodes.length - 1]).toBe(' マツタケ');
  });

  it('handles Variation Selector-16 (⚠️ == ⚠)', () => {
    const withVs = replaceEmojisWithIcons('⚠️ 注意');
    const withoutVs = replaceEmojisWithIcons('⚠ 注意');
    // Both should produce an icon followed by trailing " 注意"
    expect(typeof withVs[0]).not.toBe('string');
    expect(typeof withoutVs[0]).not.toBe('string');
    expect(withVs[withVs.length - 1]).toBe(' 注意');
    expect(withoutVs[withoutVs.length - 1]).toBe(' 注意');
  });

  it('passes through emoji not in the dictionary', () => {
    const nodes = replaceEmojisWithIcons('👍 いいね');
    // Thumbs-up is not mapped → should remain in a string node
    const joined = nodes.filter((n) => typeof n === 'string').join('');
    expect(joined).toContain('👍');
  });

  it('handles multiple mapped emoji in one string', () => {
    const nodes = replaceEmojisWithIcons('📍高尾山 📅10月');
    const iconCount = nodes.filter((n) => typeof n !== 'string').length;
    expect(iconCount).toBe(2);
  });

  it('renders without crashing in a DOM', () => {
    const { container } = render(<div>{replaceEmojisWithIcons('🍄⚠️☠ 猛毒')}</div>);
    // Expect 3 svg icons (lucide renders as svg)
    expect(container.querySelectorAll('svg').length).toBe(3);
    expect(container.textContent).toContain('猛毒');
  });
});

describe('replaceEmojisInChildren', () => {
  it('returns non-string children untouched', () => {
    const child = <span>foo</span>;
    expect(replaceEmojisInChildren(child)).toBe(child);
  });

  it('processes string children', () => {
    const { container } = render(<div>{replaceEmojisInChildren('🍄 hello')}</div>);
    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(container.textContent).toContain('hello');
  });

  it('processes array children with mixed types', () => {
    const children = ['🍄 text', <strong key="s">bold</strong>, ' 📍 loc'];
    const { container } = render(<div>{replaceEmojisInChildren(children)}</div>);
    expect(container.querySelectorAll('svg').length).toBe(2);
    expect(container.textContent).toContain('bold');
  });
});
