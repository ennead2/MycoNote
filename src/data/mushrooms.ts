import mushroomsRaw from './mushrooms.json';
import type { Mushroom, FilterOptions, SortOrder, Safety } from '@/types/mushroom';

export const mushrooms: Mushroom[] = mushroomsRaw as Mushroom[];

const mushroomIndex = new Map<string, Mushroom>(mushrooms.map((m) => [m.id, m]));

export function getMushroomById(id: string): Mushroom | undefined {
  return mushroomIndex.get(id);
}

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function matchesQuery(text: string, query: string): boolean {
  const t = toKatakana(text.toLowerCase());
  const q = toKatakana(query.toLowerCase());
  return t.includes(q);
}

/** Intersection test: any of `values` present in `arr`. */
function anyOf<T>(arr: readonly T[] | undefined, values: readonly T[]): boolean {
  if (!arr || arr.length === 0) return false;
  return values.some((v) => arr.includes(v));
}

export function searchMushrooms(filters: FilterOptions): Mushroom[] {
  let results = [...mushrooms];

  if (filters.bookmarkedIds) {
    const set = new Set(filters.bookmarkedIds);
    results = results.filter((m) => set.has(m.id));
  }

  if (filters.query) {
    const q = filters.query;
    results = results.filter(
      (m) =>
        matchesQuery(m.names.ja, q) ||
        matchesQuery(m.names.scientific, q) ||
        m.names.aliases?.some((a) => matchesQuery(a, q)) ||
        m.names.scientific_synonyms?.some((s) => matchesQuery(s, q))
    );
  }

  if (filters.safety && filters.safety.length > 0) {
    results = results.filter((m) => filters.safety!.includes(m.safety));
  }

  if (filters.season) {
    results = results.filter((m) => isInSeason(m, filters.season!));
  }

  if (filters.family && filters.family.length > 0) {
    results = results.filter(
      (m) => m.taxonomy?.family?.latin && filters.family!.includes(m.taxonomy.family.latin),
    );
  }

  if (filters.genus && filters.genus.length > 0) {
    results = results.filter(
      (m) => m.taxonomy?.genus?.latin && filters.genus!.includes(m.taxonomy.genus.latin),
    );
  }

  if (filters.habitat && filters.habitat.length > 0) {
    results = results.filter((m) => anyOf(m.habitat, filters.habitat!));
  }

  if (filters.regions && filters.regions.length > 0) {
    results = results.filter((m) => anyOf(m.regions, filters.regions!));
  }

  if (filters.treeAssociation && filters.treeAssociation.length > 0) {
    results = results.filter((m) => anyOf(m.tree_association, filters.treeAssociation!));
  }

  return results;
}

export function getMushroomsBySeason(month: number): Mushroom[] {
  return mushrooms.filter((m) => isInSeason(m, month));
}

/**
 * 任意の月が season array のどれか 1 つにヒットすれば true。
 * 各 SeasonRange は単発期間（start_month <= end_month）または年またぎ（start > end）。
 */
function isInSeason(mushroom: Mushroom, month: number): boolean {
  return mushroom.season.some((range) => {
    const { start_month, end_month } = range;
    if (start_month <= end_month) {
      return month >= start_month && month <= end_month;
    }
    return month >= start_month || month <= end_month;
  });
}

// ===== Sorting =====

// 食用 → 要注意 → 猛毒 → 毒 → 不明 → 不食（SAFETY_CONFIG.priority と一致させる）。
const SAFETY_SORT_ORDER: Record<Safety, number> = {
  edible: 0,
  caution: 1,
  deadly: 2,
  toxic: 3,
  unknown: 4,
  inedible: 5,
};

/** Japanese name comparator using localeCompare with ja collation (handles hiragana/katakana). */
function kanaCompare(a: string, b: string): number {
  return toKatakana(a).localeCompare(toKatakana(b), 'ja');
}

export function sortMushrooms(list: Mushroom[], order: SortOrder): Mushroom[] {
  const copy = [...list];
  switch (order) {
    case 'kana':
      copy.sort((a, b) => kanaCompare(a.names.ja, b.names.ja));
      return copy;
    case 'safety':
      copy.sort((a, b) => {
        const d = SAFETY_SORT_ORDER[a.safety] - SAFETY_SORT_ORDER[b.safety];
        return d !== 0 ? d : kanaCompare(a.names.ja, b.names.ja);
      });
      return copy;
    case 'taxonomy':
      copy.sort((a, b) => {
        // Place un-taxonomized entries at the end
        const at = a.taxonomy, bt = b.taxonomy;
        const aHasTax = !!(at?.order || at?.family || at?.genus);
        const bHasTax = !!(bt?.order || bt?.family || bt?.genus);
        if (aHasTax && !bHasTax) return -1;
        if (!aHasTax && bHasTax) return 1;
        if (aHasTax && bHasTax) {
          const orderDiff = (at?.order?.latin ?? '').localeCompare(bt?.order?.latin ?? '', 'en');
          if (orderDiff !== 0) return orderDiff;
          const familyDiff = (at?.family?.latin ?? '').localeCompare(bt?.family?.latin ?? '', 'en');
          if (familyDiff !== 0) return familyDiff;
          const genusDiff = (at?.genus?.latin ?? '').localeCompare(bt?.genus?.latin ?? '', 'en');
          if (genusDiff !== 0) return genusDiff;
        }
        return kanaCompare(a.names.ja, b.names.ja);
      });
      return copy;
  }
}

// ===== Facet extraction (for filter dropdown options) =====

interface FacetValues {
  families: string[];
  genera: string[];
  habitats: string[];
  regions: string[];
  treeAssociations: string[];
}

let _facetCache: FacetValues | null = null;

/** Extract unique filter values from the mushroom dataset, sorted for display. */
export function getFacetValues(): FacetValues {
  if (_facetCache) return _facetCache;

  const families = new Set<string>();
  const genera = new Set<string>();
  const habitats = new Set<string>();
  const regions = new Set<string>();
  const treeAssociations = new Set<string>();

  for (const m of mushrooms) {
    if (m.taxonomy?.family?.latin) families.add(m.taxonomy.family.latin);
    if (m.taxonomy?.genus?.latin) genera.add(m.taxonomy.genus.latin);
    for (const h of m.habitat) habitats.add(h);
    for (const r of m.regions) regions.add(r);
    if (m.tree_association) for (const t of m.tree_association) treeAssociations.add(t);
  }

  const sortArr = (s: Set<string>): string[] =>
    [...s].sort((a, b) => kanaCompare(a, b));

  _facetCache = {
    families: [...families].sort((a, b) => a.localeCompare(b, 'en')),
    genera: [...genera].sort((a, b) => a.localeCompare(b, 'en')),
    habitats: sortArr(habitats),
    regions: sortArr(regions),
    treeAssociations: sortArr(treeAssociations),
  };
  return _facetCache;
}
