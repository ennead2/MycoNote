import Link from 'next/link';
import type { MushroomRecord } from '@/types/record';

interface RecordCardProps {
  record: MushroomRecord;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
}

export function RecordCard({ record }: RecordCardProps) {
  const mushroomName = record.mushroom_name_ja ?? '不明な種';

  return (
    <Link
      href={`/records/detail?id=${record.id}`}
      className="block rounded-xl border border-forest-700 bg-forest-800 p-4 transition-colors hover:bg-forest-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-base font-semibold text-forest-100">{mushroomName}</p>
          <p className="mt-1 text-sm text-forest-400">{formatDate(record.observed_at)}</p>
          {record.location.description && (
            <p className="mt-1 truncate text-sm text-forest-300">{record.location.description}</p>
          )}
          {record.quantity && (
            <p className="mt-1 text-sm text-forest-300">{record.quantity}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            record.harvested
              ? 'bg-green-800 text-green-200'
              : 'bg-blue-800 text-blue-200'
          }`}
        >
          {record.harvested ? '採取' : '観察'}
        </span>
      </div>
    </Link>
  );
}
