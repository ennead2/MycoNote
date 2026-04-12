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

  // Stable key for the grid that changes when filter output changes, to replay fade-in.
  const gridKey = `${JSON.stringify(filters)}:${results.length}`;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={UI_TEXT.zukan.title} />
      <div className="flex gap-2 px-3 pt-3">
        <ViewToggle
          label="一覧"
          active={viewMode === 'grid'}
          onClick={() => setViewMode('grid')}
        />
        <ViewToggle
          label={UI_TEXT.zukan.seasonCalendarTitle}
          active={viewMode === 'calendar'}
          onClick={() => setViewMode('calendar')}
        />
      </div>

      {viewMode === 'grid' ? (
        <>
          <SearchFilter filters={filters} onFilterChange={setFilters} />
          <main className="flex-1 max-w-lg mx-auto w-full px-3 py-4">
            {results.length === 0 ? (
              <p className="text-center text-washi-muted mt-10">{UI_TEXT.zukan.noResults}</p>
            ) : (
              <div key={gridKey} className="grid grid-cols-2 gap-3 animate-fade-in">
                {results.map((mushroom) => (
                  <MushroomCard key={mushroom.id} mushroom={mushroom} />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="flex-1 w-full px-3 py-4 animate-fade-in">
          <SeasonCalendar mushrooms={allMushrooms} />
        </main>
      )}
    </div>
  );
}

function ViewToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
        active
          ? 'bg-moss-primary text-washi-cream border-moss-light'
          : 'bg-soil-surface text-washi-muted border-border hover:border-moss-primary/50 hover:text-washi-cream'
      }`}
    >
      {label}
    </button>
  );
}
