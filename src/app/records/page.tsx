'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, FileText, Plus } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { RecordCard } from '@/components/records/RecordCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useRecords } from '@/contexts/RecordsContext';
import { UI_TEXT } from '@/constants/ui-text';
import { RecordMap } from '@/components/records/RecordMap';

type ViewMode = 'list' | 'map';

export default function RecordsPage() {
  const { records, isLoading } = useRecords();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={UI_TEXT.records.title} />

      {/* Action bar */}
      <div className="sticky top-14 z-30 border-b border-border bg-soil-surface px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* List / Map toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-moss-primary text-washi-cream'
                  : 'bg-soil-elevated text-washi-muted hover:text-washi-cream'
              }`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              {UI_TEXT.records.listView}
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-moss-primary text-washi-cream'
                  : 'bg-soil-elevated text-washi-muted hover:text-washi-cream'
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
            className="inline-flex items-center gap-1 rounded-lg bg-moss-primary px-3 py-1.5 text-sm font-medium text-washi-cream transition-colors hover:bg-moss-light"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            {UI_TEXT.records.newRecord}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-4">
        {isLoading ? (
          <ul className="flex flex-col gap-3" aria-label="読み込み中">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <LoadingSkeleton className="h-24 w-full" />
              </li>
            ))}
          </ul>
        ) : viewMode === 'map' ? (
          <div className="pb-4">
            {records.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-4">
                <MapPin size={40} className="text-washi-dim" aria-hidden="true" />
                <p className="text-washi-muted">{UI_TEXT.records.noRecords}</p>
              </div>
            ) : (
              <RecordMap records={records} />
            )}
          </div>
        ) : records.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <FileText size={48} className="text-washi-dim" aria-hidden="true" />
            <p className="text-center text-washi-muted">{UI_TEXT.records.noRecords}</p>
            <Link
              href="/records/new"
              className="inline-flex items-center gap-1 rounded-lg bg-moss-primary px-4 py-2 text-base font-medium text-washi-cream transition-colors hover:bg-moss-light"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              {UI_TEXT.records.newRecord}
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
