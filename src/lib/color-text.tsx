import type { ReactNode } from 'react';
import { ColorChip } from '@/components/ui/ColorChip';

/**
 * 色名 → 代表Hex値マッピング。
 * DESIGN.md の species color palette に準拠。
 * キノコの特徴記述に現れる色表現を視覚化するために使用。
 */
const COLOR_MAP: Record<string, string> = {
  // 赤系
  '鮮紅色': '#C43E3E',
  '橙赤色': '#D47337',
  '朱赤色': '#C43E3E',
  '赤褐色': '#7A4A2A',
  '橙赤': '#D47337',
  '赤色': '#C43E3E',
  '赤い': '#C43E3E',
  '赤': '#C43E3E',
  // 橙系
  '橙褐色': '#8B5A2C',
  '橙黄色': '#D4A017',
  '橙色': '#D47337',
  '橙': '#D47337',
  // 黄系
  '硫黄黄色': '#D4A017',
  '淡黄色': '#E8D582',
  '黄褐色': '#8B6A2A',
  '黄緑色': '#9AB855',
  '黄色': '#D4A017',
  '黄': '#D4A017',
  // 緑系
  'オリーブ緑色': '#6B7A3A',
  'オリーブ色': '#6B7A3A',
  '淡緑色': '#9AC48B',
  '緑灰色': '#6E7A66',
  '緑色': '#6BA368',
  '緑': '#6BA368',
  // 茶・褐色系
  '茶褐色': '#6A3A1F',
  '暗褐色': '#3D2512',
  '錆褐色': '#7A3A1A',
  '黒褐色': '#2B2420',
  '淡褐色': '#A88568',
  '褐色': '#7A4A2A',
  '茶色': '#7A4A2A',
  '茶': '#7A4A2A',
  // 白系
  '灰白色': '#C8C3B8',
  'クリーム色': '#EDE3D0',
  '純白': '#F5F0E6',
  '白色': '#EDE3D0',
  '白い': '#EDE3D0',
  '白': '#EDE3D0',
  // 灰・黒系
  '灰褐色': '#7A6E5F',
  '灰色': '#7A7266',
  '灰': '#7A7266',
  '黒紫色': '#3E2842',
  '黒色': '#2B2420',
  '黒い': '#2B2420',
  '黒': '#2B2420',
  // 紫系
  '紫色': '#6B3F6B',
  '紫': '#6B3F6B',
  // 青系
  '青白く': '#8BA6C4',
  '青白い': '#8BA6C4',
  '青色': '#3E5A7A',
  '青': '#3E5A7A',
  // ピンク系
  'ピンク色': '#C17889',
  'ピンク': '#C17889',
};

// 長い語から先にマッチさせる
const COLOR_TERMS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
const COLOR_REGEX = new RegExp(
  `(${COLOR_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g'
);

/**
 * テキスト中の色名を検出し、色名の直前に ColorChip を挿入した ReactNode 配列を返す。
 * 色名テキスト自体は元の状態を保ち、可読性を損なわない。
 *
 * 例: "傘は赤色で白いイボを持つ"
 *     → [..., <ColorChip color="#C43E3E" />, "赤色", ..., <ColorChip color="#EDE3D0" />, "白い", ...]
 */
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

    const hex = COLOR_MAP[term];
    parts.push(
      <ColorChip
        key={`chip-${key}`}
        color={hex}
        label={term}
        size="sm"
        className="mr-0.5"
      />
    );
    parts.push(
      <span key={`word-${key}`} className="text-washi-cream">
        {term}
      </span>
    );
    key++;

    lastIndex = index + term.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * 色名を Hex 値に解決する（ColorChip を直接使う場合のユーティリティ）。
 * 未登録の色名は undefined を返す。
 */
export function resolveColorHex(colorName: string): string | undefined {
  return COLOR_MAP[colorName];
}
