'use client';

import { UI_TEXT } from '@/constants/ui-text';

export interface MonthSelectorProps {
  /** 選択中の月 (1-12) または undefined = 指定なし */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * 識別条件に「観察した月」を加えるセレクタ。指定月に発生期を持つ種に
 * matcher 側で MONTH_MATCH_POINTS (=8) 加算される。
 */
export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <section className="rounded-lg border border-border bg-soil-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="serif-display text-sm font-bold text-washi-cream">
          {UI_TEXT.identify.simpleMonthHeading}
        </span>
        <span className="text-[11px] text-washi-dim">{UI_TEXT.identify.simpleMonthHint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <MonthChip
          label={UI_TEXT.identify.simpleMonthAny}
          active={value === undefined}
          onClick={() => onChange(undefined)}
        />
        {MONTHS.map((m) => (
          <MonthChip
            key={m}
            label={`${m}月`}
            active={value === m}
            onClick={() => onChange(value === m ? undefined : m)}
          />
        ))}
      </div>
    </section>
  );
}

function MonthChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
        active
          ? 'bg-moss-primary text-washi-cream border-moss-light'
          : 'bg-soil-elevated text-washi-muted border-border hover:border-moss-light/60 hover:text-washi-cream'
      }`}
    >
      {label}
    </button>
  );
}
