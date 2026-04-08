import type { Toxicity } from '@/types/mushroom';

export interface ToxicityInfo {
  label: string;
  color: string;
  textColor: string;
  icon: string;
  priority: number;
}

export const TOXICITY_CONFIG: Record<Toxicity, ToxicityInfo> = {
  edible: { label: '食用', color: 'bg-green-600', textColor: 'text-green-600', icon: '✓', priority: 0 },
  edible_caution: { label: '要注意', color: 'bg-yellow-600', textColor: 'text-yellow-600', icon: '⚠', priority: 1 },
  inedible: { label: '不食', color: 'bg-gray-500', textColor: 'text-gray-500', icon: '—', priority: 2 },
  toxic: { label: '毒', color: 'bg-orange-600', textColor: 'text-orange-600', icon: '⚠', priority: 3 },
  deadly_toxic: { label: '猛毒', color: 'bg-red-600', textColor: 'text-red-600', icon: '☠', priority: 4 },
} as const;

export function getToxicityConfig(toxicity: Toxicity): ToxicityInfo {
  return TOXICITY_CONFIG[toxicity];
}
