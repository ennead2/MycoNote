'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPhotosForRecord } from '@/lib/db';
import { blobToDataUrl } from '@/lib/photo';
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
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (record.photos.length === 0) return;
    getPhotosForRecord(record.id).then(async (photos) => {
      if (photos.length > 0) {
        const url = await blobToDataUrl(photos[0].blob);
        setThumbUrl(url);
      }
    });
  }, [record.id, record.photos.length]);

  return (
    <Link
      href={`/records/detail?id=${record.id}`}
      className="block rounded-xl border border-forest-700 bg-forest-800 p-3 transition-colors hover:bg-forest-700"
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            className="w-14 h-14 rounded-lg object-cover shrink-0 bg-forest-700"
          />
        ) : record.photos.length > 0 ? (
          <div className="w-14 h-14 rounded-lg bg-forest-700 shrink-0 flex items-center justify-center text-forest-500 text-xs">
            読込中
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-forest-100">{mushroomName}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                record.harvested
                  ? 'bg-green-800 text-green-200'
                  : 'bg-blue-800 text-blue-200'
              }`}
            >
              {record.harvested ? '採取' : '観察'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-forest-400">{formatDate(record.observed_at)}</p>
          {record.location.description && (
            <p className="mt-0.5 truncate text-xs text-forest-300">{record.location.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
