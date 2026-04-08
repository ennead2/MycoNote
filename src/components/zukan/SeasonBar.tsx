import { UI_TEXT } from '@/constants/ui-text';

interface SeasonBarProps { startMonth: number; endMonth: number; }

function isMonthActive(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth;
  return month >= startMonth || month <= endMonth;
}

export function SeasonBar({ startMonth, endMonth }: SeasonBarProps) {
  return (
    <table className="w-full" role="table">
      <thead><tr>
        {UI_TEXT.months.map((label, i) => (
          <th key={i} className="text-[10px] text-forest-400 font-normal px-0.5">{label.replace('月', '')}</th>
        ))}
      </tr></thead>
      <tbody><tr>
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const active = isMonthActive(month, startMonth, endMonth);
          return <td key={month} role="cell" data-month={month} className={`h-3 rounded-sm ${active ? 'bg-forest-300' : 'bg-forest-800'}`} />;
        })}
      </tr></tbody>
    </table>
  );
}
