'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { SearchFilter } from '@/components/zukan/SearchFilter';
import { MushroomCard } from '@/components/zukan/MushroomCard';
import { searchMushrooms } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import type { FilterOptions } from '@/types/mushroom';

export default function ZukanPage() {
  const [filters, setFilters] = useState<FilterOptions>({});

  const results = useMemo(() => searchMushrooms(filters), [filters]);

  return (
    <div className="flex flex-col min-h-screen bg-forest-900">
      <PageHeader title={UI_TEXT.zukan.title} />
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
    </div>
  );
}
