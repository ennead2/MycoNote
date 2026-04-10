import mushroomsRaw from './mushrooms.json';
import type { Mushroom, FilterOptions } from '@/types/mushroom';

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

export function searchMushrooms(filters: FilterOptions): Mushroom[] {
  let results = [...mushrooms];

  if (filters.query) {
    const q = filters.query;
    results = results.filter(
      (m) =>
        matchesQuery(m.names.ja, q) ||
        matchesQuery(m.names.scientific, q) ||
        m.names.aliases?.some((a) => matchesQuery(a, q))
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
