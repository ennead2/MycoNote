'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { SearchFilter } from '@/components/zukan/SearchFilter';
import { MushroomCard } from '@/components/zukan/MushroomCard';
import { SeasonCalendar } from '@/components/zukan/SeasonCalendar';
import { mushrooms as allMushrooms, searchMushrooms } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import type { FilterOptions } from '@/types/mushroom';

type ViewMode = 'grid' | 'calendar';

export default function ZukanPage() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const results = useMemo(() => searchMushrooms(filters), [filters]);

  return (
    <div className="flex flex-col min-h-screen bg-forest-900">
      <PageHeader title={UI_TEXT.zukan.title} />
      <div className="flex gap-2 px-3 pt-3">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'grid'
              ? 'bg-forest-500 text-white'
              : 'bg-forest-800 text-forest-400'
          }`}
        >
          一覧
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-forest-500 text-white'
              : 'bg-forest-800 text-forest-400'
          }`}
        >
          {UI_TEXT.zukan.seasonCalendarTitle}
        </button>
      </div>
      {viewMode === 'grid' ? (
        <>
          <SearchFilter filters={filters} onFilterChange={setFilters} />
          <main className="flex-1 max-w-lg mx-auto w-full px-3 py-4">
            {results.length === 0 ? (
              <p className="text-center text-forest-400 mt-10">{UI_TEXT.zukan.noResults}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {results.map((mushroom) => (
                  <MushroomCard key={mushroom.id} mushroom={mushroom} />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="flex-1 w-full px-3 py-4">
          <SeasonCalendar mushrooms={allMushrooms} />
        </main>
      )}
    </div>
  );
}
