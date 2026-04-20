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
  '赤橙色': '#E05820',
  '暗赤色': '#6A1E2A',
  '深赤色': '#5A1E24',
  '鮮赤色': '#D83030',
  '淡赤色': '#E08888',
  '赤茶色': '#7A3A1F',
  '赤紫色': '#8E3A5A',
  '橙赤': '#D47337',
  '赤色': '#C43E3E',
  '赤い': '#C43E3E',
  '赤': '#C43E3E',
  // 橙系
  '橙褐色': '#8B5A2C',
  '橙黄色': '#D4A017',
  '黄橙色': '#E09020',
  '橙色': '#D47337',
  '橙': '#D47337',
  // 黄系
  '硫黄黄色': '#D4A017',
  '淡黄色': '#E8D582',
  '黄褐色': '#8B6A2A',
  '黄緑色': '#9AB855',
  '緑黄色': '#9AB855',
  '鮮黄色': '#F0B820',
  '帯黄色': '#E8D582',
  '黄白色': '#F0ECC8',
  '薄黄色': '#F5E8A0',
  '濃黄色': '#B8860B',
  '黄金色': '#D4A017',
  '金色': '#D4AF37',
  '銀色': '#C0C0C0',
  '黄灰色': '#A8A285',
  '灰黄色': '#A8A285',
  '黄色': '#D4A017',
  '黄': '#D4A017',
  // 緑系
  'オリーブ緑色': '#6B7A3A',
  'オリーブ色': '#6B7A3A',
  '淡緑色': '#9AC48B',
  '緑灰色': '#6E7A66',
  '灰緑色': '#6E7A66',
  '暗緑色': '#3A5A3A',
  '深緑色': '#2A4A2A',
  '青緑色': '#3A7A6E',
  '緑青色': '#4A7A88',
  '緑色': '#6BA368',
  '緑': '#6BA368',
  // 茶・褐色系
  '茶褐色': '#6A3A1F',
  '暗褐色': '#3D2512',
  '錆褐色': '#7A3A1A',
  '黒褐色': '#2B2420',
  '淡褐色': '#A88568',
  '薄茶色': '#A88568',
  '褐色': '#7A4A2A',
  '茶色': '#7A4A2A',
  '茶': '#7A4A2A',
  // 白系
  '灰白色': '#C8C3B8',
  '乳白色': '#F5EFD5',
  'クリーム色': '#EDE3D0',
  '純白': '#F5F0E6',
  '白色': '#EDE3D0',
  '白い': '#EDE3D0',
  '白': '#EDE3D0',
  // 灰・黒系
  '灰褐色': '#7A6E5F',
  '暗灰色': '#4A4642',
  '濃灰色': '#4A4642',
  '淡灰色': '#B8B3AA',
  '銀灰色': '#B8B3B0',
  '青灰色': '#5A6270',
  '紫灰色': '#6E5F6B',
  '灰紫色': '#6E5F6B',
  '灰黒色': '#3A362F',
  '黒灰色': '#3A362F',
  '灰色': '#7A7266',
  '灰': '#7A7266',
  '黒紫色': '#3E2842',
  '紫黒色': '#1E1828',
  '青黒色': '#1E2538',
  '黒色': '#2B2420',
  '黒い': '#2B2420',
  '黒': '#2B2420',
  // 紫系
  '暗紫色': '#3E2842',
  '濃紫色': '#4A2D4A',
  '淡紫色': '#9A789A',
  '薄紫色': '#9A789A',
  '青紫色': '#4A4280',
  '帯紫色': '#9A789A',
  '紫色': '#6B3F6B',
  '紫': '#6B3F6B',
  // 青系
  '青白く': '#8BA6C4',
  '青白い': '#8BA6C4',
  '青色': '#3E5A7A',
  '青': '#3E5A7A',
  // ピンク系
  '桃色': '#E8A3B5',
  '淡桃色': '#F5C9D3',
  '濃桃色': '#D97389',
  '帯桃色': '#F5C9D3',
  'ピンク色': '#C17889',
  'ピンク': '#C17889',
  // 低頻度の組合せ色 (1 回ずつ出現する表現を網羅)
  '薄灰色': '#B8B3AA',
  '暗青色': '#2A3A5A',
  '帯緑色': '#9AC48B',
  '淡橙色': '#F5BE95',
  '薄橙色': '#F5BE95',
  '紫白色': '#E0D5E0',
  '緑黒色': '#1F2E1F',
  '帯灰色': '#B8B3AA',
  '白黄色': '#F5EFCA',
  '淡青色': '#A0B8CE',
  '淡茶色': '#B8907A',
  '桃灰色': '#C8A8AD',
  '帯赤色': '#D68080',
  '灰桃色': '#C8A8AD',
  '白灰色': '#C8C3B8',
  '灰橙色': '#B89070',
  '暗黄色': '#A87D15',
  // その他・汎用修飾
  '暗色': '#3A362F',
  '淡色': '#E8DED0',
  '濃色': '#3D2512',
  '帯白色': '#E8DED0',
  // 紅・朱・藍・栗・肌・鼠・小豆 等の伝統色系
  '紅色': '#E83858',
  '朱紅色': '#E73030',
  '深紅色': '#A01030',
  '濃紅色': '#A01030',
  '淡紅色': '#E8A8B0',
  '薄紅色': '#E8A8B0',
  '紫紅色': '#A03358',
  '紅紫色': '#A03358',
  '淡紫紅色': '#D098A8',
  '淡紅紫色': '#C888A0',
  '紅褐色': '#6A3A2A',
  '淡紅褐色': '#B8806A',
  '紅灰褐色': '#6A4E4A',
  '紅黄色': '#F09030',
  '淡紅橙色': '#F0A880',
  '褐淡紅色': '#B08080',
  '肌色': '#F0C9A8',
  '淡朱色': '#F0A080',
  '藍色': '#1A3A6A',
  '藍青色': '#1F3A5A',
  '藍黒色': '#0F2040',
  '濃藍色': '#14305C',
  '栗色': '#5A3A1F',
  '栗褐色': '#5A3A1F',
  '鼠色': '#7A7266',
  '小豆色': '#5A2030',
  // 褐色合成 (2-3 字)
  '紫褐色': '#5A3A4A',
  '濃褐色': '#3D2512',
  '薄褐色': '#A88568',
  '淡茶褐色': '#A88568',
  '薄茶褐色': '#A88568',
  '緑褐色': '#5A5A2A',
  '黄緑褐色': '#5A6A20',
  '緑黄褐色': '#6A7020',
  '暗緑褐色': '#2A3A20',
  '淡黄褐色': '#C8A780',
  '暗黄褐色': '#6A4A1A',
  '鮮黄褐色': '#B0781A',
  '帯黄褐色': '#B8902A',
  '橙黄褐色': '#A08020',
  '黄灰褐色': '#6A5E3A',
  '暗灰褐色': '#4A3828',
  '淡灰褐色': '#BEB19E',
  '帯灰褐色': '#8A7A68',
  '白灰褐色': '#C0B088',
  '灰白褐色': '#B8A888',
  '灰黒褐色': '#2A2520',
  '灰赤褐色': '#6A4A3A',
  '暗赤褐色': '#4A2512',
  '淡赤褐色': '#B8866A',
  '赤黄褐色': '#7A4A20',
  '赤橙褐色': '#6A3A20',
  '黒赤褐色': '#2A1008',
  '帯赤褐色': '#8A4A2A',
  '淡橙褐色': '#B8906A',
  '暗橙褐色': '#6A4820',
  '橙淡褐色': '#C8A890',
  '淡紫褐色': '#A0807A',
  '帯紫褐色': '#A0807A',
  '暗紫褐色': '#3A2128',
  '灰紫褐色': '#6A5A68',
  '紫暗褐色': '#3A2828',
  '黒紫褐色': '#1A1418',
  '暗褐紫色': '#3A2828',
  '帯暗褐色': '#3D2512',
  '褐灰色': '#7A6E5F',
  '帯褐灰色': '#7A6E5F',
  '褐淡赤色': '#C08080',
  '帯褐黄色': '#B8902A',
  '帯褐赤色': '#8A3A2A',
  '帯褐桃色': '#B88078',
  '帯桃褐色': '#B0806A',
  '暗黒褐色': '#1A1008',
  '暗赤紫色': '#4A1840',
  '濃青紫色': '#3A3070',
  '暗紫灰色': '#4A3A4A',
  '暗青緑色': '#1A3A38',
  '淡灰緑色': '#A8BAA0',
  '淡灰紫色': '#B0A8B0',
  '淡黄緑色': '#C8D890',
  '淡黄白色': '#F5F0D0',
  '淡灰白色': '#D8D0C3',
  '淡紫白色': '#DCC8DC',
  '橙淡黄色': '#F0D878',
  '淡橙黄色': '#F0CE78',
  '帯緑黒色': '#1A2A1A',
  '帯緑黄色': '#C8C860',
  '帯青黒色': '#1A2538',
  '暗赤橙色': '#8A3818',
  '帯赤橙色': '#E05820',
  '鮮黄金色': '#E8B810',
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
  // 色名マッチ + [N] 出典参照マッチ を同時に処理
  const REF_REGEX = /\[(\d+)\]/g;
  type Hit = { type: 'color' | 'ref'; index: number; length: number; term: string; refNum?: number };
  const hits: Hit[] = [];
  for (const m of text.matchAll(COLOR_REGEX)) {
    hits.push({ type: 'color', index: m.index!, length: m[0].length, term: m[0] });
  }
  for (const m of text.matchAll(REF_REGEX)) {
    hits.push({
      type: 'ref',
      index: m.index!,
      length: m[0].length,
      term: m[0],
      refNum: parseInt(m[1], 10),
    });
  }
  hits.sort((a, b) => a.index - b.index);

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const h of hits) {
    if (h.index < lastIndex) continue; // overlap はスキップ (稀)
    if (h.index > lastIndex) parts.push(text.slice(lastIndex, h.index));

    if (h.type === 'color') {
      const hex = COLOR_MAP[h.term];
      parts.push(
        <span
          key={`color-${key}`}
          className="text-washi-cream"
          style={{
            borderBottom: `2px solid ${hex}`,
            paddingBottom: '1px',
          }}
        >
          {h.term}
        </span>
      );
    } else {
      // ref: [N] → sources の該当行へアンカースクロール
      parts.push(
        <sup key={`ref-${key}`}>
          <a
            href={`#src-${h.refNum}`}
            className="mono-data text-[10px] text-moss-light hover:text-washi-cream"
            aria-label={`出典 ${h.refNum}`}
          >
            [{h.refNum}]
          </a>
        </sup>
      );
    }

    key++;
    lastIndex = h.index + h.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/**
 * 色名を Hex 値に解決する（ColorChip を直接使う場合のユーティリティ）。
 * 未登録の色名は undefined を返す。
 */
export function resolveColorHex(colorName: string): string | undefined {
  return COLOR_MAP[colorName];
}
