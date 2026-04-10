'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { RecordCard } from '@/components/records/RecordCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecords } from '@/contexts/RecordsContext';
import { UI_TEXT } from '@/constants/ui-text';
import { RecordMap } from '@/components/records/RecordMap';

type ViewMode = 'list' | 'map';

export default function RecordsPage() {
  const { records, isLoading } = useRecords();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <div>
      <PageHeader title={UI_TEXT.records.title} />

      {/* Action bar */}
      <div className="sticky top-14 z-30 border-b border-forest-700 bg-forest-900 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* List / Map toggle */}
          <div className="flex rounded-lg border border-forest-700 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-forest-600 text-forest-100'
                  : 'bg-forest-800 text-forest-400 hover:bg-forest-700'
              }`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              {UI_TEXT.records.listView}
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-forest-600 text-forest-100'
                  : 'bg-forest-800 text-forest-400 hover:bg-forest-700'
              }`}
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
            >
              {UI_TEXT.records.mapView}
            </button>
          </div>

          {/* New record button */}
          <Link
            href="/records/new"
            className="rounded-lg bg-forest-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-forest-400"
          >
            + {UI_TEXT.records.newRecord}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : viewMode === 'map' ? (
          <div className="px-4 pb-4">
            {records.length === 0 ? (
              <div className="py-16 text-center">
                <span className="text-4xl block mb-4">🗺</span>
                <p className="text-forest-400">{UI_TEXT.records.noRecords}</p>
              </div>
            ) : (
              <RecordMap records={records} />
            )}
          </div>
        ) : records.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="text-5xl">📝</span>
            <p className="text-center text-forest-400">{UI_TEXT.records.noRecords}</p>
            <Link
              href="/records/new"
              className="rounded-lg bg-forest-500 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-forest-400"
            >
              + {UI_TEXT.records.newRecord}
            </Link>
          </div>
        ) : (
          /* Record list */
          <ul className="flex flex-col gap-3">
            {records.map((record) => (
              <li key={record.id}>
                <RecordCard record={record} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
