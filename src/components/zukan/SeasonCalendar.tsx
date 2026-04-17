'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ToxicityBadge } from './ToxicityBadge';
import { UI_TEXT } from '@/constants/ui-text';
import { isMonthInSeasonRanges } from '@/lib/season-utils';
import { sortMushrooms } from '@/data/mushrooms';
import type { Mushroom } from '@/types/mushroom';

interface SeasonCalendarProps {
  mushrooms: Mushroom[];
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const ALL: 'all' = 'all';
type MonthFilter = number | typeof ALL;

export function SeasonCalendar({ mushrooms }: SeasonCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<number>(0);
  const [selected, setSelected] = useState<MonthFilter>(ALL);
  const [isHydrated, setIsHydrated] = useState(false);

  // Default to current month on first mount, avoiding hydration mismatch.
  useEffect(() => {
    const m = new Date().getMonth() + 1;
    setCurrentMonth(m);
    setSelected(m);
    setIsHydrated(true);
  }, []);

  const filtered = useMemo(() => {
    const base =
      selected === ALL
        ? mushrooms
        : mushrooms.filter((mu) => isMonthInSeasonRanges(selected, mu.season));
    // 食用分類順（食用→要注意→猛毒→毒→不明→不食、同順は五十音）
    return sortMushrooms(base, 'safety');
  }, [mushrooms, selected]);

  return (
    <div className="w-full space-y-4">
      {/* Month filter tabs */}
      <div className="space-y-2">
        <p className="mono-data text-[10px] tracking-wider text-washi-muted uppercase">
          {UI_TEXT.zukan.seasonCalendarFilter}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <MonthTab
            label={UI_TEXT.zukan.seasonCalendarAll}
            isActive={selected === ALL}
            isCurrent={false}
            onClick={() => setSelected(ALL)}
          />
          {MONTHS.map((m) => (
            <MonthTab
              key={m}
              label={`${m}月`}
              isActive={selected === m}
              isCurrent={isHydrated && m === currentMonth}
              onClick={() => setSelected(m)}
            />
          ))}
        </div>
        {isHydrated && selected !== ALL && (
          <p className="text-xs text-washi-muted">
            <span className="mono-data text-moss-light">{selected}月</span>
            {' が旬のキノコ: '}
            <span className="text-washi-cream">{filtered.length}</span>
            {' 種'}
          </p>
        )}
      </div>

      {/* Calendar table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-washi-muted text-center py-8">
          {UI_TEXT.zukan.seasonCalendarEmpty}
        </p>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border border-border">
          {/*
            grid-cols: 種名列 8fr : 月 12 × 1fr = 8/20 = 40%。
            種名は 2 行まで折り返し許容。食用分類バッジは icon のみの円形で最小幅。
          */}
          <div className="grid grid-cols-[8fr_repeat(12,minmax(0,1fr))] gap-x-0 text-xs">
            {/* ヘッダー行 */}
            <div className="bg-soil-surface serif-display text-washi-cream font-bold px-2 py-2 border-b border-border">
              種名
            </div>
            {MONTHS.map((m) => {
              const isCurrent = isHydrated && m === currentMonth;
              const isSelected = selected === m;
              return (
                <div
                  key={`h-${m}`}
                  className={`bg-soil-surface text-center font-normal py-2 mono-data border-b border-border transition-colors ${
                    isSelected
                      ? 'text-moss-light font-bold'
                      : isCurrent
                      ? 'text-washi-cream font-bold'
                      : 'text-washi-dim'
                  }`}
                >
                  {m}
                </div>
              );
            })}

            {/* 各キノコ行 */}
            {filtered.map((mushroom) => (
              <div key={mushroom.id} data-season-row className="contents group">
                <div className="px-2 py-1.5 border-t border-border-soft group-hover:bg-soil-surface/50 transition-colors">
                  <Link
                    href={`/zukan/${mushroom.id}`}
                    className="flex items-start gap-1.5"
                  >
                    <ToxicityBadge safety={mushroom.safety} iconOnly />
                    <span className="serif-display text-washi-cream group-hover:text-moss-light font-medium text-xs transition-colors break-words leading-tight flex-1 min-w-0">
                      {mushroom.names.ja}
                    </span>
                  </Link>
                </div>
                {MONTHS.map((m) => {
                  const active = isMonthInSeasonRanges(m, mushroom.season);
                  const isCurrent = isHydrated && m === currentMonth;
                  const isSelected = selected === m;
                  return (
                    <div
                      key={`${mushroom.id}-${m}`}
                      className="flex items-center justify-center py-1.5 border-t border-border-soft group-hover:bg-soil-surface/50 transition-colors"
                    >
                      <div
                        className={`w-full h-3.5 rounded-sm transition-colors ${
                          active
                            ? isSelected
                              ? 'bg-moss-light'
                              : isCurrent
                              ? 'bg-moss-light/70'
                              : 'bg-moss-primary'
                            : isSelected
                            ? 'bg-soil-elevated ring-1 ring-inset ring-moss-primary/30'
                            : 'bg-soil-elevated'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthTab({
  label,
  isActive,
  isCurrent,
  onClick,
}: {
  label: string;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${
        isActive
          ? 'bg-moss-primary text-washi-cream border-moss-light'
          : isCurrent
          ? 'bg-soil-surface text-washi-cream border-moss-primary/50 hover:border-moss-light'
          : 'bg-soil-surface text-washi-muted border-border hover:border-moss-primary/50 hover:text-washi-cream'
      }`}
    >
      {label}
    </button>
  );
}
