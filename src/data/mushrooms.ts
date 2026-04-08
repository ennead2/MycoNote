import mushroomsRaw from './mushrooms.json';
import type { Mushroom, FilterOptions } from '@/types/mushroom';

export const mushrooms: Mushroom[] = mushroomsRaw as Mushroom[];

const mushroomIndex = new Map<string, Mushroom>(mushrooms.map((m) => [m.id, m]));

export function getMushroomById(id: string): Mushroom | undefined {
  return mushroomIndex.get(id);
}

export function searchMushrooms(filters: FilterOptions): Mushroom[] {
  let results = [...mushrooms];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (m) =>
        m.names.ja.toLowerCase().includes(q) ||
        m.names.scientific.toLowerCase().includes(q) ||
        m.names.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  }

  if (filters.toxicity && filters.toxicity.length > 0) {
    results = results.filter((m) => filters.toxicity!.includes(m.toxicity));
  }

  if (filters.season) {
    results = results.filter((m) => isInSeason(m, filters.season!));
  }

  if (filters.habitat) {
    const h = filters.habitat.toLowerCase();
    results = results.filter((m) => m.habitat.some((hab) => hab.toLowerCase().includes(h)));
  }

  return results;
}

export function getMushroomsBySeason(month: number): Mushroom[] {
  return mushrooms.filter((m) => isInSeason(m, month));
}

function isInSeason(mushroom: Mushroom, month: number): boolean {
  const { start_month, end_month } = mushroom.season;
  if (start_month <= end_month) {
    return month >= start_month && month <= end_month;
  }
  // 年をまたぐ場合（例: 11月〜3月）
  return month >= start_month || month <= end_month;
}
