import React from 'react';
import {
  Sprout,
  TreePine,
  Leaf,
  AlertTriangle,
  Skull,
  MapPin,
  Calendar,
  Check,
  X,
  CloudRain,
  Sun,
  Lightbulb,
  Search,
  Camera,
  Target,
  type LucideIcon,
} from 'lucide-react';

interface IconEntry {
  Icon: LucideIcon;
  tone: string;
  label: string;
}

/**
 * Claude アシスタント返答に頻出する絵文字を lucide アイコンにインライン置換するための辞書。
 * キー = 絵文字コードポイント（Variation Selector-16 は除いた形で統一）。
 * 辞書外の絵文字は素通し。
 */
const EMOJI_ICON_MAP: Record<string, IconEntry> = {
  '🍄': { Icon: Sprout, tone: 'text-moss-light', label: 'キノコ' },
  '🌲': { Icon: TreePine, tone: 'text-moss-light', label: '針葉樹' },
  '🌳': { Icon: TreePine, tone: 'text-moss-light', label: '樹木' },
  '🌴': { Icon: TreePine, tone: 'text-moss-light', label: '樹木' },
  '🍂': { Icon: Leaf, tone: 'text-safety-caution', label: '落葉' },
  '🍁': { Icon: Leaf, tone: 'text-safety-toxic', label: '紅葉' },
  '⚠': { Icon: AlertTriangle, tone: 'text-safety-caution', label: '注意' },
  '☠': { Icon: Skull, tone: 'text-safety-deadly', label: '猛毒' },
  '📍': { Icon: MapPin, tone: 'text-moss-light', label: '場所' },
  '📅': { Icon: Calendar, tone: 'text-moss-light', label: '日付' },
  '✅': { Icon: Check, tone: 'text-safety-edible', label: 'OK' },
  '✔': { Icon: Check, tone: 'text-safety-edible', label: 'OK' },
  '❌': { Icon: X, tone: 'text-safety-toxic', label: 'NG' },
  '✕': { Icon: X, tone: 'text-safety-toxic', label: 'NG' },
  '🌧': { Icon: CloudRain, tone: 'text-washi-muted', label: '雨' },
  '☔': { Icon: CloudRain, tone: 'text-washi-muted', label: '雨' },
  '☀': { Icon: Sun, tone: 'text-safety-caution', label: '晴' },
  '💡': { Icon: Lightbulb, tone: 'text-safety-caution', label: 'ヒント' },
  '🔍': { Icon: Search, tone: 'text-washi-muted', label: '観察' },
  '📸': { Icon: Camera, tone: 'text-washi-muted', label: '撮影' },
  '🎯': { Icon: Target, tone: 'text-moss-light', label: '目標' },
};

/**
 * Variation Selector-16 (U+FE0F) を除去して辞書キーに合わせる。
 * ⚠️ のような「絵文字形式指示付き」文字列を ⚠ と同じキーで引けるようにする。
 */
function normalize(char: string): string {
  return char.replace(/\uFE0F/g, '');
}

/**
 * 文字列から「辞書で引ける絵文字 1 つ分」を先頭から切り出す。
 * 該当なしなら null を返す。surrogate pair + VS-16 を考慮。
 */
function matchEmojiAt(text: string, index: number): { raw: string; key: string; length: number } | null {
  const codePoint = text.codePointAt(index);
  if (codePoint === undefined) return null;
  const char = String.fromCodePoint(codePoint);
  const vs16 = text.charCodeAt(index + char.length) === 0xfe0f ? '\uFE0F' : '';
  const raw = char + vs16;
  const key = normalize(raw);
  if (EMOJI_ICON_MAP[key]) {
    return { raw, key, length: raw.length };
  }
  return null;
}

/**
 * テキストノード中の絵文字を lucide アイコンに置換して ReactNode 配列を返す。
 * 辞書外の絵文字・通常文字はそのまま。ストリーム中の部分文字列でも安全（マッチしない絵文字は素通し）。
 */
export function replaceEmojisWithIcons(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let buffer = '';
  let keyCounter = 0;
  let i = 0;

  const flushBuffer = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    const match = matchEmojiAt(text, i);
    if (match) {
      flushBuffer();
      const entry = EMOJI_ICON_MAP[match.key];
      const { Icon } = entry;
      nodes.push(
        <Icon
          key={`icon-${keyCounter++}`}
          size={14}
          className={`inline-block align-[-0.15em] mx-0.5 ${entry.tone}`}
          aria-label={entry.label}
        />
      );
      i += match.length;
    } else {
      const cp = text.codePointAt(i)!;
      buffer += String.fromCodePoint(cp);
      i += cp > 0xffff ? 2 : 1;
    }
  }
  flushBuffer();
  return nodes;
}

/**
 * React の children を再帰走査して、文字列ノードだけ絵文字置換を適用する。
 * ReactMarkdown の components から渡される children に使う。
 */
export function replaceEmojisInChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    const replaced = replaceEmojisWithIcons(children);
    return replaced.length === 1 ? replaced[0] : <>{replaced}</>;
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) =>
      typeof child === 'string' ? (
        <React.Fragment key={idx}>{replaceEmojisWithIcons(child)}</React.Fragment>
      ) : (
        child
      )
    );
  }
  return children;
}
