'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TRAIT_ELEMENTS, type TraitElement, type TraitAttribute } from '@/lib/trait-labels';

export interface FeatureSelectorV2Props {
  /** 選択中の trait_key 集合 */
  selected: ReadonlySet<string>;
  /** トグルハンドラ */
  onToggle: (key: string) => void;
}

/**
 * 大菌輪統制形質ベースの特徴選択 UI (Phase 15 S4)。
 *
 * 表示: 9 要素 (傘・柄・ひだ・つば・子実層托・肉・子実体・胞子紋・つぼ) が
 * アコーディオン展開。各要素の下に属性ごとの値チップ。
 *
 * 初期状態: 全て折り畳み（ユーザーが必要な項目だけ開く）。
 */
export function FeatureSelectorV2({ selected, onToggle }: FeatureSelectorV2Props) {
  const [openElement, setOpenElement] = useState<string>('');

  return (
    <div className="flex flex-col gap-2">
      {TRAIT_ELEMENTS.map((el) => {
        const isOpen = openElement === el.en;
        const count = countSelectedInElement(el, selected);
        return (
          <section
            key={el.en}
            className="rounded-lg border border-border bg-soil-surface overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenElement(isOpen ? '' : el.en)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-soil-elevated transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <span className="serif-display text-sm font-bold text-washi-cream shrink-0">
                  {el.jp}
                </span>
                {el.hint && (
                  <span className="text-[11px] text-washi-dim truncate">{el.hint}</span>
                )}
                {count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full mono-data text-[11px] font-bold leading-none bg-moss-primary text-washi-cream shrink-0">
                    {count}
                  </span>
                )}
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`text-washi-dim transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3 animate-fade-in">
                {el.attributes.map((attr) => (
                  <AttributeGroup
                    key={attr.en}
                    attribute={attr}
                    selected={selected}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AttributeGroup({
  attribute,
  selected,
  onToggle,
}: {
  attribute: TraitAttribute;
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div>
      <p className="mono-data text-[10px] uppercase tracking-wider text-washi-dim mb-1.5">
        {attribute.jp}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {attribute.values.map((v) => {
          const active = selected.has(v.key);
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onToggle(v.key)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
                active
                  ? 'bg-moss-primary text-washi-cream border-moss-light'
                  : 'bg-soil-elevated text-washi-muted border-border hover:border-moss-light/60 hover:text-washi-cream'
              }`}
            >
              {v.jp}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function countSelectedInElement(el: TraitElement, selected: ReadonlySet<string>): number {
  let n = 0;
  for (const attr of el.attributes) {
    for (const v of attr.values) {
      if (selected.has(v.key)) n++;
    }
  }
  return n;
}
