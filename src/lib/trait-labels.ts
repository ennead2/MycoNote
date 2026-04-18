import raw from '@/data/trait-labels.json';

export interface TraitValue {
  /** 英語値（trait_key 末尾と一致。例: "red"） */
  en: string;
  /** 日本語値（UI 表示用。例: "赤"） */
  jp: string;
  /** 完全な trait_key（例: "pileus_color_red"） */
  key: string;
}

export interface TraitAttribute {
  en: string;
  jp: string;
  values: TraitValue[];
}

export interface TraitElement {
  en: string;
  jp: string;
  /** UI 上で要素名の下に表示する短い補足（例: 「キノコ全体の姿」） */
  hint?: string;
  attributes: TraitAttribute[];
}

/**
 * FeatureSelectorV2 で直接使う、肉眼観察可能な 9 要素の階層辞書。
 * 順序は表示順（観察フローに沿う）。
 */
export const TRAIT_ELEMENTS: readonly TraitElement[] = raw.elements as TraitElement[];

export interface TraitKeyParts {
  element: TraitElement;
  attribute: TraitAttribute;
  value: TraitValue;
}

const keyIndex: Map<string, TraitKeyParts> = (() => {
  const m = new Map<string, TraitKeyParts>();
  for (const element of TRAIT_ELEMENTS) {
    for (const attribute of element.attributes) {
      for (const value of attribute.values) {
        m.set(value.key, { element, attribute, value });
      }
    }
  }
  return m;
})();

/**
 * trait_key から日本語ラベルを引く。辞書にないキー (VISIBLE_SCHEMA 外) は null。
 */
export function lookupTraitKey(key: string): TraitKeyParts | null {
  return keyIndex.get(key) ?? null;
}

/**
 * 表示用: "傘・色・赤" 形式
 */
export function formatTraitLabel(key: string): string {
  const parts = lookupTraitKey(key);
  if (!parts) return key;
  return `${parts.element.jp}・${parts.attribute.jp}・${parts.value.jp}`;
}
