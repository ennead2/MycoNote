import type { ReactNode } from 'react';

interface ColorDef {
  bg: string;
  text: string;
}

const COLOR_MAP: Record<string, ColorDef> = {
  // 赤系
  '鮮紅色': { bg: '#dc2626', text: '#fff' },
  '橙赤色': { bg: '#ea580c', text: '#fff' },
  '朱赤色': { bg: '#ef4444', text: '#fff' },
  '赤褐色': { bg: '#92400e', text: '#fff' },
  '橙赤': { bg: '#ea580c', text: '#fff' },
  '赤色': { bg: '#dc2626', text: '#fff' },
  '赤い': { bg: '#dc2626', text: '#fff' },
  // 橙系
  '橙褐色': { bg: '#b45309', text: '#fff' },
  '橙黄色': { bg: '#d97706', text: '#fff' },
  '橙色': { bg: '#ea580c', text: '#fff' },
  // 黄系
  '硫黄黄色': { bg: '#ca8a04', text: '#fff' },
  '淡黄色': { bg: '#fde68a', text: '#422006' },
  '黄褐色': { bg: '#a16207', text: '#fff' },
  '黄緑色': { bg: '#84cc16', text: '#1a2e05' },
  '黄色': { bg: '#eab308', text: '#422006' },
  // 緑系
  'オリーブ緑色': { bg: '#4d7c0f', text: '#fff' },
  'オリーブ色': { bg: '#4d7c0f', text: '#fff' },
  '淡緑色': { bg: '#86efac', text: '#14532d' },
  '緑灰色': { bg: '#6b7280', text: '#fff' },
  // 茶・褐色系
  '茶褐色': { bg: '#78350f', text: '#fff' },
  '暗褐色': { bg: '#451a03', text: '#fff' },
  '錆褐色': { bg: '#7c2d12', text: '#fff' },
  '黒褐色': { bg: '#292524', text: '#fff' },
  '淡褐色': { bg: '#d6a86c', text: '#422006' },
  '褐色': { bg: '#92400e', text: '#fff' },
  '茶色': { bg: '#78350f', text: '#fff' },
  // 白系
  '灰白色': { bg: '#d1d5db', text: '#1f2937' },
  'クリーム色': { bg: '#fef3c7', text: '#422006' },
  '純白': { bg: '#ffffff', text: '#1f2937' },
  '白色': { bg: '#f3f4f6', text: '#1f2937' },
  '白い': { bg: '#f3f4f6', text: '#1f2937' },
  // 灰・黒系
  '灰褐色': { bg: '#78716c', text: '#fff' },
  '灰色': { bg: '#9ca3af', text: '#1f2937' },
  '黒紫色': { bg: '#581c87', text: '#fff' },
  '黒色': { bg: '#374151', text: '#fff' },
  '黒い': { bg: '#374151', text: '#fff' },
  // 青系
  '青白く': { bg: '#bfdbfe', text: '#1e3a5f' },
  '青白い': { bg: '#bfdbfe', text: '#1e3a5f' },
};

// Sort by length descending so longer matches take priority
const COLOR_TERMS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
const COLOR_REGEX = new RegExp(`(${COLOR_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

export function renderColorText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(COLOR_REGEX)) {
    const term = match[0];
    const index = match.index!;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const color = COLOR_MAP[term];
    parts.push(
      <span
        key={key++}
        className="inline-block rounded px-1 mx-px"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {term}
      </span>
    );

    lastIndex = index + term.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
