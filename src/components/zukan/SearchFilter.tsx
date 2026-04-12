'use client';

import type { FilterOptions, Toxicity } from '@/types/mushroom';
import { TOXICITY_CONFIG } from '@/constants/toxicity';
import { UI_TEXT } from '@/constants/ui-text';

const TOXICITY_ORDER: Toxicity[] = ['edible', 'edible_caution', 'inedible', 'toxic', 'deadly_toxic'];

interface SearchFilterProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export function SearchFilter({ filters, onFilterChange }: SearchFilterProps) {
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, query: e.target.value });
  };

  const handleToxicityToggle = (toxicity: Toxicity) => {
    const current = filters.toxicity ?? [];
    const next = current.includes(toxicity)
      ? current.filter((t) => t !== toxicity)
      : [...current, toxicity];
    onFilterChange({ ...filters, toxicity: next });
  };

  const activeToxicity = filters.toxicity ?? [];

  return (
    <div className="flex flex-col gap-3 p-3 bg-soil-surface border-b border-border">
      <input
        type="text"
        placeholder={UI_TEXT.zukan.searchPlaceholder}
        value={filters.query ?? ''}
        onChange={handleQueryChange}
        className="w-full rounded-md bg-soil-surface border border-moss-primary text-washi-cream placeholder:text-washi-dim px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-moss-light"
      />
      <div className="flex flex-wrap gap-2">
        {TOXICITY_ORDER.map((toxicity) => {
          const config = TOXICITY_CONFIG[toxicity];
          const isActive = activeToxicity.includes(toxicity);
          return (
            <button
              key={toxicity}
              type="button"
              onClick={() => handleToxicityToggle(toxicity)}
              className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
                isActive
                  ? `${config.color} text-white border-transparent`
                  : 'bg-transparent text-moss-light border-moss-primary hover:border-moss-light'
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
