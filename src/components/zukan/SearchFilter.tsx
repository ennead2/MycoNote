'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { FilterOptions, Safety } from '@/types/mushroom';
import { SAFETY_CONFIG } from '@/constants/safety';
import { UI_TEXT } from '@/constants/ui-text';
import { getFacetValues } from '@/data/mushrooms';

// UI 表示順（SAFETY_CONFIG.priority と一致）。
const SAFETY_ORDER: Safety[] = ['edible', 'caution', 'deadly', 'toxic', 'unknown', 'inedible'];

interface SearchFilterProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

/**
 * Array toggle: add value if not present, remove if present.
 * Used by multi-select chip filters.
 */
function toggleIn<T>(arr: T[] | undefined, value: T): T[] {
  const current = arr ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export function SearchFilter({ filters, onFilterChange }: SearchFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const facets = getFacetValues();

  const activeSafety = filters.safety ?? [];
  const activeFamily = filters.family ?? [];
  const activeGenus = filters.genus ?? [];
  const activeHabitat = filters.habitat ?? [];
  const activeRegions = filters.regions ?? [];
  const activeTrees = filters.treeAssociation ?? [];

  const advancedActiveCount =
    activeFamily.length +
    activeGenus.length +
    activeHabitat.length +
    activeRegions.length +
    activeTrees.length;

  const hasAnyFilter =
    (filters.query && filters.query.length > 0) ||
    activeSafety.length > 0 ||
    advancedActiveCount > 0;

  const handleClearAll = () => {
    onFilterChange({});
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-soil-surface border-b border-border">
      {/* Query input with leading icon */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-washi-dim pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder={UI_TEXT.zukan.searchPlaceholder}
          value={filters.query ?? ''}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          className="w-full rounded-md bg-soil-bg border border-border text-washi-cream placeholder:text-washi-dim pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-moss-light focus:border-moss-light transition-colors"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, query: '' })}
            aria-label="検索をクリア"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-washi-dim hover:text-washi-cream transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Safety filter — always visible */}
      <div className="flex flex-wrap gap-1.5">
        {SAFETY_ORDER.map((safety) => {
          const config = SAFETY_CONFIG[safety];
          const isActive = activeSafety.includes(safety);
          return (
            <button
              key={safety}
              type="button"
              onClick={() => onFilterChange({ ...filters, safety: toggleIn(activeSafety, safety) })}
              aria-pressed={isActive}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                isActive
                  ? `${config.color} text-washi-cream border-transparent`
                  : 'bg-transparent text-moss-light border-border hover:border-moss-light'
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Accordion toggle row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-[11px] mono-data text-washi-muted hover:text-moss-light transition-colors"
        >
          <SlidersHorizontal size={13} aria-hidden="true" />
          {expanded ? UI_TEXT.zukan.filterClose : UI_TEXT.zukan.filterMore}
          {advancedActiveCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-5 h-4 px-1 rounded-full bg-moss-primary text-washi-cream text-[10px] font-bold">
              {advancedActiveCount}
            </span>
          )}
        </button>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] mono-data text-washi-dim hover:text-safety-toxic transition-colors"
          >
            {UI_TEXT.zukan.filterClear}
          </button>
        )}
      </div>

      {/* Expanded advanced filters */}
      {expanded && (
        <div className="flex flex-col gap-3 pt-1 animate-fade-in">
          <FilterGroup label={UI_TEXT.zukan.filterHabitatPlural}>
            <MultiChipSelect
              options={facets.habitats}
              selected={activeHabitat}
              onToggle={(v) => onFilterChange({ ...filters, habitat: toggleIn(activeHabitat, v) })}
            />
          </FilterGroup>

          <FilterGroup label={UI_TEXT.zukan.filterTreeAssociation}>
            <MultiChipSelect
              options={facets.treeAssociations}
              selected={activeTrees}
              onToggle={(v) => onFilterChange({ ...filters, treeAssociation: toggleIn(activeTrees, v) })}
            />
          </FilterGroup>

          <FilterGroup label={UI_TEXT.zukan.filterRegions}>
            <MultiChipSelect
              options={facets.regions}
              selected={activeRegions}
              onToggle={(v) => onFilterChange({ ...filters, regions: toggleIn(activeRegions, v) })}
            />
          </FilterGroup>

          <FilterGroup label={UI_TEXT.zukan.filterFamily}>
            <MultiChipSelect
              options={facets.families}
              selected={activeFamily}
              onToggle={(v) => onFilterChange({ ...filters, family: toggleIn(activeFamily, v) })}
              mono
            />
          </FilterGroup>

          <FilterGroup label={UI_TEXT.zukan.filterGenus}>
            <MultiChipSelect
              options={facets.genera}
              selected={activeGenus}
              onToggle={(v) => onFilterChange({ ...filters, genus: toggleIn(activeGenus, v) })}
              mono
              italic
            />
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="mono-data text-[10px] text-washi-dim tracking-wider uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Renders a scrollable-height limited flex row of selectable chips.
 * For long lists (e.g. genera = 100+ values), wraps; CSS max-height limits vertical footprint.
 */
function MultiChipSelect({
  options,
  selected,
  onToggle,
  mono = false,
  italic = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  mono?: boolean;
  italic?: boolean;
}) {
  if (options.length === 0) {
    return <p className="text-[11px] text-washi-dim">—</p>;
  }

  const typoClass = mono ? 'mono-data' : '';
  const italicClass = italic ? 'italic' : '';

  return (
    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            aria-pressed={active}
            className={`rounded-full px-2 py-0.5 text-[11px] ${typoClass} ${italicClass} border transition-colors ${
              active
                ? 'bg-moss-primary text-washi-cream border-moss-primary'
                : 'bg-soil-bg text-washi-muted border-border hover:border-moss-light/50'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
