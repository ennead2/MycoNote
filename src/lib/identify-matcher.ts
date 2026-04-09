import { mushrooms } from '@/data/mushrooms';
import type { Mushroom, MushroomTraits } from '@/types/mushroom';

export interface IdentifyInput {
  gill_type?: string;
  cap_color?: string;
  cap_shape?: string;
  cap_size?: string;
  gill_attachment?: string;
  stalk_color?: string;
  stalk_features?: string;
  bruising?: string;
  substrate?: string;
}

export interface MatchResult {
  mushroom: Mushroom;
  score: number;
  matchedTraits: string[];
  isToxicWarning: boolean;
}

const WEIGHTS: Record<string, number> = {
  gill_type: 3,
  cap_color: 2,
  cap_shape: 2,
  cap_size: 1,
  gill_attachment: 3,
  stalk_color: 1,
  stalk_features: 3,
  bruising: 3,
  substrate: 2,
};

function isInSeason(mushroom: Mushroom, month: number): boolean {
  const { start_month, end_month } = mushroom.season;
  if (start_month <= end_month) {
    return month >= start_month && month <= end_month;
  }
  return month >= start_month || month <= end_month;
}

function matchTrait(
  traitKey: string,
  inputValue: string,
  traits: MushroomTraits,
): boolean {
  const traitData = traits[traitKey as keyof MushroomTraits];
  if (traitData === undefined) return false;

  if (Array.isArray(traitData)) {
    return (traitData as string[]).includes(inputValue);
  }
  return (traitData as string) === inputValue;
}

function calculateScore(input: IdentifyInput, mushroom: Mushroom, currentMonth: number): { score: number; matchedTraits: string[] } {
  const traits = mushroom.traits;
  if (!traits) return { score: 0, matchedTraits: [] };

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedTraits: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const weight = WEIGHTS[key] ?? 1;
    totalWeight += weight;

    if (matchTrait(key, value, traits)) {
      matchedWeight += weight;
      matchedTraits.push(key);
    }
  }

  if (totalWeight === 0) return { score: 0, matchedTraits: [] };

  let score = Math.round((matchedWeight / totalWeight) * 100);

  if (!isInSeason(mushroom, currentMonth)) {
    score = Math.round(score * 0.5);
  }

  return { score, matchedTraits };
}

export function matchMushrooms(input: IdentifyInput, currentMonth: number): MatchResult[] {
  const mushroomsWithTraits = mushrooms.filter((m) => m.traits);

  const scored: MatchResult[] = mushroomsWithTraits.map((mushroom) => {
    const { score, matchedTraits } = calculateScore(input, mushroom, currentMonth);
    return { mushroom, score, matchedTraits, isToxicWarning: false };
  });

  scored.sort((a, b) => b.score - a.score);

  const top5 = scored.slice(0, 5);
  const top5Ids = new Set(top5.map((r) => r.mushroom.id));

  const toxicToAdd: MatchResult[] = [];
  for (const result of top5) {
    for (const similarId of result.mushroom.similar_species) {
      if (top5Ids.has(similarId)) continue;
      const similar = mushroomsWithTraits.find((m) => m.id === similarId);
      if (!similar) continue;
      if (similar.toxicity !== 'toxic' && similar.toxicity !== 'deadly_toxic') continue;
      if (toxicToAdd.some((t) => t.mushroom.id === similarId)) continue;

      const { score, matchedTraits } = calculateScore(input, similar, currentMonth);
      toxicToAdd.push({ mushroom: similar, score, matchedTraits, isToxicWarning: true });
    }
  }

  return [...top5, ...toxicToAdd];
}
