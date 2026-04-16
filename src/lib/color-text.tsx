import type { ReactNode } from 'react';

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

/**
 * 単一漢字の色名（赤 / 青 / 白 等）が地名や別語の一部にマッチするのを防ぐため、
 * 次の文字が日本語（漢字 / ひらがな / カタカナ）の場合は不一致とする negative lookahead。
 * 例: 青森県 の "青" → 次が "森" (漢字) でマッチさせない
 *     赤坂 の "赤" → 次が "坂" (漢字) でマッチさせない
 *     紫陽花 の "紫" → 次が "陽" (漢字) でマッチさせない
 *
 * "赤色" / "赤い" 等の複合語は COLOR_MAP に長い語として登録されているため、
 * sort + alternation の優先順位で先にマッチする。
 */
const SINGLE_CHAR_GUARD = '(?![\\u4E00-\\u9FFF\\u3040-\\u309F\\u30A0-\\u30FF\\u30FC])';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COLOR_REGEX = new RegExp(
  `(${COLOR_TERMS.map((t) => (t.length === 1 ? `${escapeRegex(t)}${SINGLE_CHAR_GUARD}` : escapeRegex(t))).join('|')})`,
  'g'
);

/**
 * テキスト中の色名を検出し、色名の文字そのものに色の下線を引く。
 * 下線色は色名が指す実色（Hex）。可読性を損なわずに色を視覚化する。
 *
 * 例: "傘は赤色で白いイボを持つ"
 *     → "傘は <u style="border-bottom:2px solid #C43E3E">赤色</u>
 *        で <u style="border-bottom:2px solid #EDE3D0">白い</u> イボを持つ"
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
      <span
        key={`color-${key}`}
        className="text-washi-cream"
        style={{
          borderBottom: `2px solid ${hex}`,
          paddingBottom: '1px',
        }}
      >
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
