import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChatMessageBubble } from './ChatMessage';

describe('ChatMessageBubble', () => {
  it('hides GFM task-list checkboxes (dark-theme legibility)', () => {
    const content = [
      '# 持ち物',
      '- [x] 図鑑',
      '- [ ] 水筒',
      '- [ ] 雨具',
    ].join('\n');
    const { container } = render(
      <ChatMessageBubble message={{ role: 'assistant', content }} />
    );
    // ネイティブ checkbox は一切描画されない
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    // リスト項目自体は残る
    expect(container.textContent).toContain('図鑑');
    expect(container.textContent).toContain('水筒');
  });

  it('still replaces mapped emoji in assistant content', () => {
    const { container } = render(
      <ChatMessageBubble message={{ role: 'assistant', content: '🍄 マツタケ' }} />
    );
    // キノコアイコン (独自 SVG) が 1 つレンダーされる
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain('マツタケ');
  });

  it('renders user messages as plain text without markdown', () => {
    const { container } = render(
      <ChatMessageBubble message={{ role: 'user', content: '**foo** 🍄' }} />
    );
    // user 側は markdown パーサを通さないので ** がそのまま残る
    expect(container.textContent).toContain('**foo**');
  });
});
