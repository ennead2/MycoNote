'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ToxicityBadge } from './ToxicityBadge';
import { UI_TEXT } from '@/constants/ui-text';
import { isMonthInSeason } from '@/lib/season-utils';
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
    if (selected === ALL) return mushrooms;
    return mushrooms.filter((mu) =>
      isMonthInSeason(selected, mu.season.start_month, mu.season.end_month)
    );
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
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="bg-soil-surface">
                <th className="text-left serif-display text-washi-cream font-bold px-2 py-2 w-[110px] max-w-[110px]">
                  種名
                </th>
                {MONTHS.map((m) => {
                  const isCurrent = isHydrated && m === currentMonth;
                  const isSelected = selected === m;
                  return (
                    <th
                      key={m}
                      className={`text-center font-normal px-0 py-2 mono-data transition-colors ${
                        isSelected
                          ? 'text-moss-light font-bold'
                          : isCurrent
                          ? 'text-washi-cream font-bold'
                          : 'text-washi-dim'
                      }`}
                    >
                      {m}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((mushroom) => (
                <tr
                  key={mushroom.id}
                  className="border-t border-border-soft hover:bg-soil-surface/50 transition-colors"
                >
                  <td className="px-2 py-1.5 w-[110px] max-w-[110px]">
                    <Link
                      href={`/zukan/${mushroom.id}`}
                      className="flex items-center gap-1 truncate"
                    >
                      <span className="serif-display text-washi-cream hover:text-moss-light font-medium truncate text-xs transition-colors">
                        {mushroom.names.ja}
                      </span>
                      <ToxicityBadge toxicity={mushroom.toxicity} compact />
                    </Link>
                  </td>
                  {MONTHS.map((m) => {
                    const active = isMonthInSeason(
                      m,
                      mushroom.season.start_month,
                      mushroom.season.end_month
                    );
                    const isCurrent = isHydrated && m === currentMonth;
                    const isSelected = selected === m;
                    return (
                      <td key={m} className="px-px py-1.5">
                        <div
                          className={`h-3.5 rounded-sm transition-colors ${
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
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
