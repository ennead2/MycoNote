'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { SearchFilter } from '@/components/zukan/SearchFilter';
import { SortToggle } from '@/components/zukan/SortToggle';
import { MushroomCard } from '@/components/zukan/MushroomCard';
import { SeasonCalendar } from '@/components/zukan/SeasonCalendar';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bookmark as BookmarkIcon, BookOpen } from 'lucide-react';
import { mushrooms as allMushrooms, searchMushrooms, sortMushrooms, getMushroomById } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import { useBookmarks } from '@/contexts/BookmarksContext';
import type { FilterOptions, SortOrder, Safety, Mushroom } from '@/types/mushroom';

type Tab = 'list' | 'bookmarks' | 'calendar';

const DEFAULT_SORT: SortOrder = 'safety';
const DEFAULT_TAB: Tab = 'list';

const VALID_SORTS: SortOrder[] = ['safety', 'kana', 'taxonomy'];
const VALID_TABS: Tab[] = ['list', 'bookmarks', 'calendar'];
const VALID_SAFETY: Safety[] = ['edible', 'caution', 'inedible', 'unknown', 'toxic', 'deadly'];

/** Parse URL search params into our state shape. Unknown values are ignored. */
function paramsToState(params: URLSearchParams): {
  tab: Tab;
  sort: SortOrder;
  filters: FilterOptions;
} {
  const tab = VALID_TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : DEFAULT_TAB;
  const sort = VALID_SORTS.includes(params.get('sort') as SortOrder)
    ? (params.get('sort') as SortOrder)
    : DEFAULT_SORT;

  const getList = (key: string): string[] | undefined => {
    const v = params.get(key);
    if (!v) return undefined;
    const arr = v.split(',').filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  };

  const safetyRaw = getList('safety');
  const safety = safetyRaw?.filter((t): t is Safety => VALID_SAFETY.includes(t as Safety));

  const filters: FilterOptions = {
    query: params.get('q') || undefined,
    safety: safety && safety.length > 0 ? safety : undefined,
    family: getList('family'),
    genus: getList('genus'),
    habitat: getList('habitat'),
    regions: getList('regions'),
    treeAssociation: getList('tree'),
  };

  return { tab, sort, filters };
}

/** Serialize state back to URL search params. Empty/default values are omitted. */
function stateToParams(tab: Tab, sort: SortOrder, filters: FilterOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (tab !== DEFAULT_TAB) params.set('tab', tab);
  if (sort !== DEFAULT_SORT) params.set('sort', sort);
  if (filters.query) params.set('q', filters.query);
  if (filters.safety?.length) params.set('safety', filters.safety.join(','));
  if (filters.family?.length) params.set('family', filters.family.join(','));
  if (filters.genus?.length) params.set('genus', filters.genus.join(','));
  if (filters.habitat?.length) params.set('habitat', filters.habitat.join(','));
  if (filters.regions?.length) params.set('regions', filters.regions.join(','));
  if (filters.treeAssociation?.length) params.set('tree', filters.treeAssociation.join(','));
  return params;
}

export default function ZukanPage() {
  // useSearchParams requires a Suspense boundary for static prerendering.
  // Fallback renders the default (tab=list, no filters) while client reads URL params.
  return (
    <Suspense fallback={<ZukanSkeleton />}>
      <ZukanInner />
    </Suspense>
  );
}

function ZukanSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={UI_TEXT.zukan.title} />
      <div className="flex-1 max-w-lg mx-auto w-full px-3 py-4">
        <div className="h-8 w-32 bg-soil-surface rounded animate-shimmer mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-soil-surface animate-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ZukanInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { bookmarks } = useBookmarks();

  // Initialize state from URL once on mount. Deliberately do NOT depend on searchParams
  // — subsequent URL updates flow from state → router.replace(), not the other way around.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => paramsToState(new URLSearchParams(searchParams.toString())), []);

  const [tab, setTab] = useState<Tab>(initial.tab);
  const [sort, setSort] = useState<SortOrder>(initial.sort);
  const [filters, setFilters] = useState<FilterOptions>(initial.filters);

  // Sync state → URL (replaceState, no scroll jump)
  useEffect(() => {
    const params = stateToParams(tab, sort, filters);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [tab, sort, filters, pathname, router]);

  // Filter + sort pipeline for list tab
  const listResults = useMemo(() => {
    const filtered = searchMushrooms(filters);
    return sortMushrooms(filtered, sort);
  }, [filters, sort]);

  // Bookmark list: look up mushroom by id, preserve bookmark order (newest first)
  const bookmarkedMushrooms: Mushroom[] = useMemo(() => {
    return bookmarks
      .map((b) => getMushroomById(b.mushroom_id))
      .filter((m): m is Mushroom => m !== undefined);
  }, [bookmarks]);

  const gridKey = `${tab}:${JSON.stringify(filters)}:${sort}:${listResults.length}`;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={UI_TEXT.zukan.title} />

      {/* Tab bar */}
      <div className="flex gap-2 px-3 pt-3" role="tablist">
        <TabButton
          label={UI_TEXT.zukan.tabList}
          active={tab === 'list'}
          onClick={() => setTab('list')}
        />
        <TabButton
          label={UI_TEXT.zukan.tabBookmarks}
          badge={bookmarkedMushrooms.length > 0 ? bookmarkedMushrooms.length : undefined}
          active={tab === 'bookmarks'}
          onClick={() => setTab('bookmarks')}
        />
        <TabButton
          label={UI_TEXT.zukan.tabSeason}
          active={tab === 'calendar'}
          onClick={() => setTab('calendar')}
        />
      </div>

      {tab === 'list' && (
        <>
          <SearchFilter filters={filters} onFilterChange={setFilters} />
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="mono-data text-[11px] text-washi-dim">
              {listResults.length} {UI_TEXT.home.speciesCount}
            </span>
            <SortToggle value={sort} onChange={setSort} />
          </div>
          <main className="flex-1 max-w-lg mx-auto w-full px-3 py-4">
            {listResults.length === 0 ? (
              <EmptyState icon={BookOpen} message={UI_TEXT.zukan.noResults} />
            ) : (
              <div key={gridKey} className="grid grid-cols-2 gap-3 animate-fade-in">
                {listResults.map((mushroom) => (
                  <MushroomCard key={mushroom.id} mushroom={mushroom} />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {tab === 'bookmarks' && (
        <main className="flex-1 max-w-lg mx-auto w-full px-3 py-4 animate-fade-in">
          {bookmarkedMushrooms.length === 0 ? (
            <EmptyState icon={BookmarkIcon} message={UI_TEXT.zukan.bookmarksEmpty} />
          ) : (
            <>
              <p className="mono-data text-[11px] text-washi-dim mb-3">
                {bookmarkedMushrooms.length} {UI_TEXT.zukan.bookmarkCount}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {bookmarkedMushrooms.map((mushroom) => (
                  <MushroomCard key={mushroom.id} mushroom={mushroom} />
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {tab === 'calendar' && (
        <main className="flex-1 w-full px-3 py-4 animate-fade-in">
          <SeasonCalendar mushrooms={allMushrooms} />
        </main>
      )}

      <ScrollToTop ariaLabel={UI_TEXT.zukan.scrollToTop} />
    </div>
  );
}

function TabButton({
  label,
  badge,
  active,
  onClick,
}: {
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
        active
          ? 'bg-moss-primary text-washi-cream border-moss-light'
          : 'bg-soil-surface text-washi-muted border-border hover:border-moss-primary/50 hover:text-washi-cream'
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          aria-label={`${badge}件`}
          className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full mono-data text-[13px] font-bold leading-none ${
            active
              ? 'bg-washi-cream text-moss-primary'
              : 'bg-moss-primary/20 text-moss-light'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
