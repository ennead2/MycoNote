'use client';

import type { SortOrder } from '@/types/mushroom';
import { UI_TEXT } from '@/constants/ui-text';

interface SortToggleProps {
  value: SortOrder;
  onChange: (next: SortOrder) => void;
}

const OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'safety', label: UI_TEXT.zukan.sortSafety },
  { value: 'kana', label: UI_TEXT.zukan.sortKana },
  { value: 'taxonomy', label: UI_TEXT.zukan.sortTaxonomy },
];

/**
 * Small segmented control for zukan list sort order.
 */
export function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-data text-[10px] text-washi-dim tracking-wider uppercase">
        {UI_TEXT.zukan.sortBy}
      </span>
      <div className="flex gap-1">
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1 text-[11px] mono-data transition-colors border ${
                active
                  ? 'bg-moss-primary text-washi-cream border-moss-primary'
                  : 'bg-soil-surface text-washi-muted border-border hover:border-moss-light/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
