import { UI_TEXT } from '@/constants/ui-text';
import { isMonthInSeason } from '@/lib/season-utils';

interface SeasonBarProps {
  startMonth: number;
  endMonth: number;
}

export function SeasonBar({ startMonth, endMonth }: SeasonBarProps) {
  return (
    <table className="w-full table-fixed" role="table">
      <thead>
        <tr>
          {UI_TEXT.months.map((label, i) => (
            <th
              key={i}
              className="mono-data text-[10px] text-washi-dim font-normal px-0.5"
            >
              {label.replace('月', '')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const active = isMonthInSeason(month, startMonth, endMonth);
            return (
              <td
                key={month}
                role="cell"
                data-month={month}
                className={`h-3 rounded-sm ${
                  active ? 'bg-moss-light' : 'bg-soil-elevated'
                }`}
              />
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
