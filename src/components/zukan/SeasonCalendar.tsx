'use client';

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
const currentMonth = new Date().getMonth() + 1;

export function SeasonCalendar({ mushrooms }: SeasonCalendarProps) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-[600px] w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-forest-900 text-left text-forest-300 font-semibold px-3 py-2 min-w-[160px]">
              種名
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                className={`text-center font-normal px-1 py-2 w-8 ${
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
              <td className="sticky left-0 z-10 bg-forest-900 px-3 py-2">
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/zukan/${mushroom.id}`}
                    className="text-forest-100 hover:text-forest-300 font-medium leading-tight"
                  >
                    {mushroom.names.ja}
                  </Link>
                  <ToxicityBadge toxicity={mushroom.toxicity} />
                </div>
              </td>
              {MONTHS.map((m) => {
                const active = isMonthActive(m, mushroom.season.start_month, mushroom.season.end_month);
                const isCurrent = m === currentMonth;
                return (
                  <td key={m} className="px-0.5 py-2">
                    <div
                      className={`h-4 rounded-sm mx-0.5 ${
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
