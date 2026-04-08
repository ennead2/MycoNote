'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ToxicityBadge } from './ToxicityBadge';
import type { Mushroom } from '@/types/mushroom';

interface SeasonCalendarProps {
  mushrooms: Mushroom[];
}

function isMonthActive(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth;
  return month >= startMonth || month <= endMonth;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function SeasonCalendar({ mushrooms }: SeasonCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(0);

  useEffect(() => {
    setCurrentMonth(new Date().getMonth() + 1);
  }, []);
  return (
    <div className="w-full">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="text-left text-forest-300 font-semibold px-1 py-1 w-[110px] max-w-[110px]">
              種名
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                className={`text-center font-normal px-0 py-1 ${
                  m === currentMonth ? 'text-forest-200 font-bold' : 'text-forest-400'
                }`}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mushrooms.map((mushroom) => (
            <tr key={mushroom.id} className="border-t border-forest-800">
              <td className="px-1 py-1 w-[110px] max-w-[110px]">
                <Link
                  href={`/zukan/${mushroom.id}`}
                  className="flex items-center gap-1 truncate"
                >
                  <span className="text-forest-100 hover:text-forest-300 font-medium truncate">
                    {mushroom.names.ja}
                  </span>
                  <ToxicityBadge toxicity={mushroom.toxicity} compact />
                </Link>
              </td>
              {MONTHS.map((m) => {
                const active = isMonthActive(m, mushroom.season.start_month, mushroom.season.end_month);
                const isCurrent = m === currentMonth;
                return (
                  <td key={m} className="px-px py-1">
                    <div
                      className={`h-3 rounded-sm ${
                        active
                          ? isCurrent
                            ? 'bg-forest-300'
                            : 'bg-forest-500'
                          : 'bg-forest-800'
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
  );
}
