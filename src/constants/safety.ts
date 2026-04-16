import type { Safety } from '@/types/mushroom';

export interface SafetyInfo {
  label: string;
  color: string;
  textColor: string;
  icon: string;
  priority: number;
}

export const SAFETY_CONFIG: Record<Safety, SafetyInfo> = {
  edible: { label: '食用', color: 'bg-safety-edible', textColor: 'text-safety-edible', icon: '✓', priority: 0 },
  caution: { label: '要注意', color: 'bg-safety-caution', textColor: 'text-safety-caution', icon: '⚠', priority: 1 },
  inedible: { label: '不食', color: 'bg-safety-inedible', textColor: 'text-safety-inedible', icon: '—', priority: 2 },
  toxic: { label: '毒', color: 'bg-safety-toxic', textColor: 'text-safety-toxic', icon: '⚠', priority: 3 },
  deadly: { label: '猛毒', color: 'bg-safety-deadly', textColor: 'text-safety-deadly', icon: '☠', priority: 4 },
} as const;

export function getSafetyConfig(safety: Safety): SafetyInfo {
  return SAFETY_CONFIG[safety];
}
