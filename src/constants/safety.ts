import type { Safety } from '@/types/mushroom';

export interface SafetyInfo {
  label: string;
  color: string;
  textColor: string;
  icon: string;
  priority: number;
}

// priority は UI 表示順（食用側 → 危険側 → 不明 → 不食）。
// 「安全か」「危険か」「食べられないか」を直感的にたどれる並び。
export const SAFETY_CONFIG: Record<Safety, SafetyInfo> = {
  edible: { label: '食用', color: 'bg-safety-edible', textColor: 'text-safety-edible', icon: '✓', priority: 0 },
  caution: { label: '要注意', color: 'bg-safety-caution', textColor: 'text-safety-caution', icon: '⚠', priority: 1 },
  deadly: { label: '猛毒', color: 'bg-safety-deadly', textColor: 'text-safety-deadly', icon: '☠', priority: 2 },
  toxic: { label: '毒', color: 'bg-safety-toxic', textColor: 'text-safety-toxic', icon: '⚠', priority: 3 },
  unknown: { label: '不明', color: 'bg-washi-dim', textColor: 'text-washi-dim', icon: '?', priority: 4 },
  inedible: { label: '不食', color: 'bg-safety-inedible', textColor: 'text-safety-inedible', icon: '—', priority: 5 },
} as const;

export function getSafetyConfig(safety: Safety): SafetyInfo {
  return SAFETY_CONFIG[safety];
}
